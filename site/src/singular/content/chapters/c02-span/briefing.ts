// Chapter 2 Briefing (GDD §6.3 Ch 2): Say it, two Doubts (one false, one true), the Law, Ilse's page,
// and the Why-it-matters card's picture (the reach planner).
import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { CardDef, CompareDef, DoubtDef, Game, LawDef, SayItDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Beacon, Dot } from '../../../gfx/markers';
import { InfLine } from '../../../gfx/shapes';
import { button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { burst } from '../../../gfx/fx';
import { rint } from '../../../game/lawcheck';
import type { Vec } from '../../../math/la';
import { DialRig, fmtV, to3, own } from './rig';
import { ReachGlow } from './reach';
import { bramPlace, doubledNewHolds, flippedSameHolds, lawCore, spanDim, distToSpan, THRUST3, type SpanCase } from './logic';

const T0 = to3(THRUST3[0]), T1 = to3(THRUST3[1]);
const SHAPES = ['a point', 'a line', 'a plane', 'all of space'];
const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];

/** Two random arrows in 3-D that point different ways (small whole numbers). */
function randomPair(r: () => number): [V3, V3] {
  for (;;) {
    const a: V3 = [rint(r, -2, 2), rint(r, -2, 2), rint(r, -1, 2)];
    const b: V3 = [rint(r, -2, 2), rint(r, -2, 2), rint(r, -1, 2)];
    if (spanDim([a, b]) === 2) return [a, b];
  }
}

export const sayit: SayItDef = {
  id: 'c02', who: 'bram',
  ask: 'Can two vectors in 3D ever span all of 3D space? Why not?',
  frames: {
    see: 'When I turned the two dials, the glow ___.',
    means: 'Two arrows in 3-D reach ___, because ___.',
    called: 'Every point two arrows can reach is called their ___.',
    cue: 'When I see ___, I think ___.',
  },
  wordBank: ['dials', 'glow', 'plane', 'line', 'origin', 'any amount', 'negative', 'stretch', 'add', 'edge-on', 'off the plane'],
};

// ------------------------------------------------------------------ (F) doubling the thrusters

export const doubtDouble: DoubtDef = {
  id: 'c02-d-double', who: 'bram', isTrue: false,
  claim: 'Make both thrusters twice as strong and we’ll reach new places.',
  reason: 'Doubling a thruster is the same as doubling its dial. Every place the stronger pair reaches, the old pair reaches with dials twice as big. Same plane, nothing new.',
  goal: 'The orange marker is a place Bram’s doubled thrusters reach. Turn the **old** thrusters’ dials. If they land on his marker, **Challenge it**. If you think they cannot, **Back it**.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.7, 0.9, 3.0], distance: 15, azimuth: -58, elevation: 16, ms: 0 });
    let v = T0, w = T1;
    let bram: Vec = [0.5, 1];
    const rig = new DialRig(p, {
      arrows: [v, w], dims: 3, names: ['a', 'b'], tags: ['old thruster two', 'old thruster three'], dials: [1, 1], range: [-5, 5],
      preview: 'live', ship: false, fireLabel: null, dragTip: true, readoutTitle: 'The old thrusters', glow: { cell: 0.1 },
    });
    const dv = new Arrow([0, 0, 0], [0, 0, 0], { color: C.v, width: 0.028, opacity: 0.4, label: '$2\\mathbf v$' });
    const dw = new Arrow([0, 0, 0], [0, 0, 0], { color: C.w, width: 0.028, opacity: 0.4, label: '$2\\mathbf w$' });
    const mark = new Beacon(p.g.stage, [0, 0, 0], { color: C.orange, label: 'Bram: only the doubled pair' });
    p.add(dv, dw, mark);
    const place = () => {
      dv.set([0, 0, 0], [2 * v[0], 2 * v[1], 2 * v[2]]);
      dw.set([0, 0, 0], [2 * w[0], 2 * w[1], 2 * w[2]]);
      mark.at(to3(bramPlace(v, w, bram)));
    };
    place();
    const tip = () => rig.tip;
    return {
      holds: () => doubledNewHolds(v, w, bram, rig.dials),
      describe: () => `v = ${fmtV(v)}, w = ${fmtV(w)}; Bram’s place ${fmtV(bramPlace(v, w, bram))}; dials a = ${nice(rig.dials[0])}, b = ${nice(rig.dials[1])} land at ${fmtV(tip())}`,
      async play() {
        if (!doubledNewHolds(v, w, bram, rig.dials)) { sfx.success(); void burst(p.g.stage, tip(), C.result, 50, 2.2, false); }
        await wait(p.g.headless ? 10 : 350);
      },
      randomize(r, edge) {
        [v, w] = randomPair(r);
        bram = [[-1.5, -1, -0.5, 0.5, 1, 1.5][rint(r, 0, 5)], [-1.5, -1, -0.5, 0.5, 1, 1.5][rint(r, 0, 5)]];
        void rig.setArrows([v, w]);
        rig.glow?.clear();
        if (edge === 0) rig.setDials([2 * bram[0], 2 * bram[1]], false);
        else {
          let d: Vec;
          do { d = [rint(r, -3, 3), rint(r, -3, 3)]; } while (d[0] === 2 * bram[0] && d[1] === 2 * bram[1]);
          rig.setDials(d, false);
        }
        place();
      },
      edgeCases: 1,
      async showMe() { await rig.moveDials([2 * bram[0], 2 * bram[1]], 900); },
    };
  },
};

