// [SP] Act V set piece · Vell's review (GDD §6.7): four rooms (where each part of a matrix lives),
// one fact (eleven statements about the two-decimal model, each lit by a construction), and Vell's four
// claims for the act Review.
import type { DoubtDef, PuzzleDef, PuzzleCtx, ReviewDef, V3 } from '../../../game/types';
import { Dot } from '../../../gfx/markers';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { Lattice3D, Parallelepiped } from '../../../gfx/shapes';
import { RightAngle } from '../../../kit/geom';
import { MatrixInput, VectorInput, parseNum } from '../../../ui/widgets';
import { h, button, inline } from '../../../ui/ui';
import { tex } from '../../../../lib/md';
import { C } from '../../../core/theme';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint } from '../../../game/lawcheck';
import { col, cross, matVec, nullspace, rank, rrefNum, type Mat } from '../../../math/la';
import { GlowLine, Probe, Room, Sheet, VIOLET, twinView } from '../c15-nullspace/space';
import { Counter } from './counter';
import { COL_COLORS } from './puzzles';
import {
  C2, COLS, M4, M4_COLS, M4_ROWS, NULL_DIR, STARS, colPickOk, fmtN, fmtV, goneHolds, land, leftNullOk, len, nullDirOk, nullPerpRowsHolds,
  nullity, pivotCols, randRankMat, rank2TwoCrushedHolds, rowEqColHolds, rowPickOk, starChecks, type P3, type StarId, type Tag,
} from './logic';
import { S } from './script';

const ROW_COLORS = ['#e8f1ff', '#b6c3dc', '#8fb8e8'];
const PALE = '#9fd8ff';

// ------------------------------------------------------------------ 1. Four rooms

