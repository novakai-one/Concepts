// Chapter 3: "Practice: ten short rounds" and "Harder cases", in the kit's practice shell (runDrill). Every round
// is one equation with one box, except round 8 (dependent or independent?). 2-D rounds use the kit's chart; 3-D
// rounds the chapter's calm 3-D chart (space.ts). Colours: the first vector green, the second blue, a third copper,
// the vector being made white. A wrong number shows the calculation and a ring where it lands.
import type { PuzzleDef } from '../../../game/types';
import { button, h, inline } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import {
  clean, eqRound, eqRow, focusSoon, hideHint, independent, lin, pickInt, plainDock, rng, runDrill, same, tn, tv, wrongVec,
  type Kind, type PlaneView, type Round, type Vec,
} from '../../../kit/plain';
import { MixView, add3, to3, type FitOpts, type K } from './space';
import { DRILL, FIND, MORE, TRY, U, V, W, tcol, tsumc } from './text';
import { VIEW } from './tryit';

// ------------------------------------------------------------------ colour in an equation (matches the chart)

const cg = (s: string) => `\\cg{${s}}`;
const cb = (s: string) => `\\cb{${s}}`;
const cc = (s: string) => `\\htmlClass{c03-copper}{${s}}`;
const tint: Record<K, (s: string) => string> = { g: cg, b: cb, c: cc, w: (s) => s, y: (s) => `\\cy{${s}}` };
/** c[v] with the vector coloured. */
const term = (c: number | null, v: Vec, k: K): string => `${c === null ? '' : tn(c)}${tint[k](tv(v))}`;

// ------------------------------------------------------------------ a 2-D chain of any length (the kit has two)

async function chain2(view: PlaneView, parts: { v: Vec; kind: Kind }[]): Promise<Vec> {
  view.clear();
  let at: Vec = [0, 0];
  for (let i = 0; i < parts.length; i++) {
    const { v, kind } = parts[i];
    if (Math.hypot(v[0], v[1]) < 1e-9) continue;
    await view.arrow(`c${i}`, kind).grow(v, { from: at, ms: 480 });
    at = [at[0] + v[0], at[1] + v[1]];
    sfx.snap();
    await wait(100);
  }
  return at;
}
const sumAll = (vs: Vec[]): Vec => vs.reduce((s, v) => s.map((x, i) => clean(x + v[i])), vs[0].map(() => 0));
/** c times a vector of any length (the kit's mul is 2-D). */
const mul = (c: number, v: Vec): Vec => v.map((x) => clean(c * x));

// ------------------------------------------------------------------ a 3-D round with one box

interface Eq3 {
  id: string; name: string; goal: string;
  left?: string; right?: string; answer: number;
  judge?(x: number): boolean;
  /** Vectors drawn from the origin at the start (label: u, v or w only). */
  given: { v: Vec; kind: K; label?: string }[];
  /** A ring to land on. */
  target?: Vec;
  /** A first way to the target, drawn faint. */
  faint?: { v: Vec; kind: K }[];
  /** A faint plane through the origin. */
  plane?: [Vec, Vec];
  /** The chain the typed number gives, tip to tail from the origin. */
  chain(x: number): { v: Vec; kind: K }[];
  head?: string;
  view?: FitOpts;
  good(x: number): string;
  bad(x: number): string;
  hints: string[];
}

