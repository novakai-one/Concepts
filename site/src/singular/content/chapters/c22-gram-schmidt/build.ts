// Chapter 22 builds (GDD §5.5): gram_schmidt(vs) and qr(A). The Drift fix runs on gram_schmidt at the start
// of every watch. Both answers are canonical: the arrows are taken in order and each keeps the direction of
// what is left of it, so R has a positive diagonal and the swarm compares entry by entry.
// Plain data and maths (no DOM): tests/singular/game-c22.test.ts runs the references in CPython.
import type { BuildDef } from '../../../game/types.ts';
import type { Mat, Vec } from '../../../math/la.ts';
import { crew, gsCase, qrCase } from './logic.ts';

export const GRAM_SCHMIDT = `def gram_schmidt(vs):
    """Return arrows of length 1 at right angles to each other that reach the same points as vs."""
    qs = []
    for v in vs:
        w = v[:]
        for q in qs:
            w = add(w, scale(-dot(w, q), q))
        n = length(w)
        if n > 1e-9:
            qs.append(scale(1 / n, w))
    return qs
`;

export const QR = `def qr(A):
    """Return Q (unit columns at right angles) and R (upper triangular) with A = Q R."""
    columns = [[row[j] for row in A] for j in range(len(A[0]))]
    qs = gram_schmidt(columns)
    Q = [[q[i] for q in qs] for i in range(len(A))]
    R = matmul(transpose(Q), A)
    return Q, R
`;

