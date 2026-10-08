// Mount every puzzle of every chapter at every difficulty and check its solver wins it.
// Needs the dev server on :5173.
//   node tests/singular/browser/game-solve-all.mjs [chapterId ...] [--dev] [--diff=cadet,navigator,commander] [--shots=dir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2);
const dev = args.includes('--dev');
const diffs = (args.find((a) => a.startsWith('--diff='))?.slice(7) ?? 'cadet,navigator,commander').split(',');
const shots = args.find((a) => a.startsWith('--shots='))?.slice(8);
const only = args.filter((a) => !a.startsWith('--'));
if (shots) mkdirSync(shots, { recursive: true });

const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.setDefaultTimeout(180000);
// the dev server's reload socket would restart the page mid-run when files change
await p.routeWebSocket(/.*/, () => {});
const errors = [];
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto('http://localhost:5173/singular/index.html?test', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
const chapters = (await p.evaluate((d) => window.__game.chapters(d), dev)).filter((c) => !only.length || only.includes(c.id));

let fails = 0, total = 0;
for (const ch of chapters) {
  for (const [i, beat] of ch.beats.entries()) {
    if (beat.kind !== 'puzzle') continue;
    for (const d of diffs) {
      total++;
      const before = errors.length;
      const t0 = Date.now();
      let ok = false, err = '';
      try {
        await p.evaluate((d) => { window.__game.save().settings.difficulty = d; }, d);
        const mounted = await p.evaluate(([id, i]) => window.__game.mountPuzzle(id, i), [ch.id, i]);
        if (!mounted) throw new Error('did not mount');
        ok = await Promise.race([
          p.evaluate(() => window.__game.solve()),
          new Promise((_, rej) => setTimeout(() => rej(new Error('solve timed out (120 s)')), 120000)),
        ]);
        if (shots) await p.screenshot({ path: `${shots}/${ch.id}-${beat.puzzle}-${d}.png` });
      } catch (e) { err = String(e.message ?? e); }
      const newErr = errors.slice(before);
      const pass = ok && !newErr.length;
      if (!pass) fails++;
      console.log(`${pass ? 'ok  ' : 'FAIL'} ${ch.id} ${beat.puzzle} [${d}] ${Date.now() - t0}ms${err ? ` — ${err}` : ''}${!ok && !err ? ' — win did not fire' : ''}${newErr.length ? ` — console: ${newErr.join(' | ')}` : ''}`);
    }
  }
}
console.log(`\n${total - fails}/${total} passed`);
await b.close();
process.exit(fails ? 1 : 0);
