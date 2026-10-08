// The small fit board for the twin view: readings as dots, the current line, each vertical leftover as a
// segment and a faint square. Drawn as SVG in the dock, beside the data-space picture in the world.
import { h } from '../../../ui/ui';
import { C } from '../../../core/theme';

export interface BoardOpts { pts: number[][]; tRange: [number, number]; yRange: [number, number]; title?: string }

export class MiniBoard {
  readonly el: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly o: BoardOpts;
  constructor(o: BoardOpts) {
    this.o = o;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'a8-board');
    this.svg.setAttribute('viewBox', '0 0 300 170');
    this.el = h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, h('div', { class: 'kicker' }, o.title ?? 'The readings'), this.svg as unknown as HTMLElement);
  }
  private X(t: number): number { const [a, b] = this.o.tRange; return 30 + ((t - a) / (b - a)) * 255; }
  private Y(y: number): number { const [a, b] = this.o.yRange; return 150 - ((y - a) / (b - a)) * 135; }
  /** Draw the line y = c0 + c1 t. */
  set(c0: number, c1: number): void {
    const { pts, tRange, yRange } = this.o;
    const axes: string[] = [];
    const plot: string[] = [];
    axes.push('<line x1="30" y1="150" x2="290" y2="150" stroke="rgba(160,190,230,0.35)" stroke-width="1"/>');
    axes.push('<line x1="30" y1="12" x2="30" y2="150" stroke="rgba(160,190,230,0.35)" stroke-width="1"/>');
    for (let t = Math.ceil(tRange[0]); t <= tRange[1]; t++) axes.push(`<text x="${this.X(t) - 3}" y="163">${t}</text>`);
    for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y += 1) axes.push(`<text x="14" y="${this.Y(y) + 3}">${y}</text>`);
    axes.push('<text class="t" x="280" y="144">t</text><text class="t" x="36" y="20">y</text>');
    const sy = 135 / (yRange[1] - yRange[0]);
    for (const [t, y] of pts) {
      const yl = c0 + c1 * t, r = y - yl;
      const col = r >= 0 ? C.v : C.w;
      const side = Math.abs(r) * sy;
      plot.push(`<rect x="${this.X(t)}" y="${Math.min(this.Y(y), this.Y(yl))}" width="${side}" height="${side}" fill="${col}" fill-opacity="0.12" stroke="${col}" stroke-opacity="0.45" stroke-width="0.8"/>`);
      plot.push(`<line x1="${this.X(t)}" y1="${this.Y(y)}" x2="${this.X(t)}" y2="${this.Y(yl)}" stroke="${col}" stroke-width="2"/>`);
    }
    plot.push(`<line x1="${this.X(tRange[0])}" y1="${this.Y(c0 + c1 * tRange[0])}" x2="${this.X(tRange[1])}" y2="${this.Y(c0 + c1 * tRange[1])}" stroke="${C.result}" stroke-width="2.4"/>`);
    for (const [t, y] of pts) plot.push(`<circle cx="${this.X(t)}" cy="${this.Y(y)}" r="3.6" fill="${C.white}"/>`);
    this.svg.innerHTML = `<defs><clipPath id="a8clip"><rect x="30" y="8" width="262" height="143"/></clipPath></defs>${axes.join('')}<g clip-path="url(#a8clip)">${plot.join('')}</g>`;
  }
}
