// Chapter 2: the small pieces the plain kit lacks.
// - w is red (the game's colour for a second vector w); the kit only has green and blue.
// - The live combination: a·v from the origin, b·w from its tip, the sum in yellow, redrawn as the boxes change.
// - The animated combination for practice rounds (drawn after Check).
// - An equation row with boxes in it, written as TeX pieces.
import './c02.css';
import { C } from '../../../core/theme';
import { animate, animSpeed, ease, wait, type Handle } from '../../../core/tween';
import { h, inline, button } from '../../../ui/ui';
import { NumCell, type PlaneView, type VecArrow, tn, tnp, tv, tname, lin, mul, type Vec } from '../../../kit/plain';

// ------------------------------------------------------------------ TeX

/** A vector in green (v) or red (w). */
export const G = (v: Vec): string => `\\cg{${tv(v)}}`;
export const R = (w: Vec): string => `\\cr{${tv(w)}}`;

/** a v + b w with both vectors written out and coloured, the numbers as typed: 2[2;1] − 1[1;3]. */
export function tcombo(a: number, v: Vec, b: number, w: Vec): string {
  return `${tnp(a)}${G(v)} ${b < 0 ? '-' : '+'} ${tnp(Math.abs(b))}${R(w)}`;
}

/** The two (or three) rows of a v + b w added up: [−2 + 2; −1 + 6]. */
export function trows(a: number, v: Vec, b: number, w: Vec): string {
  const part = (x: number, y: number) => `${tn(x)} ${y < 0 ? '-' : '+'} ${tn(Math.abs(y))}`;
  return `\\begin{bmatrix}${v.map((_, i) => part(a * v[i], b * w[i])).join(' \\\\ ')}\\end{bmatrix}`;
}

/** a v + b w in 2-D or 3-D. */
export const combo = (a: number, v: Vec, b: number, w: Vec): Vec => (v.length === 2 ? lin(a, v, b, w) : v.map((x, i) => clean(a * x + b * w[i])));
const clean = (x: number) => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) + 0 : Math.round(x * 1e9) / 1e9);

// ------------------------------------------------------------------ red w

/** The arrow with this id, drawn red. Always ask for it here (asking the view with another colour resets it). */
export function redArrow(view: PlaneView, id: string): VecArrow {
  const a = view.arrow(id, 'b');
  if (a.arrow.color !== C.w) {
    a.arrow.setColor(C.w);
    a.tag.el.className = 'g-label a7-tag pk-tag c02-r';
  }
  return a;
}

// ------------------------------------------------------------------ the equation row

/** TeX (no $) as a dock piece. */
export const k = (t: string): HTMLElement => h('span', { class: 'k', html: inline(`$${t}$`) });

/** A number box for a weight (yellow, like the result it gives). */
export function weightCell(name: string, onEnter: () => void): NumCell {
  return new NumCell({ aria: `the number ${name}`, onEnter, cls: 'm', placeholder: name });
}

/** One row: TeX pieces and boxes in reading order, then the buttons. */
export function eqLine(parts: (string | NumCell | HTMLElement)[], ...buttons: (HTMLElement | null)[]): HTMLElement {
  return h('div', { class: 'tj-row pk-eq c02-eq' },
    ...parts.map((x) => (typeof x === 'string' ? k(x) : x instanceof NumCell ? x.el : x)),
    ...buttons.filter(Boolean) as HTMLElement[]);
}

export const primary = (label: string, fn: () => void): HTMLButtonElement => button(inline(label), fn, { cls: 'primary small', html: true });
export const plain = (label: string, fn: () => void): HTMLButtonElement => button(inline(label), fn, { cls: 'small', html: true });

// ------------------------------------------------------------------ the live combination (try-it puzzles)

/**
 * a·v (green) from the origin and b·w (red); once both numbers are typed, b·w moves to the tip of a·v and
 * the yellow sum appears. Before that each vector stands on the origin. Labels: the names only (v, 2v, w).
 */
export class LiveCombo {
  private cur = { a: 1, b: 1, m: 0 };
  private anim: Handle | null = null;
  readonly G: VecArrow;
  readonly R: VecArrow;
  readonly Y: VecArrow;
  private text = ['', ''];

  constructor(view: PlaneView, readonly v: Vec, readonly w: Vec, private readonly names: [string, string] = ['v', 'w']) {
    this.G = view.arrow('v', 'g');
    this.R = redArrow(view, 'w');
    this.Y = view.arrow('sum', 'y');
    this.draw();
    this.labels(null, null);
  }

