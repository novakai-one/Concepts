// [A | I]: an augmented matrix with a block on each side of the bar, row-reduced by the player. The
// kit's RowOpsBoard takes one right-hand column; this board takes a whole right block, so the same row
// operations visibly happen to both halves. It uses the kit's look (kit-rowops.css) and exact fractions.
// Click a row to add a multiple of another row to it (or drag one row onto another); × multiplies a row;
// ⇅ swaps two rows. On cadet the multiplier is filled in; on navigator and commander it is typed.
import '../../../styles/kit-rowops.css';
import type { PuzzleCtx } from '../../../game/types';
import { Frac, fclone, fmat, type FMat } from '../../../math/frac';
import { applyOp, opTex, leadCol, type RowOp } from '../../../math/rref';
import { tex } from '../../../../lib/md';
import { h } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { ROW_COLORS } from '../../../kit/rowops';
import { fracHTML, fracText, opProblem, parseFrac, suggestAddK, suggestScaleK } from '../../../kit/rowops-logic';

export interface AugBoardOpts {
  /** The left block (n × n) and the right block (n × m). */
  left: (number | Frac)[][];
  right: (number | Frac)[][];
  /** Fill in the multiplier (cadet). */
  prefill: boolean;
  title?: string;
  /** Called after every change with the matrix, the operation (null on undo) and its elementary matrix context. */
  onChange?: (m: FMat, op: RowOp | null) => void;
  mount?: HTMLElement;
  /** Names over the right block (default blank). */
  rightHead?: string;
  leftHead?: string;
}

const MINUS = '−';

export class AugBoard {
  readonly el: HTMLElement;
  readonly n: number;
  m: number;
  private a: FMat;
  private ids: number[];
  private hist: { op: RowOp; before: FMat; ids: number[] }[] = [];
  private readonly rowEls: HTMLElement[] = [];
  private readonly cellEls: HTMLElement[][] = [];
  private colHead!: HTMLElement;
  private readonly labelEls: HTMLElement[] = [];
  private readonly list: HTMLElement;
  private readonly histEl: HTMLElement;
  private readonly comp: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly chipI: HTMLElement;
  private readonly o: AugBoardOpts;
  private readonly p: PuzzleCtx;
  private enabled = true;
  private busy: Promise<void> = Promise.resolve();
  private drag: { id: number; x: number; y: number; ghost: HTMLElement | null } | null = null;