export const sp1: PuzzleDef = {
  id: 'c16-sp1',
  title: 'Where does every part of the debris scanner’s matrix live?',
  goal: 'Vell’s debris scanner $M$. **Inputs** (left): place the plane through its **rows**, and its **null space**. **Outputs** (right): place the **column space**, and the line at right angles to every column.',
  subgoals: ['Inputs: the plane through the rows', 'Inputs: the null space', 'Outputs: the column space', 'Outputs: the line at right angles to every column'],
  hints: [
    'Pick two rows that are not multiples of each other: the plane goes through both. Their cross product is its normal, shown in white.',
    'The null space is at right angles to every row: it lies along the normal of the rows’ plane, $(1, 2, 3) \\times (1, 1, 1) = (-1, 2, -1)$.',
    'Columns $(1, 2, 1)$ and $(2, 4, 1)$ give the column space; its normal $(2, -1, 0)$ is the line at right angles to every column. Check: $M^T(2, -1, 0) = \\mathbf 0$.',
  ],
  par: 8,
  view: '3d',
  onWin: S.sp1Win,
  setup(p) {
    const left = new Room(p, { origin: [-4.2, 0, 0], scale: 0.45, extent: 3, title: 'inputs' });
    const right = new Room(p, { origin: [4.2, 0, 0], scale: 0.45, extent: 3, title: 'outputs' });
    void twinView(p, { distance: 15.5, elevation: 18, target: [0, 0, 1.1] });
    M4_ROWS.forEach((v, i) => left.arrow(v, { color: ROW_COLORS[i], label: `$\\text{row } ${i + 1}$`, width: 0.04 }));
    M4_COLS.forEach((v, i) => right.arrow(v, { color: COL_COLORS[i], label: `$\\mathbf m_${i + 1}$` }));
    const rowPlane = new Sheet(left, [0, 0, 1], { color: PALE, size: 6, opacity: 0.12 });
    const colPlane = new Sheet(right, [0, 0, 1], { color: C.result, size: 6, opacity: 0.12 });
    rowPlane.patch.object.visible = false; colPlane.patch.object.visible = false;
    const rowN = left.arrow([0, 0, 0], { color: C.white, width: 0.025, opacity: 0.7, label: '$\\mathbf n$' });
    const colN = right.arrow([0, 0, 0], { color: C.white, width: 0.025, opacity: 0.7, label: '$\\mathbf n$' });
    rowN.setOpacity(0); colN.setOpacity(0);
    const nulL = new GlowLine(left, [1, 0, 0]); nulL.setOpacity(0);
    const lnulL = new GlowLine(right, [1, 0, 0], { opacity: 0.7, width: 2.2 }); lnulL.setOpacity(0);
    const flags = [false, false, false, false];
    const r = p.readout('Four places');
    let dIn: P3 = [0, 0, 0], eIn: P3 = [0, 0, 0];
    const paintR = () => {
      r.row('row', 'plane through the rows', flags[0] ? 'placed · 2 directions' : '·', flags[0] ? PALE : undefined);
      r.row('nul', 'null space', flags[1] ? `line along ${fmtV(dIn)} · 1 direction` : '·', flags[1] ? VIOLET : undefined);
      r.row('col', 'column space', flags[2] ? 'placed · 2 directions' : '·', flags[2] ? C.result : undefined);
      r.row('ln', 'at right angles to the columns', flags[3] ? `line along ${fmtV(eIn)} · 1 direction` : '·', flags[3] ? VIOLET : undefined);
    };
    const marks: RightAngle[] = [];
    const tick = (i: number) => {
      if (flags[i]) return;
      flags[i] = true; p.subgoal(i); sfx.success(); paintR();
      if (flags[0] && flags[1] && !marks[0]) marks[0] = new RightAngle(p, left.w([0, 0, 0]), M4_ROWS[2].map((x) => x * left.s) as V3, dIn.map((x) => x * left.s) as V3, 0.28);
      if (flags[2] && flags[3] && !marks[1]) marks[1] = new RightAngle(p, right.w([0, 0, 0]), M4_COLS[0].map((x) => x * right.s) as V3, eIn.map((x) => x * right.s) as V3, 0.28);
      if (flags.every(Boolean)) { r.note('Both planes hold 2 directions: the rows keep as many as the columns. Each line is at right angles to its plane.'); p.win(); }
    };
    const pickBtns = (n: number, label: (i: number) => string, color: (i: number) => string, on: (sel: number[]) => void) => {
      let sel: number[] = [];
      const bs = Array.from({ length: n }, (_, i) => {
        const b = button('', () => { p.move(); sel = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i].slice(-2); bs.forEach((x, k) => x.setAttribute('aria-pressed', String(sel.includes(k)))); on(sel); }, { cls: 'small' });
        b.innerHTML = inline(label(i)); b.style.color = color(i);
        return b;
      });
      return { el: h('div', { class: 'act5-chips' }, ...bs), set: (s: number[]) => { sel = s; bs.forEach((x, k) => x.setAttribute('aria-pressed', String(sel.includes(k)))); on(sel); } };
    };
    const rowsUI = pickBtns(3, (i) => `row ${i + 1} ${fmtV(M4_ROWS[i])}`, (i) => ROW_COLORS[i], (sel) => {
      if (sel.length === 2 && rowPickOk(sel[0], sel[1])) {
        const n = cross(M4_ROWS[sel[0]], M4_ROWS[sel[1]]);
        rowPlane.span(M4_ROWS[sel[0]], M4_ROWS[sel[1]]); rowPlane.patch.object.visible = true;
        left.setArrow(rowN, n.map((x) => x / Math.max(1, len(n) / 2.2))); rowN.setOpacity(0.7);
        r.row('rn', 'normal', `${fmtV(M4_ROWS[sel[0]])} × ${fmtV(M4_ROWS[sel[1]])} = ${fmtV(n)}`);
        tick(0);
      } else if (sel.length === 2) { sfx.miss(); p.bark('lantern', 'Rows 1 and 2 lie on one line: row 2 is twice row 1. They make no plane.'); }
    });
    const colsUI = pickBtns(3, (i) => `$\\mathbf m_${i + 1}$ ${fmtV(M4_COLS[i])}`, (i) => COL_COLORS[i], (sel) => {
      if (sel.length === 2 && colPickOk(sel[0], sel[1])) {
        const n = cross(M4_COLS[sel[0]], M4_COLS[sel[1]]);
        colPlane.span(M4_COLS[sel[0]], M4_COLS[sel[1]]); colPlane.patch.object.visible = true;
        right.setArrow(colN, n.map((x) => x / Math.max(1, len(n) / 2.2))); colN.setOpacity(0.7);
        r.row('cn', 'normal', `${fmtV(M4_COLS[sel[0]])} × ${fmtV(M4_COLS[sel[1]])} = ${fmtV(n)}`);
        tick(2);
      }
    });
    const placeLine = (which: 'nul' | 'ln', v: P3) => {
      p.move();
      if (which === 'nul') {
        dIn = v;
        if (nullDirOk(v)) { nulL.set(v); void nulL.fadeIn(600); tick(1); }
        else { sfx.miss(); p.bark('lantern', len(v) < 1e-9 ? 'The zero arrow is no direction.' : `$M${fmtV(v)}$ = ${fmtV(matVec(M4, v))}, not the origin.`.replace(/\$/g, '')); }
      } else {
        eIn = v;
        if (leftNullOk(v)) { lnulL.set(v); void lnulL.fadeIn(600); tick(3); }
        else { sfx.miss(); p.bark('lantern', len(v) < 1e-9 ? 'The zero arrow is no direction.' : `Not at right angles to every column: dots with the columns are ${fmtV(M4_COLS.map((c) => c[0] * v[0] + c[1] * v[1] + c[2] * v[2]))}.`); }
      }
    };
    const vin = new VectorInput({ dim: 3, label: '\\text{null space along}', step: 1, onSubmit: (v) => placeLine('nul', v as P3) });
    const ein = new VectorInput({ dim: 3, label: '\\perp \\text{ columns along}', step: 1, onSubmit: (v) => placeLine('ln', v as P3) });
    p.dock().append(
      h('div', { class: 'kicker' }, 'Inputs'), rowsUI.el,
      h('div', { class: 'act5-row act5-small' }, vin.el, button('Place', () => placeLine('nul', vin.get() as P3), { cls: 'small' })),
      h('div', { class: 'kicker' }, 'Outputs'), colsUI.el,
      h('div', { class: 'act5-row act5-small' }, ein.el, button('Place', () => placeLine('ln', ein.get() as P3), { cls: 'small' })),
    );
    paintR();
    const run = async (ms: number) => {
      rowsUI.set([0, 2]); if (ms) await wait(ms);
      vin.set([1, -2, 1]); placeLine('nul', [1, -2, 1]); if (ms) await wait(ms);
      colsUI.set([0, 1]); if (ms) await wait(ms);
      ein.set([2, -1, 0]); placeLine('ln', [2, -1, 0]);
    };
    return { showMe: () => run(600), solve: () => run(0), wrong() { rowsUI.set([0, 1]); placeLine('nul', [1, 1, -1]); } };
  },
};

