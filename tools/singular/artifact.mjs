// Package the built game (dist/singular/index.html and what it loads) as one folder for hosting at its
// own root: index.html (page content only, no document skeleton), assets/, models/, voice/, pyodide/.
//   npx vite build && node tools/singular/artifact.mjs dist out/singular
// Prints the file list with sizes, and splits it into upload groups under the host's per-publish limits.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const [, , distArg = 'dist', outArg = 'out/singular'] = process.argv;
const dist = resolve(distArg), out = resolve(outArg);
const page = join(dist, 'game/index.html');
if (!existsSync(page)) { console.error(`no ${page}: run the vite build first`); process.exit(1); }
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. the page: keep what is inside <head> (title, meta, links, scripts) and <body>, drop the skeleton
const html = readFileSync(page, 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const keepHead = head.split('\n').filter((l) => !/<meta charset|<meta name="viewport"/i.test(l)).join('\n');
// the host names the page from its <title>: the game's name alone
const pageOut = `${keepHead.trim()}\n${body.trim()}\n`.replaceAll('../assets/', 'assets/').replace(/<title>[^<]*<\/title>/, '<title>SINGULAR</title>');
writeFileSync(join(out, 'index.html'), pageOut);

// 2. the build files the page reaches, followed through every import and url()
const seen = new Set();
const queue = [...pageOut.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)].map((m) => join(dist, m[1]));
const REF = /["'(]((?:\.{1,2}\/)?[\w@./-]+\.(?:js|mjs|css|woff2?|ttf|png|jpg|svg|wasm|json))["')?#]/g;
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f) || !existsSync(f) || !statSync(f).isFile()) continue;
  seen.add(f);
  if (!/\.(js|mjs|css)$/.test(f)) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(REF)) {
    const ref = m[1];
    for (const base of [dirname(f), join(dist, 'assets')]) {
      const p = resolve(base, ref);
      if (p.startsWith(join(dist, 'assets')) && existsSync(p)) { queue.push(p); break; }
    }
  }
}
for (const f of seen) {
  const to = join(out, relative(join(dist), f));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(f, to);
}

// 3. runtime folders the game fetches relative to the page
const copyDir = (from, to) => {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const n of readdirSync(from)) {
    const a = join(from, n), b = join(to, n);
    if (statSync(a).isDirectory()) copyDir(a, b); else copyFileSync(a, b);
  }
};
for (const d of ['models', 'voice', 'pyodide']) copyDir(join(dist, 'game', d), join(out, d));

// hosts that serve only web types: models as glTF JSON (buffer embedded), the Python standard library as base64 text
for (const n of readdirSync(join(out, 'models'))) {
  if (!n.endsWith('.glb')) continue;
  const glb = readFileSync(join(out, 'models', n));
  const jsonLen = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen;
  if (binStart < glb.length) {
    const binLen = glb.readUInt32LE(binStart);
    const bin = glb.subarray(binStart + 8, binStart + 8 + binLen);
    gltf.buffers[0].uri = `data:application/octet-stream;base64,${bin.toString('base64')}`;
  }
  writeFileSync(join(out, 'models', n.replace(/\.glb$/, '.json')), JSON.stringify(gltf));
  rmSync(join(out, 'models', n));
}
const zip = join(out, 'pyodide', 'python_stdlib.zip');
if (existsSync(zip)) { writeFileSync(join(out, 'pyodide', 'python_stdlib.b64.txt'), readFileSync(zip).toString('base64')); rmSync(zip); }

// 4. report, and upload groups under 60 MB and 250 files each (index.html goes in the first)
const files = [];
const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
walk(out);
const rel = (p) => relative(out, p);
const sized = files.filter((p) => rel(p) !== 'index.html').map((p) => ({ path: rel(p), size: statSync(p).size })).sort((a, b) => a.path.localeCompare(b.path));
const groups = [[]];
let bytes = statSync(join(out, 'index.html')).size;
for (const f of sized) {
  const g = groups[groups.length - 1];
  if (bytes + f.size > 60e6 || g.length >= 250) { groups.push([]); bytes = 0; }
  groups[groups.length - 1].push(f.path);
  bytes += f.size;
}
const total = sized.reduce((s, f) => s + f.size, 0);
for (const f of sized) if (f.size > 15e6) console.warn(`too large for one file: ${f.path} ${(f.size / 1e6).toFixed(1)} MB`);
writeFileSync(join(out, '..', `${out.split('/').pop()}-groups.json`), JSON.stringify(groups, null, 1));
console.log(`${sized.length + 1} files, ${(total / 1e6).toFixed(1)} MB, ${groups.length} upload group(s): ${groups.map((g) => g.length).join(', ')}`);
