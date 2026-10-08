// Input widgets: matrix and vector entry (accepts 3, -2, 1.5, 3/4), sliders, choice cards, readouts.
import { h, inline, md } from './ui';
import { tex } from '../../lib/md';
import { nice } from '../math/frac';
import { sfx } from '../audio/sfx';

/** Parse "3", "-1.5", "3/4", "-2/3". Returns null if it is not a number. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/−/g, '-').replace(/\s+/g, '');
  if (!t) return null;
  const m = t.match(/^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/);
  if (m) { const d = parseFloat(m[2]); return d === 0 ? null : parseFloat(m[1]) / d; }
  if (!/^-?\d*\.?\d+$/.test(t)) return null;
  return parseFloat(t);
}

export interface MatrixInputOpts {
  rows: number;
  cols: number;
  values?: number[][];
  /** Colour each column (green, red, blue) like the arrows they describe. */
  colourCols?: boolean;
  locked?: boolean[][];
  step?: number;
  /** Decimal places shown for values that are not whole numbers or simple fractions (default 2). */
  digits?: number;
  label?: string;           // TeX shown before the bracket, e.g. "A ="
  onChange?: (m: number[][]) => void;
  /** Called when Enter is pressed in a cell. */
  onSubmit?: (m: number[][]) => void;
}

export class MatrixInput {
  readonly el: HTMLElement;
  private readonly cells: HTMLInputElement[][] = [];
  private values: number[][];
  private readonly o: MatrixInputOpts;

  constructor(o: MatrixInputOpts) {
    this.o = o;
    this.values = o.values?.map((r) => r.slice()) ?? Array.from({ length: o.rows }, () => new Array(o.cols).fill(0));
    const grid = h('div', { class: 'matrix-input', style: `grid-template-columns: repeat(${o.cols}, auto)` });
    for (let i = 0; i < o.rows; i++) {
      this.cells.push([]);
      for (let j = 0; j < o.cols; j++) {
        const locked = o.locked?.[i]?.[j] ?? false;
        const inp = h('input', {
          class: `cell ${o.colourCols ? `c${j}` : ''} ${locked ? 'locked' : ''}`, type: 'text', inputmode: 'decimal',
          'aria-label': `row ${i + 1}, column ${j + 1}`, value: this.fmt(this.values[i][j]), readonly: locked || null, spellcheck: 'false',
        }) as HTMLInputElement;
        inp.addEventListener('input', () => this.read(i, j));
        inp.addEventListener('focus', () => inp.select());
        inp.addEventListener('keydown', (e) => {
          if (locked) return;
          const step = o.step ?? 1;
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const v = (parseNum(inp.value) ?? 0) + (e.key === 'ArrowUp' ? step : -step);
            inp.value = this.fmt(Math.round(v / step) * step);
            this.read(i, j);
            sfx.tick(v);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            o.onSubmit?.(this.get());
          }
        });
        this.cells[i].push(inp);
        grid.appendChild(inp);
      }
    }
    this.el = h('div', { class: 'matrix-wrap', style: 'display:flex;align-items:center;gap:10px' },
      o.label ? h('span', { class: 'mlabel', html: tex(o.label) }) : null, grid);
  }

  private read(i: number, j: number): void {
    const inp = this.cells[i][j];
    const v = parseNum(inp.value);
    inp.classList.toggle('bad', v === null && inp.value.trim() !== '' && inp.value.trim() !== '-');
    if (v === null) return;
    this.values[i][j] = v;
    this.o.onChange?.(this.get());
  }

  get(): number[][] { return this.values.map((r) => r.slice()); }

  /** A value as shown in a cell: whole numbers and simple fractions exactly, others to `digits` places. */
  private fmt(x: number): string {
    const t = nice(x), d = this.o.digits;
    return d === undefined || !t.includes('.') ? t : String(+x.toFixed(d));
  }

  set(m: number[][], notify = false): void {
    this.values = m.map((r) => r.slice());
    m.forEach((r, i) => r.forEach((x, j) => { this.cells[i][j].value = this.fmt(x); this.cells[i][j].classList.remove('bad'); }));
    if (notify) this.o.onChange?.(this.get());
  }

  setLocked(i: number, j: number, locked: boolean): void {
    const c = this.cells[i][j];
    c.readOnly = locked;
    c.classList.toggle('locked', locked);
  }

  focus(): void { this.cells[0]?.[0]?.focus(); }
}

