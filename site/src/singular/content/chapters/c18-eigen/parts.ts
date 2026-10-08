// Act VII pictures and instruments shared by Chapters 18–20: scene tags, the line hunt (the kit's Sweep
// plus locking lines and their stretches), the plot of det(A − λI), a rail of cards that act right to
// left, a dashed grid on two arrows (the grid of lines that hold), and bars.
import './act7.css';
import { Group, Vector3 } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import type { Stage } from '../../../core/stage';
import { Label } from '../../../gfx/label';
import { FatSegments } from '../../../gfx/lines';
import { Sweep } from '../../../kit/geom';
import { Slider, VectorInput, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { animate, ease } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { matVec, norm, type Mat, type Vec } from '../../../math/la';
import { eigenLines, fmt2, fmtN, fmtV, lineAngleDeg, stretchOf, turnDeg, type EigLine, type Lock } from './logic';

export const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], (v[2] ?? 0) + z];

/** A small pill label in the scene. kind: '' (white), 'y', 'g', 'r', 'b', 'vi', 'o', 'dim'. */
export function tag(text: string, at: V3, kind = '', offset: [number, number] = [0, 0]): Label {
  return new Label(text, at, { className: `a7-tag ${kind}`, offset });
}

/** A label added to a puzzle (disposed with it). */
export function ptag(p: PuzzleCtx, text: string, at: V3, kind = '', offset: [number, number] = [0, 0]): Label {
  const l = tag(text, at, kind, offset);
  p.add(l.object);
  p.onDispose(() => l.dispose());
  return l;
}

/** The nicest whole-number direction for a unit arrow (|entries| ≤ 4), or the arrow to two decimals. */
export function niceDir(u: readonly number[]): Vec {
  let best: Vec | null = null, bestA = 0.35;
  const n = u.length;
  const R = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const cands: Vec[] = n === 2 ? R.flatMap((a) => R.map((b) => [a, b])) : R.flatMap((a) => R.flatMap((b) => R.map((c) => [a, b, c])));
  for (const c of cands) {
    if (norm(c) < 1e-9) continue;
    const a = lineAngleDeg(c, u);
    // acos near 1 is noisy (about 1e-6°): a tie within 1e-4° goes to the shorter arrow, (1, −1, 0) not (3, −3, 0)
    if (a < bestA - 1e-4 || (best && Math.abs(a - bestA) <= 1e-4 && norm(c) < norm(best))) { best = c; bestA = a; }
  }
  if (!best) return u.map((x) => Math.round(x * 100) / 100);
  // first non-zero entry positive
  const s = best.find((x) => Math.abs(x) > 1e-9)! < 0 ? -1 : 1;
  return best.map((x) => (x * s === 0 ? 0 : x * s));
}

// ------------------------------------------------------------------ the line hunt

export interface LineHuntOpts {
  M: Mat;
  radius?: number;
  start?: number;
  /** 'drag': turn the test arrow by hand; 'typed': type a direction and test it (commander). */
  mode?: 'drag' | 'typed';
  /** Within this many degrees counts as on a line. */
  tolDeg?: number;
  /** Stretch typed by the player (else LANTERN reads it on lock). */
  typedStretch?: boolean;
  stretchTol?: number;
  /** Lock as soon as a line is found (cadet). */
  autoLock?: boolean;
  /** Show the length ratio |Ax| / |x| in the readout. */
  ratio?: boolean;
  title?: string;
  labels?: { x?: string; mx?: string };
  /** The puzzle's view: a typed arrow (or its image) that would leave it zooms out, centred on the origin. */
  view?: { center: [number, number]; height: number };
  /** Dock for the controls (default the puzzle dock). */
  mount?: HTMLElement;
  /** Chapter 18's plain words: "vector", stacked columns, λ (docs/singular/ch18-plain-style.md). */
  plain?: boolean;
  /** The matrix's name in the plain words (default A). */
  name?: string;
  onChange?: () => void;
  onLock?: (l: Lock, line: EigLine) => void;
  onMiss?: (deg: number) => void;
}

interface LockRow { lock: Lock; line: EigLine; row: HTMLElement; input: HTMLInputElement | null; status: HTMLElement; ok: boolean }

/**
 * The kit's Sweep (a green test arrow on a circle, its yellow image, the trace, violet lines where they
 * share a line) plus a Lock button and one row per locked line, where the stretch is typed or read.
 */
