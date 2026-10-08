// Plays chapters beat by beat. Owns the puzzle loop (goal, hints, Show me, Skip, stars),
// the naming moment, explain-back and the builder terminal.
import type { Object3D } from 'three';
import { chapterKicker, chapterName, CHAPTERS } from './registry';
import type { Beat, ChapterDef, DoubtDef, CodexEntry, ExplainDef, Game, PuzzleCtx, PuzzleDef, PuzzleRuntime, BuildDef } from './types';
import type { Hud } from './hud';
import { h, inline, md, button } from '../ui/ui';
import { floatPanel } from '../ui/float';
import { Readout, ChoiceCards } from '../ui/widgets';
import { tex } from '../../lib/md';
import { chapterSave, save, S, type Difficulty } from '../core/save';
import { cast } from '../ui/dialogue';
import { sfx } from '../audio/sfx';
import { music } from '../audio/music';
import { setAnimSpeed, animSpeed, wait } from '../core/tween';
import { celebrate } from '../gfx/fx';
import { runBuild } from './build';
import { clearCine } from '../kit/cine';
import { shipExterior } from '../content/common/shots';
import { runBroadcast } from './broadcast';
import { NUMPY_CARDS } from '../content/numpy';
import { runCard, runSayIt, runDoubt, runReview, runLaw, runCompare, runProcedure, type BriefingHost } from './briefing';
import { Grid2D, type GridOpts } from '../gfx/grid';

export interface PuzzleState {
  def: PuzzleDef;
  ctx: PuzzleCtx;
  runtime: PuzzleRuntime | null;
  shown: boolean;
}

class Aborted extends Error { constructor() { super('aborted'); } }

export class Runner {
  chapter: ChapterDef | null = null;
  beatIndex = 0;
  puzzle: PuzzleState | null = null;
  private abortFns = new Set<() => void>();
  private aborted = false;
  /** Fired after each beat (for the debug API and progress UI). */
  onBeat: ((ch: ChapterDef, i: number) => void) | null = null;

  constructor(private readonly g: Game, private readonly hud: Hud) {}

  /** Stop whatever is running (used when jumping to another chapter or the title). */
  abort(): void {
    this.aborted = true;
    clearCine();
    for (const f of [...this.abortFns]) f();
    this.abortFns.clear();
    this.g.dialogue.abort();
    this.teardownPuzzle();
    // an interrupted cinematic's objects (and the per-frame callbacks they own) go with it
    this.g.stage.clearWorld();
    this.g.ui.panel.replaceChildren();
    this.g.ui.clearScene();
    this.hud.clearControls();
  }

  /** What the Briefing engines borrow from the runner. */
  private host(ch: ChapterDef): BriefingHost {
    return {
      g: this.g, hud: this.hud, chapterId: ch.id,
      guard: (p) => this.guard(p),
      mount: async (view) => {
        this.teardownPuzzle();
        this.g.stage.clearWorld();
        this.g.ui.clearScene();
        clearCine();
        if (view === '2d') await this.g.stage.view2D({ height: 10, ms: 600 });
        else await this.g.stage.view3D({ ms: 800 });
        const ctx = new PuzzleCtxImpl(this.g, this.hud, () => {});
        return { p: ctx, done: () => { ctx.disposeAll(); this.g.drag.clear(); this.g.stage.clearWorld(); } };
      },
    };
  }

  /** If nothing is on stage (e.g. right after a puzzle), show the ship drifting in space. */
  private async backdrop(): Promise<void> {
    if (this.g.stage.world.children.length) return;
    if (this.g.headless) return;
    await shipExterior(this.g);
  }

  /** A promise that rejects when abort() is called. */
  private guard<T>(p: Promise<T>): Promise<T> {
    if (this.aborted) return Promise.reject(new Aborted());
    return new Promise<T>((resolve, reject) => {
      const off = () => reject(new Aborted());
      this.abortFns.add(off);
      p.then((v) => { this.abortFns.delete(off); resolve(v); }, (e) => { this.abortFns.delete(off); reject(e); });
    });
  }

