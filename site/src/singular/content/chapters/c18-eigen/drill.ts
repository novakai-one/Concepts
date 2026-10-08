// Chapter 18, Scene 5 (docs/singular/ch18-trajectory-spec.md §3): ten practice rounds in the same scene, each
// a different eigenvector question, then more on demand. Words: docs/singular/ch18-plain-style.md.
// Trying vectors is free; committed answers (a number in a box, an answer vector, a checked sort, a picked
// vector) are moves. Each round is recorded as no help, after a mistake, or with help.
import type { PuzzleCtx, PuzzleDef } from '../../../game/types';
import { h, button, inline } from '../../../ui/ui';
import { sfx } from '../../../audio/sfx';
import { wait } from '../../../core/tween';
import { S as SAVE, save } from '../../../core/save';
import { matVec, type Mat, type Vec } from '../../../math/la';
import {
  PULSE_A, PULSE_FLAT, PULSE_FLIP, PULSE_NEW, PULSE_S, PULSE_SHEAR, R1_PLANS, R3_OPEN, R3_PLANS, R6, R8_PULSES, R10,
  checkMult, classifyPlan, cleanV, genMission, genPulse, isZero, keeps, keptLines, launchFor, lineTurnDeg, multipleOf, multiplierOf,
  onLineOf, path, type Attempt, type Mission,
} from './traj-logic';
import { DRILL, OUTCOME_NAMES, UNREAD, UNREAD_M, ZERO, tmul, tv, wrongMult } from './traj-text';
import { NumCell, TrajView, VecField, hideHint, record, records, resultLine, trajDock, type TrajDock } from './traj';
import { missionPanel } from './traj-puzzles';

const fresh = (): Attempt => ({ help: 0, wrong: 0 });
const STATE = 'c18-drill';
interface DrillState { at: number; r4: Vec[] }
function state(): DrillState {
  const s = (SAVE().flags[STATE] as DrillState | undefined) ?? { at: 0, r4: [] };
  SAVE().flags[STATE] = s;
  return s;
}

/** What a round can use. */
interface RC {
  p: PuzzleCtx;
  view: TrajView;
  d: TrajDock;
  att: Attempt;
  /** Bumped on every round change: async work from an old round checks it and stops. */
  gen: number;
  complete(): void;
  /** The open multiplier question, if any (Show me answers it). */
  ask: { fill(): void } | null;
}
interface Run { show(): Promise<void>; hints(): string[] }
interface Round { id: string; name: string; M: Mat; goal: string; noHints?: boolean; start(rc: RC): Run }

// ------------------------------------------------------------------ shared pieces

/** A multiplier question for vector v. Resolves when answered right; wrong answers are explained part by part. */
function askMult(rc: RC, host: HTMLElement, v: Vec, text: string, onRight: (m: number) => void): void {
  const M = rc.view.M;
  const w = cleanV(matVec(M, v));
  const gen = rc.gen;
  const cell = new NumCell({ aria: 'the number in the equation', onEnter: () => check(), cls: 'm', placeholder: '?' });
  // A v = w = ? v: the box is the number that turns v into A v
  const box = h('div', { class: 'tj-q' },
    h('div', { class: 't', html: inline(text) }),
    h('div', { class: 'tj-row' }, h('span', { class: 'k', html: inline(`$A${tv(v)} = ${tv(w)} =$`) }), cell.el, h('span', { class: 'k', html: inline(`$${tv(v)}$`) }), button('Check', () => check(), { cls: 'primary small' })));
  host.replaceChildren(box);
  host.hidden = false;
  const check = () => {
    if (gen !== rc.gen) return;
    const m = cell.value();
    if (m === null) { rc.d.msg(UNREAD_M, 'warn'); return; }
    rc.p.move();
    const vd = checkMult(M, v, m);
    if (!vd.ok) { rc.att.wrong++; sfx.miss(); rc.view.ghost(vd.scaled); rc.d.msg(wrongMult(v, vd), 'bad'); return; }
    rc.view.ghost(null);
    rc.ask = null;
    box.classList.add('ok');
    sfx.success();
    onRight(m);
  };
  rc.ask = { fill: () => { cell.set(multiplierOf(M, v) ?? 0); check(); } };
  if (!rc.p.g.headless) window.setTimeout(() => cell.focus(), 40);
}