// ------------------------------------------------------------------ 2. One fact: eleven stars on C₂

type Field = { kind: 'vec' } | { kind: 'num' } | { kind: 'pick'; options: string[] };
interface StarStep { id: StarId; prompt: string; fields: Field[]; answer: (number | number[])[]; check: (vals: (number | number[])[]) => boolean }

const STEPS: StarStep[] = [
  { id: 'flat', prompt: 'Fire the two-decimal model at the lattice.', fields: [], answer: [], check: () => true },
  { id: 'dep', prompt: 'Weights for the three columns that add up to $\\mathbf 0$ (not all zero):', fields: [{ kind: 'vec' }], answer: [[1, 1, -1]], check: (v) => starChecks.dep(v[0] as number[]) },
  { id: 'reach', prompt: 'A point that no start reaches:', fields: [{ kind: 'vec' }], answer: [[1, 1, 1]], check: (v) => starChecks.reach(v[0] as number[]) },
  { id: 'nonemany', prompt: 'A target with **no** solution, then one with a **line** of them:', fields: [{ kind: 'vec' }, { kind: 'vec' }], answer: [[1, 1, 1], [1, 2, 3]], check: (v) => starChecks.nonemany(v[0] as number[], v[1] as number[]) },
  { id: 'nopivot', prompt: 'Reduced: which column has no pivot?', fields: [{ kind: 'pick', options: ['column 1', 'column 2', 'column 3'] }], answer: [2], check: (v) => starChecks.nopivot(v[0] as number) },
  { id: 'notI', prompt: 'The bottom row of the reduced form:', fields: [{ kind: 'vec' }], answer: [[0, 0, 0]], check: (v) => starChecks.notI(v[0] as number[]) },
  { id: 'null', prompt: 'A start, other than the origin, that lands on the origin:', fields: [{ kind: 'vec' }], answer: [[1, 1, -1]], check: (v) => starChecks.null(v[0] as number[]) },
  { id: 'rank', prompt: 'The rank of the two-decimal model:', fields: [{ kind: 'num' }], answer: [2], check: (v) => starChecks.rank(v[0] as number) },
  { id: 'noinv', prompt: 'Two different starts with the same landing:', fields: [{ kind: 'vec' }, { kind: 'vec' }], answer: [[2, 0, 1], [3, 1, 0]], check: (v) => starChecks.noinv(v[0] as number[], v[1] as number[]) },
  { id: 'triple', prompt: 'The scalar triple product $\\mathbf a_1 \\cdot (\\mathbf a_2 \\times \\mathbf a_3)$:', fields: [{ kind: 'num' }], answer: [0], check: (v) => starChecks.triple(v[0] as number) },
  { id: 'det', prompt: '$\\det C_2$:', fields: [{ kind: 'num' }], answer: [0], check: (v) => starChecks.det(v[0] as number) },
];

