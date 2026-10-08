// Pure helpers for Laws and the Shake (no DOM, no three), so Node unit tests can import them.

/** Seeded random numbers (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LawCore<C> {
  id: string;
  gen(rng: () => number): C;
  edgeCases: C[];
  holds(filled: Record<string, string>, c: C): boolean;
  describe(c: C): string;
}

/** Fire n random cases plus the edge cases at a filled Law. */
export function checkLaw<C>(L: LawCore<C>, filled: Record<string, string>, n = 500, seed = 0xa11): { survived: boolean; counterexample?: string } {
  const r = rng(seed + L.id.length * 31);
  const cases: C[] = [...L.edgeCases];
  for (let i = 0; i < n; i++) cases.push(L.gen(r));
  for (const c of cases) if (!L.holds(filled, c)) return { survived: false, counterexample: L.describe(c) };
  return { survived: true };
}

/** Random whole number in [lo, hi]. */
export const rint = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
