// Chapter 1: "What is a vector?" Three ideas, each found by typing numbers, then named, then practised:
// adding vectors, a number times a vector, length. Calm screen, plain maths (docs/singular/ch18-plain-style.md),
// no story. Then two harder cases, a short summary, and the Python functions add, scale and length
// (later chapters call all three: lincomb in Chapter 2 uses scale and add).
import type { Beat, BuildDef, ChapterDef } from '../../../game/types';
import { pAdd, pLen, pLen3, pMid, pMul, pVector } from './tryit';
import { drillAdd, drillLen, drillMul } from './drills';
import { addShot, gridShot, lineShot, triangleShot } from './parts';
import { ADD_U, ADD_V, IN_SHORT, LEN_V, MUL_V, NAME_LENGTH, NAME_SCALAR, NAME_VECTOR, TITLE, WRAP } from './text';

// The name cards come right after the puzzle where the player found the idea, and quote it.
const NAME_VEC: Beat = { kind: 'name', id: 'name-vector', entry: { id: 'vector', term: 'vector', nodes: ['N01', 'N02'], ...NAME_VECTOR, visual: addShot(ADD_U, ADD_V) } };
const NAME_SCAL: Beat = { kind: 'name', id: 'name-scalar', entry: { id: 'scalar-multiple', term: 'scalar multiple', nodes: ['N02'], ...NAME_SCALAR, visual: lineShot(MUL_V, [[6, 3], [-4, -2]], [3, 2]) } };
const NAME_LEN: Beat = { kind: 'name', id: 'name-length', entry: { id: 'length', term: 'length', nodes: ['N01'], ...NAME_LENGTH, visual: triangleShot(LEN_V) } };

/** A random whole-number vector for the test swarms. */
const vec = (r: () => number, n: number): number[] => Array.from({ length: n }, () => Math.floor(r() * 21) - 10);

const BUILD_ADD: BuildDef = {
  id: 'c01-add', fn: 'add', title: 'Add two vectors',
  brief: 'Write `add(v, w)`. It returns $\\mathbf v + \\mathbf w$: add the matching numbers.\n\n`v` and `w` are lists of numbers of the same length, such as `[4, -1]` and `[-1, 3]`.',
  starter: 'def add(v, w):\n    """Return v + w."""\n    # v and w are lists like [4, -1] and [-1, 3]\n    return []\n',
  solution: 'def add(v, w):\n    """Return v + w."""\n    return [a + b for a, b in zip(v, w)]\n',
  tests: [
    { name: '`add([4, -1], [-1, 3])` is `[3, 2]`', args: [[4, -1], [-1, 3]], expect: [3, 2] },
    { name: 'the other order gives the same', args: [[-1, 3], [4, -1]], expect: [3, 2] },
    { name: 'three numbers: `add([1, 2, 3], [4, 5, 6])`', args: [[1, 2, 3], [4, 5, 6]], expect: [5, 7, 9] },
    { name: 'adding `[0, 0]` changes nothing', args: [[2, 5], [0, 0]], expect: [2, 5] },
  ],
  swarm: { gen: (r) => { const n = r() < 0.7 ? 2 : 3; return [vec(r, n), vec(r, n)]; }, crew: (v, w) => (v as number[]).map((x, i) => x + (w as number[])[i]) },
  payoff: 'Later chapters call your `add`.',
};

const BUILD_SCALE: BuildDef = {
  id: 'c01-scale', fn: 'scale', title: 'A number times a vector',
  brief: 'Write `scale(c, v)`. It returns $c\\mathbf v$: multiply every number in `v` by `c`.',
  starter: 'def scale(c, v):\n    """Return c times the vector v."""\n    # multiply every number in v by c\n    return []\n',
  fill: 'def scale(c, v):\n    """Return c times the vector v."""\n    return [___ for x in v]\n',
  solution: 'def scale(c, v):\n    """Return c times the vector v."""\n    return [c * x for x in v]\n',
  assemble: { lines: ['def scale(c, v):', '    """Return c times the vector v."""', '    return [c * x for x in v]'], decoys: ['    return [c + x for x in v]'] },
  tests: [
    { name: '`scale(3, [2, 1])` is `[6, 3]`', args: [3, [2, 1]], expect: [6, 3] },
    { name: 'a negative number: `scale(-2, [2, 1])`', args: [-2, [2, 1]], expect: [-4, -2] },
    { name: '`scale(0, [5, -7])` is `[0, 0]`', args: [0, [5, -7]], expect: [0, 0] },
    { name: 'three numbers: `scale(0.5, [2, 4, 6])`', args: [0.5, [2, 4, 6]], expect: [1, 2, 3] },
  ],
  swarm: { gen: (r) => [Math.round((r() * 8 - 4) * 2) / 2, vec(r, r() < 0.7 ? 2 : 3)], crew: (c, v) => (v as number[]).map((x) => (c as number) * x) },
  payoff: 'Later chapters call your `scale`.',
};

const BUILD_LENGTH: BuildDef = {
  id: 'c01-length', fn: 'length', title: 'The length of a vector',
  brief: 'Write `length(v)`. It returns $\\|\\mathbf v\\|$: square each number, add them, take the square root. `math.sqrt` is available.',
  starter: 'def length(v):\n    """Return the length of the vector v."""\n    total = 0\n    # add up the square of each number\n    return math.sqrt(total)\n',
  solution: 'def length(v):\n    """Return the length of the vector v."""\n    return math.sqrt(sum(x * x for x in v))\n',
  tests: [
    { name: '`length([3, 4])` is 5', args: [[3, 4]], expect: 5 },
    { name: 'negative numbers: `length([-3, -4])` is 5', args: [[-3, -4]], expect: 5 },
    { name: 'three numbers: `length([1, 2, 2])` is 3', args: [[1, 2, 2]], expect: 3 },
    { name: '`length([0, 0])` is 0', args: [[0, 0]], expect: 0 },
  ],
  swarm: { gen: (r) => [vec(r, r() < 0.7 ? 2 : 3)], crew: (v) => Math.hypot(...(v as number[])), tol: 1e-9 },
  payoff: 'Later chapters call your `length`.',
};

const ch: ChapterDef = {
  id: 'c01',
  act: 1,
  num: 1,
  title: TITLE,
  subtitle: 'Vectors',
  nodes: ['N01', 'N02'],
  palette: 'default',
  music: 'explore',
  inShort: IN_SHORT,
  calm: true,
  beats: [
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: TITLE, body: IN_SHORT, visual: gridShot } },
    { kind: 'puzzle', id: 'vector', puzzle: pVector },
    { kind: 'puzzle', id: 'add', puzzle: pAdd },
    NAME_VEC,
    { kind: 'puzzle', id: 'drill-add', puzzle: drillAdd },
    { kind: 'puzzle', id: 'mul', puzzle: pMul },
    NAME_SCAL,
    { kind: 'puzzle', id: 'drill-mul', puzzle: drillMul },
    { kind: 'puzzle', id: 'length', puzzle: pLen },
    NAME_LEN,
    { kind: 'puzzle', id: 'drill-len', puzzle: drillLen },
    { kind: 'puzzle', id: 'mid', puzzle: pMid },
    { kind: 'puzzle', id: 'length3', puzzle: pLen3 },
    { kind: 'card', id: 'why', card: { kind: 'why', title: WRAP.title, body: WRAP.body, visual: gridShot } },
    { kind: 'build', id: 'build-add', build: BUILD_ADD },
    { kind: 'build', id: 'build-scale', build: BUILD_SCALE },
    { kind: 'build', id: 'build-length', build: BUILD_LENGTH },
  ],
};

export default ch;
