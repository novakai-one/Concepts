// The dial rig (Act I): thrust arrows with one dial each. The dials set how far each thruster
// pushes; the chain c₁A₁, c₂A₂, … is drawn tip to tail from the ship and the yellow arrow points at
// where the ship would land. Fire flies the chain (in 2-D or 3-D). Every point the yellow tip visits
// lights the reach glow; so does every point the ship flies through.
//
// Difficulty (GDD §7.1): the yellow tip is a live preview on cadet, appears after the first Fire on
// navigator, and never on commander (blind commit). Dials snap to 1 / 0.5 / 0.1 and always accept
// typed exact values.
import { Plane, Vector3, type Object3D } from 'three';
import type { PuzzleCtx, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { InfLine } from '../../../gfx/shapes';
import type { Ship } from '../../../gfx/models';
import { makeLantern } from '../../common/set';
import { h, inline, button } from '../../../ui/ui';
import { Readout, parseNum } from '../../../ui/widgets';
import { C } from '../../../core/theme';
import { nice } from '../../../math/frac';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { ReachGlow, type ReachGlowOpts } from './reach';

// ------------------------------------------------------------------ small helpers

const MINUS = '−';
/** "(2, −1, 3)" with nice fractions and a real minus sign. */
export const fmtV = (v: number[]): string => `(${v.map((x) => nice(x).replace('-', MINUS)).join(', ')})`;
export const fmtN = (x: number): string => nice(x).replace('-', MINUS);
/** A dial value: whole numbers and two-place decimals as decimals (1.5), anything else as a fraction (1/3). */
export const fmtDial = (x: number): string => (Math.abs(x * 100 - Math.round(x * 100)) < 1e-9 ? String(Math.round(x * 100) / 100) : nice(x));
/** A column vector in TeX. */
export const texV = (v: number[]): string => `\\begin{bmatrix}${v.map((x) => nice(x)).join(' \\\\ ')}\\end{bmatrix}`;
/** Plain-TeX label for k·sym (labels on the stage use KaTeX without colour macros). */
export const texScaled = (k: number, sym: string): string => (Math.abs(k - 1) < 1e-9 ? sym : Math.abs(k + 1) < 1e-9 ? `-${sym}` : `${nice(k)}\\,${sym}`);
export const MACRO = ['\\cg', '\\cr', '\\cb', '\\cb'];
export const COLORS = [C.v, C.w, C.u, '#d7e0f0'];

/**
 * Make an object clean up after itself when the world is cleared (clearWorld only disposes what an
 * object's userData.dispose names; labels inside groups would otherwise stay on screen).
 */
export function own<T extends { object: Object3D; dispose(): void }>(x: T): T {
  const prev = x.object.userData.dispose as (() => void) | undefined;
  x.object.userData.dispose = () => { prev?.(); x.dispose(); };
  return x;
}

const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale3 = (k: number, a: V3): V3 => [k * a[0], k * a[1], k * a[2]];
const to3 = (v: number[]): V3 => [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];

/** Default dial snap for the difficulty (GDD §7.1): 1, halves, tenths (commander types exact values). */
export function dialStep(p: PuzzleCtx): number {
  return p.difficulty === 'cadet' ? 1 : p.difficulty === 'navigator' ? 0.5 : 0.1;
}

/** Win tolerance for the difficulty (GDD §7.1). */
export function tolFor(p: PuzzleCtx): number { return p.difficulty === 'commander' ? 0.01 : 0.05; }

// ------------------------------------------------------------------ dragging a point on any plane

/**
 * Drag an object across a plane in the world (any tilt). The pointer ray meets the plane; the
 * point follows. Orbit is paused while dragging. Works in 2-D (plane z = 0) and 3-D.
 */
export class PlaneDrag {
  private dragging = false;
  enabled = true;
  constructor(p: PuzzleCtx, private readonly o: { target: () => Object3D; plane: () => Plane; onMove: (q: Vector3) => void; onEnd?: () => void; onStart?: () => void }) {
    const stage = p.g.stage;
    const el = stage.renderer.domElement;
    const down = (e: PointerEvent) => {
      if (!this.enabled || e.button !== 0) return;
      const t = this.o.target();
      if (!t.visible) return;
      if (!stage.pick(e.clientX, e.clientY, [t])) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.dragging = true;
      p.g.drag.dragging = true;
      if (stage.controls) stage.controls.enabled = false;
      el.style.cursor = 'grabbing';
      this.o.onStart?.();
    };
    const move = (e: PointerEvent) => {
      if (!this.dragging) {
        if (e.buttons === 0 && this.enabled && this.o.target().visible && e.target === el) {
          const over = !!stage.pick(e.clientX, e.clientY, [this.o.target()]);
          if (over) el.style.cursor = 'grab';
          else if (el.style.cursor === 'grab') el.style.cursor = '';
        }
        return;
      }
      const q = stage.toPlane(e.clientX, e.clientY, this.o.plane());
      if (q) this.o.onMove(q);
    };
    const up = () => {
      if (!this.dragging) return;
      this.dragging = false;
      p.g.drag.dragging = false;
      if (stage.controls) stage.controls.enabled = true;
      el.style.cursor = '';
      this.o.onEnd?.();
    };
    el.addEventListener('pointerdown', down, { capture: true });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    p.onDispose(() => {
      el.removeEventListener('pointerdown', down, { capture: true });
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (this.dragging && stage.controls) stage.controls.enabled = true;
    });
  }
}

// ------------------------------------------------------------------ the gap a miss leaves

/** A dashed orange segment from where the ship is to where it should be, with its length. */
export class Gap {
  private line: FatLine | null = null;
  private label: Label | null = null;
  constructor(private readonly p: PuzzleCtx) { p.onDispose(() => this.clear()); }
  show(from: V3, to: V3, text?: string): void {
    this.clear();
    this.line = new FatLine(this.p.g.stage, [from, to], { color: C.orange, width: 2.4, dashed: true, intensity: 1.3, dashSize: 0.18, gapSize: 0.12 });
    const d = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    this.label = new Label(text ?? `gap ${d.toFixed(2)}`, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2], { className: 'small', color: C.orange, offset: [0, -16] });
    this.p.add(this.line.object, this.label.object);
  }
  clear(): void { this.line?.dispose(); this.label?.dispose(); this.line = null; this.label = null; }
}