/** A vector as a TeX row, short numbers. */
const texV = (v: readonly number[]): string => `(${v.map((x) => fmtN(Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : +x.toFixed(2))).join(',\\ ')})`;
/** A vector as a stacked TeX column, short numbers. */
export const texCol = (v: readonly number[]): string => `\\begin{bmatrix}${v.map((x) => fmtN(Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : +x.toFixed(2)).replace('−', '-')).join(' \\\\ ')}\\end{bmatrix}`;

export class LineHunt {
  readonly sweep: Sweep;
  readonly el: HTMLElement;
  readonly rows: LockRow[] = [];
  private readonly list: HTMLElement;
  private readonly msg: HTMLElement;
  private readonly log: HTMLElement;
  private readonly typed: VectorInput | null = null;
  private readonly lines: EigLine[];
  private readonly tol: number;
  private readonly sTol: number;

  constructor(private readonly p: PuzzleCtx, private readonly o: LineHuntOpts) {
    this.tol = o.tolDeg ?? 2;
    this.sTol = o.stretchTol ?? 0.05;
    this.lines = eigenLines(o.M);
    const typed = (o.mode ?? 'drag') === 'typed';
    this.sweep = new Sweep(p, {
      // x starts at (1, 0), so its image is A's first column: the arrow the story just read out
      M: o.M, radius: o.radius ?? 1.6, start: o.start ?? 0, tol: this.tol, labels: o.labels ?? { x: '$\\mathbf x$', mx: '$A\\mathbf x$' },
      draggable: !typed, xLine: true, circle: !typed, valueLabels: !o.typedStretch,
      onChange: () => o.onChange?.(),
      // autoLock locks the line the Sweep found, not the arrow where it was found: onFound fires once, at
      // up to tol off the line, where Ax can be turned by more than tol (twice the offset near (1, −1)).
      onFound: (i, angle) => {
        sfx.star(i % 3);
        if (o.autoLock) { this.p.move(); this.lock([Math.cos(angle), Math.sin(angle)]); }
        o.onChange?.();
      },
    });
    this.list = h('div', { class: 'a7-locks' });
    this.msg = h('div', { class: 'a7-msg' });
    this.log = h('div', { class: 'a7-log' });
    const controls = h('div', { class: 'a7-row' });
    if (typed) {
      // the typed arrow is drawn at its true length, so what you type is what you see
      this.sweep.setVector([1, 0], false);
      this.typed = new VectorInput({ dim: 2, values: [1, 0], label: '\\mathbf x =', step: 1, onSubmit: () => void this.test() });
      this.typed.el.classList.add('a7-in');
      controls.append(this.typed.el, o.plain
        ? button(inline(`Apply $${o.name ?? 'A'}$`), () => void this.test(), { cls: 'primary small', html: true })
        : button('Test this arrow', () => void this.test(), { cls: 'primary small' }));
    } else {
      controls.append(
        o.autoLock ? h('span', { class: 'k' }, o.plain ? 'Drag green round. A line locks when yellow stays on it.' : 'Drag the green arrow round. A line locks when it holds.') : button('Lock this line', () => this.lock(), { cls: 'primary small' }),
        button('Sweep once', () => { this.p.move(); void this.sweep.animateSweep(6000); }, { cls: 'small ghost' }));
    }
    this.el = h('div', { class: 'a7-hunt', style: 'display:flex;flex-direction:column;gap:8px' },
      o.title ? h('div', { class: 'a7-kick' }, o.title) : null, controls, this.log, this.list, this.msg);
    (o.mount ?? p.dock()).append(this.el);
  }

  /** The current test arrow and its image (2-D). */
  get x(): Vec { return this.sweep.xVec.slice(0, 2); }
  get image(): Vec { return matVec(this.o.M, this.x); }
  get turn(): number { return turnDeg(this.o.M, this.x); }
  get ratio(): number { return stretchOf(this.o.M, this.x); }

  say(t: string, kind: '' | 'good' | 'bad' = ''): void { this.msg.className = `a7-msg ${kind}`; this.msg.innerHTML = inline(t); }

