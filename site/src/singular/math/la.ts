// Numeric linear algebra used by the game (vectors are number[], matrices are row-major number[][]).
// Every function is pure. Exact (fraction) row reduction lives in rref.ts.

export type Vec = number[];
export type Mat = number[][];

export const EPS = 1e-9;

// ---------- vectors ----------
export const vadd = (a: Vec, b: Vec): Vec => a.map((x, i) => x + b[i]);
export const vsub = (a: Vec, b: Vec): Vec => a.map((x, i) => x - b[i]);
export const vscale = (a: Vec, s: number): Vec => a.map((x) => x * s);
export const vneg = (a: Vec): Vec => a.map((x) => -x);
export const dot = (a: Vec, b: Vec): number => a.reduce((s, x, i) => s + x * b[i], 0);
export const norm = (a: Vec): number => Math.sqrt(dot(a, a));
export const normalize = (a: Vec): Vec => { const n = norm(a); return n < EPS ? a.map(() => 0) : vscale(a, 1 / n); };
export const dist = (a: Vec, b: Vec): number => norm(vsub(a, b));
export const vlerp = (a: Vec, b: Vec, t: number): Vec => a.map((x, i) => x + (b[i] - x) * t);
export const veq = (a: Vec, b: Vec, tol = 1e-6): boolean => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= tol);
export const zeros = (n: number): Vec => new Array(n).fill(0);

/** Linear combination c0*v0 + c1*v1 + ... */
export function combo(coeffs: number[], vs: Vec[]): Vec {
  const out = zeros(vs[0].length);
  coeffs.forEach((c, k) => vs[k].forEach((x, i) => { out[i] += c * x; }));
  return out;
}

export function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
/** 2-D "cross": the signed area of the parallelogram on a and b. */
export const cross2 = (a: Vec, b: Vec): number => a[0] * b[1] - a[1] * b[0];
/** Scalar triple product a · (b × c): signed volume of the parallelepiped. */
export const triple = (a: Vec, b: Vec, c: Vec): number => dot(a, cross(b, c));

/** Angle between two vectors in radians (0..π). */
export function angle(a: Vec, b: Vec): number {
  const d = norm(a) * norm(b);
  if (d < EPS) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / d)));
}
/** Projection of a onto the line through b. */
export function proj(a: Vec, b: Vec): Vec {
  const bb = dot(b, b);
  return bb < EPS ? zeros(a.length) : vscale(b, dot(a, b) / bb);
}
/** Signed angle from a to b in the plane (radians, -π..π). */
export const angle2 = (a: Vec, b: Vec): number => Math.atan2(cross2(a, b), dot(a, b));

// ---------- matrices ----------
export const identity = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
export const mclone = (m: Mat): Mat => m.map((r) => r.slice());
export const rows = (m: Mat): number => m.length;
export const cols = (m: Mat): number => (m.length ? m[0].length : 0);
export const transpose = (m: Mat): Mat => (m.length ? m[0].map((_, j) => m.map((r) => r[j])) : []);
export const col = (m: Mat, j: number): Vec => m.map((r) => r[j]);
export const fromCols = (cs: Vec[]): Mat => cs[0].map((_, i) => cs.map((c) => c[i]));
export const madd = (a: Mat, b: Mat): Mat => a.map((r, i) => r.map((x, j) => x + b[i][j]));
export const msub = (a: Mat, b: Mat): Mat => a.map((r, i) => r.map((x, j) => x - b[i][j]));
export const mscale = (a: Mat, s: number): Mat => a.map((r) => r.map((x) => x * s));
export const matVec = (m: Mat, v: Vec): Vec => m.map((r) => dot(r, v));
export function matMul(a: Mat, b: Mat): Mat {
  const n = a.length, k = b.length, p = b[0].length;
  if (a[0].length !== k) throw new Error('matMul: shape mismatch');
  const out: Mat = Array.from({ length: n }, () => new Array(p).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) {
    let s = 0;
    for (let t = 0; t < k; t++) s += a[i][t] * b[t][j];
    out[i][j] = s;
  }
  return out;
}
export const mlerp = (a: Mat, b: Mat, t: number): Mat => a.map((r, i) => r.map((x, j) => x + (b[i][j] - x) * t));
export const meq = (a: Mat, b: Mat, tol = 1e-6): boolean =>
  a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((x, j) => Math.abs(x - b[i][j]) <= tol));
