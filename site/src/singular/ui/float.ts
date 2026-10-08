// Floating panels: the objective card, the puzzle dock and the hint box can be minimised, dragged and
// resized, so the player can clear the chart. A slim bar on top carries a grip (drag; double-click
// puts the panel back) and a minimise button. Puzzles replace panel contents freely: the bar is put
// back whenever it is removed. Position, size and minimised state are remembered per panel.
import { h } from './ui';

interface Saved { x?: number; y?: number; w?: number; hgt?: number; min?: boolean }

const store = {
  get(key: string): Saved {
    try { return JSON.parse(localStorage.getItem(`panel:${key}`) ?? '{}') as Saved; } catch { return {}; }
  },
  set(key: string, s: Saved): void {
    try { localStorage.setItem(`panel:${key}`, JSON.stringify(s)); } catch { /* storage blocked: keep it for this page only */ }
  },
};

/** Phones keep their fixed strips: minimise only, no drag or resize. */
let front = 30;
const small = (): boolean => window.matchMedia('(max-width: 800px), (pointer: coarse)').matches;

/** `keepMin`: remember "minimised" across new panels too (only for a panel that lives all game). */
export function floatPanel(el: HTMLElement, key: string, label: string, keepMin = false): void {
  if (el.dataset.float) return;
  el.dataset.float = key;
  el.classList.add('fp');
  let s = store.get(key);
  // a new puzzle's dock or hint opens unminimised: its controls are never hidden behind a "+"
  if (!keepMin) s.min = false;

  const min = h('button', { class: 'fp-btn', type: 'button' }) as HTMLButtonElement;
  const grip = h('span', { class: 'fp-grip', title: 'Drag to move. Double-click to put it back.' }, h('span', { class: 'fp-dots', 'aria-hidden': 'true' }, '⠿'), h('span', { class: 'fp-label' }, label));
  const bar = h('div', { class: 'fp-bar' }, grip, min);

  const showMin = () => {
    el.classList.toggle('fp-min', !!s.min);
    min.textContent = s.min ? '+' : '–';
    min.title = s.min ? `Show ${label.toLowerCase()}` : `Minimise ${label.toLowerCase()}`;
    min.setAttribute('aria-label', min.title);
    min.setAttribute('aria-expanded', String(!s.min));
  };
  const place = () => {
    if (small() || s.x === undefined || s.y === undefined) return;
    // keep at least the bar on screen
    const x = Math.min(Math.max(0, s.x), window.innerWidth - 80), y = Math.min(Math.max(0, s.y), window.innerHeight - 30);
    Object.assign(el.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto', transform: 'none', margin: '0' });
  };
  const size = () => {
    if (small()) return;
    if (s.w) el.style.width = `${s.w}px`;
    if (s.hgt) { el.style.height = `${s.hgt}px`; el.style.maxHeight = 'none'; }
  };
  const reset = () => {
    s = { min: false };
    store.set(key, s);
    for (const p of ['position', 'left', 'top', 'right', 'bottom', 'transform', 'margin', 'width', 'height', 'maxHeight'] as const) el.style[p] = '';
    showMin();
  };

  min.addEventListener('click', () => { s = { ...s, min: !s.min }; store.set(key, s); showMin(); });
  // the panel the player touches comes to the front
  el.addEventListener('pointerdown', () => { el.style.zIndex = String(++front); }, true);
  grip.addEventListener('dblclick', reset);
  grip.addEventListener('pointerdown', (e) => {
    if (small() || e.button !== 0) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    // a bottom-anchored panel keeps its height when it switches to top/left
    if (!el.style.height && !s.min) el.style.maxHeight = `${Math.max(120, window.innerHeight - 20)}px`;
    grip.setPointerCapture(e.pointerId);
    const move = (m: PointerEvent) => { s = { ...s, x: m.clientX - dx, y: m.clientY - dy }; place(); };
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); store.set(key, s); };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  });
  // the browser's resize corner: remember the size the player chose
  new ResizeObserver(() => {
    if (small() || s.min || (!el.style.width && !el.style.height)) return;
    const r = el.getBoundingClientRect();
    // a panel being taken down measures 0 × 0: not a size the player chose
    if (!el.isConnected || r.width < 1 || r.height < 1) return;
    s = { ...s, w: Math.round(r.width), hgt: Math.round(r.height) };
    store.set(key, s);
  }).observe(el);

  const keepBar = () => { if (el.firstChild !== bar) el.prepend(bar); };
  new MutationObserver(keepBar).observe(el, { childList: true });
  keepBar();
  showMin();
  size();
  place();
}
