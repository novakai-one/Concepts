// The case board: open questions the story raises, answered later by the maths.
// pin() when a scene raises a question; answer() when a chapter resolves it.
import { S, save, chapterSave } from '../core/save';
import { CHAPTERS } from './registry';
import { h, inline, md, openModal, type UI } from '../ui/ui';

export interface CaseItem { id: string; q: string; a?: string; pinnedIn?: string; answeredIn?: string }

function items(): CaseItem[] { return ((S().flags.caseboard as CaseItem[]) ??= []); }

export function pin(id: string, question: string, chapter?: string): boolean {
  const list = items();
  if (list.some((c) => c.id === id)) return false;
  list.push({ id, q: question, pinnedIn: chapter });
  save();
  return true;
}

export function answer(id: string, text: string, chapter?: string): void {
  const c = items().find((x) => x.id === id);
  if (c) { c.a = text; c.answeredIn = chapter; } else items().push({ id, q: '', a: text, answeredIn: chapter });
  save();
}

export function caseItems(): CaseItem[] { return items().slice(); }

// ------------------------------------------------------------------ the Invertible Matrix constellation (GDD §4.7)

/** Thirteen statements about a square matrix that are all one fact: space is flattened. */
export const STARS: { id: string; ch: string; text: string }[] = [
  { id: 'notreach', ch: 'c02', text: 'The columns do not reach every point' },
  { id: 'dep', ch: 'c03', text: 'The columns are dependent' },
  { id: 'triple', ch: 'c06', text: 'The scalar triple product of the columns is 0' },
  { id: 'nounique', ch: 'c08', text: 'Some $\\mathbf b$ has no solution, or many' },
  { id: 'nopivot', ch: 'c09', text: 'A column has no pivot' },
  { id: 'rref', ch: 'c10', text: 'The reduced row echelon form is not $I$' },
  { id: 'flat', ch: 'c13', text: 'The move flattens space' },
  { id: 'noinv', ch: 'c13', text: 'There is no inverse' },
  { id: 'det', ch: 'c14', text: '$\\det A = 0$' },
  { id: 'null', ch: 'c15', text: 'The null space holds a non-zero vector' },
  { id: 'rank', ch: 'c16', text: 'The rank is less than $n$' },
  { id: 'eig0', ch: 'c18', text: '0 is an eigenvalue' },
  { id: 'sv0', ch: 'c25', text: 'The smallest singular value is 0' },
];

function lit(): Set<string> { return new Set((S().flags.stars as string[]) ?? []); }
function links(): string[] { return ((S().flags.starLinks as string[]) ??= []); }

/** Light a star (its idea is earned). Chapters call this at the naming beat; finishing the chapter also lights it. */
export function lightStar(id: string): void {
  const s = lit();
  if (s.has(id)) return;
  S().flags.stars = [...s, id];
  save();
}

/** Link two stars: one construction on one shared example showed both statements at once. */
export function linkStars(a: string, b: string): void {
  const key = [a, b].sort().join('|');
  if (!links().includes(key)) { links().push(key); save(); }
}

function starLit(st: { id: string; ch: string }): boolean {
  if (lit().has(st.id)) return true;
  const ch = CHAPTERS.find((c) => c.id === st.ch);
  const last = ch?.beats[ch.beats.length - 1];
  return !!last && chapterSave(st.ch).done.includes(last.id);
}

function constellation(onPick: (i: number) => void): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag: string, a: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
  const svg = el('svg', { viewBox: '-130 -112 260 224', class: 'constellation', role: 'img', 'aria-label': 'The Invertible Matrix constellation' }) as SVGSVGElement;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / STARS.length;
  const P = STARS.map((_, i) => [Math.cos(ang(i)) * 74, Math.sin(ang(i)) * 74]);
  const idx = new Map(STARS.map((s, i) => [s.id, i]));
  for (const key of links()) {
    const [a, b] = key.split('|').map((k) => idx.get(k));
    if (a === undefined || b === undefined) continue;
    svg.append(el('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1], class: 'cst-link' }));
  }
  STARS.forEach((st, i) => {
    const on = starLit(st);
    const g = el('g', { class: `cst-star ${on ? 'on' : ''}`, transform: `translate(${P[i][0]},${P[i][1]})`, tabindex: 0, role: 'button' });
    g.append(el('circle', { r: on ? 6 : 3.5 }));
    // labels sit outside the ring, along the star's own direction
    const lx = Math.cos(ang(i)) * 17, ly = Math.sin(ang(i)) * 15 + 3;
    const t = el('text', { x: lx, y: ly, 'text-anchor': Math.abs(lx) < 4 ? 'middle' : lx > 0 ? 'start' : 'end' });
    t.textContent = `Ch ${Number(st.ch.slice(1))}`;
    g.append(t);
    g.addEventListener('click', () => onPick(i));
    g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') onPick(i); });
    svg.append(g);
  });
  const c = el('text', { y: 4, 'text-anchor': 'middle', class: 'cst-centre' });
  c.textContent = `${STARS.filter(starLit).length} of ${STARS.length}`;
  svg.append(c);
  return svg;
}

export async function caseBoardScreen(ui: UI): Promise<void> {
  const list = items();
  const anyLit = STARS.some(starLit);
  const detail = h('div', { class: 'cst-detail c-muted' }, 'Each star is a statement about a square matrix. Light them by earning their ideas.');
  const pick = (i: number) => {
    const st = STARS[i];
    detail.innerHTML = starLit(st) ? inline(`**${st.text}.** Earned in Chapter ${Number(st.ch.slice(1))}.`) : inline(`Not lit yet. It belongs to Chapter ${Number(st.ch.slice(1))}: *${CHAPTERS.find((c) => c.id === st.ch)?.title ?? ''}*`);
  };
  await openModal(ui, () => [
    h('div', { class: 'kicker' }, 'Case board'),
    h('h2', null, 'What we still need to explain'),
    anyLit ? h('section', { class: 'cst' }, h('div', { class: 'kicker' }, 'A constellation of one fact'), constellation(pick), detail) : '',
    list.length ? h('div', { class: 'case-list' }, ...list.map((c) => h('div', { class: `case-item ${c.a ? 'done' : ''}` },
      h('div', { class: 'case-q', html: inline(c.q) }),
      c.a ? h('div', { class: 'case-a', html: md(c.a) }) : h('div', { class: 'case-open c-muted' }, 'Open')))) : h('p', { class: 'c-muted' }, 'Nothing pinned yet.'),
  ]);
}
