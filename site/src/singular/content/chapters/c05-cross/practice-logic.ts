// The first Chapter 5 problem: direction, then area, then ordered cross products.
import type { V3 } from '../../../game/types';
import { cross, dot, norm } from '../../../math/la';

export type Task = 'direction' | 'area' | 'cross';
export interface CrossRound { v: V3; w: V3; task: Task; name: string }
export const CROSS_ROUNDS: CrossRound[] = [
  { v: [2, 0, 0], w: [1, 3, 0], task: 'direction', name: 'Perpendicular to both' },
  { v: [0, 2, 0], w: [0, 1, 3], task: 'direction', name: 'A different plane' },
  { v: [1, 0, 1], w: [0, 2, 0], task: 'direction', name: 'A tilted plane' },
  { v: [2, 0, 0], w: [1, 3, 0], task: 'area', name: 'Length and area' },
  { v: [3, 0, 0], w: [-2, 2, 0], task: 'area', name: 'Height, not sloping edge' },
  { v: [1, 1, 0], w: [0, 1, 2], task: 'area', name: 'Area in a tilted plane' },
  { v: [2, 0, 0], w: [1, 2, 0], task: 'cross', name: 'Choose the direction' },
  { v: [1, 2, 0], w: [2, 0, 0], task: 'cross', name: 'Reverse the order' },
  { v: [2, -1, 1], w: [1, 2, -1], task: 'cross', name: 'All three components' },
  { v: [2, -1, 3], w: [-4, 2, -6], task: 'cross', name: 'Parallel vectors' },
];
export const plus = (a: V3, b: V3): V3 => a.map((x, i) => x + b[i]) as V3;
export const times = (a: V3, k: number): V3 => a.map(x => x * k) as V3;
export const unit = (a: V3): V3 => times(a, 1 / (norm(a) || 1));
export const normal = (r: CrossRound): V3 => cross(r.v, r.w) as V3;
export function areaSquared(r: CrossRound): number {
  // Independent of the cross-product formula: base² × perpendicular height².
  return Math.max(0, dot(r.v, r.v) * dot(r.w, r.w) - dot(r.v, r.w) ** 2);
}
export function sampleAnswer(r: CrossRound): V3 {
  const n = normal(r);
  if (r.task !== 'direction') return n;
  const max = Math.max(...n.map(Math.abs));
  return times(n, 1 / (max || 1));
}
export function judge(r: CrossRound, n: V3) {
  const length = norm(n), a2 = areaSquared(r);
  const perpendicular = [r.v, r.w].map(v => length > 1e-9 && Math.abs(dot(n, v)) <= 1e-6 * length * norm(v));
  const rightLength = Math.abs(length * length - a2) <= 1e-5 * Math.max(1, a2);
  const rightOrder = dot(n, normal(r)) > 0;
  const correct = r.task === 'direction' ? perpendicular.every(Boolean)
    : a2 < 1e-10 ? length < 1e-9
    : perpendicular.every(Boolean) && rightLength && (r.task === 'area' || rightOrder);
  return { correct, perpendicular, rightLength, rightOrder, length, area2: a2, dots: [dot(n, r.v), dot(n, r.w)] };
}
