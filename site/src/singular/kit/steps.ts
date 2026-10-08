// By-hand worksheets ([H] puzzles, GDD §7.1) and step tiles ([D] derivations, Procedures).
//
// StepWorksheet: a list of steps, each with a prompt and an exact answer (a number, a vector or a
// matrix). Cadet: LANTERN computes each step when the player asks (they choose the order of work).
// Navigator: the player types each step; each is checked as it is entered. Commander: the player
// types every step; only the final step is checked.
//
// TileOrder: the player arranges tiles into an order (drag or click to move); decoys can be mixed in.
import { h, inline, md } from '../ui/ui';
import { tex } from '../../lib/md';
import { parseNum } from '../ui/widgets';
import type { PuzzleCtx } from '../game/types';
import type { Tile } from '../game/types';
import { nice } from '../math/frac';
import { sfx } from '../audio/sfx';

export type Answer = number | number[] | number[][];

export interface Step {
  /** Markdown/maths prompt, e.g. "Across: $4 + (-1)$". */
  prompt: string;
  answer: Answer;
  /** Optional unit or label after the inputs. */
  suffix?: string;
  /** Tolerance (default 1e-6: exact; use e.g. 0.01 for rounded decimals). */
  tol?: number;
  /** A literal message for a common wrong value: [value, message]. */
  mistakes?: [Answer, string][];
}

export interface WorksheetOpts {
  title?: string;
  steps: Step[];
  /** Called once every step is right (or after the final step on commander). */
  onDone: () => void;
  /** Where to mount (default: the dock). */
  mount?: HTMLElement;
}

const shapeOf = (a: Answer): [number, number] => (typeof a === 'number' ? [1, 1] : Array.isArray(a[0]) ? [a.length, (a[0] as number[]).length] : [a.length, 1]);
const flat = (a: Answer): number[] => (typeof a === 'number' ? [a] : Array.isArray(a[0]) ? (a as number[][]).flat() : (a as number[]));
const same = (a: number[], b: number[], tol: number) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol);

export class StepWorksheet {
  readonly el: HTMLElement;
  private readonly rows: { inputs: HTMLInputElement[]; status: HTMLElement; row: HTMLElement; done: boolean; last?: string }[] = [];
  private finished = false;
  private readonly mode: 'cadet' | 'navigator' | 'commander';

  constructor(private readonly p: PuzzleCtx, private readonly o: WorksheetOpts) {
    this.mode = p.difficulty;
    const body = h('div', { class: 'ws-steps' });
    this.el = h('div', { class: 'worksheet' },
      h('div', { class: 'kicker' }, o.title ?? (this.mode === 'cadet' ? 'By hand · LANTERN computes, you choose' : this.mode === 'navigator' ? 'By hand · each step is checked' : 'By hand · only the answer is checked')),
      body);
    o.steps.forEach((s, i) => {
      const [r, c] = shapeOf(s.answer);
      const grid = h('div', { class: 'ws-grid', style: `grid-template-columns: repeat(${c}, auto)` });
      const inputs: HTMLInputElement[] = [];
      for (let k = 0; k < r * c; k++) {
        const inp = h('input', { class: 'cell ws-cell', inputmode: 'decimal', 'aria-label': `step ${i + 1} value ${k + 1}`, spellcheck: 'false' }) as HTMLInputElement;
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); this.check(i, true); }
        });
        inp.addEventListener('change', () => this.check(i, false));
        inputs.push(inp);
        grid.appendChild(inp);
      }
      const bracket = r * c > 1 ? h('div', { class: `ws-bracket ${c > 1 ? 'mat' : 'vec'}` }, grid) : grid;
      const status = h('span', { class: 'ws-status' });
      const compute = this.mode === 'cadet'
        ? h('button', { class: 'btn small ghost', type: 'button', onclick: () => this.fill(i, true) }, 'Compute')
        : null;
      const row = h('div', { class: 'ws-row' },
        h('div', { class: 'ws-prompt', html: inline(s.prompt) }),
        h('div', { class: 'ws-in' }, bracket, s.suffix ? h('span', { class: 'c-muted' }, s.suffix) : null, compute, status));
      body.appendChild(row);
      this.rows.push({ inputs, status, row, done: false });
    });
    (o.mount ?? p.dock()).appendChild(this.el);
  }

  private read(i: number): number[] | null {
    const vals = this.rows[i].inputs.map((x) => parseNum(x.value));
    return vals.some((v) => v === null) ? null : (vals as number[]);
  }

  private check(i: number, fromEnter: boolean): void {
    if (this.finished) return;
    const s = this.o.steps[i];
    const row = this.rows[i];
    const got = this.read(i);
    if (!got) return;
    // Enter then blur fires two checks of the same value: count (and judge) it once
    const key = got.join(',');
    if (row.last === key) return;
    row.last = key;
    const want = flat(s.answer);
    const ok = same(got, want, s.tol ?? 1e-6);
    const last = i === this.o.steps.length - 1;
    if (this.mode === 'commander' && !last) {
      // commander: intermediate steps are the player's own working, not checked
      row.done = true;
      if (fromEnter) this.rows[i + 1]?.inputs[0]?.focus();
      return;
    }
    this.p.move();
    if (ok) {
      row.done = true;
      row.row.classList.add('ok');
      row.row.classList.remove('bad');
      row.status.textContent = '✓';
      sfx.snap();
      if (this.rows.every((r) => r.done) || (this.mode === 'commander' && last)) this.complete();
      else this.rows[i + 1]?.inputs[0]?.focus();
    } else {
      row.row.classList.add('bad');
      sfx.miss();
      // typed decimals of a root (2.24 for √5) still match their misconception
      const m = s.mistakes?.find(([v]) => same(flat(v), got, Math.max(s.tol ?? 1e-6, 0.01)));
      row.status.innerHTML = m ? inline(m[1]) : this.mode === 'commander' ? 'Not this. Check your working above.' : 'Not this one.';
    }
  }

  /** Put the right value in step i (cadet Compute, Show me). */
  fill(i: number, check = true): void {
    const s = this.o.steps[i];
    flat(s.answer).forEach((v, k) => { this.rows[i].inputs[k].value = nice(v, 1000); });
    if (check) { this.rows[i].done = true; this.rows[i].row.classList.add('ok'); this.rows[i].status.textContent = '✓'; sfx.tick(i); }
    if (this.rows.every((r) => r.done)) this.complete();
  }

  private complete(): void {
    if (this.finished) return;
    this.finished = true;
    this.el.classList.add('done');
    this.o.onDone();
  }

  /** Show me: fill every step in turn. */
  async showMe(msEach = 450): Promise<void> {
    for (let i = 0; i < this.o.steps.length; i++) {
      this.fill(i, true);
      await new Promise((r) => window.setTimeout(r, msEach));
    }
  }

  /** Instant solve (tests). */
  solve(): void { this.o.steps.forEach((_, i) => this.fill(i, true)); }

  /** A known-wrong attempt (tests): type 0s everywhere and check. */
  wrong(): void {
    this.rows.forEach((r, i) => { r.inputs.forEach((x) => { x.value = '0'; }); this.check(i, false); });
  }

  get done(): boolean { return this.finished; }
}

