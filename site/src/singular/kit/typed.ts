// Typed answers in the dock: number boxes, a stacked vector, a 2 × 2 matrix, and the dock panel that holds
// them with one feedback line. Commander-style play: the player types, presses one button, and reads the
// calculation. First used by Chapter 18; shared by every rebuilt chapter. Styles: typed.css (tj- classes).
import './typed.css';
import type { PuzzleCtx } from '../game/types';
import { h, button, inline } from '../ui/ui';
import { nice } from '../math/frac';
import type { Mat, Vec } from '../math/la';
import { parseEntry } from './entry';

// ------------------------------------------------------------------ numbers as TeX

/** A number for display: whole numbers as they are, simple fractions as a/b, a real minus sign. */
export const fmtN = (x: number): string => {
  const r = Math.round(x * 1e9) / 1e9;
  const t = Number.isInteger(r) ? String(r) : Math.abs(r * 100 - Math.round(r * 100)) < 1e-9 ? String(Math.round(r * 100) / 100) : nice(r);
  return (t === '-0' ? '0' : t).replace(/^-/, '−');
};
/** A number inside TeX (ASCII minus). */
export const tn = (x: number): string => fmtN(x).replace(/−/g, '-');
/** A matrix in TeX. */
export const texM = (M: Mat): string => `\\begin{bmatrix}${M.map((r) => r.map(tn).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
/** A vector as a stacked column in TeX. */
export const tcol = (v: readonly number[]): string => `\\begin{bmatrix}${v.map(tn).join(' \\\\ ')}\\end{bmatrix}`;

// ------------------------------------------------------------------ widgets

/** One typed number with a ± key (phone keypads often have no minus) and Enter to submit. */
export class NumCell {
  readonly el: HTMLElement;
  readonly input: HTMLInputElement;
  private readonly comma: boolean;
  constructor(o: { value?: string; aria: string; onEnter?: () => void; cls?: string; placeholder?: string; comma?: boolean; signTitle?: string }) {
    this.comma = o.comma ?? true;
    this.input = h('input', {
      class: `cell tj-cell ${o.cls ?? ''}`, type: 'text', inputmode: 'decimal', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      enterkeyhint: 'go', 'aria-label': o.aria, placeholder: o.placeholder ?? '', value: o.value ?? '',
    }) as HTMLInputElement;
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); o.onEnter?.(); }
    });
    this.input.addEventListener('input', () => this.input.classList.remove('bad'));
    this.input.addEventListener('focus', () => this.input.select());
    const pm = button('±', () => {
      const t = this.input.value.trim();
      this.input.value = t.startsWith('-') || t.startsWith('−') ? t.slice(1) : `-${t}`;
      this.input.classList.remove('bad');
    }, { cls: 'ghost small tj-pm', title: o.signTitle ?? 'Change the sign' });
    this.el = h('span', { class: 'tj-num' }, this.input, pm);
  }
  /** The typed number, or null (and marked) if it cannot be read. */
  value(): number | null {
    const x = parseEntry(this.input.value, { comma: this.comma });
    this.input.classList.toggle('bad', x === null);
    return x;
  }
  set(x: number | string): void { this.input.value = typeof x === 'number' ? fmtN(x).replace(/−/g, '-') : x; this.input.classList.remove('bad'); }
  clear(): void { this.input.value = ''; this.input.classList.remove('bad'); }
  focus(): void { this.input.focus(); }
  enable(on: boolean): void { this.input.disabled = !on; (this.el.querySelector('button') as HTMLButtonElement).disabled = !on; }
}

/** A typed vector: two boxes stacked inside brackets (or in a row with `column: false`). */
export class VecField {
  readonly el: HTMLElement;
  readonly x: NumCell;
  readonly y: NumCell;
  constructor(o: { value?: Vec | null; label?: string; onEnter?: () => void; aria?: [string, string]; signTitle?: string; column?: boolean; neutral?: boolean }) {
    // null: both boxes start empty (nothing suggests a direction)
    const v = o.value === undefined ? [1, 0] : o.value;
    const txt = (i: number) => (v ? fmtN(v[i]).replace(/−/g, '-') : '');
    const [ax, ay] = o.aria ?? ['first number of v', 'second number of v'];
    // one number per box: "1,1" in a part is a whole vector typed in one box, so it is refused, not read as 1.1
    const cls = o.neutral ? '' : 'c0';
    this.x = new NumCell({ value: txt(0), aria: ax, onEnter: o.onEnter, cls, comma: false, signTitle: o.signTitle });
    this.y = new NumCell({ value: txt(1), aria: ay, onEnter: o.onEnter, cls, comma: false, signTitle: o.signTitle });
    // label and numbers are green (the colour of v) unless `neutral`
    const label = h('span', { class: o.neutral ? 'tj-vl n' : 'tj-vl', html: inline(o.label ?? '$\\mathbf v =$') });
    this.el = o.column !== false
      ? h('span', { class: 'tj-vec' }, label, h('span', { class: 'tj-col' }, this.x.el, this.y.el))
      : h('span', { class: 'tj-vec' }, label, h('span', { class: 'tj-par' }, '('), this.x.el, h('span', { class: 'tj-par' }, ','), this.y.el, h('span', { class: 'tj-par' }, ')'));
  }
  /** Both parts, or null (cells that cannot be read are marked). */
  get(): Vec | null {
    const a = this.x.value(), b = this.y.value();
    return a === null || b === null ? null : [a, b];
  }
  set(v: Vec): void { this.x.set(v[0]); this.y.set(v[1]); }
  clear(): void { this.x.clear(); this.y.clear(); }
  enable(on: boolean): void { this.x.enable(on); this.y.enable(on); }
  focus(): void { this.x.focus(); }
}

/** A typed 2 × 2 matrix: four boxes in brackets, typed row by row; column 1 green, column 2 red. */
export class MatField {
  readonly el: HTMLElement;
  /** cells[row][col] */
  readonly cells: NumCell[][];
  constructor(o: { label?: string; onEnter?: () => void }) {
    const pos = ['top left', 'top right', 'bottom left', 'bottom right'];
    this.cells = [0, 1].map((r) => [0, 1].map((c) => new NumCell({ aria: `${pos[2 * r + c]} number of the matrix`, onEnter: o.onEnter, cls: c === 0 ? 'c1' : 'c2', comma: false })));
    const label = h('span', { class: 'tj-ml', html: inline(o.label ?? '$A =$') });
    const grid = h('span', { class: 'tj-col tj-m2' }, ...this.cells.flat().map((x) => x.el));
    this.el = h('span', { class: 'tj-vec' }, label, grid);
  }
  /** The matrix, or null (cells that cannot be read are marked). */
  get(): Mat | null {
    const v = this.cells.map((r) => r.map((x) => x.value()));
    return v.flat().some((x) => x === null) ? null : (v as number[][]);
  }
  set(M: Mat): void { this.cells.forEach((r, i) => r.forEach((x, j) => x.set(M[i][j]))); }
  clear(): void { this.cells.flat().forEach((x) => x.clear()); }
  enable(on: boolean): void { this.cells.flat().forEach((x) => x.enable(on)); }
  focus(): void { this.cells[0][0].focus(); }
}

// ------------------------------------------------------------------ the dock

/** The dock: one panel (phones get one scrolling strip above the HUD buttons). */
export interface TypedDock { root: HTMLElement; head: HTMLElement; body: HTMLElement; msg: (md: string, kind?: '' | 'good' | 'bad' | 'warn') => void; setMatrix: (M: Mat | null) => void }
export function typedDock(p: PuzzleCtx, M: Mat | null, extra?: HTMLElement, name = 'A', o: { matrixLabel?: string; matrixNote?: string; texM?: (M: Mat) => string } = {}): TypedDock {
  const dock = p.dock();
  dock.classList.add('tj-dock');
  const mat = h('span', { class: 'tj-mat' });
  const tex = o.texM ?? texM;
  const setMatrix = (A: Mat | null) => {
    mat.innerHTML = A ? inline(`${o.matrixLabel ? `${o.matrixLabel} ` : ''}$${name} = ${tex(A)}$`) : '';
    mat.hidden = !A;
  };
  setMatrix(M);
  const head = h('div', { class: 'tj-head' }, mat, extra ?? null);
  const note = o.matrixNote ? h('div', { class: 'tj-aside', html: inline(o.matrixNote) }) : null;
  const body = h('div', { class: 'tj-body' });
  const m = h('div', { class: 'tj-msg', 'aria-live': 'polite' });
  const root = h('div', { class: 'tj' }, head, note, body, m);
  dock.replaceChildren(root);
  const msg = (md: string, kind: '' | 'good' | 'bad' | 'warn' = '') => {
    m.className = `tj-msg ${kind}`;
    m.innerHTML = md ? inline(md) : '';
    // on phones the dock scrolls: keep the newest feedback in view
    if (md) requestAnimationFrame(() => m.scrollIntoView({ block: 'nearest' }));
  };
  return { root, head, body, msg, setMatrix };
}

/** Hide the runner's hint box (the stage it answered is over). */
export function hideHint(p: PuzzleCtx): void {
  const b = p.g.ui.scene.querySelector<HTMLElement>('.hint-box');
  if (b) b.hidden = true;
}
