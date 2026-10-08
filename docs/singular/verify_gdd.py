"""Numerical checks for every number planned for GDD.md. Run: python3 -I verify_gdd.py"""
import numpy as np
from numpy.linalg import det, inv, eig, eigh, svd, matrix_rank, solve, lstsq, norm
np.set_printoptions(precision=5, suppress=True)
ok = 0
def chk(label, got, want, tol=1e-6):
    global ok
    g = np.asarray(got, dtype=complex if np.iscomplexobj(got) else float)
    w = np.asarray(want, dtype=g.dtype)
    if g.shape != w.shape or not np.allclose(g, w, atol=tol):
        print('FAIL', label, 'got', got, 'want', want); raise SystemExit(1)
    ok += 1
def M(rows): return np.array(rows, dtype=float)
def cols(*cs): return np.array(cs, dtype=float).T

# ---------------- story truth: routine pulse
P2 = cols([1, 0], [1, 1]); R = cols([0, 1], [-1, 0])
T = P2 @ R @ inv(P2)
chk('T = P R P^-1', T, M([[1, -2], [1, -1]]))
chk('det T', det(T), 1); chk('trace T', np.trace(T), 0)
chk('T^4 = I', np.linalg.matrix_power(T, 4), np.eye(2))
chk('T^-1', inv(T), M([[-1, 2], [-1, 1]]))
chk('T^-1 = T^3', inv(T), np.linalg.matrix_power(T, 3))
ev = np.sort_complex(eig(T)[0]); chk('eig T = +-i', ev, np.array([-1j, 1j]))
chk('T e1', T @ [1, 0], [1, 1]); chk('T e2', T @ [0, 1], [-2, -1]); chk('T(3,2)', T @ [3, 2], [-1, 1])
# honest interpolation P R(th) P^-1 keeps det 1
for th in np.linspace(0, np.pi / 2, 7):
    Rt = M([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
    chk('det path', det(P2 @ Rt @ inv(P2)), 1)
# naive linear path dips
dips = min(det((1 - t) * np.eye(2) + t * T) for t in np.linspace(0, 1, 101))
chk('naive path min det 0.5', dips, 0.5)
P3 = M([[1, 1, 0], [0, 1, 0], [0, 0, 1]]); S3 = cols([0, 1, 0], [-1, 0, 0], [0, 0, 0.8])
T3 = P3 @ S3 @ inv(P3)
chk('T3', T3, cols([1, 1, 0], [-2, -1, 0], [0, 0, 0.8]))
chk('det S3 = det T3 = 0.8', [det(S3), det(T3)], [0.8, 0.8])
chk('spire forecast of bow (1,0,0)', S3 @ [1, 0, 0], [0, 1, 0]); chk('real bow', T3 @ [1, 0, 0], [1, 1, 0])
chk('three pulses 0.8^3', 0.8 ** 3, 0.512)
# what she meant: P^-1 R P
chk('P^-1 R P', inv(P2) @ R @ P2, M([[-1, -2], [1, 1]]))
chk('P (P^-1RP) P^-1 = R', P2 @ (inv(P2) @ R @ P2) @ inv(P2), R)
chk('anchor coords of ship (3,2)', solve(P2, [3, 2]), [1, 2]); chk('ship of anchor (2,-1)', P2 @ [2, -1], [1, -1])
PC = cols([1, 1], [-1, 1]); chk('B->C (2,1)', solve(PC, P2 @ [2, 1]), [2, -1])
chk('P3 coords of (2,3,4)', solve(P3, [2, 3, 4]), [-1, 3, 4])

# ---------------- collapse pulse
def Cmat(e): return cols([1, 0, 1], [0, 1, 1], [1, 1, e])
C2 = Cmat(2.0)
chk('rank C2', matrix_rank(C2), 2); chk('C2 (1,1,-1)', C2 @ [1, 1, -1], [0, 0, 0])
chk('C2 symmetric', C2, C2.T)
def brentq(f,a,b):
    fa=f(a)
    for _ in range(200):
        m=(a+b)/2; fm=f(m)
        if (fm>0)==(fa>0): a,fa=m,fm
        else: b=m
    return (a+b)/2
f = lambda d: svd(Cmat(2 + d), compute_uv=False)[-1] - 1 / 750
delta = brentq(f, 1e-4, 1e-2)
C = Cmat(2 + delta); s = svd(C, compute_uv=False)
print('delta for sigma_min = 1/750:', delta, ' sigmas', s, ' det', det(C), ' cond', s[0] / s[-1])
chk('fit entry rounds to 2.004', round(2 + delta, 3), 2.004)
chk('det rounds to 0.00', round(det(C), 2), 0.0)
chk('sigma2 = 1', s[1], 1, 1e-9)
chk('N = 625', int(np.ceil((0.01 * (1 / s[-1]) / 0.3) ** 2 - 1e-9)), 625)
chk('raw error 0.01*750 = 7.5', 0.01 / s[-1], 7.5, 1e-6)
chk('sqrt 750', np.sqrt(750), 27.386, 1e-3)
ev_C = np.sort(eigh(C)[0]); chk('C pos def, eig = sigmas', ev_C[::-1], s)
# pseudo-inverse of the exact model loses (1,1,-1) component
Cp = np.linalg.pinv(C2); x = np.array([0.3, -0.2, 0.9]); xr = Cp @ (C2 @ x)
chk('pinv kills null component', xr @ [1, 1, -1], 0)
# column space z = x + y; landing checks
for b, reach in [([1, 2, 3], True), ([1, 1, 1], False), ([0, 0, 0], True), ([2, -1, 1], True)]:
    chk('landing ' + str(b), abs(b[0] + b[1] - b[2]) < 1e-12, reach)
chk('C2(2,0,1)', C2 @ [2, 0, 1], [3, 1, 4]); chk('C2(3,1,0)', C2 @ [3, 1, 0], [3, 1, 4]); chk('C2(1,2,0)', C2 @ [1, 2, 0], [1, 2, 3])

# ---------------- Act I
chk('c01 debris', np.add([4, -1], [-1, 3]), [3, 2])
chk('c01 knocks', np.sum([[2, 5], [-3, 1], [4, -2]], axis=0), [3, 4]); chk('home length', norm([3, 4]), 5)
chk('Q-P', np.subtract([6, 1], [1, 4]), [5, -3]); chk('|Q-P|^2', 25 + 9, 34)
chk('t=0.25', np.add([1, 4], 0.25 * np.array([5, -3])), [2.25, 3.25]); chk('mid', np.add([1, 4], 0.5 * np.array([5, -3])), [3.5, 2.5])
chk('7,8', 2 * np.array([2, 1]) + 3 * np.array([1, 2]), [7, 8]); chk('|(2,3,6)|', norm([2, 3, 6]), 7)
v, w = np.array([2, 1]), np.array([1, 3])
chk('5,5', 2 * v + w, [5, 5]); chk('0,5', -v + 2 * w, [0, 5]); chk('4,7', solve(cols(v, w), [4, 7]), [1, 2])
chk('k=4 singular', det(cols([1, 2], [2, 4])), 0)
chk('2,3,5', 2 * np.array([1, 0, 1]) + 3 * np.array([0, 1, 1]), [2, 3, 5])
chk('(1,2,3)=v+2w', np.array([1, 0, 1]) + 2 * np.array([0, 1, 1]), [1, 2, 3])
chk('mount (1,1,1)', solve(cols([1, 0, 1], [0, 1, 1], [1, 1, 1]), [1, 1, 0]), [-1, -1, 2])
chk('mount (0,0,2)', solve(cols([1, 0, 1], [0, 1, 1], [0, 0, 2]), [1, 1, 0]), [1, 1, -1])
chk('(2,-1,1) in plane', det(cols([1, 0, 1], [0, 1, 1], [2, -1, 1])), 0)
chk('loop 2u+3v-w', 2 * np.array([1, 0, 2]) + 3 * np.array([0, 1, 1]) - np.array([2, 3, 7]), [0, 0, 0])

# ---------------- Act II
chk('c04 3*2+1*4', 3 * 2 + 1 * 4, 10); chk('(2,-1).(2,4)', np.dot([2, -1], [2, 4]), 0)
chk('angle 60', np.degrees(np.arccos(np.dot([1, 1, 0], [1, 0, 1]) / 2)), 60)
t_ = np.array([3, 4]); cand = {'a': [6, 8], 'b': [4, 3], 'c': [0, 20]}
chk('raw', [np.dot(t_, cand[k]) for k in 'abc'], [50, 24, 80])
chk('cos', [np.dot(t_, cand[k]) / norm(t_) / norm(cand[k]) for k in 'abc'], [1, 0.96, 0.8])
u = np.array([2, 1]); vv = np.array([3, 4]); sh = vv @ u / (u @ u) * u
chk('shadow', sh, [4, 2]); chk('gap perp', (vv - sh) @ u, 0)
chk('wrong shadow (divide once)', (vv @ u / norm(u)) * u, np.array([2, 1]) * 10 / np.sqrt(5))
chk('readings axis', [3, -1, 2], [3, -1, 2])
chk('cross (0,0,6)', np.cross([2, 0, 0], [1, 3, 0]), [0, 0, 6]); chk('w x v', np.cross([1, 3, 0], [2, 0, 0]), [0, 0, -6])
a5, b5 = np.array([1, 2, 0]), np.array([0, 1, 3]); n5 = np.cross(a5, b5)
chk('cross (6,-3,1)', n5, [6, -3, 1]); chk('|n|^2=46', n5 @ n5, 46); chk('lagrange', (a5 @ a5) * (b5 @ b5) - (a5 @ b5) ** 2, 46)
Pd, Qd, Rd = np.array([1, 0, 0]), np.array([0, 2, 0]), np.array([0, 0, 3]); nd = np.cross(Qd - Pd, Rd - Pd)
chk('door normal', nd, [6, 3, 2]); chk('|nd|', norm(nd), 7); chk('door area', norm(nd) / 2, 3.5)
chk('parallel struts', np.cross([2, 4, 6], [1, 2, 3]), [0, 0, 0])
chk('box 24', det(cols([2, 0, 0], [0, 3, 0], [0, 0, 4])), 24)
chk('lean 24', det(cols([2, 0, 0], [1, 3, 0], [1, 1, 4])), 24)
for tip in ([5, -2, 4], [-3, 7, 4], [0.5, 0.5, 4]): chk('slide 24', det(cols([2, 0, 0], [1, 3, 0], tip)), 24)
a6, b6 = np.array([2, 1, 0]), np.array([0, 1, 2])
chk('section C axb', np.cross(a6, b6), [2, -4, 2]); chk('flat', np.cross(a6, b6) @ [1, 1, 1], 0)
chk('k=4 vol 6', np.cross(a6, b6) @ [1, 1, 4], 6)
Pc, Qc, Rc, Sc = map(np.array, ([1, 0, 0], [2, 1, 0], [1, 1, 1], [2, 2, 1]))
chk('clamps coplanar', det(np.array([Qc - Pc, Rc - Pc, Sc - Pc])), 0)
chk('position-vector trap nonzero', det(np.array([Qc, Rc, Sc])), -1)
S2 = np.array([2, 2, 3]); chk('moved S triple', det(np.array([Qc - Pc, Rc - Pc, S2 - Pc])), 2); chk('tetra 1/3', 2 / 6, 1 / 3)
chk('tetra 4', det(cols([2, 0, 0], [0, 3, 0], [1, 1, 4])) / 6, 4)
chk('swap -24', det(cols([0, 3, 0], [2, 0, 0], [1, 1, 4])), -24)
chk('cross at (2,2,0)', 2 * np.array([1, 1, 0]), np.array([4, 0, 0]) + 2 * np.array([-1, 1, 0]))
n7 = np.cross([1, 0, 0], [0, 1, 0]); chk('skew dist 2', abs(np.array([0, 1, 2]) @ n7) / norm(n7), 2)
chk('door eq at corners', [nd @ p for p in (Pd, Qd, Rd)], [6, 6, 6])
tt = 6 / (nd @ [1, 2, 3]); chk('t=1/3', tt, 1 / 3); chk('hit centroid', tt * np.array([1, 2, 3]), (Pd + Qd + Rd) / 3)
chk('dist 27/7', abs(nd @ [3, 3, 3] - 6) / 7, 27 / 7)
d7 = np.cross(nd, [1, -1, 0]); chk('weld dir', d7, [2, 2, -9]); chk('R on both', [nd @ Rd, Rd @ [1, -1, 0]], [6, 0])

# ---------------- Act III
chk('pod', solve(M([[1, 1, 1], [0, 2, 5], [2, 5, -1]]), [6, -4, 27]), [5, 3, -2])
chk('2d', solve(M([[1, 1], [1, -1]]), [5, 1]), [3, 2])
A8 = M([[1, 1, 1], [1, -1, 0], [2, 0, 1]])
for tpar in (0, 1, 2.5): chk('line sol', A8 @ (np.array([0, -1, 4]) + tpar * np.array([1, 1, -2])), [3, 1, 4])
chk('rank A8', matrix_rank(A8), 2); chk('prism', matrix_rank(np.c_[A8, [3, 1, 5]]), 3)
A9 = M([[1, 2, 1], [2, 5, 4], [1, 3, 4]]); b9 = np.array([8, 24, 19.])
chk('gen', solve(A9, b9), [1, 2, 3])
chk('zero top', solve(M([[0, 2, 1], [1, 1, 1], [2, 1, 0]]), [5, 4, 4]), [1, 2, 1])
A10 = M([[1, -1, 0], [0, 1, -1], [1, 0, -1]])
for tpar in (0, 1, 2): chk('flows', A10 @ ([3 + tpar, 1 + tpar, tpar]), [2, 1, 3])
chk('flow rank', matrix_rank(np.c_[A10, [2, 1, 4]]), 3)
for s_, t2 in ((0, 0), (1, 2), (-1, 3)): chk('plane sol', np.array([1, 2, -1]) @ (np.array([4, 0, 0]) + s_ * np.array([-2, 1, 0]) + t2 * np.array([1, 0, 1])), 4)
def cls(Aug):
    A_ = Aug[:, :-1]; r = matrix_rank(A_); ra = matrix_rank(Aug)
    return 'none' if ra > r else ('one' if r == A_.shape[1] else 'many')
for k, m, want in ((4, 3, 'one'), (5, 3, 'many'), (5, 4, 'none')):
    chk('param3 %s' % want, cls(M([[1, 1, 1, 1], [1, 2, 3, 2], [1, 3, k, m]])) == want, True)
for k, rhs, want in ((3, 6, 'one'), (4, 6, 'many'), (4, 7, 'none')):
    chk('param2 %s' % want, cls(M([[1, 2, 3], [2, k, rhs]])) == want, True)
A10m = M([[1, 2, 1, 1], [2, 4, 0, 2], [1, 2, 2, 1]])
for x2, x4 in ((0, 0), (1, 1)):
    x = np.array([3 - 2 * x2 - x4, x2, 2, x4]); chk('3x4', A10m @ x, [5, 6, 7])

# ---------------- Act IV
chk('build pulse', cols([2, 1], [1, 2]) @ [1, 1], [3, 3]); chk('keeps', cols([2, 1], [1, 2]) @ [1, -1], [1, -1])
chk('2x3', M([[1, 0, 2], [0, 1, -1]]) @ [3, 1, 2], [7, -1]); chk('spires', cols([1, 0, 0], [1, 1, 0], [0, 1, 1]) @ [1, 1, 1], [2, 2, 1])
A12, B12 = M([[1, 1], [0, 1]]), M([[0, -1], [1, 0]])
chk('BA', B12 @ A12, M([[0, -1], [1, 1]])); chk('order', [B12 @ A12 @ [1, 0], A12 @ B12 @ [1, 0]], [[0, 1], [1, 1]])
chk('2x3*3x2', M([[1, 2, 0], [0, 1, 3]]) @ M([[1, 0], [2, 1], [0, 4]]), M([[5, 2], [2, 13]]))
B = M([[1, 2], [0, 1]]); rng = np.random.default_rng(1)
for _ in range(200):
    x, y = rng.normal(size=2), rng.normal(size=2); chk('transpose', (B @ x) @ y, x @ (M([[1, 0], [2, 1]]) @ y))
chk('AB=0', M([[0, 0], [0, 1]]) @ M([[1, 0], [0, 0]]), np.zeros((2, 2)))
A13 = M([[2, 1], [1, 1]]); chk('inv cols', [A13 @ [1, -1], A13 @ [-1, 2]], [[1, 0], [0, 1]])
chk('3x3 inv', inv(M([[1, 1, 0], [0, 1, 1], [1, 0, 1]])), 0.5 * M([[1, -1, 1], [1, 1, -1], [-1, 1, 1]]))
chk('same spot', [M([[1, 2], [2, 4]]) @ [2, 0], M([[1, 2], [2, 4]]) @ [0, 1]], [[2, 4], [2, 4]])
chk('area 6', det(M([[3, 1], [0, 2]])), 6); chk('area 1', det(A13), 1); chk('bbox', 12 - 3 - 2 - 2, det(cols([3, 1], [1, 2])))
chk('det(kA)', det(2 * A13), 4); chk('det(kA) 3d', det(2 * np.eye(3)), 8)
A14 = M([[0, 2, 1], [1, 1, 1], [2, 1, 0]]); chk('det 3', det(A14), 3)
A44 = M([[1, 2, 0, 3], [0, 1, 0, 0], [2, 0, 1, 1], [1, 1, 0, 2]])
print('det 4x4', det(A44), ' minor', det(M([[1, 0, 3], [2, 1, 1], [1, 0, 2]])))
chk('k flatten', det(M([[2, 4], [3, 6]])), 0)
chk('3x3 cofactor of C', det(M([[2, 1, 0], [1, 3, 1], [0, 1, 2]])), 2 * (6 - 1) - 1 * (2 - 0))

# ---------------- Act V
A16 = M([[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]])
chk('rank 2', matrix_rank(A16), 2); chk('null1', A16 @ [-2, 1, 0, 0], 0 * np.ones(3)); chk('null2', A16 @ [-1, 0, -2, 1], 0 * np.ones(3))
chk('rref cols differ', matrix_rank(np.c_[np.array([[1, 0, 0], [0, 1, 0]]).T, [1, 2, 3]]), 3)
Mv = M([[1, 2, 3], [2, 4, 6], [1, 1, 1]]); chk('rank Mv', matrix_rank(Mv), 2)
chk('nul Mv', Mv @ [1, -2, 1], [0, 0, 0]); chk('row normal', np.cross([1, 2, 3], [1, 1, 1]), [-1, 2, -1])
chk('left nul', Mv.T @ [2, -1, 0], [0, 0, 0])
D = M([[0, 1, 0], [0, 0, 2], [0, 0, 0]]); p = np.array([5, -3, 2])  # 5 - 3t + 2t^2 -> -3 + 4t
chk('derivative matrix', D @ p, [-3, 4, 0]); chk('rank D', matrix_rank(D), 2); chk('D const', D @ [1, 0, 0], [0, 0, 0])
chk('poly basis det', det(cols([1, 1, 0], [0, 1, 1], [1, 0, 1])), 2)

# ---------------- Act VII
for vec, lam in (([1, 1], 3), ([1, -1], 1)): chk('eig 2112', cols([2, 1], [1, 2]) @ vec, lam * np.array(vec))
A18 = M([[4, 1], [2, 3]]); chk('char', np.sort(eig(A18)[0].real), [2, 5]); chk('v5', A18 @ [1, 1], [5, 5]); chk('v2', A18 @ [1, -2], [2, -4])
Dz = M([[1, -1], [1, 1]]); ez = eig(Dz)[0]; chk('1+-i', np.sort_complex(ez), np.array([1 - 1j, 1 + 1j]))
chk('|l|', abs(ez[0]), np.sqrt(2)); chk('arg', abs(np.degrees(np.angle(ez[0]))), 45); chk('turn+stretch', np.sqrt(2) * M([[np.cos(np.pi / 4), -np.sin(np.pi / 4)], [np.sin(np.pi / 4), np.cos(np.pi / 4)]]), Dz)
A33 = M([[2, 0, 0], [0, 3, 4], [0, 4, -3]])
for vec, lam in (([1, 0, 0], 2), ([0, 2, 1], 5), ([0, 1, -2], -5)): chk('3x3 eig', A33 @ vec, lam * np.array(vec))
chk('trace', 2 + 5 - 5, np.trace(A33)); chk('det', 2 * 5 * -5, det(A33))
V = M([[0.75, 0.25], [0.25, 0.75]]); chk('V^50 (3,1)', np.linalg.matrix_power(V, 50) @ [3, 1], [2, 2])
chk('A^10', np.linalg.matrix_power(M([[3, 1], [0, 2]]), 10) @ [1, 1], [117074, 1024])
V3 = M([[37, 7, 16], [7, 37, 16], [16, 16, 28]]) / 60
for vec, lam in (([1, 1, 1], 1), ([1, -1, 0], 0.5), ([1, 1, -2], 0.2)): chk('V3', V3 @ vec, lam * np.array(vec))
chk('cutter', np.linalg.matrix_power(V3, 50) @ [4, 2, 0], [2, 2, 2]); chk('det V3', det(V3), 0.1)
fib = np.linalg.matrix_power(np.array([[1, 1], [1, 0]], dtype=object), 50); chk('F50', fib[0][1], 12586269025)
Pm = cols([0.8, 0.1, 0.1], [0.2, 0.7, 0.1], [0.2, 0.2, 0.6])
chk('hour1', Pm @ [300, 0, 0], [240, 30, 30]); chk('hour2', Pm @ Pm @ [300, 0, 0], [204, 51, 45])
def steady(P):
    w_, V_ = eig(P); q = V_[:, np.argmin(abs(w_ - 1))].real; return q / q.sum()
chk('steady', 300 * steady(Pm), [150, 90, 60]); chk('from stern', np.linalg.matrix_power(Pm, 200) @ [0, 0, 300], [150, 90, 60], 1e-6)
def stern(stay):
    l = (1 - stay) / 2; return 300 * steady(cols([0.8, 0.1, 0.1], [0.2, 0.7, 0.1], [l, l, stay]))
chk('design 80', stern(0.8), [125, 75, 100]); print('stern 0.79 ->', stern(0.79))
chk('0.79 below', stern(0.79)[2] < 100, True)
eigP = np.sort(abs(eig(Pm)[0])); print('Pm eigen moduli', eigP)
G = np.zeros((4, 4)); links = {'A': 'BC', 'B': 'C', 'C': 'A', 'D': 'C'}; idx = 'ABCD'
for s_, ts in links.items():
    for t_ in ts: G[idx.index(t_), idx.index(s_)] = 1 / len(ts)
Gm = 0.85 * G + 0.15 / 4; pr = steady(Gm); print('pagerank A,B,C,D', pr)
chk('pr', np.round(pr, 3), [0.373, 0.196, 0.394, 0.038])
x = np.ones(4) / 4; it = 0
while True:
    nx = Gm @ x; it += 1
    if np.max(abs(nx - x)) < 1e-3: break
    x = nx
print('power iteration steps to 1e-3 change:', it)
chk('two-site', 3 * steady(M([[0.9, 0.2], [0.1, 0.8]])), [2, 1])

# ---------------- Act VIII
a, b = np.array([1, 2]), np.array([3, 1]); chk('onto line', (b @ a) / (a @ a) * a, [1, 2]); chk('left perp', (b - a) @ a, 0)
A2 = cols([1, 0, 1], [0, 1, 1]); h = np.array([1, 1, 0]); xh = solve(A2.T @ A2, A2.T @ h); ph = A2 @ xh
chk('hatch proj', ph, [1 / 3, 1 / 3, 2 / 3]); chk('hatch dist', norm(h - ph), 2 / np.sqrt(3)); print('hatch dist', norm(h - ph))
chk('straight up dist', norm(h - np.array([1, 1, 2])), 2)
u1, u2, bb = np.array([1, 1, 0]), np.array([0, 0, 1]), np.array([3, 1, 2])
p_ = (bb @ u1) / (u1 @ u1) * u1 + (bb @ u2) / (u2 @ u2) * u2; chk('orth sum', p_, [2, 2, 2])
s1, s2, b3 = np.array([1, 0, 0]), np.array([1, 1, 0]), np.array([2, 3, 4])
wrong = (b3 @ s1) / (s1 @ s1) * s1 + (b3 @ s2) / (s2 @ s2) * s2; chk('trap', wrong, [4.5, 2.5, 0])
A5 = cols([1, 1, 0], [0, 1, 1]); x5 = solve(A5.T @ A5, A5.T @ [1, 2, 3]); chk('AtA', A5.T @ A5, M([[2, 1], [1, 2]]))
chk('xhat', x5, [1 / 3, 7 / 3]); chk('proj', A5 @ x5, [1 / 3, 8 / 3, 7 / 3]); chk('err', np.array([1, 2, 3]) - A5 @ x5, [2 / 3, -2 / 3, 2 / 3])
dd = np.array([0.6, 0.8]); sv = np.array([4, 3]); chk('split', [(sv @ dd) * dd, sv - (sv @ dd) * dd], [[2.88, 3.84], [1.12, -0.84]])
Pl = M([[1, 2], [2, 4]]) / 5; chk('P^2=P', Pl @ Pl, Pl); chk('det P', det(Pl), 0)
b1, b2 = np.array([3, 4.]), np.array([2, 1.]); q1 = b1 / 5; r2 = b2 - (b2 @ q1) * q1; chk('gs2', r2, [0.8, -0.6]); chk('unit', norm(r2), 1)
Q, _ = np.linalg.qr(cols([1, 1, 0], [1, 0, 1], [0, 1, 1]))
for i, want in enumerate(([1, 1, 0], [1, -1, 2], [-1, 1, 1])):
    wv = np.array(want) / norm(want); chk('gs3 %d' % i, abs(Q[:, i] @ wv), 1)
q1_, q2_ = np.array([0.6, 0.8]), np.array([-0.8, 0.6]); chk('decode', [q1_ @ [5, 5], q2_ @ [5, 5]], [7, -1])
for Mx, keep in ((M([[0.6, -0.8], [0.8, 0.6]]), True), (M([[1, 0], [0, -1]]), True), (M([[1, 1], [0, 1]]), False), (M([[2, 0], [0, 0.5]]), False), (M([[0, 1], [1, 0]]), True), (M([[1, 1], [-1, 1]]), False)):
    chk('orthogonal?', np.allclose(Mx.T @ Mx, np.eye(2)), keep)
def fitline(ts, ys):
    A_ = np.c_[np.ones(len(ts)), ts]; return lstsq(A_, ys, rcond=None)[0]
chk('4pt', fitline([0, 1, 2, 3], [1, 2, 2, 4]), [0.9, 0.9]); chk('3pt', fitline([0, 1, 2], [1, 2, 2]), [7 / 6, 0.5])
c3 = fitline([0, 1, 2], [1, 2, 4]); chk('3pt b', c3, [5 / 6, 1.5]); pr3 = np.c_[np.ones(3), [0, 1, 2]] @ c3
chk('p', pr3, [5 / 6, 7 / 3, 23 / 6]); chk('res', np.array([1, 2, 4]) - pr3, [1 / 6, -1 / 3, 1 / 6])
t5, y5 = np.array([0, 1, 2, 3, 4]), np.array([1, 3, 2, 5, 4]); c5 = fitline(t5, y5); print('5pt fit', c5)
A5n = np.c_[np.ones(5), t5]; print('5pt AtA', A5n.T @ A5n, 'Atb', A5n.T @ y5, 'SSR', np.sum((y5 - A5n @ c5) ** 2))
to = np.arange(6.); ho = np.array([412.0, 410.9, 410.1, 408.8, 408.1, 406.9]); co = fitline(to, ho); print('orbit fit', co, 'cross 380 at', (380 - co[0]) / co[1])
poly = np.polyfit(to, ho, 5); print('deg5 at 10:', np.polyval(poly, 10))

# ---------------- Act IX
for vec, lam in (([1, 1], 4), ([1, -1], 2)): chk('stress', M([[3, 1], [1, 3]]) @ vec, lam * np.array(vec))
chk('not perp', np.dot([1, 1], [1, -2]), -1)
th = np.pi / 4; Rq = M([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]]); chk('no cross term', Rq.T @ M([[2, 1], [1, 2]]) @ Rq, M([[3, 0], [0, 1]]))
chk('saddle', np.sort(eigh(M([[1, 2], [2, 1]]))[0]), [-1, 3])
S24 = M([[2, 1, 1], [1, 2, 1], [1, 1, 2]]); chk('S24 eig', np.sort(eigh(S24)[0]), [1, 1, 4])
Qs = cols(np.array([1, 1, 1]) / np.sqrt(3), np.array([1, -1, 0]) / np.sqrt(2), np.array([1, 1, -2]) / np.sqrt(6))
chk('QDQt', Qs @ np.diag([4, 1, 1]) @ Qs.T, S24); chk('Q orth', Qs.T @ Qs, np.eye(3))
chk('form 3x2+4xy+3y2', np.sort(eigh(M([[3, 2], [2, 3]]))[0]), [1, 5])
uc = np.array([np.cos(np.linspace(0, 2 * np.pi, 3601)), np.sin(np.linspace(0, 2 * np.pi, 3601))]); vals = np.einsum('in,ij,jn->n', uc, M([[2, 1], [1, 2]]), uc)
chk('max 3 min 1', [vals.max(), vals.min()], [3, 1], 1e-5)
I_ = M([[4, -2, 0], [-2, 4, 0], [0, 0, 9]])
for vec, lam in (([1, 1, 0], 2), ([1, -1, 0], 6), ([0, 0, 1], 9)): chk('inertia', I_ @ vec, lam * np.array(vec))
C25 = M([[3, 0], [4, 5]]); chk('C25 sv', svd(C25, compute_uv=False), [np.sqrt(45), np.sqrt(5)]); chk('prod', np.sqrt(45) * np.sqrt(5), 15)
chk('CtC', C25.T @ C25, M([[25, 20], [20, 25]])); chk('C(1,1)', C25 @ [1, 1], [3, 9]); chk('C(1,-1)', C25 @ [1, -1], [3, -1])
chk('C eig', np.sort(eig(C25)[0].real), [3, 5])
A3x2 = M([[1, 1], [0, 1], [1, 0]]); chk('AtA old friend', A3x2.T @ A3x2, M([[2, 1], [1, 2]])); chk('sv', svd(A3x2, compute_uv=False), [np.sqrt(3), 1])
chk('u1', A3x2 @ (np.array([1, 1]) / np.sqrt(2)) / np.sqrt(3), np.array([2, 1, 1]) / np.sqrt(6)); chk('u2', A3x2 @ (np.array([1, -1]) / np.sqrt(2)), np.array([0, -1, 1]) / np.sqrt(2))
U_, s_, Vt_ = svd(C25); chk('rank1 err', norm(C25 - s_[0] * np.outer(U_[:, 0], Vt_[0]), 2), np.sqrt(5))
sv12 = np.array([9.0, 7.0, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2]); fr = np.cumsum(sv12 ** 2) / np.sum(sv12 ** 2); print('explained', fr[:3])
chk('k=2 96.4%', round(fr[1] * 100, 1), 96.4)
Cv = M([[4, 2], [2, 3]]); lv = eigh(Cv)[0]; chk('79%', round(lv.max() / lv.sum() * 100), 79); print('Cv top', lv.max())
# by-hand PCA data
X = M([[1, 2], [3, 3], [5, 6], [7, 9]]); Xc = X - X.mean(0); Cx = Xc.T @ Xc / 3; print('pca data mean', X.mean(0), 'cov', Cx, 'eig', eigh(Cx))
# Pythagoras readouts constant
rng = np.random.default_rng(7); cloud = rng.normal(size=(200, 2)) @ M([[2, 0], [0, 0.6]]); cloud -= cloud.mean(0)
for ang in np.linspace(0, np.pi, 7):
    d_ = np.array([np.cos(ang), np.sin(ang)]); spread = np.sum((cloud @ d_) ** 2); perp = np.sum(norm(cloud - np.outer(cloud @ d_, d_), axis=1) ** 2)
    chk('pythag', spread + perp, np.sum(cloud ** 2))
# ReLU finale bound
Wr = M([[1, 0], [-1, 0], [0, 1], [0, -1]])
for r_ in (1.0, 2.0, 3.0):
    for ang in np.linspace(0, 2 * np.pi, 361):
        p0 = r_ * np.array([np.cos(ang), np.sin(ang)]); sm = np.maximum(Wr @ p0, 0).sum()
        if r_ == 1.0: assert sm <= np.sqrt(2) + 1e-9
        else: assert sm >= r_ - 1e-9
ok += 1
# identity in any grid
chk('P I P^-1 = I', P3 @ np.eye(3) @ inv(P3), np.eye(3))
print('ALL OK', ok, 'checks')

# ---------------- extra: by-hand PCA, Teo callbacks
X = M([[6, 6], [2, 4], [5, 7], [3, 3]]); chk('pca mean', X.mean(0), [4, 5]); Xc = X - X.mean(0)
chk('centred', Xc, M([[2, 1], [-2, -1], [1, 2], [-1, -2]])); Cx = Xc.T @ Xc / 3
chk('cov', Cx, M([[10, 8], [8, 10]]) / 3); chk('cov eig', np.sort(eigh(Cx)[0]), [2 / 3, 6]); chk('explained 90', 6 / (20 / 3), 0.9)
chk('pc1 scores', Xc @ (np.array([1, 1]) / np.sqrt(2)), np.array([3, -3, 3, -3]) / np.sqrt(2))
Nn, Aa, Bb, Cc = map(np.array, ([2, 1, 1], [3, 2, 1], [2, 2, 2], [3, 3, 2]))
chk('teo struts flat', det(np.array([Aa - Nn, Bb - Nn, Cc - Nn])), 0); chk('teo position trap', det(np.array([Aa, Bb, Cc])), -2)
chk('teo anchor coords', solve(P2, [4, 3]), [1, 3]); chk('teo wrong way', P2 @ [4, 3], [7, 3])
chk('rot30', M([[np.cos(np.pi/6), -np.sin(np.pi/6)], [np.sin(np.pi/6), np.cos(np.pi/6)]]) @ [1, 0], [0.8660254, 0.5])
print('EXTRA OK', ok)

# ---------------- extra 2: spires at the Collapse, unfold settings, Ch 7 extras
Sc = inv(P3) @ C @ P3; chk('TT21 spires', Sc, cols([1, 0, 1], [0, 1, 2], [0, 1, 2 + delta])); chk('det Sc', det(Sc), det(C))
chk('Sc2 equal cols', (inv(P3) @ C2 @ P3)[:, 1], (inv(P3) @ C2 @ P3)[:, 2])
R3 = cols([0, 1, 0], [-1, 0, 0], [0, 0, 1]); Ct = R3 @ C @ inv(R3)
chk('RCR^-1 same sv', svd(Ct, compute_uv=False), svd(C, compute_uv=False))
Sp = inv(P3) @ R3 @ inv(C) @ inv(R3) @ P3; chk('unfold settings undo', Sp @ (inv(P3) @ Ct @ P3), np.eye(3))
chk('spire lengths', np.round(norm(Sp, axis=0)), [613, 1, 612])
w_, Q_ = eigh(C); H = Q_ @ np.diag(w_ ** -0.5) @ Q_.T; chk('half pulses', H @ H, inv(C)); chk('half stretch', svd(H, compute_uv=False)[0], np.sqrt(750), 1e-3)
chk('ark swing', R3 @ [3, 1, 0], [-1, 3, 0])
orbit = [np.array([3., 1.])]
for _ in range(4): orbit.append(T @ orbit[-1])
chk('wrong-grid orbit', np.array(orbit), [[3, 1], [1, 2], [-3, -1], [-1, -2], [3, 1]])
chk('angle planes', np.degrees(np.arccos(nd @ [1, -1, 0] / 7 / np.sqrt(2))), 72.3594, 1e-3)
chk('point-line', norm(np.cross([3, 3, 3], [1, 2, 3])) / norm([1, 2, 3]), np.sqrt(27 / 7))
chk('prologue line buoys', [T @ [-1, 1], T @ [0, 2], T @ [1, 3]], [[-3, -2], [-4, -2], [-5, -2]])
chk('prologue even buoys', [T @ [k, 0] for k in (2, 3, 4, 5)], [[2, 2], [3, 3], [4, 4], [5, 5]])
chk('A^4 3x3', np.linalg.matrix_power(A33, 4), np.diag([16, 625, 625]))
print('EXTRA2 OK', ok)
