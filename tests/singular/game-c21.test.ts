// Chapter 21: the story numbers (TT16 from truth.ts), every puzzle's numbers and win check (reference wins,
// misconceptions do not), the Doubts (the canonical construction gives the right verdict and the Shake's
// cases break the false claims), the Law (the target survives 500 cases, each near-miss breaks) and the
// build (the reference passes its tests and a swarm in CPython; each decoy fails).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as L from '../../site/src/singular/content/chapters/c21-projection/logic.ts';
import { PROJECT, PROJECT_TESTS, buildProject } from '../../site/src/singular/content/chapters/c21-projection/build.ts';
import { checkLaw, rng, rint } from '../../site/src/singular/game/lawcheck.ts';
import { det, dot, fromCols, inverse, matMul, matVec, meq, norm, transpose, vadd, veq, vscale, vsub } from '../../site/src/singular/math/la.ts';
import { HATCH, HATCH_FOOT, TETHER } from '../../site/src/singular/content/truth.ts';

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('TT16: the hatch (1, 1, 0) is off z = x + y; its nearest point (1/3, 1/3, 2/3) is 1.155 away, inside the 1.2 tether', () => {
  assert.ok(veq(HATCH, [1, 1, 0]));
  assert.ok(!L.onThrusterPlane(HATCH));
  assert.ok(L.onThrusterPlane(HATCH_FOOT));
  assert.ok(veq(L.project(L.THR, HATCH), HATCH_FOOT));
  assert.equal(L.HATCH_DIST.toFixed(3), '1.155');
  assert.ok(L.HATCH_DIST < TETHER);
  // the leftover is perpendicular to both thrusters
  close(dot(L.HATCH_LEFT, L.THR1), 0); close(dot(L.HATCH_LEFT, L.THR2), 0);
  // straight up from the hatch is on the plane and 2 away; the origin is 1.41 away
  assert.ok(L.onThrusterPlane(L.HATCH_UP));
  close(norm(vsub(HATCH, L.HATCH_UP)), 2);
  assert.ok(norm(HATCH) > TETHER);
  // every other point of the plane is further (Pythagoras)
  const r = rng(21);
  for (let i = 0; i < 200; i++) {
    const q = L.thrusterPoint(r() * 4 - 2, r() * 4 - 2);
    assert.ok(norm(vsub(HATCH, q)) >= L.HATCH_DIST - 1e-12);
    close(norm(vsub(HATCH, q)) ** 2, L.HATCH_DIST ** 2 + norm(vsub(q, HATCH_FOOT)) ** 2, 1e-9);
  }
});

test('p1: the nearest point of the line through (1, 2) to (3, 1) is (1, 2); leftover (2, −1) reads 0', () => {
  assert.ok(veq(L.P1_FOOT, [1, 2]) && veq(L.P1_LEFT, [2, -1]));
  close(dot(L.P1_LEFT, L.P1_A), 0);
  close(L.P1_DIST, Math.sqrt(5));
  assert.ok(L.p1Won(1));
  assert.ok(L.p1Won(1.02, 0.05) && !L.p1Won(1.02, 0.01));
  assert.ok(!L.p1Won(3), 'straight below b is not the nearest point');
  assert.ok(!L.p1Won(1.25));
  // on the cadet/navigator snap (t in quarters) only t = 1 wins
  let n = 0;
  for (let k = -8; k <= 12; k++) if (L.p1Won(k / 4)) n++;
  assert.equal(n, 1);
});

test('p2: parking at the nearest point wins; the hatch’s own corner of the plane and the origin do not', () => {
  assert.ok(L.p2Won(HATCH_FOOT));
  assert.ok(L.p2Won(L.thrusterPoint(1 / 3, 1 / 3)));
  assert.ok(!L.p2Won([0, 0, 0]));
  assert.ok(!L.p2Won(L.HATCH_UP));
  assert.ok(!L.p2Won(L.thrusterPoint(0.4, 0.4)), 'near, and reachable by the tether, but not the nearest point');
  assert.ok(norm(vsub(HATCH, L.thrusterPoint(0.4, 0.4))) <= TETHER);
  // the cadet's thirds and the navigator's sixths both reach the foot exactly
  assert.ok(L.p2Won(L.thrusterPoint(2 / 6, 2 / 6), 1e-9));
});

