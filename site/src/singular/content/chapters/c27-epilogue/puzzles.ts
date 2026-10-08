// Epilogue puzzles: the last setting (p1) and the optional layer (p2, the bridge to neural networks).
import type { PuzzleDef } from '../../../game/types';
import { MatrixView3 } from '../../../kit/matrixview3';
import { PointCloud } from '../../../kit/data';
import { FatLine } from '../../../gfx/lines';
import { InfLine, Lattice3D } from '../../../gfx/shapes';
import { Slider } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import { nice } from '../../../math/frac';
import { identity, type Mat, type Vec } from '../../../math/la';
import { R } from '../../truth';
import * as L from './logic';
import { S } from './script';

const show3 = (M: Mat) => M.map((r) => `[${r.map((x) => nice(+x.toFixed(3))).join(', ')}]`).join(' ');

// ------------------------------------------------------------------ p1 The last setting

export const p1: PuzzleDef = {
  id: 'c27-p1',
  title: 'Which setting leaves every point where it is?',
  goal: 'Ilse reads her setting: **first spire (1, 0, 0), second (0, 1, 0), third (0, 0, 1)**. Set the three spires on the bench (drag the tips or type the numbers) and check that no point moves.',
  subgoals: ['Set the three spires to Ilse’s numbers', 'Check what the setting does in our grid'],
  predict: {
    prompt: 'Each spire points straight along its own axis. What will the final pulse do to the ark?',
    choices: [{ id: 'none', text: 'Nothing: every point stays put' }, { id: 'turn', text: 'Turn everything a quarter' }, { id: 'flat', text: 'Flatten the stern' }],
    answer: 'none',
    reveal: 'Each column says where one axis arrow lands. If every axis arrow lands on itself, every combination of them does too: nothing moves.',
  },
  hints: [
    'Each spire is one column: where that axis arrow lands.',
    'For nothing to move, the first axis arrow must land on (1, 0, 0), the second on (0, 1, 0), the third on (0, 0, 1).',
    'Columns (1, 0, 0), (0, 1, 0), (0, 0, 1): the identity.',
  ],
  par: 3,
  view: '3d',
  onWin: S.p1Win,
  setup(p) {
    void p.g.stage.view3D({ target: [0.5, 0.5, 0.5], distance: 13, azimuth: -50, elevation: 24, ms: 0 });
    const r = p.readout('Spire bench');
    // spire numbers are written in the Anchor's grid; the gold lattice is what they do to ours (P M P⁻¹, Ch 17)
    const ship = new Lattice3D(p.g.stage, { extent: 3, color: C.result, opacity: 0.2 });
    p.add(ship);
    r.note('Blue lattice: the spire numbers as written. Gold lattice: what that setting does to our grid.');
    let checked = false;
    const mv = new MatrixView3(p, {
      M: R, draggable: true, input: true, snap: p.snap() ?? 0.5,
      onChange: (M) => {
        for (let j = 0; j < 3; j++) r.row(`s${j}`, `spire ${j + 1}`, `(${[0, 1, 2].map((i) => nice(+M[i][j].toFixed(3))).join(', ')})`, [C.v, C.w, C.u][j]);
        const g = L.shipMove(M);
        ship.set(g);
        r.row('g', 'the move in our grid, $PMP^{-1}$', L.isIdentity(g, 1e-6) ? 'the identity: nothing moves' : show3(g), L.isIdentity(g, 1e-6) ? C.result : undefined);
      },
      onCommit: (M) => {
        p.move();
        if (!L.isIdentity(M, 1e-6)) { p.bark('lantern', 'Some buoys still move with that setting. Each spire must point along its own axis, length one.'); return; }
        p.subgoal(0);
        if (!checked) {
          checked = true;
          // spire numbers read in our grid: P I P⁻¹ = P P⁻¹ = I
          p.subgoal(1);
          sfx.discover();
          p.bark('lantern', 'In our grid: P I P⁻¹ = P P⁻¹ = I. The same in every grid.');
          p.win();
        }
      },
    });
    return {
      async showMe() { await mv.showMe(identity(3), 1400); },
      async wrong() { await mv.showMe([[1, 0, 0], [0, 1, 0], [0, 0, 0]], 800); },
    };
  },
};

// ------------------------------------------------------------------ p2 [S] The layer

