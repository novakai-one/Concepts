// Exact small fractions, while keeping finite decimal inputs as decimals.
import type { Vec } from '../../../math/la';
import { Frac } from '../../../math/frac';
export function number(x: number): string {
  if (Math.abs(x - Math.round(x)) < 1e-12) return String(Math.round(x));
  if (Math.abs(x * 100 - Math.round(x * 100)) < 1e-12) return String(x);
  const f = Frac.from(x, 16);
  return Math.abs(f.value() - x) < 1e-12 ? f.toTex() : String(x);
}
export const signed = (x: number) => (x < 0 ? `(${number(x)})` : number(x));
export const column = (v: Vec) => `\\begin{bmatrix}${v.map(number).join(' \\\\ ')}\\end{bmatrix}`;
