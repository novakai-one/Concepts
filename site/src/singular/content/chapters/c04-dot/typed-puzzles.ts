import './typed.css';
import type { PuzzleCtx, PuzzleDef, PuzzleRuntime } from '../../../game/types';
import type { Vec } from '../../../math/la';
import { dot, norm } from '../../../math/la';
import {
  PlaneView,
  plainDock,
  eqRow,
  runDrill,
  focusSoon,
  type Round,
  type RoundCtx,
  type RoundRun,
  type PlainDock,
  type EqRow,
} from '../../../kit/plain';
import { tlen } from '../../../kit/plain/tex';
import { column as tv, number as tnp, signed as tnb } from './typed-tex';
import { h, button, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import { S, save } from '../../../core/save';
import {
  PRODUCT_CASES,
  PERP_CASES,
  ANGLE_CASES,
  difference,
  squared,
  cosineOf,
  degreesOf,
  meetsPerp,
  type ProductCase,
  type PerpCase,
  type AngleCase,
} from './typed-data';
import { DotPicture } from './typed-picture';
const pair = (v: Vec, w: Vec) => `$\\mathbf v=${tv(v)}\\quad\\mathbf w=${tv(w)}$`;
const calc = (v: Vec, w: Vec) => `${tnb(v[0])}\\times${tnb(w[0])}+${tnb(v[1])}\\times${tnb(w[1])}`;
const blankSym = (v: Vec, i: 0 | 1) =>
  `\\begin{bmatrix}${i === 0 ? 'v_1' : tnp(v[0])}\\\\${i === 1 ? 'v_2' : tnp(v[1])}\\end{bmatrix}`;
const named = (v: Vec, w: Vec) => `${tv(v)}\\cdot${tv(w)}`;
const roundedRelation = (x: number, digits: number) =>
  Math.abs(x - Number(x.toFixed(digits))) < 1e-12 ? '=' : '\\approx';
const exact = (a: number, b: number, tol = 1e-8) => Math.abs(a - b) <= tol;
const RULE = '$\\mathbf v\\cdot\\mathbf w=v_1w_1+v_2w_2$';
const HELP = 'Multiply matching numbers, then add: $\\mathbf v\\cdot\\mathbf w=v_1w_1+v_2w_2$.\n\nDecimals and fractions work.';
const ANGLE_HELP =
  'The yellow side joins the vector endpoints: $\\mathbf v-\\mathbf w$. Both formulas calculate the squared length of that side.\n\nUse inverse cosine in degree mode. Give cosines to four decimal places and angles to the nearest $0.1^\\circ$.';
function scene(p: PuzzleCtx, angle = false): { view: PlaneView; d: PlainDock; picture: DotPicture } {
  const d = plainDock(p, { help: angle ? ANGLE_HELP : HELP });
  d.root.classList.add('c04-typed');
  const view = new PlaneView(p),
    picture = new DotPicture(p, view);
  return { view, d, picture };
}
function productRound(c: ProductCase, i: number, picture: DotPicture): Round {
  const unknown = c.unknown,
    result = dot(c.v, c.w);
  const sym = unknown === undefined ? '' : `v_${unknown + 1}`;
  const shown = (v: Vec) =>
    unknown === undefined ? tv(v) : `\\begin{bmatrix}${unknown === 0 ? sym : tnp(v[0])}\\\\${unknown === 1 ? sym : tnp(v[1])}\\end{bmatrix}`;
  return {
    id: `dot-${i}`,
    name: unknown === undefined ? 'calculate v · w' : `find v${unknown + 1}`,
    goal:
      unknown === undefined
        ? i < 3
          ? 'Multiply matching numbers, then add.'
          : 'Fill in the box.'
        : `Find $${sym}$: $${shown(c.v)}\\cdot${tv(c.w)}=${tnp(result)}$.`,
    noHints: i >= 8,
    start(base) {
      const rc = { ...base, live: () => base.live() && picture.live };
      const { p, d } = rc;
      let busy = false,
        done = false;
      d.setHead(RULE);
      void picture.set(unknown === undefined ? c.v : [0, 0], c.w);
      if (unknown !== undefined) picture.view.arrow('v').hide();
      const answer = unknown === undefined ? result : c.v[unknown];
      const row = eqRow({
        d,
        aria: unknown === undefined ? 'v dot w' : `missing number v${unknown + 1}`,
        left:
          unknown === undefined
            ? `${named(c.v, c.w)}=` + (i < 3 ? calc(c.v, c.w) + '=' : '')
            : `${sym}=`,
        onCheck: async (x) => {
          if (busy || done || !rc.live()) return;
          busy = true;
          row.enable(false);
          d.msg('');
          p.move();
          const v = c.v.slice();
          if (unknown !== undefined) v[unknown] = x;
          try {
            await picture.reveal(v, c.w);
            if (!rc.live()) return;
            const actual = dot(v, c.w),
              right = exact(x, answer);
            d.msg(
              `$${calc(v, c.w)}=${tnp(actual)}$.${right ? '' : unknown === undefined ? ` Not $${tnp(x)}$.` : ` Not $${tnp(result)}$.`}`,
              right ? 'good' : 'bad',
            );
            if (!right) {
              rc.att.wrong++;
              sfx.miss();
              return;
            }
            done = true;
            sfx.success();
            rc.complete();
          } finally {
            busy = false;
            if (rc.live()) row.enable(!done);
          }
        },
      });
      d.body.append(row.el);
      focusSoon(p, row);
      return {
        hints: () =>
          done
            ? []
            : [
                unknown === undefined
                  ? 'Multiply the top numbers, multiply the bottom numbers, then add.'
                  : `Write $v_1w_1+v_2w_2=${tnp(result)}$ with the numbers you know, then solve for $${sym}$.`,
                `$${calc(c.v, c.w)}=${tnp(result)}$.`,
              ],
        async show() {
          while (busy) await wait(20);
          row.set(answer);
          row.check();
          while (busy) await wait(20);
        },
      };
    },
  };
}
function perpRound(c: PerpCase, i: number, picture: DotPicture): Round {
  const unknown = c.unknown;
  return {
    id: `perp-${i}`,
    name: c.constraint ? 'v · w = 0 and one more condition' : 'make v · w = 0',
    noHints: i >= 8,
    goal:
      unknown !== undefined
        ? `Find $v_${unknown + 1}$: $${blankSym(c.answer, unknown)}\\cdot${tv(c.w)}=0$.`
        : c.constraint
          ? `Find $\\mathbf v$ with $\\mathbf v\\cdot\\mathbf w=0$ and $v_1${c.constraint === 'sum' ? '+' : '-'}v_2=${tnp(c.target!)}$.`
          : 'Find any $\\mathbf v\\ne\\mathbf 0$ with $\\mathbf v\\cdot\\mathbf w=0$.',
    start(base) {
      const rc = { ...base, live: () => base.live() && picture.live };
      const { p, d } = rc;
      let busy = false,
        done = false;
      d.setHead(RULE);
      void picture.set([0, 0], c.w);
      picture.view.arrow('v').hide();
      const check = async (x: number | Vec) => {
        if (busy || done || !rc.live()) return;
        const v = typeof x === 'number' ? c.answer.map((a, j) => (j === unknown ? x : a)) : x;
        busy = true;
        row.enable(false);
        d.msg('');
        p.move();
        try {
          await picture.reveal(v, c.w);
          if (!rc.live()) return;
          const good = meetsPerp(v, c),
            result = dot(v, c.w);
          const constraint = c.constraint
            ? ` $v_1${c.constraint === 'sum' ? '+' : '-'}v_2=${tnp(c.constraint === 'sum' ? v[0] + v[1] : v[0] - v[1])}$.`
            : '';
          const zero = norm(v) < 1e-9;
          d.msg(
            `$${calc(v, c.w)}=${tnp(result)}$.${constraint}${zero ? ' The zero vector has no direction.' : good ? ' Perpendicular.' : Math.abs(result) > 1e-8 ? ' Not zero.' : ' Check the other condition.'}`,
            good ? 'good' : 'bad',
          );
          if (!good) {
            rc.att.wrong++;
            sfx.miss();
            return;
          }
          if (i === 0) {
            S().flags['c04-first-perpendicular'] = { v, w: c.w };
            save();
          }
          picture.view.line(v, { kind: 'g' });
          done = true;
          sfx.success();
          rc.complete();
        } finally {
          busy = false;
          if (rc.live()) row.enable(!done);
        }
      };
      let row: EqRow<number> | EqRow<Vec>;
      if (unknown !== undefined) {
        row = eqRow({ d, aria: `missing number v${unknown + 1}`, left: `v_${unknown + 1}=`, onCheck: check });
      } else row = eqRow({ d, vec: true, left: '', right: `\\cdot${tv(c.w)}=0`, onCheck: check });
      d.body.append(row.el);
      focusSoon(p, row);
      return {
        hints: () =>
          done
            ? []
            : [
                `You need $${tnp(c.w[0])}v_1${c.w[1] < 0 ? '' : '+'}${tnp(c.w[1])}v_2=0$.`,
                c.constraint
                  ? 'Solve that equation together with the other condition.'
                  : 'A multiple of the same perpendicular vector also works.',
                `Try $\\mathbf v=${tv(c.answer)}$.`,
              ],
        async show() {
          while (busy) await wait(20);
          if (unknown === undefined) (row as EqRow<Vec>).set(c.answer);
          else (row as EqRow<number>).set(c.answer[unknown]);
          row.check();
          while (busy) await wait(20);
        },
      };
    },
  };
}
interface Step {
  domain?: [number, number];
  goal: string;
  left: string;
  right?: string;
  answer: number;
  tolerance?: number;
  calculation: string;
  hint: string;
  play?(x: number): Promise<void>;
}
function staged(rc: RoundCtx, steps: Step[], finish: () => void): RoundRun {
  const { p, d } = rc;
  let at = 0,
    busy = false,
    done = false;
  let row: EqRow<number>;
  const title = h('div', { class: 'tj-goal' }),
    slot = h('div');
  d.body.replaceChildren(title, slot);
  const mount = () => {
    const s = steps[at];
    title.innerHTML = inline(s.goal);
    slot.replaceChildren();
    d.msg('');
    row = eqRow({
      d,
      aria: 'the number in the equation',
      left: s.left,
      right: s.right,
      onCheck: async (x) => {
        if (busy || done || !rc.live()) return;
        busy = true;
        row.enable(false);
        p.move();
        d.msg('');
        try {
          if (s.domain && (x < s.domain[0] || x > s.domain[1])) {
            rc.att.wrong++;
            d.msg('The angle between nonzero vectors is from $0^\\circ$ to $180^\\circ$.', 'bad');
            return;
          }
          await s.play?.(x);
          if (!rc.live()) return;
          const good = exact(x, s.answer, s.tolerance);
          d.msg(`${s.calculation}${good ? '' : ` Not $${tnp(x)}$.`}`, good ? 'good' : 'bad');
          if (!good) {
            rc.att.wrong++;
            sfx.miss();
            return;
          }
          sfx.success();
          done = true;
          if (at === steps.length - 1) {
            finish();
            return;
          }
          const next = button(
            'Next step',
            () => {
              at++;
              done = false;
              mount();
            },
            { cls: 'primary small' },
          );
          slot.append(next);
          focusSoon(p, next, 60);
        } finally {
          busy = false;
          if (rc.live()) row.enable(!done);
        }
      },
    });
    slot.append(row.el);
    focusSoon(p, row);
  };
  mount();
  return {
    hints: () => (done ? [] : [steps[at].hint, `The missing number is $${tnp(steps[at].answer)}$.`]),
    async show() {
      while (busy) await wait(20);
      while (rc.live()) {
        if (!done) {
          const step = steps[at];
          row.set(step.answer);
          const input = row.el.querySelector<HTMLInputElement>('input');
          if (input)
            input.value = step.tolerance
              ? step.answer.toFixed(step.tolerance < 0.001 ? 4 : 1)
              : String(step.answer);
          row.check();
          while (busy) await wait(20);
        }
        if (at === steps.length - 1) return;
        at++;
        done = false;
        mount();
      }
    },
  };
}
function angleRound(c: AngleCase, i: number, picture: DotPicture): Round {
  return {
    id: `angle-${i}`,
    name: 'calculate the angle',
    goal: 'Find the angle between the vectors.',
    noHints: i >= 8,
    start(base) {
      const rc = { ...base, live: () => base.live() && picture.live };
      const { d } = rc;
      d.setHead(pair(c.v, c.w));
      void picture.set(c.v, c.w, true);
      const dp = dot(c.v, c.w),
        co = cosineOf(c.v, c.w),
        theta = degreesOf(c.v, c.w),
        sq = squared(difference(c.v, c.w));
      const steps = c.steps.map((kind): Step => {
        if (kind === 'gap')
          return {
            goal: 'Calculate the squared length of the yellow side.',
            left: '\\|\\mathbf v-\\mathbf w\\|^2=',
            answer: sq,
            calculation: `$\\|${tv(difference(c.v, c.w))}\\|^2=${tnp(sq)}$.`,
            hint: 'Subtract matching coordinates, square each difference, then add.',
            play: () => picture.triangle(c.v, c.w, true),
          };
        if (kind === 'dot')
          return {
            goal: 'Calculate the dot product.',
            left: `${named(c.v, c.w)}=`,
            answer: dp,
            calculation: `$${calc(c.v, c.w)}=${tnp(dp)}$.`,
            hint: 'Multiply matching coordinates and add.',
            play: () => picture.triangle(c.v, c.w),
          };
        if (kind === 'cos')
          return {
            goal: 'Find the cosine, to four decimal places.',
            left: `\\cos\\theta=\\frac{${tnp(dp)}}{${tlen(c.v)}\\,${tlen(c.w)}}\\approx`,
            answer: co,
            tolerance: 0.00006,
            calculation: `$\\cos\\theta=\\frac{${tnp(dp)}}{${tlen(c.v)}\\,${tlen(c.w)}}${roundedRelation(co, 4)}${co.toFixed(4)}$.`,
            hint: 'Divide the dot product by both vector lengths.',
            play: () => picture.triangle(c.v, c.w),
          };
        return {
          domain: [0, 180],
          goal: 'Find the angle, in degrees to the nearest $0.1^\\circ$.',
          left: '\\theta\\approx',
          right: '{}^\\circ',
          answer: theta,
          tolerance: 0.051,
          calculation: `$\\theta=\\cos^{-1}\\!\\left(\\frac{${tnp(dp)}}{${tlen(c.v)}\\,${tlen(c.w)}}\\right)${roundedRelation(theta, 1)}${theta.toFixed(1)}^\\circ$.`,
          hint: 'Use inverse cosine in degree mode; the dot product must first be divided by both lengths.',
          play: (x) => picture.angle(c.v, c.w, x),
        };
      });
      return staged(rc, steps, () => rc.complete());
    },
  };
}
function derivation(
  p: PuzzleCtx,
  d: PlainDock,
  view: PlaneView,
  picture: DotPicture,
  finish: () => void,
): RoundRun {
  const v = [3, 1],
    w = [1, 2];
  d.setHead(pair(v, w));
  d.kick.textContent = 'Same triangle, two calculations';
  void picture.set(v, w, true);
  const steps: Step[] = [
    {
      goal: 'Calculate the squared length of the yellow side.',
      left: '\\|\\mathbf v-\\mathbf w\\|^2=',
      answer: 5,
      calculation: `$\\mathbf v-\\mathbf w=${tv([2, -1])},\\quad 2^2+(-1)^2=5$.`,
      hint: 'The side joins the endpoints: subtract the vectors, then square and add the coordinates.',
      play: () => picture.triangle(v, w, true),
    },
    {
      goal: 'Expand the first coordinate difference.',
      left: '(3-1)^2=3^2+',
      right: '(3\\times1)+1^2',
      answer: -2,
      calculation: '$(a-b)^2=a^2-2ab+b^2$.',
      hint: 'In (a-b)², the two middle terms are -ab and -ab.',
      play: () => picture.triangle(v, w, true),
    },
    {
      goal: '$\\|\\mathbf v\\|^2=10$, $\\|\\mathbf w\\|^2=5$. Adding both expansions gives $5=10+5-2\\mathbf v\\cdot\\mathbf w$.',
      left: '\\mathbf v\\cdot\\mathbf w=',
      answer: 5,
      calculation:
        '$\\|\\mathbf v-\\mathbf w\\|^2=\\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2\\mathbf v\\cdot\\mathbf w$.',
      hint: '3×1+1×2 is the dot product. The squared lengths are 3²+1² and 1²+2².',
      play: () => picture.triangle(v, w, true),
    },
    {
      goal: 'The cosine rule for that same side: $\\|\\mathbf v-\\mathbf w\\|^2=\\|\\mathbf v\\|^2+\\|\\mathbf w\\|^2-2\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$.',
      left: '\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta=',
      right: '',
      answer: 5,
      calculation: '$5=10+5-2\\underbrace{\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta}_{5}$.',
      hint: 'Subtract 10+5 from both sides, then divide by -2.',
      play: () => picture.triangle(v, w, true),
    },
    {
      goal: 'The common terms cancel: $\\mathbf v\\cdot\\mathbf w=\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta$. Give four decimal places.',
      left: '\\cos\\theta=\\frac{5}{\\sqrt{10}\\sqrt5}\\approx',
      answer: Math.SQRT1_2,
      tolerance: 0.00006,
      calculation:
        '$\\mathbf v\\cdot\\mathbf w=\\|\\mathbf v\\|\\|\\mathbf w\\|\\cos\\theta,\\quad\\cos\\theta\\approx0.7071$.',
      hint: 'Divide 5 by the product of the two lengths; give four decimal places.',
      play: () => picture.triangle(v, w),
    },
    {
      domain: [0, 180],
      goal: 'Find the angle in this triangle, in degrees.',
      left: '\\theta=',
      right: '{}^\\circ',
      answer: 45,
      tolerance: 0.051,
      calculation: '$\\theta=\\cos^{-1}(1/\\sqrt2)=45^\\circ$.',
      hint: '0.7071 is a cosine, not an angle. Use inverse cosine in degree mode.',
      play: (x) => picture.angle(v, w, x),
    },
  ];
  const att = { help: 0, wrong: 0 };
  let live = true;
  p.onDispose(() => {
    live = false;
  });
  return staged({ p, d, view, att, live: () => live, complete: finish }, steps, finish);
}
function guided(
  p: PuzzleCtx,
  d: PlainDock,
  view: PlaneView,
  key: string,
  rounds: Round[],
  extra: (n: number) => Round,
  opening: (start: () => void) => RoundRun,
): PuzzleRuntime {
  let practice: PuzzleRuntime | null = null,
    hintKey = '',
    hintAt = 0;
  const start = () => {
    S().flags[key + '-opening'] = true;
    save();
    practice = runDrill(p, { key, d, view, rounds, extra });
  };
  const intro = opening(start);
  if (S().flags[key + '-opening']) start();
  return {
    hint() {
      if (practice) return practice.hint?.() ?? null;
      const hs = intro.hints();
      if (!hs.length) return null;
      if (hs.join('|') !== hintKey) {
        hintKey = hs.join('|');
        hintAt = 0;
      }
      return { text: hs[Math.min(hintAt++, hs.length - 1)], left: Math.max(0, hs.length - hintAt) };
    },
    async showStep() {
      if (practice) await practice.showStep?.();
      else await intro.show();
    },
    async showMe() {
      if (!practice) {
        await intro.show();
        start();
      }
      await practice!.showMe();
    },
    async solve() {
      if (!practice) {
        await intro.show();
        start();
      }
      await practice!.solve?.();
    },
    async wrong() {
      if (practice) await practice.wrong?.();
      else {
        const x = d.body.querySelector<HTMLInputElement>('input');
        if (x) {
          x.value = '99';
          d.body.querySelector<HTMLButtonElement>('.pk-eq .btn.primary')?.click();
        }
      }
    },
  };
}
export const p1: PuzzleDef = {
  id: 'c04-p1',
  title: 'The dot product',
  goal: 'Multiply matching numbers, then add.',
  calm: true,
  hints: [],
  par: 14,
  setup(p) {
    const { view, d, picture } = scene(p);
    return runDrill(p, {
      key: 'c04-dot-v2',
      d,
      view,
      rounds: PRODUCT_CASES.map((c, i) => productRound(c, i, picture)),
      extra: (n) => productRound({ v: [(n % 7) - 3, (n % 5) + 1], w: [2 + (n % 3), -1 - (n % 4)] }, 10 + n, picture),
    });
  },
};
export const p2: PuzzleDef = {
  id: 'c04-p2',
  title: 'When is v · w = 0?',
  goal: 'Make v · w = 0.',
  calm: true,
  hints: [],
  par: 14,
  setup(p) {
    const { view, d, picture } = scene(p);
    return runDrill(p, {
      key: 'c04-perp-v2',
      d,
      view,
      rounds: PERP_CASES.map((c, i) => perpRound(c, i, picture)),
      extra: (n) =>
        perpRound({ w: [(n % 5) + 1, -((n % 4) + 1)], answer: [(n % 4) + 1, (n % 5) + 1] }, 10 + n, picture),
    });
  },
};
export const p3: PuzzleDef = {
  id: 'c04-p3',
  title: 'Find the angle between vectors',
  goal: 'Calculate the same triangle side two ways.',
  calm: true,
  hints: [],
  par: 45,
  setup(p) {
    const { view, d, picture } = scene(p, true);
    return guided(
      p,
      d,
      view,
      'c04-angle-typed-v1',
      ANGLE_CASES.map((c, i) => angleRound(c, i, picture)),
      (n) =>
        angleRound(
          { v: [(n % 7) + 1, -((n % 3) + 1)], w: [-((n % 4) + 1), (n % 5) + 2], steps: ['angle'] },
          10 + n,
          picture,
        ),
      (start) =>
        derivation(p, d, view, picture, () => {
          const b = button('Start ten practice rounds', start, { cls: 'primary small' });
          d.body.append(b);
          focusSoon(p, b, 60);
        }),
    );
  },
};