/** Test arrows and lock kept lines with their multipliers (rounds 7, 8, 9 and the extra "kept lines" rounds). */
function hunt(rc: RC, o: {
  need: number; pulses?: number; button?: string; ruler?: boolean;
  counts?: (v: Vec) => boolean; other?: (v: Vec, w: Vec) => string;
  askText?: (v: Vec, w: Vec) => string; driftMsg?: (pts: Vec[]) => string;
  askHints?: (v: Vec, w: Vec) => string[]; findHints: string[]; answers: Vec[];
}): Run {
  const { view, d } = rc;
  const M = view.M;
  const field = new VecField({ value: null, onEnter: () => void test() });
  const go = button(inline(o.button ?? DRILL.hunt.test), () => void test(), { cls: 'primary small', html: true });
  const res = h('div', { class: 'tj-res' });
  const q = h('div');
  q.hidden = true;
  const chips = h('div', { class: 'tj-lines' });
  d.body.append(h('div', { class: 'tj-row' }, field.el, go), res, q, chips);
  const found: Vec[] = [];
  let pending: Vec | null = null;
  let busy = false;
  const gen = rc.gen;
  const n = o.pulses ?? 1;

  const test = async (vIn?: Vec) => {
    if (busy || pending || gen !== rc.gen) return;
    if (vIn) field.set(vIn);
    const v = field.get();
    if (!v) { d.msg(UNREAD, 'warn'); return; }
    if (isZero(v)) { sfx.miss(); d.msg(ZERO, 'warn'); return; }
    busy = true; go.disabled = true;
    try {
      const pts = path(M, v, n);
      await view.frame(pts, { min: 3, cap: 40 });
      view.clear();
      await view.launch(v);
      for (let k = 1; k <= n; k++) { await (k > 1 ? view.settled() : wait(130)); if (k > 1) view.mark(pts[k - 1], `$${view.pow(k - 1)}\\mathbf v$`, undefined, k % 2 === 1); await view.pulse(); }
      if (gen !== rc.gen) return;
      const w = pts[1], end = pts[n];
      const kept = keeps(M, v);
      res.innerHTML = inline(n === 1 ? resultLine(v, w, kept, lineTurnDeg(M, v)) : `$${pts.map(tv).join(' \\to ')}$`);
      if (!kept) {
        await view.showTurned(v, end);
        d.msg(o.driftMsg ? o.driftMsg(pts) : DRILL.hunt.turned(v, w), 'warn');
        return;
      }
      const dup = found.find((f) => onLineOf(f, v));
      if (dup) { await view.showKept(v, w, { quiet: true, ruler: o.ruler }); void view.flashLock(view.lockOf(v)); d.msg(DRILL.hunt.dupe(v, dup), ''); return; }
      if (o.counts && !o.counts(v)) { await view.showKept(v, w, { quiet: true, ruler: o.ruler }); d.msg(o.other ? o.other(v, w) : '', ''); return; }
      await view.showKept(v, w, { ruler: o.ruler });
      pending = v.slice();
      const idx = view.lock(v, null);
      d.msg('');
      hideHint(rc.p);
      askMult(rc, q, v, o.askText ? o.askText(v, w) : DRILL.hunt.kept(v), (m) => {
        view.setLockValue(idx, m);
        void view.flashLock(idx, 900);
        found.push(v.slice());
        pending = null;
        chips.append(h('span', { class: 'tj-chip', html: inline(`$A${tv(v)} = ${tmul(m, v)}$`) }));
        hideHint(rc.p);
        if (found.length >= o.need) { q.hidden = true; d.msg(DRILL.hunt.right(v, m), 'good'); rc.complete(); return; }
        q.hidden = true;
        d.msg(`${DRILL.hunt.right(v, m)} ${DRILL.hunt.another}`, 'good');
      });
    } finally { busy = false; go.disabled = false; }
  };

  return {
    hints: () => (pending ? (o.askHints ? o.askHints(pending, matVec(M, pending)) : []) : o.findHints),
    async show() {
      while (busy) await wait(20);
      for (let i = 0; i < 6 && found.length < o.need && gen === rc.gen; i++) {
        if (pending && rc.ask) { rc.ask.fill(); continue; }
        const next = o.answers.find((a) => !found.some((f) => onLineOf(f, a)));
        if (!next) break;
        await test(next);
        while (busy) await wait(20);
      }
    },
  };
}

