// Commander-first practice: one submitted vector, one diagram, ten deliberate rounds.
import type { PuzzleCtx, PuzzleDef, PuzzleRuntime, V3 } from '../../../game/types';
import { h, button, inline } from '../../../ui/ui';
import { NumCell, hideHint } from '../../../kit/plain/dock';
import { tv, tnp, tnb } from '../../../kit/plain/tex';
import { S, save } from '../../../core/save';
import { dot } from '../../../math/la';
import { CrossView } from './practice-view';
import { CROSS_ROUNDS, type CrossRound, judge, areaSquared, sampleAnswer } from './practice-logic';
import '../../../kit/plain/plain.css';
import './practice.css';

type Result = 'independent' | 'corrected' | 'assisted';
interface Progress { at: number; wrong: number; help: number; results: Result[]; note: string }
const KEY = 'c05-vector-practice-v1';
const square = (v: V3) => dot(v, v);
const root = (n: number): string => Number.isInteger(Math.sqrt(n)) ? tnp(Math.sqrt(n)) : `\\sqrt{${tnp(n)}}`;
const product = (a: V3, b: V3) => a.map((x, i) => `${tnb(x)}\\cdot${tnb(b[i])}`).join('+');
const lengths = (r: CrossRound, n: V3) => r.task === 'area'
  ? `$\\|\\mathbf n\\|=\\sqrt{${n.map(x => `${tnb(x)}^2`).join('+')}}=${root(square(n))}$`
  : `$\\|\\mathbf n\\|^2=${n.map(x => `${tnb(x)}^2`).join('+')}=${tnp(square(n))}$`;
function instruction(r: CrossRound): string {
  if (r.task === 'direction') return 'Find a nonzero vector perpendicular to both vectors.';
  if (r.task === 'area') return 'Now match the length to the area.';
  return 'Find the cross product.';
}
function hints(r: CrossRound): string[] {
  const answer = sampleAnswer(r);
  const first = r.task === 'direction'
    ? 'A right angle gives $\\mathbf n\\cdot\\mathbf v=0$ and $\\mathbf n\\cdot\\mathbf w=0$. Solve both equations; the zero vector has no direction.'
    : r.task === 'area'
      ? 'First solve $\\mathbf n\\cdot\\mathbf v=0$ and $\\mathbf n\\cdot\\mathbf w=0$. Then scale your vector so its length equals the area.'
      : 'Curl your right fingers from $\\mathbf v$ to $\\mathbf w$; your thumb chooses the perpendicular direction. Its length is the parallelogram’s area.';
  const second = r.task === 'cross' ? `$\\mathbf v\\times\\mathbf w=\\begin{bmatrix}v_2w_3-v_3w_2\\\\v_3w_1-v_1w_3\\\\v_1w_2-v_2w_1\\end{bmatrix}$`
    : r.task === 'area' ? `$\\text{area}^2=\\|\\mathbf v\\|^2\\|\\mathbf w\\|^2-(\\mathbf v\\cdot\\mathbf w)^2=${square(r.v)}\\cdot${square(r.w)}-${tnb(dot(r.v, r.w))}^2=${areaSquared(r)}$`
    : `$${r.v.map((x, i) => `${tnb(x)}n_${i + 1}`).join('+')}=0$, $${r.w.map((x, i) => `${tnb(x)}n_${i + 1}`).join('+')}=0$. Choose one component, then solve for the others.`;
  return [first, second, `${r.task === 'cross' ? 'The cross product is' : 'One answer is'} $${tv(answer)}$.`];
}

export const crossPractice: PuzzleDef = {
  id: 'c05-p1', title: 'Perpendicular vectors · ten rounds',
  goal: 'Type a vector, check it, and use the picture to try again.', hints: [], view: '2d',
  setup: setupPractice,
};