  /** The typed numbers (null: that box is empty). */
  to(a: number | null, b: number | null, ms = 280): Promise<void> {
    const both = a !== null && b !== null;
    const goal = { a: a ?? 1, b: b ?? 1, m: both ? 1 : 0 };
    this.labels(a, b);
    this.anim?.cancel();
    const from = { ...this.cur };
    const h = animate(ms, (t) => {
      this.cur = { a: from.a + (goal.a - from.a) * t, b: from.b + (goal.b - from.b) * t, m: from.m + (goal.m - from.m) * t };
      this.draw();
    }, ease.out);
    this.anim = h;
    return h.then(() => { if (this.anim === h) { this.cur = goal; this.draw(); } });
  }

  get sum(): Vec { return combo(this.cur.a, this.v, this.cur.b, this.w); }

  private draw(): void {
    const { a, b, m } = this.cur;
    const av = mul(a, this.v);
    this.G.set(av, [0, 0]);
    this.R.set(mul(b, this.w), mul(m, av));
    if (m > 0.97) this.Y.set(lin(a, this.v, b, this.w), [0, 0]); else this.Y.hide();
  }

  private labels(a: number | null, b: number | null): void {
    const name = (c: number | null, n: string) => (c === null ? `$${tname(n)}$` : Math.abs(c) < 1e-12 ? '' : `$${tmulName(c, n)}$`);
    const t = [name(a, this.names[0]), name(b, this.names[1])];
    if (t[0] !== this.text[0]) this.G.label(t[0]);
    if (t[1] !== this.text[1]) this.R.label(t[1]);
    this.text = t;
  }
}

/** c times a named vector: 2v, −v, v, 0.5w. */
export const tmulName = (c: number, n: string): string => `${Math.abs(c - 1) < 1e-12 ? '' : Math.abs(c + 1) < 1e-12 ? '-' : tnp(c)}${tname(n)}`;

/** A box's number while typing: null when empty; the last readable value while half typed ("-", "1/"). */
export function reader(cell: NumCell): () => number | null {
  let last: number | null = null;
  return () => {
    if (!cell.input.value.trim()) { last = null; return null; }
    const x = cell.peek();
    if (x !== null) last = x;
    return last;
  };
}

// ------------------------------------------------------------------ the animated combination (practice)

/**
 * Practice: v and w stand on the origin; on Check, v stretches to a·v, w moves to its tip and stretches to
 * b·w, and the yellow sum grows from the origin. Returns the sum.
 */
export async function playCombo(view: PlaneView, a: number, v: Vec, b: number, w: Vec, o: { names?: [string, string]; ms?: number } = {}): Promise<Vec> {
  view.clear();
  const Gv = view.arrow('v', 'g'), Rw = redArrow(view, 'w'), Y = view.arrow('sum', 'y');
  Gv.set(v, [0, 0]);
  Rw.set(w, [0, 0]);
  if (o.names) { Gv.label(`$${tname(o.names[0])}$`); Rw.label(`$${tname(o.names[1])}$`); }
  const s = lin(a, v, b, w);
  if (fast()) {
    Gv.set(mul(a, v), [0, 0]);
    Rw.set(mul(b, w), mul(a, v));
    if (o.names) { Gv.label(Math.abs(a) < 1e-12 ? '' : `$${tmulName(a, o.names[0])}$`); Rw.label(Math.abs(b) < 1e-12 ? '' : `$${tmulName(b, o.names[1])}$`); }
    Y.set(s, [0, 0]);
    return s;
  }
  const ms = o.ms ?? 420;
  await Gv.scaleTo(a, { ms });
  if (o.names) Gv.label(Math.abs(a) < 1e-12 ? '' : `$${tmulName(a, o.names[0])}$`);
  await Rw.slide(mul(a, v), ms * 0.8);
  await Rw.scaleTo(b, { ms });
  if (o.names) Rw.label(Math.abs(b) < 1e-12 ? '' : `$${tmulName(b, o.names[1])}$`);
  await wait(80);
  await Y.grow(s, { from: [0, 0], ms: ms * 0.8 });
  return s;
}

/** Solve (tests and the survey) runs animations a thousand times faster: then skip them, frames are slow. */
export const fast = (): boolean => animSpeed() > 50;

/** v (green) and w (red) standing on the origin, as each practice round starts. */
export function givens(view: PlaneView, v: Vec, w: Vec, names?: [string, string]): void {
  const Gv = view.arrow('v', 'g').set(v, [0, 0]);
  const Rw = redArrow(view, 'w').set(w, [0, 0]);
  if (names) { Gv.label(`$${tname(names[0])}$`); Rw.label(`$${tname(names[1])}$`); }
}