  /**
   * Out-of-order play (GDD §3.4): opening a chapter whose prerequisites are not finished shows a short
   * catch-up card first. Nothing is gated; LANTERN's backup covers any function not yet written.
   */
  private async catchUp(ch: ChapterDef): Promise<void> {
    if (ch.dev || navigator.webdriver) return;
    const order = CHAPTERS.filter((c) => !c.dev);
    const idx = order.findIndex((c) => c.id === ch.id);
    const prereqs = (ch.prereqs ?? (idx > 0 ? [order[idx - 1].id] : [])).map((id) => order.find((c) => c.id === id)).filter(Boolean) as ChapterDef[];
    const finished = (c: ChapterDef) => { const last = c.beats[c.beats.length - 1]; return !!last && chapterSave(c.id).done.includes(last.id); };
    const missing = prereqs.filter((c) => !finished(c));
    if (!missing.length) return;
    const list = missing.map((c) => `- ${chapterName(c)}: *${c.title}*`).join('\n');
    const body = `${ch.catchup ? `${ch.catchup}\n\n` : ''}This chapter builds on:\n\n${list}\n\nYou can play on. Any function you have not written yet runs on LANTERN's backup.`;
    await runCard(this.host(ch), { kind: 'catchup', title: 'Before you start', body });
  }

  /**
   * Viva (exam revision): Doubt and Review claims in a given order, answered by construction, no puzzles.
   * Returns how many first calls were right.
   */
  async playViva(items: { ch: ChapterDef; d: DoubtDef }[]): Promise<{ right: number; total: number } | 'aborted'> {
    this.aborted = false;
    this.chapter = null;
    this.hud.setChapter('Viva', 'Every claim, mixed');
    this.hud.hideObjective();
    this.g.mood('puzzle');
    let right = 0, total = 0;
    try {
      for (let i = 0; i < items.length; i++) {
        const { ch, d } = items[i];
        await this.guard(this.g.say([[d.who, d.claim]]));
        const r = await runDoubt(this.host(ch), d, { kicker: `Viva · ${i + 1} of ${items.length} · ${chapterName(ch)}` });
        if (!r.skipped) { total++; if (r.right) right++; }
      }
    } catch (e) {
      if (e instanceof Aborted) return 'aborted';
      throw e;
    }
    return { right, total };
  }

  private running = 0;
  /** Resolves once no chapter run is in flight (an aborted run unwinds at its next guard). */
  async idle(maxMs = 15000): Promise<void> {
    const t0 = performance.now();
    while (this.running > 0 && performance.now() - t0 < maxMs) await new Promise((r) => setTimeout(r, 20));
  }

  async playChapter(ch: ChapterDef, start = 0): Promise<'done' | 'aborted'> {
    this.running++;
    try { return await this.playChapterInner(ch, start); } finally { this.running--; }
  }