function skySvg(n: number): { el: SVGSVGElement; light(i: number, on: boolean): void } {
  const NS = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('class', 'act5-sky');
  el.setAttribute('viewBox', '0 0 300 150');
  const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [150 + 118 * Math.cos(a), 75 + 62 * Math.sin(a)]; });
  const lines: SVGLineElement[] = [];
  for (let i = 0; i < n; i++) {
    const l = document.createElementNS(NS, 'line');
    const j = (i + 1) % n;
    l.setAttribute('x1', String(pts[i][0])); l.setAttribute('y1', String(pts[i][1])); l.setAttribute('x2', String(pts[j][0])); l.setAttribute('y2', String(pts[j][1]));
    l.setAttribute('stroke', '#e8f1ff'); l.setAttribute('stroke-width', '1'); l.setAttribute('stroke-opacity', '0');
    el.appendChild(l); lines.push(l);
  }
  const lit = new Array(n).fill(false);
  const dots = pts.map(([x, y]) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); c.setAttribute('r', '4.5');
    c.setAttribute('fill', '#1a2236'); c.setAttribute('stroke', 'rgba(140,180,255,0.45)');
    el.appendChild(c);
    return c;
  });
  return {
    el,
    light(i, on) {
      lit[i] = on;
      dots[i].setAttribute('fill', on ? '#e8f1ff' : '#1a2236');
      dots[i].setAttribute('r', on ? '6' : '4.5');
      dots[i].setAttribute('style', on ? 'filter: drop-shadow(0 0 6px rgba(232,241,255,0.9))' : '');
      lines.forEach((l, k) => l.setAttribute('stroke-opacity', lit[k] && lit[(k + 1) % n] ? '0.55' : '0'));
    },
  };
}

