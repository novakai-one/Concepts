// Practice rounds inside one puzzle: "Round 3 of 10", each round a short typed question, a results list at the
// end. Each round records how it was passed: no help, after a mistake, or with help (a hint or Show me).
// The model is Chapter 18's ten practice rounds; any chapter can use this with its own rounds and chart.
import type { PuzzleCtx, PuzzleRuntime } from '../game/types';
import { h, button, inline } from '../ui/ui';
import { wait } from '../core/tween';
import { S as SAVE, save } from '../core/save';
import { hideHint, type TypedDock } from './typed';

export type Outcome = 'independent' | 'corrected' | 'assisted';
export interface Attempt { help: number; wrong: number }
/** Any hint or Show me makes a pass assisted; a wrong answer fixed without help is corrected. */
export const outcomeOf = (a: Attempt): Outcome => (a.help > 0 ? 'assisted' : a.wrong > 0 ? 'corrected' : 'independent');
export const OUTCOME_NAMES: Record<Outcome, string> = { independent: 'no help', corrected: 'after a mistake', assisted: 'with help' };

/** What a running round can use. */
export interface RoundCtx {
  p: PuzzleCtx;
  d: TypedDock;
  att: Attempt;
  /** False once the player has moved on: async work from an old round stops. */
  alive(): boolean;
  /** The round is passed (call once). */
  complete(): void;
}
/** A started round: Show me for this round, and its hints. */
export interface RoundRun { show(): Promise<void>; hints(): string[] }
export interface Round {
  /** Short name for the results list. */
  name: string;
  /** The question (markdown with TeX), shown above the controls. */
  goal: string;
  start(rc: RoundCtx): RoundRun;
}

export interface RoundsOpts {
  /** Save key: progress and results survive a reload. */
  key: string;
  rounds: Round[];
  d: TypedDock;
  /** Called before each round starts and before the results (clear the chart). */
  reset(): void;
  /** Shown with the results, above the list. */
  summaryNote?: string;
}

interface State { at: number; rec: Record<number, Outcome> }

/** Run the rounds in the dock. Returns the puzzle runtime (hints, Show me, solve). */
export function runRounds(p: PuzzleCtx, o: RoundsOpts): PuzzleRuntime {
  const { d, rounds } = o;
  const n = rounds.length;
  const st = ((SAVE().flags[o.key] as State | undefined) ??= { at: 0, rec: {} });
  SAVE().flags[o.key] = st;
  const label = h('span', { class: 'tj-kick' });
  d.head.append(label);
  let gen = 0;
  let run: RoundRun | null = null;
  let att: Attempt = { help: 0, wrong: 0 };
  let done = false, won = false, inSummary = false;

  const startRound = (i: number) => {
    gen++;
    const g = gen;
    o.reset();
    d.body.replaceChildren();
    d.msg('');
    hideHint(p);
    st.at = i;
    save();
    inSummary = false;
    done = false;
    att = { help: 0, wrong: 0 };
    const r = rounds[i];
    label.textContent = `Round ${i + 1} of ${n}`;
    p.setGoal(`**Round ${i + 1} of ${n}.** ${r.goal}`);
    d.body.append(h('div', { class: 'tj-goal', html: inline(r.goal) }));
    const rc: RoundCtx = {
      p, d, get att() { return att; },
      alive: () => g === gen,
      complete: () => {
        if (g !== gen || done) return;
        done = true;
        st.rec[i] = outcomeOf(att);
        save();
        const next = button(i === n - 1 ? 'See the results' : 'Next round', () => advance(), { cls: 'primary small' });
        d.body.append(h('div', { class: 'tj-row tj-next' }, next));
        if (!p.g.headless) window.setTimeout(() => next.focus(), 60);
      },
    };
    run = r.start(rc);
  };

  const advance = () => {
    if (st.at + 1 >= n) summary();
    else startRound(st.at + 1);
  };

  const summary = () => {
    gen++;
    o.reset();
    d.body.replaceChildren();
    d.msg('');
    hideHint(p);
    inSummary = true;
    run = null;
    st.at = n;
    save();
    label.textContent = 'Results';
    const count = (x: Outcome) => rounds.filter((_, i) => st.rec[i] === x).length;
    const line = `No help: **${count('independent')}** · After a mistake: **${count('corrected')}** · With help: **${count('assisted')}**`;
    p.setGoal(`**Results.** ${line}`);
    const log = h('div', { class: 'tj-log' }, ...rounds.flatMap((r, i) => [
      h('span', { class: 'n' }, `${i + 1} · ${r.name}`),
      h('span', { class: st.rec[i] ?? '' }, st.rec[i] ? OUTCOME_NAMES[st.rec[i]] : 'not played'),
    ]));
    const finishBtn = button('Finish', () => finish(), { cls: 'primary small' });
    d.body.append(
      h('div', { class: 'tj-sum', html: inline(line) }),
      o.summaryNote ? h('div', { class: 'tj-aside', html: inline(o.summaryNote) }) : '',
      log,
      h('div', { class: 'tj-row' }, button('Play again', () => { st.rec = {}; startRound(0); }, { cls: 'small' }), finishBtn),
    );
    if (!p.g.headless) window.setTimeout(() => finishBtn.focus(), 60);
  };

  const finish = () => {
    if (won) return;
    won = true;
    st.at = 0;
    save();
    p.win();
  };

  if (st.at >= n) summary(); else startRound(Math.max(0, st.at));

  const hint = (() => {
    let key = '', k = 0;
    return (): { text: string; left: number } | null => {
      if (!run || done) return null;
      const hs = run.hints();
      if (!hs.length) return null;
      const id = `${gen}|${hs.join('|')}`;
      if (id !== key) { key = id; k = 0; }
      const i = Math.min(k, hs.length - 1);
      if (k < hs.length) { k++; att.help++; }
      return { text: hs[i], left: hs.length - k };
    };
  })();

  const step = async () => {
    if (inSummary) { finish(); return; }
    if (!run) return;
    if (done) { advance(); return; }
    att.help++;
    await run.show();
  };

  const all = async () => {
    for (let guard = 0; guard < 6 * n + 10 && !won; guard++) {
      await step();
      for (let t = 0; t < 600 && run && !done && !inSummary && !won; t++) await wait(20);
    }
    while (!p.won) await wait(20);
  };

  return { hint, showStep: step, showMe: all, solve: all };
}
