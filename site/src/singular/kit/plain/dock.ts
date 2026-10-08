// Plain maths kit: the dock (Chapter 18's look, no matrix), the number and vector boxes, the one-box
// equation row, the "?" help button, and the runner chores every puzzle repeats.
import type { PuzzleCtx } from '../../game/types';
import { h, button, inline, md } from '../../ui/ui';
import { fmtN, parseEntry, type Vec } from './logic';
import { UNREAD, UNREAD_M } from './tex';

export type MsgKind = '' | 'good' | 'bad' | 'warn';

/** The dock: head (fixed data, kicker, ?), body (rows), one message line. */
export interface PlainDock {
  root: HTMLElement;
  head: HTMLElement;
  body: HTMLElement;
  /** The small upper-case line at the right of the head ("Round 3 of 10"). */
  kick: HTMLElement;
  /** One short line under the body (markdown with $TeX$). '' clears it. */
  msg(md: string, kind?: MsgKind): void;
  /** The fixed data at the left of the head, e.g. `$\mathbf u = [2;1]$` ('' hides it). */
  setHead(md: string): void;
  /** Fixed help behind "?" (calm screen); shown as a small aside otherwise. */
  help(md: string): void;
}

export function plainDock(p: PuzzleCtx, o: { head?: string; help?: string } = {}): PlainDock {
  const dock = p.dock();
  dock.classList.add('tj-dock');
  const data = h('span', { class: 'tj-mat' });
  const kick = h('span', { class: 'tj-kick' });
  const right = h('span', { class: 'tj-row' }, kick);
  const head = h('div', { class: 'tj-head' }, data, right);
  const body = h('div', { class: 'tj-body' });
  const m = h('div', { class: 'tj-msg', 'aria-live': 'polite' });
  const root = h('div', { class: 'tj' }, head, body, m);
  dock.replaceChildren(root);
  let qbtn: HTMLButtonElement | null = null;
  let aside: HTMLElement | null = null;
  // an empty head takes no room
  const tidy = () => { head.hidden = !data.innerHTML && !kick.textContent && !qbtn; };
  new MutationObserver(tidy).observe(kick, { childList: true, characterData: true, subtree: true });
  const d: PlainDock = {
    root, head, body, kick,
    msg(text, kind = '') {
      m.className = `tj-msg ${kind}`;
      m.innerHTML = text ? inline(text) : '';
      // on phones the dock scrolls: keep the newest feedback in view
      if (text) requestAnimationFrame(() => m.scrollIntoView({ block: 'nearest' }));
    },
    setHead(text) { data.innerHTML = text ? inline(text) : ''; tidy(); },
    help(text) {
      if (!aside) {
        aside = h('div', { class: 'tj-aside' });
        root.insertBefore(aside, body);
        qbtn = button('?', () => root.classList.toggle('tj-more'), { cls: 'ghost small icon tj-qbtn', title: 'Show or hide help' });
        right.append(qbtn);
      }
      aside.innerHTML = md(text);
      tidy();
    },
  };
  d.setHead(o.head ?? '');
  if (o.help) d.help(o.help);
  return d;
}

/** The "?" that shows fixed help on a calm screen (same as d.help(md)). */
export function helpButton(d: PlainDock, text: string): void { d.help(text); }

// ------------------------------------------------------------------ boxes (copied from Chapter 18)

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
  /** The typed number without marking anything (null while empty or half typed). For live previews. */
  peek(): number | null { const t = this.input.value.trim(); return t && t !== '-' ? parseEntry(t, { comma: this.comma }) : null; }
  set(x: number | string): void { this.input.value = typeof x === 'number' ? fmtN(x).replace(/−/g, '-') : x; this.input.classList.remove('bad'); }
  clear(): void { this.input.value = ''; this.input.classList.remove('bad'); }
  focus(): void { this.input.focus(); }
  enable(on: boolean): void { this.input.disabled = !on; (this.el.querySelector('button') as HTMLButtonElement).disabled = !on; }
}

