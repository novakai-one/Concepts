// The application: boots the stage and UI, shows the title screen and menus, and plays chapters.
import { Stage } from '../core/stage';
import { DragManager } from '../core/drag';
import { Backdrop } from '../gfx/background';
import { UI, h, inline, md, button, openModal, download } from '../ui/ui';
import { Dialogue, setCast, history, dialogueSettings } from '../ui/dialogue';
import { castMember } from '../content/cast';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { loadVoiceManifest, setVoiceEnabled } from '../audio/voice';
import { loadSave, save, S, chapterSave, resetSave, exportSave, type Difficulty, type CodeHelp } from '../core/save';
import { exportLibrary, exportTests } from './build';
import { setAnimSpeed, wait } from '../core/tween';
import { Hud } from './hud';
import { Runner, nameCard } from './runner';
import { CHAPTERS, ACTS, chapter as findChapter, nextChapter, chapterName, chapterLabel, chapterTopic, chapterSearchText, actLabel } from './registry';
import type { Beat, ChapterDef, CodexEntry, DoubtDef, Game } from './types';
import { TitleScene } from './title';
import { installDebug } from './debug';
import { caseBoardScreen } from './caseboard';
import { SANDBOX } from '../content/sandbox';
import { manualView, libraryView, honestyPanel } from './manual';

export { download };

export class App implements Game {
  readonly stage: Stage;
  readonly ui: UI;
  readonly drag: DragManager;
  readonly bg: Backdrop;
  readonly dialogue: Dialogue;
  readonly hud: Hud;
  readonly runner: Runner;
  readonly headless: boolean;
  private title: TitleScene | null = null;
  private playing = false;

