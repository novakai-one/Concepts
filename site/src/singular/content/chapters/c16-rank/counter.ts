// The survivor counter (GDD §6.7 Ch 16): one slot per column of a matrix. Kept directions (pivot
// columns) glow yellow, flattened ones (free columns) violet, and the sum reads kept + flattened =
// columns. Slots can be clickable (the player tags them) and a cap marks the most a matrix with m rows
// can keep.
import { h, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import type { Tag } from './logic';
import '../c15-nullspace/act5.css';

export interface CounterOpts {
  n: number;
  /** Rows of the matrix: at most this many slots can be kept. */
  rows?: number;
  title?: string;
  clickable?: boolean;
  /** Column labels (default a₁ … aₙ). */
  labels?: string[];
  onChange?: (tags: (Tag | null)[]) => void;
}

export class Counter {
  readonly el: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly sum: HTMLElement;
  private readonly note: HTMLElement;
  private slots: HTMLElement[] = [];
  private t: (Tag | null)[];
  private o: CounterOpts;

  constructor(o: CounterOpts) {
    this.o = o;
    this.t = new Array(o.n).fill(null);
    this.bar = h('div', { class: 'bar' });
    this.sum = h('div', { class: 'sum' });
    this.note = h('div', { class: 'act5-msg' });
    this.el = h('div', { class: 'act5-counter' }, o.title ? h('div', { class: 'kicker' }, o.title) : null, this.bar, this.sum, this.note);
    this.build();
    this.paint();
  }

  private build(): void {
    this.slots = Array.from({ length: this.o.n }, (_, j) => {
      const s = h('div', { class: `slot${this.o.clickable ? ' click' : ''}`, title: 'kept or flattened', role: this.o.clickable ? 'button' : null, tabindex: this.o.clickable ? '0' : null });
      if (this.o.clickable) {
        const flip = () => { this.t[j] = this.t[j] === null ? 'kept' : this.t[j] === 'kept' ? 'flat' : null; sfx.click(); this.paint(); this.o.onChange?.(this.tags()); };
        s.addEventListener('click', flip);
        s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flip(); } });
      }
      return s;
    });
    this.bar.replaceChildren(...this.slots);
  }

  /** Change the number of columns (and rows). Clears the tags. */
  reshape(n: number, rows?: number): void {
    this.o = { ...this.o, n, rows };
    this.t = new Array(n).fill(null);
    this.build();
    this.paint();
  }

  set(tags: (Tag | null)[]): void { this.t = tags.slice(0, this.o.n); while (this.t.length < this.o.n) this.t.push(null); this.paint(); }
  tags(): (Tag | null)[] { return this.t.slice(); }
  get kept(): number { return this.t.filter((x) => x === 'kept').length; }
  get flat(): number { return this.t.filter((x) => x === 'flat').length; }
  setNote(md: string | null): void { this.note.innerHTML = md ? inline(md) : ''; }

  private paint(): void {
    const labels = this.o.labels ?? Array.from({ length: this.o.n }, (_, j) => `a${'₁₂₃₄₅₆₇₈₉'[j] ?? j + 1}`);
    let keptSoFar = 0;
    this.slots.forEach((s, j) => {
      const t = this.t[j];
      if (t === 'kept') keptSoFar++;
      const over = t === 'kept' && this.o.rows !== undefined && keptSoFar > this.o.rows;
      s.className = `slot${this.o.clickable ? ' click' : ''}${t === 'kept' ? ' kept' : t === 'flat' ? ' flat' : ''}${over ? ' over' : ''}`;
      s.textContent = `${labels[j]} ${t === 'kept' ? 'kept' : t === 'flat' ? 'flat' : '·'}`;
    });
    const k = this.kept, f = this.flat, n = this.o.n;
    const cap = this.o.rows !== undefined ? ` · at most ${this.o.rows} kept (${this.o.rows} rows)` : '';
    this.sum.innerHTML = `<span class="k">${k} kept</span> + <span class="f">${f} flattened</span> = ${k + f} of ${n} columns${cap}`;
  }
}
