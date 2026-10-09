// Chapter 4's typed practice: easy footholds, signed arithmetic, then unknowns and transfer.
import type { Vec } from '../../../math/la';
import { dot, norm } from '../../../math/la';
export interface ProductCase {
  v: Vec;
  w: Vec;
  unknown?: 0 | 1;
}
export const PRODUCT_CASES: ProductCase[] = [
  { v: [1, 0], w: [2, 4] },
  { v: [0, 1], w: [2, 4] },
  { v: [3, 1], w: [2, 4] },
  { v: [-2, 3], w: [3, 1] },
  { v: [3, -2], w: [-1, 4] },
  { v: [-3, -2], w: [4, -1] },
  { v: [1.5, -2], w: [-4, 3] },
  { v: [5, -2], w: [3, 4], unknown: 0 },
  { v: [2, 3], w: [-3, 5], unknown: 1 },
  { v: [-3, -6], w: [4, -2], unknown: 1 },
];
/** A round that needs a rule about v·w, not only the arithmetic. `pic`: two vectors to draw and their labels. */
export interface RuleCase {
  kind: 'rule';
  goal: string;
  left: string;
  answer: number;
  done: string;
  hint: string;
  pic?: { v: Vec; w: Vec; vLabel: string; wLabel: string };
}
/** Puzzle 1's practice: four calculations, then rules a textbook proves (3-D, v·v, scaling, adding, expanding). */
export const PRACTICE: (ProductCase | RuleCase)[] = [
  { v: [3, 1], w: [2, 4] },
  { v: [-2, 3], w: [3, 1] },
  { v: [2, -1], w: [1, 2] },
  { v: [5, -2], w: [3, 4], unknown: 0 },
  {
    kind: 'rule',
    goal: 'Three numbers each: the same rule, one more pair.',
    left: '\\begin{bmatrix}1\\\\2\\\\3\\end{bmatrix}\\cdot\\begin{bmatrix}4\\\\-5\\\\6\\end{bmatrix}=',
    answer: 12,
    done: '$1\\times4+2\\times(-5)+3\\times6=12$.',
    hint: 'Multiply the three matching pairs, then add.',
  },
  {
    kind: 'rule',
    goal: 'A vector with itself.',
    left: '\\begin{bmatrix}3\\\\4\\end{bmatrix}\\cdot\\begin{bmatrix}3\\\\4\\end{bmatrix}=',
    answer: 25,
    done: '$3\\times3+4\\times4=25=\\|\\mathbf v\\|^2$. On its own line, $\\mathbf v$\'s shadow is $\\mathbf v$: length $\\times$ length.',
    hint: 'Multiply matching numbers, then add.',
    pic: { v: [3, 4], w: [3, 4], vLabel: '$\\mathbf v$', wLabel: '' },
  },
  {
    kind: 'rule',
    goal: '$\\mathbf v\\cdot\\mathbf w=6$.',
    left: '(3\\mathbf v)\\cdot\\mathbf w=',
    answer: 18,
    done: '$(3\\mathbf v)\\cdot\\mathbf w=3(\\mathbf v\\cdot\\mathbf w)=3\\times6=18$. Three times as long: three times the shadow.',
    hint: '$3\\mathbf v$ is three times as long, so its shadow is three times as long.',
    pic: { v: [3, 3], w: [2, 4], vLabel: '$3\\mathbf v$', wLabel: '$\\mathbf w$' },
  },
  {
    kind: 'rule',
    goal: '$\\mathbf w\\cdot\\mathbf v=5$ and $\\mathbf u\\cdot\\mathbf v=-2$.',
    left: '(2\\mathbf w+3\\mathbf u)\\cdot\\mathbf v=',
    answer: 4,
    done: '$2(\\mathbf w\\cdot\\mathbf v)+3(\\mathbf u\\cdot\\mathbf v)=2\\times5+3\\times(-2)=4$. Shadows add.',
    hint: 'Tip to tail, shadows add: $(\\mathbf a+\\mathbf b)\\cdot\\mathbf v=\\mathbf a\\cdot\\mathbf v+\\mathbf b\\cdot\\mathbf v$.',
    pic: { v: [2, 1], w: [1, 2], vLabel: '$2\\mathbf w+3\\mathbf u$', wLabel: '$\\mathbf v$' },
  },
  {
    kind: 'rule',
    goal: '$\\|\\mathbf v\\|=5$ and $\\|\\mathbf w\\|=3$.',
    left: '(\\mathbf v+\\mathbf w)\\cdot(\\mathbf v-\\mathbf w)=',
    answer: 16,
    done: '$\\mathbf v\\cdot\\mathbf v-\\mathbf v\\cdot\\mathbf w+\\mathbf w\\cdot\\mathbf v-\\mathbf w\\cdot\\mathbf w=25-9=16$.',
    hint: 'Expand like brackets. $\\mathbf v\\cdot\\mathbf w=\\mathbf w\\cdot\\mathbf v$, and $\\mathbf v\\cdot\\mathbf v=\\|\\mathbf v\\|^2$.',
    pic: { v: [6, 4], w: [0, 4], vLabel: '$\\mathbf v+\\mathbf w$', wLabel: '$\\mathbf v-\\mathbf w$' },
  },
  {
    kind: 'rule',
    goal: '$\\|\\mathbf v\\|=3$, $\\|\\mathbf w\\|=4$ and $\\mathbf v\\cdot\\mathbf w=2$.',
    left: '\\|\\mathbf v+\\mathbf w\\|^2=',
    answer: 29,
    done: '$(\\mathbf v+\\mathbf w)\\cdot(\\mathbf v+\\mathbf w)=\\|\\mathbf v\\|^2+2\\,\\mathbf v\\cdot\\mathbf w+\\|\\mathbf w\\|^2=9+4+16=29$.',
    hint: '$\\|\\mathbf v+\\mathbf w\\|^2=(\\mathbf v+\\mathbf w)\\cdot(\\mathbf v+\\mathbf w)$. Expand like brackets.',
    pic: { v: [3, 0], w: [2 / 3, Math.sqrt(16 - 4 / 9)], vLabel: '$\\mathbf v$', wLabel: '$\\mathbf w$' },
  },
];
export interface PerpCase {
  w: Vec;
  answer: Vec;
  unknown?: 0 | 1;
  constraint?: 'sum' | 'difference';
  target?: number;
}
export const PERP_CASES: PerpCase[] = [
  { w: [2, 4], answer: [2, -1], unknown: 1 },
  { w: [3, 6], answer: [-4, 2], unknown: 0 },
  { w: [3, 1], answer: [-1, 3] },
  { w: [-2, 5], answer: [5, 2] },
  { w: [4, -3], answer: [3, 4] },
  { w: [2, -1], answer: [-1.5, -3], unknown: 0 },
  { w: [0, 3], answer: [2, 0] },
  { w: [1.5, -2], answer: [-3, -2.25], unknown: 1 },
  { w: [-1, 3], answer: [0.75, 0.25], constraint: 'sum', target: 1 },
  { w: [5, -2], answer: [-4 / 3, -10 / 3], constraint: 'difference', target: 2 },
];
export interface AngleCase {
  v: Vec;
  w: Vec;
  steps: ('gap' | 'dot' | 'cos' | 'angle')[];
}
export const ANGLE_CASES: AngleCase[] = [
  { v: [1, 0], w: [1, 1], steps: ['dot', 'cos', 'angle'] },
  { v: [2, 1], w: [-1, 2], steps: ['dot', 'cos', 'angle'] },
  { v: [2, 0], w: [-3, 0], steps: ['cos', 'angle'] },
  { v: [1, 2], w: [2, 1], steps: ['dot', 'cos', 'angle'] },
  { v: [-2, 1], w: [1, 3], steps: ['dot', 'cos', 'angle'] },
  { v: [3, -2], w: [-4, 1], steps: ['gap', 'dot', 'cos', 'angle'] },
  { v: [1.5, -0.5], w: [-1, 2], steps: ['cos', 'angle'] },
  { v: [-3, 4], w: [2, -1], steps: ['angle'] },
  { v: [4, -3], w: [-2, -5], steps: ['angle'] },
  { v: [-5, -2], w: [3, -4], steps: ['gap', 'angle'] },
];
export const difference = (v: Vec, w: Vec): Vec => [v[0] - w[0], v[1] - w[1]];
export const squared = (v: Vec) => dot(v, v);
export const cosineOf = (v: Vec, w: Vec) => dot(v, w) / (norm(v) * norm(w));
export const degreesOf = (v: Vec, w: Vec) =>
  (Math.acos(Math.max(-1, Math.min(1, cosineOf(v, w)))) * 180) / Math.PI;
export function perpendicular(v: Vec, w: Vec): boolean {
  return norm(v) > 1e-9 && Math.abs(dot(v, w)) <= 1e-8 * norm(v) * norm(w);
}
export function meetsPerp(v: Vec, c: PerpCase): boolean {
  if (!perpendicular(v, c.w)) return false;
  if (!c.constraint) return true;
  const x = c.constraint === 'sum' ? v[0] + v[1] : v[0] - v[1];
  return Math.abs(x - c.target!) < 1e-7;
}
