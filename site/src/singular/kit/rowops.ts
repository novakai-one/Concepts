// An augmented matrix the player row-reduces by hand. Each row has a grip: drag a row onto another
// row to add a multiple of it (the multiplier is filled in to clear the entry in the dragged row's
// pivot column). ⇅ between rows swaps them; × multiplies a row (filled in with 1 / pivot). Every
// operation is exact (fractions), animated, listed in the step history and can be undone.
// Keyboard: Tab / ↑ ↓ choose a row, A (or a row number) add, M multiply, Alt+↑ / Alt+↓ swap, U undo.
//
// Rows keep their colour when they move (green, red, blue = the first, second, third row at the
// start), so a row and its line or plane in SystemView always share a colour.
import '../styles/kit-rowops.css';
import type { PuzzleCtx } from '../game/types';
import { Frac, fclone, fmat, type FMat } from '../math/frac';
import { applyOp, classify, isREF, isRREF, leadCol, opLabel, opTex, type Classification, type RowOp } from '../math/rref';
import { tex } from '../../lib/md';
import { h } from '../ui/ui';
import { C } from '../core/theme';
import { animSpeed, wait } from '../core/tween';
import { sfx } from '../audio/sfx';
import {
  defaultNames, eqTex, fracHTML, fracText, inverseOp, opProblem, parseFrac, readSolution, suggestAddK, suggestScaleK,
  suggestSource, type OpKind,
} from './rowops-logic';

export type { OpKind };

/** Row colours by row identity: first row green, second red, third blue (then violet, orange). */
export const ROW_COLORS: string[] = [C.v, C.w, C.u, C.violet, C.orange];
export const rowColor = (id: number): string => ROW_COLORS[id % ROW_COLORS.length];

/** Called after every change: the new matrix, the operation (null for Undo / set) and the animation length. */
export type BoardListener = (m: FMat, op: RowOp | null, ms: number) => void;

export interface RowOpsBoardOpts {
  /** The augmented matrix [A | b]: n coefficient columns, then the right-hand side. */
  aug: (number | Frac)[][];
  /** Number of unknowns (coefficient columns). */
  n: number;
  /** Names of the unknowns in TeX (default x, y, z). */
  varNames?: string[];
  /** Where to put the board (default: the puzzle dock). */
  mount?: HTMLElement;
  /** Which row operations the player may use (default all three). */
  ops?: OpKind[];
  onChange?: (m: FMat, op: RowOp | null) => void;
  /** Heading above the matrix (default "Augmented matrix"). */
  title?: string;
  /** Show what the rows say about the solutions once that can be read (default true). */
  showSolution?: boolean;
  /** Show the one-line key help (default true). */
  keyHelp?: boolean;
  /** Animation length of one player operation in ms (default 650). */
  ms?: number;
}

interface Entry { op: RowOp; before: FMat; order: number[] }

interface Composer {
  kind: 'add' | 'scale';
  target: number;          // row position
  source: number;          // row position (add)
  fromDrag: boolean;
  el: HTMLElement;
  input: HTMLInputElement;
  prev: HTMLElement;
  msg: HTMLElement;
  applyBtn: HTMLButtonElement;
  srcBtns: HTMLButtonElement[];
}

