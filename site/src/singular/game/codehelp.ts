// Code help for the builder (GDD §5.3): Assemble (order given lines), Fill (blanks), Write (empty body).
// Pure functions only (no DOM), so they can be unit-tested in Node.

export type HelpMode = 'assemble' | 'fill' | 'write';
export const BLANK = '___';

/** Swarm size by difficulty (GDD §5.4). */
export function swarmSize(d: 'cadet' | 'navigator' | 'commander'): number {
  return d === 'cadet' ? 20 : d === 'navigator' ? 100 : 300;
}

/** Index of the last line of the header: the def line plus its docstring, if any. */
export function headerEnd(lines: string[]): number {
  const def = lines.findIndex((l) => /^\s*def\s/.test(l));
  if (def < 0) return -1;
  const next = def + 1;
  const l = lines[next]?.trim() ?? '';
  if (!l.startsWith('"""') && !l.startsWith("'''")) return def;
  const q = l.slice(0, 3);
  if (l.length > 3 && l.endsWith(q) && l !== q) return next; // one-line docstring
  for (let i = next + 1; i < lines.length; i++) if (lines[i].includes(q)) return i;
  return next;
}

/** The function's header (def + docstring) and a body to write in: the Write mode starting text. */
export function signatureOf(solution: string): string {
  const lines = solution.replace(/\s+$/, '').split('\n');
  const end = headerEnd(lines);
  if (end < 0) return solution;
  const indent = (lines[end + 1]?.match(/^\s*/)?.[0]) || '    ';
  return `${lines.slice(0, end + 1).join('\n')}\n${indent}# your code here\n${indent}return None\n`;
}

