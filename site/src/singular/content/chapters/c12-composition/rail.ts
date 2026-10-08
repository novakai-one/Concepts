// The sequence rail (GDD §3.5, §6.6 Ch 12): drop moves on a rail, right to left. The right-hand card
// acts first. Playing the rail moves the grid stage by stage (honest, right-hand first) while e₁ and
// e₂ are traced; fusing two neighbouring cards replaces them by their product.
import './rail.css';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { h } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatSegments } from '../../../gfx/lines';
import { C } from '../../../core/theme';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import { identity, matMul, matVec, type Mat } from '../../../math/la';
import { playMove, type MoveView, type Rider } from '../c11-transformations/bench';
import { fmtN, type Card } from './logic';

export const texMat = (M: Mat) => `\\begin{bmatrix}${M.map((r) => r.map((x) => fmtN(x).replace('−', '-')).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`;

export interface RailOpts {
  /** Cards the player can drop on the rail. Omit for a locked rail. */
  palette?: Card[];
  /** Starting cards, first acting first. */
  cards?: Card[];
  max?: number;
  /** Show a fuse control between neighbouring cards. */
  fusable?: boolean;
  onChange?: (cards: Card[]) => void;
  onFuse?: (cards: Card[]) => void;
}

export class Rail {
  readonly el: HTMLElement;
  private readonly track: HTMLElement;
  cards: Card[];
  private playingAt = -1;
  private readonly o: RailOpts;

  constructor(o: RailOpts) {
    this.o = o;
    this.cards = (o.cards ?? []).slice();
    const palette = o.palette ? h('div', { class: 'c12-palette' }, ...o.palette.map((c) => this.cardEl(c, 'palette'))) : null;
    this.track = h('div', { class: `c12-track ${o.palette ? '' : 'locked'}` });
    if (o.palette) {
      this.track.addEventListener('dragover', (e) => { e.preventDefault(); this.track.classList.add('over'); });
      this.track.addEventListener('dragleave', () => this.track.classList.remove('over'));
      this.track.addEventListener('drop', (e) => {
        e.preventDefault();
        this.track.classList.remove('over');
        const id = (e as DragEvent).dataTransfer?.getData('text/plain');
        const c = o.palette?.find((x) => x.id === id);
        if (c) this.add(c);
      });
    }
    this.el = h('div', { class: 'c12-rail' },
      palette ? h('div', { class: 'kicker' }, 'Moves: click or drag onto the rail') : null,
      palette,
      this.track,
      h('div', { class: 'c12-order' }, 'The right-hand card acts first, then the next one to its left.'));
    this.render();
  }

  private cardEl(c: Card, where: 'palette' | 'track'): HTMLElement {
    const el = h('button', { class: `c12-card ${c.id.startsWith('fused') ? 'fused' : ''}`, type: 'button', draggable: where === 'palette' ? 'true' : undefined, title: where === 'track' && this.o.palette ? 'Click to take it off the rail' : c.name },
      h('span', { class: 'n' }, c.name),
      h('span', { class: 'm', html: tex(texMat(c.M)) }));
    if (where === 'palette') {
      el.addEventListener('dragstart', (e) => { (e as DragEvent).dataTransfer?.setData('text/plain', c.id); });
      el.addEventListener('click', () => this.add(c));
    } else if (this.o.palette) {
      el.addEventListener('click', () => { const i = this.cards.indexOf(c); if (i >= 0) { this.cards.splice(i, 1); sfx.back(); this.render(); this.o.onChange?.(this.cards.slice()); } });
    }
    return el;
  }

  add(c: Card): void {
    if (this.cards.length >= (this.o.max ?? 4)) { sfx.miss(); return; }
    this.cards.push({ ...c });
    sfx.snap();
    this.render();
    this.o.onChange?.(this.cards.slice());
  }

  set(cards: Card[]): void { this.cards = cards.map((c) => ({ ...c })); this.render(); this.o.onChange?.(this.cards.slice()); }

  /** Fuse the cards at acting positions i and i + 1 into one card (the later one times the earlier one). */
  fuseAt(i: number): void {
    const a = this.cards[i], b = this.cards[i + 1];
    if (!a || !b) return;
    const f: Card = { id: `fused-${b.id}-${a.id}`, name: `${b.name} · ${a.name}`, M: matMul(b.M, a.M) };
    this.cards.splice(i, 2, f);
    sfx.success();
    this.render();
    this.o.onFuse?.(this.cards.slice());
  }

  highlight(i: number): void { this.playingAt = i; this.render(); }

  matrices(): Mat[] { return this.cards.map((c) => c.M); }