function eq3(s: Eq3): Round {
  return {
    id: s.id, name: s.name, goal: s.goal,
    start(rc) {
      const view = rc.view as MixView, sp = view.space, { d, p } = rc;
      if (s.head) d.setHead(s.head);
      const scene = () => {
        s.given.forEach((g, i) => sp.arrow(`g${i}`, g.kind).set(to3(g.v), [0, 0, 0]).label(g.label ?? ''));
        if (s.target) sp.ring(to3(s.target));
        if (s.plane) sp.plane(to3(s.plane[0]), to3(s.plane[1]), { n: 4, opacity: 0.16 });
        if (s.faint) {
          let at: Vec = [0, 0, 0];
          s.faint.forEach((f, i) => { sp.arrow(`f${i}`, f.kind).set(to3(f.v), to3(at)).dim(0.3); at = add3(to3(at), to3(f.v)); });
        }
      };
      scene();
      // frame the givens, the target and every corner of the right chain
      const pts: Vec[] = [...s.given.map((g) => g.v), ...(s.target ? [s.target] : [])];
      s.chain(s.answer).reduce((at, c) => { const n = add3(to3(at), to3(c.v)); pts.push(n); return n; }, [0, 0, 0] as Vec);
      void view.enter3(pts.map(to3), { ...VIEW, ...s.view });
      if (s.plane) sp.setFloor(false);
      let busy = false, done = false;
      const onCheck = async (x: number) => {
        if (busy || done || !rc.live()) return;
        busy = true; row.enable(false); p.move(); d.msg('');
        try {
          sp.clear();
          scene();
          s.given.forEach((_, i) => sp.arrow(`g${i}`, s.given[i].kind).dim(0.35));
          const end = await sp.chain(s.chain(x).map((c, i) => ({ id: `c${i}`, v: to3(c.v), kind: c.kind })));
          if (!rc.live()) return;
          if (s.judge ? s.judge(x) : same(x, s.answer)) {
            done = true;
            sfx.success();
            d.msg(s.good(x), 'good');
            rc.complete();
            return;
          }
          rc.att.wrong++;
          sfx.miss();
          sp.ghost(end);
          d.msg(s.bad(x), 'bad');
        } finally { busy = false; if (rc.live()) row.enable(!done); }
      };
      const row = eqRow({ left: s.left, right: s.right, d, onCheck: (x) => void onCheck(x) });
      d.body.append(row.el);
      focusSoon(p, row);
      return {
        hints: () => (done ? [] : s.hints),
        async show() { while (busy) await wait(20); if (done) return; row.set(s.answer); row.check(); while (busy) await wait(20); },
      };
    },
  };
}

// ------------------------------------------------------------------ the ten rounds

const A1: Vec = [1, 2], T1: Vec = [3, 6];
const A2: Vec = [-2, 1], T2: Vec = [4, -2];
const A3: Vec = [1, 1], B3: Vec = [1, -1], T3: Vec = [4, 0];
const A4: Vec = [1, 2], Z2: Vec = [0, 0];
const P: Vec = [1, 0, 1], Q: Vec = [0, 1, 1], T5: Vec = [2, 3, 5], T7: Vec = [1, 1, 2];
const E1: Vec = [1, 0, 0], E2: Vec = [0, 1, 0], E3: Vec = [0, 0, 1];
const T9: Vec = [1, 1, 0], T10: Vec = [2, -1, 3];
const Z3: Vec = [0, 0, 0];

const r1 = eqRound<number>({
  id: 'r1', name: 'a multiple', goal: FIND,
  left: `${tv(T1)} =`, right: cg(tv(A1)), answer: 3,
  draw: (view) => { view.target(T1); view.arrow('v', 'g').set(A1, [0, 0]); },
  frame: [A1, T1],
  play: (view, c) => view.scale(c, A1, { bare: true }),
  ghost: (c) => mul(c, A1),
  good: () => `$3${tv(A1)} = ${tv(T1)}$. One is a multiple of the other: dependent.`,
  bad: (c) => wrongVec(mul(c, A1), T1, `${tn(c)}${tv(A1)}`),
  hints: ['Top numbers: $? \\cdot 1 = 3$.', 'Try $3$.'],
});

const r2 = eqRound<number>({
  id: 'r2', name: 'a negative multiple', goal: FIND,
  left: `${tv(T2)} =`, right: cg(tv(A2)), answer: -2,
  draw: (view) => { view.target(T2); view.arrow('v', 'g').set(A2, [0, 0]); },
  frame: [A2, T2],
  play: (view, c) => view.scale(c, A2, { bare: true }),
  ghost: (c) => mul(c, A2),
  good: () => `$-2${tv(A2)} = ${tv(T2)}$. Dependent.`,
  bad: (c) => wrongVec(mul(c, A2), T2, `${tn(c)}${tv(A2)}`),
  hints: [`$${tv(T2)}$ points the opposite way, so the number is negative.`, 'Top numbers: $? \\cdot (-2) = 4$.', 'Try $-2$.'],
});