  private runId = 0;
  private bloomBase: number | null = null;
  private async playChapterInner(ch: ChapterDef, start = 0): Promise<'done' | 'aborted'> {
    const run = ++this.runId;
    this.aborted = false;
    this.chapter = ch;
    document.body.classList.toggle('calm', !!ch.calm);
    // calm screens glow less: bright lines bloom over the labels next to them
    const bloom = this.g.stage.bloom;
    this.bloomBase ??= bloom.strength;
    bloom.strength = ch.calm ? Math.min(this.bloomBase, 0.3) : this.bloomBase;
    this.hud.setChapter(chapterKicker(ch), ch.title);
    this.hud.hideObjective();
    if (ch.palette) void this.g.bg.setPalette(ch.palette as never, 1800);
    music.setAct(ch.act);
    this.g.mood(ch.music ?? 'explore');
    try {
      if (start === 0) await this.catchUp(ch);
      for (let i = start; i < ch.beats.length; i++) {
        this.beatIndex = i;
        S().last = { chapter: ch.id, beat: i };
        save();
        await this.runBeat(ch, ch.beats[i]);
        const cs = chapterSave(ch.id);
        if (!cs.done.includes(ch.beats[i].id)) cs.done.push(ch.beats[i].id);
        save();
        this.onBeat?.(ch, i);
      }
      // the act's NumPy card after its last chapter (GDD §5.7)
      const story = CHAPTERS.filter((c) => !c.dev);
      const next = story[story.findIndex((c) => c.id === ch.id) + 1];
      const card = !ch.dev && (!next || next.act !== ch.act) ? NUMPY_CARDS[ch.act] : undefined;
      if (card) await runCard(this.host(ch), card);
    } catch (e) {
      if (e instanceof Aborted) return 'aborted';
      throw e;
    } finally {
      // an aborted run ends after the next one has started: leave the newer run's calm setting alone
      if (run === this.runId) { document.body.classList.remove('calm'); bloom.strength = this.bloomBase; }
    }
    S().last = { chapter: ch.id, beat: ch.beats.length };
    save();
    return 'done';
  }

  async runBeat(ch: ChapterDef, beat: Beat): Promise<void> {
    const calm = beat.kind === 'puzzle' ? beat.puzzle.calm ?? ch.calm : ch.calm;
    if (document.body.classList.contains('calm') !== !!calm) {
      document.body.classList.toggle('calm', !!calm);
      if (this.bloomBase !== null) this.g.stage.bloom.strength = calm ? Math.min(this.bloomBase, 0.3) : this.bloomBase;
    }
    switch (beat.kind) {
      case 'scene': {
        this.hud.hideObjective();
        if (beat.view === '2d') await this.g.stage.view2D({ height: 10, ms: 900 });
        if (beat.view === '3d') await this.g.stage.view3D({ ms: 1200 });
        if (beat.setup) await this.guard(Promise.resolve(beat.setup(this.g)));
        else await this.backdrop();
        await this.guard(this.g.say(beat.lines, { onLine: beat.onLine }));
        return;
      }
      case 'cinematic': {
        this.hud.hideObjective();
        this.hud.setVisible(false);
        try { await this.guard(beat.run(this.g)); } finally { this.hud.setVisible(true); }
        return;
      }
      case 'puzzle': return this.runPuzzle(ch, beat.puzzle);
      case 'name': return this.runName(beat.entry);
      case 'explain': return this.runExplain(beat.explain);
      case 'build': {
        // Code help Off: the code thread is optional and never gates (GDD §5.1); LANTERN keeps its backup.
        if (S().settings.codeHelp === 'off') return;
        this.hud.hideObjective();
        await this.backdrop();
        await this.guard(runBuild(this.g, beat.build as BuildDef, this.hud));
        return;
      }
      case 'card': await this.backdrop(); return runCard(this.host(ch), beat.card);
      case 'sayit': this.g.stage.clearWorld(); await this.backdrop(); return runSayIt(this.host(ch), beat.sayit);
      case 'doubt': {
        // the speaker voices the claim, then the holotable opens
        await this.guard(this.g.say([[beat.doubt.who, beat.doubt.claim]]));
        await runDoubt(this.host(ch), beat.doubt);
        return;
      }
      case 'review': return runReview(this.host(ch), beat.review);
      case 'teo': {
        await this.guard(this.g.say([['teo', beat.teo.ask]]));
        return runProcedure(this.host(ch), beat.teo, { ask: beat.teo.ask });
      }
      case 'broadcast': this.g.stage.clearWorld(); await this.backdrop(); return runBroadcast(this.host(ch), beat.broadcast);
      case 'law': return runLaw(this.host(ch), beat.law);
      case 'compare': this.g.stage.clearWorld(); await this.backdrop(); return runCompare(this.host(ch), beat.compare);
      case 'procedure': return runProcedure(this.host(ch), beat.procedure);
    }
  }

