// Chapter 1: "Where is the beacon from here?" → vector, adding vectors, scalar multiple, length.
// Every move the ship makes is an arrow the player draws; Fire flies it.
import { Vector3 } from 'three';
import type { Beat, ChapterDef, PuzzleDef, V3 } from '../../../game/types';
import { BurnChain } from '../../../kit/flight';
import { near } from '../../../kit/handle';
import { Pad, Dot } from '../../../gfx/markers';
import { Arrow } from '../../../gfx/arrow';
import { Parallelogram } from '../../../gfx/shapes';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Slider, parseNum } from '../../../ui/widgets';
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { S } from './script';
import { p1, p4, p6 } from './puzzles2';
import { sayit, doubtOrder, doubtFlip, law, compare } from './briefing';
import { P3_KMAX, P3_PAR, P5_PAR, p3SweptFull } from './logic';

const fmt = (v: V3) => `(${nice(v[0])}, ${nice(v[1])})`;

/** Dashed guides that show a vector's two parts (cadet / navigator). */
function partGuides(p: Parameters<PuzzleDef['setup']>[0], from: V3) {
  const across = new FatLine(p.g.stage, [from, from], { color: '#9fb6d8', width: 1.5, dashed: true, opacity: 0.7 });
  const up = new FatLine(p.g.stage, [from, from], { color: '#9fb6d8', width: 1.5, dashed: true, opacity: 0.7 });
  const la = new Label('', from, { className: 'coord' });
  const lu = new Label('', from, { className: 'coord' });
  p.add(across.object, up.object, la.object, lu.object);
  p.onDispose(() => { across.dispose(); up.dispose(); la.dispose(); lu.dispose(); });
  const show = p.difficulty !== 'commander';
  return (tail: V3, tip: V3) => {
    if (!show) return;
    const corner: V3 = [tip[0], tail[1], 0.01];
    across.setPoints([[tail[0], tail[1], 0.01], corner]);
    up.setPoints([corner, [tip[0], tip[1], 0.01]]);
    la.at([(tail[0] + tip[0]) / 2, tail[1] - 0.32, 0]);
    la.set(nice(tip[0] - tail[0]));
    lu.at([tip[0] + 0.35, (tail[1] + tip[1]) / 2, 0]);
    lu.set(nice(tip[1] - tail[1]));
  };
}

// ------------------------------------------------------------------ 2. around the debris

