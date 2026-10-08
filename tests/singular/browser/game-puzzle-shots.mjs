// See puzzles the way a player who skips every story scene sees them: each puzzle mounted directly
// (no scenes before it), at one difficulty, at the start and again after pressing Show me.
//   node tests/singular/browser/game-puzzle-shots.mjs <chapterId> <difficulty> <outDir> [beatIndex ...]
// With no beat indices, every puzzle in the chapter. Dev server on :5173. Prints each puzzle's goal
// text and readout text, so the words can be judged without the picture.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [, , chId, diff = 'commander', out = 'shots/puzzles', ...beatArgs] = process.argv;
if (!chId) { console.error('usage: node tests/singular/browser/game-puzzle-shots.mjs <chapterId> <difficulty> <outDir> [beat ...]'); process.exit(1); }
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.setDefaultTimeout(180000);
await p.routeWebSocket(/.*/, () => {});
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:5173/singular/', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__game, null, { timeout: 120000 });
await p.evaluate((d) => { window.__game.save().settings.difficulty = d; }, diff);
const chs = await p.evaluate(() => [...window.__game.chapters(), ...window.__game.chapters(true)]);
const ch = chs.find((c) => c.id === chId);
if (!ch) { console.error(`no chapter ${chId}`); process.exit(1); }
const beats = beatArgs.length ? beatArgs.map(Number) : ch.beats.map((x, i) => (x.kind === 'puzzle' ? i : -1)).filter((i) => i >= 0);
const text = (sel) => p.$$eval(sel, (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
for (const i of beats) {
  const tag = `${chId}-${String(i).padStart(2, '0')}-${diff}`;
  try {
    await p.evaluate(([id, bi]) => window.__game.mountPuzzle(id, bi), [chId, i]);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/${tag}-start.png` });
    const goal = await text('.objective');
    const readouts = await text('.readout');
    const docks = await text('.l-scene .glass');
    console.log(`\n== beat ${i} ${ch.beats[i].puzzle} [${diff}]`);
    console.log(`goal: ${goal.join(' | ')}`);
    console.log(`readout: ${readouts.join(' | ')}`);
    console.log(`panels: ${docks.slice(0, 6).map((t) => t.slice(0, 240)).join(' | ')}`);
    // Show me, as the player would press it
    const btn = await p.$('button:visible:has-text("Show me")');
    if (btn) {
      await btn.click();
      await p.waitForFunction(() => window.__game.state().puzzle?.won, null, { timeout: 60000 }).catch(() => {});
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${out}/${tag}-shown.png` });
      console.log(`after Show me: won=${await p.evaluate(() => window.__game.state().puzzle?.won ?? null)}`);
    }
  } catch (e) {
    console.log(`beat ${i}: ${String(e).split('\n')[0]}`);
  }
}
console.log(errs.length ? `\nconsole errors: ${errs.slice(0, 5).join(' | ')}` : '\nno console errors');
await b.close();