export function mpow(a: Mat, k: number): Mat {
  let out = identity(a.length);
  for (let i = 0; i < k; i++) out = matMul(out, a);
  return out;
}

/** 2×2 rotation by theta radians (counter-clockwise). */
export const rot2 = (t: number): Mat => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];

/** Determinant by Gaussian elimination with partial pivoting (any n). */
export function det(m: Mat): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  if (n === 3) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
      - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
      + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  }
  const a = mclone(m);
  let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < EPS) return 0;
    if (p !== c) { [a[p], a[c]] = [a[c], a[p]]; d = -d; }
    d *= a[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return d;
}

/** Inverse by Gauss–Jordan; returns null when the matrix squashes space (det = 0). */
export function inverse(m: Mat): Mat | null {
  const n = m.length;
  const a = m.map((r, i) => [...r, ...identity(n)[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return null;
    [a[p], a[c]] = [a[c], a[p]];
    const pv = a[c][c];
    for (let k = 0; k < 2 * n; k++) a[c][k] /= pv;
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = a[r][c];
      if (f !== 0) for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((r) => r.slice(n));
}

/** Numeric reduced row echelon form. Returns the matrix and its pivot columns. */
export function rrefNum(m: Mat, tol = 1e-9): { R: Mat; pivots: number[] } {
  const a = mclone(m);
  const R = a.length, C = R ? a[0].length : 0;
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < C && r < R; c++) {
    let p = r;
    for (let i = r + 1; i < R; i++) if (Math.abs(a[i][c]) > Math.abs(a[p][c])) p = i;
    if (Math.abs(a[p][c]) < tol) continue;
    [a[p], a[r]] = [a[r], a[p]];
    const pv = a[r][c];
    for (let k = 0; k < C; k++) a[r][k] /= pv;
    for (let i = 0; i < R; i++) if (i !== r) {
      const f = a[i][c];
      if (Math.abs(f) > 0) for (let k = 0; k < C; k++) a[i][k] -= f * a[r][k];
    }
    pivots.push(c);
    r++;
  }
  for (const row of a) for (let k = 0; k < C; k++) if (Math.abs(row[k]) < tol) row[k] = 0;
  return { R: a, pivots };
}

export const rank = (m: Mat): number => rrefNum(m).pivots.length;

/** Basis for the null space (vectors x with Mx = 0). Empty when only x = 0 works. */
export function nullspace(m: Mat): Vec[] {
  const { R, pivots } = rrefNum(m);
  const C = cols(m);
  const free = [...Array(C).keys()].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    const x = zeros(C);
    x[f] = 1;
    pivots.forEach((pc, i) => { x[pc] = -R[i][f]; });
    return x;
  });
}

/** Basis for the column space: the pivot columns of the original matrix. */
export function colspace(m: Mat): Vec[] {
  return rrefNum(m).pivots.map((c) => col(m, c));
}

export type SolveResult =
  | { kind: 'unique'; x: Vec }
  | { kind: 'none' }
  | { kind: 'infinite'; particular: Vec; directions: Vec[] };

/** Solve Ax = b and classify: one solution, none, or infinitely many (particular + span of directions). */
export function solve(A: Mat, b: Vec): SolveResult {
  const aug = A.map((r, i) => [...r, b[i]]);
  const { R, pivots } = rrefNum(aug);
  const n = cols(A);
  if (pivots.includes(n)) return { kind: 'none' };
  const x = zeros(n);
  pivots.forEach((pc, i) => { x[pc] = R[i][n]; });
  if (pivots.length === n) return { kind: 'unique', x };
  return { kind: 'infinite', particular: x, directions: nullspace(A) };
}

