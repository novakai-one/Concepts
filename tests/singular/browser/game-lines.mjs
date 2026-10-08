// Collect every voiced line from the running game (dev server) → JSON for tools/singular/voices.py.
//   node tests/singular/browser/game-lines.mjs out.json
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const out = process.argv[2] ?? 'lines.json';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:5173/singular/index.html?test', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
const lines = await p.evaluate(() => window.__game.lines());
writeFileSync(out, JSON.stringify(lines, null, 1));
const byWho = {};
for (const l of lines) byWho[l.who] = (byWho[l.who] ?? 0) + 1;
console.log(`${lines.length} lines`, byWho);
const words = lines.reduce((s, l) => s + l.spoken.split(/\s+/).length, 0);
console.log(`${words} words ≈ ${(words / 150).toFixed(0)} minutes of speech`);
await b.close();
