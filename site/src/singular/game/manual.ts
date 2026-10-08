// The player's Field Manual (GDD §4): their own pages (Say it), the Laws they proved and the Doubts they settled,
// shown in the Codex and exported as Markdown. Also the Library view of lantern.py.
import type { BuildDef, ChapterDef, LawDef, SayItDef } from './types';
import { h, inline, md, button } from '../ui/ui';
import { S } from '../core/save';
import { castMember } from '../content/cast';
import { CHAPTERS, chapterName } from './registry';
import { isPlayerFn, docs, exportLibrary, exportTests } from './build';

interface ChapterPages {
  ch: ChapterDef;
  sayit?: SayItDef;
  laws: LawDef<unknown>[];
  doubts: { id: string; who: string; claim: string; isTrue: boolean }[];
}

function collect(): ChapterPages[] {
  return CHAPTERS.map((ch) => {
    const out: ChapterPages = { ch, laws: [], doubts: [] };
    for (const b of ch.beats) {
      if (b.kind === 'sayit') out.sayit = b.sayit;
      else if (b.kind === 'law') out.laws.push(b.law as LawDef<unknown>);
      else if (b.kind === 'doubt') out.doubts.push({ id: b.doubt.id, who: b.doubt.who, claim: b.doubt.claim, isTrue: b.doubt.isTrue });
    }
    return out;
  });
}

const SLOTS: ['see' | 'means' | 'called' | 'cue', string][] = [['see', 'What you see'], ['means', 'What it means'], ['called', 'What it is called'], ['cue', 'When you see ___, think ___']];

/** A proved law as plain text, with the player's chosen words in the slots. */
export function lawText(L: LawDef<unknown>, filled: Record<string, string>): string {
  return L.frame.map((part) => {
    if (typeof part === 'string') return part;
    const opt = L.slots[part.slot]?.options.find((o) => o.id === filled[part.slot]);
    return opt ? `**${opt.text}**` : '___';
  }).join('');
}

function hasContent(p: ChapterPages): boolean {
  const s = S();
  return !!((p.sayit && s.manual[p.sayit.id]) || p.laws.some((l) => s.laws[l.id]) || p.doubts.some((d) => s.doubts[d.id]));
}

/** The whole Field Manual as Markdown (for export). */
export function fieldManualMarkdown(): string {
  const s = S();
  const out = ['# My Field Manual', '', '*Written while playing SINGULAR. Every page is in my own words.*', ''];
  for (const p of collect()) {
    if (!hasContent(p)) continue;
    out.push(`## ${chapterName(p.ch)} · ${p.ch.title.replace(/\$/g, '')}`, '');
    const page = p.sayit ? s.manual[p.sayit.id] : undefined;
    if (p.sayit && page) {
      out.push(`**${castMember(p.sayit.who).name} asked:** ${p.sayit.ask}`, '');
      for (const [k, label] of SLOTS) if (page[k]?.trim()) out.push(`- **${label}:** ${page[k].trim()}`);
      out.push('');
    }
    for (const L of p.laws) {
      const r = s.laws[L.id];
      if (!r) continue;
      out.push(`**Law${r.proven ? ' (proved)' : r.survived ? ' (survived 500 cases)' : ''}:** ${lawText(L, r.filled).replace(/\$/g, '')}`, '');
    }
    const settled = p.doubts.filter((d) => s.doubts[d.id]);
    if (settled.length) {
      out.push('**Doubts settled:**');
      for (const d of settled) out.push(`- “${d.claim}” (${castMember(d.who).name}): ${d.isTrue ? 'true' : 'false'}; I ${s.doubts[d.id].stance === 'back' ? 'backed' : 'challenged'} it${s.doubts[d.id].right ? '' : ' (and changed my mind)'}.`);
      out.push('');
    }
  }
  if (out.length <= 4) out.push('*No pages yet. Pages appear after each chapter’s Briefing.*', '');
  return out.join('\n');
}

