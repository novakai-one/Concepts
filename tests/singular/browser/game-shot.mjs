// Screenshot any game page through the Vite dev server: node tests/singular/browser/game-shot.mjs <url-path> <out.png> [waitMs]
import { chromium } from 'playwright';
const [, , path = '/singular/_sandbox.html', out = 'shot.png', waitMs = '2500', w = '1440', h = '900'] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto(`http://localhost:5173${path}`, { waitUntil: 'load' });
await p.waitForTimeout(+waitMs);
await p.screenshot({ path: out, timeout: 180000 });
console.log(errors.length ? errors.join('\n') : 'no console errors');
await b.close();
