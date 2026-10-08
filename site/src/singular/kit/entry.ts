// Typed numbers: how a box the player types into is read. Pure (no DOM), so unit tests can import it.

/**
 * One typed number: whole, decimal (0.5, .5, 2,5 where allowed) or a fraction (1/2). Null if it cannot be read.
 * `comma: false` refuses a decimal comma: in a vector part, "1,1" is far more likely a whole vector in one box.
 */
export function parseEntry(s: string, o: { comma?: boolean } = {}): number | null {
  let t = s.trim().replace(/[−–]/g, '-').replace(/\s+/g, '').replace(/^\+/, '');
  if (o.comma !== false && /^-?\d*,\d{1,2}$/.test(t)) t = t.replace(',', '.');
  if (/^-?\d+\.$/.test(t)) t = t.slice(0, -1);
  const f = t.match(/^(-?\d*\.?\d+)\/(\d*\.?\d+)$/);
  if (f) {
    const d = parseFloat(f[2]);
    const x = d === 0 ? null : parseFloat(f[1]) / d;
    return x === null || Math.abs(x) > ENTRY_MAX || (x !== 0 && Math.abs(x) < ENTRY_MIN) ? null : x;
  }
  if (!/^-?(\d+(\.\d+)?|\.\d+)$/.test(t)) return null;
  const x = parseFloat(t);
  // the chart works to a few decimals and four digits: larger or finer entries are refused, not misjudged
  if (Math.abs(x) > ENTRY_MAX || (x !== 0 && Math.abs(x) < ENTRY_MIN)) return null;
  return Object.is(x, -0) ? 0 : x;
}
export const ENTRY_MAX = 9999;
export const ENTRY_MIN = 0.001;
