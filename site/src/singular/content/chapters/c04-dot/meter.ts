// The dish meter as a HUD gauge: zero in the middle, the reading as a bar to the right (positive) or
// left (negative), the exact number beside it. Shared by Chapters 4 and 5 (RAISE uses two of them).
import { h, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';

const POS = '#59e1ff';   // LANTERN cyan
const NEG = '#ffb347';   // amber: the shadow points back
const ZERO = '#e8f1ff';

export class Gauge {
  readonly el: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly val: HTMLElement;
  private readonly zero: HTMLElement;
  private readonly lab: HTMLElement;
  max: number;
  private wasZero = false;

  constructor(label: string, o: { max: number; zeroTol?: number } = { max: 10 }) {
    this.max = o.max;
    this.lab = h('span', { style: 'font-size:13px;color:var(--ink-2);white-space:nowrap', html: inline(label) });
    this.fill = h('div', { style: `position:absolute;top:1px;bottom:1px;left:50%;width:0;border-radius:3px;background:${POS};box-shadow:0 0 10px ${POS}88;transition:width .08s,left .08s,background .2s` });
    this.zero = h('div', { style: `position:absolute;top:-4px;bottom:-4px;left:calc(50% - 1px);width:2px;background:${ZERO};opacity:.55;border-radius:1px;transition:box-shadow .2s,opacity .2s` });
    const track = h('div', { style: 'position:relative;flex:1;height:10px;min-width:120px;border-radius:5px;background:rgba(232,241,255,0.07);border:1px solid rgba(232,241,255,0.12)' }, this.fill, this.zero);
    this.val = h('span', { style: 'font-family:var(--mono);font-size:14px;min-width:58px;text-align:right' });
    this.el = h('div', { style: 'display:flex;flex-direction:column;gap:5px' },
      this.lab,
      h('div', { style: 'display:flex;align-items:center;gap:10px' }, track, this.val));
  }

  setLabel(s: string): void { this.lab.innerHTML = inline(s); }

  /** Show a reading. `text` overrides the number shown. Returns true the moment it reaches zero. */
  set(x: number, text?: string, tol = 1e-6): boolean {
    const k = Math.max(-1, Math.min(1, x / (this.max || 1)));
    const w = Math.abs(k) * 50;
    this.fill.style.width = `${w}%`;
    this.fill.style.left = k >= 0 ? '50%' : `${50 - w}%`;
    const c = k >= 0 ? POS : NEG;
    this.fill.style.background = c;
    this.fill.style.boxShadow = `0 0 10px ${c}88`;
    this.val.textContent = text ?? fmtNum(x);
    this.val.style.color = Math.abs(x) <= tol ? ZERO : c;
    const isZero = Math.abs(x) <= tol;
    this.zero.style.opacity = isZero ? '1' : '.55';
    this.zero.style.boxShadow = isZero ? `0 0 12px 3px ${ZERO}` : 'none';
    const hit = isZero && !this.wasZero;
    this.wasZero = isZero;
    return hit;
  }
}

/** Two decimals at most, no trailing zeros, a real minus sign. */
export function fmtNum(x: number, dp = 2): string {
  if (Math.abs(x) < 0.5 * 10 ** -dp) return '0';
  const s = x.toFixed(dp).replace(/\.?0+$/, '');
  return s.replace('-', '−');
}

/** A clear chime: two arrows at a right angle. */
export function chime(): void { sfx.snap(); sfx.star(2); }

/** Put gauges in a readout card, after its rows and before its formula and note. */
export function addGauges(r: { el: HTMLElement }, ...gs: Gauge[]): void {
  const before = r.el.querySelector('.eq');
  for (const g of gs) r.el.insertBefore(g.el, before);
}
