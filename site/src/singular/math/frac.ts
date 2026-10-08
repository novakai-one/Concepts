// Exact rational numbers. Row reduction, inverses and determinants shown to the player use these,
// so the numbers on screen are exact (1/3, not 0.3333).

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

export class Frac {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d = 1) {
    if (d === 0) throw new Error('Frac: zero denominator');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      const f = Frac.from(n / d);
      this.n = f.n; this.d = f.d;
      return;
    }
    const g = gcd(n, d);
    const s = d < 0 ? -1 : 1;
    this.n = (s * n) / g;
    this.d = (s * d) / g;
    if (Object.is(this.n, -0)) this.n = 0;
  }

  static readonly ZERO = new Frac(0);
  static readonly ONE = new Frac(1);

  /** Nearest fraction with denominator up to maxDen (continued fractions). Integers stay exact. */
  static from(x: number | Frac, maxDen = 1000): Frac {
    if (x instanceof Frac) return x;
    if (!Number.isFinite(x)) throw new Error('Frac.from: not finite');
    if (Number.isInteger(x)) return new Frac(x, 1);
    const sign = x < 0 ? -1 : 1;
    let v = Math.abs(x);
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0;
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(v);
      const h2 = a * h1 + h0, k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      const rem = v - a;
      if (rem < 1e-12) break;
      v = 1 / rem;
    }
    return new Frac(sign * h1, k1);
  }

  add(o: Frac | number): Frac { const b = Frac.from(o); return new Frac(this.n * b.d + b.n * this.d, this.d * b.d); }
  sub(o: Frac | number): Frac { const b = Frac.from(o); return new Frac(this.n * b.d - b.n * this.d, this.d * b.d); }
  mul(o: Frac | number): Frac { const b = Frac.from(o); return new Frac(this.n * b.n, this.d * b.d); }
  div(o: Frac | number): Frac {
    const b = Frac.from(o);
    if (b.n === 0) throw new Error('Frac: divide by zero');
    return new Frac(this.n * b.d, this.d * b.n);
  }
  neg(): Frac { return new Frac(-this.n, this.d); }
  inv(): Frac { return new Frac(this.d, this.n); }
  isZero(): boolean { return this.n === 0; }
  isOne(): boolean { return this.n === 1 && this.d === 1; }
  isInt(): boolean { return this.d === 1; }
  eq(o: Frac | number): boolean { const b = Frac.from(o); return this.n === b.n && this.d === b.d; }
  sign(): number { return Math.sign(this.n); }
  value(): number { return this.n / this.d; }

  /** "3", "-1/2" */
  toString(): string { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
  /** "3", "-\\tfrac{1}{2}" */
  toTex(): string {
    if (this.d === 1) return String(this.n);
    const s = this.n < 0 ? '-' : '';
    return `${s}\\tfrac{${Math.abs(this.n)}}{${this.d}}`;
  }
}

export type FMat = Frac[][];

export const fmat = (m: (number | Frac)[][]): FMat => m.map((r) => r.map((x) => Frac.from(x)));
export const fnum = (m: FMat): number[][] => m.map((r) => r.map((x) => x.value()));
export const fclone = (m: FMat): FMat => m.map((r) => r.slice());

/** Format any number nicely: integers as-is, simple fractions as a/b, otherwise 2 decimals. */
export function nice(x: number, maxDen = 12): string {
  if (Math.abs(x) < 1e-9) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  const f = Frac.from(x, maxDen);
  if (Math.abs(f.value() - x) < 1e-9) return f.toString();
  return x.toFixed(2);
}

export function niceTex(x: number, maxDen = 12): string {
  if (Math.abs(x) < 1e-9) return '0';
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  const f = Frac.from(x, maxDen);
  if (Math.abs(f.value() - x) < 1e-9) return f.toTex();
  return x.toFixed(2);
}