// ------------------------------------------------------------------ the rig

export type Outcome = 'win' | 'ok' | 'miss' | void;

export interface DialRigOpts {
  arrows: V3[];
  dims: 2 | 3;
  colors?: string[];
  /** TeX symbols for the arrows (plain TeX, no colour macros): '\\mathbf v'. */
  symbols?: string[];
  /** Dial names, e.g. ['a', 'b']. */
  names?: string[];
  /** Short words after each dial name in the dock, e.g. 'thruster two'. */
  tags?: string[];
  dials?: number[];
  range?: [number, number];
  /** Dial snap; default by difficulty. */
  step?: number;
  /** 'live' always shows the yellow tip; 'auto' follows the difficulty; 'never' hides it. */
  preview?: 'live' | 'auto' | 'never';
  ship?: boolean;
  /** Fire button label; null for no button. */
  fireLabel?: string | null;
  sliders?: boolean;
  typed?: boolean;
  /** The yellow tip can be dragged (two arrows only); the dials follow. */
  dragTip?: boolean;
  /** A glow to paint into (shared), options for a new one, or false for none. */
  glow?: ReachGlow | ReachGlowOpts | false;
  /** Dashed lines through the start along each arrow. */
  guides?: boolean;
  start?: V3;
  readoutTitle?: string | null;
  /** Bolted arrows (unbolted ones keep dial 0 and are hidden). */
  bolted?: boolean[];
  /** Draw the plain arrows from the start (default true). */
  baseArrows?: boolean;
  /** Checked before each Fire: return a reason to refuse (LANTERN says it), or null to fly. */
  beforeFire?: () => string | null;
  onChange?: (dials: number[], tip: V3) => void;
  onArrive?: (end: V3, dials: number[]) => Outcome | Promise<Outcome>;
}