  constructor(root: HTMLElement) {
    const params = new URLSearchParams(location.search);
    this.headless = params.has('test');
    loadSave();
    const st = S().settings;
    this.stage = new Stage(root, { quality: this.headless ? 'low' : st.quality });
    // the software renderer used by tests is slow; keep screenshots at full quality
    if (this.headless || navigator.webdriver) this.stage.autoQuality = false;
    this.bg = new Backdrop(this.stage);
    this.drag = new DragManager(this.stage);
    this.ui = new UI(document.body);
    setCast(castMember);
    this.dialogue = new Dialogue(this.ui);
    this.hud = new Hud(this.ui, {
      onMenu: () => void this.pauseMenu(),
      onCodex: () => void this.codexScreen(),
      onSettings: () => void this.settingsScreen(),
      onLog: () => void this.logScreen(),
      onCase: () => void caseBoardScreen(this.ui),
    });
    this.hud.setVisible(false);
    this.runner = new Runner(this, this.hud);
    this.applySettings();
    if (this.headless) setAnimSpeed(8);
    // automated browsers here render on a starved software GPU, where CSS animations stall at their first frame
    if (navigator.webdriver) document.documentElement.classList.add('no-anim');
    this.stage.start();
    void loadVoiceManifest();
    installDebug(this);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.playing && !this.dialogue.active && !document.querySelector('.modal-back')) void this.pauseMenu();
      if ((e.key === 'c' || e.key === 'C') && this.playing && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) void this.codexScreen();
      if ((e.key === 'l' || e.key === 'L') && this.playing && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) this.toggleHonesty();
    });
  }

  get settings() { return S().settings; }

  private honesty: HTMLElement | null = null;
  /** Key L: label what runs on the player's code, LANTERN's backup, or the engine. */
  toggleHonesty(): void {
    if (this.honesty) { this.honesty.remove(); this.honesty = null; return; }
    this.honesty = honestyPanel(this.runner.chapter?.id ?? null);
    this.ui.hud.appendChild(this.honesty);
    sfx.click();
  }

  say(lines: Parameters<Dialogue['play']>[0], o?: Parameters<Dialogue['play']>[1]) { return this.dialogue.play(lines, o); }
  toast(text: string, kicker = ''): void { this.ui.toast(text, kicker); }
  mood(name: string): void { if (!this.headless) music.play(name); }

  applySettings(): void {
    const s = S().settings;
    audio.setVolume('master', s.master);
    audio.setVolume('music', s.music);
    audio.setVolume('sfx', s.sfx);
    audio.setVolume('voice', s.voice);
    setVoiceEnabled(s.voiceOn && !this.headless);
    dialogueSettings.autoAdvance = s.autoAdvance || this.headless || navigator.webdriver;
    dialogueSettings.textSpeed = s.textSpeed;
    if (!this.headless) setAnimSpeed(s.reduceMotion ? 4 : 1);
    document.documentElement.style.setProperty('--ui-zoom', String(s.textScale ?? 1));
    document.documentElement.classList.toggle('hc', !!s.highContrast);
  }

  // ------------------------------------------------------------ flow

  async boot(): Promise<void> {
    const params = new URLSearchParams(location.search);
    const jump = params.get('chapter');
    if (jump && findChapter(jump)) {
      audio.unlock();
      await this.play(findChapter(jump)!, Number(params.get('beat') ?? 0));
      return;
    }
    await this.titleScreen();
  }

  async titleScreen(): Promise<void> {
    this.playing = false;
    this.runner.abort();
    this.hud.setVisible(false);
    this.stage.clearWorld();
    this.title?.dispose();
    this.title = new TitleScene(this);
    music.setAct(0); // the title wears the Prologue's colour, whatever was played last
    this.mood('title');
    const last = S().last;
    const lastCh = last ? findChapter(last.chapter) : undefined;
    const choice = await this.title.menu({
      canContinue: !!lastCh,
      continueLabel: lastCh ? `Continue · ${chapterLabel(lastCh)}` : 'Continue',
      canViva: this.vivaPool().length > 0,
    });
    this.title.dispose();
    this.title = null;
    if (choice === 'new') { await this.difficultyPick(); await this.play(CHAPTERS[0], 0); }
    else if (choice === 'continue' && lastCh && last) {
      const beat = last.beat >= lastCh.beats.length ? 0 : last.beat;
      const ch = last.beat >= lastCh.beats.length ? nextChapter(lastCh.id) ?? lastCh : lastCh;
      await this.play(ch, ch === lastCh ? beat : 0);
    } else if (choice === 'chapters') await this.chapterSelect();
    else if (choice === 'codex') { await this.codexScreen(); await this.titleScreen(); }
    else if (choice === 'settings') { await this.settingsScreen(); await this.titleScreen(); }
    else if (choice === 'viva') await this.viva();
    else if (choice === 'sandbox') await this.play(SANDBOX, 0);
  }

  /** Doubt and Review claims from every chapter the player has opened (no term before it is earned). */
  private vivaPool(): { ch: ChapterDef; d: DoubtDef; act: number }[] {
    const out: { ch: ChapterDef; d: DoubtDef; act: number }[] = [];
    for (const ch of CHAPTERS) {
      if (!chapterSave(ch.id).done.length) continue;
      for (const b of ch.beats) {
        if (b.kind === 'doubt') out.push({ ch, d: b.doubt, act: ch.act });
        if (b.kind === 'review') for (const d of b.review.claims) out.push({ ch, d: { ...d, who: b.review.who }, act: ch.act });
      }
    }
    return out;
  }

  /** Viva: pick an act (or all), then every claim in random order, answered by construction. */
  async viva(): Promise<void> {
    const pool = this.vivaPool();
    const acts = [...new Set(pool.map((x) => x.act))].sort((a, b) => a - b);
    let chosen: number | 'all' | null = null;
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, 'Viva'),
      h('h2', null, 'Revise every claim'),
      h('p', { class: 'c-muted' }, `${pool.length} claims from the chapters you have opened, mixed. Challenge or back each one by building a case. No puzzles.`),
      h('div', { class: 'pause-list' },
        button('All acts', () => { chosen = 'all'; close(); }, { cls: 'primary' }),
        ...acts.map((a) => button(`${actLabel(a) || 'Prologue'} only (${pool.filter((x) => x.act === a).length})`, () => { chosen = a; close(); }))),
    ]);
    if (chosen === null) { await this.titleScreen(); return; }
    const items = pool.filter((x) => chosen === 'all' || x.act === chosen);
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    this.playing = true;
    this.stage.clearWorld();
    this.hud.setVisible(true);
    const res = await this.runner.playViva(items);
    if (res === 'aborted') return;
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, 'Viva complete'),
      h('h2', null, `${res.right} of ${res.total} first calls right`),
      h('p', { class: 'c-muted' }, 'Every claim was settled by a case you built. The reasons are in your Field Manual.'),
      h('div', { class: 'pause-list' }, button('Title screen', () => close(), { cls: 'primary' })),
    ]);
    await this.titleScreen();
  }

  async play(ch: ChapterDef, beat = 0): Promise<void> {
    if (this.title) { this.title.dispose(); this.title = null; }
    this.playing = true;
    this.stage.clearWorld();
    this.hud.setVisible(true);
    const res = await this.runner.playChapter(ch, beat);
    if (res === 'aborted') return;
    await this.chapterEnd(ch);
  }

  private async chapterEnd(ch: ChapterDef): Promise<void> {
    if (ch.id === SANDBOX.id) { await this.titleScreen(); return; }
    const next = nextChapter(ch.id);
    const cs = chapterSave(ch.id);
    const puzzles = ch.beats.filter((b) => b.kind === 'puzzle').length;
    const stars = Object.values(cs.stars).reduce((s, x) => s + x, 0);
    this.hud.hideObjective();
    let go: 'next' | 'map' | 'title' = 'map';
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, `${chapterName(ch)} complete`),
      h('h2', { html: inline(ch.title) }),
      h('p', { class: 'c-muted' }, `Stars: ${stars} of ${puzzles * 3}. Replay any puzzle from the chapter map to raise them.`),
      h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:18px' },
        next ? button(`Next · ${chapterLabel(next)}`, () => { go = 'next'; close(); }, { cls: 'primary' }) : null,
        button('Chapter map', () => { go = 'map'; close(); }),
        button('Title screen', () => { go = 'title'; close(); }, { cls: 'ghost' })),
    ]);
    const g2 = go as string;
    if (g2 === 'next' && next) await this.play(next, 0);
    else if (g2 === 'title') await this.titleScreen();
    else await this.chapterSelect();
  }

  // ------------------------------------------------------------ screens

  async difficultyPick(): Promise<void> {
    const opts: { id: Difficulty; name: string; text: string }[] = [
      { id: 'cadet', name: 'Cadet', text: 'Points snap to whole numbers. More guidance on screen. Small, friendly numbers.' },
      { id: 'navigator', name: 'Navigator', text: 'Points snap to halves. Hints when you ask. Fractions appear. The intended way to play.' },
      { id: 'commander', name: 'Commander', text: 'No snapping. Messier numbers, tighter par scores, and you compute more by hand.' },
    ];
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, 'Difficulty'),
      h('h2', null, 'How do you want to play?'),
      h('p', { class: 'c-muted' }, 'You can change this at any time in Settings. Nothing is ever locked.'),
      h('div', { class: 'choice-cards' }, ...opts.map((o) => {
        const b = h('button', { class: 'choice-card', type: 'button', html: `<div class="kicker">${o.name}</div>${md(o.text)}` });
        if (S().settings.difficulty === o.id) b.setAttribute('aria-pressed', 'true');
        b.addEventListener('click', () => { S().settings.difficulty = o.id; save(); sfx.click(); close(); });
        return b;
      })),
    ]);
  }

  async chapterSelect(): Promise<void> {
    this.playing = false;
    this.runner.abort();
    this.hud.setVisible(false);
    let picked: { ch: ChapterDef; beat: number } | null = null;
    await openModal(this.ui, (close) => {
      const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
      const cards: { el: HTMLElement; col: HTMLElement; words: string[]; terms: string[]; covers: HTMLElement }[] = [];
      const cols = ACTS.filter((a) => CHAPTERS.some((c) => c.act === a.num)).map((a) => {
        const chs = CHAPTERS.filter((c) => c.act === a.num);
        // one act per row: its name on one line, its chapters wrapping underneath (no sideways scrolling)
        const list = h('div', { class: 'map-act-cards' });
        const col = h('section', { class: 'map-act' },
          h('div', { class: 'map-act-head' },
            ROMAN[a.num] ? h('span', { class: 'kicker' }, `Act ${ROMAN[a.num]}`) : null,
            h('h3', { class: 'map-act-title' }, a.title),
            h('span', { class: 'c-muted map-act-sub' }, a.subtitle)),
          list);
        for (const c of chs) {
          const cs = chapterSave(c.id);
          const puzzles = c.beats.filter((b) => b.kind === 'puzzle').length;
          const stars = Object.values(cs.stars).reduce((s, x) => s + x, 0);
          const doneAll = c.beats.every((b) => cs.done.includes(b.id));
          const covers = h('span', { class: 'map-covers' });
          const card = h('div', { class: `map-ch ${doneAll ? 'done' : ''}` },
            h('button', { class: 'map-ch-main', type: 'button' },
              h('span', { class: 'map-num' }, String(c.num)),
              h('span', { class: 'map-title' }, chapterTopic(c) || c.subtitle || ''),
              h('span', { class: 'map-sub c-muted', html: inline(c.title) }),
              covers,
              h('span', { class: 'map-stars' }, puzzles ? `★ ${stars}/${puzzles * 3}` : '')),
            h('details', { class: 'map-beats' }, h('summary', null, 'Jump to a part'),
              h('div', { class: 'map-beat-list' }, ...c.beats.map((b, i) => {
                const [tag, label] = beatLabel(b);
                if (!label) return null; // story scenes: a list of "Story" told nobody anything
                const bb = h('button', { class: `map-beat ${cs.done.includes(b.id) ? 'done' : ''}`, type: 'button', html: `${tag ? `<span class="bk">${tag}</span> ` : ''}${inline(label)}${b.kind === 'puzzle' && cs.stars[b.puzzle.id] ? ` <span class="c-yellow">${'★'.repeat(cs.stars[b.puzzle.id])}</span>` : ''}` });
                bb.addEventListener('click', () => { picked = { ch: c, beat: i }; sfx.click(); close(); });
                return bb;
              }))));
          card.querySelector('.map-ch-main')!.addEventListener('click', () => { picked = { ch: c, beat: 0 }; sfx.click(); close(); });
          list.append(card);
          // named terms the card does not already show in its topic ("dot product" under "Dot product" says nothing new)
          const topic = chapterTopic(c).toLowerCase();
          const terms = c.beats.flatMap((b) => (b.kind === 'name' && !topic.includes(b.entry.term.toLowerCase()) ? [b.entry.term] : []));
          cards.push({ el: card, col, words: searchWords(chapterSearchText(c)), terms, covers });
        }
        return col;
      });
      const grid = h('div', { class: 'map-grid' }, ...cols);
      const none = h('p', { class: 'c-muted map-none', hidden: true }, 'No chapter matches. Try one word, like matrix or vector.');
      const search = h('input', { class: 'map-search', type: 'search', placeholder: 'Search a topic, e.g. matrix multiplication', 'aria-label': 'Search chapters by topic' }) as HTMLInputElement;
      search.addEventListener('input', () => {
        const q = searchWords(search.value);
        const hits = (words: string[]) => q.every((w) => words.some((x) => x.startsWith(w)));
        for (const c of cards) {
          const on = !q.length || hits(c.words);
          c.el.hidden = !on;
          // a term the search found by name: say which, so the card shows why it matched
          const named = q.length && on ? c.terms.filter((t) => hits(searchWords(t))) : [];
          c.covers.textContent = named.length ? `Covers: ${named.join(', ')}` : '';
        }
        for (const col of cols) col.hidden = !cards.some((c) => c.col === col && !c.el.hidden);
        none.hidden = cards.some((c) => !c.el.hidden);
      });
      return [
        h('div', { class: 'kicker' }, 'Chapter map'),
        h('h2', null, 'Go anywhere'),
        search,
        none,
        grid,
        h('div', { style: 'margin-top:16px;display:flex;gap:10px' }, button('Title screen', () => { close(); }, { cls: 'ghost' })),
      ];
    }, { wide: true });
    const p = picked as { ch: ChapterDef; beat: number } | null;
    if (p) await this.play(p.ch, p.beat);
    else await this.titleScreen();
  }

  async pauseMenu(): Promise<void> {
    let action: 'resume' | 'map' | 'title' | 'restart' = 'resume';
    await openModal(this.ui, (close) => [
      h('div', { class: 'kicker' }, 'Paused'),
      h('h2', null, 'Menu'),
      h('div', { class: 'pause-list' },
        button('Resume', () => close(), { cls: 'primary' }),
        button('Restart this part', () => { action = 'restart'; close(); }),
        button('Chapter map', () => { action = 'map'; close(); }),
        button('Codex', () => { close(); void this.codexScreen(); }),
        button('Settings', () => { close(); void this.settingsScreen(); }),
        button('Title screen', () => { action = 'title'; close(); }, { cls: 'ghost' })),
      h('p', { class: 'c-muted keys-help' }, 'Keys: Enter continue · H hint · R reset · F fire · C codex · L who runs what · Esc menu'),
    ]);
    const a = action as string;
    if (a === 'map') await this.chapterSelect();
    else if (a === 'title') await this.titleScreen();
    else if (a === 'restart' && this.runner.chapter) {
      const ch = this.runner.chapter, i = this.runner.beatIndex;
      this.runner.abort();
      await wait(50);
      await this.play(ch, i);
    }
  }

  async settingsScreen(): Promise<void> {
    const s = S().settings;
    const slider = (label: string, key: 'master' | 'music' | 'sfx' | 'voice') => {
      const inp = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key], 'aria-label': label }) as HTMLInputElement;
      inp.addEventListener('input', () => { s[key] = parseFloat(inp.value); this.applySettings(); save(); });
      return h('label', { class: 'slider-row' }, h('span', null, label), inp, h('span', { class: 'val' }, ''));
    };
    const toggle = (label: string, key: 'voiceOn' | 'autoAdvance' | 'reduceMotion' | 'highContrast') => {
      const inp = h('input', { type: 'checkbox', checked: s[key] || null }) as HTMLInputElement;
      inp.addEventListener('change', () => { s[key] = inp.checked; this.applySettings(); save(); sfx.click(); });
      return h('label', { class: 'toggle-row' }, inp, h('span', null, label));
    };
    const diff = h('div', { class: 'seg' }, ...(['cadet', 'navigator', 'commander'] as Difficulty[]).map((d) => {
      const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(s.difficulty === d) }, d[0].toUpperCase() + d.slice(1));
      b.addEventListener('click', () => { s.difficulty = d; save(); diff.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); sfx.click(); });
      return b;
    }));
    const sizes = h('div', { class: 'seg' }, ...[1, 1.25, 1.5].map((z) => {
      const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String((s.textScale ?? 1) === z) }, `${Math.round(z * 100)}%`);
      b.addEventListener('click', () => { s.textScale = z; this.applySettings(); save(); sizes.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); sfx.click(); });
      return b;
    }));
    const helps: [CodeHelp, string][] = [['off', 'Off'], ['assemble', 'Assemble'], ['fill', 'Fill'], ['write', 'Write']];
    const help = h('div', { class: 'seg' }, ...helps.map(([k, label]) => {
      const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(s.codeHelp === k) }, label);
      b.addEventListener('click', () => { s.codeHelp = k; save(); help.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); sfx.click(); });
      return b;
    }));
    await openModal(this.ui, () => [
      h('div', { class: 'kicker' }, 'Settings'),
      h('h2', null, 'Settings'),
      h('div', { class: 'settings-grid' },
        h('section', null, h('h3', null, 'Difficulty'), diff,
          h('p', { class: 'c-muted', style: 'font-size:13px' }, 'Takes effect from the next puzzle. Cadet snaps to whole numbers, Navigator to halves, Commander does not snap.')),
        h('section', null, h('h3', null, 'Code'), help,
          h('p', { class: 'c-muted', style: 'font-size:13px' }, 'How much help the Python builds give. Assemble: put given lines in order. Fill: fill a few blanks. Write: write the body yourself. Off: skip the builds; no maths is lost.'),
          h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
            button('Download lantern.py', () => download('lantern.py', exportLibrary(), 'text/x-python'), { cls: 'small' }),
            button('Download test_lantern.py', () => download('test_lantern.py', exportTests(), 'text/x-python'), { cls: 'ghost small' }))),
        h('section', null, h('h3', null, 'Sound'), slider('Master', 'master'), slider('Music', 'music'), slider('Effects', 'sfx'), slider('Voices', 'voice'), toggle('Voice acting', 'voiceOn')),
        h('section', null, h('h3', null, 'Story'), toggle('Advance dialogue automatically after each line', 'autoAdvance'), toggle('Reduce motion (faster, calmer animations)', 'reduceMotion')),
        h('section', null, h('h3', null, 'Display'), h('div', { class: 'c-muted', style: 'font-size:13px;margin-bottom:6px' }, 'Text size'), sizes, toggle('High contrast panels', 'highContrast')),
        h('section', null, h('h3', null, 'Save'),
          h('p', { class: 'c-muted', style: 'font-size:13px' }, 'Progress is saved in this browser.'),
          h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
            button('Copy save data', () => { void navigator.clipboard?.writeText(exportSave()); this.toast('Save data copied'); }, { cls: 'small' }),
            button('Erase progress', () => { if (confirm('Erase all progress, codex notes and code?')) { resetSave(); this.toast('Progress erased'); } }, { cls: 'ghost small' })))),
    ]);
  }

  async codexScreen(tab: 'ideas' | 'manual' | 'library' = 'ideas'): Promise<void> {
    const entries: { e: CodexEntry; ch: ChapterDef }[] = [];
    for (const ch of CHAPTERS) for (const b of ch.beats) if (b.kind === 'name') entries.push({ e: b.entry, ch });
    await openModal(this.ui, () => {
      const pane = h('div', { class: 'codex-pane' });
      const ideas = () => {
        const detail = h('div', { class: 'codex-detail' });
        const list = h('div', { class: 'codex-list' });
        const show = (x: { e: CodexEntry; ch: ChapterDef }) => {
          detail.replaceChildren(nameCard(x.e));
          const note = h('textarea', { class: 'own-words', rows: 3, placeholder: 'Your own notes on this idea (saved in this browser).' }) as HTMLTextAreaElement;
          note.value = S().codex[x.e.id]?.note ?? '';
          note.addEventListener('input', () => { S().codex[x.e.id] = { ...(S().codex[x.e.id] ?? { at: Date.now() }), note: note.value }; save(); });
          note.addEventListener('keydown', (e) => e.stopPropagation());
          detail.append(h('div', { class: 'kicker', style: 'margin-top:14px' }, 'Your notes'), note);
        };
        // an idea not yet met shows only its chapter's plain question: no term before it is earned
        const seenList = entries.filter((x) => S().codex[x.e.id]);
        for (const x of entries) {
          const seen = !!S().codex[x.e.id];
          const b = h('button', { class: `codex-item ${seen ? '' : 'unseen'}`, type: 'button', disabled: seen ? null : true, html: `<span class="c-muted">${x.ch.num}</span> ${inline(seen ? x.e.term : x.ch.title)}` });
          if (seen) b.addEventListener('click', () => { list.querySelectorAll('.codex-item').forEach((n) => n.removeAttribute('aria-current')); b.setAttribute('aria-current', 'true'); show(x); sfx.click(); });
          list.appendChild(b);
        }
        if (seenList[0]) show(seenList[0]); else detail.append(h('p', { class: 'c-muted' }, 'Each idea appears here once you have named it in the story.'));
        return entries.length ? h('div', { class: 'codex' }, list, detail) : h('p', null, 'Nothing here yet.');
      };
      const tabs = h('div', { class: 'seg codex-tabs', role: 'tablist' });
      const views: [typeof tab, string, () => HTMLElement][] = [
        ['ideas', 'Ideas', ideas],
        ['manual', 'Field Manual', () => manualView(download)],
        ['library', 'lantern.py', () => libraryView(download)],
      ];
      const open = (t: typeof tab) => {
        tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === t)));
        pane.replaceChildren(views.find((v) => v[0] === t)![2]());
      };
      for (const [t, label] of views) {
        const b = h('button', { class: 'btn small', type: 'button', role: 'tab', 'data-tab': t }, label);
        b.addEventListener('click', () => { sfx.click(); open(t); });
        tabs.append(b);
      }
      open(tab);
      return [
        h('div', { class: 'kicker' }, 'Codex'),
        h('div', { class: 'codex-head' }, h('h2', null, 'Every idea, in plain words'), tabs),
        pane,
      ];
    }, { wide: true });
  }

  async logScreen(): Promise<void> {
    await openModal(this.ui, () => [
      h('div', { class: 'kicker' }, 'Log'),
      h('h2', null, 'What was said'),
      h('div', { class: 'log-list' }, ...history.slice(-200).map((l) => h('div', { class: 'log-line', html: `${l.who ? `<strong>${l.who}</strong> ` : ''}${inline(l.text)}` }))),
    ]);
  }
}

/** Lower-case words, plurals folded ("matrices" finds "matrix"), for the chapter map's search. */
function searchWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
    .map((w) => w.replace(/ices$/, 'ix').replace(/ies$/, 'y').replace(/([^su])s$/, '$1'));
}

/** A part of a chapter on the map: [small tag, words]. Terms and puzzles say what they are; story scenes are left out (no words). */
function beatLabel(b: Beat): [string, string] {
  switch (b.kind) {
    case 'puzzle': return ['Puzzle', b.puzzle.title];
    case 'name': return ['Term', b.entry.term];
    case 'card': return ['', b.card.title];
    case 'build': return ['Code', `${b.build.fn}()`];
    case 'doubt': return ['Check', b.doubt.claim];
    case 'review': return ['', b.review.title];
    case 'teo': return ['Teach', b.teo.title];
    case 'procedure': return ['Method', b.procedure.title];
    case 'explain': return ['', 'Explain it'];
    case 'sayit': return ['', 'Say it'];
    case 'law': return ['', 'The rule'];
    case 'compare': return ['', 'Compare with a textbook page'];
    case 'broadcast': return ['', 'The Broadcast'];
    default: return ['', ''];
  }
}