test('p3 [D]: perpendicular basis: shadows (2, 2, 0) + (0, 0, 2) = (2, 2, 2), leftover (1, −1, 0)', () => {
  close(dot(L.P3_U1, L.P3_U2), 0);
  assert.ok(veq(L.P3_S1, [2, 2, 0]) && veq(L.P3_S2, [0, 0, 2]) && veq(L.P3_P, [2, 2, 2]));
  assert.ok(veq(L.P3_LEFT, [1, -1, 0]));
  assert.ok(veq(L.project(fromCols([L.P3_U1, L.P3_U2]), L.P3_B), L.P3_P));
  close(dot(L.P3_LEFT, L.P3_U1), 0); close(dot(L.P3_LEFT, L.P3_U2), 0);
  assert.ok(L.p3Won([2, 2, 2]) && !L.p3Won([3, 1, 0]) && !L.p3Won([2, 2, 0]));
});

test('p3 [D] Navigator rows: u₂·u₁ = 0 drops the cross term; c₁ = c₂ = 2 from the two zero-leftover equations; p = c₁u₁ + c₂u₂', () => {
  const { P3_U1: u1, P3_U2: u2, P3_B: b } = L;
  assert.equal(dot(b, u1), 4); assert.equal(dot(u1, u1), 2); assert.equal(dot(b, u2), 2); assert.equal(dot(u2, u2), 1);
  assert.equal(dot(u2, u1), 0);
  // the rows' equations b·u₁ − c₁ u₁·u₁ − c₂ u₂·u₁ = 0 and b·u₂ − c₁ u₁·u₂ − c₂ u₂·u₂ = 0, solved together
  const G = [[dot(u1, u1), dot(u2, u1)], [dot(u1, u2), dot(u2, u2)]];
  const c = matVec(inverse(G)!, [dot(b, u1), dot(b, u2)]);
  assert.ok(veq(c, L.P3_C) && veq(L.P3_C, [2, 2]));
  close(dot(b, u1) - L.P3_C[0] * dot(u1, u1) - L.P3_C[1] * dot(u2, u1), 0);
  close(dot(b, u2) - L.P3_C[0] * dot(u1, u2) - L.P3_C[1] * dot(u2, u2), 0);
  assert.ok(veq(vadd(vscale(u1, L.P3_C[0]), vscale(u2, L.P3_C[1])), L.P3_P));
  assert.notEqual(L.P3_C[0], dot(b, u1), 'the c₁ misconception (forgetting to divide by u₁·u₁) is a different number');
});

test('p4: skewed basis: the shadows add to (4.5, 2.5, 0); the true nearest point is (2, 3, 0); the overlap is (2.5, 0, 0)', () => {
  assert.ok(dot(L.P4_K1, L.P4_K2) !== 0);
  assert.ok(veq(L.P4_S1, [2, 0, 0]) && veq(L.P4_S2, [2.5, 2.5, 0]));
  assert.ok(veq(L.P4_WRONG, [4.5, 2.5, 0]));
  assert.ok(veq(L.P4_FOOT, [2, 3, 0]));
  assert.equal(norm(vsub(L.P4_B, L.P4_WRONG)).toFixed(2), '4.74');
  close(norm(vsub(L.P4_B, L.P4_FOOT)), 4);
  assert.ok(veq(L.P4_OVERLAP, [2.5, 0, 0]));
  assert.ok(L.p4FootOk([2, 3, 0]) && !L.p4FootOk(L.P4_WRONG));
  assert.ok(L.p4OverlapOk([2.5, 0, 0]) && !L.p4OverlapOk([2, 0, 0]));
  // the snap grids reach both answers: weights (−1, 3) on k1, k2; t = 2.5 on k1
  assert.ok(veq(matVec(fromCols([L.P4_K1, L.P4_K2]), [-1, 3]), [2, 3, 0]));
  // the overlap is not the whole error: taking it off still misses, and the true weights are not the shadows' 2 and 2.5
  assert.ok(veq(vsub(L.P4_WRONG, L.P4_OVERLAP), [2, 2.5, 0]));
  assert.ok(!L.p4FootOk(vsub(L.P4_WRONG, L.P4_OVERLAP)));
  assert.ok(!veq([-1, 3], [2, 2.5]));
});

