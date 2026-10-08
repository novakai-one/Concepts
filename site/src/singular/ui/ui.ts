// The DOM layer over the stage: HUD, dialogue, side panel, modals, toasts.
import { h, type Child } from '../../lib/dom';
import { md, inline } from '../../lib/md';
import { sfx } from '../audio/sfx';

export { h, md, inline };
export type { Child };

export class UI {
  readonly root: HTMLElement;
  readonly hud: HTMLElement;
  readonly scene: HTMLElement;    // puzzle widgets (readouts, inputs)
  readonly dialogue: HTMLElement;
  readonly panel: HTMLElement;
  readonly modal: HTMLElement;
  readonly toasts: HTMLElement;

  constructor(parent: HTMLElement) {
    const layer = (cls: string) => h('div', { class: `ui-layer ${cls}` });
    this.root = h('div', { class: 'ui-root' });
    this.scene = layer('l-scene');
    this.hud = layer('l-hud');
    this.dialogue = layer('l-dialogue');
    this.panel = layer('l-panel');
    this.modal = layer('l-modal');
    this.toasts = h('div', { class: 'toasts' });
    this.modal.appendChild(this.toasts);
    for (const l of [this.scene, this.hud, this.dialogue, this.panel, this.modal]) {
      l.style.pointerEvents = 'none';
      this.root.appendChild(l);
    }
    parent.appendChild(this.root);
  }

  toast(text: string, kicker = ''): void {
    const t = h('div', { class: 'toast glass' }, kicker ? h('span', { class: 'kicker' }, kicker) : null, h('span', { html: inline(text) }));
    this.toasts.appendChild(t);
    window.setTimeout(() => t.remove(), 3500);
  }

  clearScene(): void { this.scene.replaceChildren(); }
}

export function button(label: string, onClick: () => void, o: { cls?: string; title?: string; kbd?: string; html?: boolean } = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${o.cls ?? ''}`, type: 'button', title: o.title ?? null });
  if (o.html) b.innerHTML = label; else b.append(label);
  if (o.kbd) b.append(h('span', { class: 'kbd' }, o.kbd));
  b.addEventListener('click', (e) => { e.stopPropagation(); sfx.click(); onClick(); });
  b.addEventListener('pointerenter', () => sfx.hover());
  return b;
}

/** A modal dialog. Resolves when closed. */
export function openModal(ui: UI, build: (close: () => void) => Child, o: { wide?: boolean; onClose?: () => void } = {}): Promise<void> {
  return new Promise((resolve) => {
    const back = h('div', { class: 'modal-back' });
    const close = () => { back.remove(); document.removeEventListener('keydown', esc); o.onClose?.(); resolve(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const box = h('div', { class: 'modal glass', role: 'dialog', 'aria-modal': 'true' });
    if (o.wide) box.style.width = 'min(1200px, calc(100vw - 32px))';
    box.append(button('✕', close, { cls: 'ghost icon small close', title: 'Close (Esc)' }));
    const content = build(close);
    if (content) box.append(...([content].flat(Infinity as 1) as Node[]).filter((x) => x instanceof Node));
    back.appendChild(box);
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.addEventListener('keydown', esc);
    back.style.pointerEvents = 'auto';
    ui.modal.insertBefore(back, ui.toasts);
    sfx.open();
  });
}

/** Side panel with markdown content. Returns a close function. */
export function openPanel(ui: UI, title: string, body: string, o: { kicker?: string; extra?: Node[]; onClose?: () => void } = {}): () => void {
  ui.panel.replaceChildren();
  const close = () => { ui.panel.replaceChildren(); o.onClose?.(); };
  const p = h('aside', { class: 'panel glass' },
    button('✕', close, { cls: 'ghost icon small close', title: 'Close' }),
    o.kicker ? h('div', { class: 'kicker' }, o.kicker) : null,
    h('h2', { html: inline(title) }),
    h('div', { class: 'panel-body', html: md(body) }),
    ...(o.extra ?? []));
  p.style.pointerEvents = 'auto';
  ui.panel.appendChild(p);
  return close;
}

/** Start the browser's download of a text file. Some hosts block downloads silently; see `download`. */
function saveFile(name: string, text: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/**
 * Offer a text file: a sheet that shows the file with Download and Copy. Copy always works, so the
 * player keeps their file even where the page is not allowed to start a download.
 */
export function download(name: string, text: string, type = 'text/plain'): void {
  const layer = document.querySelector('.ui-layer.l-modal') ?? document.body;
  const back = h('div', { class: 'modal-back file-sheet' });
  const status = h('div', { class: 'c-muted file-status', role: 'status' });
  const area = h('textarea', { class: 'file-text', readonly: 'readonly', spellcheck: 'false', 'aria-label': name }) as HTMLTextAreaElement;
  area.value = text;
  const close = () => { back.remove(); window.removeEventListener('keydown', esc, true); };
  const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); close(); } };
  const copy = () => {
    const fallback = () => { area.focus(); area.select(); area.scrollTop = 0; status.textContent = 'Selected. Press Ctrl+C (or ⌘C) to copy.'; };
    try {
      navigator.clipboard.writeText(text).then(() => { status.textContent = 'Copied. Paste it into a file called ' + name + '.'; }, fallback);
    } catch { fallback(); }
  };
  const lines = text.split('\n').length;
  const box = h('div', { class: 'modal glass', role: 'dialog', 'aria-modal': 'true', 'aria-label': name },
    button('✕', close, { cls: 'ghost icon small close', title: 'Close (Esc)' }),
    h('div', { class: 'kicker' }, 'Your file'),
    h('h2', null, name),
    h('p', { class: 'c-muted', style: 'font-size:13px;margin:0 0 10px' }, `${lines} line${lines === 1 ? '' : 's'}. Download it, or copy the text if your browser does not start the download.`),
    area,
    h('div', { class: 'file-actions' },
      button('Download', () => { saveFile(name, text, type); status.textContent = 'Download started. If nothing arrives, use Copy.'; }, { cls: 'primary small' }),
      button('Copy', copy, { cls: 'small' }),
      status));
  back.appendChild(box);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  window.addEventListener('keydown', esc, true);
  back.style.pointerEvents = 'auto';
  layer.appendChild(back);
  sfx.open();
}
