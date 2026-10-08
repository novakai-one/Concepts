// Drive the game in a real browser: a chapter's beats → screenshots of each (and the solved state).
//   node tests/singular/browser/game-flow.mjs <chapterId> <outDir> [beat]
// Puzzles are solved with their solver; Briefing steps (doubt, law, procedure, cards) with the debug API.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , chId = 'c00', out = 'shots/game', beatArg] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(180000);
await p.routeWebSocket(/.*/, () => {}); // no dev-server reloads mid-run
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto('http://localhost:5173/singular/index.html', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
/** Wait until n more frames have actually rendered (slow software rendering on a busy machine). */
const frames = (n) => p.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
await frames(6);
await p.screenshot({ path: `${out}/00-title.png` });
const chs = await p.evaluate(() => [...window.__game.chapters(), ...window.__game.chapters(true)]);
const ch = chs.find((c) => c.id === chId);
if (!ch) { console.error(`no chapter ${chId}`); process.exit(1); }
const beats = beatArg !== undefined ? [Number(beatArg)] : ch.beats.map((_, i) => i);
for (const i of beats) {
  // one failing beat is reported, not fatal: the run goes on to the next beat
  try {
  const kind = ch.beats[i].kind;
  await p.evaluate(([id, i]) => window.__game.goto(id, i), [chId, i]);
  // wait for the beat to be live (puzzle mounted / briefing step ready), then for frames
  await p.waitForFunction(([kind]) => {
    const s = window.__game.state();
    if (kind === 'puzzle') return !!s.puzzle;
    return true;
  }, [kind], { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1200);
  await frames(8);
  const tag = `${chId}-${String(i).padStart(2, '0')}-${kind}`;
  await p.screenshot({ path: `${out}/${tag}.png` });
  if (kind === 'puzzle') {
    const ok = await p.evaluate(() => window.__game.solve());
    await frames(10);
    await p.screenshot({ path: `${out}/${tag}-solved.png` });
    console.log(`beat ${i} puzzle ${ch.beats[i].puzzle}: solve → ${ok}`);
  } else if (kind === 'review') {
    // four claims in a row: solve each as it opens, until the beat moves on
    const res = [];
    for (let k = 0; k < 6; k++) {
      const open = await p.waitForFunction((bi) => window.__game.state().beat !== bi || !!window.__game.briefing(), i, { timeout: 60000 }).then(() => p.evaluate((bi) => window.__game.state().beat === bi && !!window.__game.briefing(), i)).catch(() => false);
      if (!open) break;
      const r = await p.evaluate(() => window.__game.solveBriefing());
      res.push(r ? r.ok : 'none');
      if (k === 0) { await frames(6); await p.screenshot({ path: `${out}/${tag}-claim1.png` }); }
      await p.keyboard.press('Enter');
      await frames(4);
    }
    console.log(`beat ${i} review: ${res.join(', ')}`);
  } else if (kind === 'broadcast') {
    const res = [];
    for (let k = 0; k < 3; k++) {
      await p.waitForFunction(() => !!window.__game.briefing(), null, { timeout: 90000 }).catch(() => {});
      const r = await p.evaluate(() => window.__game.solveBriefing());
      res.push(r ? r.ok : 'none');
      await frames(6);
      await p.screenshot({ path: `${out}/${tag}-step${k + 1}.png` });
    }
    console.log(`beat ${i} broadcast: ${res.join(', ')}`);
  } else if (['doubt', 'law', 'procedure', 'teo'].includes(kind)) {
    // the speaker may voice a line first (doubts); give the step time to open
    // wait for this beat's own step (a teo beat runs as a procedure), so a step still closing is not solved instead
    const want = kind === 'teo' ? 'procedure' : kind;
    await p.waitForFunction((w) => window.__game.briefing() === w, want, { timeout: 90000 }).catch(() => {});
    let r = await p.evaluate(() => window.__game.solveBriefing());
    if (!r) { await p.waitForTimeout(1500); r = await p.evaluate(() => window.__game.solveBriefing()); }
    await frames(10);
    await p.screenshot({ path: `${out}/${tag}-solved.png` });
    console.log(`beat ${i} ${kind}: solve → ${r ? r.ok : 'no briefing step found'}`);
  } else if (kind === 'build') {
    // each code-help mode in turn: Show me must pass the tests (and the swarm) in every mode
    await p.waitForFunction(() => window.__game.solveBuild !== undefined, null, { timeout: 5000 }).catch(() => {});
    const modes = [];
    for (const m of ['assemble', 'fill', 'write']) {
      const r = await p.evaluate((mm) => window.__game.solveBuild(mm), m);
      modes.push(r ? `${r.mode} ${r.ok}` : 'no builder');
      if (m === 'assemble') { await frames(4); await p.screenshot({ path: `${out}/${tag}-assemble.png` }); }
    }
    await frames(6);
    await p.screenshot({ path: `${out}/${tag}-solved.png` });
    console.log(`beat ${i} build ${ch.beats[i].id}: ${modes.join(', ')}`);
  }
  } catch (e) {
    console.log(`beat ${i} ${ch.beats[i].kind}: FAILED (${String(e.message ?? e).split('\n')[0]})`);
    errors.push(`beat ${i}: ${e.message ?? e}`);
  }
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await b.close();
