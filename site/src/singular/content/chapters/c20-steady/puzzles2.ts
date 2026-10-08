// Chapter 20 puzzles 5–7: design the Stern's stay share so at least 100 drones settle there (p5), the swap
// that never settles and the stay share that fixes it (p6), and ranking terminals by where readers settle
// (p7 [S], PageRank).
import type { PuzzleDef } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { h, button, inline } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { matVec, type Vec } from '../../../math/la';
import { DRONES_START } from '../../truth';
import { Bars, ptag, sg, fslider } from '../c18-eigen/parts';
import { FlowBoard, boardView } from './board';
import {
  BAYS, HOURS, LINK_M, LINKS, NEED, P5_BEST, PR, PR_ORDER, PR_STEPS, STATIONS, TERMINALS, TOTAL, bays, designP, fmtN, fmtV, p5Won, p6Won, p7Won,
  settled2, steadyOf, sternAt,
} from './logic';
import { S } from './script';

const msgBox = () => {
  const el = h('div', { class: 'a7-msg' });
  return { el, say: (t: string, k: '' | 'good' | 'bad' = '') => { el.className = `a7-msg ${k}`; el.innerHTML = inline(t); } };
};

// ------------------------------------------------------------------ p5 · design the rules

export const p5: PuzzleDef = {
  id: 'c20-p5',
  title: 'What stay share keeps 100 drones at the Stern?',
  goal: `Change only the **Stern’s stay share** (drones that leave split evenly between Bow and Mid). Find the **smallest whole percent** that settles at least **${NEED}** drones at the Stern, then **commit** and run ${HOURS} hours.`,
  subgoals: [`At least ${NEED} settle at the Stern`, 'The smallest whole percent that does it'],
  hints: [
    'Raise the stay share and watch the Stern’s settled count. Each step changes the whole steady arrangement.',
    'At 79% the Stern settles 96.8 drones; at 80%, exactly 100.',
    'Commit 80%: the drones settle at $(125, 75, 100)$.',
  ],
  par: 4,
  onWin: S.p5Win,
  setup(p) {
    const d = p.difficulty;
    void boardView(p);
    let pct = 60;
    const fb = new FlowBoard(p, { P: designP(pct / 100), x0: DRONES_START, names: STATIONS });
    const r = p.readout('The Stern rule');
    const bars = new Bars(STATIONS.map((s, i) => ({ id: s, name: s, color: [C.accent, '#c9b49a', C.result][i] })), TOTAL);
    bars.target('Stern', NEED);
    r.el.append(bars.el);
    const msg = msgBox();
    const blind = d === 'commander';
    const paint = () => {
      const q = steadyOf(designP(pct / 100), TOTAL)!;
      r.row('s', 'Stern stay share', `${pct}%`, C.w);
      r.row('q', 'settles at', blind ? 'hidden until you commit' : fmtV(q.map((x) => Math.round(x * 10) / 10)), C.result);
      if (!blind) STATIONS.forEach((s, i) => bars.set(s, q[i]));
      fb.P = designP(pct / 100);
    };
    let busy = false, won = false;
    const commit = async (fast = false) => {
      if (busy || won) return;
      busy = true; p.move();
      fb.set(DRONES_START);
      for (let k = 0; k < HOURS; k++) { await fb.hour(fast ? 1 : k < 3 ? 500 : 70); STATIONS.forEach((s, i) => bars.set(s, fb.x[i])); }
      busy = false;
      const stern = sternAt(pct);
      r.row('q', 'settles at', fmtV(fb.x.map((x) => Math.round(x * 10) / 10)), C.result);
      if (stern < NEED - 1e-9) { sfx.miss(); msg.say(`At ${pct}% the Stern settles ${fmtN(Math.round(stern * 10) / 10)} drones: fewer than ${NEED}.`, 'bad'); p.bark('lantern', `${fmtN(Math.round(stern * 10) / 10)} at the Stern. The rescue needs ${NEED}.`); return; }
      sg(p, 0);
      if (!p5Won(pct)) { sfx.miss(); msg.say(`At ${pct}% the Stern settles ${fmtN(Math.round(stern * 10) / 10)}: enough, but a smaller share also works. Every drone kept at the Stern is one the Bow and Mid lose.`, 'bad'); return; }
      won = true; sg(p, 1); sfx.success();
      msg.say(`${P5_BEST}%: the drones settle at ${fmtV(fb.x.map((x) => Math.round(x)))}. ${NEED} at the Stern, and no share higher than it needs to be.`, 'good');
      p.win();
    };
    const slider = fslider({ label: 'Stern stay share', min: 50, max: 95, step: 1, value: pct, format: (v) => `${v}%`, onInput: (v) => { pct = Math.round(v); paint(); } });
    slider.el.addEventListener('change', () => p.move());
    p.dock().append(slider.el, h('div', { class: 'a7-btns' }, button(`Commit and run ${HOURS} hours`, () => void commit(), { cls: 'primary small' })), msg.el);
    msg.say(blind ? 'The settled counts stay hidden until you commit.' : 'The bars show where the drones settle for this share.');
    paint();
    return {
      async showMe() { for (let v = pct; v <= P5_BEST; v++) { pct = v; slider.set(v, false); paint(); await wait(p.g.headless ? 1 : 60); } await commit(); },
      async solve() { pct = P5_BEST; slider.set(P5_BEST, false); paint(); await commit(true); },
      async wrong() { pct = P5_BEST - 1; slider.set(pct, false); paint(); await commit(true); },
    };
  },
};