const debris: PuzzleDef = {
  id: 'c01-p2',
  title: 'Can two burns get around the debris?',
  goal: 'The grey burn already happened. Drag the **green** burn so the ship ends on the beacon, then **Fire**.',
  predict: {
    prompt: 'Afterwards, LANTERN will replay the two burns in the other order. Where will the ship end up?',
    choices: [{ id: 'same', text: 'On the same beacon' }, { id: 'else', text: 'Somewhere else' }, { id: 'debris', text: 'In the debris' }],
    answer: 'same',
    reveal: 'Both orders end on the beacon. Across: $4 + (-1) = (-1) + 4 = 3$. Up: $-1 + 3 = 3 + (-1) = 2$.',
  },
  hints: ['The autopilot left the ship at (4, −1). The beacon is at (3, 2).', 'From (4, −1) to (3, 2) is 1 back and 3 up.', 'The green burn is (−1, 3).'],
  par: 1,
  onWin: S.debrisWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 1], height: 9, ms: 0 });
    const pad = new Pad(p.g.stage, [3, 2, 0], { label: 'beacon' });
    p.add(pad);
    // debris on the straight route
    const rocks: Dot[] = [];
    for (const [x, y, s] of [[1.4, 0.95, 0.16], [1.75, 1.25, 0.11], [1.15, 0.6, 0.09], [2.0, 1.0, 0.08], [1.55, 1.55, 0.07]]) {
      const d = new Dot([x, y, 0.05], { color: '#6b7488', size: s, glow: 0.2 });
      rocks.push(d);
    }
    p.add(...rocks);
    const r = p.readout('Burns');
    let won = false;
    let replay: Promise<void> | null = null;
    const chain = new BurnChain(p, {
      fixed: [[4, -1, 0]], free: [[0, 1, 0]], labels: ['$\\mathbf w$'], fixedFlown: true,
      onChange: (end, burns) => {
        r.row('a', 'autopilot', fmt(burns[0]), '#9aa7bd');
        r.row('w', 'your burn', fmt(burns[1]), C.v);
        r.row('e', 'ship ends at', fmt(end), C.result);
      },
      onArrive: (end) => {
        if (!near(end, [3, 2, 0]) || won) return 'miss';
        won = true;
        void pad.hit();
        // the win is declared after the replay; until then the Fire button stays off
        if (chain.fireBtn) chain.fireBtn.disabled = true;
        replay = (async () => {
          // replay in the other order: the parallelogram appears
          const w = chain.free[0].vec;
          const g1 = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, opacity: 0.6, width: 0.035 });
          const g2 = new Arrow([w[0], w[1], 0], [w[0], w[1], 0], { color: '#9aa7bd', opacity: 0.6, width: 0.035 });
          const par = new Parallelogram(p.g.stage, [4, -1, 0], [w[0], w[1], 0], { color: C.result, opacity: 0 });
          // hide the edges too (the constructor's opacity sets only the fill), so nothing shows before the fade
          par.setOpacity(0, 0);
          p.add(g1, g2, par);
          await g1.moveTo([w[0], w[1], 0], 700);
          await g2.moveTo([w[0] + 4, w[1] - 1, 0], 700);
          await animate(600, (k) => par.setOpacity(0.16 * k, 0.8 * k), ease.out);
          p.win();
        })();
        return 'win';
      },
    });
    return {
      async showMe() {
        if (replay) return replay;
        await chain.moveBurn(0, [-1, 3, 0]); await chain.fire(); await replay;
      },
    };
  },
};

// ------------------------------------------------------------------ 3. one thruster, any amount

