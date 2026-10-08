// Cinematic helpers: letterbox bars, fade to black, act/chapter title cards, big typographic overlays.
import type { Game } from '../game/types';
import { h, inline } from '../ui/ui';
import { wait } from '../core/tween';

function layer(g: Game, cls: string): HTMLElement {
  const el = h('div', { class: `cine ${cls}` });
  g.ui.dialogue.parentElement!.insertBefore(el, g.ui.dialogue);
  return el;
}

let bars: HTMLElement | null = null;
/** Letterbox bars on/off. */
export async function letterbox(g: Game, on: boolean, ms = 700): Promise<void> {
  if (!bars) { bars = layer(g, 'cine-bars'); bars.append(h('div', { class: 'bar top' }), h('div', { class: 'bar bottom' })); }
  bars.style.setProperty('--dur', `${ms}ms`);
  bars.classList.toggle('on', on);
  await wait(ms);
}

let black: HTMLElement | null = null;
/** Fade the whole screen to black (on) or back (off). */
export async function fadeBlack(g: Game, on: boolean, ms = 900): Promise<void> {
  if (!black) black = layer(g, 'cine-black');
  black.style.transitionDuration = `${ms}ms`;
  // force a frame so the transition runs
  void black.offsetWidth;
  black.classList.toggle('on', on);
  await wait(ms);
}

/** A title card in the middle of the screen. Resolves after it has faded out. */
export async function titleCard(g: Game, kicker: string, title: string, ms = 3200, sub?: string): Promise<void> {
  const el = layer(g, 'cine-title');
  el.append(h('div', { class: 'kicker' }, kicker), h('div', { class: 't', html: inline(title) }));
  if (sub) el.append(h('div', { class: 's', html: inline(sub) }));
  void el.offsetWidth;
  el.classList.add('on');
  await wait(ms);
  el.classList.remove('on');
  await wait(900);
  el.remove();
}

/** Show a block of big monospaced numbers (e.g. a matrix being read out), revealed one at a time. */
export class NumberBoard {
  readonly el: HTMLElement;
  private cells: HTMLElement[] = [];
  constructor(g: Game, rows: number, cols: number, o: { caption?: string } = {}) {
    this.el = layer(g, 'cine-numbers');
    const grid = h('div', { class: 'grid', style: `grid-template-columns: repeat(${cols}, 1fr)` });
    for (let i = 0; i < rows * cols; i++) {
      const c = h('div', { class: 'n' }, '·');
      this.cells.push(c);
      grid.appendChild(c);
    }
    if (o.caption) this.el.append(h('div', { class: 'kicker' }, o.caption));
    this.el.append(grid);
    void this.el.offsetWidth;
    this.el.classList.add('on');
  }
  set(i: number, text: string): void { const c = this.cells[i]; if (c) { c.textContent = text; c.classList.add('lit'); } }
  async hide(): Promise<void> { this.el.classList.remove('on'); await wait(800); this.el.remove(); }
}

/** A line of small caps text in a corner (location / time stamp). */
export async function stamp(g: Game, text: string, ms = 3500): Promise<void> {
  const el = layer(g, 'cine-stamp');
  el.innerHTML = inline(text);
  void el.offsetWidth;
  el.classList.add('on');
  await wait(ms);
  el.classList.remove('on');
  await wait(700);
  el.remove();
}

/** Remove every cinematic overlay at once (used when the player jumps to another beat). */
export function clearCine(): void {
  document.querySelectorAll('.cine-title, .cine-numbers, .cine-stamp').forEach((e) => e.remove());
  bars?.classList.remove('on');
  black?.classList.remove('on');
}
