// Plain maths kit: the practice shell (Chapter 18's drill.ts without its rounds). One chart and one dock for
// every round; "Round n of N" in the dock head and the goal card; the round's question at the top of the
// dock; Next round; a summary with a log; More rounds (if the chapter gives a generator) and Finish. Only
// Finish wins. The round index is saved, so a reload resumes at the same round.
import type { PuzzleCtx, PuzzleRuntime } from '../../game/types';
import { h, button, inline } from '../../ui/ui';
import { sfx } from '../../audio/sfx';
import { wait } from '../../core/tween';
import { S as SAVE, save } from '../../core/save';
import { OUTCOME_NAMES, fresh, record, records, same, type Attempt, type Vec } from './logic';
import { eqRow, focusSoon, hideHint, type PlainDock } from './dock';
import type { PlaneView } from './view';

/** What a round can use. */
export interface RoundCtx {
  p: PuzzleCtx;
  view: PlaneView;
  d: PlainDock;
  /** This round's help and mistakes: add to att.wrong on a committed wrong answer. */
  att: Attempt;
  /** False once the player has moved on: async work from an old round checks it and stops. */
  live(): boolean;
  /** Call once when the round is answered right. */
  complete(): void;
}
export interface RoundRun {
  /** Hints for the stage in play (at most 3, the last one names the answer). */
  hints(): string[];
  /** Show me: play the round to the end with the real controls. */
  show(): Promise<void>;
}
export interface Round {
  id: string;
  /** Short name for the results log ("add two vectors"). */
  name: string;
  /** The round's question (markdown with $TeX$), shown in the goal card and at the top of the dock. */
  goal: string;
  noHints?: boolean;
  /** Build the round: draw the givens, add rows to d.body. The chart and dock are empty when this runs. */
  start(rc: RoundCtx): RoundRun;
}

export interface DrillText {
  kick(n: number, of: number): string;
  goal(n: number, of: number, goal: string): string;
  next: string;
  results: string;
  done(outcome: string): string;
  summary(ind: number, cor: number, ass: number): string;
  more: string;
  finish: string;
  noHints: string;
}
const TEXT: DrillText = {
  kick: (n, of) => (of ? `Round ${n} of ${of}` : `Extra round ${n}`),
  goal: (n, of, goal) => `**Round ${n}${of ? ` of ${of}` : ''}.** ${goal}`,
  next: 'Next round',
  results: 'See the results',
  done: (out) => `Done · ${out}`,
  summary: (ind, cor, ass) => `**Practice done.** No help: ${ind}. After a mistake: ${cor}. With help: ${ass}.`,
  more: 'More rounds',
  finish: 'Finish',
  noHints: 'No hints in this round. **Show me** (under **More**) plays it for you.',
};

export interface DrillOpts {
  /** Save key: the round index lives at flags[key], the results at flags[key + '-log']. */
  key: string;
  rounds: Round[];
  /** Extra round n (1, 2, …) after the fixed ones; with it the summary offers More rounds. */
  extra?: (n: number) => Round;
  view: PlaneView;
  d: PlainDock;
  text?: Partial<DrillText>;
  /** What the chart shows behind the summary. */
  frame?: Vec[];
}