export class DialRig {
  readonly p: PuzzleCtx;
  readonly o: DialRigOpts;
  arrows: V3[];
  dials: number[];
  bolted: boolean[];
  readonly start: V3;
  readonly chain: Arrow[] = [];
  readonly base: Arrow[] = [];
  readonly result: Arrow;
  readonly tipDot: Dot;
  readonly glow: ReachGlow | null;
  readonly ship: Ship | null = null;
  readonly readout: Readout | null = null;
  readonly gap: Gap;
  readonly fireBtn: HTMLButtonElement | null = null;
  private readonly guides: InfLine[] = [];
  private readonly rows: { els: HTMLElement[]; range: HTMLInputElement | null; cell: HTMLInputElement | null }[] = [];
  private previewOn: boolean;
  private flying = false;
  private fired = 0;
  private landed: V3 | null = null;
  private lastTickKey = '';
  /** Set by stop(): the rig never fires again (a puzzle moved on to another scene). */
  private stopped = false;
  /** The document-level F (Fire) key listener, kept so stop() can remove it. */
  private onKey: ((e: KeyboardEvent) => void) | null = null;
  readonly step: number;
  readonly range: [number, number];
  readonly drag: PlaneDrag | null = null;
  /** Called after every flight (any outcome). */
  afterFlight: ((end: V3, outcome: Outcome) => void) | null = null;

