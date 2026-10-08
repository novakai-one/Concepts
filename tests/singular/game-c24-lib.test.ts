// Shared helpers for the Act IX tests (Chapters 24–26): run a build's Python reference in CPython against its
// tests and a swarm, and check each assemble decoy fails at least one test. The library below stands in for
// the earlier chapters' functions the Act IX builds call (the same behaviour as their references).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import type { BuildDef } from '../../site/src/singular/game/types.ts';
import { rng } from '../../site/src/singular/game/lawcheck.ts';
import { SYM_EIGEN, QUAD_FORM } from '../../site/src/singular/content/chapters/c24-spectral/build.ts';

export const BASE_LIB = `
def add(v, w):
    return [a + b for a, b in zip(v, w)]
def scale(c, v):
    return [c * x for x in v]
def lincomb(cs, vs):
    total = scale(0, vs[0])
    for c, v in zip(cs, vs):
        total = add(total, scale(c, v))
    return total
def dot(v, w):
    return sum(a * b for a, b in zip(v, w))
def matvec(A, x):
    columns = [[row[j] for row in A] for j in range(len(x))]
    return lincomb(x, columns)
def transpose(A):
    return [[row[j] for row in A] for j in range(len(A[0]))]
def matmul(A, B):
    cols = [matvec(A, [row[j] for row in B]) for j in range(len(B[0]))]
    return transpose(cols)
def power_iteration(A, x, steps):
    for _ in range(steps):
        x = matvec(A, x)
        size = math.sqrt(sum(t * t for t in x))
        x = [t / size for t in x]
    return x
`;
/** The Act IX library so far (quad_form, sym_eigen), for later builds that call them. */
export const ACT9_LIB = `${BASE_LIB}\n${QUAD_FORM}\n${SYM_EIGEN}`;

export interface Case { args: unknown[]; expect: unknown }

/** Run fn (defined by code, with lib) on each case in CPython; true where the result is within tol. */
export function runPy(fn: string, code: string, cases: Case[], lib = BASE_LIB, tol = 1e-6): boolean[] {
  const prog = `import json, math\n${lib}\n${code}\ndef close(a, b):\n    if a is None or b is None:\n        return a is None and b is None\n    if isinstance(a, dict):\n        return isinstance(b, dict) and a.keys() == b.keys() and all(close(a[k], b[k]) for k in a)\n    if isinstance(a, str):\n        return a == b\n    if isinstance(a, (list, tuple)):\n        return isinstance(b, (list, tuple)) and len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))\n    return abs(a - b) < ${tol}\nres = []\nfor a, e in json.loads(${JSON.stringify(JSON.stringify(cases.map((t) => [t.args, t.expect])))}):\n    try:\n        res.append(close(${fn}(*a), e))\n    except Exception:\n        res.append(False)\nprint(json.dumps(res))\n`;
  return JSON.parse(execFileSync('python3', ['-I', '-c', prog], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

/** 120 swarm cases across the three levels, with the crew's answers. */
export function swarmCases(b: BuildDef, n = 120, seed = 2424): Case[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => { const args = b.swarm!.gen(r, (['cadet', 'navigator', 'commander'] as const)[i % 3]); return { args, expect: b.swarm!.crew(...args) ?? null }; });
}

/** Deep closeness for the crew-agrees-with-tests check. */
export function same(a: unknown, e: unknown, tol = 1e-9): boolean {
  if (typeof a === 'string') return a === e;
  if (Array.isArray(a)) return Array.isArray(e) && a.length === e.length && a.every((x, i) => same(x, e[i], tol));
  if (a && typeof a === 'object') return !!e && typeof e === 'object' && Object.keys(a).every((k) => same((a as Record<string, unknown>)[k], (e as Record<string, unknown>)[k], tol));
  return Math.abs((a as number) - (e as number)) < tol;
}

/** A build passes its tests and its swarm in CPython, the crew agrees with every fixed test, and every decoy fails a test. */
export function checkBuild(b: BuildDef, lib = BASE_LIB, swarmN = 120): void {
  const tests = b.tests.map((t) => ({ args: t.args, expect: t.expect }));
  const res = runPy(b.fn, b.solution, tests, lib);
  assert.ok(res.every(Boolean), `${b.fn} tests: ${JSON.stringify(res)}`);
  const cases = swarmCases(b, swarmN);
  const sw = runPy(b.fn, b.solution, cases, lib);
  const bad = sw.map((ok, i) => (ok ? -1 : i)).filter((i) => i >= 0);
  assert.equal(bad.length, 0, `${b.fn} swarm fails on ${bad.length}: ${JSON.stringify(cases[bad[0]]?.args)}`);
  for (const t of b.tests) assert.ok(same(b.swarm!.crew(...t.args), t.expect, 1e-6), `crew agrees: ${t.name}`);
  for (const decoy of b.assemble?.decoys ?? []) {
    const lines = b.assemble!.lines.slice();
    const key = (l: string) => `${l.match(/^ */)![0].length}:${l.trim().split(/[ =(]/)[0]}`;
    let at = -1;
    lines.forEach((l, i) => { if (i >= 2 && key(l) === key(decoy)) at = i; });
    assert.ok(at >= 0, `decoy has a line to replace: ${decoy}`);
    lines[at] = decoy;
    assert.ok(runPy(b.fn, `${lines.join('\n')}\n`, tests, lib).some((x) => !x), `${b.fn} decoy should fail: ${decoy}`);
  }
}

test('the stand-in library runs', () => {
  assert.deepEqual(runPy('matmul', '', [{ args: [[[1, 2], [3, 4]], [[0, 1], [1, 0]]], expect: [[2, 1], [4, 3]] }]), [true]);
});
