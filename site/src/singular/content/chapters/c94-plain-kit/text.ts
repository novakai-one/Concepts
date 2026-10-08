// Chapter 94 (developer): every word the player reads. Plain maths, one short sentence per message.
import { tlin, tmul, tnb, tnorm, tsum, tv, wrongVec, type Vec } from '../../../kit/plain';

export const U3: Vec = [2, 1], V3: Vec = [-1, 1], T3: Vec = [0, 3]; // 1u + 2v = [0;3]
export const V2: Vec = [2, 1], T2: Vec = [-4, -2]; // −2v
export const V4: Vec = [3, 4]; // ‖v‖ = 5

export const T1: Vec = [4, 1];

export const ADD = {
  title: 'Add two vectors',
  goal: `Find $\\mathbf u$ and $\\mathbf v$ so that $\\mathbf u + \\mathbf v = ${tv(T1)}$.`,
  head: `$\\mathbf u + \\mathbf v = ${tv(T1)}$`,
  go: 'Draw',
  start: 'Type $\\mathbf u$ and $\\mathbf v$.',
  zero: 'Use two vectors that are not zero.',
  hit: (u: Vec, v: Vec, s: Vec) => `$${tsum(u, v)} = ${tv(s)}$. On target.`,
  miss: (u: Vec, v: Vec, s: Vec) => wrongVec(s, T1, tsum(u, v)),
  hints: ['Pick any $\\mathbf u$. Then $\\mathbf v$ must cover the rest of the way.', `Try $\\mathbf u = ${tv([3, -1])}$ and $\\mathbf v = ${tv([1, 2])}$.`],
};

export const SCALE = {
  title: 'A number times a vector',
  goal: `Find $c$ so that $c\\mathbf v = ${tv(T2)}$.`,
  head: `$\\mathbf v = ${tv(V2)}$`,
  right: `\\mathbf v = ${tv(T2)}`,
  start: 'Type a number in the box.',
  hit: (c: number, w: Vec) => `$${tmul(c, 'v')} = ${tv(w)}$. On target.`,
  miss: (c: number, w: Vec) => wrongVec(w, T2, tmul(c, 'v')),
  hints: [`$${tv(T2)}$ points the opposite way to $\\mathbf v$.`, `$${tv(T2)} = -2${tv(V2)}$. Try $c = -2$.`],
};

export const COMBO = {
  title: 'Combine two vectors',
  goal: `Find $a$ and $b$ so that $a\\mathbf u + b\\mathbf v = ${tv(T3)}$.`,
  head: `$\\mathbf u = ${tv(U3)},\\ \\mathbf v = ${tv(V3)}$`,
  tail: `\\mathbf v = ${tv(T3)}`,
  start: 'Type $a$ and $b$.',
  hit: (a: number, b: number, s: Vec) => `$${tlin(a, 'u', b, 'v')} = ${tv(s)}$. On target.`,
  miss: (a: number, b: number, s: Vec) => wrongVec(s, T3, tlin(a, 'u', b, 'v')),
  hints: ['Change one number at a time and watch where the end moves.', `Try $a = 1$ and $b = 2$.`],
};

export const LEN = {
  title: 'The length of a vector',
  goal: 'Find the length of $\\mathbf v$.',
  head: `$\\mathbf v = ${tv(V4)}$`,
  help: `$${tnorm('v')}$ is the length of $\\mathbf v$.`,
  left: `${tnorm('v')} =`,
  hit: `$${tnorm('v')} = \\sqrt{3^2 + 4^2} = 5$.`,
  miss: (x: number) => `$${tnb(x)}^2 = ${Math.round(x * x * 1e6) / 1e6}$, not $3^2 + 4^2 = 25$.`,
  hints: ['The legs are 3 and 4 long.', '$\\sqrt{3^2 + 4^2} = \\sqrt{25}$.'],
};

export const DRILL = {
  title: 'Practice: three short rounds',
  goal: 'Three short rounds.',
};