export const sp2: PuzzleDef = {
  id: 'c16-sp2',
  title: 'How many ways can one matrix be broken?',
  goal: 'Eleven statements about the two-decimal model $C_2$. Light each star with one **construction** on $C_2$. Pick any unlit star, or take them in order.',
  subgoals: ['Eleven stars lit'],
  hints: [
    'Most stars use the same few facts: the columns lie on $z = x + y$, and $(1, 1, -1)$ goes to the origin.',
    'Weights and the start sent to the origin: both $(1, 1, -1)$. Off the plane: $(1, 1, 1)$. On it: $(1, 2, 3)$. Two starts: $(2, 0, 1)$ and $(3, 1, 0)$.',
    'Reduced form: $[[1, 0, 1], [0, 1, 1], [0, 0, 0]]$: column 3 has no pivot, rank 2. Triple product and determinant: 0.',
  ],
  par: 16,
  view: '3d',
  onWin: S.sp2Win,
  setup(p) {
    const room = new Room(p, { extent: 3 });
    void p.g.stage.view3D({ target: [0.3, 0.3, 0.6], distance: 12.5, azimuth: -60, elevation: 20, ms: 0 });
    const lat = new Lattice3D(p.g.stage, { extent: 2, color: '#59e1ff', opacity: 0.2 });
    p.add(lat);
    COLS.forEach((v, i) => room.arrow(v, { color: COL_COLORS[i], label: `$\\mathbf a_${i + 1}$` }));
    const plane = new Sheet(room, [1, 1, -1], { color: C.result, size: 6.5, opacity: 0.12 });
    plane.setOpacity(0);
    const nul = new GlowLine(room, NULL_DIR); nul.setOpacity(0);
    const marks: { dispose(): void }[] = [];
    const clearMarks = () => { for (const m of marks.splice(0)) m.dispose(); };
    const mark = (at: readonly number[], text: string, cls = '') => { const dd = new Dot(room.w(at), { color: cls === 'y' ? C.result : C.white, size: 0.08 }); const lb = new Label(text, room.w(at), { className: `act5-pt ${cls}`, offset: [0, -22] }); p.add(dd, lb); marks.push(dd, lb); };
    const gap = (from: readonly number[]) => { const on = [from[0], from[1], from[0] + from[1]]; const f = new FatLine(p.g.stage, [room.w(from), room.w(on)], { color: C.white, width: 1.6, opacity: 0.85, dashed: true, dashSize: 0.1, gapSize: 0.07 }); p.add(f); marks.push(f); };
    const lit = new Set<StarId>();
    const r = p.readout('The constellation');
    const sky = skySvg(STARS.length);
    const list = h('div', { class: 'act5-stars' });
    const rows = STARS.map((s, i) => {
      const row = h('div', { class: 'act5-star', style: 'cursor:pointer', title: 'Work on this star' }, h('span', { class: 'dot' }), h('span', { html: inline(s.text) }));
      row.addEventListener('click', () => goTo(i));
      list.appendChild(row);
      return row;
    });
    r.el.append(sky.el, list);
    let cur = 0;
    const prompt = h('div', { class: 'act5-row', style: 'font-size:14.5px' });
    const fieldsBox = h('div', { class: 'act5-vecs act5-small' });
    const msg = h('div', { class: 'act5-msg' });
    const header = h('div', { class: 'kicker' });
    let readers: (() => number | number[] | null)[] = [];
    let setters: ((v: number | number[]) => void)[] = [];
    const checkBtn = button('Check', () => submit(), { cls: 'primary small' });
    const nextBtn = button('Next unlit star', () => goTo(nextUnlit(cur + 1)), { cls: 'small ghost' });
    p.dock().append(header, prompt, fieldsBox, h('div', { class: 'act5-btns' }, checkBtn, nextBtn), msg);
    const nextUnlit = (from: number) => { for (let k = 0; k < STEPS.length; k++) { const i = (from + k) % STEPS.length; if (!lit.has(STEPS[i].id)) return i; } return from % STEPS.length; };
    const goTo = (i: number) => {
      cur = i;
      const st = STEPS[i];
      header.textContent = `Star ${i + 1} of ${STEPS.length}${lit.has(st.id) ? ' · lit' : ''}`;
      prompt.innerHTML = inline(st.prompt);
      readers = []; setters = [];
      fieldsBox.replaceChildren();
      msg.textContent = '';
      for (const f of st.fields) {
        if (f.kind === 'vec') {
          const vi = new VectorInput({ dim: 3, step: 1, onSubmit: () => submit() });
          fieldsBox.appendChild(vi.el);
          readers.push(() => vi.get()); setters.push((v) => vi.set(v as number[]));
        } else if (f.kind === 'num') {
          const inp = h('input', { class: 'cell', inputmode: 'decimal', 'aria-label': 'value' }) as HTMLInputElement;
          inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') submit(); });
          fieldsBox.appendChild(inp);
          readers.push(() => parseNum(inp.value)); setters.push((v) => { inp.value = String(v); });
        } else {
          let chosen: number | null = null;
          const { R: RR } = rrefNum(C2);
          fieldsBox.appendChild(h('div', { html: tex(`\\begin{bmatrix}${RR.map((row) => row.map((x) => fmtN(x).replace('−', '-')).join(' & ')).join(' \\\\ ')}\\end{bmatrix}`, false) }));
          const bs = f.options.map((o, k) => { const b = button(o, () => { chosen = k; bs.forEach((x, kk) => x.setAttribute('aria-pressed', String(kk === k))); }, { cls: 'small' }); return b; });
          fieldsBox.appendChild(h('div', { class: 'act5-chips' }, ...bs));
          readers.push(() => chosen); setters.push((v) => { chosen = v as number; bs.forEach((x, kk) => x.setAttribute('aria-pressed', String(kk === v))); });
        }
      }
      checkBtn.textContent = st.fields.length ? 'Check' : 'Fire';
      checkBtn.disabled = lit.has(st.id) && st.id === 'flat';
    };
    const light = async (st: StarStep, vals: (number | number[])[]) => {
      lit.add(st.id);
      const i = STEPS.indexOf(st);
      rows[i].classList.add('lit');
      sky.light(i, true);
      sfx.success();
      clearMarks();
      switch (st.id) {
        case 'flat': sfx.collapse(); plane.setOpacity(0.8); await lat.to(C2, p.g.headless ? 10 : 2000); break;
        case 'dep': case 'null': nul.setOpacity(1); mark(vals[0] as number[], fmtV(vals[0] as number[]), 'v'); break;
        case 'reach': mark(vals[0] as number[], `${fmtV(vals[0] as number[])} · no start`); gap(vals[0] as number[]); break;
        case 'nonemany': mark(vals[0] as number[], `${fmtV(vals[0] as number[])} · none`); gap(vals[0] as number[]); mark(vals[1] as number[], `${fmtV(vals[1] as number[])} · a line of starts`, 'y'); break;
        case 'noinv': mark(land(vals[0] as number[]), `both land on ${fmtV(land(vals[0] as number[]))}`, 'y'); break;
        case 'triple': case 'det': { const b = new Parallelepiped(p.g.stage, room.w(COLS[0]), room.w(COLS[1]), room.w(COLS[2]), { color: VIOLET, opacity: 0.18 }); p.add(b); marks.push(b); break; }
        default: break;
      }
      msg.className = 'act5-msg good';
      msg.innerHTML = inline(lit.size === STEPS.length ? 'All eleven lit. One fact, eleven faces.' : `Lit. ${STEPS.length - lit.size} to go.`);
      if (lit.size === STEPS.length) { p.subgoal(0); p.win(); }
      else window.setTimeout(() => { if (!p.won) goTo(nextUnlit(i + 1)); }, p.g.headless ? 0 : 900);
    };
    const submit = () => {
      const st = STEPS[cur];
      if (lit.has(st.id)) { goTo(nextUnlit(cur + 1)); return; }
      const vals = readers.map((rd) => rd());
      if (vals.some((v) => v === null)) { msg.className = 'act5-msg bad'; msg.textContent = 'Fill every box first.'; sfx.miss(); return; }
      p.move();
      if (st.check(vals as (number | number[])[])) void light(st, vals as (number | number[])[]);
      else { sfx.miss(); msg.className = 'act5-msg bad'; msg.innerHTML = inline(wrongWhy(st, vals as (number | number[])[])); }
    };
    const wrongWhy = (st: StarStep, v: (number | number[])[]): string => {
      switch (st.id) {
        case 'dep': return `Those weights give ${fmtV(matVec(C2, v[0] as number[]))}, not $\\mathbf 0$.`;
        case 'reach': return `${fmtV(v[0] as number[])} is on the plane $z = x + y$: a start lands there.`;
        case 'nonemany': return 'The first must be off the plane $z = x + y$, the second on it.';
        case 'notI': return 'Reduce $C_2$: the third row becomes all zeros.';
        case 'null': return len(v[0] as number[]) < 1e-9 ? 'The origin itself does not count.' : `That start lands on ${fmtV(land(v[0] as number[]))}.`;
        case 'noinv': return 'They must be different starts with one landing: differ by a multiple of $(1, 1, -1)$.';
        default: return 'Not this one.';
      }
    };
    goTo(0);
    const run = async (ms: number) => {
      for (let i = 0; i < STEPS.length; i++) {
        const st = STEPS[i];
        if (lit.has(st.id)) continue;
        goTo(i);
        st.answer.forEach((a, k) => setters[k](a));
        if (ms) await wait(ms);
        await light(st, st.answer);
      }
    };
    return { showMe: () => run(250), solve: () => run(0), wrong() { goTo(1); setters[0]([1, 1, 1]); submit(); } };
  },
};