const r3 = eqRound<number>({
  id: 'r3', name: 'a combination', goal: FIND,
  left: `${tv(T3)} = ${term(2, A3, 'g')} +{}`, right: cb(tv(B3)), answer: 2,
  draw: (view) => { view.target(T3); view.arrow('u', 'g').set(A3, [0, 0]); view.arrow('v', 'b').set(B3, [0, 0]); },
  frame: [T3, A3, B3, [2, 2]],
  play: (view, x) => view.combine(2, A3, x, B3, { bare: true }),
  ghost: (x) => lin(2, A3, x, B3),
  good: () => `$2${tv(A3)} + 2${tv(B3)} = ${tv(T3)}$. Dependent.`,
  bad: (x) => wrongVec(lin(2, A3, x, B3), T3, tsumc([[2, A3], [x, B3]])),
  hints: ['Bottom numbers: $2 \\cdot 1 + ? \\cdot (-1) = 0$.', 'Try $2$.'],
});

const r4 = eqRound<number>({
  id: 'r4', name: 'the zero vector', goal: 'Use a number that is not $0$.',
  left: `${term(0, A4, 'g')} +{}`, right: `${cb(tv(Z2))} = ${tv(Z2)}`, answer: 1,
  judge: (x) => Math.abs(x) > 1e-9,
  draw: (view) => { view.target(Z2); view.arrow('u', 'g').set(A4, [0, 0]); },
  frame: [A4, [-1, -1]],
  play: (view, x) => view.combine(0, A4, x, Z2, { bare: true }),
  good: (x) => `$0${tv(A4)} + ${tn(x)}${tv(Z2)} = ${tv(Z2)}$, and $${tn(x)} \\neq 0$. A set with $\\mathbf 0$ in it is dependent.`,
  bad: () => `$0${tv(A4)} + 0${tv(Z2)} = ${tv(Z2)}$, but both numbers are $0$. Use a number that is not $0$.`,
  hints: [`Any number times $${tv(Z2)}$ is $${tv(Z2)}$.`, 'Try $1$.'],
});

const r5 = eq3({
  id: 'r5', name: 'a combination in 3-D', goal: FIND,
  left: `${tv(T5)} = ${term(2, P, 'g')} +{}`, right: cb(tv(Q)), answer: 3,
  given: [{ v: P, kind: 'g' }, { v: Q, kind: 'b' }, { v: T5, kind: 'w' }],
  chain: (x) => [{ v: mul(2, P), kind: 'g' }, { v: mul(x, Q), kind: 'b' }],
  good: () => `$2${tv(P)} + 3${tv(Q)} = ${tv(T5)}$. Dependent.`,
  bad: (x) => wrongVec(sumAll([mul(2, P), mul(x, Q)]), T5, tsumc([[2, P], [x, Q]])),
  hints: ['Middle numbers: $2 \\cdot 0 + ? \\cdot 1 = 3$.', 'Try $3$.'],
});

const r6 = eq3({
  id: 'r6', name: 'back to 0', goal: FIND,
  left: `${term(2, P, 'g')} + ${term(3, Q, 'b')} +{}`, right: `${tv(T5)} = ${tv(Z3)}`, answer: -1,
  given: [{ v: P, kind: 'g' }, { v: Q, kind: 'b' }, { v: T5, kind: 'w' }], target: Z3,
  chain: (x) => [{ v: mul(2, P), kind: 'g' }, { v: mul(3, Q), kind: 'b' }, { v: mul(x, T5), kind: 'w' }],
  good: () => `$2${tv(P)} + 3${tv(Q)} - 1${tv(T5)} = ${tv(Z3)}$. Dependent.`,
  bad: (x) => wrongVec(sumAll([mul(2, P), mul(3, Q), mul(x, T5)]), Z3, tsumc([[2, P], [3, Q], [x, T5]])),
  hints: [`$2${tv(P)} + 3${tv(Q)} = ${tv(T5)}$. Now get back to $\\mathbf 0$.`, 'Try $-1$.'],
});

