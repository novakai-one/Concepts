// A true orthographic projection of the three input coordinates, with a shared scale.
// Every moving mark represents the submitted vector, an angle, or an area construction.
import { s } from '../../../../lib/dom';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, type Handle } from '../../../core/tween';
import { dot, norm } from '../../../math/la';
import { type V3 } from '../../../game/types';
import { type CrossRound, plus, times, unit, normal, areaSquared, judge } from './practice-logic';

type P = [number, number];
const zero: V3 = [0, 0, 0];
const fmt = (x: number) => String(Math.round(x * 100) / 100);
const measure = (x: number) => `${Math.abs(x - Math.round(x * 100) / 100) > 1e-8 ? '≈ ' : ''}${fmt(x)}`;
export class CrossView {
  readonly el = h('section', { class: 'cp-figure', 'aria-label': 'Vector diagram' });
  private readonly svg = s('svg', { viewBox: '0 0 760 620', role: 'img', 'aria-label': 'Vectors in three dimensions' });
  private readonly caption = h('p', { class: 'cp-caption', 'aria-live': 'polite' });
  private r!: CrossRound;
  private n: V3 | null = null;
  private framePoints: V3[] = [];
  private az = -58;
  private elv = 28;
  private phase: 'idle' | 'v' | 'w' | 'area' | 'order' = 'idle';
  private portion = 1;
  private frame: Handle | null = null;
  private disposed = false;
  private best: [number, number] = [-58, 28];
  private controls: HTMLButtonElement[];
  private project!: (v: V3) => P;
  private resize = () => this.draw();