// ------------------------------------------------------------------ 3. Vell's claims (the act Review)

const vellGone: DoubtDef = {
  id: 'c16-r-gone', who: 'vell', isTrue: true,
  claim: 'Anything flattened is gone.',
  reason: 'On the two-decimal model this is exact. $(2, 0, 1)$ and $(3, 1, 0)$ both land on $(3, 1, 4)$, so no undo can send that one landing back to two different starts. The part along $(1, 1, -1)$ is gone, by anyone.',
  goal: 'Two starts that land together on the two-decimal model. **Back it** (Vell will shake it), or **Challenge it** if you can tell them apart from the landing.',
  view: '3d',
  setup(p) {
    const left = new Room(p, { origin: [-3.9, 0, 0], scale: 0.7, extent: 3, title: 'starts' });
    const right = new Room(p, { origin: [3.9, 0, 0], scale: 0.7, extent: 3, title: 'landings' });
    void twinView(p, { distance: 15.5 });
    new GlowLine(left, NULL_DIR, { opacity: 0.5 });
    const sheet = new Sheet(right, [1, 1, -1], { color: C.result, size: 6, opacity: 0.1 }); sheet.setOpacity(0.4);
    // b = a + t(1, 1, −1) for a whole step t ≠ 0: b follows a when a is dragged, and never lands on it
    let a: P3 = [2, 0, 1], b: P3 = [3, 1, 0], t = 1;
    const along = (s: number): P3 => [a[0] + s, a[1] + s, a[2] - s];
    const la = new Dot([0, 0, 0], { color: C.result, size: 0.11 });
    const tag = new Label('', [0, 0, 0], { className: 'act5-pt y', offset: [0, -24] });
    p.add(la, tag);
    const pa = new Probe(p, left, a, {
      color: C.v, label: 'a', countMoves: false, snap: 1, fit: (x) => x,
      onMove: (x) => { a = x; if (along(t).some((c) => Math.abs(c) > 3) && along(-t).every((c) => Math.abs(c) <= 3)) t = -t; b = along(t); pb.set(b); draw(); },
    });
    const pb = new Probe(p, left, b, { color: C.w, label: 'b', countMoves: false, snap: null, fit: (x) => { t = Math.round((x[0] - a[0] + x[1] - a[1] - (x[2] - a[2])) / 3) || t; return along(t); }, onMove: (x) => { b = x; draw(); } });
    const draw = () => { la.at(right.w(land(a))); tag.at(right.w(land(a))); tag.set(`${fmtV(land(a))} · from both`); };
    draw();
    const set = (x: P3, y: P3) => { a = x; b = y; t = y[0] - x[0] || 1; pa.set(x); pb.set(y); draw(); };
    return {
      holds: () => goneHolds(a, b),
      describe: () => `starts ${fmtV(a)} and ${fmtV(b)} both land on ${fmtV(land(a))}: the landing is the same point, whichever start it came from`,
      randomize(rr) { const x: P3 = [rint(rr, -2, 2), rint(rr, -2, 2), rint(rr, -2, 2)]; const t = [-2, -1, 1, 2][rint(rr, 0, 3)]; set(x, [x[0] + t, x[1] + t, x[2] - t]); },
      edgeCases: 0,
      async showMe() { set([2, 0, 1], [3, 1, 0]); await wait(200); },
    };
  },
};

