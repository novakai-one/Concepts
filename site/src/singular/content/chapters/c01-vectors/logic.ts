// Chapter 1's old Doubt predicates, used only by briefing.ts (kept for the prototype chapter c90).

/** "East then north lands somewhere different from north then east." (false for every case) */
export const ordersDiffer = (a: number[], b: number[]) => Math.hypot(a[0] + b[0] - (b[0] + a[0]), a[1] + b[1] - (b[1] + a[1])) > 1e-9;

/** "A negative amount flips the arrow but keeps it on the same line." (Vacuous for k >= 0.) */
export const negFlipHolds = (v: number[], k: number) => {
  if (k >= 0) return true;
  const kv = [k * v[0], k * v[1]];
  return Math.abs(v[0] * kv[1] - v[1] * kv[0]) < 1e-9 && v[0] * kv[0] + v[1] * kv[1] <= 0;
};