  // ------------------------------------------------------------ puzzles

  private teardownPuzzle(): void {
    const p = this.puzzle;
    if (!p) return;
    try { p.runtime?.dispose?.(); } catch (e) { console.error(e); }
    (p.ctx as PuzzleCtxImpl).disposeAll();
    this.g.drag.clear();
    this.g.stage.clearWorld();
    this.g.ui.clearScene();
    this.puzzle = null;
  }

  private async mountPuzzle(def: PuzzleDef, onWin: () => void): Promise<PuzzleState> {
    this.teardownPuzzle();
    // every puzzle starts from an empty world (scenes may have left a set or a shot behind)
    this.g.stage.clearWorld();
    this.g.ui.clearScene();
    clearCine();
    if ((def.view ?? '2d') === '2d') await this.g.stage.view2D({ height: 10, ms: 700 });
    else await this.g.stage.view3D({ ms: 900 });
    const ctx = new PuzzleCtxImpl(this.g, this.hud, onWin);
    const state: PuzzleState = { def, ctx, runtime: null, shown: false };
    this.puzzle = state;
    state.runtime = await def.setup(ctx);
    return state;
  }

  async runPuzzle(ch: ChapterDef, def: PuzzleDef): Promise<void> {
    const cs = chapterSave(ch.id);
    let hintsUsed = 0;
    let prediction: string | null = null;
    const kicker = def.style === 'doubt' ? `${def.claim ? cast(def.claim.who).name : 'Crew'}'s doubt` : def.style === 'sortie' ? 'Sortie' : def.style === 'mastery' ? 'Mastery' : def.title;
    const goal = def.style === 'doubt' && def.claim ? `*“${def.claim.text}”*\n\n${def.goal}` : def.goal;
    this.hud.setObjective(kicker, def.style && def.style !== 'challenge' ? `**${def.title}**\n\n${goal}` : goal, def.subgoals);
    this.hud.setStars(cs.stars[def.id] ?? 0);
    this.g.mood('puzzle');
    music.setIntensity(0.25);

    type Outcome = 'won' | 'shown' | 'skipped';
    let finish!: (o: Outcome) => void;
    const done = new Promise<Outcome>((r) => { finish = r; });
    let state = await this.guard(this.mountPuzzle(def, () => finish('won')));

    // optional prediction first (never required)
    let predictBox: HTMLElement | null = null;
    if (def.predict) {
      predictBox = this.predictionCard(def, (id) => { prediction = id; });
      this.g.ui.scene.appendChild(predictBox);
      // once the player starts playing, an unanswered prediction gets out of the way
      const box = predictBox;
      (state.ctx as PuzzleCtxImpl).onFirstMove = () => { if (prediction === null) box.hidden = true; };
    }

    let stepping = false;
    const hintBox = h('div', { class: 'hint-box glass' });
    hintBox.hidden = true;
    this.g.ui.scene.appendChild(hintBox);
    floatPanel(hintBox, 'hint', 'Hint');

    const controls = {
      onHint: () => {
        const rt = this.puzzle?.runtime;
        if (rt?.hint) {
          // stage-aware hints: the puzzle chooses the text and keeps its own record of the help
          const got = rt.hint();
          if (!got) return;
          hintsUsed++;
          hintBox.hidden = false;
          // the count belongs to the current step, so it lives in the box, not on the button
          hintBox.innerHTML = `<div class="kicker">Hint${got.left ? ` · ${got.left} more for this step` : ''}</div>${md(got.text)}`;
          hintBox.style.pointerEvents = 'auto';
          return;
        }
        if (!def.hints.length) return;
        const i = Math.min(hintsUsed, def.hints.length - 1);
        hintsUsed = Math.min(hintsUsed + 1, def.hints.length);
        hintBox.hidden = false;
        hintBox.innerHTML = `<div class="kicker">Hint ${i + 1} of ${def.hints.length}</div>${md(def.hints[i])}`;
        hintBox.style.pointerEvents = 'auto';
        this.hud.setHintsLeft(def.hints.length - hintsUsed);
      },
      onShowMe: async () => {
        if (!this.puzzle || this.puzzle.ctx.won) return;
        const rt = this.puzzle.runtime;
        if (rt?.showStep) {
          // one stage demonstrated; the puzzle goes on (counts as help, not as a shown puzzle)
          if (stepping) return;
          stepping = true;
          hintsUsed++;
          hintBox.hidden = true;
          try { await rt.showStep(); } catch (e) { console.error(e); } finally { stepping = false; }
          return;
        }
        this.puzzle.shown = true;
        this.hud.clearControls();
        try { await this.puzzle.runtime?.showMe(); } catch (e) { console.error(e); }
        if (this.puzzle && !this.puzzle.ctx.won) { this.puzzle.ctx.win(); }
        finish('shown');
      },
      onSkip: () => finish('skipped'),
      onReset: async () => {
        if (!this.puzzle || this.puzzle.ctx.won) return;
        const keepShown = this.puzzle.shown;
        state = await this.mountPuzzle(def, () => finish('won'));
        state.shown = keepShown;
        if (predictBox) this.g.ui.scene.appendChild(predictBox);
        this.g.ui.scene.appendChild(hintBox);
        sfx.back();
      },
    };
    this.hud.showControls(controls, state.runtime?.hint ? 0 : def.hints.length);
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || this.g.dialogue.active) return;
      if (e.key === 'h' || e.key === 'H') controls.onHint();
      if (e.key === 'r' || e.key === 'R') void controls.onReset();
    };
    document.addEventListener('keydown', onKey);

    let outcome: Outcome;
    try {
      outcome = await this.guard(done);
    } finally {
      document.removeEventListener('keydown', onKey);
    }
    if (this.puzzle?.shown && outcome === 'won') outcome = 'shown';
    this.hud.clearControls();
    hintBox.remove();
    predictBox?.remove();

    if (outcome === 'skipped') {
      this.teardownPuzzle();
      return;
    }

    // score: 1 = solved yourself, 2 = within par (or no hints when there is no par), 3 = no hints + within par + prediction right
    let stars = 0;
    if (outcome === 'won') {
      const moves = this.puzzle?.ctx.moves() ?? 0;
      const withinPar = def.par === undefined ? hintsUsed === 0 : moves <= def.par;
      const predictedRight = !def.predict?.answer || prediction === def.predict.answer;
      stars = 1 + (withinPar ? 1 : 0) + (withinPar && hintsUsed === 0 && predictedRight ? 1 : 0);
    } else if (!cs.shown.includes(def.id)) cs.shown.push(def.id);
    const best = Math.max(cs.stars[def.id] ?? 0, stars);
    cs.stars[def.id] = best;
    save();
    this.hud.setStars(best);
    sfx.solved();
    music.stinger();
    for (let i = 0; i < stars; i++) window.setTimeout(() => sfx.star(i), 500 + i * 160);

    // the prediction reveal, then any closing lines
    const card = this.winCard(def, outcome, stars, prediction);
    if (!this.hud.underGoal(card)) this.g.ui.scene.appendChild(card);
    if (def.onWin?.length) await this.guard(this.g.say(def.onWin, { noSkip: false }));
    await this.guard(this.hud.primary('Continue'));
    card.remove();
    this.teardownPuzzle();
    music.setIntensity(0.3);
  }

  private predictionCard(def: PuzzleDef, onPick: (id: string) => void): HTMLElement {
    const p = def.predict!;
    const box = h('div', { class: 'predict-card glass' });
    box.style.pointerEvents = 'auto';
    const chip = h('div', { class: 'predict-chip' });
    const cards = new ChoiceCards(p.choices, (id) => {
      onPick(id);
      const c = p.choices.find((x) => x.id === id);
      chip.innerHTML = `<span class="kicker">Your prediction</span> ${inline(c?.text ?? '')}`;
      body.hidden = true;
      chip.hidden = false;
    });
    const body = h('div', { class: 'predict-body' },
      h('div', { class: 'kicker' }, 'Predict first (optional)'),
      h('div', { class: 'predict-q', html: md(p.prompt) }),
      cards.el,
      h('div', { style: 'display:flex;justify-content:flex-end;margin-top:8px' }, button('Skip', () => { body.hidden = true; box.hidden = true; }, { cls: 'ghost small' })));
    chip.hidden = true;
    box.append(body, chip);
    return box;
  }

  private winCard(def: PuzzleDef, outcome: 'won' | 'shown', stars: number, prediction: string | null): HTMLElement {
    const p = def.predict;
    let pred = '';
    if (p) {
      const right = p.answer ? prediction === p.answer : null;
      const guess = prediction ? p.choices.find((c) => c.id === prediction)?.text : null;
      pred = `<div class="win-pred">${guess ? `<div class="c-muted">You predicted: <strong>${inline(guess)}</strong>${right === null ? '' : right ? ' — <span class="c-green">right</span>' : ' — <span class="c-red">not this time</span>'}</div>` : ''}${md(p.reveal)}</div>`;
    }
    const head = outcome === 'shown' ? 'Shown' : 'Solved';
    const starHtml = outcome === 'won' ? `<span class="stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</span>` : '';
    // with no prediction to reveal, the card is only the heading: keep it small, not an empty panel
    const el = h('div', { class: `win-card glass${pred ? '' : ' bare'}`, html: `<div class="win-head"><span class="kicker">${head}</span>${starHtml}</div>${pred}` });
    el.style.pointerEvents = 'auto';
    return el;
  }

  /** Test hook: solve the current puzzle instantly. Returns true if the win condition fired. */
  async solveCurrent(): Promise<boolean> {
    const p = this.puzzle;
    if (!p || !p.runtime) return false;
    const old = animSpeed();
    setAnimSpeed(1000);
    try {
      if (p.runtime.solve) await p.runtime.solve();
      else await p.runtime.showMe();
      await wait(50);
    } finally { setAnimSpeed(old); }
    return p.ctx.won;
  }

  // ------------------------------------------------------------ naming moment

  async runName(e: CodexEntry): Promise<void> {
    this.hud.hideObjective();
    if (!e.visual) await this.backdrop();
    const firstTime = !S().codex[e.id];
    S().codex[e.id] = { ...(S().codex[e.id] ?? {}), at: Date.now() };
    save();
    if (e.visual) await this.guard(Promise.resolve(e.visual(this.g)));
    sfx.discover();
    const card = nameCard(e);
    card.style.pointerEvents = 'auto';
    this.g.ui.scene.appendChild(card);
    if (firstTime) this.g.toast(`New codex entry: **${e.term}**`, 'Codex');
    await this.guard(this.hud.primary('Continue'));
    card.remove();
  }

  // ------------------------------------------------------------ explain-back

  async runExplain(def: ExplainDef): Promise<void> {
    this.hud.hideObjective();
    const picked: string[] = [];
    const box = h('div', { class: 'explain-card glass' });
    box.style.pointerEvents = 'auto';
    await this.guard(this.g.say([[def.who, def.intro]]));
    this.g.ui.scene.appendChild(box);
    const built = h('div', { class: 'explain-built' });
    box.append(h('div', { class: 'kicker' }, 'Your explanation so far'), built);
    const stage = h('div', { class: 'explain-stage' });
    box.appendChild(stage);

    for (let si = 0; si < def.steps.length; si++) {
      const step = def.steps[si];
      this.g.stage.clearWorld();
      if (step.visual) await this.guard(Promise.resolve(step.visual(this.g)));
      const feedback = h('div', { class: 'explain-feedback' });
      let resolveStep!: (id: string) => void;
      const stepDone = new Promise<string>((r) => { resolveStep = r; });
      const cards = new ChoiceCards(step.options.map((o) => ({ id: o.id, text: o.text })), (id) => {
        const o = step.options.find((x) => x.id === id)!;
        cards.mark(id, o.right ? 'right' : 'wrong');
        feedback.innerHTML = `<div class="${o.right ? 'c-green' : 'c-red'} kicker">${o.right ? 'Yes' : 'Not quite'}</div>${md(o.why)}`;
        if (o.right) { sfx.success(); cards.disable(); window.setTimeout(() => resolveStep(id), 300); } else sfx.miss();
      });
      const showAns = button('Show the answer', () => {
        const r = step.options.find((x) => x.right)!;
        cards.mark(r.id, 'right');
        feedback.innerHTML = `<div class="c-green kicker">Answer</div>${md(r.why)}`;
        cards.disable();
        resolveStep(r.id);
      }, { cls: 'ghost small' });
      stage.replaceChildren(
        h('div', { class: 'kicker' }, `Step ${si + 1} of ${def.steps.length}`),
        h('div', { class: 'explain-q', html: md(step.ask) }),
        cards.el, feedback,
        h('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:6px' }, showAns));
      const id = await this.guard(stepDone);
      picked.push(id);
      const right = step.options.find((x) => x.id === id)!;
      built.appendChild(h('div', { class: 'explain-piece', html: md(right.text) }));
      await this.guard(this.hud.primary(si + 1 < def.steps.length ? 'Next' : 'Finish'));
    }

    // the assembled explanation + own words
    const area = h('textarea', { class: 'own-words', rows: 4, placeholder: def.ownWords ?? 'Say it in your own words (saved to your logbook).' }) as HTMLTextAreaElement;
    area.value = S().explains[def.id]?.text ?? '';
    stage.replaceChildren(
      h('div', { class: 'kicker' }, 'The full explanation'),
      h('div', { class: 'explain-summary', html: md(def.summary) }),
      h('div', { class: 'kicker', style: 'margin-top:12px' }, 'In your own words (optional)'),
      ...(def.ownWords ? [h('div', { class: 'c-muted', html: inline(def.ownWords) })] : []),
      area);
    await this.guard(this.hud.primary('Save to logbook'));
    S().explains[def.id] = { picked, text: area.value.trim() || undefined, at: Date.now() };
    save();
    if (area.value.trim()) this.g.toast('Saved to your logbook', 'Logbook');
    box.remove();
    this.g.stage.clearWorld();
  }
}