test('p5 [H]: AᵀA = [[2, 1], [1, 2]], Aᵀb = (3, 5), x̂ = (1/3, 7/3), p = (1/3, 8/3, 7/3), leftover (2/3, −2/3, 2/3)', () => {
  assert.ok(meq(L.P5_ATA, [[2, 1], [1, 2]]));
  assert.ok(veq(L.P5_ATB, [3, 5]));
  assert.ok(veq(L.P5_X, [1 / 3, 7 / 3]));
  assert.ok(veq(L.P5_P, [1 / 3, 8 / 3, 7 / 3]));
  assert.ok(veq(L.P5_LEFT, [2 / 3, -2 / 3, 2 / 3]));
  close(dot(L.P5_LEFT, L.P5_A1), 0); close(dot(L.P5_LEFT, L.P5_A2), 0);
  // the misconception: deleting a coordinate
  assert.ok(!veq(L.P5_P, [1, 2, 0]));
});

test('p6: the hum part of (4, 3) along (0.6, 0.8) is (2.88, 3.84); kept (1.12, −0.84)', () => {
  close(norm(L.P6_D), 1);
  close(L.P6_T, 4.8);
  assert.ok(veq(L.P6_ALONG, [2.88, 3.84]));
  assert.ok(veq(L.P6_KEEP, [1.12, -0.84]));
  close(dot(L.P6_KEEP, L.P6_D), 0);
  assert.ok(L.p6Won(L.P6_KEEP));
  assert.ok(!L.p6Won(vsub(L.P6_S, L.P6_D)), 'subtracting the hum direction itself');
  assert.ok(!L.p6Won(L.P6_ALONG), 'keeping the hum');
  // the snaps reach t = 4.8: 12 × 0.4 and 24 × 0.2
  close(Math.round(4.8 / 0.4) * 0.4, 4.8, 1e-12); close(Math.round(4.8 / 0.2) * 0.2, 4.8, 1e-12);
});

test('p7: P = (1/5)[[1, 2], [2, 4]]: P² = P, Pᵀ = P, det 0, (2, −1) goes to the origin', () => {
  assert.ok(meq(matMul(L.P7, L.P7), L.P7));
  assert.ok(meq(transpose(L.P7), L.P7));
  close(det(L.P7), 0);
  assert.ok(veq(matVec(L.P7, L.P7_NULL), [0, 0]));
  assert.ok(veq(matVec(L.P7, [3, 1]), [1, 2]));
  assert.ok(L.p7NullOk([2, -1]) && L.p7NullOk([-4, 2]));
  assert.ok(!L.p7NullOk([0, 0]), 'the zero vector does not count');
  assert.ok(!L.p7NullOk([1, 2]) && !L.p7NullOk([1, 1]));
});

test('p8 [S]: P = A(AᵀA)⁻¹Aᵀ = (1/3)[[2, 1, −1], [1, 2, 1], [−1, 1, 2]]: P² = P, Pᵀ = P, P b = p5’s point', () => {
  assert.ok(meq(L.P8_INV, [[2 / 3, -1 / 3], [-1 / 3, 2 / 3]]));
  assert.ok(meq(L.P8, [[2, 1, -1], [1, 2, 1], [-1, 1, 2]].map((r) => r.map((x) => x / 3))));
  assert.ok(meq(matMul(L.P8, L.P8), L.P8));
  assert.ok(meq(transpose(L.P8), L.P8));
  assert.ok(veq(matVec(L.P8, L.P5_B), L.P5_P));
  assert.ok(veq(matVec(L.P8, [1, -1, 1]), [0, 0, 0]), 'the orthogonal complement goes to the origin');
});

test('projection matrix: with a wasted column AᵀA has no inverse; dropping that column gives the same P', () => {
  const A = fromCols([L.P5_A1, L.P5_A2, vscale(L.P5_A1, 2)]);
  const AtA = matMul(transpose(A), A);
  close(det(AtA), 0);
  assert.equal(inverse(AtA), null);
  const r = rng(62);
  for (let i = 0; i < 20; i++) {
    const b = [rint(r, -4, 4), rint(r, -4, 4), rint(r, -4, 4)];
    assert.ok(veq(L.project(A, b), matVec(L.P8, b)), 'P of the independent columns');
  }
});

test('Doubt (F) straight up: the nearest point beats straight up; the Shake’s cases break the claim', () => {
  assert.ok(!L.straightUpHolds(HATCH, HATCH_FOOT), 'the challenge: (1/3, 1/3, 2/3) is nearer');
  assert.ok(L.straightUpHolds(HATCH, L.HATCH_UP), 'standing on the straight-up point agrees with the claim');
  for (const t of [[1, 1, 0], [0, 0, 3]]) assert.ok(!L.straightUpHolds(t, L.project(L.THR, t)));
  const r = rng(5);
  for (let i = 0; i < 50; i++) {
    let t: number[];
    do { t = [rint(r, -2, 2), rint(r, -2, 2), rint(r, -2, 3)]; } while (Math.abs(t[2] - t[0] - t[1]) < 1);
    assert.ok(!L.straightUpHolds(t, L.project(L.THR, t)));
  }
});