const scale: PuzzleDef = {
  id: 'c01-p3',
  title: 'How far can one thruster take you?',
  goal: 'Thruster two only pushes along **(2, 1)**. Set the amount, then **Fire**. Reach each marker buoy from the start. Then sweep the amount from −4 to 4 to see every point it reaches, and drag beacon C onto the **out of reach** pad.',
  subgoals: ['Reach the buoy at (6, 3)', 'Reach the buoy at (−4, −2)', 'Mark the beacon at (3, 2) out of reach'],
  predict: {
    prompt: 'The thruster pushes along (2, 1). Can one burn reach the buoy at (−4, −2)?',
    choices: [{ id: 'yes', text: 'Yes, fire it backwards' }, { id: 'no', text: 'No, it only pushes forwards' }, { id: 'two', text: 'Only with two burns' }],
    answer: 'yes',
    reveal: 'A negative amount flips the arrow: $-2 \\times (2, 1) = (-4, -2)$. One thruster reaches **every point on its own line**, forwards and backwards, and nothing off it.',
  },
  hints: [
    '(6, 3) is three times (2, 1).',
    '(−4, −2) points the other way. Try a negative amount.',
    'Amounts 3 and −2.',
    'Every point the thruster reaches has across = 2 × up. For (3, 2): 3 ≠ 2 × 2.',
  ],
  par: P3_PAR,
  onWin: S.scaleWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1, 0.5], height: 11, ms: 0 });
    const d: V3 = [2, 1, 0];
    const targets: V3[] = [[6, 3, 0], [-4, -2, 0]];
    const pads = targets.map((t, i) => new Pad(p.g.stage, t, { label: i === 0 ? 'buoy A' : 'buoy B', color: '#9fd8ff' }));
    p.add(...pads);
    // beacon C sits off the thruster's line; its marker goes on the "out of reach" pad
    const beaconC: V3 = [3, 2, 0];
    const outPos: V3 = [6, -2, 0]; // lower right: clear of the objective card, the readout and the line
    const padC = new Pad(p.g.stage, beaconC, { label: 'beacon C', color: '#ffb86b' });
    const padOut = new Pad(p.g.stage, outPos, { label: 'out of reach', color: '#9aa7bd' });
    const marker = new Dot([beaconC[0], beaconC[1], 0.05], { color: '#ffb86b', size: 0.13 });
    p.add(padC, padOut, marker);
    const done = [false, false, false];
    const step = p.difficulty === 'cadet' ? 1 : p.difficulty === 'navigator' ? 0.5 : 0.25;
    const r = p.readout('Thruster two');
    let k = 1;
    // the part of the thruster's line the amount has swept so far: it grows as the amount changes
    let kmin = 0, kmax = 0;
    const reach = new FatLine(p.g.stage, [[0, 0, 0.01], [0, 0, 0.01]], { color: C.v, width: 2.5, opacity: 0.4 });
    p.add(reach.object);
    p.onDispose(() => reach.dispose());
    const show = () => {
      r.row('k', 'amount $k$', nice(k));
      r.row('b', 'burn $k(2, 1)$', fmt([2 * k, k, 0]), C.v);
      r.row('s', 'amounts swept', `${nice(kmin)} to ${nice(kmax)}`);
    };
    const sweep = (kk: number) => {
      if (kk >= kmin && kk <= kmax) return;
      const was = p3SweptFull(kmin, kmax);
      kmin = Math.min(kmin, kk); kmax = Math.max(kmax, kk);
      reach.setPoints([[d[0] * kmin, d[1] * kmin, 0.01], [d[0] * kmax, d[1] * kmax, 0.01]]);
      if (!was && p3SweptFull(kmin, kmax) && !done[2]) p.bark('lantern', 'That is the whole line thruster two can reach.');
    };
    const check = () => { if (done.every(Boolean)) p.win(); };
    const chain = new BurnChain(p, {
      free: [[2, 1, 0]], labels: ['$k\\mathbf d$'], snap: null,
      constrain: (_i, q) => {
        const t = Math.round(((q.x * 2 + q.y * 1) / 5) / step) * step;
        k = Math.max(-P3_KMAX, Math.min(P3_KMAX, t));
        slider.set(k, false);
        return new Vector3(2 * k, k, 0);
      },
      // every change of the burn (slider, drag, Show me) extends the swept line
      onChange: (_end, burns) => { sweep(burns[0][1]); show(); },
      onArrive: (end) => {
        const i = targets.findIndex((t) => near(end, t));
        if (i < 0) return 'miss';
        if (!done[i]) { done[i] = true; void pads[i].hit(); p.subgoal(i); }
        if (done.every(Boolean)) { p.win(); return 'win'; }
        return 'ok';
      },
    });
    const slider = new Slider({
      label: 'amount $k$', min: -P3_KMAX, max: P3_KMAX, step, value: 1,
      onInput: (v) => { k = v; chain.setBurn(0, [2 * k, k, 0]); },
    });
    p.dock().prepend(slider.el);
    show();
    // beacon C's marker: it files on the out-of-reach pad only after the whole line has been swept
    const markerHome: V3 = [beaconC[0], beaconC[1], 0.05];
    const fileC = () => {
      if (done[2]) return;
      done[2] = true;
      marker.at([outPos[0], outPos[1], 0.05]);
      void padOut.hit();
      p.subgoal(2);
      check();
    };
    p.g.drag.add({
      target: marker.mesh, getPos: () => marker.group.position.clone(), snap: () => 0.5,
      onMove: (q) => { if (!done[2]) marker.at([q.x, q.y, 0.05]); },
      onEnd: () => {
        if (done[2]) return;
        const q = marker.group.position;
        if (near([q.x, q.y, 0], beaconC, 0.4)) { marker.at(markerHome); return; }
        p.move();
        if (!near([q.x, q.y, 0], outPos, 0.75)) { marker.at(markerHome); return; }
        if (p3SweptFull(kmin, kmax)) { fileC(); return; }
        marker.at(markerHome);
        sfx.miss();
        p.bark('lantern', 'Sweep the amount from −4 to 4 first. Then we know every point the thruster reaches.');
      },
    });
    return {
      async showMe() {
        for (const [i, kk] of [[0, 3], [1, -2]] as const) {
          if (done[i]) continue;
          k = kk; slider.set(kk, false); show();
          await chain.moveBurn(0, [2 * kk, kk, 0], 700);
          await chain.fire();
        }
        if (p.won) return;
        // sweep the dial end to end: the whole line the thruster can reach
        for (const kk of [-P3_KMAX, P3_KMAX]) {
          if (p3SweptFull(kmin, kmax)) break;
          k = kk; slider.set(kk, false);
          await chain.moveBurn(0, [2 * kk, kk, 0], 900);
        }
        const from = marker.group.position.clone();
        await animate(600, (t) => marker.at([from.x + (outPos[0] - from.x) * t, from.y + (outPos[1] - from.y) * t, 0.05]), ease.inOut);
        fileC();
      },
    };
  },
};