  /** Commander: slide the test arrow to the typed arrow (true length), log what A does to it, try to lock. */
  async test(v?: readonly number[]): Promise<void> {
    if (v) this.typed?.set(v.slice());
    const d = v ? v.slice() : this.typed!.get();
    if (norm(d) < 1e-9) { this.say(this.o.plain ? 'The zero vector has no line. Type a vector that is not zero.' : 'The zero arrow has no line to keep. Type an arrow that is not zero.', 'bad'); sfx.miss(); return; }
    this.p.move();
    await this.sweep.slideTo(d, this.p.g.headless ? 10 : 600);
    this.fit(d);
    const ax = matVec(this.o.M, d), deg = turnDeg(this.o.M, d);
    const on = deg <= this.tol;
    const k = on ? stretchOf(this.o.M, d) : NaN;
    // the log: every test, hit or miss, with its numbers (the evidence the player builds the answer from)
    const N = this.o.name ?? 'A';
    const entry = h('div', { class: `a7-logrow ${on ? 'hit' : ''}`, html: inline(this.o.plain
      ? `$${N}${texCol(d)} = ${texCol(ax)}$ · ${on ? 'on its line' : 'turned'}`
      : `$\\mathbf x = ${texV(d)}$ → $A\\mathbf x = ${texV(ax)}$ · ${on ? (this.o.typedStretch ? '**on the dashed line**' : `**${fmtN(k)} × x**`) : `turned ${Math.round(deg)}°`}`) });
    this.log.prepend(entry);
    while (this.log.children.length > 5) this.log.lastElementChild?.remove();
    this.lock(d);
  }

  /** Zoom out so a typed arrow and its image stay on screen; back to the puzzle's view when they fit. */
  private fit(d: readonly number[]): void {
    const v = this.o.view;
    if (!v || this.p.g.headless) return;
    const ax = matVec(this.o.M, d.slice());
    const m = Math.max(...[...d, ...ax].map(Math.abs));
    const need = 2.6 * m + 2;
    const out = need > v.height;
    void this.p.g.stage.view2D({ center: out ? [0, 0] : v.center, height: out ? need : v.height, ms: 500 });
  }

  /** Lock the line under the test arrow (or the given direction), if A keeps it. */
  lock(dir?: readonly number[]): boolean {
    const x = dir ? dir.slice() : this.x;
    const deg = turnDeg(this.o.M, x);
    const near = this.lines.find((l) => lineAngleDeg(l.dir, x) <= this.tol);
    if (deg > this.tol || !near) {
      sfx.miss();
      this.say(this.o.plain ? `Yellow is off the dashed line: $${this.o.name ?? 'A'}$ turns this vector.` : `Yellow is turned ${Math.round(deg)}° off the dashed line through green. $A$ turns this arrow, so this line does not hold.`, 'bad');
      this.o.onMiss?.(deg);
      return false;
    }
    if (this.rows.some((r) => lineAngleDeg(r.line.dir, near.dir) < 1e-6)) { this.say(this.o.plain ? 'You found that line already. Look for another.' : 'That line is locked already. Look for another.'); return false; }
    if (!dir) this.p.move();
    const d = niceDir(near.dir);
    const lock: Lock = { dir: near.dir.slice(), stretch: this.o.typedStretch ? NaN : near.value };
    const status = h('span', { class: 'st' });
    let input: HTMLInputElement | null = null;
    const row = h('div', { class: 'a7-lock' }, h('span', { class: 'd', html: inline(this.o.plain ? `$\\mathbf v = ${texCol(d)}$` : `line ${fmtV(d)}`) }));
    if (this.o.typedStretch) {
      input = h('input', { class: 'cell', inputmode: 'decimal', 'aria-label': `lambda for ${fmtV(d)}`, placeholder: '?' }) as HTMLInputElement;
      row.append(h('span', { class: 's', html: inline(this.o.plain ? '$\\lambda =$' : 'stretch $\\lambda =$') }), input, status);
    } else {
      row.append(h('span', { class: 's', html: inline(this.o.plain ? `$\\lambda = ${fmtN(near.value)}$` : `stretch $\\lambda = ${fmtN(near.value)}$`) }), status);
    }
    const r: LockRow = { lock, line: near, row, input, status, ok: !this.o.typedStretch };
    if (r.ok) { row.classList.add('ok'); status.textContent = '✓'; }
    if (input) {
      const check = () => {
        const v = parseNum(input!.value);
        if (v === null) return;
        this.p.move();
        lock.stretch = v;
        r.ok = Math.abs(v - near.value) <= this.sTol;
        row.classList.toggle('ok', r.ok);
        status.textContent = r.ok ? '✓' : Math.abs(v + near.value) <= this.sTol && Math.abs(near.value) > 1e-9 ? 'check the sign' : this.o.plain ? 'not right' : 'not this one';
        if (r.ok) sfx.snap(); else sfx.miss();
        this.o.onChange?.();
      };
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') check(); });
      input.addEventListener('change', check);
    }
    this.rows.push(r);
    this.list.append(row);
    sfx.snap();
    const N = this.o.name ?? 'A';
    this.say(this.o.plain
      ? (this.o.typedStretch ? `Yellow stays on the line: $${N}\\mathbf v = \\lambda\\mathbf v$. Type $\\lambda$.` : `Found: the line through $${texCol(d)}$.`)
      : this.o.typedStretch
        ? `Yellow lands on the dashed line: $A\\mathbf x$ is a multiple of $\\mathbf x$. How many times $\\mathbf x$ is it? Type that number.`
        : `Locked: $A$ leaves the line through ${fmtV(d)} on itself.`, 'good');
    this.o.onLock?.(lock, near);
    this.o.onChange?.();
    if (input) window.setTimeout(() => input?.focus(), 30);
    return true;
  }

