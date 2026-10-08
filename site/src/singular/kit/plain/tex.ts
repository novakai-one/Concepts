// Plain maths kit: TeX helpers for messages and labels (docs/singular/ch18-plain-style.md).
// Vectors are stacked columns; a number multiplying a vector sits on its left. Pure, no DOM.
import { fmtN, type Vec } from './logic';

/** A number as TeX (ASCII minus). */
export const tn = (x: number): string => fmtN(x).replace(/−/g, '-');
/** A number with every digit the player typed (2.9999 stays 2.9999, never 3). */
export const tnp = (x: number): string => {
  const short = tn(x);
  return Math.abs(parseFloat(short) - x) < 1e-12 ? short : String(parseFloat(x.toPrecision(10)));
};
/** A negative number in brackets, for use inside a sum: (−2). */
export const tnb = (x: number): string => (x < 0 ? `(${tnp(x)})` : tnp(x));
/** A vector as a stacked TeX column. */
export const tv = (v: Vec): string => `\\begin{bmatrix}${v.map(tnp).join(' \\\\ ')}\\end{bmatrix}`;
/** A vector's name in bold: u → \mathbf u. Anything with a backslash or bracket is left as it is. */
export const tname = (n: string): string => (/^[a-z]$/i.test(n) ? `\\mathbf ${n}` : n);
/**
 * c times a vector, the number on its left: 3[1;1], 3\mathbf v. 1v is v, −1v is −v, 0v is 0v.
 * `v` is a vector or a name ('v').
 */
export const tmul = (c: number, v: Vec | string): string => {
  const x = typeof v === 'string' ? tname(v) : tv(v);
  const k = Math.abs(c - 1) < 1e-12 ? '' : Math.abs(c + 1) < 1e-12 ? '-' : tnp(c);
  return `${k}${x}`;
};
/** a·u + b·v as TeX with the signs tidied: tlin(2,'u',-1,'v') → 2u − v; vectors may be given instead of names. */
export function tlin(a: number, u: Vec | string, b: number, v: Vec | string): string {
  const first = tmul(a, u);
  const sb = b < 0 ? '-' : '+';
  return `${first} ${sb} ${tmul(Math.abs(b), v)}`;
}
/** u + v with both written out: [2;1] + [1;3]. */
export const tsum = (u: Vec, v: Vec): string => `${tv(u)} + ${tv(v)}`;
/** The length: ‖v‖ (name) or ‖[3;4]‖ (vector). */
export const tnorm = (v: Vec | string): string => `\\left\\|${typeof v === 'string' ? tname(v) : tv(v)}\\right\\|`;
/** √(x² + y²) written out, with negatives in brackets: √(3² + (−4)²). */
export const tpyth = (v: Vec): string => `\\sqrt{${tnb(v[0])}^2 + ${tnb(v[1])}^2}`;
/** A length as TeX: 5, or √13 when it is not a whole number. */
export function tlen(v: Vec): string {
  const s = v[0] * v[0] + v[1] * v[1];
  const r = Math.sqrt(s);
  return Math.abs(r - Math.round(r)) < 1e-9 ? tn(Math.round(r)) : `\\sqrt{${tn(s)}}`;
}

/**
 * One value next to another: "$lhs = is$, not $not$." (lhs optional).
 * Wrong number:  wrongVec(mul(3, v), target, '3\\mathbf v')  → 3v = [6;3], not [-4;-2].
 * Wrong vector:  wrongVec(add(u, v), typed, tsum(u, v))        → [2;1] + [1;2] = [3;3], not [4;3].
 */
export function wrongVec(is: Vec | number, not: Vec | number, lhs = ''): string {
  const t = (x: Vec | number) => (typeof x === 'number' ? tnp(x) : tv(x));
  return `$${lhs ? `${lhs} = ` : ''}${t(is)}$, not $${t(not)}$.`;
}

/** Standard short messages for boxes that cannot be read. */
export const UNREAD = 'Type one number in each box, like $2$, $-1$ or $0.5$.';
export const UNREAD_M = 'Type one number, like $2$, $-1$ or $0.5$.';