// ------------------------------------------------------------------ (T) one thruster backwards

export const doubtFlip: DoubtDef = {
  id: 'c02-d-flip', who: 'bram', isTrue: true,
  claim: 'Point one thruster backwards and we reach exactly the same places.',
  reason: 'Firing a thruster backwards is the same as turning its dial negative, and a dial can already be negative. So the reversed thruster reaches nothing new and loses nothing: the same plane, the same line or the same point.',
  goal: 'The yellow glow is everything the two thrusters reach. Press **Flip thruster three**: the cyan glow is everything the flipped pair reaches. **Back it** if they match, **Challenge it** if you can make them differ.',
  view: '3d',
  setup(p) {
    void p.g.stage.view3D({ target: [0.3, 0.3, 2.1], distance: 16, azimuth: -55, elevation: 18, ms: 0 });
    let v = T0, w = T1;
    let flipped = false;
    const before = new ReachGlow(p.g.stage, { cell: 0.12 });
    const after = new ReachGlow(p.g.stage, { cell: 0.12, size: 0.22, gain: 0.55, color: '#59e1ff' });
    p.add(before, after);
    const av = new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' });
    const aw = new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' });
    p.add(av, aw);
    const R: [number, number] = [-2.5, 2.5];
    const paint = () => {
      before.clear(); before.setArrows([v, w]); before.fill([R, R], { step: [0.15, 0.15], spread: 0.8 });
      after.clear();
      if (flipped) { after.setArrows([v, neg(w)]); after.fill([R, R], { step: [0.24, 0.24], spread: 0.8, seed: 3 }); }
    };
    const draw = () => {
      av.set([0, 0, 0], v);
      aw.set([0, 0, 0], flipped ? neg(w) : w);
      aw.setLabel(flipped ? '$-\\mathbf w$' : '$\\mathbf w$');
      flipBtn.textContent = flipped ? 'Point thruster three forwards' : 'Flip thruster three';
    };
    const flipBtn = button('Flip thruster three', () => { flipped = !flipped; p.move(); draw(); paint(); sfx.whoosh(0.5); }, { cls: 'small' });
    p.dock().appendChild(flipBtn);
    const r = p.readout('Two thrusters');
    const read = () => {
      r.row('v', '$\\mathbf v$', fmtV(v), C.v);
      r.row('w', flipped ? '$-\\mathbf w$' : '$\\mathbf w$', fmtV(flipped ? neg(w) : w), C.w);
      r.row('s', 'they reach', SHAPES[spanDim([v, w])], C.result);
    };
    paint(); draw(); read();
    return {
      holds: () => flippedSameHolds(v, w),
      describe: () => `v = ${fmtV(v)}, w = ${fmtV(w)}: v with w and v with −w both reach ${SHAPES[spanDim([v, w])]}, the same one`,
      async play() {
        if (!flipped) { flipped = true; draw(); paint(); }
        await wait(p.g.headless ? 10 : 500);
      },
      randomize(rr, edge) {
        if (edge === 0) { v = T0; w = [0, 0, 0]; }
        else if (edge === 1) { v = [1, 2, 0]; w = [-2, -4, 0]; }
        else if (edge === 2) { v = [0, 0, 0]; w = [1, -1, 2]; }
        else [v, w] = randomPair(rr);
        flipped = true;
        draw(); paint(); read();
      },
      edgeCases: 3,
      async showMe() { if (!flipped) { flipped = true; draw(); paint(); } await wait(p.g.headless ? 10 : 900); },
    };
  },
};