  /** Every line held, each with the right stretch. */
  get done(): boolean { return this.lines.length > 0 && this.lines.every((l) => this.rows.some((r) => r.ok && lineAngleDeg(r.line.dir, l.dir) < 1e-6)); }
  get locks(): Lock[] { return this.rows.map((r) => r.lock); }
  get count(): number { return this.lines.length; }

  /** Fill the stretch of every locked row (Show me). */
  fillStretches(): void {
    for (const r of this.rows) {
      if (r.input && !r.ok) { r.input.value = fmtN(r.line.value).replace('−', '-'); r.input.dispatchEvent(new Event('change')); }
    }
  }

  /** Show me: visit each line, lock it, fill its stretch. */
  async showMe(ms = 900): Promise<void> {
    for (const l of this.lines) {
      if (this.rows.some((r) => lineAngleDeg(r.line.dir, l.dir) < 1e-6)) continue;
      const a = Math.atan2(l.dir[1], l.dir[0]);
      const t0 = this.sweep.t;
      const d = Math.atan2(Math.sin(a - t0), Math.cos(a - t0));
      const target = Math.abs(d) <= Math.PI / 2 ? a : a + Math.PI;
      if (this.typed) { await this.test(niceDir(l.dir)); continue; }
      await this.sweep.turnTo(target, this.p.g.headless ? 10 : ms);
      if (!this.rows.some((r) => lineAngleDeg(r.line.dir, l.dir) < 1e-6)) this.lock(l.dir);
    }
    this.fillStretches();
  }
}

// ------------------------------------------------------------------ the plot of det(A − λI)

export interface PolyPlotOpts { lo: number; hi: number; ymin: number; ymax: number; fn: (l: number) => number; label?: string; ticks?: number[] }

/** A small SVG plot of y = det(A − λI) against λ, with a dot at the dial and violet marks at roots found. */
export class PolyPlot {
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly dot: SVGCircleElement;
  private readonly roots: SVGGElement;
  private readonly W = 300;
  private readonly H = 120;
  constructor(private readonly o: PolyPlotOpts) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = <K extends string>(t: K, a: Record<string, string | number>) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
    this.svg = el('svg', { viewBox: `0 0 ${this.W} ${this.H}`, class: 'a7-plot', role: 'img', 'aria-label': o.label ?? 'plot' }) as SVGSVGElement;
    for (const t of o.ticks ?? []) {
      const x = this.X(t);
      this.svg.append(el('line', { x1: x, y1: 6, x2: x, y2: this.H - 16, class: 'grid' }));
      const tx = el('text', { x, y: this.H - 4, 'text-anchor': 'middle', class: 'tick' }); tx.textContent = fmtN(t); this.svg.append(tx);
    }
    const y0 = this.Y(0);
    this.svg.append(el('line', { x1: 0, y1: y0, x2: this.W, y2: y0, class: 'axis' }));
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) { const l = o.lo + ((o.hi - o.lo) * i) / 160; pts.push(`${this.X(l).toFixed(1)},${this.Y(o.fn(l)).toFixed(1)}`); }
    this.svg.append(el('polyline', { points: pts.join(' '), class: 'curve' }));
    this.roots = el('g', {}) as SVGGElement;
    this.svg.append(this.roots);
    this.dot = el('circle', { r: 4.5, class: 'dot', cx: this.X(o.lo), cy: this.Y(o.fn(o.lo)) }) as SVGCircleElement;
    this.svg.append(this.dot);
    if (o.label) { const lb = el('text', { x: this.W / 2, y: 13, class: 'lab', 'text-anchor': 'middle' }); lb.textContent = o.label; this.svg.append(lb); }
    this.el = h('div', { class: 'a7-plotwrap' }, this.svg);
  }
  private X(l: number): number { return ((l - this.o.lo) / (this.o.hi - this.o.lo)) * this.W; }
  private Y(y: number): number { const c = Math.max(this.o.ymin, Math.min(this.o.ymax, y)); return 6 + (1 - (c - this.o.ymin) / (this.o.ymax - this.o.ymin)) * (this.H - 24); }
  at(l: number): void { this.dot.setAttribute('cx', String(this.X(l))); this.dot.setAttribute('cy', String(this.Y(this.o.fn(l)))); }
  mark(l: number): void {
    const NS = 'http://www.w3.org/2000/svg';
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(this.X(l))); c.setAttribute('cy', String(this.Y(0))); c.setAttribute('r', '5'); c.setAttribute('class', 'root');
    this.roots.append(c);
  }
}