// ------------------------------------------------------------------ the ten rounds

const R: Round[] = [
  {
    id: 'drill-1', name: DRILL.r1.name, M: PULSE_A, goal: DRILL.r1.goal,
    start(rc) {
      const { view, d } = rc;
      const res = h('div', { class: 'tj-res' });
      const row = h('div', { class: 'tj-row' });
      let busy = false, done = false;
      const pick = async (v: Vec, b: HTMLButtonElement) => {
        if (busy || done) return;
        busy = true;
        rc.p.move();
        const w = cleanV(matVec(PULSE_A, v));
        await view.frame([v, w], { min: 3 });
        view.clear();
        await view.launch(v);
        await wait(120);
        await view.pulse();
        const kept = keeps(PULSE_A, v);
        res.innerHTML = inline(resultLine(v, w, kept, lineTurnDeg(PULSE_A, v)));
        if (kept) {
          done = true;
          await view.showKept(v, w);
          view.lock(v, null); // its multiplier is round 2's question
          b.setAttribute('aria-pressed', 'true');
          d.msg(DRILL.r1.hit(v, w, multiplierOf(PULSE_A, v)!), 'good');
          busy = false;
          rc.complete();
          return;
        }
        rc.att.wrong++;
        b.disabled = true;
        await view.showTurned(v, w);
        d.msg(DRILL.r1.turned(v, w), 'bad');
        busy = false;
      };
      const btns = R1_PLANS.map((v) => { const b: HTMLButtonElement = button(inline(`$${tv(v)}$`), () => void pick(v, b), { cls: 'small tj-vbtn', html: true }); return b; });
      row.append(...btns);
      d.body.append(row, res);
      void view.frame([[3, 3], [-3, -3], [0, 3]], { ms: 0, min: 3 });
      return {
        hints: () => DRILL.r1.hints,
        async show() { const i = R1_PLANS.findIndex((v) => keeps(PULSE_A, v)); while (busy) await wait(20); await pick(R1_PLANS[i], btns[i]); },
      };
    },
  },
  {
    id: 'drill-2', name: DRILL.r2.name, M: PULSE_A, goal: DRILL.r2.goal,
    start(rc) {
      const { view, d } = rc;
      const v = R1_PLANS.find((x) => keeps(PULSE_A, x))!;
      const res = h('div', { class: 'tj-res' });
      let busy = false, done = false;
      const cell = new NumCell({ aria: 'the number in the equation', onEnter: () => void fire(), cls: 'm', placeholder: '?' });
      // the ring shows where the typed number puts the vector, before A is applied
      const preview = () => { const m = cell.value(); view.ghost(m === null ? null : v.map((x) => x * m)); };
      cell.input.addEventListener('input', () => { if (cell.input.value.trim() && cell.input.value.trim() !== '-') preview(); else view.ghost(null); });
      const fire = async () => {
        if (busy || done) return;
        const m = cell.value();
        if (m === null) { d.msg(UNREAD_M, 'warn'); return; }
        busy = true;
        rc.p.move();
        preview();
        const w = cleanV(matVec(PULSE_A, v));
        await view.frame([v, w, v.map((x) => x * m)], { min: 3, cap: 60 });
        view.clear();
        preview();
        await view.launch(v);
        await wait(120);
        await view.pulse();
        res.innerHTML = inline(resultLine(v, w, true, 0));
        const vd = checkMult(PULSE_A, v, m);
        if (vd.ok) { done = true; view.ghost(null); await view.showKept(v, w, { ruler: true }); d.msg(DRILL.r2.hit(v, w, m), 'good'); busy = false; rc.complete(); return; }
        rc.att.wrong++;
        sfx.miss();
        d.msg(wrongMult(v, vd), 'bad');
        busy = false;
      };
      d.body.append(h('div', { class: 'tj-row' }, h('span', { class: 'k', html: inline(`$A${tv(v)} =$`) }), cell.el, h('span', { class: 'k', html: inline(`$${tv(v)}$`) }), button('Check', () => void fire(), { cls: 'primary small' })), res);
      view.preview(v);
      void view.frame([v, v.map((x) => x * 3)], { ms: 0, min: 3 });
      return {
        hints: () => DRILL.r2.hints(v, cleanV(matVec(PULSE_A, v))),
        async show() { while (busy) await wait(20); cell.set(multiplierOf(PULSE_A, v)!); await fire(); },
      };
    },
  },
  {
    id: 'drill-3', name: DRILL.r3.name, M: PULSE_A, goal: DRILL.r3.goal,
    start(rc) {
      const { view, d } = rc;
      view.lock(R3_OPEN, multiplierOf(PULSE_A, R3_OPEN));
      const marks: (string | null)[] = R3_PLANS.map(() => null);
      // two answers: eigenvector or not; the feedback then names the line
      const isEig = (v: Vec) => (classifyPlan(PULSE_A, R3_OPEN, v) === 'turns' ? 'no' : 'yes');
      const rows = R3_PLANS.map((v, i) => {
        const why = h('div', { class: 'why' });
        const btns = DRILL.r3.opts.map(([id, label]) => button(label, () => { marks[i] = id; btns.forEach((b, j) => b.setAttribute('aria-pressed', String(DRILL.r3.opts[j][0] === id))); chk.disabled = marks.some((m) => m === null); }, { cls: 'ghost small' }));
        const el = h('div', { class: 'tj-plan' }, h('span', { class: 'v', html: inline(`$${tv(v)}$`) }), ...btns, why);
        return { el, why, btns };
      });
      let busy = false, done = false;
      const chk: HTMLButtonElement = button(DRILL.r3.check, () => void check(), { cls: 'primary small' });
      chk.disabled = true;
      const check = async () => {
        if (busy || done || marks.some((m) => m === null)) return;
        busy = true; chk.disabled = true;
        rc.p.move();
        let allRight = true;
        for (let i = 0; i < R3_PLANS.length; i++) {
          const v = R3_PLANS[i];
          const truth = classifyPlan(PULSE_A, R3_OPEN, v);
          const w = cleanV(matVec(PULSE_A, v));
          await view.frame([v, w, [2, 2]], { min: 3 });
          view.clear();
          await view.launch(v, 380);
          await wait(80);
          await view.pulse(600);
          let why = '';
          if (truth === 'turns') { await view.showTurned(v, w); why = DRILL.r3.whyTurns(v, w); }
          else if (truth === 'same') { await view.showKept(v, w, { quiet: true }); void view.flashLock(view.lockOf(v), 900); why = DRILL.r3.whySame(v, multipleOf(v, R3_OPEN)); await wait(500); }
          else { await view.showKept(v, w); if (view.lockOf(v) < 0) view.lock(v, multiplierOf(PULSE_A, v)); why = DRILL.r3.whyNew(v, w, multiplierOf(PULSE_A, v)!); }
          const ok = marks[i] === isEig(v);
          allRight &&= ok;
          rows[i].el.className = `tj-plan ${ok ? 'right' : 'wrong'}`;
          rows[i].why.innerHTML = inline(why);
          await wait(300);
        }
        busy = false;
        if (allRight) { done = true; d.msg(DRILL.r3.hit, 'good'); rc.complete(); return; }
        rc.att.wrong++;
        sfx.miss();
        d.msg(DRILL.r3.wrong, 'bad');
        chk.disabled = false;
      };
      d.body.append(h('div', { class: 'tj-plans' }, ...rows.map((r) => r.el)), h('div', { class: 'tj-row' }, chk));
      void view.frame([[3, 3], [-3, -3], [2, -2]], { ms: 0, min: 3 });
      return {
        hints: () => DRILL.r3.hints,
        async show() {
          while (busy) await wait(20);
          R3_PLANS.forEach((v, i) => { rows[i].btns[DRILL.r3.opts.findIndex(([id]) => id === isEig(v))].click(); });
          await check();
        },
      };
    },
  },
  {
    id: 'drill-4', name: DRILL.r4.name, M: PULSE_S, goal: DRILL.r4.goal,
    start(rc) {
      const { view, d } = rc;
      const st = state();
      st.r4 = [];
      const field = new VecField({ value: null, onEnter: () => void scan() });
      const go = button(inline(DRILL.hunt.test), () => void scan(), { cls: 'primary small', html: true });
      const chips = h('div', { class: 'tj-lines' });
      let busy = false, done = false;
      const scan = async (vIn?: Vec) => {
        if (busy || done) return;
        if (vIn) field.set(vIn);
        const v = field.get();
        if (!v) { d.msg(UNREAD, 'warn'); return; }
        if (isZero(v)) { sfx.miss(); d.msg(ZERO, 'warn'); return; }
        busy = true; go.disabled = true;
        try {
          await view.frame([v, [2, 2], [-2, 2]], { min: 3 });
          const r = await view.scan(v);
          if (!r.kept) { d.msg(DRILL.r4.turned(v), 'warn'); return; }
          const old = st.r4.find((f) => onLineOf(f, v));
          if (old) { void view.flashLock(view.lockOf(v)); d.msg(DRILL.r4.same(v, old), ''); return; }
          sfx.align();
          view.lock(v, null);
          st.r4.push(v.slice());
          save();
          chips.append(h('span', { class: 'tj-chip', html: inline(`$${tv(v)}$`) }));
          d.msg(DRILL.r4.kept(v), 'good');
          if (st.r4.length >= 2) { done = true; d.msg(`${DRILL.r4.kept(v)} ${DRILL.r4.hit}`, 'good'); rc.complete(); }
        } finally { busy = false; go.disabled = done; }
      };
      d.body.append(h('div', { class: 'tj-row' }, field.el, go), chips);
      void view.frame([[2, 2], [-2, 2], [2, -2]], { ms: 0, min: 3 });
      return {
        hints: () => DRILL.r4.hints,
        async show() {
          for (const a of keptLines(PULSE_S).map((l) => l.dir)) { while (busy) await wait(20); if (!st.r4.some((f) => onLineOf(f, a)) && !done) await scan(a); }
        },
      };
    },
  },
  {
    id: 'drill-5', name: DRILL.r5.name, M: PULSE_S, goal: DRILL.r5.goal,
    start(rc) {
      const { view, d } = rc;
      const st = state();
      const lines = st.r4.length === 2 ? st.r4.map((v) => v.slice()) : keptLines(PULSE_S).map((l) => l.dir);
      const idx = lines.map((v) => view.lock(v, null));
      const ok = lines.map(() => false);
      let busy = false;
      const res = h('div', { class: 'tj-res' });
      const rows = lines.map((v, i) => {
        const cell = new NumCell({ aria: `the number for vector ${i + 1}`, onEnter: () => void fire(i), cls: 'm', placeholder: '?' });
        cell.input.addEventListener('input', () => { const m = parseInput(cell); view.ghost(m === null ? null : v.map((x) => x * m)); });
        const b = button('Check', () => void fire(i), { cls: 'primary small' });
        const el = h('div', { class: 'tj-row' }, h('span', { class: 'k', html: inline(`$A${tv(v)} =$`) }), cell.el, h('span', { class: 'k', html: inline(`$${tv(v)}$`) }), b);
        return { el, cell, b };
      });
      const fire = async (i: number) => {
        if (busy || ok[i]) return;
        const m = rows[i].cell.value();
        if (m === null) { d.msg(UNREAD_M, 'warn'); return; }
        busy = true;
        rc.p.move();
        const v = lines[i];
        const w = cleanV(matVec(PULSE_S, v));
        await view.frame([v, w, v.map((x) => x * m)], { min: 3, cap: 60 });
        view.clear();
        view.ghost(v.map((x) => x * m));
        await view.launch(v);
        await wait(120);
        await view.pulse();
        res.innerHTML = inline(resultLine(v, w, true, 0));
        const vd = checkMult(PULSE_S, v, m);
        busy = false;
        if (!vd.ok) { rc.att.wrong++; sfx.miss(); d.msg(wrongMult(v, vd), 'bad'); return; }
        view.ghost(null);
        await view.showKept(v, w, { ruler: true });
        view.setLockValue(idx[i], m);
        ok[i] = true;
        rows[i].b.disabled = true;
        rows[i].cell.enable(false);
        if (ok.every(Boolean)) { d.msg(DRILL.r5.hit, 'good'); rc.complete(); } else d.msg(DRILL.r5.one(m), 'good');
      };
      d.body.append(...rows.map((r) => r.el), res);
      void view.frame([...lines.map((v) => v.map((x) => x * 4)), ...lines.map((v) => v.map((x) => -x * 2))], { ms: 0, min: 3 });
      const imgs = lines.map((v) => cleanV(matVec(PULSE_S, v)));
      return {
        hints: () => DRILL.r5.hints(lines[0], imgs[0], lines[1], imgs[1]),
        async show() {
          for (let i = 0; i < lines.length; i++) { while (busy) await wait(20); if (!ok[i]) { rows[i].cell.set(multiplierOf(PULSE_S, lines[i])!); await fire(i); } }
        },
      };
    },
  },
  {
    id: 'drill-6', name: DRILL.r6.name, M: PULSE_FLIP, goal: DRILL.r6.goal,
    start(rc) {
      const { view, d, p } = rc;
      const q = h('div');
      q.hidden = true;
      let launched: Vec | null = null;
      const run = missionPanel(p, view, d, R6, {
        start: DRILL.r6.start, go: DRILL.r6.go, hit: DRILL.r6.hit, miss: DRILL.r6.miss,
        onHit: (pts) => {
          launched = pts[0];
          d.body.append(q);
          askMult(rc, q, pts[0], DRILL.r6.ask, () => { q.hidden = true; d.msg(DRILL.r6.done(multiplierOf(R6.M, pts[0])!), 'good'); rc.complete(); });
        },
      });
      // a wrong launch is a committed miss; count it for this round
      const launch0 = run.launch;
      run.launch = async (v?: Vec) => { const before = run.att.wrong; await launch0(v); rc.att.wrong += run.att.wrong - before; run.att.wrong = before; };
      void view.frame([R6.target, [0, 3], [2, 0]], { ms: 0, min: 3 });
      return {
        hints: () => (launched ? DRILL.r6.askHints(launched, matVec(R6.M, launched)) : DRILL.r6.hints),
        async show() {
          while (run.busy) await wait(20);
          if (!run.done) await run.launch(launchFor(R6)!);
          while (!rc.ask && run.busy) await wait(20);
          rc.ask?.fill();
        },
      };
    },
  },
  {
    id: 'drill-7', name: DRILL.r7.name, M: PULSE_FLAT, goal: DRILL.r7.goal,
    start(rc) {
      return hunt(rc, {
        need: 1, counts: (v) => isZero(matVec(PULSE_FLAT, v)), other: DRILL.r7.other,
        askText: (v) => DRILL.r7.collapsed(v), findHints: DRILL.r7.hints, askHints: (v) => DRILL.r7.askHints(v), answers: [[0, 1]],
      });
    },
  },
  {
    id: 'drill-8', name: DRILL.r8.name, M: PULSE_SHEAR, goal: DRILL.r8.goal,
    start(rc) {
      return hunt(rc, {
        need: 1, pulses: R8_PULSES, button: DRILL.r8.go, driftMsg: DRILL.r8.drift,
        askText: (v) => DRILL.r8.held(v), findHints: DRILL.r8.hints, askHints: () => DRILL.r8.askHints, answers: [[1, 0]],
      });
    },
  },
  {
    id: 'drill-9', name: DRILL.r9.name, M: PULSE_NEW, goal: DRILL.r9.goal, noHints: true,
    start(rc) {
      return hunt(rc, { need: 2, findHints: [], answers: keptLines(PULSE_NEW).map((l) => l.dir) });
    },
  },
  {
    id: 'drill-10', name: DRILL.r10.name, M: R10.M, goal: DRILL.r10.goal,
    start(rc) {
      const { view, d, p } = rc;
      for (const l of keptLines(PULSE_S)) view.lock(l.dir, l.m);
      const run = missionPanel(p, view, d, R10, {
        start: DRILL.r10.start, go: DRILL.r10.go, hit: DRILL.r10.hit, miss: DRILL.r10.miss, missOnLine: DRILL.r10.missOnLine,
        onHit: () => { rc.att.wrong += run.att.wrong; rc.complete(); },
      });
      void view.frame([R10.target, [2, 2], [1, -1]], { ms: 0, min: 3 });
      return {
        hints: () => DRILL.r10.hints,
        async show() { while (run.busy) await wait(20); if (!run.done) await run.launch(launchFor(R10)!); },
      };
    },
  },
];