const MINUS = '−';
const reducedMotion = (): boolean => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export class RowOpsBoard {
  readonly el: HTMLElement;
  readonly n: number;
  readonly names: string[];
  private m: FMat;
  private ids: number[];
  private readonly start: FMat;
  private hist: Entry[] = [];
  private count = 0;
  private readonly listeners = new Set<BoardListener>();
  private queue: Promise<void> = Promise.resolve();
  private enabled = true;
  private readonly allowed: Set<OpKind>;
  private readonly o: RowOpsBoardOpts;
  private readonly p: PuzzleCtx;
  private readonly ms: number;

  private readonly rowList: HTMLElement;
  private readonly rowsBox: HTMLElement;
  private readonly swapBox: HTMLElement;
  private readonly rowEls: HTMLElement[] = [];
  private readonly labelEls: HTMLElement[] = [];
  private readonly cellEls: HTMLElement[][] = [];
  private readonly cellVals: (Frac | null)[][] = [];
  private readonly chipRef: HTMLElement;
  private readonly chipRref: HTMLElement;
  private readonly readEl: HTMLElement;
  private readonly histEl: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly countEl: HTMLElement;
  private readonly live: HTMLElement;
  private readonly compHost: HTMLElement;
  private comp: Composer | null = null;
  private swapBtns: HTMLButtonElement[] = [];
  private dragGhost: HTMLElement | null = null;
  private wasRef = false;
  private wasRref = false;
  private lastHistLen = 0;

  constructor(p: PuzzleCtx, o: RowOpsBoardOpts) {
    this.p = p;
    this.o = o;
    this.n = o.n;
    this.names = o.varNames ?? defaultNames(o.n);
    this.m = fmat(o.aug);
    this.start = fclone(this.m);
    this.ids = this.m.map((_, i) => i);
    this.allowed = new Set(o.ops ?? ['swap', 'scale', 'add']);
    this.ms = o.ms ?? 650;
    const R = this.m.length, n = this.n;
    if (!R || this.m.some((r) => r.length !== n + 1)) throw new Error('RowOpsBoard: every row needs n + 1 entries');

    const tpl = `var(--rob-grip) repeat(${n}, var(--rob-cw)) var(--rob-barw) var(--rob-cw) var(--rob-act)`;
    this.el = h('div', { class: 'rob', style: `--rob-tpl:${tpl};--rob-rows:${R}` });

    // heading + live status
    this.chipRef = h('span', { class: 'rob-chip' }, h('span', { class: 'rob-chip-dot' }), 'Row echelon form');
    this.chipRref = h('span', { class: 'rob-chip' }, h('span', { class: 'rob-chip-dot' }), 'Reduced row echelon form');
    const head = h('div', { class: 'rob-head' },
      h('span', { class: 'kicker' }, o.title ?? 'Augmented matrix'),
      h('div', { class: 'rob-chips', 'aria-live': 'polite' }, this.chipRef, this.chipRref));

    // column names over the coefficient columns
    const colHead = h('div', { class: 'rob-grid rob-colhead', 'aria-hidden': 'true' },
      h('span'), ...this.names.map((nm) => h('span', { class: 'rob-cn', html: tex(nm) })), h('span'), h('span', { class: 'rob-cn' }), h('span'));

    // rows
    this.rowList = h('div', { class: 'rob-rowlist', role: 'list', 'aria-label': 'Rows of the augmented matrix' });
    for (let id = 0; id < R; id++) this.buildRow(id);
    this.swapBox = h('div', { class: 'rob-swaps' });
    if (this.allowed.has('swap')) {
      for (let k = 0; k + 1 < R; k++) {
        const b = h('button', {
          class: 'rob-swap', type: 'button', style: `top: calc(${k + 1} * var(--rob-rh))`,
          title: `Swap rows ${k + 1} and ${k + 2} (Alt+↑ / Alt+↓)`, 'aria-label': `Swap rows ${k + 1} and ${k + 2}`,
        }, '⇅') as HTMLButtonElement;
        b.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) void this.userApply({ kind: 'swap', i: k, j: k + 1 }); });
        this.swapBtns.push(b);
        this.swapBox.appendChild(b);
      }
    }
    this.rowsBox = h('div', { class: 'rob-rows' },
      h('div', { class: 'rob-brk rob-brk-l' }), h('div', { class: 'rob-brk rob-brk-r' }), this.swapBox, this.rowList);

    // the composer and the drag hint float beside the matrix, next to the target row (no layout shift)
    this.compHost = h('div', { class: 'rob-pop' });
    this.compHost.hidden = true;
    this.readEl = h('div', { class: 'rob-read', 'aria-live': 'polite' });
    this.readEl.hidden = true;

    this.histEl = h('ol', { class: 'rob-hist', 'aria-label': 'Row operations so far' });
    this.countEl = h('span', { class: 'rob-count' });
    this.undoBtn = h('button', { class: 'btn small ghost rob-undo', type: 'button', title: 'Undo the last row operation (U or Ctrl+Z)' },
      'Undo', h('span', { class: 'kbd' }, 'U')) as HTMLButtonElement;
    this.undoBtn.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) void this.undo(); });
    const foot = h('div', { class: 'rob-foot' },
      h('div', { class: 'rob-hist-wrap' }, h('div', { class: 'rob-hist-head' }, h('span', { class: 'kicker' }, 'Steps'), this.countEl), this.histEl),
      this.undoBtn);

    const help = h('div', { class: 'rob-help' },
      'Drag a row onto another row to add a multiple of it. ',
      h('span', { class: 'rob-keys' }, 'Keys: ↑ ↓ choose a row · A add · M multiply · Alt+↑ ↓ swap · U undo'));
    if (o.keyHelp === false) help.hidden = true;
    this.live = h('div', { class: 'rob-sr', 'aria-live': 'polite' });

    this.el.append(head, h('div', { class: 'rob-mat' }, colHead, this.rowsBox), this.compHost, this.readEl, foot, help, this.live);
    (o.mount ?? p.dock()).appendChild(this.el);
    this.el.closest('.dock')?.classList.add('rob-dock');

    const onDocKey = (e: KeyboardEvent) => {
      if (!this.enabled || !this.el.isConnected) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        void this.undo();
      }
    };
    document.addEventListener('keydown', onDocKey);
    p.onDispose(() => {
      document.removeEventListener('keydown', onDocKey);
      this.dragGhost?.remove();
      this.el.remove();
      this.listeners.clear();
    });
    this.paint(0);
  }

  // ------------------------------------------------------------------ public API

  /** The current matrix (a copy). */
  get(): FMat { return fclone(this.m); }

  /** Replace the matrix (no animation). Clears the step history; rows take their starting colours again. */
  set(m: (number | Frac)[][]): void {
    this.closeComposer();
    const a = fmat(m);
    if (a.length !== this.m.length || a.some((r) => r.length !== this.n + 1)) throw new Error('RowOpsBoard.set: shape mismatch');
    this.m = a;
    this.ids = a.map((_, i) => i);
    this.hist = [];
    this.reorder();
    this.paint(0);
    this.emit(null, 0);
  }

  /** Back to the starting matrix. */
  reset(): void { this.set(this.start); }

  /**
   * Apply a row operation: counts a move (p.move()), records it in the history and animates.
   * Operations queue: each starts when the one before has finished.
   */
  apply(op: RowOp, animate = true, ms = this.ms): Promise<void> {
    return this.enqueue(() => this.doApply(op, animate ? ms : 0, 'do'));
  }

  /** Undo the last operation (animated). Does not count a move. */
  undo(): Promise<void> {
    return this.enqueue(async () => {
      const e = this.hist[this.hist.length - 1];
      if (!e) { sfx.miss(); return; }
      await this.doApply(inverseOp(e.op), this.ms, 'undo');
    });
  }

  /** Operations performed by the player (and by play()); undoing does not take them back. */
  moves(): number { return this.count; }

  /** The operations currently applied, in order (undone ones removed). */
  history(): RowOp[] { return this.hist.map((e) => e.op); }

  /** Play a list of operations (Show me). Locks the board while it plays. */
  async play(ops: RowOp[], msEach = 700): Promise<void> {
    this.closeComposer();
    const was = this.enabled;
    this.setEnabled(false);
    try {
      for (const op of ops) {
        await this.apply(op, true, msEach);
        await wait(msEach * 0.2);
      }
    } finally { this.setEnabled(was); }
  }

  isREF(): boolean { return isREF(this.m, this.n); }
  isRREF(): boolean { return isRREF(this.m, this.n); }
  classification(): Classification { return classify(this.m, this.n); }

  /** Row identities by position (0 = the row that started first / green). */
  order(): number[] { return this.ids.slice(); }

  /** Listen to every change; returns an unsubscribe function. */
  subscribe(fn: BoardListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Lock or unlock the player's controls. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.el.classList.toggle('rob-locked', !on);
    for (const b of this.el.querySelectorAll('button')) (b as HTMLButtonElement).disabled = !on;
    for (const r of this.rowEls) r.tabIndex = on ? 0 : -1;
    this.undoBtn.disabled = !on || !this.hist.length;
    if (!on) this.closeComposer();
  }

  /** Focus a row (position) for keyboard use. */
  focusRow(pos = 0): void { this.rowEls[this.ids[pos]]?.focus(); }

  // ------------------------------------------------------------------ building

  private buildRow(id: number): void {
    const n = this.n;
    const label = h('span', { class: 'rob-rl' }, `R${id + 1}`);
    const grip = h('span', { class: 'rob-grip', title: 'Drag onto another row to add a multiple of this row' },
      h('span', { class: 'rob-dots', 'aria-hidden': 'true' }), label);
    const cells: HTMLElement[] = [];
    const vals: (Frac | null)[] = [];
    for (let c = 0; c <= n; c++) {
      cells.push(h('span', { class: `rob-cell${c === n ? ' rob-rhs' : ''}` }));
      vals.push(null);
    }
    const scaleBtn = h('button', { class: 'rob-act rob-scale', type: 'button', title: 'Multiply this row by a number (M)', 'aria-label': 'Multiply this row by a number' }, '×') as HTMLButtonElement;
    if (!this.allowed.has('scale')) scaleBtn.hidden = true;
    const row = h('div', { class: 'rob-row rob-grid', role: 'listitem', tabindex: '0', style: `--rc:${rowColor(id)}` },
      grip, ...cells.slice(0, n), h('span', { class: 'rob-bar', 'aria-hidden': 'true' }), cells[n], scaleBtn);
    scaleBtn.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) this.openScale(this.ids.indexOf(id)); });
    row.addEventListener('keydown', (e) => this.onRowKey(e, id));
    row.addEventListener('pointerdown', (e) => this.onPointerDown(e, id));
    this.rowEls[id] = row;
    this.labelEls[id] = label;
    this.cellEls[id] = cells;
    this.cellVals[id] = vals;
    this.rowList.appendChild(row);
  }

  private reorder(): void {
    for (const id of this.ids) this.rowList.appendChild(this.rowEls[id]);
  }

  // ------------------------------------------------------------------ painting

  private dur(ms: number): number { return reducedMotion() ? Math.min(ms, 120) : ms / Math.max(1e-3, animSpeed()); }

  /** Push the state to the DOM. fadeMs > 0 cross-fades numbers that changed. */
  private paint(fadeMs: number): void {
    const n = this.n, m = this.m;
    const ref = isREF(m, n), rref = isRREF(m, n);
    this.ids.forEach((id, pos) => {
      const row = this.rowEls[id];
      this.labelEls[id].textContent = `R${pos + 1}`;
      row.setAttribute('aria-label', `Row ${pos + 1}: ${this.rowSpeech(m[pos])}`);
      const lc = leadCol(m[pos], n);
      for (let c = 0; c <= n; c++) {
        const cell = this.cellEls[id][c];
        this.setCell(id, c, m[pos][c], fadeMs);
        cell.classList.toggle('rob-zero', m[pos][c].isZero());
        cell.classList.toggle('rob-pivot', ref && c === lc);
        cell.classList.toggle('rob-stair', ref && c < n && (lc === -1 || c < lc));
      }
      row.classList.toggle('rob-zero-row', lc === -1);
      row.classList.toggle('rob-bad-row', lc === -1 && !m[pos][n].isZero());
    });
    this.el.classList.toggle('rob-is-ref', ref);
    this.el.classList.toggle('rob-is-rref', rref);
    this.setChip(this.chipRef, ref, this.wasRef);
    this.setChip(this.chipRref, rref, this.wasRref);
    if (ref && !this.wasRef && fadeMs > 0) sfx.snap();
    this.wasRef = ref;
    this.wasRref = rref;
    this.paintReading();
    this.paintHistory();
    this.undoBtn.disabled = !this.enabled || this.hist.length === 0;
  }

  private setChip(el: HTMLElement, on: boolean, was: boolean): void {
    el.classList.toggle('on', on);
    el.setAttribute('aria-label', `${el.textContent}: ${on ? 'yes' : 'not yet'}`);
    if (on && !was) el.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: this.dur(500), easing: 'ease-out' });
  }

  private setCell(id: number, c: number, v: Frac, fadeMs: number): void {
    const cell = this.cellEls[id][c];
    const old = this.cellVals[id][c];
    if (old && old.eq(v)) return;
    this.cellVals[id][c] = v;
    const span = h('span', { class: 'rob-v', html: fracHTML(v) });
    const d = this.dur(fadeMs);
    if (!old || d <= 1) { cell.replaceChildren(span); return; }
    for (const prev of [...cell.querySelectorAll<HTMLElement>('.rob-v')]) {
      prev.classList.add('rob-v-out');
      const a = prev.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: d, easing: 'ease-in', fill: 'forwards' });
      a.finished.then(() => prev.remove(), () => prev.remove());
    }
    cell.appendChild(span);
    span.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { duration: d, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  private paintReading(): void {
    if (this.o.showSolution === false) { this.readEl.hidden = true; return; }
    const r = readSolution(this.m, this.n, this.names);
    if (r.kind === 'not-yet') { this.readEl.hidden = true; return; }
    const listNames = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
    const nm = (i: number) => tex(this.names[i]);
    let html = '';
    if (r.kind === 'unique') html = `<span class="rob-read-k">One solution</span> ${tex(r.tex)}`;
    else if (r.kind === 'infinite') {
      const free = listNames(r.free.map(nm));
      html = `<span class="rob-read-k">Free variable${r.free.length > 1 ? 's' : ''}: ${free}</span> ${r.free.length > 1 ? 'They take' : 'It takes'} any value. Then ${tex(r.tex)}`;
    } else {
      html = `<span class="rob-read-k">No solution</span> Row ${r.row + 1} reads ${tex(r.tex)}. No values of ${listNames(this.names.map((_, i) => nm(i)))} make that true.`;
    }
    const changed = this.readEl.hidden || this.readEl.dataset.k !== r.kind;
    this.readEl.innerHTML = html;
    this.readEl.dataset.k = r.kind;
    this.readEl.hidden = false;
    if (changed) this.readEl.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: this.dur(450), easing: 'ease-out' });
  }

  private paintHistory(): void {
    const ops = this.history();
    this.countEl.textContent = ops.length ? String(ops.length) : '';
    if (!ops.length) {
      this.histEl.replaceChildren(h('li', { class: 'rob-hist-empty' }, 'None yet'));
      this.lastHistLen = 0;
      return;
    }
    const items = ops.map((op, i) => h('li', { class: 'rob-step', title: opLabel(op), html: `<span class="rob-step-n">${i + 1}</span>${tex(opTex(op))}` }));
    this.histEl.replaceChildren(...items);
    const last = items[items.length - 1];
    if (ops.length > this.lastHistLen) {
      last.classList.add('rob-step-new');
      last.animate?.([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: this.dur(350), easing: 'ease-out' });
    }
    this.lastHistLen = ops.length;
    this.histEl.scrollTop = this.histEl.scrollHeight;
  }

  private rowSpeech(row: Frac[]): string {
    const parts = row.slice(0, this.n).map((x, c) => `${fracText(x)} ${this.names[c].replace(/[{}_\\]/g, '')}`);
    return `${parts.join(', ')}, equals ${fracText(row[this.n])}`;
  }

  // ------------------------------------------------------------------ applying

  private enqueue(f: () => Promise<void>): Promise<void> {
    const run = this.queue.then(f);
    this.queue = run.catch(() => {});
    return run;
  }

  private emit(op: RowOp | null, ms: number): void {
    const m = this.get();
    try { this.o.onChange?.(m, op); } catch (e) { console.error(e); }
    for (const f of [...this.listeners]) { try { f(this.get(), op, ms); } catch (e) { console.error(e); } }
  }

  /** Validate and apply an operation the player chose. */
  private async userApply(op: RowOp): Promise<boolean> {
    const why = opProblem(op, this.m.length);
    if (why || !this.allowed.has(op.kind)) { sfx.miss(); this.say(why ?? 'That row operation is not available here.'); return false; }
    this.closeComposer();
    await this.apply(op);
    return true;
  }

  private async doApply(op: RowOp, ms: number, mode: 'do' | 'undo'): Promise<void> {
    const beforeIds = this.ids.slice();
    if (mode === 'do') {
      const why = opProblem(op, this.m.length);
      if (why) throw new Error(`RowOpsBoard: ${why}`);
      this.hist.push({ op, before: this.m, order: beforeIds });
      this.m = applyOp(this.m, op);
      if (op.kind === 'swap') [this.ids[op.i], this.ids[op.j]] = [this.ids[op.j], this.ids[op.i]];
      this.count++;
      this.p.move();
    } else {
      const e = this.hist.pop()!;
      this.m = e.before;
      this.ids = e.order.slice();
    }
    this.say(mode === 'undo' ? `Undone. ${opLabel(op)}` : opLabel(op));
    this.emit(mode === 'do' ? op : null, ms);
    if (op.kind === 'swap') sfx.whoosh(Math.max(0.2, ms / 1000 * 0.6)); else sfx.snap();
    if (ms <= 0 || this.dur(ms) <= 2) {
      this.reorder();
      this.paint(0);
      if (ms > 0) await wait(ms);
      return;
    }
    if (op.kind === 'swap') await this.animSwap(op, beforeIds, ms);
    else if (op.kind === 'scale') await this.animScale(op, ms);
    else await this.animAdd(op, ms);
  }

  private async animSwap(op: Extract<RowOp, { kind: 'swap' }>, beforeIds: number[], ms: number): Promise<void> {
    const a = this.rowEls[beforeIds[op.i]], b = this.rowEls[beforeIds[op.j]];
    const ya = a.offsetTop, yb = b.offsetTop;
    this.reorder();
    const da = ya - a.offsetTop, db = yb - b.offsetTop;
    const d = this.dur(ms);
    const ez = 'cubic-bezier(.65,0,.25,1)';
    a.classList.add('rob-moving');
    b.classList.add('rob-moving');
    a.animate([{ transform: `translateY(${da}px)` }, { transform: `translateY(${da / 2}px) translateX(10px) scale(1.03)`, offset: 0.5 }, { transform: 'none' }], { duration: d, easing: ez });
    b.animate([{ transform: `translateY(${db}px)` }, { transform: `translateY(${db / 2}px) translateX(-6px) scale(0.98)`, offset: 0.5 }, { transform: 'none' }], { duration: d, easing: ez });
    await wait(ms * 0.75);
    this.paint(ms * 0.3);
    await wait(ms * 0.25);
    a.classList.remove('rob-moving');
    b.classList.remove('rob-moving');
  }

  private async animScale(op: Extract<RowOp, { kind: 'scale' }>, ms: number): Promise<void> {
    const row = this.rowEls[this.ids[op.i]];
    const badge = h('span', { class: 'rob-badge', html: `×&thinsp;${fracHTML(op.k)}` });
    row.appendChild(badge);
    const d = this.dur(ms);
    badge.animate([{ opacity: 0, transform: 'translate(-50%, -50%) scale(0.6)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.3 }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.7 }, { opacity: 0, transform: 'translate(-50%, -50%) scale(1)' }], { duration: d * 1.1, easing: 'ease-out' });
    await wait(ms * 0.25);
    this.flash(row, ms);
    this.paint(ms * 0.55);
    await wait(ms * 0.8);
    badge.remove();
  }

  private async animAdd(op: Extract<RowOp, { kind: 'add' }>, ms: number): Promise<void> {
    const src = this.rowEls[this.ids[op.j]], tgt = this.rowEls[this.ids[op.i]];
    const srcRow = this.m[op.j];
    const k = op.k;
    const neg = k.sign() < 0;
    const mag = neg ? k.neg() : k;
    const coef = mag.isOne() ? '' : `${fracHTML(mag)}&thinsp;`;
    const ghost = h('div', { class: 'rob-ghost rob-grid', style: `--rc:${src.style.getPropertyValue('--rc')}`, 'aria-hidden': 'true' },
      h('span', { class: 'rob-ghost-k', html: `${neg ? MINUS : '+'}&thinsp;${coef}R${op.j + 1}` }),
      ...srcRow.slice(0, this.n).map((x) => h('span', { class: 'rob-cell', html: fracHTML(x.mul(k)) })),
      h('span'),
      h('span', { class: 'rob-cell', html: fracHTML(srcRow[this.n].mul(k)) }),
      h('span'));
    ghost.style.top = `${src.offsetTop}px`;
    this.rowList.appendChild(ghost);
    src.classList.add('rob-src-pulse');
    const dy = tgt.offsetTop - src.offsetTop;
    const d = this.dur(ms);
    ghost.animate([
      { opacity: 0, transform: 'translateY(0) scale(0.96)' },
      { opacity: 1, transform: `translateY(${dy * 0.15}px) scale(1)`, offset: 0.25 },
      { opacity: 0.95, transform: `translateY(${dy}px) scale(1)`, offset: 0.7 },
      { opacity: 0, transform: `translateY(${dy}px) scale(1.04)` },
    ], { duration: d * 0.85, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    await wait(ms * 0.55);
    this.flash(tgt, ms * 0.8);
    this.paint(ms * 0.45);
    await wait(ms * 0.45);
    ghost.remove();
    src.classList.remove('rob-src-pulse');
  }

  private flash(row: HTMLElement, ms: number): void {
    row.animate([
      { boxShadow: 'inset 0 0 0 1px var(--rc), 0 0 0 0 transparent', background: 'color-mix(in srgb, var(--rc) 34%, transparent)' },
      { boxShadow: 'inset 0 0 0 1px transparent, 0 0 22px -6px var(--rc)', background: 'color-mix(in srgb, var(--rc) 10%, transparent)' },
    ], { duration: this.dur(ms), easing: 'ease-out' });
  }

  private say(text: string): void { this.live.textContent = text; }

  // ------------------------------------------------------------------ keyboard

  private onRowKey(e: KeyboardEvent, id: number): void {
    if (!this.enabled || e.target !== this.rowEls[id]) return;
    const pos = this.ids.indexOf(id);
    const R = this.m.length;
    const k = e.key;
    if ((k === 'ArrowUp' || k === 'ArrowDown') && e.altKey) {
      e.preventDefault();
      const q = pos + (k === 'ArrowUp' ? -1 : 1);
      if (q >= 0 && q < R && this.allowed.has('swap')) void this.userApply({ kind: 'swap', i: Math.min(pos, q), j: Math.max(pos, q) }).then(() => this.rowEls[id].focus());
      return;
    }
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const q = Math.max(0, Math.min(R - 1, pos + (k === 'ArrowUp' ? -1 : 1)));
      this.rowEls[this.ids[q]].focus();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if ((k === 'a' || k === 'A' || k === '+') && this.allowed.has('add')) {
      e.preventDefault();
      this.openAdd(pos, suggestSource(this.m, pos, this.n));
    } else if (/^[1-9]$/.test(k) && this.allowed.has('add')) {
      const src = Number(k) - 1;
      if (src !== pos && src < R) { e.preventDefault(); this.openAdd(pos, src); }
    } else if ((k === 'm' || k === 'M' || k === '*') && this.allowed.has('scale')) {
      e.preventDefault();
      this.openScale(pos);
    } else if (k === 'u' || k === 'U' || k === 'Backspace') {
      e.preventDefault();
      void this.undo().then(() => this.rowEls[id].focus());
    }
  }

  // ------------------------------------------------------------------ composer (add / multiply)

  /** Open "R_target → R_target + k·R_source" with k filled in. */
  openAdd(target: number, source: number, fromDrag = false): void {
    if (!this.enabled || !this.allowed.has('add') || target === source) return;
    this.openComposer('add', target, source, fromDrag);
  }

  /** Open "R_target → k·R_target" with k filled in (1 / pivot). */
  openScale(target: number): void {
    if (!this.enabled || !this.allowed.has('scale')) return;
    this.openComposer('scale', target, target, false);
  }

  private openComposer(kind: 'add' | 'scale', target: number, source: number, fromDrag: boolean): void {
    this.closeComposer(false);
    const R = this.m.length;
    const tag = (pos: number) => h('span', { class: 'rob-tag', style: `--rc:${rowColor(this.ids[pos])}` }, `R${pos + 1}`);
    const input = h('input', { class: 'rob-k', type: 'text', inputmode: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Multiplier k' }) as HTMLInputElement;
    const srcBtns: HTMLButtonElement[] = [];
    const line = h('div', { class: 'rob-comp-line' });
    if (kind === 'add') {
      const srcWrap = h('span', { class: 'rob-srcs', role: 'radiogroup', 'aria-label': 'Row to add' });
      for (let j = 0; j < R; j++) {
        if (j === target) continue;
        const b = h('button', { class: 'rob-src', type: 'button', role: 'radio', 'aria-checked': String(j === source), style: `--rc:${rowColor(this.ids[j])}` }, `R${j + 1}`) as HTMLButtonElement;
        b.addEventListener('click', (e) => { e.stopPropagation(); this.setSource(j); input.focus(); });
        srcBtns.push(b);
        srcWrap.appendChild(b);
      }
      line.append(tag(target), h('span', { class: 'rob-op' }, '→'), tag(target), h('span', { class: 'rob-op' }, '+'), input, h('span', { class: 'rob-op' }, '·'), srcWrap);
    } else {
      line.append(tag(target), h('span', { class: 'rob-op' }, '→'), input, h('span', { class: 'rob-op' }, '·'), tag(target));
    }
    const prev = h('div', { class: 'rob-grid rob-prev', 'aria-live': 'polite' });
    const msg = h('div', { class: 'rob-msg' });
    const applyBtn = h('button', { class: 'btn small primary', type: 'button' }, 'Apply', h('span', { class: 'kbd' }, 'Enter')) as HTMLButtonElement;
    const cancel = h('button', { class: 'btn small ghost', type: 'button' }, 'Cancel', h('span', { class: 'kbd' }, 'Esc')) as HTMLButtonElement;
    const btns = h('div', { class: 'rob-comp-btns' });
    let alt: HTMLElement | null = null;
    if (fromDrag && kind === 'add' && this.allowed.has('swap')) {
      const sw = h('button', { class: 'rob-link', type: 'button' }, `swap R${source + 1} and R${target + 1}`) as HTMLButtonElement;
      sw.addEventListener('click', (e) => { e.stopPropagation(); void this.userApply({ kind: 'swap', i: Math.min(source, target), j: Math.max(source, target) }); });
      alt = h('span', { class: 'rob-alt' }, 'or ', sw);
    }
    btns.append(alt ?? h('span'), h('span', { class: 'rob-flex' }), cancel, applyBtn);
    const el = h('div', { class: `rob-comp rob-comp-${kind}`, role: 'dialog', 'aria-label': kind === 'add' ? 'Add a multiple of a row' : 'Multiply a row' },
      h('div', { class: 'rob-comp-title' }, kind === 'add' ? 'Add a multiple of one row to another' : 'Multiply a row by a number'),
      line, prev, msg, btns);
    const comp: Composer = { kind, target, source, fromDrag, el, input, prev, msg, applyBtn, srcBtns };
    this.comp = comp;
    input.addEventListener('input', () => this.refreshComposer());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); void this.applyComposer(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeComposer(); }
      else if (kind === 'add' && e.altKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); const j = Number(e.key) - 1; if (j < R && j !== target) this.setSource(j); }
    });
    applyBtn.addEventListener('click', (e) => { e.stopPropagation(); void this.applyComposer(); });
    cancel.addEventListener('click', (e) => { e.stopPropagation(); this.closeComposer(); });
    this.showPop(el, target);
    el.animate?.([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: this.dur(220), easing: 'ease-out' });
    if (kind === 'add') this.setSource(source); else this.fillK();
    input.focus();
    input.select();
    sfx.open();
  }

  private setSource(j: number): void {
    const c = this.comp;
    if (!c || c.kind !== 'add') return;
    c.source = j;
    for (const b of c.srcBtns) b.setAttribute('aria-checked', String(b.textContent === `R${j + 1}`));
    this.fillK();
  }

  private fillK(): void {
    const c = this.comp;
    if (!c) return;
    let k: Frac | null;
    if (c.kind === 'add') k = suggestAddK(this.m, c.target, c.source, this.n).k;
    else k = suggestScaleK(this.m, c.target, this.n) ?? Frac.ONE;
    c.input.value = fracText(k);
    c.input.select();
    this.refreshComposer();
  }

  private composerOp(): RowOp | null {
    const c = this.comp;
    if (!c) return null;
    const k = parseFrac(c.input.value);
    if (!k) return null;
    return c.kind === 'add' ? { kind: 'add', i: c.target, j: c.source, k } : { kind: 'scale', i: c.target, k };
  }

  private refreshComposer(): void {
    const c = this.comp;
    if (!c) return;
    for (const r of this.rowEls) r.classList.remove('rob-target', 'rob-source');
    this.rowEls[this.ids[c.target]].classList.add('rob-target');
    if (c.kind === 'add') this.rowEls[this.ids[c.source]].classList.add('rob-source');
    const op = this.composerOp();
    const why = op ? opProblem(op, this.m.length) : 'Type a number such as 2, −3 or 1/2.';
    c.input.classList.toggle('bad', !op);
    c.applyBtn.disabled = !!why;
    let note = why ?? '';
    if (!why && c.kind === 'add') {
      const s = suggestAddK(this.m, c.target, c.source, this.n);
      if (s.col >= 0 && op && op.kind === 'add' && op.k.eq(s.k) && s.clears) note = `With this k, R${c.target + 1} gets 0 in the ${this.names[s.col].replace(/[{}_\\]/g, '')} column.`;
    }
    if (!why && c.kind === 'scale' && op && op.kind === 'scale') {
      const lc = leadCol(this.m[c.target], this.n);
      if (lc >= 0 && this.m[c.target][lc].mul(op.k).isOne()) note = `With this k, the pivot of R${c.target + 1} becomes 1.`;
    }
    c.msg.textContent = note;
    c.msg.classList.toggle('rob-msg-bad', !!why);
    // preview of the new row
    const color = rowColor(this.ids[c.target]);
    const row = op && !why ? applyOp(this.m, op)[c.target] : null;
    c.prev.style.setProperty('--rc', color);
    c.prev.replaceChildren(
      h('span', { class: 'rob-prev-k' }, `New R${c.target + 1}`),
      ...Array.from({ length: this.n }, (_, i) => h('span', { class: `rob-cell${row?.[i].isZero() ? ' rob-zero' : ''}`, html: row ? fracHTML(row[i]) : '·' })),
      h('span', { class: 'rob-bar' }),
      h('span', { class: 'rob-cell', html: row ? fracHTML(row[this.n]) : '·' }),
      h('span'));
  }

  private async applyComposer(): Promise<void> {
    const op = this.composerOp();
    if (!op) { sfx.miss(); this.comp?.input.focus(); return; }
    const target = this.comp?.target ?? 0;
    const ok = await this.userApply(op);
    if (ok) this.rowEls[this.ids[target]]?.focus();
  }

  private closeComposer(sound = true): void {
    if (!this.comp) return;
    const had = this.comp;
    this.comp = null;
    for (const r of this.rowEls) r.classList.remove('rob-target', 'rob-source');
    had.el.remove();
    this.hidePop();
    if (sound) sfx.back();
  }

  /** Show content in the floating box beside the matrix, its notch level with row `pos`. */
  private showPop(content: HTMLElement, pos: number): void {
    const host = this.compHost;
    host.replaceChildren(content);
    host.hidden = false;
    const row = this.rowEls[this.ids[pos]];
    const top = row.getBoundingClientRect().top - this.el.getBoundingClientRect().top + row.offsetHeight / 2;
    host.style.setProperty('--rob-pop-y', `${Math.round(top)}px`);
  }

  private hidePop(): void { this.compHost.hidden = true; this.compHost.replaceChildren(); }

  // ------------------------------------------------------------------ dragging a row onto another

  private onPointerDown(e: PointerEvent, id: number): void {
    if (!this.enabled || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input')) return;
    const row = this.rowEls[id];
    const sx = e.clientX, sy = e.clientY;
    let dragging = false;
    let over = -1;
    const pid = e.pointerId;
    try { row.setPointerCapture(pid); } catch { /* synthetic events */ }
    const clearDrop = () => { for (const r of this.rowEls) r.classList.remove('rob-drop'); };
    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        if (!this.allowed.has('add')) return;
        dragging = true;
        this.closeComposer(false);
        const r = row.getBoundingClientRect();
        const g = row.cloneNode(true) as HTMLElement;
        g.classList.add('rob-drag-ghost');
        g.removeAttribute('tabindex');
        g.setAttribute('aria-hidden', 'true');
        g.style.cssText += `;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;--rob-tpl:${this.el.style.getPropertyValue('--rob-tpl')}`;
        document.body.appendChild(g);
        this.dragGhost = g;
        row.classList.add('rob-dragging');
        this.el.classList.add('rob-is-dragging');
        this.showPop(h('div', { class: 'rob-draghint' }, `Drop R${this.ids.indexOf(id) + 1} on another row to add a multiple of it to that row.`), this.ids.indexOf(id));
        sfx.click();
      }
      this.dragGhost!.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px) rotate(-0.6deg)`;
      const t = this.rowAt(ev.clientX, ev.clientY, id);
      if (t !== over) {
        clearDrop();
        over = t;
        const s = this.ids.indexOf(id);
        if (t >= 0) {
          const tr = this.rowEls[this.ids[t]];
          const sug = suggestAddK(this.m, t, s, this.n);
          tr.classList.add('rob-drop');
          this.showPop(h('div', { class: 'rob-draghint on', html: `Release to set up ${tex(opTex({ kind: 'add', i: t, j: s, k: sug.k }))}<span class="rob-draghint-sub">You can change the number before you apply it.</span>` }), t);
          sfx.tick(t);
        } else {
          this.showPop(h('div', { class: 'rob-draghint' }, `Drop R${s + 1} on another row to add a multiple of it to that row.`), s);
        }
      }
    };
    const up = () => {
      row.removeEventListener('pointermove', move);
      row.removeEventListener('pointerup', up);
      row.removeEventListener('pointercancel', up);
      try { row.releasePointerCapture(pid); } catch { /* already released */ }
      clearDrop();
      if (!dragging) { row.focus(); return; }
      this.hidePop();
      this.dragGhost?.remove();
      this.dragGhost = null;
      row.classList.remove('rob-dragging');
      this.el.classList.remove('rob-is-dragging');
      if (over >= 0) this.openAdd(over, this.ids.indexOf(id), true);
    };
    row.addEventListener('pointermove', move);
    row.addEventListener('pointerup', up);
    row.addEventListener('pointercancel', up);
  }

  /** Row position under the pointer (not the dragged row), or -1. */
  private rowAt(x: number, y: number, exceptId: number): number {
    const box = this.rowList.getBoundingClientRect();
    if (x < box.left - 40 || x > box.right + 40) return -1;
    for (let pos = 0; pos < this.ids.length; pos++) {
      const id = this.ids[pos];
      if (id === exceptId) continue;
      const r = this.rowEls[id].getBoundingClientRect();
      if (y >= r.top - 2 && y <= r.bottom + 2) return pos;
    }
    return -1;
  }

  /** TeX of row `pos` as an equation (for captions). */
  eqTex(pos: number): string { return eqTex(this.m[pos], this.n, this.names); }
}