test('Doubt (F) adding shadows: square arrows agree, skewed arrows break it (the edge cases included)', () => {
  const b = [2, 3, 4];
  assert.ok(L.shadowSumHolds([2, 0, 0], [0, 2, 0], b), 'the starting arrows are square: the claim holds there');
  assert.ok(!L.shadowSumHolds([1, 0, 0], [1, 1, 0], b));
  assert.ok(!L.shadowSumHolds([2, 1, 0], [1, 2, 0], b));
  const r = rng(9);
  let broke = 0;
  for (let i = 0; i < 20; i++) {
    let a: number[], c: number[];
    do { a = [rint(r, -3, 3), rint(r, -3, 3), 0]; c = [rint(r, -3, 3), rint(r, -3, 3), 0]; } while (Math.abs(a[0] * c[1] - a[1] * c[0]) < 1);
    if (!L.shadowSumHolds(a, c, b)) broke++;
    if (Math.abs(dot(a, c)) < 1e-9) assert.ok(L.shadowSumHolds(a, c, b), 'square arrows always agree');
  }
  assert.ok(broke >= 10);
});

test('Doubt (T) projecting twice: holds for every line and point (the Shake cannot break it)', () => {
  const r = rng(13);
  for (let i = 0; i < 300; i++) {
    let d: number[];
    do { d = [rint(r, -3, 3), rint(r, -3, 3)]; } while (d[0] === 0 && d[1] === 0);
    assert.ok(L.twiceHolds(d, [rint(r, -3, 3), rint(r, -3, 3)]));
  }
  for (const [d, x] of [[[2, 1], [4, 2]], [[2, 1], [-1, 2]], [[1, 3], [3, -2]]]) assert.ok(L.twiceHolds(d, x));
});

test('Law: perpendicular to every arrow survives 500 planes; each near-miss breaks', () => {
  assert.equal(checkLaw(L.lawCore, L.lawCore.answer).survived, true);
  for (const f of [{ rel: 'perp', to: 'first' }, { rel: 'perp', to: 'z' }, { rel: 'par', to: 'plane' }, { rel: 'par', to: 'first' }, { rel: 'par', to: 'z' }]) {
    const res = checkLaw(L.lawCore, f);
    assert.equal(res.survived, false, `${f.rel} ${f.to} should break`);
  }
  // the floor case agrees with "straight up", and still the near-miss breaks elsewhere
  const floor = L.lawCore.edgeCases[1];
  assert.ok(L.lawCore.holds({ rel: 'par', to: 'z' }, floor));
});

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
def transpose(A):
    return [[row[j] for row in A] for j in range(len(A[0]))]
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

test('build: project passes its tests and a swarm (with wasted columns); each decoy fails', () => {
  assert.ok(runPy('project', PROJECT, PROJECT_TESTS).every(Boolean), 'tests');
  const r = rng(21);
  const cases = Array.from({ length: 150 }, (_, i) => { const args = L.projectCase(r, ['cadet', 'navigator', 'commander'][i % 3]); return { args, expect: buildProject.swarm!.crew(...args) }; });
  assert.ok(cases.some((c) => { const A = c.args[0] as number[][]; return A[0].length >= 2 && fromCols([0, 1].map((j) => A.map((row) => row[j]))).length > 0 && Math.abs(A[0][A[0].length - 1] - 2 * A[0][0]) < 1e-12 && A.every((row) => Math.abs(row[row.length - 1] - 2 * row[0]) < 1e-12); }), 'the swarm includes a wasted column');
  assert.ok(runPy('project', PROJECT, cases).every(Boolean), 'swarm');
  for (const t of PROJECT_TESTS) assert.ok(veq(buildProject.swarm!.crew(...t.args) as number[], t.expect as number[]), `crew agrees: ${t.name}`);
  for (const decoy of buildProject.assemble!.decoys ?? []) {
    const lines = buildProject.assemble!.lines.slice();
    const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
    let at = -1;
    lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
    assert.ok(at >= 0, `decoy has a line to replace: ${decoy}`);
    lines[at] = decoy;
    assert.ok(runPy('project', `${lines.join('\n')}\n`, PROJECT_TESTS).some((x) => !x), `decoy fails: ${decoy}`);
  }
});
