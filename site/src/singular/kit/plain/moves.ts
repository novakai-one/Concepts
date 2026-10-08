// Plain maths kit: the animated moves of Act I. Each one frames the picture, clears the last attempt, draws
// step by step and returns the result. Colours: the first vector green, the second blue, the result yellow.
// Chart labels are names only ($\mathbf u$, $2\mathbf u$, $\mathbf u + \mathbf v$): the dock message carries the
// calculation with the values, so the screen never says the same thing twice (ch18-why.md §5: at most a few small labels).
import type { PlaneView } from './view';
import { wait } from '../../core/tween';
import { sfx } from '../../audio/sfx';
import { add, lin, mul, norm, type Vec } from './logic';
import { tlen, tlin, tmul, tname, tnorm } from './tex';

export interface MoveOpts {
  /** The two vectors' names (default u and v; length and scale use the second). */
  names?: [string, string];
  /** Extra points to keep in the picture (the targets are always kept). */
  frame?: Vec[];
  /** Leave the picture where it is (the caller framed it). */
  noFrame?: boolean;
  /** No labels on the chart. */
  bare?: boolean;
  /** length(): leave the value off the label (the player is asked for it). */
  hide?: boolean;
  /** Animation time for one arrow, ms (default 520). */
  ms?: number;
}

const GAP = 140;

/** u, then v from u's tip, then u + v from the origin. Returns u + v. */
export async function addTipToTail(view: PlaneView, u: Vec, v: Vec, o: MoveOpts = {}): Promise<Vec> {
  const [nu, nv] = (o.names ?? ['u', 'v']).map(tname);
  const s = add(u, v);
  if (!o.noFrame) await view.frame([u, s, v, ...(o.frame ?? [])]);
  view.clear();
  const A = view.arrow('u', 'g'), B = view.arrow('v', 'b'), S = view.arrow('sum', 'y');
  if (!o.bare) { A.label(`$${nu}$`); B.label(`$${nv}$`); }
  await A.grow(u, { from: [0, 0], ms: o.ms });
  await wait(GAP);
  await B.grow(v, { from: u, ms: o.ms });
  await wait(GAP);
  if (!o.bare) S.label(`$${nu} + ${nv}$`);
  await S.grow(s, { from: [0, 0], ms: o.ms });
  sfx.snap();
  return s;
}

/** v, then c·v along v's line (through zero when c < 0), with ticks at whole multiples of v. Returns c·v. */
export async function scale(view: PlaneView, c: number, v: Vec, o: MoveOpts = {}): Promise<Vec> {
  const nv = tname((o.names ?? ['u', 'v'])[1]);
  const w = mul(c, v);
  if (!o.noFrame) await view.frame([v, w, ...(o.frame ?? [])]);
  view.clear();
  view.line(v);
  const V = view.arrow('v', 'g'), R = view.arrow('cv', 'y');
  if (!o.bare) V.label(`$${nv}$`);
  await V.grow(v, { from: [0, 0], ms: o.ms });
  await wait(GAP);
  // yellow starts on top of v, then stretches to c·v
  R.set(v, [0, 0]);
  // the two labels sit on opposite sides of the line
  V.side = 1; R.side = -1;
  await R.scaleTo(c);
  view.ruler(v, c);
  if (!o.bare) R.label(`$${tmul(c, nv)}$`);
  sfx.snap();
  return w;
}

/** a·u, then b·v from its tip, then a·u + b·v from the origin. Returns the sum. */
export async function combine(view: PlaneView, a: number, u: Vec, b: number, v: Vec, o: MoveOpts = {}): Promise<Vec> {
  const [nu, nv] = (o.names ?? ['u', 'v']);
  const au = mul(a, u), bv = mul(b, v), s = lin(a, u, b, v);
  if (!o.noFrame) await view.frame([u, au, s, bv, add(au, v), ...(o.frame ?? [])]);
  view.clear();
  const A = view.arrow('u', 'g'), B = view.arrow('v', 'b'), S = view.arrow('sum', 'y');
  if (!o.bare) A.label(`$${tname(nu)}$`);
  await A.grow(u, { from: [0, 0], ms: o.ms });
  if (a !== 1) { await wait(GAP); await A.scaleTo(a); if (!o.bare) A.label(Math.abs(a) < 1e-12 ? '' : `$${tmul(a, nu)}$`); }
  await wait(GAP);
  if (!o.bare) B.label(`$${tname(nv)}$`);
  await B.grow(v, { from: au, ms: o.ms });
  if (b !== 1) { await wait(GAP); await B.scaleTo(b); if (!o.bare) B.label(Math.abs(b) < 1e-12 ? '' : `$${tmul(b, nv)}$`); }
  await wait(GAP);
  // a zero part has no arrow; a part that is the whole sum lies under the yellow arrow: neither gets a label
  if (Math.abs(a) < 1e-12) A.hide(); else if (Math.abs(b) < 1e-12) A.label('');
  if (Math.abs(b) < 1e-12) B.hide(); else if (Math.abs(a) < 1e-12) B.label('');
  if (!o.bare) S.label(`$${tlin(a, nu, b, nv)}$`);
  await S.grow(s, { from: [0, 0], ms: o.ms });
  sfx.snap();
  return s;
}

/** v, its two legs (numbered), then the label ‖v‖ = its length. Returns the length. */
export async function length(view: PlaneView, v: Vec, o: MoveOpts = {}): Promise<number> {
  const nv = tname((o.names ?? ['u', 'v'])[1]);
  if (!o.noFrame) await view.frame([v, [v[0], 0], ...(o.frame ?? [])]);
  view.clear();
  const V = view.arrow('v', 'g');
  if (!o.bare) V.label(`$${nv}$`);
  await V.grow(v, { from: [0, 0], ms: o.ms });
  await wait(GAP);
  await view.legs(v);
  if (!o.bare && !o.hide) V.label(`$${tnorm(nv)} = ${tlen(v)}$`);
  sfx.snap();
  return norm(v);
}