const r7 = eq3({
  id: 'r7', name: 'no two on one line', goal: `No two of these are on one line. ${FIND}`,
  left: `${tv(T7)} = ${term(1, P, 'g')} +{}`, right: cb(tv(Q)), answer: 1,
  given: [{ v: P, kind: 'g' }, { v: Q, kind: 'b' }, { v: T7, kind: 'w' }],
  chain: (x) => [{ v: P, kind: 'g' }, { v: mul(x, Q), kind: 'b' }],
  good: () => `$1${tv(P)} + 1${tv(Q)} = ${tv(T7)}$. Still dependent.`,
  bad: (x) => wrongVec(sumAll([P, mul(x, Q)]), T7, tsumc([[1, P], [x, Q]])),
  hints: ['Middle numbers: $1 \\cdot 0 + ? \\cdot 1 = 1$.', 'Try $1$.'],
});

/** Round 8: three vectors on the axes. Two buttons; the answer comes with the calculation. */
const R8_SUM = `$a${tv(E1)} + b${tv(E2)} + c${tv(E3)} = ${tcol('a', 'b', 'c')}$. It is $\\mathbf 0$ only when $a = b = c = 0$.`;
const r8: Round = {
  id: 'r8', name: 'independent', goal: 'Dependent or independent?',
  start(rc) {
    const view = rc.view as MixView, sp = view.space, { d, p } = rc;
    const E = [E1, E2, E3], kinds: K[] = ['g', 'b', 'c'];
    E.forEach((e, i) => sp.arrow(`g${i}`, kinds[i]).set(to3(e), [0, 0, 0]));
    void view.enter3(E.map(to3), { az: -62, el: 20, zoom: 0.8 });
    let done = false;
    const pick = (ans: 'dep' | 'ind') => {
      if (done) return;
      p.move();
      if (ans === 'ind') {
        done = true;
        sfx.success();
        ind.classList.add('primary');
        dep.disabled = ind.disabled = true;
        d.msg(`${R8_SUM} Independent.`, 'good');
        rc.complete();
        return;
      }
      rc.att.wrong++;
      sfx.miss();
      dep.disabled = true;
      d.msg(R8_SUM, 'bad');
    };
    const dep = button('Dependent', () => pick('dep'), { cls: 'small' });
    const ind = button('Independent', () => pick('ind'), { cls: 'small' });
    d.body.append(
      h('div', { class: 'tj-row', html: inline(`$${E.map((e, i) => tint[kinds[i]](tv(e))).join(',\\quad ')}$`) }),
      h('div', { class: 'tj-row' }, dep, ind),
    );
    return {
      hints: () => (done ? [] : [`Write $a${tv(E1)} + b${tv(E2)} + c${tv(E3)}$ as one vector.`, `It is $${tcol('a', 'b', 'c')}$. When is that $\\mathbf 0$?`]),
      async show() { pick('ind'); },
    };
  },
};

const r9 = eq3({
  id: 'r9', name: 'remove a vector', goal: FIND,
  left: `${tv(T9)} = ${term(1, E1, 'g')} +{}`, right: cb(tv(E2)), answer: 1,
  given: [{ v: E1, kind: 'g' }, { v: E2, kind: 'b' }, { v: T9, kind: 'w' }],
  chain: (x) => [{ v: E1, kind: 'g' }, { v: mul(x, E2), kind: 'b' }],
  view: { az: -62, el: 30 },
  good: () => `$1${tv(E1)} + 1${tv(E2)} = ${tv(T9)}$. Remove $${tv(T9)}$: the span stays the same.`,
  bad: (x) => wrongVec(sumAll([E1, mul(x, E2)]), T9, tsumc([[1, E1], [x, E2]])),
  hints: ['Middle numbers: $1 \\cdot 0 + ? \\cdot 1 = 1$.', 'Try $1$.'],
});