// ---------- eigen ----------
export type Eig2 =
  | { kind: 'real'; values: [number, number]; vectors: [Vec | null, Vec | null] }
  | { kind: 'complex'; re: number; im: number };

/** Eigenvalues/vectors of a 2×2 matrix from det(A − λI) = λ² − (tr)λ + det = 0. */
export function eig2(m: Mat): Eig2 {
  const [[a, b], [c, d]] = m;
  const tr = a + d, dt = a * d - b * c;
  const disc = tr * tr - 4 * dt;
  if (disc < -1e-12) return { kind: 'complex', re: tr / 2, im: Math.sqrt(-disc) / 2 };
  const s = Math.sqrt(Math.max(0, disc));
  const l1 = (tr + s) / 2, l2 = (tr - s) / 2;
  const vecFor = (l: number): Vec | null => {
    const ns = nullspace([[a - l, b], [c, d - l]].map((r) => r.map((x) => (Math.abs(x) < 1e-9 ? 0 : x))));
    return ns.length ? normalize(ns[0]) : null;
  };
  return { kind: 'real', values: [l1, l2], vectors: [vecFor(l1), vecFor(l2)] };
}

/** Eigen-decomposition of a symmetric matrix (Jacobi rotations). Values sorted high → low; vectors are unit columns. */
export function eigSym(m: Mat): { values: number[]; vectors: Vec[] } {
  const n = m.length;
  const a = mclone(m);
  const v = identity(n);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-15) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const idx = [...Array(n).keys()].sort((i, j) => a[j][j] - a[i][i]);
  return { values: idx.map((i) => a[i][i]), vectors: idx.map((i) => col(v, i)) };
}

/** Real roots of the characteristic polynomial of a 3×3 matrix, each once (sorted high → low). */
export function eigvals3(m: Mat): number[] {
  return eigvals3Mult(m).map((r) => r.value);
}

/** Real eigenvalues of a 3×3 matrix with their algebraic multiplicities (sorted high → low). */
export function eigvals3Mult(m: Mat): { value: number; mult: number }[] {
  // det(λI − A) = λ³ − tr λ² + c2 λ − det
  const tr = m[0][0] + m[1][1] + m[2][2];
  const c2 = m[0][0] * m[1][1] - m[0][1] * m[1][0] + m[0][0] * m[2][2] - m[0][2] * m[2][0] + m[1][1] * m[2][2] - m[1][2] * m[2][1];
  return cubicRealRootsMult(1, -tr, c2, -det(m));
}

/** Real roots of a x³ + b x² + c x + d, each once (sorted high → low). */
export function cubicRealRoots(a: number, b: number, c: number, d: number): number[] {
  return cubicRealRootsMult(a, b, c, d).map((r) => r.value);
}

/**
 * Real roots of a x³ + b x² + c x + d with multiplicities (sorted high → low). Robust for repeated
 * roots: one real root by bisection (a cubic always crosses zero), the rest from the deflated
 * quadratic; roots that agree are merged and placed exactly (a double root is a root of f′, a triple
 * root is the root of f″).
 */
