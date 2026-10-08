// The three-slot rail (GDD §6.8 Ch 17): "into the Anchor's grid", "the spire numbers", "back to the
// ship's grid". Cards sit right to left; the right-hand card acts first. Playing the rail moves the picture
// stage by stage, each stage honest (a shear slides, a turn turns, nothing passes through flat).
import type { Card } from './logic';
import { h } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { sfx } from '../../../audio/sfx';
import { animate, ease } from '../../../core/tween';
import { det, identity, interpMat2, matMul, mlerp, type Mat } from '../../../math/la';
import { railProduct, texM } from './logic';

export interface SlotDef { id: string; label: string; copper?: boolean; fixed?: Card }

export interface RailOpts {
  /** Slots in acting order: slots[0] acts first (drawn rightmost, next to x). */
  slots: SlotDef[];
  palette?: Card[];
  onChange?: (cards: (Card | null)[]) => void;
}

export class Rail {
  readonly el: HTMLElement;
  private readonly track: HTMLElement;
  private readonly pal: HTMLElement | null;
  cards: (Card | null)[];
  private selected = -1;
  private playing = -1;
  /** While the rail is playing, cards cannot be moved. */
  locked = false;

  constructor(private readonly o: RailOpts) {
    this.cards = o.slots.map((s) => s.fixed ?? null);
    this.pal = o.palette ? h('div', { class: 'c17-palette' }) : null;
    this.track = h('div', { class: 'c17-track' });
    this.el = h('div', { class: 'c17-rail' },
      this.pal ? h('div', { class: 'kicker' }, 'Cards: click one to put it in a slot') : null,
      this.pal,
      this.track,
      h('div', { class: 'c17-order' }, 'The right-hand card acts first, then the next one to its left.'));
    this.render();
  }

  private cardEl(c: Card, where: 'palette' | 'slot', i = -1, fixed = false): HTMLElement {
    const used = where === 'palette' && this.cards.some((x) => x?.id === c.id);
    const el = h('button', { class: `c17-card ${used ? 'used' : ''} ${fixed ? 'fixed' : ''} ${c.id.includes('anchor') || c.id === 'S' ? 'cu' : ''}`, type: 'button', title: c.name, 'data-card': c.id, draggable: where === 'palette' ? 'true' : undefined },
      h('span', { class: 'n' }, c.name),
      h('span', { class: 'm', html: tex(texM(c.M)) }));
    if (where === 'palette') {
      el.addEventListener('click', () => { if (!used && !this.locked) this.put(c); });
      el.addEventListener('dragstart', (e) => (e as DragEvent).dataTransfer?.setData('text/plain', c.id));
    } else if (!fixed) {
      el.addEventListener('click', () => { if (this.locked) return; this.cards[i] = null; this.selected = -1; sfx.back(); this.render(); this.o.onChange?.(this.cards.slice()); });
    }
    return el;
  }

  /** Put a card in the selected slot, or the first empty one in acting order. */
  put(c: Card): void {
    const i = this.selected >= 0 && !this.cards[this.selected] && !this.o.slots[this.selected].fixed ? this.selected : this.cards.findIndex((x, k) => !x && !this.o.slots[k].fixed);
    if (i < 0) { sfx.miss(); return; }
    if (this.cards.some((x) => x?.id === c.id)) { sfx.miss(); return; }
    this.cards[i] = c;
    this.selected = -1;
    sfx.snap();
    this.render();
    this.o.onChange?.(this.cards.slice());
  }

  /** Set every slot at once (acting order). */
  set(cards: (Card | null)[]): void {
    this.cards = this.o.slots.map((s, k) => s.fixed ?? cards[k] ?? null);
    this.selected = -1;
    this.render();
    this.o.onChange?.(this.cards.slice());
  }

  /** Replace the card in one slot (e.g. a setting the player is typing). */
  setCard(i: number, c: Card): void { this.cards[i] = c; this.render(); }

  highlight(i: number): void { this.playing = i; this.render(); }

  get full(): boolean { return this.cards.every(Boolean); }
  product(): Mat | null { return this.full ? railProduct(this.cards.map((c) => c!.M)) : null; }

  private render(): void {
    if (this.pal) this.pal.replaceChildren(...(this.o.palette ?? []).map((c) => this.cardEl(c, 'palette')));
    const items: HTMLElement[] = [];
    for (let k = this.o.slots.length - 1; k >= 0; k--) {
      const s = this.o.slots[k];
      const c = this.cards[k];
      const hole = c ? this.cardEl(c, 'slot', k, !!s.fixed) : h('div', { class: 'hole' }, k === this.selected ? 'next card here' : 'empty');
      const slot = h('div', { class: `c17-slot ${s.copper ? 'cu' : ''} ${k === this.playing ? 'playing' : ''}`, 'data-slot': s.id },
        h('div', { class: 'lab' }, s.label), hole);
      slot.addEventListener('click', (e) => { if (!c && !s.fixed && !this.locked) { e.stopPropagation(); this.selected = k; this.render(); } });
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = (e as DragEvent).dataTransfer?.getData('text/plain');
        const card = this.o.palette?.find((x) => x.id === id);
        if (card && !s.fixed && !this.locked) { this.selected = k; if (this.cards[k]) this.cards[k] = null; this.put(card); }
      });
      items.push(slot);
    }
    items.push(h('span', { class: 'c17-x', html: tex('\\mathbf x') }));
    this.track.replaceChildren(...items);
  }
}

// ------------------------------------------------------------------ honest playback

/** The in-between of one card's own move, from I (t = 0) to its matrix (t = 1). */
export function cardAt(c: Card, t: number): Mat {
  if (c.at) return c.at(t);
  const n = c.M.length;
  // a flip cannot be played in the plane without passing through flat: cut to it halfway instead
  if (det(c.M) < -1e-9) return t < 0.5 ? identity(n) : c.M;
  return n === 2 ? interpMat2(identity(2), c.M, t, 'auto') : mlerp(identity(n), c.M, t);
}

export type Rider = (W: Mat) => void;

/**
 * Play cards in acting order: the picture W goes I → M₁ → M₂M₁ → …, each stage drawn through `riders`.
 * `onStage(i)` fires as stage i starts (for captions). Resolves on the product.
 */
export async function playCards(list: Card[], riders: Rider[], o: { ms?: number; rail?: Rail | null; onStage?: (i: number) => void; pause?: number } = {}): Promise<Mat> {
  const cards = list.slice();
  if (o.rail) o.rail.locked = true;
  let cur = identity(cards[0]?.M.length ?? 2);
  riders.forEach((f) => f(cur));
  for (let i = 0; i < cards.length; i++) {
    o.rail?.highlight(i);
    o.onStage?.(i);
    const base = cur;
    sfx.whoosh(Math.max(0.2, (o.ms ?? 1300) / 1000));
    await animate(o.ms ?? 1300, (k) => { const W = matMul(cardAt(cards[i], k), base); riders.forEach((f) => f(W)); }, ease.inOut);
    cur = matMul(cards[i].M, base);
    riders.forEach((f) => f(cur));
    sfx.tick(i);
    if (o.pause) await animate(o.pause, () => {}, ease.linear);
  }
  o.rail?.highlight(-1);
  if (o.rail) o.rail.locked = false;
  return cur;
}