// ------------------------------------------------------------------ 4. three knocks: how far is home?

const home: PuzzleDef = {
  id: 'c01-p5',
  title: 'How far is home?',
  goal: 'Three debris strikes knocked the ship off course (grey). Plot **one** burn straight home and **Fire**. Then type how far home was.',
  subgoals: ['Fly home in one burn', 'Type the distance home'],
  hints: ['Add the three knocks: across 2 − 3 + 4, up 5 + 1 − 2.', 'The ship is at (3, 4). Home is 3 back and 4 down.', 'The distance is the long side of a right-angled triangle with sides 3 and 4.'],
  par: P5_PAR,
  onWin: S.homeWin,
  setup(p) {
    p.grid();
    p.g.stage.view2D({ center: [1.5, 2.5], height: 10, ms: 0 });
    const pad = new Pad(p.g.stage, [0, 0, 0], { label: 'home', color: '#9fd8ff' });
    p.add(pad);
    const r = p.readout('Burn home');
    const flags = [false, false];
    const check = () => { if (flags[0] && flags[1]) p.win(); };
    const guides = partGuides(p, [3, 4, 0]);
    const chain = new BurnChain(p, {
      fixed: [[2, 5, 0], [-3, 1, 0], [4, -2, 0]], free: [[-1, 0, 0]], labels: ['$\\mathbf v$'], fixedFlown: true,
      onChange: (_e, burns) => { const v = burns[3]; r.row('v', 'your burn', fmt(v), C.v); guides([3, 4, 0], [3 + v[0], 4 + v[1], 0]); },
      onArrive: (end) => {
        if (!near(end, [0, 0, 0])) return 'miss';
        if (!flags[0]) { flags[0] = true; void pad.hit(); p.subgoal(0); }
        check();
        return flags[1] ? 'win' : 'ok';
      },
    });
    const input = h('input', { class: 'cell', style: 'width:90px', inputmode: 'decimal', 'aria-label': 'distance home in grid steps', placeholder: '?' }) as HTMLInputElement;
    const msg = h('span', { class: 'c-muted', style: 'font-size:13px' });
    // one typed answer is one move, whether it arrives by Enter, by change or by blur
    let lastChecked = '';
    const tryAnswer = () => {
      const text = input.value.trim();
      if (flags[1] || text === lastChecked) return;
      lastChecked = text;
      const v = parseNum(text);
      if (v === null) return;
      p.move();
      if (Math.abs(v - 5) < 0.01) { flags[1] = true; input.classList.remove('bad'); input.style.borderColor = C.good; msg.textContent = '√(3² + 4²) = 5'; p.subgoal(1); check(); }
      else { input.classList.add('bad'); sfx.miss(); msg.textContent = Math.abs(v - 7) < 0.01 ? '3 + 4 is the zig-zag route. The arrow cuts the corner.' : 'Not quite. Think of the right-angled triangle.'; }
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); tryAnswer(); } });
    input.addEventListener('change', tryAnswer);
    p.dock().append(h('label', { style: 'display:flex;gap:10px;align-items:center;font-size:14px' }, 'Distance home:', input, 'grid steps'), msg);
    return {
      async showMe() {
        await chain.moveBurn(0, [-3, -4, 0]);
        await chain.fire();
        input.value = '5';
        tryAnswer();
      },
    };
  },
};