/** A typed vector: two boxes stacked in brackets, with a label in front ($\mathbf v =$, green by default). */
export class VecField {
  readonly el: HTMLElement;
  readonly x: NumCell;
  readonly y: NumCell;
  constructor(o: { value?: Vec | null; label?: string; kind?: 'g' | 'b' | 'y'; onEnter?: () => void; aria?: [string, string]; signTitle?: string } = {}) {
    // null (the default): both boxes start empty, so nothing suggests a direction
    const v = o.value ?? null;
    const txt = (i: number) => (v ? fmtN(v[i]).replace(/−/g, '-') : '');
    const name = (o.label ?? '$\\mathbf v =$').replace(/\$|\\mathbf|=/g, '').trim() || 'the vector';
    const [ax, ay] = o.aria ?? [`first number of ${name}`, `second number of ${name}`];
    // one number per box: "1,1" in a part is a whole vector typed in one box, so it is refused, not read as 1.1
    this.x = new NumCell({ value: txt(0), aria: ax, onEnter: o.onEnter, cls: 'c0', comma: false, signTitle: o.signTitle });
    this.y = new NumCell({ value: txt(1), aria: ay, onEnter: o.onEnter, cls: 'c0', comma: false, signTitle: o.signTitle });
    const kind = o.kind && o.kind !== 'g' ? ` pk-${o.kind}` : '';
    const label = o.label === '' ? null : h('span', { class: `tj-vl${kind}`, html: inline(o.label ?? '$\\mathbf v =$') });
    this.el = h('span', { class: 'tj-vec' }, label, h('span', { class: 'tj-col' }, this.x.el, this.y.el));
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

// ------------------------------------------------------------------ the one-box equation

export interface EqRow<T> {
  el: HTMLElement;
  /** The Check button. */
  go: HTMLButtonElement;
  /** The typed answer, or null (marked, and UNREAD shown in the dock if one was given). */
  read(): T | null;
  set(x: T): void;
  clear(): void;
  focus(): void;
  enable(on: boolean): void;
  /** Press Check from code (Show me, solve). */
  check(): void;
}
interface EqBase { left?: string; right?: string; go?: string; aria?: string; d?: PlainDock }

/**
 * An equation with one box and a Check button: `left [ ] right`. TeX without $ signs, e.g.
 * eqRow({ right: '\\mathbf v = ' + tv([6, 3]), onCheck }) reads "[ ] v = [6;3]".
 * vec: true makes the box a stacked vector. onCheck only runs with a readable answer.
 */
export function eqRow(o: EqBase & { vec?: false; onCheck(x: number): void }): EqRow<number>;
export function eqRow(o: EqBase & { vec: true; onCheck(x: Vec): void }): EqRow<Vec>;
export function eqRow(o: EqBase & { vec?: boolean; onCheck(x: never): void }): EqRow<number> | EqRow<Vec> {
  const fire = () => row.check();
  const cell = o.vec ? null : new NumCell({ aria: o.aria ?? 'the number in the equation', onEnter: fire, cls: 'm', placeholder: '?' });
  const field = o.vec ? new VecField({ label: '', onEnter: fire, aria: ['first number of the answer', 'second number of the answer'] }) : null;
  const go = button(inline(o.go ?? 'Check'), fire, { cls: 'primary small', html: true });
  const tex = (s?: string) => (s ? h('span', { class: 'k', html: inline(`$${s}$`) }) : null);
  const el = h('div', { class: 'tj-row pk-eq' }, tex(o.left), cell ? cell.el : field!.el, tex(o.right), go);
  const read = (): number | Vec | null => {
    const x = cell ? cell.value() : field!.get();
    if (x === null) o.d?.msg(cell ? UNREAD_M : UNREAD, 'warn');
    return x;
  };
  const row = {
    el, go, read,
    set: (x: number | Vec) => { if (cell) cell.set(x as number); else field!.set(x as Vec); },
    clear: () => { cell?.clear(); field?.clear(); },
    focus: () => { cell?.focus(); field?.focus(); },
    enable: (on: boolean) => { cell?.enable(on); field?.enable(on); go.disabled = !on; },
    check: () => { if (go.disabled) return; const x = read(); if (x !== null) (o.onCheck as (x: number | Vec) => void)(x); },
  };
  return row as EqRow<number> | EqRow<Vec>;
}

// ------------------------------------------------------------------ runner chores

/** Hide the runner's hint box (the stage it answered is over). */
export function hideHint(p: PuzzleCtx): void {
  const b = p.g.ui.scene.querySelector<HTMLElement>('.hint-box');
  if (b) b.hidden = true;
}

/** Reset the objective card (call first in setup: Reset remounts the puzzle but keeps the old goal and ticks). */
export function freshObjective(p: PuzzleCtx, goal: string, subgoals = 0): void {
  p.setGoal(goal);
  for (let i = 0; i < subgoals; i++) p.subgoal(i, false);
}

const GOALS = new WeakMap<PuzzleCtx, boolean[]>();
/** Tick subgoal i once (repeated calls do nothing). */
export function sg(p: PuzzleCtx, i: number, done = true): void {
  const st = GOALS.get(p) ?? [];
  GOALS.set(p, st);
  if (!!st[i] === done) return;
  st[i] = done;
  p.subgoal(i, done);
}

/** Focus a box after the dock settles (skipped in tests). */
export function focusSoon(p: PuzzleCtx, f: { focus(): void }, ms = 80): void {
  if (!p.g.headless) window.setTimeout(() => f.focus(), ms);
}