const r10 = eq3({
  id: 'r10', name: 'four vectors in R³', goal: `Four vectors in $\\mathbb R^3$. ${FIND}`,
  left: `${tv(T10)} = ${term(2, E1, 'g')} - ${term(1, E2, 'b')} +{}`, right: cc(tv(E3)), answer: 3,
  given: [{ v: E1, kind: 'g' }, { v: E2, kind: 'b' }, { v: E3, kind: 'c' }, { v: T10, kind: 'w' }],
  chain: (x) => [{ v: mul(2, E1), kind: 'g' }, { v: mul(-1, E2), kind: 'b' }, { v: mul(x, E3), kind: 'c' }],
  view: { az: -62, el: 20 },
  good: () => `$2${tv(E1)} - 1${tv(E2)} + 3${tv(E3)} = ${tv(T10)}$. Any 4 vectors in $\\mathbb R^3$ are dependent.`,
  bad: (x) => wrongVec(sumAll([mul(2, E1), mul(-1, E2), mul(x, E3)]), T10, tsumc([[2, E1], [-1, E2], [x, E3]])),
  hints: ['Bottom numbers: $2 \\cdot 0 - 1 \\cdot 0 + ? \\cdot 1 = 3$.', 'Try $3$.'],
});

// ------------------------------------------------------------------ more rounds on demand (seeded)

function extra(n: number): Round {
  const r = rng(7919 * n + 31);
  const nz = (lo: number, hi: number) => pickInt(r, lo, hi, [0]);
  if (n % 2 === 1) {
    let u: Vec = [1, 0], v: Vec = [0, 1];
    for (let i = 0; i < 40; i++) { u = [pickInt(r, -3, 3), pickInt(r, -3, 3)]; v = [pickInt(r, -3, 3), pickInt(r, -3, 3)]; if (independent(u, v)) break; }
    const a = nz(-3, 3), b = nz(-3, 3), t = lin(a, u, b, v);
    const i = Math.abs(v[0]) > 0 ? 0 : 1, nm = i === 0 ? 'Top' : 'Bottom';
    return eqRound<number>({
      id: `x${n}`, name: 'a combination', goal: FIND,
      left: `${tv(t)} = ${term(a, u, 'g')} +{}`, right: cb(tv(v)), answer: b,
      draw: (view) => { view.target(t); view.arrow('u', 'g').set(u, [0, 0]); view.arrow('v', 'b').set(v, [0, 0]); },
      frame: [t, u, v, mul(a, u)],
      play: (view, x) => view.combine(a, u, x, v, { bare: true }),
      ghost: (x) => lin(a, u, x, v),
      good: () => `$${tsumc([[a, u], [b, v]])} = ${tv(t)}$. Dependent.`,
      bad: (x) => wrongVec(lin(a, u, x, v), t, tsumc([[a, u], [x, v]])),
      hints: [`${nm} numbers: $${tn(a)} \\cdot ${tn(u[i])} + ? \\cdot ${tn(v[i])} = ${tn(t[i])}$.`, `Try $${tn(b)}$.`],
    });
  }
  let u: Vec = [1, 0, 1], v: Vec = [0, 1, 1];
  const crossZero = (x: Vec, y: Vec) => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]].every((c) => c === 0);
  for (let i = 0; i < 40; i++) {
    u = [pickInt(r, -2, 2), pickInt(r, -2, 2), pickInt(r, 0, 2)];
    v = [pickInt(r, -2, 2), pickInt(r, -2, 2), pickInt(r, 0, 2)];
    if (!crossZero(u, v)) break;
  }
  const a = nz(-2, 2), b = nz(-2, 2);
  const t = sumAll([mul(a, u), mul(b, v)]);
  const i = [0, 1, 2].find((k) => v[k] !== 0) ?? 0, nm = ['Top', 'Middle', 'Bottom'][i];
  return eq3({
    id: `x${n}`, name: 'a combination in 3-D', goal: FIND,
    left: `${tv(t)} = ${term(a, u, 'g')} +{}`, right: cb(tv(v)), answer: b,
    given: [{ v: u, kind: 'g' }, { v, kind: 'b' }, { v: t, kind: 'w' }],
    chain: (x) => [{ v: mul(a, u), kind: 'g' }, { v: mul(x, v), kind: 'b' }],
    good: () => `$${tsumc([[a, u], [b, v]])} = ${tv(t)}$. Dependent.`,
    bad: (x) => wrongVec(sumAll([mul(a, u), mul(x, v)]), t, tsumc([[a, u], [x, v]])),
    hints: [`${nm} numbers: $${tn(a)} \\cdot ${tn(u[i])} + ? \\cdot ${tn(v[i])} = ${tn(t[i])}$.`, `Try $${tn(b)}$.`],
  });
}