// ------------------------------------------------------------------ the chapter


const NAME_VECTOR: Beat = {
      kind: 'name', id: 'name-vector', entry: {
        id: 'vector', term: 'vector', question: 'Where is it, and how do I get there?', nodes: ['N01', 'N02'],
        saw: 'Every burn was an arrow: **so far across, so far up**. The ship ended where the last arrow ended, tip to tail. Both orders of the two burns ended on the same beacon.',
        means: 'An arrow is a move. The same two numbers move you the same way from anywhere, so the arrow does not depend on where it starts.',
        name: 'A **vector** is an arrow given by how far it moves along each axis. We write its numbers in a column. Doing one move after another is **adding vectors**: add the across numbers, add the up numbers.',
        formula: '\\cg{\\begin{bmatrix} 4 \\\\ -1 \\end{bmatrix}} + \\cr{\\begin{bmatrix} -1 \\\\ 3 \\end{bmatrix}} = \\cy{\\begin{bmatrix} 3 \\\\ 2 \\end{bmatrix}}',
        why: 'Each part adds on its own: $4 + (-1) = 3$ across and $-1 + 3 = 2$ up. Two numbers give the same sum in either order, so two vectors do too.',
        cue: 'When you see **“how far in each direction”**, think **vector**.',
        use: 'Every data point a model reads is a vector: a list of numbers that places it in space. A 28×28 image is a vector with 784 numbers.',
      },
    };

const NAME_SCALAR: Beat = {
      kind: 'name', id: 'name-scalar', entry: {
        id: 'scalar-multiple', term: 'scalar multiple', question: 'What happens when I use more or less of one arrow?', nodes: ['N02'],
        saw: 'With one thruster, every burn lay on one line through the start. Bigger amounts went further along it. Negative amounts went the other way. Beacon C, off that line, was out of reach.',
        means: 'Multiplying a vector by a number stretches it along its own line. A negative number also flips it. No amount takes it off the line, so a point off the line is out of one arrow\'s reach.',
        name: 'A **scalar** is a plain number. The **scalar multiple** $k\\mathbf v$ multiplies every part of $\\mathbf v$ by $k$. Two arrows are **parallel** when one is a scalar multiple of the other. Drawn from the same start, they lie on one line, even when they point opposite ways. The amount 0 gives the **zero vector** $\\mathbf 0$: the move that goes nowhere.',
        formula: '3\\,\\cg{\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix}} = \\cy{\\begin{bmatrix} 6 \\\\ 3 \\end{bmatrix}} \\qquad -2\\,\\cg{\\begin{bmatrix} 2 \\\\ 1 \\end{bmatrix}} = \\cy{\\begin{bmatrix} -4 \\\\ -2 \\end{bmatrix}} \\qquad 0\\,\\mathbf v = \\mathbf 0',
        why: 'Every part is multiplied by the same number, so the ratio across : up stays 2 : 1. The arrow stays on its line.',
        cue: 'When you see **“the same direction, more or less of it”**, think **scalar multiple**.',
        use: 'Turning up an image\'s brightness multiplies its pixel vector by a scalar.',
      },
    };

