// Cinematic dialogue on the comm channel. Words fade in in time with the voice line.
// Click, Space or Enter: finish the line / next line. Esc: skip the rest of the scene.
import { h, inline, button, type UI } from './ui';
import { Portrait, type CastMember } from './portrait';
import { playVoice, preloadVoices, readingMs, stopVoice, hasVoice } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { voiceId, type Line, type LineObj, normLine } from '../content/lines';

export interface DialogueOpts {
  /** Called before each line is shown (camera moves, visuals). May be async. */
  onLine?: (line: LineObj, index: number) => void | Promise<void>;
  /** Hide the "skip scene" control (e.g. for a single line). */
  noSkip?: boolean;
}

export interface DialogueSettings { autoAdvance: boolean; textSpeed: number; voiceRate: number }

let castLookup: (id: string) => CastMember = (id) => ({ name: id, role: '', color: '#59e1ff', voice: 'af_heart', sigil: id[0]?.toUpperCase() ?? '?' });
export function setCast(f: (id: string) => CastMember): void { castLookup = f; }
export function cast(id: string): CastMember { return castLookup(id); }

export const dialogueSettings: DialogueSettings = { autoAdvance: false, textSpeed: 1, voiceRate: 1 };

/** Every line shown this session (for the Log). */
export const history: { who: string; text: string }[] = [];

export class Dialogue {
  private box: HTMLElement | null = null;
  private portrait = new Portrait(104);
  active = false;

  constructor(private readonly ui: UI) {}

  /** Play lines in order. Resolves with the id of the last choice made (if any). */
  async play(lines: Line[], o: DialogueOpts = {}): Promise<string | undefined> {
    const items = lines.map(normLine);
    if (!items.length) return undefined;
    preloadVoices(items.slice(0, 3).map((l) => voiceId(l)));
    this.active = true;
    let skipped = false;
    let lastChoice: string | undefined;
    const box = h('div', { class: 'dialogue glass', role: 'dialog', 'aria-live': 'polite' });
    box.style.pointerEvents = 'auto';
    this.box = box;
    const pWrap = h('div', { class: 'pwrap' }, this.portrait.canvas);
    const name = h('span', { class: 'name' });
    const role = h('span', { class: 'role' });
    const text = h('div', { class: 'text' });
    const cont = h('div', { class: 'cont' }, h('span', { class: 'blink' }, '▸'), 'Continue', h('span', { class: 'kbd-hint' }, '(Space)'));
    const skipBtn = o.noSkip ? null : button('Skip scene', () => { skipped = true; advance?.(); }, { cls: 'ghost small', kbd: 'Esc' });
    const foot = h('div', { class: 'foot' }, cont, skipBtn);
    const choiceBox = h('div', { class: 'choices' });
    box.append(pWrap, h('div', { class: 'body' }, h('div', { class: 'who' }, name, role), text, choiceBox, foot));
    this.ui.dialogue.appendChild(box);

    let advance: (() => void) | null = null;
    let finishReveal: (() => void) | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !o.noSkip) { e.preventDefault(); skipped = true; finishReveal?.(); advance?.(); return; }
      if (e.key === ' ' || e.key === 'Enter') {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON' || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (finishReveal) finishReveal(); else advance?.();
      }
    };
    const onClick = () => { if (finishReveal) finishReveal(); else advance?.(); };
    box.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);

    for (let i = 0; i < items.length && !skipped; i++) {
      const line = items[i];
      preloadVoices(items.slice(i + 1, i + 3).map((l) => voiceId(l)));
      if (o.onLine) await o.onLine(line, i);
      if (skipped) break;
      const narration = line.who === 'narrator';
      box.classList.toggle('narration', narration);
      const who = cast(line.who);
      if (!narration) {
        this.portrait.set(who);
        name.textContent = who.name;
        name.style.color = who.color;
        role.textContent = who.role;
      }
      // words as spans so they can fade in one by one
      text.innerHTML = wordSpans(line.text);
      const words = [...text.querySelectorAll<HTMLElement>('.w')];
      choiceBox.replaceChildren();
      cont.style.visibility = 'hidden';
      history.push({ who: narration ? '' : who.name, text: line.text });

      let revealDone = false;
      let voiceDone = false;
      const revealAll = () => { words.forEach((w) => w.classList.add('on')); revealDone = true; };
      finishReveal = () => { revealAll(); finishReveal = null; };
      this.portrait.speaking = true;
      const id = voiceId(line);
      const voiceP = playVoice(id, (ms) => {
        const total = ms > 0 ? ms * 0.92 : (readingMs(line.text) * 0.55) / dialogueSettings.textSpeed;
        const per = total / Math.max(1, words.length);
        words.forEach((w, k) => window.setTimeout(() => { if (!revealDone) { w.classList.add('on'); if (!hasVoice(id) && k % 3 === 0) sfx.type(); } }, k * per));
        window.setTimeout(() => { if (!revealDone) { revealAll(); finishReveal = null; } }, total + 30);
      }, dialogueSettings.voiceRate).then(() => { voiceDone = true; this.portrait.speaking = false; });

      if (line.choices?.length) {
        await voiceP.catch(() => {});
        revealAll(); finishReveal = null;
        lastChoice = await new Promise<string>((resolve) => {
          line.choices!.forEach((c) => {
            const b = button(c.text, () => resolve(c.id), { cls: 'choice', html: true });
            b.innerHTML = inline(c.text);
            choiceBox.appendChild(b);
          });
          (choiceBox.firstElementChild as HTMLElement | null)?.focus();
        });
        choiceBox.replaceChildren();
        continue;
      }

      await new Promise<void>((resolve) => {
        advance = () => { advance = null; resolve(); };
        const showCont = () => { if (advance) cont.style.visibility = 'visible'; };
        void voiceP.then(() => {
          showCont();
          if (dialogueSettings.autoAdvance && advance) window.setTimeout(() => advance?.(), 900);
        });
        // with no audio, allow continuing once the words are in
        const iv = window.setInterval(() => { if (!finishReveal) { showCont(); window.clearInterval(iv); } }, 100);
      });
      if (!voiceDone) stopVoice();
      this.portrait.speaking = false;
      finishReveal = null;
      sfx.click();
    }

    stopVoice();
    document.removeEventListener('keydown', onKey);
    box.remove();
    this.box = null;
    this.active = false;
    return lastChoice;
  }

  /** Close any open dialogue at once. */
  abort(): void {
    stopVoice();
    this.box?.remove();
    this.box = null;
    this.active = false;
  }
}

/** Markdown/KaTeX line → HTML with each word wrapped for the fade-in. Maths stays whole. */
function wordSpans(src: string): string {
  const html = inline(src);
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? '').split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); }
        }
        child.replaceWith(frag);
      } else if (child instanceof HTMLElement) {
        if (child.classList.contains('katex')) child.classList.add('w');
        else walk(child);
      }
    }
  };
  walk(tmp);
  return tmp.innerHTML;
}