export function nameCard(e: CodexEntry): HTMLElement {
  return h('div', { class: 'name-card glass' },
    h('div', { class: 'kicker' }, 'New idea'),
    h('h2', { class: 'name-term', html: inline(e.term) }),
    h('div', { class: 'name-q', html: inline(e.question) }),
    h('div', { class: 'name-grid' },
      h('section', null, h('h4', null, 'What you saw'), h('div', { html: md(e.saw) })),
      h('section', null, h('h4', null, 'What it means'), h('div', { html: md(e.means) })),
      h('section', null, h('h4', null, 'Its name'), h('div', { html: md(e.name) })),
      e.formula ? h('section', { class: 'formula' }, h('h4', null, 'The formula'), h('div', { html: tex(e.formula, true) }), e.why ? h('div', { class: 'why', html: md(e.why) }) : null) : null),
    e.cue ? h('div', { class: 'name-cue', html: md(e.cue) }) : null,
    e.use ? h('div', { class: 'name-use', html: md(`**Where it shows up:** ${e.use}`) }) : null);
}

/** The puzzle context handed to setup(). */
class PuzzleCtxImpl implements PuzzleCtx {
  private disposers: (() => void)[] = [];
  private moveCount = 0;
  private dockEl: HTMLElement | null = null;
  won = false;
  readonly difficulty: Difficulty;