export function cubicRealRootsMult(a: number, b: number, c: number, d: number): { value: number; mult: number }[] {
  b /= a; c /= a; d /= a;
  const f = (x: number) => ((x + b) * x + c) * x + d;
  const f1 = (x: number) => (3 * x + 2 * b) * x + c;
  const newton = (x: number, g: (x: number) => number, dg: (x: number) => number) => {
    for (let i = 0; i < 40; i++) {
      const gp = dg(x);
      if (!Number.isFinite(gp) || Math.abs(gp) < 1e-300) break;
      const step = g(x) / gp;
      if (!Number.isFinite(step)) break;
      x -= step;
      if (Math.abs(step) <= 1e-15 * Math.max(1, Math.abs(x))) break;
    }
    return x;
  };
  // 1. a real root by bisection inside the Cauchy bound
  const B = 1 + Math.max(Math.abs(b), Math.abs(c), Math.abs(d));
  let lo = -B, hi = B;
  for (let i = 0; i < 200 && hi - lo > 0; i++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    if (f(mid) > 0) hi = mid; else lo = mid;
  }
  const r1 = (lo + hi) / 2;
  // 2. deflate: x³ + b x² + c x + d = (x − r1)(x² + p x + q)
  const p = b + r1, q = c + r1 * p;
  const disc = p * p - 4 * q;
  const scale = Math.max(1, p * p, Math.abs(q));
  const roots = [r1];
  if (disc > 1e-9 * scale) { const s = Math.sqrt(disc); roots.push((-p + s) / 2, (-p - s) / 2); }
  else if (disc > -1e-9 * scale) roots.push(-p / 2, -p / 2);
  // 3. merge roots that agree, then place each group exactly
  roots.sort((x, y) => y - x);
  const groups: number[][] = [];
  for (const x of roots) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[g.length - 1] - x) <= 1e-4 * Math.max(1, Math.abs(x))) g.push(x); else groups.push([x]);
  }
  const out = groups.map((g) => {
    const mean = g.reduce((s, x) => s + x, 0) / g.length;
    const value = g.length >= 3 ? -b / 3 : g.length === 2 ? newton(mean, f1, (x) => 6 * x + 2 * b) : newton(mean, f, f1);
    const v = Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value;
    return { value: v === 0 ? 0 : v, mult: g.length }; // never −0
  });
  return out.sort((x, y) => y.value - x.value);
}

/** Eigenvector for a known eigenvalue (a unit vector in the null space of A − λI), or null. */
export function eigvecFor(m: Mat, lambda: number): Vec | null {
  const n = m.length;
  const shifted = m.map((r, i) => r.map((x, j) => x - (i === j ? lambda : 0)));
  // Use a looser tolerance: λ is usually rounded.
  const { R, pivots } = rrefNum(shifted, 1e-7);
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  if (!free.length) return null;
  const x = zeros(n);
  x[free[0]] = 1;
  pivots.forEach((pc, i) => { x[pc] = -R[i][free[0]]; });
  return normalize(x);
}

/** Repeatedly apply A to x and rescale: x lines up with the eigenvector of the largest |λ|. */
export function powerIteration(m: Mat, x0: Vec, steps = 100): { vector: Vec; value: number } {
  let x = normalize(x0);
  let value = 0;
  for (let i = 0; i < steps; i++) {
    const y = matVec(m, x);
    value = dot(x, y);
    x = normalize(y);
  }
  return { vector: x, value };
}

// ---------- orthogonality ----------
/** Gram–Schmidt: orthonormal basis for the span of vs (dependent vectors are dropped). */
export function gramSchmidt(vs: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const v of vs) {
    let w = v.slice();
    for (const q of out) w = vsub(w, vscale(q, dot(w, q)));
    if (norm(w) > 1e-9) out.push(normalize(w));
  }
  return out;
}

/** QR factorisation from Gram–Schmidt on the columns (full column rank assumed). */
export function qr(m: Mat): { Q: Mat; R: Mat } {
  const qs = gramSchmidt(transpose(m));
  const Q = fromCols(qs);
  const R = matMul(transpose(Q), m);
  return { Q, R };
}

/** Least-squares solution of Ax ≈ b via the normal equations AᵀA x = Aᵀb. */
export function leastSquares(A: Mat, b: Vec): Vec | null {
  const At = transpose(A);
  const inv = inverse(matMul(At, A));
  return inv ? matVec(inv, matVec(At, b)) : null;
}

/** Projection of b onto the column space of A (A has independent columns). */
export function projectOntoCols(A: Mat, b: Vec): Vec | null {
  const x = leastSquares(A, b);
  return x ? matVec(A, x) : null;
}

