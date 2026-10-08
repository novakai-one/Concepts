// Mini markdown for lesson text.
//   **bold**  *italic*  `code`  [text](url)  [text](@/path/from/site/root)
//   $inline maths$  $$display maths$$  (KaTeX)
//   {g|green word} {r|red} {y|yellow} {b|blue/search} {p|purple/learn} {t|teal/act}
//   KaTeX colour macros: \cg{v} \cr{w} \cy{result}
// Blocks: paragraphs (blank-line separated), "- " lists, "1. " lists, ## / ### headings.
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ROOT } from './config';

const MACROS = {
  '\\cg': '\\htmlClass{c-green}{#1}',
  '\\cr': '\\htmlClass{c-red}{#1}',
  '\\cy': '\\htmlClass{c-yellow}{#1}',
  '\\cb': '\\htmlClass{c-search}{#1}',
  '\\cp': '\\htmlClass{c-learn}{#1}',
  '\\ct': '\\htmlClass{c-act}{#1}',
};
const COL: Record<string, string> = { g: 'green', r: 'red', y: 'yellow', b: 'search', p: 'learn', t: 'act' };

export function tex(src: string, display = false): string {
  return katex.renderToString(src, {
    displayMode: display,
    throwOnError: false,
    macros: { ...MACROS },
    trust: (ctx: { command: string }) => ctx.command === '\\htmlClass',
    strict: 'ignore',
  });
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function inline(src: string): string {
  const slots: string[] = [];
  const keep = (html: string) => `\u0000${slots.push(html) - 1}\u0000`;
  let s = src;
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => keep(tex(m, true)));
  s = s.replace(/\$([^$\n]+?)\$/g, (_, m) => keep(tex(m)));
  s = s.replace(/`([^`]+)`/g, (_, m) => keep(`<code>${esc(m)}</code>`));
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u: string) => {
    const href = u.startsWith('@/') ? ROOT + u.slice(2) : u;
    const ext = /^https?:/.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/\{([grybpt])\|([^{}]+?)\}/g, (_, c: string, t: string) => `<span class="c-${COL[c]}">${t}</span>`);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
  return s;
}

function dedent(src: string): string {
  const lines = src.replace(/^\n+|\s+$/g, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut)).join('\n');
}

export function md(src: string): string {
  const lines = dedent(src).split('\n');
  const out: string[] = [];
  let i = 0;
  const isList = (l: string) => /^\s*[-*] /.test(l);
  const isOl = (l: string) => /^\s*\d+\. /.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    // a display block is a line that is only $$...$$, or a $$ line whose block closes on a later line;
    // "$$x$$, where ..." is a paragraph (inline() renders the $$...$$ part)
    const t = line.trim();
    const oneLine = t.length > 4 && t.startsWith('$$') && t.endsWith('$$') && t.slice(2, -2).indexOf('$$') < 0;
    const opens = t.startsWith('$$') && t.slice(2).indexOf('$$') < 0;
    if (oneLine || opens) {
      const buf: string[] = [line.trim().slice(2)];
      if (line.trim().length > 2 && line.trim().endsWith('$$')) {
        out.push(`<div class="math-block">${tex(line.trim().slice(2, -2), true)}</div>`);
        i++;
        continue;
      }
      i++;
      while (i < lines.length && !lines[i].trim().endsWith('$$')) buf.push(lines[i++]);
      if (i < lines.length) buf.push(lines[i++].trim().slice(0, -2));
      out.push(`<div class="math-block">${tex(buf.join('\n'), true)}</div>`);
      continue;
    }
    const hm = line.match(/^(#{2,4}) (.*)$/);
    if (hm) {
      const lvl = hm[1].length;
      out.push(`<h${lvl}>${inline(hm[2])}</h${lvl}>`);
      i++;
      continue;
    }
    if (isList(line) || isOl(line)) {
      const ordered = isOl(line);
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() && (ordered ? isOl(lines[i]) : isList(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (ordered ? isOl(lines[i]) : isList(lines[i])) items.push(lines[i].replace(/^\s*(?:[-*]|\d+\.) /, ''));
        else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const buf: string[] = [];
    const start = i;
    while (i < lines.length && lines[i].trim() && !isList(lines[i]) && !isOl(lines[i]) && !/^#{2,4} /.test(lines[i]) && !(i > start && lines[i].trim().startsWith('$$'))) {
      buf.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

/** Render markdown into a new element. */
export function mdEl(src: string, cls = 'prose', tag: 'div' | 'section' = 'div'): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.innerHTML = md(src);
  return el;
}

/** Inline markdown into a span. */
export function mdSpan(src: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.innerHTML = inline(src);
  return el;
}