  constructor(readonly g: Game, private readonly hud: Hud, private readonly onWin: () => void) {
    this.difficulty = g.settings.difficulty;
  }

  snap(): number | null { return this.difficulty === 'cadet' ? 1 : this.difficulty === 'navigator' ? 0.5 : null; }

  win(): void {
    if (this.won || this.disposed) return;
    this.won = true;
    const t = this.g.stage.target;
    void celebrate(this.g.stage, [t.x, t.y, 0]);
    this.onWin();
  }

  onFirstMove: (() => void) | null = null;
  move(n = 1): void {
    if (this.moveCount === 0 && this.onFirstMove) { this.onFirstMove(); this.onFirstMove = null; }
    this.moveCount += n;
  }
  moves(): number { return this.moveCount; }
  subgoal(i: number, done = true): void { if (this.disposed) return; this.hud.subgoal(i, done); if (done) sfx.success(); }
  setGoal(m: string): void { if (!this.disposed) this.hud.setGoal(m); }

  add(...objs: (Object3D | { object: Object3D })[]): void {
    for (const o of objs) {
      const obj = 'isObject3D' in o ? (o as Object3D) : (o as { object: Object3D }).object;
      if (this.disposed) {
        // a late timer adding to a torn-down puzzle: dispose at once instead of leaking into the next beat
        const d = (o as { dispose?: () => void }).dispose;
        if (typeof d === 'function' && !('isObject3D' in o)) { try { d.call(o); } catch { /* already gone */ } }
        continue;
      }
      this.g.stage.world.add(obj);
      const d = (o as { dispose?: () => void }).dispose;
      if (typeof d === 'function' && !('isObject3D' in o)) this.disposers.push(() => d.call(o));
    }
  }

