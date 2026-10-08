// c14-p6 [SP] The Collapse (Act IV set piece; uses Acts II, III, IV). Four steps in one puzzle:
// (1) forecast the next pulse's determinant from the spire readings (LANTERN runs your det if you wrote
// one); (2) try to undo it in advance on the two-decimal reading: a pivot is missing; (3) brace the stern
// from Teo's node: every arrangement loses the same fraction of its volume; (4) seal the mid-section.
import type { PuzzleDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon } from '../../../gfx/markers';
import { Lattice3D, Parallelepiped } from '../../../gfx/shapes';
import { h, button } from '../../../ui/ui';
import { StepWorksheet } from '../../../kit/steps';
import { VectorHandle } from '../../../kit/handle';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { isPlayerFn, pylib } from '../../../game/build';
import { identity, type Mat, type Vec } from '../../../math/la';
import { AugBoard } from '../c13-inverse/augboard';
import {
  afterPulse, braceRatio, braceVolume, crewDet, FORECAST, newArrangement, P6_BRACES, P6_UNDO_OPS, SPIRES, SPIRES_2DP, twoDp,
} from './logic';
import { S } from './script';

const col3 = (M: Mat, j: number): V3 => [M[0][j], M[1][j], M[2][j]];
/** Entries with up to three decimals (the readings show 2.004). */
const d3 = (x: number): string => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(3)).replace('-', '-');
const texM3 = (M: Mat) => `\\begin{bmatrix}${M.map((r) => r.map(d3).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
const line = (s: { text: string } | [string, string]) => (Array.isArray(s) ? s[1] : s.text);

/** The forecast: the player's det when it has passed its tests, else LANTERN's backup. Never waits long. */
export async function forecastDet(headless: boolean): Promise<{ value: number; mine: boolean }> {
  const backup = crewDet(SPIRES);
  if (headless || !isPlayerFn('det')) return { value: backup, mine: false };
  try {
    const v = await Promise.race([pylib.call<number>('det', SPIRES), new Promise<null>((r) => window.setTimeout(() => r(null), 8000))]);
    if (typeof v === 'number' && Math.abs(v - backup) < 1e-6) return { value: v, mine: true };
  } catch { /* the backup runs */ }
  return { value: backup, mine: false };
}

export const p6: PuzzleDef = {
  id: 'c14-p6',
  title: 'Can we stop the Collapse?',
  goal: '**Forecast** the next pulse from the spire readings: by how much will it multiply every volume? Work out the determinant of the readings.',
  subgoals: ['Forecast the next pulse’s determinant', 'Try to undo it in advance', 'Brace the stern: three arrangements', 'Seal the mid-section bulkhead'],
  hints: [
    'Row 1 of the readings is (1, 0, 0). Expand along it: one entry, one $2 \\times 2$ minor.',
    'The minor is $1 \\cdot 2.004 - 1 \\cdot 2 = 0.004$. On the two-decimal reading, $R_3 - R_1$ then $R_3 - 2R_2$ leaves a zero row.',
    'Forecast 0.004. Reduce until the zero row appears. Drag the braces three times. Then seal the mid-section.',
  ],
  view: '3d',
  par: 12,
  onWin: S.sealed,
  setup(p) {
    void p.g.stage.view3D({ target: [0.5, 1, 2.1], distance: 13, azimuth: -58, elevation: 20, ms: 0 });
    const lattice = new Lattice3D(p.g.stage, { extent: 2, opacity: 0.45 });
    const box = new Parallelepiped(p.g.stage, col3(SPIRES, 0), col3(SPIRES, 1), col3(SPIRES, 2), { color: C.orange, opacity: 0.22 });
    const spires = [C.v, C.w, C.u].map((c, j) => new Arrow([0, 0, 0], col3(SPIRES, j), { color: c, width: j === 2 ? 0.03 : 0.045, label: `spire ${j + 1}` }));
    p.add(lattice, box, ...spires);
    const r = p.readout('The spire readings');
    r.row('S', 'tips as columns', `$${texM3(SPIRES)}$`);
    r.note('The third tip is 0.004 from the second. Their box is almost flat.');
    const dock = p.dock();
    const host = h('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    dock.append(host);
    let step = 0;
    const tick = (i: number) => { p.subgoal(i); sfx.success(); };

    // ---------------------------------------------------------------- step 1: forecast
    const ws = new StepWorksheet(p, {
      mount: host,
      title: p.difficulty === 'cadet' ? 'Forecast · LANTERN computes, you choose' : 'Forecast · by hand',
      steps: [
        { prompt: 'Row 1 is $(1, 0, 0)$: one non-zero entry, sign $+$. Its minor: $\\det\\begin{bmatrix}1 & 1 \\\\ 2 & 2.004\\end{bmatrix} = 1 \\cdot 2.004 - 1 \\cdot 2$', answer: FORECAST, tol: 0.0005, mistakes: [[0, 'That is the two-decimal reading, 2.00. Use the third decimal: 2.004.']] },
        { prompt: 'Forecast: $\\det = 1 \\times 0.004$', answer: FORECAST, tol: 0.0005, mistakes: [[0, 'Keep three decimals: 0.004.']] },
      ],
      onDone: () => void afterForecast(),
    });
    const afterForecast = async () => {
      if (step !== 0) return;
      step = 1;
      tick(0);
      const f = await forecastDet(p.g.headless);
      r.row('f', f.mine ? 'forecast (your det)' : 'forecast (LANTERN backup det)', f.value.toFixed(4), C.orange);
      r.row('f2', 'to two decimals', twoDp(f.value), C.orange);
      p.bark('lantern', `${f.mine ? 'Forecast from your det.' : 'Forecast from my backup det.'} ${line(S.forecast[0])}`);
      await wait(p.g.headless ? 5 : 600);
      toUndo();
    };

    // ---------------------------------------------------------------- step 2: try to undo it in advance
    let board: AugBoard | null = null;
    const toUndo = () => {
      ws.el.remove();
      p.setGoal('**Try to undo it in advance.** Row reduce $[S \\mid I]$ on the two-decimal reading, where columns 2 and 3 are equal.');
      r.row('S', 'two-decimal reading', `$${texM3(SPIRES_2DP)}$`);
      r.note('To two decimals, spire 3 reads (0, 1, 2): the same as spire 2.');
      spires[2].setOpacity(0.35);
      box.set(col3(SPIRES_2DP, 0), col3(SPIRES_2DP, 1), col3(SPIRES_2DP, 2));
      board = new AugBoard(p, {
        left: SPIRES_2DP, right: identity(3), prefill: p.difficulty === 'cadet', mount: host, title: 'The two-decimal reading [S | I]', leftHead: 'S',
        onChange: () => {
          if (step !== 1 || !board || board.zeroLeftRow() < 0) return;
          step = 2;
          tick(1);
          p.bark('lantern', line(S.noUndo[0]));
          window.setTimeout(() => toBrace(), p.g.headless ? 5 : 900);
        },
      });
    };

    // ---------------------------------------------------------------- step 3: brace the stern from Teo's node
    let braces: VectorHandle[] = [];
    let before: Parallelepiped | null = null, after: Parallelepiped | null = null;
    const tried: Vec[][] = [];
    const vecs = (): Vec[] => braces.map((b) => b.tip.slice() as Vec);
    const showBox = () => {
      const b = vecs();
      before?.set(b[0] as V3, b[1] as V3, b[2] as V3);
      const a = afterPulse(b);
      after?.set(a[0] as V3, a[1] as V3, a[2] as V3);
      const v = braceVolume(b);
      r.row('v', 'brace box volume', v.toFixed(2));
      r.row('a', 'after the forecast pulse', braceVolume(a).toFixed(4), C.orange);
      r.row('k', 'kept', Math.abs(v) > 1e-9 ? `× ${braceRatio(b).toFixed(4)}` : '—');
    };
    const commitBrace = () => {
      if (step !== 2) return;
      const b = vecs();
      p.move();
      if (!newArrangement(b, tried)) { if (Math.abs(braceVolume(b)) < 0.5) p.bark('lantern', 'Those braces lie flat. Spread them out.'); return; }
      tried.push(b.map((x) => x.slice()));
      r.row('n', 'arrangements tried', `${tried.length} of 3`);
      p.bark('lantern', `Box volume ${braceVolume(b).toFixed(2)}. After the pulse: ${braceVolume(afterPulse(b)).toFixed(4)}. Times ${braceRatio(b).toFixed(4)}.`);
      if (tried.length >= 3) { step = 3; tick(2); window.setTimeout(() => toSeal(), p.g.headless ? 5 : 700); }
    };
    const toBrace = () => {
      board?.el.remove();
      board = null;
      lattice.setOpacity(0.5);
      [box.group, ...spires.map((s) => s.group)].forEach((o) => { o.visible = false; });
      void p.g.stage.view3D({ target: [0.3, 0.3, 0.9], distance: 11, azimuth: -52, elevation: 26, ms: 600 });
      p.setGoal('**Brace the stern.** Teo is at the node. Drag the three braces (Shift-drag for height) into any box. The amber sheet is the box after the forecast pulse. Try **three** arrangements.');
      r.row('S', 'forecast pulse', `$\\det = ${FORECAST.toFixed(4)}$`);
      r.note('Every box the braces make is multiplied by the same factor.');
      const teo = new Beacon(p.g.stage, [0, 0, 0], { color: '#9fefe6', label: 'Teo', beam: false });
      before = new Parallelepiped(p.g.stage, [1, 0, 0], [0, 1, 0], [0, 0, 1], { color: C.white, opacity: 0.12 });
      after = new Parallelepiped(p.g.stage, [1, 0, 0], [0, 1, 0], [0, 0, 1], { color: C.orange, opacity: 0.35 });
      p.add(teo, before, after);
      const start: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      braces = [C.v, C.w, C.u].map((c, j) => new VectorHandle(p, {
        to: start[j], color: c, label: `brace ${j + 1}`, snap: p.snap() ?? 0.5, limit: 2.5,
        onChange: () => showBox(), onCommit: () => commitBrace(),
      }));
      host.replaceChildren(h('div', { class: 'kicker' }, 'Braces from Teo’s node'), h('div', { class: 'c-muted', style: 'font-size:13px;max-width:400px;line-height:1.4' }, 'Drag a brace tip to move it. Hold Shift to move it up or down. Each new box counts once.'));
      r.row('n', 'arrangements tried', '0 of 3');
      showBox();
      p.bark('teo', line(S.braces[0]));
    };

    // ---------------------------------------------------------------- step 4: seal the mid-section
    let sealBtn: HTMLButtonElement | null = null;
    const seal = () => {
      if (step !== 3 || p.won) return;
      p.move();
      step = 4;
      p.subgoal(3);
      sfx.collapse();
      p.g.stage.nudge(0.15);
      p.win();
    };
    const toSeal = () => {
      p.setGoal('Bracing cannot change the factor. **Seal the mid-section bulkhead** to save the rest of the ark.');
      sealBtn = button('Seal the mid-section bulkhead', () => seal(), { cls: 'primary', kbd: 'Space' });
      host.replaceChildren(h('div', { class: 'kicker' }, 'Every arrangement: × ' + FORECAST.toFixed(4)), sealBtn);
      p.bark('lantern', line(S.bracesDone[0]));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || step !== 3 || e.target instanceof HTMLInputElement || p.g.dialogue.active) return;
      e.preventDefault();
      seal();
    };
    document.addEventListener('keydown', onKey);
    p.onDispose(() => document.removeEventListener('keydown', onKey));

    const placeBraces = async (b: Vec[], ms: number) => {
      if (ms > 0) await Promise.all(braces.map((x, j) => x.moveTo(b[j] as V3, ms)));
      else { braces.forEach((x, j) => x.set(b[j] as V3)); commitBrace(); }
    };
    const run = async (ms: number) => {
      if (step === 0) { if (ms > 0) await ws.showMe(300); else ws.solve(); }
      for (let i = 0; i < 40 && step < 1; i++) await wait(20);
      for (let i = 0; i < 400 && !board; i++) await wait(20);
      // the reference moves only leave a zero row from the reading itself: start the board over first
      if (step === 1 && board) { board.set(SPIRES_2DP, identity(3)); await board.play(P6_UNDO_OPS, ms > 0 ? 700 : 0); }
      for (let i = 0; i < 400 && braces.length === 0; i++) await wait(20);
      for (const b of P6_BRACES) { if (step !== 2) break; await placeBraces(b, ms); if (ms > 0) await wait(500); }
      for (let i = 0; i < 400 && step < 3; i++) await wait(20);
      if (ms > 0) await wait(600);
      for (let i = 0; i < 400 && !sealBtn; i++) await wait(20);
      seal();
    };
    return {
      async showMe() { await run(700); },
      async solve() { await run(0); },
      wrong() { ws.wrong(); },
    };
  },
};