  constructor(p: PuzzleCtx, o: DialRigOpts) {
    this.p = p;
    this.o = o;
    this.arrows = o.arrows.map((a) => a.slice() as V3);
    this.dials = o.dials?.slice() ?? this.arrows.map(() => 0);
    this.bolted = o.bolted?.slice() ?? this.arrows.map(() => true);
    this.start = o.start ?? [0, 0, 0];
    this.step = o.step ?? dialStep(p);
    this.range = o.range ?? [-5, 5];
    const colors = o.colors ?? COLORS;
    const syms = o.symbols ?? ['\\mathbf v', '\\mathbf w', '\\mathbf u', '\\mathbf s'];
    const mode = o.preview ?? 'auto';
    const assist = p.g.settings.preview;
    this.previewOn = mode === 'live' || assist === true || (mode === 'auto' && assist !== false && p.difficulty === 'cadet');
    if (mode === 'never' && assist !== true) this.previewOn = false;

    // the glow
    if (o.glow === false) this.glow = null;
    else if (o.glow instanceof ReachGlow) this.glow = o.glow;
    else { this.glow = new ReachGlow(p.g.stage, o.glow ?? {}); p.add(this.glow); }
    this.glow?.setArrows(this.arrows.slice(0, 3));
    this.glow?.setOrigin(this.start);

    // guides and the plain arrows (shown when the preview is hidden)
    if (o.guides) {
      for (let i = 0; i < this.arrows.length; i++) {
        const g = new InfLine(p.g.stage, this.start, this.arrows[i], { color: colors[i], width: 1.1, opacity: 0.28, dashed: true });
        this.guides.push(g);
        p.add(g.object);
        p.onDispose(() => g.dispose());
      }
    }
    this.arrows.forEach((a, i) => {
      const b = new Arrow(this.start, add3(this.start, a), { color: colors[i], width: 0.035, opacity: 0.85, label: `$${syms[i]}$` });
      this.base.push(b);
      const c = new Arrow(this.start, this.start, { color: colors[i], width: 0.05, label: ' ', labelAt: 'mid' });
      this.chain.push(c);
      p.add(b, c);
    });
    this.result = new Arrow(this.start, this.start, { color: C.result, width: 0.032, opacity: 0.9, glow: 0.45 });
    this.tipDot = new Dot(this.start, { color: C.result, size: o.dims === 3 ? 0.13 : 0.12, glow: 2 });
    p.add(this.result, this.tipDot);
    this.gap = new Gap(p);

    if (o.ship !== false) {
      const ship = makeLantern(p.g.stage, 0.16);
      this.ship = ship;
      ship.object.position.set(...this.shipAt(this.start));
      p.add(ship);
      const first = this.arrows.find((a) => Math.hypot(...a) > 1e-6);
      if (first) ship.face(first);
    }

    // drag the yellow tip (two arrows): the dials follow
    if (o.dragTip && this.arrows.length === 2) {
      this.drag = new PlaneDrag(p, {
        target: () => this.tipDot.mesh,
        plane: () => this.dragPlane(),
        onMove: (q) => { if (this.flying || p.won) return; this.setDials(this.weightsFor([q.x, q.y, q.z]), true, false); },
        onEnd: () => { if (this.flying || p.won) return; p.move(); void this.settle(); },
      });
    }

    // dock: one row per dial, then Fire
    const dock = p.dock();
    const names = o.names ?? ['a', 'b', 'c', 'd'];
    const tags = o.tags ?? [];
    const noRows = o.sliders === false && o.typed === false;
    // one grid for all dial rows, so the labels, sliders and boxes line up
    const table = h('div', { style: 'display:grid;grid-template-columns:auto minmax(120px,1fr) auto;gap:10px 12px;align-items:center;min-width:300px' });
    if (!noRows) dock.appendChild(table);
    this.arrows.forEach((_, i) => {
      if (noRows) return;
      const range = o.sliders === false ? null : h('input', {
        type: 'range', min: this.range[0], max: this.range[1], step: this.step, value: this.dials[i],
        'aria-label': `dial ${names[i]}`, style: `width:100%;accent-color:${colors[i]}`,
      }) as HTMLInputElement;
      const cell = o.typed === false ? null : h('input', {
        class: 'cell', type: 'text', inputmode: 'decimal', value: fmtDial(this.dials[i]), 'aria-label': `dial ${names[i]} value`,
        spellcheck: 'false', style: `width:64px;border-color:${colors[i]}66`,
      }) as HTMLInputElement;
      range?.addEventListener('input', () => {
        const d = this.dials.slice();
        d[i] = parseFloat(range.value);
        this.setDials(d);
      });
      range?.addEventListener('change', () => p.move());
      if (cell) {
        const commit = () => {
          const v = parseNum(cell.value);
          if (v === null) { cell.classList.add('bad'); return; }
          cell.classList.remove('bad');
          const d = this.dials.slice();
          d[i] = v;
          p.move();
          this.setDials(d);
        };
        cell.addEventListener('change', commit);
        cell.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); commit(); } });
        cell.addEventListener('focus', () => cell.select());
      }
      const label = h('span', { style: `color:${colors[i]};font-size:14px;white-space:nowrap`, html: inline(`$${names[i]}$${tags[i] ? ` · ${tags[i]}` : ''}`) });
      const els = [label, range ?? h('span'), cell ?? h('span')];
      table.append(...els);
      this.rows.push({ els, range, cell });
    });
    if (o.fireLabel !== null) {
      this.fireBtn = button(o.fireLabel ?? 'Fire', () => void this.fire(), { cls: 'primary', kbd: 'F' });
      dock.appendChild(this.fireBtn);
      const onKey = (e: KeyboardEvent) => {
        if ((e.key === 'f' || e.key === 'F') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !p.g.dialogue.active) void this.fire();
      };
      this.onKey = onKey;
      document.addEventListener('keydown', onKey);
      p.onDispose(() => document.removeEventListener('keydown', onKey));
    }
    if (o.readoutTitle !== null) this.readout = p.readout(o.readoutTitle ?? 'Dials');
    this.bolted.forEach((b, i) => { if (!b) this.setBolted(i, false, false); });
    this.layout();
  }

  // ---------------------------------------------------------------- geometry

  private shipAt(q: V3): V3 { return this.o.dims === 2 ? [q[0], q[1], 0.15] : [q[0], q[1], q[2]]; }

  /** Where the dials send the ship. */
  tipFor(dials: number[] = this.dials): V3 {
    let at = this.start;
    this.arrows.forEach((a, i) => { if (this.bolted[i]) at = add3(at, scale3(dials[i] ?? 0, a)); });
    return at;
  }
  get tip(): V3 { return this.tipFor(); }
  get previewVisible(): boolean { return this.previewOn; }
  /** The last place the ship landed (null before the first Fire). */
  get lastLanding(): V3 | null { return this.landed; }

  private dragPlane(): Plane {
    const [a, b] = this.arrows;
    const n = new Vector3(...a).cross(new Vector3(...b));
    if (this.o.dims === 2 || n.lengthSq() < 1e-9) return new Plane(new Vector3(0, 0, 1), -this.start[2]);
    return new Plane().setFromNormalAndCoplanarPoint(n.normalize(), new Vector3(...this.start));
  }

  /** Dials whose tip is nearest to world point q (two arrows). */
  weightsFor(q: V3): number[] {
    const [v, w] = this.arrows;
    const rel: V3 = [q[0] - this.start[0], q[1] - this.start[1], this.o.dims === 2 ? 0 : q[2] - this.start[2]];
    const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2], ww = w[0] * w[0] + w[1] * w[1] + w[2] * w[2], vw = v[0] * w[0] + v[1] * w[1] + v[2] * w[2];
    const qv = rel[0] * v[0] + rel[1] * v[1] + rel[2] * v[2], qw = rel[0] * w[0] + rel[1] * w[1] + rel[2] * w[2];
    const d = vv * ww - vw * vw;
    let a: number, b: number;
    if (Math.abs(d) > 1e-9 * Math.max(1, vv * ww)) { a = (qv * ww - qw * vw) / d; b = (qw * vv - qv * vw) / d; }
    else if (vv > 1e-12) { b = this.dials[1]; a = (qv - b * vw) / vv; }
    else { a = this.dials[0]; b = ww > 1e-12 ? qw / ww : 0; }
    const [lo, hi] = this.range;
    return [Math.max(lo, Math.min(hi, a)), Math.max(lo, Math.min(hi, b))];
  }

  // ---------------------------------------------------------------- state

  /** Set the dials (paints the glow along the way when the preview is visible). */
  setDials(d: number[], paint = true, syncInputs = true): void {
    const prev = this.dials.slice();
    this.dials = d.map((x, i) => (this.bolted[i] ? x : 0));
    if (paint && this.glow && this.previewOn) this.glow.trail(this.coefOf(prev), this.coefOf(this.dials));
    const key = this.dials.map((x) => Math.round(x / this.step)).join(',');
    if (key !== this.lastTickKey) { this.lastTickKey = key; sfx.tick(this.dials.reduce((s, x) => s + x, 0) / 2); }
    this.layout(syncInputs);
    this.o.onChange?.(this.dials.slice(), this.tip);
  }

  /** Glow coefficients for a dial setting (the glow holds up to three dials). */
  private coefOf(d: number[]): number[] { return [0, 1, 2].map((i) => d[i] ?? 0); }

  /** Snap the dials to the step (after a tip drag), with a short settle. */
  async settle(): Promise<void> {
    const s = this.step;
    const target = this.dials.map((x) => Math.round(x / s) * s);
    await this.moveDials(target, 160);
  }

  /** Animate the dials to new values (Show me), painting as they go. */
  async moveDials(target: number[], ms = 900): Promise<void> {
    const from = this.dials.slice();
    await animate(ms, (k) => this.setDials(from.map((x, i) => x + ((target[i] ?? 0) - x) * k)), ease.inOut);
    this.setDials(target);
  }

  /** Bolt or unbolt an arrow. */
  setBolted(i: number, on: boolean, notify = true): void {
    this.bolted[i] = on;
    if (!on) this.dials[i] = 0;
    const r = this.rows[i];
    if (r) {
      r.els.forEach((e) => { e.style.opacity = on ? '1' : '0.35'; });
      if (r.range) r.range.disabled = !on;
      if (r.cell) r.cell.disabled = !on;
    }
    this.layout();
    if (notify) this.o.onChange?.(this.dials.slice(), this.tip);
  }

  /** Show or hide the yellow preview tip. */
  setPreview(on: boolean): void { this.previewOn = on; this.layout(false); }

  /** Replace the arrows (a failover, the gimbals unlocking), optionally animated. */
  async setArrows(arrows: V3[], ms = 0): Promise<void> {
    const from = this.arrows.map((a) => a.slice() as V3);
    const apply = (k: number) => {
      this.arrows = from.map((a, i) => [0, 1, 2].map((j) => a[j] + (arrows[i][j] - a[j]) * k) as V3);
      this.glow?.setArrows(this.arrows.slice(0, 3));
      this.guides.forEach((g, i) => g.set(this.start, this.arrows[i]));
      this.layout(false);
    };
    if (ms > 0) await animate(ms, apply, ease.inOut);
    apply(1);
    this.o.onChange?.(this.dials.slice(), this.tip);
  }

  setLabels(syms: string[]): void { syms.forEach((s, i) => this.base[i]?.setLabel(`$${s}$`)); }

  /** Lay out arrows, tip, ship, inputs and readout for the current dials. */
  layout(syncInputs = true): void {
    const syms = this.o.symbols ?? ['\\mathbf v', '\\mathbf w', '\\mathbf u', '\\mathbf s'];
    let at = this.start;
    this.arrows.forEach((a, i) => {
      this.base[i].set(this.start, add3(this.start, a));
      const on = this.bolted[i];
      const k = on ? this.dials[i] : 0;
      const next = add3(at, scale3(k, a));
      this.chain[i].set(at, next);
      const vis = this.previewOn && on && Math.abs(k) > 1e-6 && Math.hypot(...a) > 1e-6;
      this.chain[i].setOpacity(vis ? 1 : 0);
      this.chain[i].setLabel(vis ? `$${texScaled(k, syms[i])}$` : ' ');
      this.base[i].setOpacity(on && this.o.baseArrows !== false ? (this.previewOn ? 0.4 : 0.9) : 0);
      at = next;
    });
    const tip = at;
    this.result.set(this.start, tip);
    this.result.setOpacity(this.previewOn ? 0.95 : 0);
    this.tipDot.at(tip);
    this.tipDot.setOpacity(this.previewOn ? 1 : 0);
    if (syncInputs) this.rows.forEach((r, i) => {
      if (r.range) r.range.value = String(this.dials[i]);
      if (r.cell && document.activeElement !== r.cell) r.cell.value = fmtDial(this.dials[i]);
    });
    this.updateReadout();
  }

  private updateReadout(): void {
    const r = this.readout;
    if (!r) return;
    const names = this.o.names ?? ['a', 'b', 'c', 'd'];
    const syms = this.o.symbols ?? ['\\mathbf v', '\\mathbf w', '\\mathbf u', '\\mathbf s'];
    const colors = this.o.colors ?? COLORS;
    this.arrows.forEach((a, i) => {
      r.row(`a${i}`, `$${syms[i]}$`, fmtV(this.o.dims === 2 ? a.slice(0, 2) : a), colors[i]);
      r.hideRow(`a${i}`, !this.bolted[i]);
    });
    r.row('d', 'dials', this.arrows.map((_, i) => (this.bolted[i] ? `$${names[i]} = ${fmtDial(this.dials[i])}$` : null)).filter(Boolean).join(', '));
    const tip = this.o.dims === 2 ? this.tip.slice(0, 2) : this.tip;
    r.row('t', this.previewOn ? 'tip lands at' : 'last landing', this.previewOn ? fmtV(tip) : this.landed ? fmtV(this.o.dims === 2 ? this.landed.slice(0, 2) : this.landed) : '?', C.result);
    const terms = this.arrows.map((a, i) => (this.bolted[i] ? `${fmtDial(this.dials[i])}\\,${MACRO[i]}{${texV(this.o.dims === 2 ? a.slice(0, 2) : a)}}` : null)).filter(Boolean);
    const size = terms.length >= 3 ? '\\footnotesize ' : '';
    r.eq(`${size}${terms.join(' + ').replace(/\+ -/g, '- ')} = \\cy{${this.previewOn ? texV(tip) : '?'}}`);
  }

  // ---------------------------------------------------------------- flying

  /** Fly the chain. Counts one move. Resolves with the outcome. */
  async fire(): Promise<Outcome> {
    if (this.stopped || this.flying || this.p.won) return;
    const refuse = this.o.beforeFire?.();
    if (refuse) { this.p.bark('lantern', refuse); sfx.miss(); return 'miss'; }
    this.flying = true;
    this.p.move();
    this.gap.clear();
    this.rows.forEach((r) => { if (r.range) r.range.disabled = true; if (r.cell) r.cell.disabled = true; });
    if (this.fireBtn) this.fireBtn.disabled = true;
    const end = await this.fly(this.dials);
    this.landed = end;
    this.fired++;
    if (!this.previewOn && (this.o.preview ?? 'auto') === 'auto' && this.p.difficulty === 'navigator' && this.p.g.settings.preview !== false) this.previewOn = true;
    const out = await this.o.onArrive?.(end, this.dials.slice());
    if (out !== 'win') {
      if (out === 'ok') sfx.success(); else sfx.miss();
      await wait(out === 'ok' ? 900 : 1100);
      await this.rewind();
    }
    this.flying = false;
    this.rows.forEach((r, i) => { if (r.range) r.range.disabled = !this.bolted[i]; if (r.cell) r.cell.disabled = !this.bolted[i]; });
    if (this.fireBtn) this.fireBtn.disabled = this.stopped;
    this.layout();
    this.afterFlight?.(end, out);
    return out;
  }

  /** Fly the ship along the legs of a dial setting, lighting the glow along its path. Returns where it ends. */
  async fly(dials: number[], msPerUnit = 260): Promise<V3> {
    const ship = this.ship;
    let at = this.start;
    const coef = [0, 0, 0];
    if (ship) await ship.ready;
    for (let i = 0; i < this.arrows.length; i++) {
      const k = this.bolted[i] ? dials[i] ?? 0 : 0;
      const a = this.arrows[i];
      const leg = scale3(k, a);
      const len = Math.hypot(...leg);
      if (len < 1e-6) continue;
      const from = at, to = add3(at, leg);
      const c0 = coef.slice();
      if (i < 3) coef[i] = k;
      const c1 = coef.slice();
      if (ship) {
        ship.face(leg);
        ship.setThrust(1);
        sfx.thrust(0.5);
        let lastK = 0;
        await animate(360 + msPerUnit * Math.min(5, len), (t) => {
          const q = add3(from, scale3(t, leg));
          ship.object.position.set(...this.shipAt(q));
          if (this.glow && i < 3) {
            const a0 = c0.map((x, j) => x + (c1[j] - x) * lastK), a1 = c0.map((x, j) => x + (c1[j] - x) * t);
            this.glow.trail(a0, a1);
          }
          lastK = t;
        }, ease.inOut);
        ship.setThrust(0.2);
      } else if (this.glow && i < 3) this.glow.trail(c0, c1);
      at = to;
    }
    return at;
  }

  /** Put the ship back at the start. */
  async rewind(ms = 650): Promise<void> {
    const ship = this.ship;
    if (!ship) return;
    const a = ship.object.position.clone(), b = new Vector3(...this.shipAt(this.start));
    await animate(ms, (k) => ship.object.position.lerpVectors(a, b, k), ease.inOut);
    const first = this.arrows.find((x, i) => this.bolted[i] && Math.hypot(...x) > 1e-6);
    if (first) ship.face(first);
  }

  /** Move the ship somewhere directly (cinematic use). */
  async shipTo(q: V3, ms = 1200): Promise<void> {
    const ship = this.ship;
    if (!ship) return;
    await ship.ready;
    const a = ship.object.position.clone(), b = new Vector3(...this.shipAt(q));
    const d = b.clone().sub(a);
    if (d.lengthSq() > 1e-9) ship.face([d.x, d.y, d.z]);
    ship.setThrust(1);
    await animate(ms, (k) => ship.object.position.lerpVectors(a, b, k), ease.inOut);
    ship.setThrust(0.2);
  }

  /** Retire the rig: Fire (button or F key) does nothing from now on. A flight already under way finishes. */
  stop(): void {
    this.stopped = true;
    if (this.onKey) { document.removeEventListener('keydown', this.onKey); this.onKey = null; }
    if (this.fireBtn) this.fireBtn.disabled = true;
  }

  get busy(): boolean { return this.flying; }
  get fires(): number { return this.fired; }
}

export { to3 };