function setupPractice(p: PuzzleCtx): PuzzleRuntime {
  document.body.classList.add('cp-active');
  const sky = p.g.stage.sky.visible;
  p.g.stage.sky.visible = false;
  const view = new CrossView(() => p.g.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);
  const aside = h('section', { class: 'cp-controls', 'aria-label': 'Practice question' });
  const layout = h('main', { class: 'cp-layout' }, aside, view.el);
  p.g.ui.scene.append(layout);
  let disposed = false, busy = false, done = false, hintAt = 0;
  const saved = S().flags[KEY] as Partial<Progress> | undefined;
  const progress: Progress = {
    at: Math.max(0, Math.min(10, Number.isInteger(saved?.at) ? saved!.at! : 0)),
    wrong: saved?.wrong ?? 0, help: saved?.help ?? 0,
    results: saved?.results ?? [], note: saved?.note ?? '',
  };
  const persist = () => { S().flags[KEY] = progress; save(); };
  let cells: NumCell[] = [], check: HTMLButtonElement;
  let feedback: HTMLElement, calculations: HTMLElement, actions: HTMLElement, help: HTMLElement;
  let last: V3 | null = null;
  const message = (text: string, kind = '') => {
    feedback.className = `cp-feedback ${kind}`;
    feedback.innerHTML = inline(text);
  };
  const enable = (on: boolean) => { cells.forEach(c => c.enable(on)); check.disabled = !on; };
  const r = () => CROSS_ROUNDS[progress.at];

  function start() {
    if (progress.at === CROSS_ROUNDS.length) { view.set(CROSS_ROUNDS[9]); summary(); return; }
    done = busy = false; hintAt = 0; last = null;
    hideHint(p);
    const round = r();
    view.set(round);
    p.setGoal(`Round ${progress.at + 1} of 10. ${instruction(round)}`);
    const heading = h('h1', null, instruction(round));
    const givens = h('div', { class: 'cp-givens' },
      h('div', { html: inline(`$\\mathbf v=${tv(round.v)}$`), class: 'cp-given cp-v' }),
      h('div', { html: inline(`$\\mathbf w=${tv(round.w)}$`), class: 'cp-given cp-w' }));
    const conditions = round.task === 'cross' ? null : h('div', { class: 'cp-conditions' },
      h('div', { html: inline('$\\mathbf n\\cdot\\mathbf v=0,\\quad\\mathbf n\\cdot\\mathbf w=0$') }),
      round.task === 'area' ? h('div', { html: inline('$\\|\\mathbf n\\|=\\text{area}$') }) : null);
    const submit = () => void attempt();
    cells = ['x', 'y', 'z'].map(name => new NumCell({ aria: `${name} component of n`, comma: false, onEnter: submit }));
    check = button('Check vector', submit, { cls: 'primary' });
    const input = h('div', { class: 'cp-answer' }, h('span', { html: inline(round.task === 'cross' ? '$\\mathbf v\\times\\mathbf w=$' : '$\\mathbf n=$') }),
      h('span', { class: 'tj-col cp-n', role: 'group', 'aria-label': 'Your vector n' }, ...cells.map(c => c.el)), check);
    help = h('div', { class: 'cp-context' });
    if (progress.at === 0) help.textContent = 'A zero dot product means a right angle. Any nonzero length is allowed here.';
    if (progress.at === 3) help.textContent = 'Now add a length condition. Either perpendicular direction is allowed.';
    if (progress.at === 6) help.innerHTML = inline('This is the **cross product**: curl your right fingers from $\\mathbf v$ to $\\mathbf w$; your thumb chooses the direction.');
    calculations = h('div', { class: 'cp-calculations', 'aria-label': 'Calculations for your answer' });
    feedback = h('div', { class: 'cp-feedback', role: 'status', 'aria-live': 'polite' });
    actions = h('div', { class: 'cp-actions' });
    aside.replaceChildren(h('div', { class: 'cp-progress' }, `Round ${progress.at + 1} of 10`), heading, givens, conditions ?? '', input, help, calculations, feedback, actions);
    cells[0].input.focus({ preventScroll: true });
    layout.scrollTop = 0;
    persist();
  }

  async function attempt(given?: V3) {
    if (busy || done || disposed || !r()) return;
    const values = given ?? cells.map(c => c.value());
    if (values.some(x => x === null)) { message('Type all three components. Fractions such as $1/2$ are accepted.', 'warn'); return; }
    const n = values as V3, round = r();
    last = n; busy = true; enable(false); p.move();
    hideHint(p); actions.replaceChildren(); calculations.replaceChildren(); message('');
    try {
      await view.test(n);
      if (disposed) return;
      const j = judge(round, n);
      for (const [i, name] of ['v', 'w'].entries()) {
        calculations.append(h('div', { html: inline(`$\\mathbf n\\cdot\\mathbf ${name}=${product(n, round[name as 'v' | 'w'])}=${tnp(j.dots[i])}$`) }));
      }
      if (round.task !== 'direction' && (j.perpendicular.every(Boolean) || j.area2 === 0)) {
        await view.area();
        if (disposed) return;
        const b2 = square(round.v), height2 = j.area2 / b2;
        const areaText = progress.at < 6
          ? `$\\text{area}=${root(b2)}\\cdot${root(height2)}=${root(j.area2)}$`
          : `$\\text{area}^2=${b2}\\cdot${square(round.w)}-${tnb(dot(round.v, round.w))}^2=${tnp(j.area2)}$`;
        calculations.append(h('div', { html: inline(areaText) }), h('div', { html: inline(lengths(round, n)) }));
      }
      if (j.correct) {
        done = true;
        progress.results[progress.at] = progress.help ? 'assisted' : progress.wrong ? 'corrected' : 'independent';
        message(round.task === 'direction' ? 'Perpendicular to both.' : j.area2 === 0 ? 'Zero area, so the cross product is the zero vector.' : round.task === 'area' ? 'Perpendicular, and the length matches the area.' : 'Correct direction and length.', 'good');
        if (round.task === 'cross' && j.area2 > 0) await view.order();
        if (disposed) return;
        const next = button(progress.at === 9 ? 'See results' : 'Next round', () => {
          if (busy) return;
          progress.at++; progress.wrong = progress.help = 0; persist(); start();
        }, { cls: 'primary' });
        actions.append(next); next.focus();
      } else {
        progress.wrong++;
        if (j.length < 1e-9 && j.area2 > 0) message('The zero vector has no direction; try a nonzero vector.', 'warn');
        else if (!j.perpendicular.every(Boolean) && j.area2 > 0) message('Both dot products must be zero.', 'warn');
        else if (j.area2 === 0) message('The parallelogram has zero area; your vector must have zero length.', 'warn');
        else if (!j.rightLength) message('The direction works; the length must match the area.', 'warn');
        else {
          await view.order();
          if (disposed) return;
          message('Right length, opposite direction: check the order with your right hand.', 'warn');
        }
      }
      persist();
      const replay = button('Replay check', () => { if (!busy && last) void replayCheck(); }, { cls: 'ghost small' });
      actions.append(replay);
    } finally {
      if (!disposed) { busy = false; enable(!done); }
    }
  }
  async function replayCheck() {
    if (!last || busy) return;
    busy = true; enable(false);
    const buttons = Array.from(actions.querySelectorAll('button'));
    buttons.forEach(b => b.disabled = true);
    try {
      await view.test(last);
      const j = judge(r(), last);
      if (!disposed && r().task !== 'direction' && (j.perpendicular.every(Boolean) || j.area2 === 0)) await view.area();
      if (!disposed && r().task === 'cross' && j.perpendicular.every(Boolean) && j.rightLength) await view.order();
    } finally {
      if (!disposed) { busy = false; enable(!done); buttons.forEach(b => b.disabled = false); }
    }
  }
  function summary() {
    done = true;
    layout.classList.add('cp-summary');
    hideHint(p);
    const labels = { independent: 'No help', corrected: 'After a mistake', assisted: 'With help' };
    const rows = CROSS_ROUNDS.map((round, i) => h('div', { class: 'cp-result-row' }, h('span', null, `${i + 1}. ${round.name}`), h('span', null, labels[progress.results[i]] ?? 'Not completed')));
    const note = h('textarea', { rows: 3, 'aria-label': 'Your observation', placeholder: 'What did you notice about direction, area or order?' });
    note.value = progress.note;
    note.addEventListener('input', () => { progress.note = note.value; persist(); });
    const finish = button('Finish practice', () => { progress.at = 0; progress.wrong = progress.help = 0; persist(); p.win(); }, { cls: 'primary' });
    aside.replaceChildren(h('div', { class: 'cp-progress' }, '10 rounds complete'), h('h1', null, 'What did you notice?'), h('div', { class: 'cp-results' }, ...rows), h('label', null, 'Your observation (optional)', note), finish);
    finish.focus();
  }
  p.onDispose(() => {
    disposed = true; view.dispose(); layout.remove();
    document.body.classList.remove('cp-active');
    p.g.stage.sky.visible = sky;
  });
  start();
  const showStep = async () => {
    if (disposed || busy || done || !r()) return;
    progress.help++; persist();
    const answer = sampleAnswer(r());
    cells.forEach((c, i) => c.set(answer[i]));
    await attempt(answer);
  };
  return {
    hint() {
      if (busy || done || !r()) return null;
      progress.help++; persist();
      const hs = hints(r());
      const index = Math.min(hintAt++, hs.length - 1);
      return { text: hs[index], left: Math.max(0, hs.length - hintAt) };
    },
    showStep,
    async showMe() {
      while (!disposed && progress.at < 10) {
        await showStep();
        if (busy || !done) return;
        progress.at++; progress.wrong = progress.help = 0; persist(); start();
      }
      if (!disposed) p.win();
    },
    async wrong() { await attempt([1, 1, 1]); },
  };
}