export const drill: PuzzleDef = {
  id: 'c03-drill', title: DRILL.title, goal: DRILL.goal, hints: [], par: 10, view: '2d',
  setup(p) {
    const view = new MixView(p);
    const d = plainDock(p);
    view.onReset = () => d.setHead('');
    hideHint(p);
    return runDrill(p, { key: 'c03-drill', rounds: [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10], extra, view, d });
  },
};

// ------------------------------------------------------------------ harder cases

const H1A: Vec = [2, 1], H1B: Vec = [-1, 2], H1C: Vec = [1, 3];
const H2A: Vec = [3, 0], H2B: Vec = [0, 2], H2C: Vec = [-2, -2];
const T13: Vec = [2, 3, 5], N3: Vec = [0, 0, 2], T14: Vec = [4, -1, 6];
const VW_HEAD = TRY.head;
const VW2_HEAD = `$\\mathbf v = ${tv(V)},\\ \\mathbf w = ${tv(W)}$`;

const h1 = eqRound<number>({
  id: 'h1', name: 'three vectors in R²', goal: `Three vectors in $\\mathbb R^2$. ${FIND}`,
  left: `${term(1, H1A, 'g')} + ${term(1, H1B, 'b')} +{}`, right: `${tv(H1C)} = ${tv(Z2)}`, answer: -1,
  draw: (view) => { view.target(Z2); view.arrow('a', 'g').set(H1A, [0, 0]); view.arrow('b', 'b').set(H1B, [0, 0]); view.arrow('c', 'w').set(H1C, [0, 0]); },
  frame: [H1A, H1B, H1C, [1, 3]],
  play: (view, x) => chain2(view, [{ v: H1A, kind: 'g' }, { v: H1B, kind: 'b' }, { v: mul(x, H1C), kind: 'w' }]),
  ghost: (x) => sumAll([H1A, H1B, mul(x, H1C)]),
  good: () => `$${tsumc([[1, H1A], [1, H1B], [-1, H1C]])} = ${tv(Z2)}$. Any 3 vectors in $\\mathbb R^2$ are dependent.`,
  bad: (x) => wrongVec(sumAll([H1A, H1B, mul(x, H1C)]), Z2, tsumc([[1, H1A], [1, H1B], [x, H1C]])),
  hints: [`$${tv(H1A)} + ${tv(H1B)} = ${tv(H1C)}$.`, `Go back along $${tv(H1C)}$: try $-1$.`],
});

const h2 = eqRound<number>({
  id: 'h2', name: 'the middle number', goal: FIND,
  left: `${term(2, H2A, 'g')} +{}`, right: `${cb(tv(H2B))} + ${tn(3)}${tv(H2C)} = ${tv(Z2)}`, answer: 3,
  draw: (view) => { view.target(Z2); view.arrow('a', 'g').set(H2A, [0, 0]); view.arrow('b', 'b').set(H2B, [0, 0]); view.arrow('c', 'w').set(H2C, [0, 0]); },
  frame: [[6, 0], [6, 6], H2C],
  play: (view, x) => chain2(view, [{ v: mul(2, H2A), kind: 'g' }, { v: mul(x, H2B), kind: 'b' }, { v: mul(3, H2C), kind: 'w' }]),
  ghost: (x) => sumAll([mul(2, H2A), mul(x, H2B), mul(3, H2C)]),
  good: () => `$${tsumc([[2, H2A], [3, H2B], [3, H2C]])} = ${tv(Z2)}$. Dependent.`,
  bad: (x) => wrongVec(sumAll([mul(2, H2A), mul(x, H2B), mul(3, H2C)]), Z2, tsumc([[2, H2A], [x, H2B], [3, H2C]])),
  hints: ['The top numbers give $0$ for any number. Use the bottom numbers.', '$2 \\cdot 0 + ? \\cdot 2 + 3 \\cdot (-2) = 0$.', 'Try $3$.'],
});

