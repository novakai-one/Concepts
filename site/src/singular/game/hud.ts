// Heads-up display: where you are, what to do, and the puzzle controls.
import { h, inline, md, button, type UI } from '../ui/ui';
import { floatPanel } from '../ui/float';

export interface PuzzleControls {
  onHint: () => void;
  onShowMe: () => void;
  onSkip: () => void;
  onReset: () => void;
}

export class Hud {
  private readonly tl: HTMLElement;
  private readonly tr: HTMLElement;
  private readonly br: HTMLElement;
  private readonly chapterEl: HTMLElement;
  private readonly objEl: HTMLElement;
  private goalEl: HTMLElement | null = null;
  private subs: HTMLElement[] = [];
  private starsEl: HTMLElement | null = null;
  private progEl: HTMLElement | null = null;
  private hintBtn: HTMLButtonElement | null = null;

  constructor(private readonly ui: UI, menu: { onMenu: () => void; onCodex: () => void; onSettings: () => void; onLog: () => void; onCase: () => void }) {
    this.chapterEl = h('div', { class: 'hud-chapter' });
    this.objEl = h('div', { class: 'objective glass' });
    this.objEl.hidden = true;
    floatPanel(this.objEl, 'objective', 'Goal', true);
    // calm screens fold the card to one line; a click opens it (not a drag on its bar)
    this.objEl.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.fp-bar')) this.objEl.classList.toggle('open'); });
    this.tl = h('div', { class: 'hud-tl' }, this.chapterEl, this.objEl);
    this.tr = h('div', { class: 'hud-tr' },
      button('Log', menu.onLog, { cls: 'ghost small', title: 'Dialogue log' }),
      button('Case board', menu.onCase, { cls: 'ghost small', title: 'Open questions' }),
      button('Codex', menu.onCodex, { cls: 'ghost small', title: 'Codex (C)' }),
      button('⚙', menu.onSettings, { cls: 'ghost small icon', title: 'Settings' }),
      button('☰', menu.onMenu, { cls: 'ghost small icon', title: 'Menu (Esc)' }));
    this.br = h('div', { class: 'hud-br' });
    ui.hud.append(this.tl, this.tr, this.br);
    for (const el of [this.tl, this.tr, this.br]) el.style.pointerEvents = 'auto';
  }

  setChapter(kicker: string, title: string): void {
    this.chapterEl.replaceChildren(h('span', { class: 'kicker' }, kicker), h('span', { class: 't', html: inline(title) }));
  }

  setObjective(title: string, goal: string, subgoals: string[] = []): void {
    this.objEl.hidden = false;
    this.goalEl = h('div', { class: 'goal', html: md(goal) });
    this.subs = subgoals.map((s) => h('div', { class: 'sub' }, h('span', { html: inline(s) })));
    this.starsEl = h('span', { class: 'stars', 'aria-label': 'stars' });
    this.progEl = h('span', { class: 'prog' });
    this.objEl.classList.remove('open');
    this.objEl.replaceChildren(
      h('div', { class: 'obj-head', style: 'display:flex;justify-content:space-between;gap:10px;align-items:center' }, h('span', { class: 'kicker' }, title), this.progEl, this.starsEl),
      this.goalEl,
      ...(subgoals.length ? [h('div', { class: 'subgoals' }, ...this.subs)] : []),
    );
    this.showProgress();
  }

  /** "Step 1 of 3": the folded card's only reminder of the subgoals. A bare "0 of 2" read as a count of answers. */
  private showProgress(): void {
    if (!this.progEl) return;
    const n = this.subs.length;
    const done = this.subs.filter((x) => x.classList.contains('done')).length;
    this.progEl.textContent = n < 2 ? '' : done >= n ? 'Done' : `Step ${done + 1} of ${n}`;
  }

  setGoal(goal: string): void { if (this.goalEl) this.goalEl.innerHTML = md(goal); }
  subgoal(i: number, done = true): void { this.subs[i]?.classList.toggle('done', done); this.showProgress(); }
  setStars(n: number, max = 3): void {
    if (!this.starsEl) return;
    this.starsEl.replaceChildren(...Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'on' : '' }, '★')));
  }
  hideObjective(): void { this.objEl.hidden = true; }

  showControls(c: PuzzleControls, hintsLeft: number): void {
    this.hintBtn = button(`Hint${hintsLeft ? ` (${hintsLeft})` : ''}`, c.onHint, { cls: 'small', kbd: 'H' });
    // calm screens keep only Hint in view; the rest sit behind "More"
    const more = button('More', () => this.br.classList.toggle('show-more'), { cls: 'ghost small hud-more', title: 'Reset, Show me, Skip' });
    this.br.classList.remove('show-more');
    this.br.replaceChildren(
      button('Reset', c.onReset, { cls: 'ghost small hud-extra', kbd: 'R' }),
      this.hintBtn,
      button('Show me', c.onShowMe, { cls: 'small hud-extra' }),
      button('Skip', c.onSkip, { cls: 'ghost small hud-extra' }),
      more,
    );
  }

  setHintsLeft(n: number): void { if (this.hintBtn) this.hintBtn.firstChild!.textContent = `Hint${n ? ` (${n})` : ''}`; }

  /** Replace the controls with one primary action (e.g. Continue). Resolves when pressed. */
  primary(label: string, kbd = 'Enter'): Promise<void> {
    return new Promise((resolve) => {
      const done = () => { document.removeEventListener('keydown', onKey); this.br.replaceChildren(); resolve(); };
      const b = button(label, done, { cls: 'primary', kbd });
      const onKey = (e: KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); done(); }
      };
      document.addEventListener('keydown', onKey);
      this.br.replaceChildren(b);
      b.focus();
    });
  }

  clearControls(): void { this.br.replaceChildren(); }
  setVisible(v: boolean): void { this.ui.hud.style.visibility = v ? '' : 'hidden'; }
}