  private gridObj: Grid2D | null = null;
  grid(o?: GridOpts): Grid2D {
    if (!this.gridObj) {
      this.gridObj = new Grid2D(this.g.stage, o);
      this.g.stage.world.add(this.gridObj.object);
      const gr = this.gridObj;
      this.disposers.push(() => gr.dispose());
    } else if (o) this.gridObj.setLook(o);
    return this.gridObj;
  }

  readout(title?: string): Readout {
    const r = new Readout(title);
    r.el.style.pointerEvents = 'auto';
    if (!this.disposed) this.g.ui.scene.appendChild(r.el);
    return r;
  }

  dock(): HTMLElement {
    if (!this.dockEl) {
      this.dockEl = h('div', { class: 'dock glass' });
      this.dockEl.style.pointerEvents = 'auto';
      this.g.ui.scene.appendChild(this.dockEl);
      floatPanel(this.dockEl, 'dock', 'Controls');
      // phones stack the readout above the dock (screens.css reads --dock-h)
      const dock = this.dockEl, root = document.documentElement.style;
      const ro = new ResizeObserver(() => root.setProperty('--dock-h', `${dock.offsetHeight}px`));
      ro.observe(dock);
      this.disposers.push(() => { ro.disconnect(); root.removeProperty('--dock-h'); });
    }
    return this.dockEl;
  }

  onDispose(fn: () => void): void { this.disposers.push(fn); }
  tick(fn: (dt: number, t: number) => void): void { this.disposers.push(this.g.stage.tick(fn)); }

  bark(who: string, text: string): void {
    if (this.disposed) return; // a late timer from a puzzle the player has left
    const c = cast(who);
    const el = h('div', { class: 'bark glass', html: `<span class="kicker" style="color:${c.color}">${c.name}</span> ${inline(text)}` });
    this.g.ui.scene.appendChild(el);
    window.setTimeout(() => el.remove(), 5200);
  }

  /** True once the puzzle is torn down: late timers from a puzzle must not touch the next beat. */
  disposed = false;

  disposeAll(): void {
    this.disposed = true;
    for (const d of this.disposers.splice(0)) { try { d(); } catch (e) { console.error(e); } }
    this.dockEl?.remove();
  }
}