// ------------------------------------------------------------------ a rail of cards (right to left)

export interface RailCard { id: string; name: string; M: Mat }
export const texCard = (M: Mat): string => `\\left[\\begin{smallmatrix}${M.map((r) => r.map((x) => fmt2(x).replace('−', '-').replace(/\.00$/, '')).join(' & ')).join(' \\\\ ')}\\end{smallmatrix}\\right]`;

/** Cards on a rail. The right-hand card acts first. Click a palette card to add it; click a rail card to remove it. */
export class CardRail {
  readonly el: HTMLElement;
  cards: RailCard[] = [];
  private readonly track: HTMLElement;
  locked = false;
  constructor(private readonly o: { palette: RailCard[]; max?: number; onChange?: (cards: RailCard[]) => void; title?: string }) {
    const pal = h('div', { class: 'a7-palette' }, ...o.palette.map((c) => {
      const b = h('button', { class: 'a7-card', type: 'button', title: `add ${c.name}` }, h('span', { class: 'n' }, c.name), h('span', { class: 'm', html: tex(texCard(c.M)) }));
      b.addEventListener('click', () => { if (!this.locked) { this.add(c); sfx.click(); } });
      return b;
    }));
    this.track = h('div', { class: 'a7-track' });
    this.el = h('div', { class: 'a7-rail' }, h('div', { class: 'a7-kick' }, o.title ?? 'Cards: click one to put it on the rail'), pal, this.track,
      h('div', { class: 'a7-order' }, 'The right-hand card acts first. Click a card on the rail to take it off.'));
    this.render();
  }
  add(c: RailCard): void { if (this.cards.length >= (this.o.max ?? 6)) return; this.cards = [c, ...this.cards]; this.render(); this.o.onChange?.(this.cards); }
  set(cs: RailCard[]): void { this.cards = cs.slice(); this.render(); this.o.onChange?.(this.cards); }
  clear(): void { this.set([]); }
  /** In acting order: first acts first. */
  get acting(): RailCard[] { return this.cards.slice().reverse(); }
  playing(i: number): void { [...this.track.querySelectorAll('.a7-card')].forEach((e, k) => e.classList.toggle('playing', this.cards.length - 1 - k === i)); }
  private render(): void {
    const parts: HTMLElement[] = [];
    this.cards.forEach((c, k) => {
      const b = h('button', { class: 'a7-card', type: 'button' }, h('span', { class: 'n' }, c.name), h('span', { class: 'm', html: tex(texCard(c.M)) }));
      b.addEventListener('click', () => { if (this.locked) return; this.cards.splice(k, 1); this.render(); this.o.onChange?.(this.cards); sfx.back(); });
      parts.push(b);
      if (k < this.cards.length - 1) parts.push(h('span', { class: 'a7-x' }, '·'));
    });
    this.track.replaceChildren(...(parts.length ? parts : [h('span', { class: 'empty' }, 'Empty rail')]));
  }
}

// ------------------------------------------------------------------ a dashed grid on two arrows

