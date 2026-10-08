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