/** The Field Manual tab. */
export function manualView(onDownload: (name: string, text: string, type: string) => void): HTMLElement {
  const s = S();
  const pages = collect().filter(hasContent);
  const body = pages.length
    ? pages.map((p) => {
      const page = p.sayit ? s.manual[p.sayit.id] : undefined;
      return h('section', { class: 'fm-page' },
        h('div', { class: 'kicker' }, chapterName(p.ch)),
        h('h3', { html: inline(p.ch.title) }),
        p.sayit && page ? h('div', { class: 'fm-ask', html: inline(`**${castMember(p.sayit.who).name}:** ${p.sayit.ask}`) }) : '',
        page ? h('dl', { class: 'fm-slots' }, ...SLOTS.filter(([k]) => page[k]?.trim()).flatMap(([k, label]) => [h('dt', null, label), h('dd', null, page[k])])) : '',
        // then and now: the first draft, when the page was revised after comparing
        page?.first && SLOTS.some(([k]) => (page.first![k] ?? '') !== page[k])
          ? h('details', { class: 'fm-then' }, h('summary', null, 'Then and now: your first draft'),
            h('dl', { class: 'fm-slots' }, ...SLOTS.filter(([k]) => page.first![k]?.trim()).flatMap(([k, label]) => [h('dt', null, label), h('dd', null, page.first![k])])))
          : '',
        ...p.laws.filter((L) => s.laws[L.id]).map((L) => h('div', { class: 'fm-law', html: md(`**Law${s.laws[L.id].proven ? ', proved' : ''}.** ${lawText(L, s.laws[L.id].filled)}`) })),
        ...p.doubts.filter((d) => s.doubts[d.id]).map((d) => h('div', { class: 'fm-doubt', html: inline(`“${d.claim}” · **${d.isTrue ? 'true' : 'false'}**`) })));
    })
    : [h('p', { class: 'c-muted' }, 'No pages yet. Each chapter’s Briefing adds one: your words first, then the Laws you prove.')];
  return h('div', { class: 'fm' },
    h('div', { class: 'fm-actions' }, button('Download as Markdown', () => onDownload('field-manual.md', fieldManualMarkdown(), 'text/markdown'), { cls: 'small' })),
    ...body);
}

/**
 * The library graph (GDD §5.4): each function is a node, each call an edge (lincomb → scale, add).
 * Columns are call depth, so the arrows always point back to simpler functions. Grey = LANTERN's backup,
 * ring = yours; a function from a chapter not yet opened shows only its chapter number.
 */
export function libraryGraph(rows: { ch: ChapterDef; def: BuildDef }[], reached: Set<string>): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const byFn = new Map(rows.map((r) => [r.def.fn, r]));
  const depth = new Map<string, number>();
  const d = (fn: string, seen = new Set<string>()): number => {
    if (depth.has(fn)) return depth.get(fn)!;
    if (seen.has(fn)) return 0;
    seen.add(fn);
    const uses = (byFn.get(fn)?.def.uses ?? []).filter((u) => byFn.has(u));
    const v = uses.length ? 1 + Math.max(...uses.map((u) => d(u, seen))) : 0;
    depth.set(fn, v);
    return v;
  };
  rows.forEach((r) => d(r.def.fn));
  const cols: string[][] = [];
  for (const r of rows) (cols[depth.get(r.def.fn)!] ??= []).push(r.def.fn);
  const W = 150, H = 30, GX = 54, GY = 10;
  const pos = new Map<string, [number, number]>();
  cols.forEach((col, x) => col.forEach((fn, y) => pos.set(fn, [x * (W + GX), y * (H + GY)])));
  const width = cols.length * (W + GX) - GX, height = Math.max(...cols.map((c) => c.length)) * (H + GY) - GY;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `-4 -4 ${width + 8} ${height + 8}`);
  svg.setAttribute('class', 'lib-graph');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Library graph: which functions call which');
  const el = (tag: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
  for (const r of rows) {
    const [x1, y1] = pos.get(r.def.fn)!;
    for (const u of r.def.uses ?? []) {
      const p2 = pos.get(u);
      if (!p2) continue;
      const [x2, y2] = p2;
      const sx = x1, sy = y1 + H / 2, ex = x2 + W, ey = y2 + H / 2, mx = (sx + ex) / 2;
      svg.append(el('path', { d: `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`, class: `lib-edge ${isPlayerFn(u) ? 'yours' : ''}` }));
    }
  }
  for (const r of rows) {
    const [x, y] = pos.get(r.def.fn)!;
    const open = reached.has(r.ch.id), yours = isPlayerFn(r.def.fn);
    const g = el('g', { class: `lib-node ${yours ? 'yours' : ''} ${open ? '' : 'locked'}`, transform: `translate(${x},${y})` });
    g.append(el('rect', { width: W, height: H, rx: 8 }));
    const t = el('text', { x: W / 2, y: H / 2 + 4, 'text-anchor': 'middle' });
    t.textContent = open ? r.def.fn : `Ch ${r.ch.num}`;
    const title = el('title', {});
    title.textContent = open ? `${r.def.fn}: ${yours ? 'yours' : 'LANTERN backup'}` : r.ch.title.replace(/\$/g, '');
    g.append(t, title);
    svg.append(g);
  }
  return svg;
}