// ------------------------------------------------------------------ the Law

export const law: LawDef<SpanCase> = {
  ...lawCore,
  frame: ['The span of $\\cg{\\mathbf v}$ and $\\cr{\\mathbf w}$ is ', { slot: 'shape' }, ' exactly when ', { slot: 'cond' }, '.'],
  slots: {
    shape: { options: [{ id: 'plane', text: 'the whole plane' }, { id: 'line', text: 'a line' }, { id: 'point', text: 'a point' }] },
    cond: {
      options: [
        { id: 'apart', text: 'v and w are not on one line' },
        { id: 'oneline', text: 'v and w lie on one line' },
        { id: 'onelineNZ', text: 'v and w lie on one line, not both zero' },
        { id: 'differ', text: 'v and w are different arrows' },
        { id: 'apartOrZero', text: 'v and w are not on one line, or one is zero' },
        { id: 'zero', text: 'v and w are both zero' },
      ],
    },
  },
  cadetSlots: ['shape', 'cond'],
  draw(g: Game, c: SpanCase) {
    const v = to3(c.v), w = to3(c.w);
    const d = spanDim([c.v, c.w]);
    if (d === 2) {
      const m = new Mesh(new PlaneGeometry(40, 40), new MeshBasicMaterial({ color: C.result, transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false }));
      m.position.z = -0.01;
      g.stage.world.add(m);
    } else if (d === 1) {
      const dir = Math.hypot(...v) > 1e-9 ? v : w;
      g.stage.world.add(new InfLine(g.stage, [0, 0, 0], dir, { color: C.result, width: 3, opacity: 0.85 }).object);
    }
    g.stage.world.add(new Dot([0, 0, 0.02], { color: C.result, size: 0.1 }).object);
    if (Math.hypot(...v) > 1e-9) g.stage.world.add(own(new Arrow([0, 0, 0], v, { color: C.v, label: '$\\mathbf v$' })).object);
    if (Math.hypot(...w) > 1e-9) g.stage.world.add(own(new Arrow([0, 0, 0], w, { color: C.w, label: '$\\mathbf w$' })).object);
  },
  reason: {
    // Three fillings survive (plane/apart, line/onelineNZ, point/zero), so the reason covers all of them.
    ask: 'Your Law survived. **Why** does it all come down to whether $\\mathbf v$ and $\\mathbf w$ lie on one line?',
    options: [
      { id: 'split', text: 'Not on one line: through any point, draw a line along $\\mathbf w$. It crosses the line of $\\mathbf v$, so the point is a stretch of $\\mathbf v$ plus a stretch of $\\mathbf w$: the whole plane. On one line: every stretch and every sum stays on that line. If both arrows are zero, that is only the origin.', right: true, why: 'Yes. When the two lines through the origin cross, every point splits into a part along v and a part along w, one dial setting each. When v and w share a line, nothing leaves it, and two zero arrows never leave the origin.' },
      { id: 'between', text: 'The two arrows fill the space between them, and the dials push that space outwards.', right: false, why: 'The reach is not built from the space between the arrows. Dials can be negative, so the reach also covers the far side, where neither arrow points.' },
      { id: 'two', text: 'Two arrows always reach everything.', right: false, why: 'Not when they lie on one line: every stretch and every sum stays on that line. And two zero arrows reach only the origin.' },
    ],
  },
};