/** Assemble mode: fixed header lines plus the body lines to order (indentation kept), and decoys. */
export function assembleParts(solution: string, given?: { lines: string[]; decoys?: string[] }): { head: string[]; body: string[]; decoys: string[] } {
  const all = (given?.lines ?? solution.replace(/\s+$/, '').split('\n')).filter((l) => l.trim() && !/^\s*#/.test(l));
  const end = headerEnd(all);
  return { head: all.slice(0, end + 1), body: all.slice(end + 1), decoys: given?.decoys ?? [] };
}

/** Deterministic shuffle (so the same build always deals the same order) that never returns the solved order. */
export function dealOrder<T>(items: T[], seed: number): T[] {
  const a = items.slice();
  let s = seed >>> 0 || 1;
  const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let k = 0; k < 6; k++) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length < 2 || a.some((x, i) => x !== items[i])) return a;
  }
  return a.reverse();
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Fill mode from an explicit template: the template's blanks are matched against the solution to find the answers. */
export function fillAnswers(template: string, solution: string): string[] | null {
  const parts = template.split(BLANK);
  if (parts.length < 2) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${parts.map(esc).join('(.+?)')}$`, 's');
  const m = solution.replace(/\s+$/, '').match(re) ?? solution.match(re);
  return m ? m.slice(1) : null;
}

/**
 * Fill mode derived from the solution when no template is given: blank the right-hand side of each
 * `return` and assignment in the body (the expression part of a list comprehension), at most `max` blanks.
 */
export function deriveFill(solution: string, max = 4): { template: string; answers: string[] } | null {
  const lines = solution.replace(/\s+$/, '').split('\n');
  const end = headerEnd(lines);
  const answers: string[] = [];
  const out = lines.map((line, i) => {
    if (i <= end || answers.length >= max || /^\s*#/.test(line)) return line;
    let m = line.match(/^(\s*return \[)(.+?)( for .+\])\s*$/);
    if (m) { answers.push(m[2]); return `${m[1]}${BLANK}${m[3]}`; }
    m = line.match(/^(\s*return )(.+)$/);
    if (m && m[2].trim() !== 'None') { answers.push(m[2]); return `${m[1]}${BLANK}`; }
    m = line.match(/^(\s*[A-Za-z_][\w\[\]., ]*?\s*(?:\+=|-=|\*=|\/=|=)\s*)(?!=)(.+)$/);
    if (m && !/^\s*(for|if|while|elif|def)\b/.test(line) && !/[=!<>]=/.test(m[1].slice(-3))) { answers.push(m[2]); return `${m[1]}${BLANK}`; }
    return line;
  });
  return answers.length ? { template: `${out.join('\n')}\n`, answers } : null;
}

/** Put the player's entries into a template's blanks. */
export function composeFill(template: string, entries: string[]): string {
  const parts = template.split(BLANK);
  return parts.map((p, i) => (i < parts.length - 1 ? p + (entries[i] ?? '') : p)).join('');
}

/** A plain-words hint for a failed test (GDD §5.2): what the result says about the code. */
export function testHint(got: string, want: string): string | null {
  if (/^(\w+Error|Exception)/.test(got)) {
    const line = got.match(/\(line (\d+)\)/)?.[1];
    const at = line ? ` (line ${line})` : '';
    if (got.startsWith('IndexError')) return `An index went past the end of a list${at}. A list of n parts has indexes 0 to n − 1.`;
    if (got.startsWith('NameError')) { const n = got.match(/name '(\w+)'/)?.[1]; return `\`${n ?? 'a name'}\` is not defined${at}. Check the spelling, or set it before you use it.`; }
    if (got.startsWith('ZeroDivisionError')) return `A division by zero${at}. Which input makes the bottom zero?`;
    if (got.startsWith('TypeError') && /list/.test(got) && /(int|float)/.test(got)) return `A number met a whole list${at}. Work on the parts one at a time.`;
    if (got.startsWith('TypeError') && /NoneType/.test(got)) return `Something was \`None\`${at}: a function that does not return a value.`;
    if (got.startsWith('RecursionError')) return `The function calls itself without end${at}.`;
    return null;
  }
  if (got === 'null' && want !== 'null') return 'Your function returned nothing. Did you forget `return`?';
  try {
    const g = JSON.parse(got), w = JSON.parse(want);
    if (Array.isArray(g) && Array.isArray(w) && g.length !== w.length) return `Returned ${g.length} number${g.length === 1 ? '' : 's'}; the answer has ${w.length}.`;
    if (Array.isArray(w) && !Array.isArray(g)) return 'Returned one value; the answer is a list.';
    if (Array.isArray(g) && Array.isArray(w) && g.length === w.length && g.every((x: unknown, i: number) => typeof x === 'number' && typeof w[i] === 'number' && Math.abs((x as number) + (w[i] as number)) < 1e-9) && w.some((x: number) => x !== 0)) return 'Every part has the wrong sign. Is it end minus start?';
  } catch { /* not JSON */ }
  return null;
}

/**
 * Group failing swarm cases by a shared pattern (GDD §5.4), in plain words. A pattern counts only when
 * every failing case has it and most passing cases do not.
 */
export function failurePattern(failing: unknown[][], passing: unknown[][]): string | null {
  if (failing.length < 3) return null;
  const nums = (c: unknown[]): number[] => { const a = c[0]; return Array.isArray(a) ? (a.flat(3).filter((x) => typeof x === 'number') as number[]) : typeof a === 'number' ? [a] : []; };
  const checks: [string, (xs: number[]) => boolean][] = [
    ['a negative number in the first input', (xs) => xs.some((x) => x < 0)],
    ['a zero in the first input', (xs) => xs.some((x) => x === 0)],
    ['a fraction in the first input', (xs) => xs.some((x) => !Number.isInteger(x))],
    ['only whole numbers in the first input', (xs) => xs.every((x) => Number.isInteger(x))],
  ];
  for (const [label, f] of checks) {
    if (!failing.every((c) => { const xs = nums(c); return xs.length > 0 && f(xs); })) continue;
    const alsoPassing = passing.filter((c) => { const xs = nums(c); return xs.length > 0 && f(xs); }).length;
    if (alsoPassing <= passing.length / 2) return `All ${failing.length} failing cases have ${label}.`;
  }
  return null;
}