/** The Library tab: every function, yours or LANTERN's backup; chapters not reached show their question only. */
export function libraryView(onDownload: (name: string, text: string, type: string) => void): HTMLElement {
  const s = S();
  const reached = new Set(Object.keys(s.chapters));
  const rows = CHAPTERS.flatMap((ch) => ch.beats.filter((b) => b.kind === 'build').map((b) => ({ ch, def: (b as { build: BuildDef }).build })));
  const mine = rows.filter((r) => isPlayerFn(r.def.fn)).length;
  return h('div', { class: 'lib' },
    h('p', { class: 'c-muted' }, `${mine} of ${rows.length} functions are yours. The rest run on LANTERN’s backup until you write them.`),
    h('div', { class: 'fm-actions' },
      button('Download lantern.py', () => onDownload('lantern.py', exportLibrary(), 'text/x-python'), { cls: 'small' }),
      button('Download test_lantern.py', () => onDownload('test_lantern.py', exportTests(), 'text/x-python'), { cls: 'ghost small' })),
    h('div', { class: 'lib-graph-wrap' }, libraryGraph(rows, reached)),
    h('div', { class: 'lib-list' }, ...rows.filter(({ ch, def }, i) => reached.has(ch.id) || rows.findIndex((r) => r.ch.id === ch.id) === i || !def).map(({ ch, def }) => {
      const open = reached.has(ch.id);
      if (!open) {
        const n = rows.filter((r) => r.ch.id === ch.id).length;
        return h('div', { class: 'lib-row locked' }, h('span', { class: 'lib-dot', 'aria-hidden': 'true' }), h('span', { class: 'lib-name', html: inline(ch.title) }), h('span', { class: 'lib-uses c-muted' }, `${n} function${n === 1 ? '' : 's'}`), h('span', { class: 'lib-state' }, chapterName(ch)));
      }
      const yours = isPlayerFn(def.fn);
      return h('div', { class: `lib-row ${yours ? 'yours' : ''} ${open ? '' : 'locked'}` },
        h('span', { class: 'lib-dot', 'aria-hidden': 'true' }),
        h('span', { class: 'lib-name', html: open ? inline(`\`${def.fn}\``) : inline(ch.title) }),
        h('span', { class: 'lib-uses c-muted', html: open && def.uses?.length ? inline(`uses ${def.uses.map((u) => `\`${u}\``).join(', ')}`) : '' }),
        h('span', { class: 'lib-state' }, yours ? 'yours' : open ? 'backup' : chapterName(ch)),
        yours && docs()[def.fn]?.trim() ? h('div', { class: 'lib-doc' }, docs()[def.fn]) : '');
    })));
}

/**
 * The honesty overlay (GDD §5.4, key L): which systems run on the player's code, which on LANTERN's backup,
 * and which are plain engine (rendering, shaders, animation). Functions from chapters not reached are not listed.
 */
export function honestyPanel(currentChapter: string | null): HTMLElement {
  const order = CHAPTERS.map((c) => c.id);
  const upto = currentChapter ? order.indexOf(currentChapter) : -1;
  const rows = CHAPTERS.filter((_, i) => i <= upto).flatMap((ch) => ch.beats.filter((b) => b.kind === 'build').map((b) => (b as { build: BuildDef }).build));
  const yours = rows.filter((d) => isPlayerFn(d.fn));
  const backup = rows.filter((d) => !isPlayerFn(d.fn));
  const list = (ds: BuildDef[]) => ds.length ? ds.map((d) => `\`${d.fn}\``).join(', ') : 'none yet';
  return h('div', { class: 'honesty glass', role: 'status' },
    h('div', { class: 'kicker' }, 'Who runs what · L to close'),
    h('div', { class: 'hon-row yours', html: inline(`**Yours:** ${list(yours)}`) }),
    h('div', { class: 'hon-row backup', html: inline(`**LANTERN backup:** ${list(backup)}`) }),
    h('div', { class: 'hon-row engine', html: inline('**Engine:** drawing, lighting shaders, camera, animation timing. The maths on screen is computed, never faked.') }));
}