/** The practice shell. Returns the puzzle's runtime (hint, Show me per round, solve). */
export function runDrill(p: PuzzleCtx, o: DrillOpts): PuzzleRuntime {
  const T = { ...TEXT, ...o.text };
  const { view, d, rounds } = o;
  const N = rounds.length;
  const LOG = `${o.key}-log`;
  const st = ((SAVE().flags[o.key] as { at: number } | undefined) ?? { at: 0 });
  SAVE().flags[o.key] = st;
  let gen = 0;
  let cur: Round | null = null;
  let run: RoundRun | null = null;
  let roundDone = false;
  let won = false;
  let att = fresh();

  const clearRound = () => {
    gen++;
    view.reset();
    d.body.replaceChildren();
    d.msg('');
    hideHint(p);
  };

  const startRound = (i: number) => {
    clearRound();
    st.at = i;
    save();
    cur = i < N ? rounds[i] : o.extra!(i - N + 1);
    roundDone = false;
    att = fresh();
    const n = i < N ? i + 1 : i - N + 1, of = i < N ? N : 0;
    d.kick.textContent = T.kick(n, of);
    p.setGoal(T.goal(n, of, cur.goal));
    // the goal card is folded on a calm screen: the dock says the question too
    d.body.append(h('div', { class: 'tj-goal', html: inline(cur.goal) }));
    const my = gen;
    const rc: RoundCtx = {
      p, view, d,
      get att() { return att; },
      live: () => my === gen,
      complete: () => {
        if (roundDone || my !== gen) return;
        roundDone = true;
        hideHint(p);
        const out = record(LOG, cur!.id, att);
        const last = i === N - 1;
        const next = button(last ? T.results : T.next, () => advance(), { cls: 'primary small' });
        const fin = i >= N ? button(T.finish, () => finish(), { cls: 'ghost small' }) : null;
        d.body.append(h('div', { class: 'tj-row tj-next' }, h('span', { class: 'tj-kick' }, T.done(OUTCOME_NAMES[out])), next, fin));
        focusSoon(p, next, 60);
      },
    };
    run = cur.start(rc);
  };

  const advance = () => {
    const i = st.at + 1;
    if (i === N) { summary(); return; }
    startRound(i);
  };

  const summary = () => {
    clearRound();
    st.at = N;
    save();
    cur = null;
    run = null;
    d.kick.textContent = 'Results';
    const rs = records(LOG);
    const count = (k: string) => rounds.filter((r) => rs[r.id] === k).length;
    const line = T.summary(count('independent'), count('corrected'), count('assisted'));
    p.setGoal(line);
    const log = h('div', { class: 'tj-log' }, ...rounds.flatMap((r, i) => [
      h('span', { class: 'n' }, `Round ${i + 1} · ${r.name}`),
      h('span', { class: rs[r.id] ?? '' }, rs[r.id] ? OUTCOME_NAMES[rs[r.id]] : 'not played'),
    ]));
    const fin = button(T.finish, () => finish(), { cls: 'primary small' });
    d.body.append(
      h('div', { class: 'tj-sum', html: inline(line) }),
      log,
      h('div', { class: 'tj-row' }, o.extra ? button(T.more, () => startRound(N), { cls: 'small' }) : null, fin),
    );
    void view.frame(o.frame ?? [[3, 3], [-3, -3]], { ms: 300 });
    focusSoon(p, fin, 60);
  };

  const finish = () => {
    if (won) return;
    won = true;
    st.at = 0;
    save();
    p.win();
  };

  if (st.at >= N && st.at < N + 1) summary(); else startRound(Math.max(0, Math.min(st.at, N + 40)));

  const hint = (() => {
    let key = '', n = 0;
    return (): { text: string; left: number } | null => {
      if (!cur || roundDone) return null;
      if (cur.noHints) { d.msg(T.noHints, 'warn'); return null; }
      const hs = run?.hints() ?? [];
      if (!hs.length) return null;
      const k = `${gen}|${hs.join('|')}`;
      if (k !== key) { key = k; n = 0; }
      const i = Math.min(n, hs.length - 1);
      if (n < hs.length) { n++; att.help++; }
      return { text: hs[i], left: hs.length - n };
    };
  })();

  const step = async () => {
    if (!cur || !run) { if (st.at === N) finish(); return; }
    if (roundDone) { advance(); return; }
    att.help++;
    await run.show();
  };

  const all = async () => {
    for (let guard = 0; guard < 4 * N + 10 && !won; guard++) {
      if (!cur) { finish(); break; }
      if (roundDone) { advance(); continue; }
      await step();
      for (let t = 0; t < 400 && !roundDone && cur; t++) await wait(20);
    }
    while (!p.won) await wait(20);
  };

  return {
    hint,
    showStep: step,
    showMe: all,
    solve: all,
    async wrong() { /* a wrong answer in the first round's box */ const c = d.body.querySelector<HTMLInputElement>('input.cell'); if (c) { c.value = '99'; d.body.querySelector<HTMLButtonElement>('.pk-eq .btn.primary')?.click(); } },
  };
}

// ------------------------------------------------------------------ a ready-made round: one box to fill

export interface EqRoundSpec<T extends number | Vec> {
  id: string;
  name: string;
  /** The question (markdown), e.g. 'Fill in the box.' */
  goal: string;
  /** The equation around the box (TeX, no $): left [ ] right. */
  left?: string;
  right?: string;
  /** The box holds a vector (two stacked boxes). */
  vec?: T extends Vec ? true : false;
  answer: T;
  /** Draw the givens when the round starts (arrows, a target). */
  draw?(view: PlaneView): void;
  /** Points to frame at the start. */
  frame?: Vec[];
  /** Animate what the typed answer gives (e.g. view.scale(x, v)). Runs on every Check. */
  play?(view: PlaneView, x: T): Promise<unknown>;
  /** Is x right? Default: equal to answer. */
  judge?(x: T): boolean;
  /** Feedback (markdown): the calculation, then two or three words. */
  good(x: T): string;
  bad(x: T): string;
  /** A ghost ring where the wrong answer puts the tip (optional). */
  ghost?(x: T): Vec | null;
  hints: string[];
}

/** A round whose whole question is one equation with one box. */
export function eqRound<T extends number | Vec>(s: EqRoundSpec<T>): Round {
  return {
    id: s.id, name: s.name, goal: s.goal,
    start(rc) {
      const { view, d, p } = rc;
      let busy = false, done = false;
      const onCheck = async (x: T) => {
        if (busy || done || !rc.live()) return;
        busy = true; row.enable(false);
        p.move();
        d.msg(''); // the last message belongs to the last picture
        try {
          view.ghost(null);
          if (s.play) await s.play(view, x);
          if (!rc.live()) return;
          if (s.judge ? s.judge(x) : same(x, s.answer)) {
            done = true;
            sfx.success();
            d.msg(s.good(x), 'good');
            rc.complete();
            return;
          }
          rc.att.wrong++;
          sfx.miss();
          const g = s.ghost?.(x);
          if (g) view.ghost(g);
          d.msg(s.bad(x), 'bad');
        } finally { busy = false; if (rc.live()) row.enable(!done); }
      };
      const row = (s.vec
        ? eqRow({ vec: true, left: s.left, right: s.right, d, onCheck: (x: Vec) => void onCheck(x as T) })
        : eqRow({ left: s.left, right: s.right, d, onCheck: (x: number) => void onCheck(x as T) })) as { el: HTMLElement; set(x: T): void; check(): void; enable(on: boolean): void; focus(): void };
      d.body.append(row.el);
      s.draw?.(view);
      void view.frame(s.frame ?? [[3, 3], [-3, -3]], { ms: 0 });
      focusSoon(p, row);
      return {
        hints: () => (done ? [] : s.hints),
        async show() { while (busy) await wait(20); if (done) return; row.set(s.answer); row.check(); while (busy) await wait(20); },
      };
    },
  };
}