// ------------------------------------------------------------------ p6 · the swap

export const p6: PuzzleDef = {
  id: 'c20-p6',
  title: 'Does every rule settle?',
  goal: 'Two cargo bays trade **all** their drones every hour. Run it for a few hours. Then give each bay a **stay share** (10% is enough) and run until it settles.',
  subgoals: ['The swap: run at least four hours', 'Add a stay share', 'Run until it settles'],
  hints: [
    'With no stay share, all 100 drones change bay every hour: 100, 0, 100, 0 … forever.',
    'The swap’s eigenvalues are 1 and −1. The −1 part flips sign every hour and never shrinks.',
    'Set the stay share to 10%: the other eigenvalue becomes −0.8, and its part shrinks away. **Run until settled**.',
  ],
  par: 5,
  onWin: S.p6Win,
  setup(p) {
    void p.g.stage.view2D({ center: [0, -0.2], height: 6.6, ms: 0 });
    let stay = 0;
    const fb = new FlowBoard(p, { P: bays(stay), x0: [BAYS, 0], names: ['Bay 1', 'Bay 2'], centres: [[-2.4, -0.4], [2.4, -0.4]] });
    const r = p.readout('Two bays');
    const msg = msgBox();
    let swapHours = 0, busy = false, won = false;
    const hist: number[] = [];
    const paint = () => {
      r.row('s', 'stay share', `${Math.round(stay * 100)}%`, C.w);
      r.row('x', 'drones now', fmtV(fb.x.map((x) => Math.round(x * 10) / 10)), C.result);
      r.row('h', 'Bay 1 by hour', hist.slice(-6).map((x) => fmtN(Math.round(x))).join(' → ') || '·');
      sg(p, 0, swapHours >= 4);
      sg(p, 1, stay > 0);
    };
    /** The swap starts again from all in Bay 1, so it shows its 100, 0, 100, 0 swing. */
    const restartSwap = () => { fb.set([BAYS, 0]); hist.length = 0; };
    const run = async (n: number, fast = false, untilSettled = false) => {
      if (busy || won) return;
      busy = true; p.move();
      // an even split is the one start the swap leaves alone: start the swap from Bay 1 instead
      if (stay === 0 && settled2(fb.P, fb.x)) { restartSwap(); paint(); }
      for (let k = 0; k < n; k++) {
        const before = fb.x[0];
        await fb.hour(fast ? 1 : untilSettled ? 120 : 700);
        hist.push(fb.x[0]);
        // a swap hour counts when the drones visibly changed bay
        if (stay === 0 && Math.abs(fb.x[0] - before) > 0.5) swapHours++;
        paint();
        if (untilSettled && stay > 0 && settled2(fb.P, fb.x)) break;
      }
      busy = false;
      const s = stay > 0 && settled2(fb.P, fb.x);
      if (stay === 0 && swapHours >= 4 && !settled2(fb.P, fb.x)) msg.say('Every hour all the drones change bay. It never settles.', 'bad');
      if (s) sg(p, 2);
      if (p6Won(swapHours, stay, s)) { won = true; sfx.success(); msg.say(`With ${Math.round(stay * 100)}% staying, the bays settle at ${fmtV(fb.x.map((x) => Math.round(x)))}.`, 'good'); p.win(); }
    };
    const slider = fslider({ label: 'stay share', min: 0, max: 0.5, step: 0.05, value: 0, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { const was = stay; stay = v; fb.P = bays(stay); if (stay === 0 && was !== 0 && !busy) restartSwap(); paint(); } });
    slider.el.addEventListener('change', () => p.move());
    p.dock().append(slider.el, h('div', { class: 'a7-btns' }, button('Run an hour', () => void run(1), { cls: 'small' }), button('Run four hours', () => void run(4), { cls: 'small' }), button('Run until settled', () => void run(60, false, true), { cls: 'primary small' })), msg.el);
    paint();
    return {
      async showMe() { await run(4); stay = 0.1; slider.set(0.1, false); fb.P = bays(stay); paint(); await run(60, false, true); },
      async solve() { await run(4, true); stay = 0.1; slider.set(0.1, false); fb.P = bays(stay); paint(); await run(60, true, true); },
      async wrong() { await run(8, true); },
    };
  },
};

// ------------------------------------------------------------------ p7 [S] · where readers settle (PageRank)