export const p2: PuzzleDef = {
  id: 'c27-p2',
  title: 'Can a few steps sort what one matrix cannot? (optional)',
  goal: 'Sort the record’s stars: the **cluster** inside, the **ring** outside. **Try one move and a straight cut** first: it cannot. Then **Clip negatives**, then set the cut so every star lands on its own side.',
  subgoals: ['See that one move and one straight cut fail', 'Clip negative outputs to zero', 'Set the cut between the two groups'],
  hints: [
    'With the clip off, the four outputs x, −x, y, −y always add to zero: every star scores the same.',
    'With the clip on, the score is |x| + |y|. The cut |x| + |y| = t is a diamond.',
    'Any cut between 1.4 and 2 works. Try 1.7.',
  ],
  par: 4,
  onWin: S.layerWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [0, 0], height: 8.5, ms: 0 });
    const pts = L.layerPoints();
    const all = [...pts.blob, ...pts.ring];
    const nBlob = pts.blob.length;
    const base = all.map((_, i) => (i < nBlob ? C.u : C.orange));
    const cloud = new PointCloud(p, { points: all.map((q) => [q[0], q[1], 0]), colors: base, size: 0.06 });
    const diamond = new FatLine(p.g.stage, [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [1, 0, 0]], { color: C.result, width: 2.4, intensity: 1.3 });
    diamond.object.visible = false;
    // the straight cut of a try (drawn only while trying)
    const line = new InfLine(p.g.stage, [0, 0, 0], [0, 1, 0], { color: C.violet, width: 2.4 });
    line.object.visible = false;
    p.add(diamond.object, line.object);
    let alive = true;
    p.onDispose(() => { alive = false; diamond.dispose(); line.dispose(); });
    let clip = false, t = 1, tried = false, busy = false, best: number | null = null;
    const r = p.readout('Sorting the stars');
    const flags = [false, false, false];
    const tick = (i: number) => { if (!flags[i]) { flags[i] = true; p.subgoal(i); } };
    const upd = () => {
      if (busy) return;
      if (clip && flags[0]) tick(1);
      const sc = all.map((q) => L.score(q, clip));
      let wrong = 0;
      sc.forEach((s, i) => { const inside = s <= t; const ok = i < nBlob ? inside : !inside; if (!ok) wrong++; cloud.setColorAt(i, ok ? base[i] : C.bad); });
      diamond.object.visible = clip;
      if (clip) diamond.setPoints([[t, 0, 0], [0, t, 0], [-t, 0, 0], [0, -t, 0], [t, 0, 0]]);
      r.row('w', 'four outputs', 'x, −x, y, −y');
      r.row('c', 'clip negatives to zero', clip ? 'on' : 'off', clip ? C.result : undefined);
      r.row('s', 'score of each star', clip ? '|x| + |y|' : 'always 0');
      r.row('x', 'stars on the wrong side', String(wrong), wrong ? C.bad : C.good);
      if (best !== null) r.row('b', 'best move and straight cut', `${best} wrong`, C.bad);
      if (tried && clip && L.separates(t, true, pts)) { tick(2); p.win(); }
    };
    // four real tries: move the stars by a matrix, find the best straight cut of the moved stars, colour the ones it gets wrong
    const tries: Mat[] = [[[1, 0], [0, 1]], [[2, 1], [0, 0.5]], [[0.5, -1.5], [1, 0.5]], [[1.5, 0], [-1, 1]]];   // four: the bark says so
    const showTry = async (M: Mat, ms: number): Promise<number> => {
      const moved = all.map((q) => L.apply2(M, q));
      line.object.visible = false;
      await cloud.to(moved.map((q) => [q[0], q[1], 0]), ms);
      if (!alive) return Infinity;
      const cut = L.bestMoveAndCut(M, pts);
      const foot: Vec = [cut.n[0] * cut.c, cut.n[1] * cut.c];
      line.set([foot[0], foot[1], 0], [-cut.n[1], cut.n[0], 0]);
      line.object.visible = true;
      moved.forEach((q, i) => cloud.setColorAt(i, L.wrongSide(cut, q, i < nBlob) ? C.bad : base[i]));
      r.row('b', 'best straight cut after this move', `${cut.wrong} wrong`, C.bad);
      sfx.tick(-2);
      return cut.wrong;
    };
    const tryBtn = h('button', { class: 'btn small', type: 'button' }, 'Try one move and a straight cut');
    const clipBtn = h('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false' }, 'Clip negatives');
    const runTries = async (fast: boolean) => {
      if (busy) return;
      busy = true; tryBtn.disabled = true; clipBtn.disabled = true;
      diamond.object.visible = false;
      const ms = fast || p.g.headless ? 20 : 700;
      let fewest = Infinity;
      for (const M of tries) {
        sfx.whoosh(ms / 1000);
        fewest = Math.min(fewest, await showTry(M, ms));
        if (!alive) return;
        await wait(fast || p.g.headless ? 10 : 900);
        if (!alive) return;
      }
      line.object.visible = false;
      await cloud.to(all.map((q) => [q[0], q[1], 0]), ms);
      if (!alive) return;
      best = fewest;
      sfx.miss();
      busy = false; tryBtn.disabled = false; clipBtn.disabled = false;
      tried = true; tick(0);
      upd();
    };
    tryBtn.addEventListener('click', async () => {
      p.move();
      await runTries(false);
      if (!alive) return;
      // the honest reason: a move keeps the origin fixed and the cluster inside the ring; a line cannot fence in a middle
      p.bark('lantern', `Four moves tried, each with its best straight cut. The best still left ${best} stars on the wrong side. Every move keeps the cluster inside the ring, and a straight line cannot fence in a middle.`);
    });
    clipBtn.addEventListener('click', () => { if (busy) return; p.move(); clip = !clip; clipBtn.setAttribute('aria-pressed', String(clip)); sfx.click(); upd(); });
    const cut = new Slider({ label: 'cut level', min: 0, max: 3, step: 0.1, value: t, onInput: (x) => { t = x; upd(); } });
    p.dock().append(tryBtn, clipBtn, cut.el);
    upd();
    return {
      async showMe() {
        if (!tried) await runTries(true);
        if (!alive) return;
        clip = true; clipBtn.setAttribute('aria-pressed', 'true'); t = 1.7; cut.set(1.7, false); upd();
      },
      wrong() { clip = false; t = 1.7; cut.set(1.7, false); upd(); },
    };
  },
};