/** Render a typed answer back as TeX (for summaries). */
export function answerTex(a: Answer): string {
  if (typeof a === 'number') return nice(a);
  if (Array.isArray(a[0])) return `\\begin{bmatrix}${(a as number[][]).map((r) => r.map((x) => nice(x)).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;
  return `\\begin{bmatrix}${(a as number[]).map((x) => nice(x)).join(' \\\\ ')}\\end{bmatrix}`;
}

// ------------------------------------------------------------------ TileOrder

export interface TileOrderOpts {
  tiles: Tile[];
  decoys?: Tile[];
  /** Show the Python snippet beside each tile. */
  showPython?: boolean;
  /** Button label (default "Run"). */
  submitLabel?: string;
  onSubmit: (order: string[]) => void;
  mount?: HTMLElement;
  title?: string;
}

/** Tiles in a tray; click a tray tile to append it to the plan; click a plan tile to send it back; drag to reorder. */
export class TileOrder {
  readonly el: HTMLElement;
  private readonly tray: HTMLElement;
  private readonly plan: HTMLElement;
  private order: string[] = [];
  private readonly all: Tile[];

  constructor(p: PuzzleCtx | null, private readonly o: TileOrderOpts) {
    this.all = [...o.tiles, ...(o.decoys ?? [])];
    // shuffle deterministically by text so the tray does not give the order away
    const shuffled = [...this.all].sort((a, b) => hashStr(a.text) - hashStr(b.text));
    this.tray = h('div', { class: 'tile-tray' });
    this.plan = h('ol', { class: 'tile-plan' });
    for (const t of shuffled) this.tray.appendChild(this.tileEl(t, false));
    const run = h('button', { class: 'btn primary small', type: 'button', onclick: () => o.onSubmit(this.order.slice()) }, o.submitLabel ?? 'Run');
    const clear = h('button', { class: 'btn ghost small', type: 'button', onclick: () => this.set([]) }, 'Clear');
    this.el = h('div', { class: 'tiles' },
      o.title ? h('div', { class: 'kicker' }, o.title) : null,
      h('div', { class: 'tile-cols' },
        h('div', null, h('div', { class: 'tile-label' }, 'Steps'), this.tray),
        h('div', null, h('div', { class: 'tile-label' }, 'Your order'), this.plan)),
      h('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, clear, run));
    (o.mount ?? p?.dock())?.appendChild(this.el);
  }

  private tileEl(t: Tile, inPlan: boolean): HTMLElement {
    const el = h(inPlan ? 'li' : 'button', { class: `tile ${inPlan ? 'in-plan' : ''}`, type: inPlan ? undefined : 'button', draggable: inPlan ? 'true' : undefined, 'data-id': t.id },
      h('span', { class: 'tile-text', html: inline(t.text) }),
      this.o.showPython && t.py ? h('code', { class: 'tile-py' }, t.py) : null);
    el.addEventListener('click', () => {
      if (inPlan) this.set(this.order.filter((x, i) => !(x === t.id && i === [...this.plan.children].indexOf(el))));
      else this.set([...this.order, t.id]);
      sfx.click();
    });
    if (inPlan) {
      el.addEventListener('dragstart', (e) => { (e as DragEvent).dataTransfer?.setData('text/plain', String([...this.plan.children].indexOf(el))); });
      el.addEventListener('dragover', (e) => e.preventDefault());
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = Number((e as DragEvent).dataTransfer?.getData('text/plain'));
        const to = [...this.plan.children].indexOf(el);
        const o = this.order.slice();
        const [m] = o.splice(from, 1);
        o.splice(to, 0, m);
        this.set(o);
      });
    }
    return el;
  }

  set(order: string[]): void {
    this.order = order.slice();
    this.plan.replaceChildren(...this.order.map((id) => this.tileEl(this.all.find((t) => t.id === id)!, true)));
    for (const b of [...this.tray.children] as HTMLElement[]) b.classList.toggle('used', this.order.includes(b.dataset.id!));
  }

  get(): string[] { return this.order.slice(); }
}

function hashStr(s: string): number { let x = 7; for (const c of s) x = (x * 31 + c.charCodeAt(0)) % 100003; return x; }

/** Markdown helper for derivation summaries. */
export const mdHtml = md;
export const texHtml = tex;
