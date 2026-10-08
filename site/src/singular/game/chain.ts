// The Broadcast chain's rule (pure, unit-tested): every page comes after everything it needs.
export interface ChainPage { id: string; needs: string[] }

/** The first page placed before something it needs, or null when the order respects every need. */
export function chainProblem(order: string[], pages: ChainPage[]): { page: string; need: string } | null {
  const at = new Map(order.map((id, i) => [id, i]));
  for (const id of order) {
    const p = pages.find((x) => x.id === id);
    for (const n of p?.needs ?? []) if ((at.get(n) ?? Infinity) > at.get(id)!) return { page: id, need: n };
  }
  return null;
}