const NAME_LENGTH: Beat = {
      kind: 'name', id: 'name-length', entry: {
        id: 'length', term: 'length', question: 'How far is it?', nodes: ['N01'],
        saw: 'The burn home was 3 back and 4 down. Its two parts are the two short sides of a right-angled triangle, and the arrow is the long side.',
        means: 'Pythagoras gives the long side: $\\sqrt{3^2 + 4^2} = 5$. Adding the parts (3 + 4 = 7) gives the zig-zag route, which is longer.',
        name: 'The **length** of a vector, written $\\|\\mathbf v\\|$, is the distance from its tail to its tip.',
        formula: '\\|\\cg{\\mathbf v}\\| = \\sqrt{v_1^2 + v_2^2} \\qquad \\left\\|\\begin{bmatrix} -3 \\\\ -4 \\end{bmatrix}\\right\\| = \\sqrt{9 + 16} = 5',
        why: 'Square each part, add, take the square root. In 3-D there is one more square: $\\sqrt{v_1^2 + v_2^2 + v_3^2}$.',
        cue: 'When you see **“how far”** or **“distance”**, think **length**.',
        use: 'Nearest-neighbour search finds similar items by the length of the difference between two vectors.',
      },
    };

/** A random whole-number vector for the build swarms. */
const vec = (r: () => number, n: number): number[] => Array.from({ length: n }, () => Math.floor(r() * 21) - 10);

const BUILD_ADD: Beat = {
      kind: 'build', id: 'build-add', build: {
        id: 'c01-add', fn: 'add', title: 'Add two moves',
        brief: 'Write `add(v, w)`. It returns the vector you get by doing move `v`, then move `w`.\n\n`v` and `w` are lists of numbers of the same length, such as `[4, -1]` and `[-1, 3]`. Add matching parts.',
        starter: 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    # v and w are lists like [4, -1] and [-1, 3]\n    return []\n',
        solution: 'def add(v, w):\n    """Return the vector for move v followed by move w."""\n    return [a + b for a, b in zip(v, w)]\n',
        tests: [
          { name: '`add([4, -1], [-1, 3])` is `[3, 2]`', args: [[4, -1], [-1, 3]], expect: [3, 2] },
          { name: 'the other order gives the same', args: [[-1, 3], [4, -1]], expect: [3, 2] },
          { name: 'three numbers: `add([1, 2, 3], [4, 5, 6])`', args: [[1, 2, 3], [4, 5, 6]], expect: [5, 7, 9] },
          { name: 'adding zero changes nothing', args: [[2, 5], [0, 0]], expect: [2, 5] },
        ],
        swarm: { gen: (r) => { const n = r() < 0.7 ? 2 : 3; return [vec(r, n), vec(r, n)]; }, crew: (v, w) => (v as number[]).map((x, i) => x + (w as number[])[i]) },
        docPrompt: 'Why does adding matching parts give the move “v, then w”? Write it the way you would tell Bram.',
        payoff: 'LANTERN adds burns with your `add` from now on.',
      },
    };