const h3 = eq3({
  id: 'h3', name: 'two ways to one point', goal: `$2\\mathbf v + 3\\mathbf w = ${tv(T13)}$. Find a second way.`,
  head: VW_HEAD,
  left: `${tv(T13)} = \\mathbf v + \\mathbf w +{}`, right: '\\mathbf u', answer: 1,
  given: [{ v: V, kind: 'g', label: '$\\mathbf v$' }, { v: W, kind: 'b', label: '$\\mathbf w$' }, { v: U, kind: 'w', label: '$\\mathbf u$' }],
  target: T13,
  faint: [{ v: mul(2, V), kind: 'g' }, { v: mul(3, W), kind: 'b' }],
  chain: (x) => [{ v: V, kind: 'g' }, { v: W, kind: 'b' }, { v: mul(x, U), kind: 'w' }],
  good: () => `$\\mathbf v + \\mathbf w + 1\\mathbf u = ${tv(T13)}$ too. Dependent vectors give more than one way.`,
  bad: (x) => wrongVec(sumAll([V, W, mul(x, U)]), T13, `\\mathbf v + \\mathbf w ${x < 0 ? '-' : '+'} ${tn(Math.abs(x))}\\mathbf u`),
  hints: ['Top numbers: $1 + 0 + ? \\cdot 1 = 2$.', 'Try $1$.'],
});

const h4 = eq3({
  id: 'h4', name: 'off the plane', goal: `$${tv(T14)}$ is off the plane of $\\mathbf v$ and $\\mathbf w$. ${FIND}`,
  head: VW2_HEAD,
  left: `${tv(T14)} = 4\\mathbf v - \\mathbf w +{}`, right: cc(tv(N3)), answer: 1.5,
  given: [{ v: V, kind: 'g', label: '$\\mathbf v$' }, { v: W, kind: 'b', label: '$\\mathbf w$' }, { v: N3, kind: 'c' }, { v: T14, kind: 'w' }],
  plane: [V, W],
  chain: (x) => [{ v: mul(4, V), kind: 'g' }, { v: mul(-1, W), kind: 'b' }, { v: mul(x, N3), kind: 'c' }],
  good: () => `$4\\mathbf v - \\mathbf w + 1.5${tv(N3)} = ${tv(T14)}$. Off the plane.`,
  bad: (x) => wrongVec(sumAll([mul(4, V), mul(-1, W), mul(x, N3)]), T14, `4\\mathbf v - \\mathbf w ${x < 0 ? '-' : '+'} ${tn(Math.abs(x))}${tv(N3)}`),
  hints: ['Bottom numbers: $4 \\cdot 1 - 1 \\cdot 1 + ? \\cdot 2 = 6$.', '$3 + 2 \\cdot ? = 6$.', 'Try $1.5$.'],
});

export const more: PuzzleDef = {
  id: 'c03-more', title: MORE.title, goal: MORE.goal, hints: [], par: 4, view: '2d',
  setup(p) {
    const view = new MixView(p);
    const d = plainDock(p);
    view.onReset = () => d.setHead('');
    hideHint(p);
    return runDrill(p, {
      key: 'c03-more', rounds: [h1, h2, h3, h4], view, d,
      text: { kick: (n, of) => `Round ${n} of ${of}`, summary: (i, c, a) => `**Done.** No help: ${i}. After a mistake: ${c}. With help: ${a}.` },
    });
  },
};
