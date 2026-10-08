// Chapter 17: the story numbers (from truth.ts), every puzzle's win check (reference wins, misconceptions
// do not), honest frames for every change of grid, the set piece, the Doubts and the Review (the canonical
// construction gives the right verdict and the Shake finds the breaking case), the Law (the target survives
// 500 cases, each near-miss breaks), Teo's message (the reference lands, each missing key step fails as
// listed) and the three builds (the references pass their tests and a swarm in CPython; decoys fail).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as L from '../../site/src/singular/content/chapters/c17-coordinates/logic.ts';
import { S, spell } from '../../site/src/singular/content/chapters/c17-coordinates/script.ts';
import {
  FROM_COORDS, FROM_COORDS_TESTS, IN_GRID, IN_GRID_TESTS, TO_COORDS, TO_COORDS_TESTS, buildFromCoords, buildInGrid, buildToCoords,
  fromCoordsCase, inGridCase, toCoordsCase,
} from '../../site/src/singular/content/chapters/c17-coordinates/build.ts';
import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { det, identity, inverse, matMul, matVec, meq, mpow, veq, type Mat } from '../../site/src/singular/math/la.ts';
import { ILSE_MEANT, P, P2, P2inv, R, R2, S_now, T, T3, Tpartial } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const permutations = <X>(xs: X[]): X[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

test('the Anchor’s grid (TT1): b₁ = (1, 0), b₂ = (1, 1), 1.41 long, 45° apart', () => {
  assert.ok(veq(L.B1, [1, 0]) && veq(L.B2, [1, 1]));
  close(L.B2_LEN, Math.SQRT2);
  assert.equal(L.B2_LEN.toFixed(2), '1.41');
  close(L.ARM_ANGLE, 45, 1e-9);
  // the cold open says exactly these numbers
  const said = S.open.map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');
  assert.ok(said.includes('1.41') && said.includes('45 degrees'));
  assert.equal(spell(1.41), 'one point four one');
  assert.equal(spell(-1), 'minus one');
});

test('p1: the buoy (3, 2) is (1, 2) in the Anchor’s numbers; ship numbers and the wrong way do not reach it', () => {
  assert.ok(veq(L.P1_ANCHOR, [1, 2]));
  assert.ok(veq(L.reach(L.P1_ANCHOR), L.P1_SHIP));
  assert.ok(L.p1Won(L.P1_ANCHOR));
  assert.ok(L.p1Won([1.02, 2], 0.05) && !L.p1Won([1.02, 2], 0.01));
  assert.ok(!L.p1Won(L.P1_SAME), 'our numbers read as the Anchor’s');
  assert.ok(veq(L.reach(L.P1_SAME), [5, 2]));
  assert.ok(!L.p1Won(L.P1_WRONGWAY), 'P applied the wrong way');
  // unique on the whole-number dials the cadet drags
  let n = 0;
  for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (L.p1Won([a, b])) n++;
  assert.equal(n, 1);
});

test('p2: the Anchor’s (2, −1) is our (1, −1); the numbers placed as ours and P⁻¹ do not win', () => {
  assert.ok(veq(L.P2_SHIP, [1, -1]));
  assert.ok(L.p2Won(L.P2_SHIP));
  assert.ok(!L.p2Won(L.P2_SAME));
  assert.ok(veq(L.P2_WRONGWAY, [3, -1]) && !L.p2Won(L.P2_WRONGWAY));
  assert.ok(veq(L.anchorOf(L.P2_SHIP)!, L.P2_ANCHOR));
});

test('p3 [H]: Anchor (2, 1) → ours (3, 1) → Vell’s (2, −1); one matrix P_C⁻¹ P_B; each mistake is different', () => {
  assert.ok(veq(L.P3_SHIP, [3, 1]) && veq(L.P3_VELL, [2, -1]));
  assert.ok(meq(L.P3_CONVERT, [[0.5, 1], [-0.5, 0]]));
  assert.ok(veq(matVec(L.P3_CONVERT, L.P3_ANCHOR), L.P3_VELL));
  // Vell's arrows: both 1.41 long, at right angles
  close(Math.hypot(L.PC[0][0], L.PC[1][0]), Math.SQRT2); close(Math.hypot(L.PC[0][1], L.PC[1][1]), Math.SQRT2);
  close(L.PC[0][0] * L.PC[0][1] + L.PC[1][0] * L.PC[1][1], 0);
  assert.ok(!veq(L.P3_MISTAKES.ship, L.P3_SHIP));
  assert.ok(!veq(L.P3_MISTAKES.vell, L.P3_VELL));
  assert.ok(!meq(L.P3_MISTAKES.backwards, L.P3_CONVERT) && meq(L.P3_MISTAKES.backwards, inverse(L.P3_CONVERT)!));
  assert.ok(!meq(L.P3_MISTAKES.order, L.P3_CONVERT));
  // the conversion is right for every point, not only this one
  const r = rng(3);
  for (let i = 0; i < 50; i++) { const c = [rint(r, -5, 5), rint(r, -5, 5)]; assert.ok(veq(matVec(L.P3_CONVERT, c), matVec(L.PCinv, matVec(P2, c)))); }
});

test('p4: only P⁻¹, then R, then P matches the measured pulse (TT3); the bow goes to (1, 1)', () => {
  assert.ok(meq(L.railProduct(L.RAIL_RIGHT), T));
  assert.ok(meq(T, [[1, -2], [1, -1]]));
  const wins = permutations(L.RAIL_RIGHT).filter((p) => L.p4Won(p));
  assert.equal(wins.length, 1);
  assert.ok(!L.p4Won([P2, R2, P2inv]), 'the rail the other way round');
  assert.ok(!L.p4Won([P2inv, R2, null]), 'an empty slot');
  assert.ok(veq(L.BOW_REAL, [1, 1]) && veq(L.BOW_SPIRE, [0, 1]) && veq(L.BOW_SWAPPED, [-1, 1]));
  // honest stages: no frame of the replay passes through a flattening
  let cur = identity(2);
  for (const M of L.RAIL_RIGHT) {
    for (let k = 0; k <= 40; k++) { const W = L.stageAt(M, cur, k / 40); assert.ok(det(W) > 0.5, `stage frame det ${det(W)}`); }
    cur = matMul(M, cur);
  }
  // the routine pulse played as P R(θ) P⁻¹ keeps area at every frame
  for (let k = 0; k <= 20; k++) close(det(Tpartial((k / 20) * Math.PI / 2)), 1, 1e-9);
});

test('p5: what Ilse meant, P⁻¹ R P = [[−1, −2], [1, 1]] (TT6), turns our grid cleanly; her original leans it', () => {
  assert.ok(meq(L.ILSE_MEANT2, [[-1, -2], [1, 1]]));
  assert.ok(meq(L.ILSE_MEANT2, matMul(matMul(P2inv, R2), P2)));
  assert.ok(L.p5Won(L.ILSE_MEANT2));
  assert.ok(!L.p5Won(R2), 'Ilse’s original setting');
  assert.ok(!L.p5Won(T), 'the measured pulse typed in');
  assert.ok(meq(L.settingFromLandings(L.TURN_B1, L.TURN_B2), L.ILSE_MEANT2), 'the landing spots, read in the Anchor’s numbers');
  assert.ok(L.p5Won(ILSE_MEANT), '3-D: the same, third spire upright');
});

test('p6 [D]: area, diagonal sum and the fourth pulse match; entries and the landing of (1, 0) do not', () => {
  const m = Object.fromEntries(L.measures().map((x) => [x.id, x.same]));
  assert.deepEqual(m, { det: true, diag: true, four: true, entries: false, land: false });
  assert.ok(meq(mpow(T, 4), identity(2)) && meq(mpow(R2, 4), identity(2)));
  assert.ok(L.p6MarksRight({ det: 'same', diag: 'same', four: 'same', entries: 'diff', land: 'diff' }));
  assert.ok(!L.p6MarksRight({ det: 'same', diag: 'same', four: 'same', entries: 'same', land: 'diff' }));
  assert.ok(!L.p6MarksRight({ det: 'same', diag: 'same', four: 'same', entries: 'diff' }), 'one row unmarked');
  assert.deepEqual(L.P6, { detPC: 2, detPCinv: 0.5, detT: 1, detSim: 1 });
  close(det(L.P6_SIM), L.P6.detPCinv * L.P6.detT * L.P6.detPC);
  // similar matrices share area scale for random grids (the reason, tested)
  const r = rng(6);
  for (let i = 0; i < 200; i++) {
    const G: Mat = [[rint(r, -3, 3), rint(r, -3, 3)], [rint(r, -3, 3), rint(r, -3, 3)]];
    if (Math.abs(det(G)) < 1) continue;
    const A: Mat = [[rint(r, -3, 3), rint(r, -3, 3)], [rint(r, -3, 3), rint(r, -3, 3)]];
    close(det(L.inGrid(A, G)!), det(A), 1e-9);
  }
});

test('p6 par: reachable on every difficulty (measurements, marks, checked lines, slider changes and tile submits count a move)', () => {
  // five measurements and five marks, then the reason: cadet one slider change (two through the ½ step),
  // navigator four checked worksheet lines, commander the tile submit and the last line
  const p6Min = { cadet: 5 + 5 + 2, navigator: 5 + 5 + 4, commander: 5 + 5 + 1 + 1 };
  assert.deepEqual(L.P6_MIN, p6Min);
  assert.equal(L.P6_PAR, Math.max(...Object.values(p6Min)));
  assert.equal(L.P6_PAR, 14);
  const src = readFileSync(new URL('../../site/src/singular/content/chapters/c17-coordinates/puzzles2.ts', import.meta.url), 'utf8');
  assert.match(src, /export const p6: PuzzleDef = \{[\s\S]*?\n  par: P6_PAR,/, 'p6 uses the computed par');
});

test('p7 [S]: the translated forecast lands on (1, 1, 0), where the bow went (TT5)', () => {
  assert.ok(meq(L.railProduct([inverse(P)!, S_now, P]), T3));
  assert.ok(veq(L.BOW3_REAL, [1, 1, 0]) && veq(L.BOW3_SPIRE, [0, 1, 0]));
  assert.equal(permutations([inverse(P)!, S_now, P]).filter((p) => L.p7Won(p)).length, 1);
  assert.ok(meq(L.T3partial(1), T3, 1e-12) && meq(L.T3partial(0), identity(3), 1e-12));
  for (let k = 0; k <= 20; k++) assert.ok(det(L.T3partial(k / 20)) > 0.79);
});

test('[SP]: the setting swings the ark (3, 1, 0) to (−1, 3, 0), 4 from the stream; Ilse’s original goes back in', () => {
  assert.ok(meq(L.SP_SETTING, ILSE_MEANT));
  assert.ok(meq(L.SP_MOVE, R));
  assert.ok(veq(L.ARK_AFTER, [-1, 3, 0]));
  close(L.ARK_CLEAR, 4);
  assert.ok(L.spSettingOk(L.SP_SETTING) && L.spVolumeOk(L.SP_SETTING) && L.spClear(L.SP_SETTING));
  assert.ok(L.spFootOk([3, 3, 0], L.ARK_AFTER) && !L.spFootOk([3, 1, 0], L.ARK_AFTER));
  assert.ok(!L.spSettingOk(R), 'Ilse’s original setting');
  assert.ok(!L.spVolumeOk(S_now), 'the bent third spire scales volume by 0.8');
  assert.deepEqual(L.ILSE_PATH.map((p) => p.map((x) => Math.round(x))), [[3, 1], [1, 2], [-3, -1], [-1, -2], [3, 1]]);
  for (let k = 0; k <= 20; k++) close(det(L.turn3(k / 20)), 1, 1e-12);
  // the spoken numbers are the computed ones
  const said = [...S.spIntro, ...S.spWin].map((l) => (Array.isArray(l) ? l[1] : l.text)).join(' ');
  assert.ok(said.includes(L.fmtV(L.ARK)) && said.includes(L.fmtV(L.ARK_AFTER)));
});

test('Doubts: right angles are not needed; same numbers, different motion; similar matrices keep area', () => {
  // (F) the canonical counterexample is the Anchor's own grid; the Shake's random grids break a backing
  assert.equal(L.needsRightHolds(L.B1, L.B2), false);
  assert.equal(L.needsRightHolds([1, 0], [0, 1]), true, 'square grid: agrees with the claim');
  assert.equal(L.needsRightHolds([1, 2], [2, 4]), true, 'arrows on one line name nothing');
  const r = rng(11);
  let broke = 0;
  for (let i = 0; i < 20; i++) { const G: Mat = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; if (Math.abs(det(G)) >= 1 && !L.needsRightHolds([G[0][0], G[1][0]], [G[0][1], G[1][1]])) broke++; }
  assert.ok(broke > 5);
  // (F) same numbers, same motion: the Anchor's grid breaks it
  assert.equal(L.sameMotionHolds(R2, P2), false);
  assert.ok(veq(matVec(L.motionIn(R2, P2)!, [1, 0]), [1, 1]));
  assert.equal(L.sameMotionHolds(R2, identity(2)), true);
  // (T) area: holds for every grid and move, including flat moves and flips
  for (const [A, G] of [[[[1, 2], [2, 4]], P2], [[[0, 1], [1, 0]], L.PC], [T, [[3, 0], [1, 1]]]] as [Mat, Mat][]) assert.ok(L.similarAreaHolds(A, G));
  for (let i = 0; i < 300; i++) { const A: Mat = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; const G: Mat = [[rint(r, -2, 2), rint(r, -2, 2)], [rint(r, -2, 2), rint(r, -2, 2)]]; assert.ok(L.similarAreaHolds(A, G)); }
});

test('Review: the point does not move; P goes B → standard; four pulses carry over; entries change', () => {
  assert.equal(L.basisMovesPointHolds(L.P1_SHIP, P2), false);
  assert.equal(L.basisMovesPointHolds(L.P1_SHIP, identity(2)), true, 'the starting grid agrees with the claim: nothing has changed yet');
  assert.equal(L.basisMovesPointHolds(L.P1_SHIP, [[-1, 3], [0, 1]]), false, 'a changed basis whose numbers for (3, 2) happen to be (3, 2) still breaks it');
  assert.equal(L.pToBHolds(P2, L.P1_SHIP), false, 'P(3, 2) = (5, 2), but the B-numbers are (1, 2)');
  assert.equal(L.pToBHolds(identity(2), [2, 5]), true, 'in our own grid both directions agree');
  assert.equal(L.sameEntriesHolds(R2, P2), false);
  assert.ok(meq(L.inGrid(R2, P2)!, L.ILSE_MEANT2));
  assert.equal(L.sameEntriesHolds(R2, L.PC), true, 'Vell’s square grid happens to give the same entries for a turn');
  // (T) for every move with A⁴ = I and every grid
  const r = rng(13);
  const moves: Mat[] = [R2, [[-1, 0], [0, -1]], [[0, 1], [1, 0]], [[2, 0], [0, 1]], T];
  for (let i = 0; i < 300; i++) {
    const G: Mat = [[rint(r, -3, 3), rint(r, -3, 3)], [rint(r, -3, 3), rint(r, -3, 3)]];
    for (const A of moves) assert.ok(L.fourHomeHolds(A, G));
  }
  assert.ok(meq(mpow(L.motionIn(R2, P2)!, 4), identity(2)));
});

test('Law: “the columns turn new numbers into old, always” survives 500 cases; every near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of L.LAW_NEAR_MISSES) assert.equal(checkLaw(L.lawCore, f).survived, false, JSON.stringify(f));
});

test('Teo T2: the reference reports (1, 3); a missing key step fails as listed', () => {
  assert.ok(veq(L.TEO_ANCHOR, [1, 3]) && veq(L.TEO_WRONG, [7, 3]));
  assert.ok(veq(L.TEO_ANCHOR, matVec(P2inv, L.TEO_POS)));
  const ok = L.runTeo(L.TEO_REF);
  assert.ok(ok.ok && veq(ok.report!, [1, 3]) && veq(ok.reached!, L.TEO_POS));
  // K1 missing: he measures from the hatch beside him, sends (1, 2): it ends at (3, 2)
  const noBase = L.runTeo(L.TEO_REF.filter((x) => x !== 'base'));
  assert.ok(!noBase.ok && noBase.fault === 'hatch' && veq(noBase.report!, [1, 2]) && veq(noBase.reached!, [3, 2]));
  // K2 missing: he uses P and reports (7, 3)
  const noSolve = L.runTeo(L.TEO_REF.filter((x) => x !== 'solve'));
  assert.ok(!noSolve.ok && noSolve.fault === 'mul' && veq(noSolve.report!, L.TEO_WRONG));
  // the columns and the send are needed too
  const noCols = L.runTeo(L.TEO_REF.filter((x) => x !== 'cols'));
  assert.ok(!noCols.ok && noCols.fault === 'rows');
  const noSend = L.runTeo(L.TEO_REF.filter((x) => x !== 'send'));
  assert.ok(!noSend.ok && noSend.report === null);
  // misplaced: converting before saying where to measure from
  assert.ok(!L.runTeo(['cols', 'solve', 'base', 'send']).ok);
  // the decoys are the misconceptions
  assert.ok(veq(L.runTeo(['base', 'cols', 'mul', 'send']).report!, L.TEO_WRONG));
  assert.ok(!L.runTeo(['base', 'rows', 'solve', 'send']).ok);
  // every outcome's picture fits in the strip right of the 820 px message panel (1440 × 900)
  for (const ids of [L.TEO_REF, ...L.TEO_REF.map((k) => L.TEO_REF.filter((x) => x !== k)), ['base', 'cols', 'mul', 'send'], ['base', 'rows', 'solve', 'send']]) {
    const r = L.runTeo(ids);
    const pts: number[][] = [[0, 0], [...L.TEO_POS], [...L.TEO_HATCH]];
    if (r.arrow) { const f = r.from === 'hatch' ? L.TEO_HATCH : [0, 0]; pts.push([f[0] + r.arrow[0], f[1] + r.arrow[1]]); }
    if (r.reached) pts.push([...r.reached]);
    const v = L.teoView(1440, 900, pts), s = 900 / v.height;
    for (const p of pts) {
      const x = 720 + (p[0] - v.center[0]) * s, y = 450 - (p[1] - v.center[1]) * s;
      assert.ok(x >= 1130 + 40 && x <= 1440 - 50 && y >= 120 && y <= 780, `${ids.join(',')}: (${p}) at ${x.toFixed(0)}, ${y.toFixed(0)}`);
    }
  }
});

// ------------------------------------------------------------------ builds in CPython

const LIB = `
def add(v, w):
    return [a + b for a, b in zip(v, w)]
def scale(c, v):
    return [c * x for x in v]
def lincomb(cs, vs):
    total = scale(0, vs[0])
    for c, v in zip(cs, vs):
        total = add(total, scale(c, v))
    return total
def matvec(A, x):
    columns = [[row[j] for row in A] for j in range(len(x))]
    return lincomb(x, columns)
def matmul(A, B):
    columns = [matvec(A, [row[j] for row in B]) for j in range(len(B[0]))]
    return [[c[i] for c in columns] for i in range(len(A))]
def identity(n):
    return [[1 if i == j else 0 for j in range(n)] for i in range(n)]
def inverse(A):
    n = len(A)
    M = [list(map(float, A[i])) + identity(n)[i] for i in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) < 1e-9:
            return None
        M[c], M[p] = M[p], M[c]
        pivot = M[c][c]
        M[c] = [x / pivot for x in M[c]]
        for r in range(n):
            if r != c:
                f = M[r][c]
                M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [row[n:] for row in M]
def rref(M):
    M = [row[:] for row in M]
    rows, cols = len(M), len(M[0])
    r = 0
    for c in range(cols):
        p = next((i for i in range(r, rows) if abs(M[i][c]) > 1e-9), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]
        pivot = M[r][c]
        M[r] = [x / pivot for x in M[r]]
        for i in range(rows):
            if i != r and abs(M[i][c]) > 1e-12:
                f = M[i][c]
                M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        r += 1
        if r == rows:
            break
    return [[0 if abs(x) < 1e-9 else x for x in row] for row in M]
def solve(M):
    n = len(M[0]) - 1
    R = rref(M)
    pivots = []
    for row in R:
        lead = next((c for c, x in enumerate(row) if x != 0), None)
        if lead is not None:
            pivots.append(lead)
    if n in pivots:
        return {'kind': 'none', 'point': None, 'directions': []}
    point = [0] * n
    for i, pc in enumerate(pivots):
        point[pc] = R[i][n]
    free = [c for c in range(n) if c not in pivots]
    directions = []
    for f in free:
        d = [0] * n
        d[f] = 1
        for i, pc in enumerate(pivots):
            d[pc] = -R[i][f]
        directions.append(d)
    return {'kind': 'many' if free else 'one', 'point': point, 'directions': directions}
`;

function runPy(fn: string, code: string, cases: { args: unknown[]; expect: unknown }[]): boolean[] {
  const prog = `import json, math\n${LIB}\n${code}\ndef close(a, b):\n    if a is None or b is None:\n        return a is None and b is None\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < 1e-6\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8' }));
}

const swarm = (gen: (r: () => number, d: string) => unknown[], crew: (...a: unknown[]) => unknown) => {
  const r = rng(17);
  return Array.from({ length: 90 }, (_, i) => { const args = gen(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: crew(...args) ?? null }; });
};

test('builds: to_coords, from_coords, in_grid pass their tests and a swarm; each decoy fails one', () => {
  for (const [b, src, tests, gen] of [
    [buildToCoords, TO_COORDS, TO_COORDS_TESTS, toCoordsCase],
    [buildFromCoords, FROM_COORDS, FROM_COORDS_TESTS, fromCoordsCase],
    [buildInGrid, IN_GRID, IN_GRID_TESTS, inGridCase],
  ] as const) {
    assert.ok(runPy(b.fn, src, tests).every(Boolean), `${b.fn} tests`);
    const cases = swarm(gen as (r: () => number, d: string) => unknown[], b.swarm!.crew);
    assert.ok(cases.some((c) => c.expect === null) || b.fn !== 'to_coords', 'the to_coords swarm includes flat grids');
    assert.ok(runPy(b.fn, src, cases).every(Boolean), `${b.fn} swarm`);
    // each crew version agrees with the fixed tests
    const same = (a: unknown, e: unknown): boolean => (a === null || e === null ? a === e : Array.isArray(a) ? Array.isArray(e) && a.length === e.length && a.every((x, i) => same(x, e[i])) : Math.abs((a as number) - (e as number)) < 1e-9);
    for (const t of tests) assert.ok(same(b.swarm!.crew(...t.args), t.expect), `crew agrees: ${t.name}`);
    // each decoy (in place of the line it imitates) fails at least one test
    for (const decoy of b.assemble!.decoys ?? []) {
      const lines = b.assemble!.lines.slice();
      const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
      let at = -1;
      lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
      if (at < 0) at = lines.length - 1;
      lines[at] = decoy;
      assert.ok(runPy(b.fn, `${lines.join('\n')}\n`, tests).some((x) => !x), `${b.fn} decoy: ${decoy}`);
    }
  }
  // the crew versions are the story maths
  assert.ok(veq(L.crew.to_coords(P2, [3, 2])!, [1, 2]));
  assert.ok(meq(L.crew.in_grid(P, R)!, ILSE_MEANT));
  assert.equal(L.crew.to_coords([[1, 2], [2, 4]], [1, 2]), null);
});