// ---------- SVD ----------
/** SVD A = U Σ Vᵀ from the eigen-decomposition of AᵀA. Singular values sorted high → low. */
export function svd(A: Mat): { U: Mat; S: number[]; V: Mat } {
  const m = rows(A), n = cols(A);
  const { values, vectors } = eigSym(matMul(transpose(A), A));
  const S = values.map((x) => Math.sqrt(Math.max(0, x)));
  const us: Vec[] = [];
  vectors.forEach((v, i) => {
    if (S[i] > 1e-9) us.push(vscale(matVec(A, v), 1 / S[i]));
  });
  // complete U to an orthonormal basis of R^m
  const completed = gramSchmidt([...us, ...identity(m)]);
  const U = fromCols(completed.slice(0, m));
  const V = fromCols(vectors);
  return { U, S: S.slice(0, Math.min(m, n)), V };
}

/** Best rank-k approximation (keep the k largest singular values). */
export function lowRank(A: Mat, k: number): Mat {
  const { U, S, V } = svd(A);
  const m = rows(A), n = cols(A);
  const out: Mat = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let t = 0; t < Math.min(k, S.length); t++) {
    const u = col(U, t), v = col(V, t);
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) out[i][j] += S[t] * u[i] * v[j];
  }
  return out;
}

/** Principal directions of a point cloud (rows are points): centred covariance eigenvectors. */
export function pca(points: Vec[]): { mean: Vec; values: number[]; vectors: Vec[] } {
  const n = points.length, d = points[0].length;
  const mean = zeros(d);
  for (const p of points) p.forEach((x, i) => { mean[i] += x / n; });
  const C: Mat = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const p of points) {
    const c = vsub(p, mean);
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += (c[i] * c[j]) / n;
  }
  const { values, vectors } = eigSym(C);
  return { mean, values, vectors };
}

// ---------- change of basis ----------
/** Coordinates of v in the basis whose vectors are the columns of B (solves Bc = v). */
export function coordsIn(B: Mat, v: Vec): Vec | null {
  const inv = inverse(B);
  return inv ? matVec(inv, v) : null;
}

/** 2×2 matrix as a 4×4 THREE-style column-major array (for the grid shader / Object3D). */
export function mat2To4(m: Mat): number[] {
  return [m[0][0], m[1][0], 0, 0, m[0][1], m[1][1], 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
export function mat3To4(m: Mat): number[] {
  return [m[0][0], m[1][0], m[2][0], 0, m[0][1], m[1][1], m[2][1], 0, m[0][2], m[1][2], m[2][2], 0, 0, 0, 0, 1];
}

/**
 * In-between matrix for animating M0 → M1 (2×2). 'linear' moves every entry in a straight line
 * (every point travels straight to where it lands). 'polar' splits the change into a rotation and
 * a stretch and turns the rotation by angle, so a rotation never appears to shrink or collapse on
 * the way. 'auto' picks polar when the change includes a turn of more than 30°.
 */
export function interpMat2(M0: Mat, M1: Mat, t: number, mode: 'linear' | 'polar' | 'auto' = 'auto'): Mat {
  if (mode === 'linear' || M0.length !== 2) return mlerp(M0, M1, t);
  const inv0 = inverse(M0);
  if (!inv0) return mlerp(M0, M1, t);
  const P = matMul(M1, inv0); // the change, applied after M0
  const dP = det(P);
  if (dP <= 1e-9) return mlerp(M0, M1, t);
  const th = Math.atan2(P[1][0] - P[0][1], P[0][0] + P[1][1]);
  if (mode === 'auto' && Math.abs(th) < Math.PI / 6) return mlerp(M0, M1, t);
  const R = rot2(th);
  const S = matMul(transpose(R), P); // P = R S
  const St = mlerp(identity(2), S, t);
  return matMul(matMul(rot2(th * t), St), M0);
}