/** Every whole-number line of the grid whose arrows are the columns of P, dashed. */
export class LineGrid {
  readonly group = new Group();
  readonly segs: FatSegments;
  constructor(stage: Stage, P: Mat, private readonly o: { color?: string; half?: number; n?: number; opacity?: number; width?: number } = {}) {
    this.segs = new FatSegments(stage, [], { color: o.color ?? C.violet, width: o.width ?? 1.4, opacity: o.opacity ?? 0.7, dashed: true, dashSize: 0.18, gapSize: 0.12, intensity: 1.1 });
    this.segs.object.renderOrder = 1;
    this.group.add(this.segs.object);
    this.group.userData.dispose = () => this.segs.dispose();
    this.set(P);
  }
  get object(): Group { return this.group; }
  set(P: Mat): void {

    const half = this.o.half ?? 8, n = this.o.n ?? 16;
    const a = [P[0][0], P[1][0]], b = [P[0][1], P[1][1]];
    const segs: [V3, V3][] = [];
    const clip = (p: number[], d: number[]): [V3, V3] | null => {
      let t0 = -Infinity, t1 = Infinity;
      for (let i = 0; i < 2; i++) {
        if (Math.abs(d[i]) < 1e-9) { if (Math.abs(p[i]) > half) return null; continue; }
        let u = (-half - p[i]) / d[i], v = (half - p[i]) / d[i];
        if (u > v) [u, v] = [v, u];
        t0 = Math.max(t0, u); t1 = Math.min(t1, v);
      }
      return t1 > t0 ? [[p[0] + t0 * d[0], p[1] + t0 * d[1], 0.004], [p[0] + t1 * d[0], p[1] + t1 * d[1], 0.004]] : null;
    };
    if (norm(a) > 1e-9 && norm(b) > 1e-9 && Math.abs(a[0] * b[1] - a[1] * b[0]) > 1e-9) {
      for (let k = -n; k <= n; k++) {
        const s1 = clip([k * b[0], k * b[1]], a); if (s1) segs.push(s1);
        const s2 = clip([k * a[0], k * a[1]], b); if (s2) segs.push(s2);
      }
    }
    this.segs.object.visible = segs.length > 0;
    if (segs.length) this.segs.setSegments(segs);
  }
  setOpacity(a: number): void { this.segs.setOpacity(a); }
  async fade(to: number, ms = 600): Promise<void> {
    const from = this.segs.material.opacity;
    await animate(ms, (k) => this.segs.setOpacity(from + (to - from) * k), ease.inOut);
  }
}

// ------------------------------------------------------------------ bars

export interface BarSpec { id: string; name: string; color?: string }

/** Labelled horizontal bars with values and an optional target mark. */
export class Bars {
  readonly el: HTMLElement;
  private readonly fills = new Map<string, { bar: HTMLElement; fill: HTMLElement; val: HTMLElement; mark: HTMLElement }>();
  constructor(specs: BarSpec[], private readonly max: number, private readonly fmt: (x: number) => string = (x) => fmtN(Math.round(x * 10) / 10)) {
    this.el = h('div', { class: 'a7-bars' });
    for (const s of specs) {
      const fill = h('span', { style: `width:0%;background:${s.color ?? C.result}` });
      const mark = h('i', { style: 'display:none' });
      const bar = h('div', { class: 'bar' }, fill, mark);
      const val = h('span', { class: 'val' }, '0');
      this.el.append(h('span', { class: 'nm', html: inline(s.name) }), bar, val);
      this.fills.set(s.id, { bar, fill, val, mark });
    }
  }
  set(id: string, x: number): void {
    const f = this.fills.get(id);
    if (!f) return;
    f.fill.style.width = `${Math.max(0, Math.min(100, (100 * x) / this.max))}%`;
    f.val.textContent = this.fmt(x);
  }
  target(id: string, x: number | null): void {
    const f = this.fills.get(id);
    if (!f) return;
    f.mark.style.display = x === null ? 'none' : '';
    if (x !== null) f.mark.style.left = `${Math.max(0, Math.min(100, (100 * x) / this.max))}%`;
  }
}

/** World point of a 2-D vector on the plane (for camera placement of labels). */
export const at3 = (v: readonly number[], z = 0): Vector3 => new Vector3(v[0], v[1], (v[2] ?? 0) + z);

const GOALS = new WeakMap<PuzzleCtx, boolean[]>();
/** Tick (or untick) subgoal i only when it changes, so the chime plays once. */
export function sg(p: PuzzleCtx, i: number, done = true): void {
  const st = GOALS.get(p) ?? [];
  GOALS.set(p, st);
  if (!!st[i] === done) return;
  st[i] = done;
  p.subgoal(i, done);
}

/** A Slider whose shown value keeps its format when set from code (the kit's set(v, false) prints the raw number). */
export function fslider(o: ConstructorParameters<typeof Slider>[0]): Slider {
  const s = new Slider(o);
  const f = o.format;
  if (f) {
    const set = s.set.bind(s);
    s.set = (v: number, notify = true) => { set(v, notify); const e = s.el.querySelector('.val'); if (e) e.textContent = f(v); };
  }
  return s;
}