  private render(): void {
    const items: HTMLElement[] = [];
    if (!this.cards.length) items.push(h('span', { class: 'c12-empty' }, 'Drop moves here, right to left.'));
    // left to right on screen = last acting to first acting
    for (let k = this.cards.length - 1; k >= 0; k--) {
      const el = this.cardEl(this.cards[k], 'track');
      if (k === this.playingAt) el.classList.add('playing');
      items.push(el);
      if (k > 0 && this.o.fusable) {
        const j = k - 1;
        const f = h('button', { class: 'c12-fuse', type: 'button', title: 'Fuse these two into one card' }, 'fuse');
        f.addEventListener('click', () => this.fuseAt(j));
        items.push(f);
      }
    }
    items.push(h('span', { class: 'c12-x', html: tex('\\mathbf x') }));
    this.track.replaceChildren(...items);
  }
}

// ------------------------------------------------------------------ tracing e₁ and e₂ through the stages

/** Two arrows that ride the grid (where e₁ and e₂ are now) and leave dots and dashed trails at each stage. */
export class Tracer {
  readonly a1: Arrow;
  readonly a2: Arrow;
  private readonly trails: FatSegments;
  private readonly dots: Dot[] = [];
  private segs: [V3, V3][] = [];
  private last: [V3, V3] = [[1, 0, 0], [0, 1, 0]];
  constructor(private readonly p: PuzzleCtx, labels: [string, string] = ['$\\mathbf e_1$', '$\\mathbf e_2$']) {
    this.a1 = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, label: labels[0], width: 0.045 });
    this.a2 = new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, label: labels[1], width: 0.045 });
    this.trails = new FatSegments(p.g.stage, [], { color: C.white, width: 1.3, dashed: true, opacity: 0.55, dashSize: 0.12, gapSize: 0.1 });
    p.add(this.a1, this.a2, this.trails.object);
    p.onDispose(() => this.trails.dispose());
  }
  get rider(): Rider {
    return (W) => {
      this.a1.setTo([W[0][0], W[1][0], W[2][0]]);
      this.a2.setTo([W[0][1], W[1][1], W[2][1]]);
      // an arrow squashed to the origin keeps no label (two labels would pile up there)
      if (this.a1.label) this.a1.label.object.visible = Math.hypot(W[0][0], W[1][0], W[2][0]) > 0.05;
      if (this.a2.label) this.a2.label.object.visible = Math.hypot(W[0][1], W[1][1], W[2][1]) > 0.05;
    };
  }
  /** Leave a dot for each arrow where it is now, joined to the previous stage. */
  mark(M: Mat): void {
    const t1: V3 = [M[0][0], M[1][0], 0], t2: V3 = [M[0][1], M[1][1], 0];
    this.segs.push([this.last[0], t1], [this.last[1], t2]);
    this.trails.setSegments(this.segs);
    for (const [t, c] of [[t1, C.v], [t2, C.w]] as [V3, string][]) {
      const d = new Dot(t, { color: c, size: 0.06, glow: 0.8 });
      this.p.add(d);
      this.dots.push(d);
    }
    this.last = [t1, t2];
  }
  reset(): void {
    this.dots.splice(0).forEach((d) => d.dispose());
    this.segs = [];
    this.trails.setSegments([]);
    this.last = [[1, 0, 0], [0, 1, 0]];
    this.a1.setTo([1, 0, 0]);
    this.a2.setTo([0, 1, 0]);
    if (this.a1.label) this.a1.label.object.visible = true;
    if (this.a2.label) this.a2.label.object.visible = true;
  }
  show(v: boolean): void { this.a1.object.visible = v; this.a2.object.visible = v; this.trails.object.visible = v; this.dots.forEach((d) => { d.object.visible = v; }); }
}

/** Play cards in acting order on a grid, stage by stage. Resolves on the product. */
export async function playRail(view: MoveView, rail: Rail | null, Ms: Mat[], o: { ms?: number; riders?: Rider[]; tracer?: Tracer; pause?: number } = {}): Promise<Mat> {
  let cur = identity(2);
  view.grid?.set(cur);
  view.flat.set(cur);
  o.tracer?.reset();
  const riders = [...(o.riders ?? []), ...(o.tracer ? [o.tracer.rider] : [])];
  for (let i = 0; i < Ms.length; i++) {
    rail?.highlight(i);
    cur = await playMove(view, Ms[i], cur, o.ms ?? 1300, riders);
    o.tracer?.mark(cur);
    sfx.tick(i);
    if (o.pause) await wait(o.pause);
  }
  rail?.highlight(-1);
  return cur;
}

export const landOf = (M: Mat, x: number[]): V3 => { const q = matVec(M, x); return [q[0], q[1], 0]; };