const NODE_AT: Record<string, [number, number]> = { A: [-2.2, 1.3], B: [2.0, 1.7], C: [1.3, -1.5], D: [-2.5, -1.9] };

export const p7: PuzzleDef = {
  id: 'c20-p7',
  title: 'Which terminal do readers end up at most?',
  goal: 'A reader follows a random link from each terminal; 15% of the time they jump to any terminal instead. **Step** until the shares change by less than 0.001, then **rank** the terminals, most-read first.',
  subgoals: ['Repeat until the change is under 0.001', 'Rank the terminals'],
  hints: [
    'Each step applies the link matrix once. The change readout shows the largest change in any share.',
    'After about 13 steps the shares settle: C 0.394, A 0.373, B 0.196, D 0.038.',
    'Click C, A, B, D in that order.',
  ],
  par: PR_STEPS,
  onWin: S.p7Win,
  setup(p) {
    void p.g.stage.view2D({ center: [-0.73, 0.47], height: 8.6, ms: 0 });
    // links: arrows from terminal to terminal, kept short of the nodes
    for (const [s, ts] of Object.entries(LINKS)) for (const t of ts) {
      const a = NODE_AT[s], b = NODE_AT[t];
      const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]);
      const u = [d[0] / L, d[1] / L], nrm = [-u[1] * 0.12, u[0] * 0.12];
      const ar = new Arrow([a[0] + u[0] * 0.45 + nrm[0], a[1] + u[1] * 0.45 + nrm[1], 0], [b[0] - u[0] * 0.5 + nrm[0], b[1] - u[1] * 0.5 + nrm[1], 0], { color: C.w, width: 0.03, opacity: 0.8 });
      p.add(ar);
    }
    const dots = TERMINALS.map((t) => { const q = new Dot([NODE_AT[t][0], NODE_AT[t][1], 0.02], { color: C.result, size: 0.16 }); p.add(q); ptag(p, t, [NODE_AT[t][0], NODE_AT[t][1], 0], '', [0, -30]); return q; });
    let x: Vec = TERMINALS.map(() => 1 / TERMINALS.length);
    let k = 0, change = 1;
    const r = p.readout('Where readers are');
    const bars = new Bars(TERMINALS.map((t) => ({ id: t, name: t })), 0.5, (v) => v.toFixed(3));
    r.el.append(bars.el);
    const msg = msgBox();
    const order: string[] = [];
    let won = false;
    const paint = () => {
      TERMINALS.forEach((t, i) => { bars.set(t, x[i]); dots[i].group.scale.setScalar(0.6 + 3 * x[i]); });
      r.row('k', 'steps', String(k), C.accent);
      r.row('c', 'largest change in the last step', k ? change.toFixed(4) : '·', change < 1e-3 ? C.good : C.white);
      sg(p, 0, change < 1e-3);
    };
    const step = () => {
      if (won) return;
      p.move();
      const y = matVec(LINK_M, x);
      change = Math.max(...y.map((t, i) => Math.abs(t - x[i])));
      x = y; k++;
      sfx.tick(k % 8);
      paint();
      if (change < 1e-3) msg.say(`Settled after ${k} steps. Now rank the terminals.`, 'good');
    };
    const rankEl = h('div', { class: 'a7-rank' });
    const paintRank = () => rankEl.replaceChildren(...[0, 1, 2, 3].map((i) => h('span', { class: `slot ${order[i] ? 'on' : ''}` }, order[i] ?? `${i + 1}.`)));
    const pick = (t: string) => {
      if (won || order.includes(t)) return;
      if (change >= 1e-3) { msg.say('Step until the shares settle first.', 'bad'); return; }
      order.push(t); paintRank(); sfx.click();
      if (order.length === 4) {
        if (p7Won(order)) { won = true; sg(p, 1); sfx.success(); msg.say(`${PR_ORDER.join(', ')}: ${PR_ORDER.map((tt) => PR[TERMINALS.indexOf(tt)].toFixed(3)).join(', ')}. That is PageRank.`, 'good'); p.win(); }
        else { sfx.miss(); msg.say('Not that order. Most-read first: compare the bars.', 'bad'); order.length = 0; window.setTimeout(paintRank, 600); }
      }
    };
    p.dock().append(h('div', { class: 'a7-btns' }, button('Step', step, { cls: 'primary small' })), h('div', { class: 'a7-row' }, h('span', { class: 'k' }, 'Rank:'), ...TERMINALS.map((t) => button(t, () => pick(t), { cls: 'small' })), rankEl), msg.el);
    paint(); paintRank();
    return {
      async showMe() { while (change >= 1e-3) { step(); await wait(p.g.headless ? 1 : 260); } for (const t of PR_ORDER) { pick(t); await wait(p.g.headless ? 1 : 300); } },
      solve() { while (change >= 1e-3) step(); for (const t of PR_ORDER) pick(t); },
      wrong() { while (change >= 1e-3) step(); for (const t of TERMINALS) pick(t); },
    };
  },
};