  constructor(p: PuzzleCtx, o: AugBoardOpts) {
    this.p = p;
    this.o = o;
    this.n = o.left.length;
    this.m = o.right[0].length;
    this.a = fmat(o.left.map((r, i) => [...r, ...o.right[i]]));
    this.ids = this.a.map((_, i) => i);
    const n = this.n, m = this.m;
    const tpl = `var(--rob-grip) repeat(${n}, var(--rob-cw)) var(--rob-barw) repeat(${m}, var(--rob-cw)) var(--rob-act)`;
    this.el = h('div', { class: 'rob', style: `--rob-tpl:${tpl};--rob-cw:${n + m > 4 ? 50 : 58}px;--rob-rh:44px` });
    this.chipI = h('span', { class: 'rob-chip' }, h('span', { class: 'rob-chip-dot' }), 'Left half is the identity');
    const head = h('div', { class: 'rob-head' }, h('span', { class: 'kicker' }, o.title ?? 'Augmented matrix [A | I]'), h('div', { class: 'rob-chips' }, this.chipI));
    const colHead = h('div', { class: 'rob-grid rob-colhead', 'aria-hidden': 'true' });
    this.colHead = colHead;
    this.paintHead(o.rightHead ?? 'I');
    this.list = h('div', { class: 'rob-rowlist', role: 'list' });
    const swaps = h('div', { class: 'rob-swaps' });
    for (let k = 0; k + 1 < n; k++) {
      const b = h('button', { class: 'rob-swap', type: 'button', style: `top: calc(${k + 1} * var(--rob-rh))`, title: `Swap rows ${k + 1} and ${k + 2}`, 'aria-label': `Swap rows ${k + 1} and ${k + 2}` }, '⇅') as HTMLButtonElement;
      b.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) void this.apply({ kind: 'swap', i: k, j: k + 1 }); });
      swaps.appendChild(b);
    }
    for (let id = 0; id < n; id++) this.buildRow(id);
    const rows = h('div', { class: 'rob-rows' }, h('div', { class: 'rob-brk rob-brk-l' }), h('div', { class: 'rob-brk rob-brk-r' }), swaps, this.list);
    this.comp = h('div', { class: 'rob-comp', style: 'min-width:0' });
    this.comp.hidden = true;
    this.histEl = h('ol', { class: 'rob-hist' });
    this.undoBtn = h('button', { class: 'btn small ghost rob-undo', type: 'button' }, 'Undo') as HTMLButtonElement;
    this.undoBtn.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) void this.undo(); });
    const foot = h('div', { class: 'rob-foot' }, h('div', { class: 'rob-hist-wrap' }, h('div', { class: 'rob-hist-head' }, h('span', { class: 'kicker' }, 'Row operations')), this.histEl), this.undoBtn);
    const help = h('div', { class: 'rob-help' }, 'Click a row to add a multiple of another row to it, or drag one row onto another. × multiplies a row. ⇅ swaps.');
    this.el.append(head, h('div', { class: 'rob-mat' }, colHead, rows), this.comp, foot, help);
    (o.mount ?? p.dock()).appendChild(this.el);
    this.el.closest('.dock')?.classList.add('rob-dock');
    const onMove = (e: PointerEvent) => this.dragMove(e);
    const onUp = (e: PointerEvent) => this.dragEnd(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    p.onDispose(() => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); this.drag?.ghost?.remove(); this.el.remove(); });
    this.paint();
  }

  // ------------------------------------------------------------------ public

  get(): FMat { return fclone(this.a); }
  history(): RowOp[] { return this.hist.map((x) => x.op); }
  leftIsI(): boolean { return this.a.every((r, i) => r.slice(0, this.n).every((x, j) => (i === j ? x.isOne() : x.isZero()))); }
  /** A row whose left half is all zeros (a pivot is missing). */
  zeroLeftRow(): number { return this.a.findIndex((r) => r.slice(0, this.n).every((x) => x.isZero())); }

  setEnabled(on: boolean): void { this.enabled = on; this.el.classList.toggle('rob-locked', !on); if (!on) this.closeComp(); }

  /** Apply an operation (animated, counted as a move). Operations queue. */
  apply(op: RowOp, ms = 520): Promise<void> {
    const run = this.busy.then(async () => {
      const why = opProblem(op, this.n);
      if (why) { sfx.miss(); return; }
      this.closeComp();
      this.hist.push({ op, before: this.a, ids: this.ids.slice() });
      this.a = applyOp(this.a, op);
      if (op.kind === 'swap') [this.ids[op.i], this.ids[op.j]] = [this.ids[op.j], this.ids[op.i]];
      this.p.move();
      if (op.kind === 'swap') sfx.whoosh(0.35); else sfx.snap();
      this.flash(op);
      this.paint();
      try { this.o.onChange?.(this.get(), op); } catch (e) { console.error(e); }
      if (ms > 0) await wait(ms);
    });
    this.busy = run.catch(() => {});
    return run;
  }

  async undo(): Promise<void> {
    const e = this.hist.pop();
    if (!e) { sfx.miss(); return; }
    this.a = e.before;
    this.ids = e.ids;
    sfx.back();
    this.paint();
    try { this.o.onChange?.(this.get(), null); } catch (er) { console.error(er); }
  }

  /** Play operations (Show me). */
  async play(ops: RowOp[], ms = 650): Promise<void> {
    const was = this.enabled;
    this.setEnabled(false);
    try { for (const op of ops) await this.apply(op, ms); } finally { this.setEnabled(was); }
  }

  /** Replace both blocks (keeps no history). */
  set(left: (number | Frac)[][], right: (number | Frac)[][], rightHead?: string): void {
    this.a = fmat(left.map((r, i) => [...r, ...right[i]]));
    this.ids = this.a.map((_, i) => i);
    this.hist = [];
    if (right[0].length !== this.m || rightHead) {
      this.m = right[0].length;
      const tpl = `var(--rob-grip) repeat(${this.n}, var(--rob-cw)) var(--rob-barw) repeat(${this.m}, var(--rob-cw)) var(--rob-act)`;
      this.el.style.setProperty('--rob-tpl', tpl);
      this.paintHead(rightHead ?? this.o.rightHead ?? 'I');
      this.list.replaceChildren();
      for (let id = 0; id < this.n; id++) this.buildRow(id);
    }
    this.paint();
  }

  private paintHead(rightHead: string): void {
    this.colHead.replaceChildren(
      h('span'), h('span', { class: 'rob-cn', style: `grid-column: span ${this.n}`, html: tex(this.o.leftHead ?? 'A') }), h('span'),
      h('span', { class: 'rob-cn', style: `grid-column: span ${this.m}`, html: tex(rightHead) }), h('span'));
  }

  // ------------------------------------------------------------------ rows

  private buildRow(id: number): void {
    const label = h('span', { class: 'rob-rl' }, `R${id + 1}`);
    const grip = h('span', { class: 'rob-grip', title: 'Drag onto another row to add a multiple of this row' }, h('span', { class: 'rob-dots', 'aria-hidden': 'true' }), label);
    const cells: HTMLElement[] = [];
    for (let c = 0; c < this.n + this.m; c++) cells.push(h('span', { class: `rob-cell${c >= this.n ? ' rob-rhs' : ''}` }));
    const scale = h('button', { class: 'rob-act rob-scale', type: 'button', title: 'Multiply this row by a number', 'aria-label': 'Multiply this row by a number' }, '×') as HTMLButtonElement;
    scale.addEventListener('click', (e) => { e.stopPropagation(); if (this.enabled) this.openComp('scale', this.ids.indexOf(id)); });
    const row = h('div', { class: 'rob-row rob-grid', role: 'listitem', tabindex: '0', style: `--rc:${ROW_COLORS[id % ROW_COLORS.length]}` },
      grip, ...cells.slice(0, this.n), h('span', { class: 'rob-bar', 'aria-hidden': 'true' }), ...cells.slice(this.n), scale);
    row.addEventListener('pointerdown', (e) => {
      if (!this.enabled || (e.target as HTMLElement).closest('button')) return;
      this.drag = { id, x: e.clientX, y: e.clientY, ghost: null };
    });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' && this.enabled) { e.preventDefault(); this.openComp('add', this.ids.indexOf(id)); } });
    this.rowEls[id] = row;
    this.cellEls[id] = cells;
    this.labelEls[id] = label;
    this.list.appendChild(row);
  }

  private paint(): void {
    for (const id of this.ids) this.list.appendChild(this.rowEls[id]);
    this.ids.forEach((id, pos) => {
      this.labelEls[id].textContent = `R${pos + 1}`;
      const lc = leadCol(this.a[pos], this.n);
      this.a[pos].forEach((x, c) => {
        const cell = this.cellEls[id][c];
        cell.innerHTML = `<span class="rob-v">${fracHTML(x)}</span>`;
        cell.classList.toggle('rob-zero', x.isZero());
        cell.classList.toggle('rob-pivot', c === lc && c < this.n && x.isOne());
      });
    });
    const done = this.leftIsI();
    this.el.classList.toggle('rob-is-rref', done);
    this.chipI.classList.toggle('on', done);
    const ops = this.history();
    this.histEl.replaceChildren(...(ops.length ? ops.map((op, i) => h('li', { class: `rob-step${i === ops.length - 1 ? ' rob-step-new' : ''}`, html: `<span class="rob-step-n">${i + 1}</span>${tex(opTex(op))}` })) : [h('li', { class: 'rob-hist-empty' }, 'None yet')]));
    this.histEl.scrollTop = this.histEl.scrollHeight;
    this.undoBtn.disabled = !ops.length;
  }

  private flash(op: RowOp): void {
    const pos = op.i;
    const row = this.rowEls[this.ids[pos]];
    row.animate?.([
      { background: 'color-mix(in srgb, var(--rc) 34%, transparent)' },
      { background: 'color-mix(in srgb, var(--rc) 6%, transparent)' },
    ], { duration: 520, easing: 'ease-out' });
  }

  // ------------------------------------------------------------------ the composer

  private openComp(kind: 'add' | 'scale', target: number, source = -1): void {
    this.closeComp();
    const n = this.n;
    const tag = (pos: number) => h('span', { class: 'rob-tag', style: `--rc:${ROW_COLORS[this.ids[pos] % ROW_COLORS.length]}` }, `R${pos + 1}`);
    const input = h('input', { class: 'rob-k', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Multiplier' }) as HTMLInputElement;
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      if (e.key === 'Escape') { e.preventDefault(); this.closeComp(); }
    });
    let src = source >= 0 && source !== target ? source : (target === 0 ? 1 : 0);
    if (kind === 'add' && source < 0) {
      // the row whose pivot sits under the target's first non-zero entry, if there is one
      const c = leadCol(this.a[target], n);
      for (let j = 0; j < this.a.length; j++) if (j !== target && c >= 0 && leadCol(this.a[j], n) === c) { src = j; break; }
    }
    const msg = h('div', { class: 'rob-msg' });
    const fill = () => {
      if (!this.o.prefill) { input.value = ''; return; }
      const k = kind === 'add' ? suggestAddK(this.a, target, src, n).k : (suggestScaleK(this.a, target, n) ?? Frac.ONE);
      input.value = fracText(k);
    };
    const line = h('div', { class: 'rob-comp-line' });
    const srcBtns: HTMLButtonElement[] = [];
    if (kind === 'add') {
      const wrap = h('span', { class: 'rob-srcs' });
      for (let j = 0; j < this.a.length; j++) {
        if (j === target) continue;
        const b = h('button', { class: 'rob-src', type: 'button', 'aria-checked': String(j === src), style: `--rc:${ROW_COLORS[this.ids[j] % ROW_COLORS.length]}` }, `R${j + 1}`) as HTMLButtonElement;
        b.addEventListener('click', (e) => { e.stopPropagation(); src = j; srcBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b))); fill(); input.focus(); });
        srcBtns.push(b);
        wrap.appendChild(b);
      }
      line.append(tag(target), h('span', { class: 'rob-op' }, '→'), tag(target), h('span', { class: 'rob-op' }, '+'), input, h('span', { class: 'rob-op' }, '·'), wrap);
    } else {
      line.append(tag(target), h('span', { class: 'rob-op' }, '→'), input, h('span', { class: 'rob-op' }, '·'), tag(target));
    }
    const go = () => {
      const k = parseFrac(input.value);
      if (!k) { input.classList.add('bad'); msg.textContent = 'Type a number such as 2, −1 or 1/2.'; sfx.miss(); return; }
      const op: RowOp = kind === 'add' ? { kind: 'add', i: target, j: src, k } : { kind: 'scale', i: target, k };
      const why = opProblem(op, this.n);
      if (why) { input.classList.add('bad'); msg.textContent = why; sfx.miss(); return; }
      void this.apply(op);
    };
    const apply = h('button', { class: 'btn small primary', type: 'button' }, 'Apply') as HTMLButtonElement;
    apply.addEventListener('click', (e) => { e.stopPropagation(); go(); });
    const cancel = h('button', { class: 'btn small ghost', type: 'button' }, 'Cancel') as HTMLButtonElement;
    cancel.addEventListener('click', (e) => { e.stopPropagation(); this.closeComp(); });
    this.comp.replaceChildren(
      h('div', { class: 'rob-comp-title' }, kind === 'add' ? 'Add a multiple of another row' : 'Multiply a row by a number'),
      line, msg, h('div', { class: 'rob-comp-btns' }, h('span', { class: 'rob-flex' }), cancel, apply));
    this.comp.hidden = false;
    this.rowEls[this.ids[target]].classList.add('rob-target');
    fill();
    if (!this.o.prefill) msg.textContent = kind === 'add' ? 'Type the multiplier: which multiple of the other row clears the entry you want to clear?' : 'Type the number that makes the pivot 1.';
    input.focus();
    input.select();
    sfx.open();
  }

  private closeComp(): void {
    this.comp.hidden = true;
    this.comp.replaceChildren();
    this.rowEls.forEach((r) => r.classList.remove('rob-target', 'rob-source', 'rob-drop'));
  }

  // ------------------------------------------------------------------ drag a row onto a row

  private rowAt(x: number, y: number, except: number): number {
    for (let pos = 0; pos < this.ids.length; pos++) {
      const id = this.ids[pos];
      if (id === except) continue;
      const r = this.rowEls[id].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return pos;
    }
    return -1;
  }

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (!d.ghost && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    if (!d.ghost) {
      const src = this.rowEls[d.id];
      d.ghost = src.cloneNode(true) as HTMLElement;
      d.ghost.classList.add('rob-drag-ghost');
      const r = src.getBoundingClientRect();
      Object.assign(d.ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px`, position: 'fixed' });
      d.ghost.style.setProperty('--rob-tpl', getComputedStyle(this.el).getPropertyValue('--rob-tpl'));
      document.body.appendChild(d.ghost);
      src.classList.add('rob-dragging');
    }
    d.ghost.style.transform = `translate(${e.clientX - d.x}px, ${e.clientY - d.y}px)`;
    const over = this.rowAt(e.clientX, e.clientY, d.id);
    this.rowEls.forEach((el, id) => el.classList.toggle('rob-drop', over >= 0 && this.ids[over] === id));
  }

  private dragEnd(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    this.rowEls[d.id].classList.remove('rob-dragging');
    this.rowEls.forEach((el) => el.classList.remove('rob-drop'));
    if (!d.ghost) {
      // a click: add to this row
      if (this.enabled) this.openComp('add', this.ids.indexOf(d.id));
      return;
    }
    d.ghost.remove();
    const over = this.rowAt(e.clientX, e.clientY, d.id);
    if (over >= 0 && this.enabled) this.openComp('add', over, this.ids.indexOf(d.id));
  }
}

/** "R₃ → R₃ − R₁" as plain text with a true minus sign. */
export const opText = (op: RowOp): string => {
  const R = (i: number) => `R${i + 1}`;
  if (op.kind === 'swap') return `${R(op.i)} ↔ ${R(op.j)}`;
  if (op.kind === 'scale') return `${R(op.i)} → ${fracText(op.k)}·${R(op.i)}`;
  const neg = op.k.sign() < 0;
  const mag = neg ? op.k.neg() : op.k;
  return `${R(op.i)} → ${R(op.i)} ${neg ? MINUS : '+'} ${mag.isOne() ? '' : `${fracText(mag)}·`}${R(op.j)}`;
};