const parseInput = (c: NumCell): number | null => { const t = c.input.value.trim(); return t && t !== '-' ? c.value() : null; };

/** Round 11 onwards: fresh pulses, alternating between finding both kept lines and a two-pulse mission. */
function extraRound(n: number, prev?: Mat): Round {
  const seed = 7919 * n + 17;
  const avoid = prev ? [prev] : [];
  if (n % 2 === 1) {
    const g = genPulse(seed, { avoid });
    return {
      id: 'drill-more', name: DRILL.extraLines.name, M: g.M, goal: DRILL.extraLines.goal,
      start(rc) { return hunt(rc, { need: 2, findHints: DRILL.extraLines.hints, answers: g.lines.map((l) => l.dir) }); },
    };
  }
  const ms: Mission & { launch: Vec } = genMission(seed, avoid);
  return {
    id: 'drill-more', name: DRILL.extraMission.name, M: ms.M, goal: DRILL.extraMission.goal(ms.target),
    start(rc) {
      const { view, d, p } = rc;
      const run = missionPanel(p, view, d, ms, {
        start: DRILL.extraMission.start(ms.target), go: 'Apply $A$ twice', hit: DRILL.extraMission.hit, miss: DRILL.extraMission.miss, probes: true,
        onHit: () => { rc.att.wrong += run.att.wrong; rc.complete(); },
      });
      void view.frame([ms.target], { ms: 0, min: 3 });
      return {
        hints: () => DRILL.extraMission.hints,
        async show() { while (run.busy) await wait(20); if (!run.done) await run.launch(ms.launch); },
      };
    },
  };
}

