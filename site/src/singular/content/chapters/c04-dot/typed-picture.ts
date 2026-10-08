// Motion is the calculation: perpendicular projection, addition of its two contributions,
// or the side joining vector endpoints. No handles, ships, confetti or success effects.
import type { PuzzleCtx, V3 } from '../../../game/types';
import type { Vec } from '../../../math/la';
import { dot, norm } from '../../../math/la';
import { PlaneView } from '../../../kit/plain';
import { FatLine } from '../../../gfx/lines';
import { AngleArc, RightAngle } from '../../../kit/geom';
import { animate, ease } from '../../../core/tween';
import { tlen } from '../../../kit/plain/tex';
import { number as tnp } from './typed-tex';
import { difference, degreesOf } from './typed-data';
const p3 = (v: Vec): V3 => [v[0], v[1], 0.04];
export class DotPicture {
  private drop: FatLine;
  private arc: AngleArc;
  private between: AngleArc;
  private square: RightAngle;
  private dead = false;
  get live(): boolean {
    return !this.dead;
  }
  constructor(
    private p: PuzzleCtx,
    readonly view: PlaneView,
  ) {
    this.drop = new FatLine(
      p.g.stage,
      [
        [0, 0, 0],
        [0, 0, 0],
      ],
      { color: '#b9c9de', width: 1.4, dashed: true, opacity: 0 },
    );
    p.add(this.drop);
    this.arc = new AngleArc(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], { label: '$\\theta$', fill: 0.04 });
    this.between = new AngleArc(p, [0, 0, 0], [1, 0, 0], [0, 1, 0], { fill: 0.06 });
    this.square = new RightAngle(p, [0, 0, 0], [1, 0, 0], [0, 1, 0]);
    this.between.show(false);
    this.arc.show(false);
    this.square.show(false);
    p.onDispose(() => {
      this.dead = true;
    });
  }
  async set(v: Vec, w: Vec, triangle = false): Promise<void> {
    if (this.dead) return;
    this.view.clear();
    this.drop.setOpacity(0);
    this.square.show(false);
    this.arc.show(false);
    this.between.show(false);
    this.view.arrow('v', 'g').set(v, [0, 0]).label('$\\mathbf v$');
    if (norm(v) < 1e-9) this.view.arrow('v').hide();
    this.view.arrow('w', 'b').set(w, [0, 0]).label('$\\mathbf w$');
    if (triangle) this.view.arrow('gap', 'y').set(difference(v, w), w).label('$\\mathbf v-\\mathbf w$');
    this.arc.set(p3(v), p3(w));
    this.arc.show(triangle);
    await this.view.frame([v, w], { ms: 0, min: 1.5 });
  }
  /** The typed v grows from the origin; then the angle between v and w, or a right-angle mark when v·w = 0. */
  async reveal(v: Vec, w: Vec): Promise<void> {
    await this.set([0, 0], w);
    if (this.dead || norm(v) < 1e-9) return;
    await this.view.frame([v, w], { ms: 200, min: 1.5 });
    await this.view.arrow('v', 'g').grow(v, { from: [0, 0], ms: this.ms(450) });
    if (this.dead) return;
    this.view.arrow('v', 'g').label('$\\mathbf v$');
    if (Math.abs(dot(v, w)) <= 1e-8 * norm(v) * norm(w)) {
      this.square.size = 16 / this.view.ppu;
      this.square.set([0, 0, 0.04], p3(w), p3(v));
      this.square.show(true);
    } else {
      this.between.set(p3(v), p3(w));
      this.between.show(true);
    }
  }
  private ms(n: number): number {
    return this.p.g.headless ? 1 : this.p.g.settings.reduceMotion ? Math.min(n, 160) : n;
  }
  async project(
    v: Vec,
    w: Vec,
    parts = false,
    guess?: number,
    progress?: (part: 1 | 2) => void,
  ): Promise<void> {
    await this.set(v, w);
    if (this.dead) return;
    const denom = dot(w, w),
      factor = dot(v, w) / denom;
    const foot: Vec = [factor * w[0], factor * w[1]];
    this.view.line(w, { kind: 'b' });
    const prediction: Vec | undefined =
      guess === undefined ? undefined : [(guess * w[0]) / denom, (guess * w[1]) / denom];
    await this.view.frame([v, w, foot, ...(prediction ? [prediction] : [])], { ms: 200, min: 1.5 });
    this.drop.setOpacity(0.65);
    await animate(
      this.ms(650),
      (k) => {
        if (!this.dead)
          this.drop.setPoints([p3(v), p3([v[0] + k * (foot[0] - v[0]), v[1] + k * (foot[1] - v[1])])]);
      },
      ease.inOut,
    );
    if (this.dead) return;
    if (parts) {
      // These arrows are geometric projections, not dot-product numbers pretending to be lengths.
      const k1 = (v[0] * w[0]) / denom,
        one: Vec = [k1 * w[0], k1 * w[1]];
      const two: Vec = [foot[0] - one[0], foot[1] - one[1]];
      await this.view.frame([v, w, foot, one, ...(prediction ? [prediction] : [])], { ms: 200, min: 1.5 });
      this.view.arrow('v').hide();
      progress?.(1);
      await this.view.arrow('coordinate', 'w').grow([v[0], 0], { from: [0, 0], ms: this.ms(400) });
      await this.view.arrow('part1', 'y').grow(one, { from: [0, 0], ms: this.ms(500) });
      this.view.arrow('coordinate').hide();
      progress?.(2);
      await this.view.arrow('coordinate', 'w').grow([0, v[1]], { from: [v[0], 0], ms: this.ms(400) });
      await this.view.arrow('part2', 'w').grow(two, { from: one, ms: this.ms(500) });
      this.view.arrow('coordinate').hide();
      this.view.arrow('v', 'g').set(v, [0, 0]).label('$\\mathbf v$');
      this.view.arrow('part1').hide();
      this.view.arrow('part2').hide();
    }
    if (this.dead) return;
    this.view.arrow('projection', 'y').set(foot, [0, 0]).label('$\\mathbf p$');
    if (prediction && Math.abs(guess! - dot(v, w)) > 1e-8)
      this.view.arrow('prediction', 'o').set(prediction, [0, 0]).label('Your number');
    if (norm(foot) < 1e-9) {
      this.view.arrow('projection').hide();
      this.view.mark([0, 0], '$0$', 'y', true);
    }
    const gap = difference(v, foot);
    this.square.size = 14 / this.view.ppu;
    this.square.set(p3(foot), p3(w), p3(gap));
    this.square.show(norm(gap) > 1e-6);
    // A separate signed length states the conversion; it never labels this arrow as v·w.
    if (norm(foot) > 1e-9)
      this.view.note([foot[0] / 2, foot[1] / 2], `$\\frac{${tnp(dot(v, w))}}{${tlen(w)}}$`, { dy: 30 });
  }
  async triangle(v: Vec, w: Vec, side = false): Promise<void> {
    await this.set(v, w, true);
    if (this.dead) return;
    if (side) await this.view.arrow('gap', 'y').grow(difference(v, w), { from: w, ms: this.ms(700) });
  }
  async angle(v: Vec, w: Vec, answer: number): Promise<void> {
    await this.set(v, w, true);
    if (this.dead) return;
    const base = Math.atan2(w[1], w[0]);
    const orientation = w[0] * v[1] - w[1] * v[0] >= 0 ? 1 : -1;
    const theta = (Math.max(0, Math.min(180, answer)) * Math.PI) / 180;
    const tip: Vec = [
      norm(v) * Math.cos(base + orientation * theta),
      norm(v) * Math.sin(base + orientation * theta),
    ];
    await this.view.frame([v, w, tip], { ms: 200, min: 1.5 });
    await this.view.arrow('prediction', 'o').grow(tip, { from: [0, 0], ms: this.ms(600) });
    this.view.arrow('prediction', 'o').label('Your angle');
    if (Math.abs(answer - degreesOf(v, w)) < 0.06) this.view.arrow('prediction').hide();
  }
}