/** A column vector input (a 1-column MatrixInput). */
export class VectorInput {
  readonly m: MatrixInput;
  constructor(o: { dim: number; values?: number[]; label?: string; step?: number; onChange?: (v: number[]) => void; onSubmit?: (v: number[]) => void }) {
    this.m = new MatrixInput({
      rows: o.dim, cols: 1, values: (o.values ?? new Array(o.dim).fill(0)).map((x) => [x]), label: o.label, step: o.step,
      onChange: (m) => o.onChange?.(m.map((r) => r[0])), onSubmit: (m) => o.onSubmit?.(m.map((r) => r[0])),
    });
  }
  get el(): HTMLElement { return this.m.el; }
  get(): number[] { return this.m.get().map((r) => r[0]); }
  set(v: number[], notify = false): void { this.m.set(v.map((x) => [x]), notify); }
}

export class Slider {
  readonly el: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly val: HTMLElement;
  private readonly fmt: (v: number) => string;
  constructor(o: { label: string; min: number; max: number; step?: number; value?: number; onInput?: (v: number) => void; format?: (v: number) => string }) {
    this.input = h('input', { type: 'range', min: o.min, max: o.max, step: o.step ?? 0.01, value: o.value ?? o.min, 'aria-label': o.label }) as HTMLInputElement;
    this.val = h('span', { class: 'val' });
    const fmt = this.fmt = o.format ?? ((v: number) => nice(v));
    const upd = () => { const v = parseFloat(this.input.value); this.val.textContent = fmt(v); o.onInput?.(v); };
    this.input.addEventListener('input', upd);
    this.el = h('label', { class: 'slider-row' }, h('span', { html: inline(o.label) }), this.input, this.val);
    this.val.textContent = fmt(o.value ?? o.min);
  }
  get(): number { return parseFloat(this.input.value); }
  set(v: number, notify = true): void { this.input.value = String(v); if (notify) this.input.dispatchEvent(new Event('input')); else this.val.textContent = this.fmt(v); }
}

export interface ChoiceOpt { id: string; text: string }
export class ChoiceCards {
  readonly el: HTMLElement;
  private readonly btns = new Map<string, HTMLButtonElement>();
  constructor(opts: ChoiceOpt[], onPick: (id: string) => void) {
    this.el = h('div', { class: 'choice-cards' });
    for (const c of opts) {
      const b = h('button', { class: 'choice-card', type: 'button', 'aria-pressed': 'false', html: md(c.text) }) as HTMLButtonElement;
      b.addEventListener('click', () => {
        this.btns.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        sfx.click();
        onPick(c.id);
      });
      this.btns.set(c.id, b);
      this.el.appendChild(b);
    }
  }
  mark(id: string, kind: 'right' | 'wrong' | null): void {
    const b = this.btns.get(id);
    if (!b) return;
    b.classList.remove('right', 'wrong');
    if (kind) b.classList.add(kind);
  }
  disable(on = true): void { this.btns.forEach((b) => { b.disabled = on; }); }
}

/** A glass card of live numbers next to the picture. */
export class Readout {
  readonly el: HTMLElement;
  private readonly rowsEl: HTMLElement;
  private readonly rows = new Map<string, { k: HTMLElement; v: HTMLElement; row: HTMLElement }>();
  private readonly eqEl: HTMLElement;
  private readonly noteEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  constructor(title?: string) {
    this.rowsEl = h('div', { class: 'rows', style: 'display:flex;flex-direction:column;gap:6px' });
    this.eqEl = h('div', { class: 'eq' });
    this.noteEl = h('div', { class: 'note' });
    this.titleEl = h('div', { class: 'kicker', html: inline(title ?? '') });
    this.titleEl.hidden = !title;
    this.el = h('div', { class: 'readout glass' }, this.titleEl, this.rowsEl, this.eqEl, this.noteEl);
    this.eqEl.hidden = true;
    this.noteEl.hidden = true;
  }
  /** Set a row; value may contain $tex$. */
  row(key: string, label: string, value: string, color?: string): void {
    let r = this.rows.get(key);
    if (!r) {
      const k = h('span', { class: 'k' }), v = h('span', { class: 'v' });
      const row = h('div', { class: 'row' }, k, v);
      this.rowsEl.appendChild(row);
      r = { k, v, row };
      this.rows.set(key, r);
    }
    r.k.innerHTML = inline(label);
    r.v.innerHTML = inline(value);
    r.v.style.color = color ?? '';
  }
  /** Change the title (may contain $tex$); empty hides it. */
  setTitle(title: string): void { this.titleEl.hidden = !title; this.titleEl.innerHTML = inline(title); }
  hideRow(key: string, hidden = true): void { const r = this.rows.get(key); if (r) r.row.hidden = hidden; }
  eq(texSrc: string | null): void { this.eqEl.hidden = !texSrc; if (texSrc) this.eqEl.innerHTML = tex(texSrc, true); }
  note(mdSrc: string | null): void { this.noteEl.hidden = !mdSrc; if (mdSrc) this.noteEl.innerHTML = md(mdSrc); }
}