const BUILD_SCALE: Beat = {
  kind: 'build', id: 'build-scale', build: {
    id: 'c01-scale', fn: 'scale', title: 'More or less of one move',
    brief: 'Write `scale(c, v)`. It returns the vector `v` stretched by the number `c`: multiply every part by `c`. A negative `c` flips it.',
    starter: 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    # multiply every part of v by c\n    return []\n',
    fill: 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    return [___ for x in v]\n',
    solution: 'def scale(c, v):\n    """Return the vector v stretched by the number c."""\n    return [c * x for x in v]\n',
    assemble: { lines: ['def scale(c, v):', '    """Return the vector v stretched by the number c."""', '    return [c * x for x in v]'], decoys: ['    return [c + x for x in v]'] },
    tests: [
      { name: '`scale(3, [2, 1])` is `[6, 3]`', args: [3, [2, 1]], expect: [6, 3] },
      { name: 'a negative amount flips: `scale(-2, [2, 1])`', args: [-2, [2, 1]], expect: [-4, -2] },
      { name: 'zero gives the zero vector', args: [0, [5, -7]], expect: [0, 0] },
      { name: 'three parts: `scale(0.5, [2, 4, 6])`', args: [0.5, [2, 4, 6]], expect: [1, 2, 3] },
    ],
    swarm: { gen: (r) => [Math.round((r() * 8 - 4) * 2) / 2, vec(r, r() < 0.7 ? 2 : 3)], crew: (c, v) => (v as number[]).map((x) => (c as number) * x) },
    payoff: 'The dials on the burn planner use your `scale` from now on.',
  },
};

const BUILD_LENGTH: Beat = {
      kind: 'build', id: 'build-length', build: {
        id: 'c01-length', fn: 'length', title: 'How far is a move?',
        brief: 'Write `length(v)`. It returns the length of vector `v`: square each part, add them, take the square root. `math.sqrt` is available.',
        starter: 'def length(v):\n    """Return the length of vector v."""\n    total = 0\n    # add up the square of each part\n    return math.sqrt(total)\n',
        solution: 'def length(v):\n    """Return the length of vector v."""\n    return math.sqrt(sum(x * x for x in v))\n',
        tests: [
          { name: '`length([3, 4])` is 5', args: [[3, 4]], expect: 5 },
          { name: 'negative parts: `length([-3, -4])` is 5', args: [[-3, -4]], expect: 5 },
          { name: 'three parts: `length([1, 2, 2])` is 3', args: [[1, 2, 2]], expect: 3 },
          { name: 'the zero vector has length 0', args: [[0, 0]], expect: 0 },
        ],
        swarm: { gen: (r) => [vec(r, r() < 0.7 ? 2 : 3)], crew: (v) => Math.hypot(...(v as number[])), tol: 1e-9 },
        payoff: 'The distance readouts use your `length` from now on.',
      },
    };

const ch: ChapterDef = {
  id: 'c01',
  act: 1,
  num: 1,
  title: 'Where is the beacon from here?',
  subtitle: 'Vectors',
  nodes: ['N01', 'N02'],
  palette: 'default',
  music: 'explore',
  script: S,
  inShort: 'How do I tell the ship where to go? Give it an arrow: so far across, so far up. Doing one arrow after another lands where the tip-to-tail chain ends, in either order.',
  beats: [
    { kind: 'scene', id: 'open', lines: S.open },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Where is the beacon from here?', body: 'How do I tell the ship where to go?\n\nGive it an arrow: **so far across, so far up**. Doing one arrow after another lands where the tip-to-tail chain ends, in either order.' } },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'debris', lines: S.debris },
    { kind: 'puzzle', id: 'p2', puzzle: debris },
    NAME_VECTOR,
    { kind: 'scene', id: 'thruster', lines: S.thruster },
    { kind: 'puzzle', id: 'p3', puzzle: scale },
    NAME_SCALAR,
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'knocks', lines: S.knocks },
    { kind: 'puzzle', id: 'p5', puzzle: home },
    NAME_LENGTH,
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-flip', doubt: doubtFlip },
    { kind: 'doubt', id: 'd-order', doubt: doubtOrder },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: 'Every game engine moves things with one line: `position += velocity * dt`. It adds a small arrow to a position, many times a second. The burn planner you flew with does exactly that.\n\nData is arrows too: a 28 × 28 image is **one arrow with 784 parts**.', cue: 'When you see **“from here to there”**, think **end minus start**.' } },
    BUILD_ADD,
    BUILD_SCALE,
    BUILD_LENGTH,
    { kind: 'scene', id: 'close', lines: S.close },
  ],
};

export default ch;
