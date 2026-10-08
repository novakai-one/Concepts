// A character on the comm channel: a holographic voice-print ring in the character's colour.
// The ring of bars follows the live loudness of their voice; the centre shows their sigil.
import { audio } from '../audio/audio';

export interface CastMember {
  name: string; role: string; color: string; voice: string; sigil: string; speed?: number;
  /** 'ring' (default): voice bars round a ring. 'dots': an 8×8 dot matrix (a computer). 'static': a noisy channel. */
  style?: 'ring' | 'dots' | 'static';
  /** For 'static': how noisy the channel is (0..1). */
  noise?: number;
}

export class Portrait {
  readonly canvas: HTMLCanvasElement;
  private raf = 0;
  private level = 0;
  private who: CastMember | null = null;
  private t0 = performance.now();
  speaking = false;

  constructor(size = 104) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'portrait';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = this.canvas.height = size * dpr;
    this.canvas.style.width = this.canvas.style.height = `${size}px`;
    const loop = () => { this.raf = requestAnimationFrame(loop); this.draw(); };
    this.raf = requestAnimationFrame(loop);
  }

  set(who: CastMember): void { this.who = who; }

  private draw(): void {
    const c = this.canvas.getContext('2d');
    if (!c || !this.who) return;
    const W = this.canvas.width, R = W / 2;
    const t = (performance.now() - this.t0) / 1000;
    const live = this.speaking ? audio.voiceLevel() : 0;
    // fall back to a gentle synthetic level when speaking without audio
    const target = this.speaking ? Math.max(live, 0.18 + 0.12 * Math.sin(t * 9) * Math.sin(t * 3.7)) : 0;
    this.level += (target - this.level) * 0.25;
    c.clearRect(0, 0, W, W);
    const col = this.who.color;
    if (this.who.style === 'dots') { this.drawDots(c, W, t); return; }
    // backdrop disc
    const g = c.createRadialGradient(R, R, R * 0.1, R, R, R);
    g.addColorStop(0, hexA(col, 0.22));
    g.addColorStop(0.6, hexA(col, 0.06));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.fill();
    // scan lines
    c.strokeStyle = hexA(col, 0.06);
    c.lineWidth = 1;
    for (let y = (t * 20) % 6; y < W; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // a noisy channel: speckle over everything, scaled by `noise`
    if (this.who.style === 'static') {
      const n = this.who.noise ?? 0.5;
      for (let i = 0; i < 260 * n; i++) {
        c.fillStyle = hexA(col, Math.random() * 0.5 * n);
        c.fillRect(Math.random() * W, Math.random() * W, W / 50, W / 160);
      }
    }
    // voice bars
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const wob = 0.5 + 0.5 * Math.sin(i * 1.7 + t * 6) * Math.sin(i * 0.6 - t * 4.3);
      const len = R * (0.06 + 0.28 * this.level * wob + 0.02 * Math.sin(t * 2 + i));
      const r0 = R * 0.6;
      c.strokeStyle = hexA(col, 0.35 + 0.6 * this.level);
      c.lineWidth = Math.max(1, W / 90);
      c.beginPath();
      c.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0);
      c.lineTo(R + Math.cos(a) * (r0 + len), R + Math.sin(a) * (r0 + len));
      c.stroke();
    }
    // rings
    c.strokeStyle = hexA(col, 0.9);
    c.lineWidth = Math.max(1.5, W / 70);
    c.beginPath(); c.arc(R, R, R * 0.55, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = hexA(col, 0.35);
    c.lineWidth = 1;
    c.beginPath(); c.arc(R, R, R * 0.47, t * 0.6, t * 0.6 + Math.PI * 1.4); c.stroke();
    // sigil
    c.fillStyle = hexA(col, 0.95);
    c.font = `600 ${Math.round(R * 0.5)}px 'Space Grotesk Variable', system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = col;
    c.shadowBlur = R * 0.25 * (0.4 + this.level);
    c.fillText(this.who.sigil, R, R + R * 0.02);
    c.shadowBlur = 0;
  }

  /** A computer: an 8×8 grid of dots that light in reading order with the voice. */
  private drawDots(c: CanvasRenderingContext2D, W: number, t: number): void {
    const col = this.who!.color;
    const n = 8, pad = W * 0.2, step = (W - 2 * pad) / (n - 1);
    c.strokeStyle = hexA(col, 0.5);
    c.lineWidth = Math.max(1, W / 90);
    c.beginPath(); c.arc(W / 2, W / 2, W * 0.47, 0, Math.PI * 2); c.stroke();
    const lit = Math.floor((t * 22) % 64);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = i * n + j;
      const on = this.speaking ? ((k * 37 + lit * 11) % 64) < 18 + this.level * 40 : k === lit;
      c.fillStyle = hexA(col, on ? 0.95 : 0.16);
      c.beginPath(); c.arc(pad + j * step, pad + i * step, W / 46 * (on ? 1.25 : 1), 0, Math.PI * 2); c.fill();
    }
  }

  dispose(): void { cancelAnimationFrame(this.raf); this.canvas.remove(); }
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