const s2 = Math.SQRT2, s3 = Math.sqrt(3), s6 = Math.sqrt(6);
export const GS_TESTS = [
  { name: 'square up two: `gram_schmidt([[3, 4], [2, 1]])` is `[[0.6, 0.8], [0.8, -0.6]]`', args: [[[3, 4], [2, 1]]], expect: [[0.6, 0.8], [0.8, -0.6]] },
  { name: 'square up three: (1, 1, 0), (1, 0, 1), (0, 1, 1)', args: [[[1, 1, 0], [1, 0, 1], [0, 1, 1]]], expect: [[1 / s2, 1 / s2, 0], [1 / s6, -1 / s6, 2 / s6], [-1 / s3, 1 / s3, 1 / s3]] },
  { name: 'arrows already square and unit stay as they are', args: [[[0, 1], [-1, 0]]], expect: [[0, 1], [-1, 0]] },
  { name: 'a wasted arrow is dropped: `gram_schmidt([[1, 0], [2, 0], [0, 3]])`', args: [[[1, 0], [2, 0], [0, 3]]], expect: [[1, 0], [0, 1]] },
  { name: 'the Anchor’s arms square up to our own grid', args: [[[1, 0, 0], [1, 1, 0], [0, 0, 1]]], expect: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
];

export const QR_TESTS = [
  { name: 'columns (1, 1, 0), (1, 0, 1): R = [[√2, 1/√2], [0, 3/√6]]', args: [[[1, 1], [1, 0], [0, 1]]], expect: [[[1 / s2, 1 / s6], [1 / s2, -1 / s6], [0, 2 / s6]], [[s2, 1 / s2], [0, 3 / s6]]] },
  { name: 'columns (3, 4), (2, 1): R = [[5, 2], [0, 1]]', args: [[[3, 2], [4, 1]]], expect: [[[0.6, 0.8], [0.8, -0.6]], [[5, 2], [0, 1]]] },
  { name: 'the identity is already square: Q = R = I', args: [[[1, 0], [0, 1]]], expect: [[[1, 0], [0, 1]], [[1, 0], [0, 1]]] },
  { name: 'one column: Q is it scaled, R is its length', args: [[[0], [3], [4]]], expect: [[[0], [0.6], [0.8]], [[5]]] },
];

export const buildGramSchmidt: BuildDef = {
  id: 'c22-gram-schmidt', fn: 'gram_schmidt', title: 'Square up a set of arrows',
  brief: 'Write `gram_schmidt(vs)`. Take the arrows in order. From each, subtract its shadow on every arrow already finished; if anything is left, scale it to length 1 and add it to the finished list. Return the finished list.\n\nEach finished arrow is one unit long, so the shadow of `w` on `q` is `dot(w, q)` times `q`. Use your `add`, `scale`, `dot` and `length`. An arrow with nothing left (shorter than `1e-9`) was wasted: drop it.',
  starter: 'def gram_schmidt(vs):\n    """Return arrows of length 1 at right angles to each other that reach the same points as vs."""\n    qs = []\n    for v in vs:\n        w = v[:]\n        # subtract w\'s shadow on each finished q, then scale what is left to length 1\n    return qs\n',
  fill: 'def gram_schmidt(vs):\n    """Return arrows of length 1 at right angles to each other that reach the same points as vs."""\n    qs = []\n    for v in vs:\n        w = v[:]\n        for q in ___:\n            w = add(w, scale(-dot(___, q), q))\n        n = length(w)\n        if n > 1e-9:\n            qs.append(scale(___, w))\n    return qs\n',
  solution: GRAM_SCHMIDT,
  assemble: { lines: GRAM_SCHMIDT.trimEnd().split('\n'), decoys: ['            w = add(w, scale(-dot(v, vs[0]), vs[0]))', '            qs.append(w)'] },
  uses: ['add', 'scale', 'dot', 'length'],
  tests: GS_TESTS,
  swarm: { gen: (r, d) => gsCase(r, d), crew: (vs) => crew.gram_schmidt(vs as Vec[]), tol: 1e-6 },
  docPrompt: 'Why is what is left of an arrow, after its shadows on the finished arrows are gone, at a right angle to all of them? Write it the way you would tell Bram.',
  ilseNote: 'gram_schmidt(vs): what is left after the shadows on the finished arrows come off reads 0 against each of them. Then scale it. Order matters: the first arrow keeps its direction, so start with the one you trust.',
  payoff: 'The Drift fix re-squares LANTERN’s attitude frame with your `gram_schmidt` at the start of every watch.',
};

export const buildQr: BuildDef = {
  id: 'c22-qr', fn: 'qr', title: 'Square arrows, and how to get back',
  brief: 'Write `qr(A)` for a matrix `A` whose columns are independent. Return `Q, R`: `Q` has your `gram_schmidt` arrows of the columns as its columns, and `R = Qᵀ A`, so that `A = Q R`.\n\nEntry `(i, j)` of `R` is how much of column `j` points along `q_i`. It is 0 below the diagonal, because column `j` is built from `q_1 … q_j` only.',
  starter: 'def qr(A):\n    """Return Q (unit columns at right angles) and R (upper triangular) with A = Q R."""\n    columns = [[row[j] for row in A] for j in range(len(A[0]))]\n    # Q from gram_schmidt, then R = transpose(Q) times A\n    return A, A\n',
  fill: 'def qr(A):\n    """Return Q (unit columns at right angles) and R (upper triangular) with A = Q R."""\n    columns = [[row[j] for row in A] for j in range(len(A[0]))]\n    qs = gram_schmidt(___)\n    Q = [[q[i] for q in qs] for i in range(len(A))]\n    R = matmul(___, ___)\n    return Q, R\n',
  solution: QR,
  assemble: { lines: QR.trimEnd().split('\n'), decoys: ['    R = matmul(Q, A)', '    qs = gram_schmidt(A)'] },
  uses: ['gram_schmidt', 'transpose', 'matmul'],
  tests: QR_TESTS,
  swarm: { gen: (r, d) => qrCase(r, d), crew: (A) => crew.qr(A as Mat), tol: 1e-6 },
  docPrompt: 'Why is R = Qᵀ A, and why is it upper triangular?',
  ilseNote: 'qr(A): Q holds the squared-up columns, R = QᵀA holds the amounts. Row i of R is zero before column i, because the j-th column only ever needed the first j square arrows. Solving with QR never forms AᵀA, so it loses about half as many digits.',
  payoff: 'LANTERN can now square any frame and say how to rebuild the old one: your `qr`.',
};