/** A 3 × 3 matrix the player edits, with its columns (and optionally a counter) in a room. */
function matrixScene(p: PuzzleCtx, start: Mat, o: { counter?: boolean } = {}) {
  const room = new Room(p, { extent: 3, scale: 0.7 });
  void p.g.stage.view3D({ target: [0.3, 0.3, 0.8], distance: 12, azimuth: -60, elevation: 20, ms: 0 });
  let A = start.map((r) => r.slice());
  const arrows = [0, 1, 2].map((j) => room.arrow([0, 0, 0], { color: COL_COLORS[j], label: `$\\mathbf a_${j + 1}$` }));
  const r = p.readout('Matrix');
  const counter = o.counter ? new Counter({ n: 3, rows: 3, title: 'Kept and flattened' }) : null;
  if (counter) r.el.appendChild(counter.el);
  const listeners: (() => void)[] = [];
  const draw = () => {
    arrows.forEach((a, j) => { room.setArrow(a, col(A, j)); a.setOpacity(len(col(A, j)) > 1e-9 ? 1 : 0); });
    const piv = pivotCols(A);
    counter?.set([0, 1, 2].map((j) => (piv.includes(j) ? 'kept' : 'flat') as Tag));
    r.row('rk', 'rank', String(rank(A)), C.result);
    r.row('nl', 'nullity', String(nullity(A)), VIOLET);
    listeners.forEach((f) => f());
  };
  const mi = new MatrixInput({ rows: 3, cols: 3, values: A, label: 'A =', step: 1, colourCols: true, onChange: (m) => { A = m; draw(); } });
  p.dock().append(mi.el);
  const api = { room, r, get A() { return A; }, set(M: Mat) { A = M.map((x) => x.slice()); mi.set(A); draw(); }, onDraw(f: () => void) { listeners.push(f); f(); } };
  draw();
  return api;
}

const vellRank2: DoubtDef = {
  id: 'c16-r-rank2', who: 'vell', isTrue: false,
  claim: 'Rank 2 in a 3 × 3 means two directions are crushed.',
  reason: 'Rank counts the directions **kept**. A 3 × 3 of rank 2 keeps 2 and flattens $3 - 2 = 1$: the two-decimal model crushes one direction, $(1, 1, -1)$.',
  goal: 'Set a 3 × 3 matrix. **Challenge it** with one of rank 2 that crushes something other than two directions, or **Back it**.',
  view: '3d',
  setup(p) {
    const sc = matrixScene(p, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], { counter: true });
    const randM = (rr: () => number) => randRankMat(rr, 3, 3, rint(rr, 1, 3));
    return {
      holds: () => rank2TwoCrushedHolds(sc.A),
      describe: () => `a 3 × 3 with rank ${rank(sc.A)}: it keeps ${rank(sc.A)} directions and crushes ${nullity(sc.A)}`,
      randomize(rr, edge) { sc.set(edge === 0 ? C2 : randM(rr)); },
      edgeCases: 1,
      async showMe() { sc.set(C2); await wait(200); },
    };
  },
};

