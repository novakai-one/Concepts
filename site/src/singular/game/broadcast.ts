// The Broadcast (GDD §4.8): the finale explain-back. The player orders their Field Manual pages into a chain,
// writes why each link holds, walks "down to the arrows" through their own library, and exports the lecture.
import type { BroadcastDef } from './types';
import type { BriefingHost } from './briefing';
import { briefingTest, claimSolve, releaseSolve } from './briefing';
import { chainProblem } from './chain';
export { chainProblem };
import { h, inline, md, button, download } from '../ui/ui';
import { S, save } from '../core/save';
import { sfx } from '../audio/sfx';
import { isPlayerFn, docs, libSource } from './build';
import { fieldManualMarkdown } from './manual';

interface BroadcastSave { order: string[]; links: Record<string, string> }
function saved(id: string): BroadcastSave {
  const all = ((S().flags.broadcast as Record<string, BroadcastSave>) ??= {});
  return (all[id] ??= { order: [], links: {} });
}

function strip(s: string): string { return s.replace(/\$([^$]+)\$/g, '$1').replace(/\*\*/g, '').replace(/\*/g, ''); }
function esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/** The player's lecture as one self-contained HTML page. */
export function lectureHtml(B: BroadcastDef): string {
  const sv = saved(B.id);
  const order = sv.order.length ? sv.order : B.pages.map((p) => p.id);
  const page = (id: string) => B.pages.find((p) => p.id === id)!;
  const parts = order.map((id, i) => {
    const p = page(id);
    const m = S().manual[p.chapter];
    const link = i > 0 ? sv.links[`${order[i - 1]}>${id}`] : '';
    const slots = m ? [['What you see', m.see], ['What it means', m.means], ['What it is called', m.called], ['Cue', m.cue]].filter(([, v]) => v?.trim()) : [];
    return `<section><h2>${i + 1}. ${esc(strip(p.term))}</h2>${link ? `<p class="link"><b>${esc(strip(p.term))}</b> needs <b>${esc(strip(page(order[i - 1]).term))}</b>, because ${esc(link)}</p>` : ''}${slots.length ? `<dl>${slots.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}</section>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>How to read the Fold</title>
<style>:root{color-scheme:dark}body{margin:0;background:#070b16;color:#e8f1ff;font:17px/1.6 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:40px 18px 80px}
h1{font-size:34px;margin:0 0 6px}.sub{color:#9fb0cc;margin:0 0 32px}section{border-left:2px solid #2b3a5c;padding:4px 0 10px 18px;margin:0 0 22px}
h2{font-size:21px;margin:0 0 8px;color:#59e1ff}.link{margin:0 0 10px;color:#d6defa}dl{display:grid;grid-template-columns:160px 1fr;gap:4px 14px;margin:0}
dt{color:#7d8aa5;font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding-top:4px}dd{margin:0;white-space:pre-wrap}footer{color:#7d8aa5;font-size:14px;margin-top:40px}
@media(max-width:600px){dl{grid-template-columns:1fr}}</style></head><body><main>
<h1>How to read the Fold</h1><p class="sub">A lecture in linear algebra, written and ordered by the navigator of the <i>Lantern</i>.</p>
${parts}
<footer>Made while playing SINGULAR. Every sentence here is the player's own.</footer></main></body></html>`;
}

export async function runBroadcast(host: BriefingHost, B: BroadcastDef): Promise<void> {
  const gen = claimSolve('broadcast');
  const { g, hud } = host;
  hud.hideObjective();
  const sv = saved(B.id);
  const panelEl = h('div', { class: 'brief broadcast glass' });
  panelEl.style.pointerEvents = 'auto';
  g.ui.scene.appendChild(panelEl);
  const page = (id: string) => B.pages.find((p) => p.id === id)!;
  let order = sv.order.filter((id) => B.pages.some((p) => p.id === id));
  try {
    // ---- 1. the chain
    await new Promise<void>((resolve) => {
      const tray = h('div', { class: 'bc-tray' });
      const chain = h('ol', { class: 'bc-chain' });
      const msg = h('div', { class: 'bc-msg', role: 'status' });
      const shuffled = [...B.pages].sort((a, b) => (a.term.length * 7 + a.id.charCodeAt(0)) % 11 - (b.term.length * 7 + b.id.charCodeAt(0)) % 11);
      const render = () => {
        tray.replaceChildren(...shuffled.filter((p) => !order.includes(p.id)).map((p) => {
          const b = h('button', { class: 'tile', type: 'button', html: inline(p.term) });
          b.addEventListener('click', () => { order.push(p.id); sfx.click(); render(); });
          return b;
        }));
        chain.replaceChildren(...order.map((id, i) => {
          const li = h('li', { class: 'tile in-plan' }, h('span', { html: inline(page(id).term) }));
          const up = h('button', { class: 'bc-up', type: 'button', 'aria-label': 'Move up' }, '↑');
          up.addEventListener('click', (e) => { e.stopPropagation(); if (i > 0) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; sfx.click(); render(); } });
          if (i > 0) li.append(up);
          li.addEventListener('click', () => { order.splice(i, 1); sfx.click(); render(); });
          return li;
        }));
      };
      const check = () => {
        if (order.length < B.pages.length) { msg.innerHTML = md(`Place all ${B.pages.length} pages. ${B.pages.length - order.length} to go.`); sfx.miss(); return; }
        const bad = chainProblem(order, B.pages);
        if (bad) { msg.innerHTML = md(`**${page(bad.page).term}** needs **${page(bad.need).term}**, which comes later. Move it up.`); sfx.miss(); return; }
        sv.order = order.slice(); save(); sfx.solved();
        resolve();
      };
      const showMe = () => { order = B.pages.map((p) => p.id); render(); check(); };
      briefingTest.kind = 'broadcast';
      briefingTest.solve = async () => { showMe(); return true; };
      panelEl.replaceChildren(
        h('div', { class: 'kicker' }, 'The Broadcast · 1 of 3 · the chain'),
        h('h2', null, 'Put your pages in order'),
        h('p', { class: 'c-muted' }, `Order the ${B.pages.length} ideas so that each one comes after everything it needs. Many orders work.`),
        h('div', { class: 'bc-cols' }, h('div', null, h('div', { class: 'tile-label' }, 'Pages'), tray), h('div', null, h('div', { class: 'tile-label' }, 'Your chain'), chain)),
        msg,
        h('div', { class: 'bc-actions' }, button('Check the chain', check, { cls: 'primary small' }), button('Show me', showMe, { cls: 'ghost small' }), button('Clear', () => { order = []; render(); }, { cls: 'ghost small' })));
      render();
    });

    // ---- 2. why each link holds
    await new Promise<void>((resolve) => {
      const rows = sv.order.slice(1).map((id, k) => {
        const prev = sv.order[k];
        const key = `${prev}>${id}`;
        const inp = h('textarea', { class: 'own-words', rows: 2, placeholder: 'because…' }) as HTMLTextAreaElement;
        inp.value = sv.links[key] ?? '';
        inp.addEventListener('input', () => { sv.links[key] = inp.value; save(); });
        inp.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
        const model = page(id).because?.[prev];
        const help = model ? button('Help me start', () => { if (!inp.value.trim()) { inp.value = model.split(' ').slice(0, 4).join(' '); inp.dispatchEvent(new Event('input')); inp.focus(); } }, { cls: 'ghost small' }) : '';
        return h('div', { class: 'bc-link' }, h('div', { html: inline(`**${page(id).term}** needs **${page(prev).term}**, because`) }), inp, help);
      });
      briefingTest.solve = async () => { resolve(); return true; };
      panelEl.replaceChildren(
        h('div', { class: 'kicker' }, 'The Broadcast · 2 of 3 · the links'),
        h('h2', null, 'Why does each one need the last?'),
        h('p', { class: 'c-muted' }, 'One sentence per link, in your own words. Nobody marks this; it becomes your lecture.'),
        h('div', { class: 'bc-links' }, ...rows),
        h('div', { class: 'bc-actions' }, button('Record it', () => { sfx.solved(); resolve(); }, { cls: 'primary small' })));
    });

    // ---- 3. down to the arrows, and the export
    await new Promise<void>((resolve) => {
      const path = (B.down ?? []).filter((fn) => libSource(fn));
      const steps = path.map((fn) => h('div', { class: `bc-down ${isPlayerFn(fn) ? 'yours' : ''}` },
        h('code', null, fn), h('span', { class: 'c-muted' }, isPlayerFn(fn) ? ' yours' : ' LANTERN backup'),
        docs()[fn]?.trim() ? h('div', { class: 'bc-doc' }, docs()[fn]) : ''));
      briefingTest.solve = async () => { resolve(); return true; };
      panelEl.replaceChildren(
        h('div', { class: 'kicker' }, 'The Broadcast · 3 of 3 · down to the arrows'),
        h('h2', null, 'From the biggest idea down to adding two arrows'),
        path.length ? h('div', { class: 'bc-path' }, ...steps.flatMap((s, i) => (i ? [h('div', { class: 'bc-arrow', 'aria-hidden': 'true' }, '↓'), s] : [s]))) : '',
        h('div', { class: 'bc-actions' },
          button('Download your lecture (HTML)', () => download('lecture.html', lectureHtml(B), 'text/html'), { cls: 'small' }),
          button('Download your Field Manual (Markdown)', () => download('field-manual.md', fieldManualMarkdown(), 'text/markdown'), { cls: 'ghost small' }),
          button('Send the broadcast', () => { sfx.solved(); resolve(); }, { cls: 'primary small' })));
    });
  } finally {
    releaseSolve(gen);
    panelEl.remove();
  }
}