// ------------------------------------------------------------------ Ilse's page

export const compare: CompareDef = {
  id: 'c02',
  page: 'Fire one thruster for $a$ and the other for $b$: the ship lands at $a\\mathbf v + b\\mathbf w$, a **linear combination** of $\\mathbf v$ and $\\mathbf w$. The numbers $a$ and $b$ are its **weights**. They can be any numbers: zero, fractions, negatives.\n\nEvery point you can reach this way is the **span** of $\\mathbf v$ and $\\mathbf w$. It always contains the origin: set both weights to zero. It has no edges, because the weights have no limit. It is flat: the line through any two reachable points stays reachable.\n\nTwo arrows that are not on one line span a plane through the origin. Two arrows on one line span only that line. So in 3-D two arrows span at most a plane. A point off that plane, like the *Meridian*’s signal, is out of reach.',
  formula: '\\operatorname{span}\\{\\cg{\\mathbf v}, \\cr{\\mathbf w}\\} = \\{\\, a\\,\\cg{\\mathbf v} + b\\,\\cr{\\mathbf w} \\;:\\; a, b \\text{ any numbers} \\,\\}',
  keyIdeas: [
    'Did you say the weights can be any numbers, including zero and negative ones?',
    'Did you say two arrows on one line reach only that line?',
    'Did you say why two arrows in 3-D reach at most a plane, never all of space?',
  ],
};

// ------------------------------------------------------------------ Why it matters: the reach planner

const PLANNER_BEACONS: V3[] = [[2, 3, 5], [1, 1, 0], [-1, 2, 1], [3, -1, 2], [0, 2, 0], [-2, -1, -3], [2, 2, 1], [1, -2, -1]];

export const why: CardDef = {
  kind: 'why',
  title: 'Why it matters',
  body: 'A linear model predicts with a linear combination of its input columns: so much of this column plus so much of that. Whatever weights it learns, **its predictions lie in the span of those columns**. If the true answers are off that span, no weights fit them exactly.\n\nThe reach planner now runs the same check on beacons. It lights the ones our two thrusters can reach and leaves the rest dark.',
  cue: 'When you see **“can I make this from these?”**, think **span**.',
  visual: async (g: Game) => {
    g.stage.clearWorld();
    const glow = new ReachGlow(g.stage, { cell: 0.13 });
    glow.setArrows([T0, T1]);
    glow.fill([[-3.2, 3.2], [-3.2, 3.2]], { spread: 1.4 });
    g.stage.world.add(glow.object);
    for (const b of PLANNER_BEACONS) {
      const on = distToSpan([THRUST3[0], THRUST3[1]], b) < 1e-9;
      g.stage.world.add(new Beacon(g.stage, b, { color: on ? C.good : '#5a6478', beam: true }).object);
    }
    await g.stage.view3D({ target: [0.3, 0.3, 0.6], distance: 19, azimuth: -135, elevation: 42, ms: 0, orbit: false });
    let t = 0;
    const off = g.stage.tick((dt) => {
      t += dt;
      // look at the plane nearly face-on, swaying slowly, so lit and dark beacons both show
      const a = ((-135 + 18 * Math.sin(t * 0.12)) * Math.PI) / 180, e = (42 * Math.PI) / 180, d = 19;
      g.stage.camera.position.set(0.3 + d * Math.cos(e) * Math.cos(a), 0.3 + d * Math.cos(e) * Math.sin(a), 0.6 + d * Math.sin(e));
      g.stage.camera.up.set(0, 0, 1);
      g.stage.camera.lookAt(0.3, 0.3, 0.6);
    });
    glow.mesh.userData.dispose = (() => { const d0 = glow.mesh.userData.dispose as () => void; return () => { off(); d0(); }; })();
  },
};