// ------------------------------------------------------------------ the puzzle

export const drill: PuzzleDef = {
  id: 'c18-drill',
  title: DRILL.title,
  goal: DRILL.goal,
  hints: [...DRILL.r1.hints],
  par: 16, // ten rounds of committed answers; a few wrong ones still earn the second star
  setup(p) {
    const st = state();
    const view = new TrajView(p, PULSE_A);
    const label = h('span', { class: 'tj-kick' });
    const d = trajDock(p, PULSE_A, label);
    const rc: RC = { p, view, d, att: fresh(), gen: 0, complete: () => {}, ask: null };
    let run: Run | null = null;
    let cur: Round | null = null;
    let roundDone = false;
    let won = false;

    const clearRound = () => {
      rc.gen++;
      rc.ask = null;
      view.clear();
      view.clearLocks();
      view.clearWaypoints();
      view.ghost(null);
      d.body.replaceChildren();
      d.head.querySelectorAll('.tj-pulses').forEach((x) => x.remove());
      d.msg('');
      hideHint(p);
    };

    const startRound = (i: number) => {
      clearRound();
      st.at = i;
      save();
      cur = i < 10 ? R[i] : extraRound(i - 10, cur?.M);
      roundDone = false;
      rc.att = fresh();
      view.M = cur.M;
      d.setMatrix(cur.M);
      label.textContent = i < 10 ? `Round ${i + 1} of 10` : `Extra round ${i - 10}`;
      p.setGoal(DRILL.roundGoal(i < 10 ? i + 1 : i - 10, i < 10 ? 10 : 0, cur.goal));
      // the round's question stays in view above its controls (the goal card is folded on a calm screen)
      d.body.append(h('div', { class: 'tj-goal', html: inline(cur.goal) }));
      rc.complete = () => {
        if (roundDone) return;
        roundDone = true;
        const out = record(cur!.id, rc.att);
        const next = button(i === 9 ? 'See the results' : DRILL.next, () => advance(), { cls: 'primary small' });
        const extra = i >= 10 ? button(DRILL.finish, () => finish(), { cls: 'ghost small' }) : null;
        const row = h('div', { class: 'tj-row tj-next' }, h('span', { class: `tj-kick` }, DRILL.doneRound(OUTCOME_NAMES[out])), next, extra);
        d.body.append(row);
        if (!p.g.headless) window.setTimeout(() => next.focus(), 60);
      };
      run = cur.start(rc);
    };

    const advance = () => {
      const i = st.at + 1;
      if (i === 10) { summary(); return; }
      startRound(i);
    };

    const summary = () => {
      clearRound();
      st.at = 10;
      save();
      cur = null;
      run = null;
      label.textContent = 'Results';
      view.M = PULSE_A;
      d.setMatrix(PULSE_A);
      const rs = records();
      const ids = R.map((r) => r.id);
      const count = (o: string) => ids.filter((id) => rs[id] === o).length;
      p.setGoal(DRILL.summary(count('independent'), count('corrected'), count('assisted')));
      const log = h('div', { class: 'tj-log' }, ...R.flatMap((r, i) => [h('span', { class: 'n' }, `Round ${i + 1} · ${r.name}`), h('span', { class: rs[r.id] ?? '' }, rs[r.id] ? OUTCOME_NAMES[rs[r.id]] : 'not played')]));
      d.body.append(
        h('div', { class: 'tj-sum', html: inline(DRILL.summary(count('independent'), count('corrected'), count('assisted'))) }),
        log,
        h('div', { class: 'tj-row' }, button(DRILL.more, () => startRound(11), { cls: 'small' }), button(DRILL.finish, () => finish(), { cls: 'primary small' })),
      );
      void view.frame([[3, 3], [-3, -3]], { ms: 300, min: 3 });
    };

    const finish = () => {
      if (won) return;
      won = true;
      st.at = 0;
      save();
      p.win();
    };

    if (st.at >= 10 && st.at < 11) summary(); else startRound(Math.max(0, Math.min(st.at, 30)));

    const hint = (() => {
      let key = '', n = 0;
      return (): { text: string; left: number } | null => {
        if (!cur || roundDone) return null;
        if (cur.noHints) { d.msg(DRILL.noHints, 'warn'); return null; }
        const hs = run?.hints() ?? [];
        if (!hs.length) return null;
        const k = `${rc.gen}|${hs.join('|')}`;
        if (k !== key) { key = k; n = 0; }
        const i = Math.min(n, hs.length - 1);
        if (n < hs.length) { n++; rc.att.help++; }
        return { text: hs[i], left: hs.length - n };
      };
    })();

    const step = async () => {
      if (!cur || !run) { if (st.at === 10) finish(); return; }
      if (roundDone) { advance(); return; }
      rc.att.help++;
      await run.show();
    };

    const all = async () => {
      for (let guard = 0; guard < 80 && !won; guard++) {
        if (st.at === 10 && !cur) { finish(); break; }
        if (roundDone) { advance(); continue; }
        await step();
        for (let t = 0; t < 400 && !roundDone && cur; t++) await wait(20);
      }
      while (!p.won) await wait(20);
    };

    return {
      hint,
      showStep: step,
      async showMe() { await all(); },
      async solve() { await all(); },
      async wrong() { /* round 1: a turned plan */ (d.body.querySelector('.tj-row .btn') as HTMLButtonElement | null)?.click(); },
    };
  },
};