  constructor(private reduced: () => boolean) {
    window.addEventListener('resize', this.resize);
    this.controls = [['3D', -58, 28], ['Top', -90, 90], ['Side', -90, 0]].map(([name, a, e]) => {
      const b = button(String(name), () => {
        [this.az, this.elv] = name === '3D' ? this.best : [Number(a), Number(e)];
        this.controls.forEach(c => c.setAttribute('aria-pressed', String(c === b)));
        this.draw();
      }, { cls: 'ghost small' });
      b.setAttribute('aria-label', `${name} view`);
      b.setAttribute('aria-pressed', String(name === '3D'));
      return b;
    });
    this.el.append(h('div', { class: 'cp-viewbar' }, h('span', null, 'View'), ...this.controls), this.svg, this.caption);
  }
  set(r: CrossRound) {
    this.frame?.cancel(); this.r = r; this.n = null; this.phase = 'idle';
    // Avoid an edge-on plane without inventing different geometry. Also keep the normal
    // visible, rather than choosing a face-on view that hides its length.
    let bestScore = -Infinity;
    const n = unit(normal(r));
    for (const az of [-160, -125, -90, -58, -20, 35, 75, 120, 160]) for (const el of [20, 35, 50, 65]) {
      const a = az * Math.PI / 180, e = el * Math.PI / 180;
      const camera: V3 = [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
      const facing = Math.abs(dot(n, camera));
      // Keep enough of the plane face visible to read its base/height construction.
      if (norm(n) > 0 && (facing < .5 || facing > .85)) continue;
      const projected = (x: V3) => plus(unit(x), times(camera, -dot(unit(x), camera)));
      const pv = projected(r.v), pw = projected(r.w), pn = projected(n);
      const separation = (a: V3, b: V3) => 1 - Math.abs(dot(unit(a), unit(b)));
      // A visible plane is insufficient: its normal must not project onto either edge.
      const score = Math.min(separation(pv, pw), separation(pv, pn), separation(pw, pn))
        + .2 * Math.min(norm(pv), norm(pw), norm(pn)) - .1 * Math.abs(facing - .65);
      if (score > bestScore) { bestScore = score; this.best = [az, el]; }
    }
    [this.az, this.elv] = this.best;
    this.controls.forEach((c, i) => c.setAttribute('aria-pressed', String(i === 0)));
    const referenceLength = r.task === 'direction' ? Math.max(norm(r.v), norm(r.w)) : Math.sqrt(areaSquared(r));
    const reference = times(n, referenceLength);
    this.framePoints = [reference, times(reference, -1)];
    this.caption.textContent = 'Type a vector to see it here.';
    this.draw();
  }
  dispose() { this.disposed = true; this.frame?.cancel(); window.removeEventListener('resize', this.resize); this.el.remove(); }
  private async move(ms: number, fn: (k: number) => void) {
    this.frame = animate(this.reduced() ? 0 : ms, k => { if (!this.disposed) { fn(k); this.draw(); } });
    await this.frame;
  }
  async test(n: V3) {
    // Keep framing steady across ordinary attempts. Extreme entries can expand the view,
    // but previous attempts remain in the bounds, so retrying never makes the plane jump.
    this.framePoints.push(n);
    this.phase = 'idle';
    const before = this.n ?? zero;
    this.caption.textContent = 'Your vector n.';
    await this.move(650, k => { this.n = plus(times(before, 1 - k), times(n, k)); });
    if (this.disposed) return;
    this.n = n;
    if (norm(n) > 1e-9) {
      for (const name of ['v', 'w'] as const) {
        this.phase = name;
        const v = this.r[name], cosine = Math.max(-1, Math.min(1, dot(n, v) / (norm(n) * norm(v))));
        this.caption.textContent = `Angle between n and ${name}: ${fmt(Math.acos(cosine) * 180 / Math.PI)}° · n · ${name} = ${fmt(dot(n, v))}`;
        await this.move(750, k => { this.portion = k; });
        if (this.disposed) return;
      }
    }
    this.caption.textContent = norm(n) < 1e-9 ? 'The zero vector has no direction.' : 'Right-angle marks appear only where the dot product is zero.';
    this.phase = 'idle'; this.draw();
  }
  async area() {
    this.phase = 'area';
    this.caption.textContent = areaSquared(this.r) < 1e-9
      ? 'The base moves along the same line, sweeping out zero area.'
      : 'The base sweeps out the parallelogram; height is perpendicular to the base.';
    await this.move(1300, k => { this.portion = k; });
    this.portion = 1; this.draw();
  }
  async order() {
    if (areaSquared(this.r) < 1e-9) return;
    this.phase = 'order';
    this.caption.textContent = 'Curl your right fingers from v to w; your thumb chooses the normal direction.';
    await this.move(1400, k => { this.portion = k; });
  }
  private draw() {
    if (!this.r || this.disposed) return;
    this.svg.setAttribute('viewBox', matchMedia('(max-width: 850px)').matches ? '70 60 620 500' : '0 0 760 620');
    const { v, w } = this.r;
    const az = this.az * Math.PI / 180, el = this.elv * Math.PI / 180;
    const right: V3 = [-Math.sin(az), Math.cos(az), 0];
    const up: V3 = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), Math.cos(el)];
    const raw = (a: V3): P => [dot(a, right), -dot(a, up)];
    const reach = Math.max(2, norm(v), norm(w), norm(plus(v, w)), ...this.framePoints.map(norm));
    const axes: V3[] = [[reach * .65, 0, 0], [0, reach * .65, 0], [0, 0, reach * .65]];
    const foot = times(v, dot(w, v) / dot(v, v));
    const pts = [zero, v, w, plus(v, w), foot, ...axes, ...this.framePoints].map(raw);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(540 / Math.max(3, maxX - minX), 430 / Math.max(3, maxY - minY));
    this.project = a => { const p = raw(a); return [380 + (p[0] - (minX + maxX) / 2) * scale, 308 + (p[1] - (minY + maxY) / 2) * scale]; };
    const defs = s('defs');
    for (const [name, color] of [['v', C.v], ['w', C.w], ['n', C.result], ['trace', C.white]]) {
      defs.append(s('marker', { id: `cp-arrow-${name}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: color })));
    }
    this.svg.replaceChildren(defs);
    this.svg.setAttribute('aria-label', `v = ${v.join(', ')}, w = ${w.join(', ')}${this.n ? `, your n = ${this.n.map(fmt).join(', ')}` : ''}. ${this.caption.textContent}`);
    const line = (a: V3, b: V3, color: string, width = 1.5, dash = '') => {
      const [x1, y1] = this.project(a), [x2, y2] = this.project(b);
      const l = s('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': width, 'stroke-dasharray': dash });
      this.svg.append(l); return l;
    };
    const text = (at: V3, label: string, dx = 0, dy = -12, cls = '') => {
      const [x, y] = this.project(at);
      this.svg.append(s('text', { x: x + dx, y: y + dy, class: cls }, label));
    };
    const dimension = (a: V3, b: V3, awayFrom: V3, label: string) => {
      const pa = this.project(a), pb = this.project(b), pi = this.project(awayFrom);
      const dx = pb[0] - pa[0], dy = pb[1] - pa[1], length = Math.hypot(dx, dy);
      if (length < 3) return;
      const mid: P = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
      const outward = (-dy * (pi[0] - mid[0]) + dx * (pi[1] - mid[1])) > 0 ? -1 : 1;
      this.svg.append(s('text', {
        x: mid[0] - dy / length * outward * 32, y: mid[1] + dx / length * outward * 32 + 5,
        class: 'cp-measure', 'text-anchor': 'middle',
      }, label));
    };
    axes.forEach((a, i) => { line(times(a, -.28), a, '#344151', 1, '4 5'); text(a, ['x', 'y', 'z'][i], 10, 6, 'cp-axis-label'); });
    const q = this.phase === 'area' ? this.portion : 1;
    const qw = times(w, q);
    const polygon = s('polygon', { points: [zero, v, plus(v, qw), qw].map(p => this.project(p).join(',')).join(' '), fill: '#a8bdd6', 'fill-opacity': .1, stroke: '#889bb3', 'stroke-opacity': .5, 'stroke-width': 1 });
    this.svg.append(polygon);
    if (this.phase === 'area') {
      line(qw, plus(v, qw), C.white, 2);
      line(foot, w, C.white, 2, '5 5');
      if (dot(w, v) < 0) line(foot, zero, '#889bb3', 1, '4 5');
      dimension(zero, v, w, `base ${measure(norm(v))}`);
      dimension(foot, w, zero, `height ${measure(norm(plus(w, times(foot, -1))))}`);
      const u = unit(v), height = unit(plus(w, times(foot, -1))), d = reach * .05;
      if (norm(height) > 0) {
        line(plus(foot, times(u, d)), plus(plus(foot, times(u, d)), times(height, d)), C.white);
        line(plus(plus(foot, times(u, d)), times(height, d)), plus(foot, times(height, d)), C.white);
      }
    }
    const arrow = (a: V3, name: string, color: string, labelDy: number) => {
      const origin = this.project(zero), end = this.project(a);
      if (Math.hypot(end[0] - origin[0], end[1] - origin[1]) < 3) {
        if (norm(a) > 1e-9) {
          const toward = dot(a, [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)]) > 0;
          this.svg.append(s('circle', { cx: end[0], cy: end[1], r: 9, fill: '#0b111d', stroke: color, 'stroke-width': 2 }), s('text', { x: end[0], y: end[1] + 5, 'text-anchor': 'middle', class: 'cp-endon' }, toward ? '•' : '×'));
          text(a, `${name} ${toward ? 'toward you' : 'away from you'}`, 18, labelDy);
        } else if (name === 'n') { text(zero, 'n = 0', -50, -20); }
        return;
      }
      const l = line(zero, a, color, name === 'n' ? 3 : 2.5);
      l.setAttribute('marker-end', `url(#cp-arrow-${name})`);
      l.append(s('title', null, `${name} = [${a.map(fmt).join(', ')}]`));
      text(a, name, 14, labelDy, 'cp-vector-label');
    };
    arrow(v, 'v', C.v, 22); arrow(w, 'w', C.w, -16);
    if (this.n) {
      arrow(this.n, 'n', C.result, -14);
      const result = judge(this.r, this.n);
      [v, w].forEach((edge, i) => {
        if (!result.perpendicular[i]) return;
        const a = times(unit(edge), reach * .045), b = times(unit(this.n!), reach * .045);
        line(a, plus(a, b), C.white, 1.7); line(plus(a, b), b, C.white, 1.7);
      });
    }
    if ((this.phase === 'v' || this.phase === 'w') && this.n && norm(this.n) > 0) {
      this.arc(this.n, this.r[this.phase], reach * .22, this.portion, false);
    }
    if (this.phase === 'order') this.arc(v, w, Math.min(norm(v), norm(w)) * .55, this.portion, true);
    const [ox, oy] = this.project(zero);
    this.svg.append(s('circle', { cx: ox, cy: oy, r: 3, fill: '#e8f1ff' }));
  }
  private arc(a: V3, b: V3, radius: number, portion: number, arrow: boolean) {
    const u = unit(a), v = unit(b), cosine = Math.max(-1, Math.min(1, dot(u, v)));
    const theta = Math.acos(cosine);
    if (theta < .001 || Math.abs(Math.sin(theta)) < 1e-5) return;
    const side = unit(plus(v, times(u, -cosine)));
    const pts = Array.from({ length: 41 }, (_, i) => {
      const t = theta * portion * i / 40;
      return this.project(times(plus(times(u, Math.cos(t)), times(side, Math.sin(t))), radius)).join(',');
    });
    this.svg.append(s('polyline', { points: pts.join(' '), fill: 'none', stroke: C.white, 'stroke-width': 2, 'stroke-dasharray': arrow ? '' : '3 4', 'marker-end': arrow ? 'url(#cp-arrow-trace)' : undefined }));
  }
}