const vellRowCol: DoubtDef = {
  id: 'c16-r-rowcol', who: 'vell', isTrue: false,
  claim: 'The row space and the column space are always the same plane.',
  reason: 'They always hold the same **number** of directions, but they can be different planes. For the debris scanner’s matrix $M$ the row space has normal $(1, -2, 1)$ and the column space has normal $(2, -1, 0)$.',
  goal: 'Set a 3 × 3 matrix of rank 2: its row space is drawn pale, its column space yellow. **Challenge it** with two different planes, or **Back it**.',
  view: '3d',
  setup(p) {
    const sc = matrixScene(p, C2);
    const rowP = new Sheet(sc.room, [0, 0, 1], { color: PALE, size: 6, opacity: 0.12 });
    const colP = new Sheet(sc.room, [0, 0, 1], { color: C.result, size: 6, opacity: 0.12 });
    const span2 = (vs: number[][], s: Sheet) => {
      let best: number[] | null = null;
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const n = cross(vs[i], vs[j]); if (len(n) > 1e-9 && (!best || len(n) > len(best))) best = n; }
      s.patch.object.visible = !!best && rank(sc.A) === 2;
      if (best) s.set(best);
    };
    sc.onDraw(() => {
      span2(sc.A.map((r) => r.slice()), rowP); span2([0, 1, 2].map((j) => col(sc.A, j)), colP);
      rowP.setOpacity(0.8); colP.setOpacity(0.8);
      sc.r.row('same', 'same plane', rowEqColHolds(sc.A) ? 'yes' : 'no', rowEqColHolds(sc.A) ? C.good : '#ffb347');
    });
    return {
      holds: () => rowEqColHolds(sc.A),
      describe: () => `rows ${sc.A.map((r) => fmtV(r)).join(', ')}: ${rowEqColHolds(sc.A) ? 'the row space and the column space are the same' : 'the row space and the column space are different planes'}`,
      randomize(rr, edge) { sc.set(edge === 0 ? M4 : randRankMat(rr, 3, 3, 2)); },
      edgeCases: 1,
      async showMe() { sc.set(M4); await wait(200); },
    };
  },
};

const vellPerp: DoubtDef = {
  id: 'c16-r-perp', who: 'vell', isTrue: true,
  claim: 'The null space is perpendicular to every row.',
  reason: 'Entry $i$ of $A\\mathbf x$ is row $i$ dotted with $\\mathbf x$. For $\\mathbf x$ in the null space every entry is 0, so $\\mathbf x$ is at right angles to every row.',
  goal: 'Set a 3 × 3 matrix: its rows are drawn pale, its null space violet. **Back it** (Vell will shake it), or **Challenge it**.',
  view: '3d',
  setup(p) {
    const sc = matrixScene(p, M4);
    const rowsA = [0, 1, 2].map((i) => sc.room.arrow([0, 0, 0], { color: ROW_COLORS[i], width: 0.03, label: `$\\text{row } ${i + 1}$` }));
    const nl = new GlowLine(sc.room, [1, 0, 0]);
    sc.onDraw(() => {
      sc.A.forEach((row, i) => { sc.room.setArrow(rowsA[i], row); rowsA[i].setOpacity(len(row) > 1e-9 ? 0.8 : 0); });
      const ns = nullspace(sc.A);
      nl.setOpacity(ns.length === 1 ? 1 : 0);
      if (ns.length === 1) nl.set(ns[0]);
      sc.r.row('ns', 'null space', ns.length ? (ns.length === 1 ? `the line along ${fmtV(ns[0])}` : `${ns.length} directions`) : 'only the origin', VIOLET);
    });
    return {
      holds: () => nullPerpRowsHolds(sc.A),
      describe: () => { const ns = nullspace(sc.A); return ns.length ? `null space along ${ns.map((v) => fmtV(v)).join(' and ')}: each row dotted with it gives ${fmtV(ns.flatMap((v) => sc.A.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])))}` : 'the null space is only the origin'; },
      randomize(rr, edge) { sc.set(edge === 0 ? C2 : edge === 1 ? [[1, 2, 3], [2, 4, 6], [3, 6, 9]] : randRankMat(rr, 3, 3, rint(rr, 1, 2))); },
      edgeCases: 2,
      async showMe() { sc.set(M4); await wait(200); },
    };
  },
};

export const review: ReviewDef = {
  id: 'c16-review', who: 'vell', title: 'Act V Review',
  claims: [vellGone, vellRank2, vellRowCol, vellPerp],
};

