// window.__game: the test harness drives the game through this (list chapters, jump anywhere,
// solve the current puzzle, read state). Also handy in the browser console.
import type { App } from './app';
import { buildTest, pylib } from './build';
import { NUMPY_CARDS } from '../content/numpy';
import { CHAPTERS, DEV_CHAPTERS, chapter } from './registry';
import { S } from '../core/save';
import { normLine, spoken, voiceId, type Line } from '../content/lines';
import { castMember } from '../content/cast';
import { briefingTest } from './briefing';
import { setAnimSpeed } from '../core/tween';

export function installDebug(app: App): void {
  const api = {
    /** Post-processing switches for visual debugging. */
    fx: (o: { bloom?: boolean; finish?: boolean }) => { if (o.bloom !== undefined) app.stage.bloom.enabled = o.bloom; if (o.finish !== undefined) app.stage.finish.enabled = o.finish; },
    chapters: (dev = false) => (dev ? DEV_CHAPTERS : CHAPTERS).map((c) => ({ id: c.id, act: c.act, num: c.num, title: c.title, beats: c.beats.map((b) => ({ id: b.id, kind: b.kind, puzzle: b.kind === 'puzzle' ? b.puzzle.id : undefined })) })),
    /** Start a chapter at a beat (does not wait for it to finish). */
    goto: (id: string, beat = 0) => {
      const ch = chapter(id);
      if (!ch) throw new Error(`no chapter ${id}`);
      app.runner.abort();
      void app.play(ch, beat);
      return true;
    },
    /** What is on screen now. */
    state: () => ({
      chapter: app.runner.chapter?.id ?? null,
      beat: app.runner.beatIndex,
      kind: app.runner.chapter?.beats[app.runner.beatIndex]?.kind ?? null,
      puzzle: app.runner.puzzle ? { id: app.runner.puzzle.def.id, won: app.runner.puzzle.ctx.won } : null,
      dialogue: app.dialogue.active,
      fps: Math.round(app.stage.fps),
    }),
    /** Solve the current puzzle with its solver. Resolves to true if its win condition fired. */
    solve: () => app.runner.solveCurrent(),
    /** Resolve the current Briefing step (card, say it, doubt, law, compare, procedure) the right way. */
    briefing: () => (briefingTest.solve ? briefingTest.kind : null),
    /** The open builder: switch code-help mode, run Show me, report whether it passed. */
    solveBuild: async (mode?: 'assemble' | 'fill' | 'write') => {
      const b = buildTest.current;
      if (!b) return null;
      if (mode) b.setMode(mode);
      await b.showMe();
      return { mode: b.mode(), ok: b.passed() };
    },
    /** Batched library call (installs). */
    pymap: (fn: string, cases: unknown[][]) => pylib.map(fn, cases),
    solveBriefing: async () => (briefingTest.solve ? { kind: briefingTest.kind, ok: await briefingTest.solve() } : null),
    /** Animation speed multiplier (tests). */
    setAnimSpeed: (x: number) => setAnimSpeed(x),
    /** Mount a single puzzle by chapter id + beat index and return once it is set up. */
    mountPuzzle: async (id: string, beat: number) => {
      const ch = chapter(id);
      if (!ch) throw new Error(`no chapter ${id}`);
      const b = ch.beats[beat];
      if (b.kind !== 'puzzle') throw new Error(`beat ${beat} of ${id} is ${b.kind}`);
      app.runner.abort();
      await app.runner.idle(); // let an interrupted mount unwind first, or its widgets would double up
      void app.play(ch, beat);
      // up to a minute: on a loaded software-rendered machine a puzzle can take a while to mount
      const t0 = performance.now();
      while (performance.now() - t0 < 60000 && !(app.runner.puzzle && app.runner.puzzle.def.id === b.puzzle.id && app.runner.puzzle.runtime)) await new Promise((r) => setTimeout(r, 25));
      return !!app.runner.puzzle?.runtime;
    },
    save: () => S(),
    /** Every string the player reads, with where it lives (for the wording check). */
    texts: () => {
      const out: { where: string; text: string; order: number; term?: string }[] = [];
      let order = 0;
      const add = (where: string, t: string | undefined) => { if (t) out.push({ where, text: t, order }); };
      for (const c of CHAPTERS) {
        add(`${c.id} title`, c.title);
        for (const b of c.beats) {
          order++;
          const w = `${c.id}/${b.id}`;
          if (b.kind === 'name') out.push({ where: `${w} TERM`, text: b.entry.term, order, term: b.entry.term });
          if (b.kind === 'scene') b.lines.map(normLine).forEach((l, i) => add(`${w} line ${i}`, l.text));
          if (b.kind === 'puzzle') {
            const q = b.puzzle;
            add(`${w} title`, q.title); add(`${w} goal`, q.goal);
            (q.subgoals ?? []).forEach((x, i) => add(`${w} subgoal ${i}`, x));
            q.hints.forEach((x, i) => add(`${w} hint ${i}`, x));
            if (q.predict) { add(`${w} predict`, q.predict.prompt); q.predict.choices.forEach((x) => add(`${w} choice`, x.text)); add(`${w} reveal`, q.predict.reveal); }
            (q.onWin ?? []).map(normLine).forEach((l) => add(`${w} onWin`, l.text));
          }
          if (b.kind === 'name') { const e = b.entry; for (const k of ['term', 'question', 'saw', 'means', 'name', 'why', 'cue', 'use'] as const) add(`${w} ${k}`, e[k]); }
          if (b.kind === 'explain') {
            const e = b.explain;
            add(`${w} intro`, e.intro); add(`${w} summary`, e.summary); add(`${w} ownWords`, e.ownWords);
            e.steps.forEach((s, i) => { add(`${w} step ${i}`, s.ask); s.options.forEach((o) => { add(`${w} step ${i} option`, o.text); add(`${w} step ${i} why`, o.why); }); });
          }
          if (b.kind === 'build') { add(`${w} title`, b.build.title); add(`${w} brief`, b.build.brief); add(`${w} payoff`, b.build.payoff); add(`${w} ilseNote`, b.build.ilseNote); add(`${w} docPrompt`, b.build.docPrompt); }
          if (b.kind === 'card') { add(`${w} card title`, b.card.title); add(`${w} card body`, b.card.body); add(`${w} card cue`, b.card.cue); }
          if (b.kind === 'sayit') add(`${w} ask`, b.sayit.ask);
          if (b.kind === 'doubt') { add(`${w} claim`, b.doubt.claim); add(`${w} reason`, b.doubt.reason); add(`${w} goal`, b.doubt.goal); }
          if (b.kind === 'review') for (const d of b.review.claims) { add(`${w} claim`, d.claim); add(`${w} reason`, d.reason); add(`${w} goal`, d.goal); }
          if (b.kind === 'law') {
            b.law.frame.forEach((x) => { if (typeof x === 'string') add(`${w} frame`, x); });
            Object.values(b.law.slots).forEach((sl) => sl.options.forEach((o) => add(`${w} slot`, o.text)));
            add(`${w} reason ask`, b.law.reason.ask);
            b.law.reason.options.forEach((o) => { add(`${w} reason option`, o.text); add(`${w} reason why`, o.why); });
          }
          if (b.kind === 'compare') { add(`${w} page`, b.compare.page); b.compare.keyIdeas.forEach((k) => add(`${w} key idea`, k)); }
          if (b.kind === 'teo') { add(`${w} ask`, b.teo.ask); add(`${w} title`, b.teo.title); add(`${w} brief`, b.teo.brief); b.teo.tiles.forEach((t) => add(`${w} tile`, t.text)); }
          if (b.kind === 'procedure') { add(`${w} title`, b.procedure.title); add(`${w} brief`, b.procedure.brief); b.procedure.tiles.forEach((t) => add(`${w} tile`, t.text)); }
        }
        for (const [k, ls] of Object.entries(c.script ?? {})) ls.map(normLine).forEach((l, i) => add(`${c.id} script.${k} ${i}`, l.text));
        // the subtitle (the topic's name) is shown only once the chapter is finished
        order++; add(`${c.id} subtitle`, c.subtitle);
        // the act's NumPy card follows its last chapter
        const next = CHAPTERS[CHAPTERS.indexOf(c) + 1];
        const np = !next || next.act !== c.act ? NUMPY_CARDS[c.act] : undefined;
        if (np) { order++; add(`numpy act ${c.act} title`, np.title); add(`numpy act ${c.act} body`, np.body); }
      }
      return out;
    },
    /** Every voiced line in the game, for the voice generator. */
    lines: () => {
      const all: { ch: string; l: Line }[] = [];
      for (const c of [...CHAPTERS, ...DEV_CHAPTERS]) {
        const push = (ls: Line[]) => ls.forEach((l) => all.push({ ch: c.id, l }));
        for (const b of c.beats) {
          if (b.kind === 'scene') push(b.lines);
          if (b.kind === 'explain') push([[b.explain.who, b.explain.intro]]);
          if (b.kind === 'sayit') push([[b.sayit.who, b.sayit.ask]]);
          if (b.kind === 'doubt') push([[b.doubt.who, b.doubt.claim]]);
          if (b.kind === 'teo') push([['teo', b.teo.ask]]);
          if (b.kind === 'review') push(b.review.claims.map((d) => [b.review.who, d.claim]));
          if (b.kind === 'puzzle' && b.puzzle.onWin) push(b.puzzle.onWin);
        }
        for (const ls of Object.values(c.script ?? {})) push(ls);
      }
      const seen = new Set<string>();
      return all.map(({ ch, l }) => {
        const o = normLine(l);
        const cm = castMember(o.who);
        return { id: voiceId(o), chapter: ch, who: o.who, text: o.text, spoken: spoken(o), voice: cm.voice, speed: cm.speed ?? 1 };
      }).filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
    },
    app,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}
