"""Cutter: Director Vell's Survey Authority enforcement cutter (~9 units, nose along +X, Z up).

A long, low, faceted dagger hull (chamfered diamond section, knife-edge chine with a pale-cyan
seam light, pale Authority registry band behind the prow), a raised bridge blister with a thin
cool-white visor slit on a narrow dorsal spine, two swept blade wings low at the stern with
down-canted tip fins and white running lights, three engine bells in a recessed stern bay.
Dark gunmetal and slate, clean panels, hard facets.

  <blender-python> tools/singular/blender/cutter.py [--render preview.png]

Nodes the game can use: cutter (root) > hull, bridge, engine_1..3 (1 centre, 2 port +Y,
3 starboard -Y; each with nozzle_1..3 at the bell exit, exhaust along -X), light_l (+Y wing tip),
light_r (-Y wing tip).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Pal, Part, V  # noqa: E402
import bmesh  # noqa: E402

AX = (1, 0, 0)

# hull key stations: x, chine half-width w, chine z, deck ridge z, keel depth below the chine
KEY = [
    (4.5, 0.02, -0.07, -0.05, 0.02),
    (3.3, 0.40, -0.05, 0.12, 0.13),
    (1.7, 0.76, -0.02, 0.29, 0.24),
    (0.0, 0.97, 0.00, 0.37, 0.29),
    (-2.2, 1.06, 0.00, 0.41, 0.31),
    (-3.7, 1.02, 0.00, 0.40, 0.30),
    (-4.15, 0.88, 0.00, 0.34, 0.25),
]
# panel stations (dims are piecewise linear between key stations, so the facets stay planar)
STATIONS = [4.5, 4.2, 3.75, 3.3, 2.85, 2.34, 2.22, 2.04, 1.98, 1.5, 1.0, 0.5, 0.0, -0.75, -1.5, -2.2, -2.95, -3.7, -4.15]
LIVERY = ((2.22, 2.34), (1.98, 2.04))   # the pale Authority registry bands
SEAM = (-3.55, 3.5)        # x range of the pale-cyan chine seam light
STERN = -4.15
BAY = 0.09                 # depth of the recessed engine bay


def dims(x):
    for a, b in zip(KEY, KEY[1:]):
        if b[0] <= x <= a[0]:
            t = (a[0] - x) / (a[0] - b[0])
            return tuple(p + (q - p) * t for p, q in zip(a[1:], b[1:]))
    return KEY[-1][1:] if x < KEY[-1][0] else KEY[0][1:]


def upper_pts(x):
    """Corners of the upper half (one side): ridge, deck crease, shoulder, chine (y, z)."""
    w, zc, ht, hb = dims(x)
    return [V((0.07 * w, ht)), V((0.36 * w, ht - 0.06 * (ht - zc))), V((0.7 * w, zc + 0.6 * (ht - zc))), V((w, zc))]


def section(x):
    """22-point chamfered diamond section. Edge i runs pts[i] -> pts[i+1] (see FACETS)."""
    w, zc, ht, hb = dims(x)
    k = min(1.0, w / 0.5)
    zb = zc - hb
    c = 0.024 * k
    band = 0.05 * k
    R, D, S1, _ = upper_pts(x)
    C1, C2 = V((w, zc + band / 2)), V((w, zc - band / 2))
    S2 = V((0.64 * w, zc - 0.6 * hb))
    K = V((0.3 * w, zb))

    def ch(p, a, b):
        return [p + (a - p).normalized() * c, p + (b - p).normalized() * c]
    right = [R] + ch(D, R, S1) + ch(S1, D, C1) + [C1, C2] + ch(S2, C2, K) + ch(K, S2, V((-K.x, K.y)))
    left = [V((-p.x, p.y)) for p in reversed(right)]
    return [V((x, p.x, p.y)) for p in right + left]


# what each section edge is; edge i mirrors edge (20 - i) % 22
FACETS = ['deck', 'cham', 'deck2', 'cham', 'upper', 'band', 'lflank', 'cham', 'lower', 'cham', 'bottom',
          'cham', 'lower', 'cham', 'lflank', 'band', 'upper', 'cham', 'deck2', 'cham', 'deck', 'ridge']


def deck_z(x, y):
    """Height of the hull's upper surface at (x, |y|) (on the deck / upper flank facets)."""
    pts = upper_pts(x)
    y = abs(y)
    for a, b in zip(pts, pts[1:]):
        if y <= b.x:
            return a.y + (b.y - a.y) * (y - a.x) / (b.x - a.x)
    return pts[-1].y


class Mats:
    def __init__(self):
        self.slate = kit.mat('cutter_slate', (0.08, 0.088, 0.102), metal=0.6, rough=0.3)
        self.slate2 = kit.mat('cutter_slate_dark', (0.046, 0.05, 0.06), metal=0.65, rough=0.3)
        self.under = kit.mat('cutter_gunmetal', (0.045, 0.047, 0.054), metal=0.8, rough=0.33)
        self.gun = Pal.gunmetal()
        self.trim = kit.mat('cutter_trim', (0.2, 0.21, 0.225), metal=0.9, rough=0.22)
        self.dark = Pal.dark()
        self.livery = kit.mat('cutter_livery', (0.3, 0.31, 0.32), metal=0.1, rough=0.42)
        self.steel = Pal.steel()
        self.glass = Pal.glass()
        self.seam = kit.emis('emit_seam', kit.PALE_CYAN, 1.0)
        self.visor = kit.emis('emit_visor', kit.COOL_WHITE, 1.3)
        self.running = kit.emis('emit_running', kit.COOL_WHITE, 2.2)


def panel_runs(P, cols, tones, groove, mirror):
    """Group each facet column's faces into panels 1-3 stations long (mirrored port/starboard),
    inset each group as one region (a thin groove around it) and give it a tone."""
    plans = {}
    for col, items in sorted(cols.items()):
        key = min(col, mirror(col))
        items.sort(key=lambda t: t[0])
        if key not in plans:
            plans[key] = [kit.random.choice((1, 2, 2, 3)) for _ in range(len(items))], [kit.random.random() for _ in range(len(items))]
        sizes, picks = plans[key]
        runs, cur, k = [], [], 0
        for si, f in items:
            if cur and (si != cur[-1][0] + 1 or len(cur) >= sizes[k]):
                runs.append(cur)
                cur, k = [], k + 1
            cur.append((si, f))
        if cur:
            runs.append(cur)
        for r_i, run in enumerate(runs):
            faces = [f for _, f in run]
            if sum(f.calc_area() for f in faces) > 0.03:
                r = bmesh.ops.inset_region(P.bm, faces=faces, thickness=0.008, depth=-0.0035, use_even_offset=True)
                P._set(r['faces'], groove)
            P._set(faces, tones(picks[r_i % len(picks)]))


def hull(P, m):
    rings = [section(x) for x in STATIONS]
    n = len(rings[0])
    faces, _ = P.loft(rings, m.slate)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    side, nose_cap, stern_cap = faces[:-2], faces[-2], faces[-1]
    P._set([nose_cap], m.trim)
    upper, lower, band_on = {}, {}, []
    for idx, f in enumerate(side):
        col, si = idx % n, idx // n
        kind = FACETS[col]
        xm = (STATIONS[si] + STATIONS[si + 1]) / 2
        if kind == 'band':
            if SEAM[0] < xm < SEAM[1]:
                band_on.append(f)
            else:
                P._set([f], m.dark)
        elif kind in ('cham', 'ridge'):
            P._set([f], m.trim)
        elif any(a < xm < b for a, b in LIVERY) and kind in ('deck', 'deck2', 'upper'):
            P._set([f], m.livery)
        elif kind in ('deck', 'deck2', 'upper'):
            upper.setdefault(col, []).append((si, f))
        else:
            lower.setdefault(col, []).append((si, f))
    # the seam light: a recessed pale-cyan strip in the chine band
    for s in (1, -1):
        band = [f for f in band_on if f.calc_center_median().y * s > 0]
        r = bmesh.ops.inset_region(P.bm, faces=band, thickness=0.011, depth=-0.006, use_even_offset=True)
        P._set(r['faces'], m.dark)
        P._set(band, m.seam)
    mirror = lambda c: (20 - c) % n  # noqa: E731
    panel_runs(P, upper, lambda r: m.slate2 if r < 0.12 else m.slate, m.dark, mirror)
    panel_runs(P, lower, lambda r: m.slate2 if r < 0.12 else m.under, m.dark, mirror)
    # stern: a gunmetal rim and a recessed dark engine bay
    r = bmesh.ops.inset_region(P.bm, faces=[stern_cap], thickness=0.07, depth=0.0, use_even_offset=True)
    P._set(r['faces'], m.gun)
    r = bmesh.ops.inset_region(P.bm, faces=[stern_cap], thickness=0.02, depth=-BAY, use_even_offset=True)
    P._set(r['faces'], m.gun)
    P._set([stern_cap], m.dark)


SPINE = [(0.4, 0.17, 0.6), (-0.4, 0.17, 0.6), (-1.2, 0.166, 0.595), (-2.0, 0.16, 0.585),
         (-2.8, 0.15, 0.565), (-3.5, 0.12, 0.52), (-4.1, 0.08, 0.45), (-4.34, 0.035, 0.425)]


def spine_top(x):
    for a, b in zip(SPINE, SPINE[1:]):
        if b[0] <= x <= a[0]:
            t = (a[0] - x) / (a[0] - b[0])
            return a[2] + (b[2] - a[2]) * t, a[1] + (b[1] - a[1]) * t
    return SPINE[0][2], SPINE[0][1]


def spine(P, m):
    """Narrow dorsal spine from the bridge to a blade tail over the engines, its base buried in the deck."""
    rings = []
    for x, ws, zt in SPINE:
        zb = dims(x)[2] - 0.12 if x > STERN + 0.05 else 0.33
        half = [(ws, zb), (ws * 0.86, zt - 0.045), (ws * 0.55, zt)]
        pts = half + [(-y, z) for y, z in reversed(half)]
        rings.append([V((x, y, z)) for y, z in pts])
    faces, _ = P.loft(rings, m.slate)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    n = 6
    for idx, f in enumerate(faces[:-2]):
        e = idx % n
        if e in (1, 3):
            P._set([f], m.trim)
        elif e == 2:
            P._set([f], m.slate2)
    P._set(faces[-2:], m.gun)
    # heat louvres along the spine flanks
    for s in (1, -1):
        for k in range(9):
            x = -1.05 - k * 0.17
            zt, ws = spine_top(x)
            P.box((0.09, 0.012, 0.085), M((x, s * (ws - 0.004), zt - 0.1), rot=(s * 0.12, 0, 0)), m.dark)
    # a thin pale stripe along the spine top (the Authority line) and a small blade antenna
    for (x0, _, z0), (x1, _, z1) in zip(SPINE[1:4], SPINE[2:5]):
        P.beam((x0, 0, z0 + 0.003), (x1, 0, z1 + 0.003), 0.034, m.livery, h=0.008)
    # local x of this frame is world -x: the blade sweeps back
    P.prism([(0, 0), (0.45, 0), (0.55, 0.17), (0.44, 0.17)], 0.016, M((-0.5, 0, 0.59), z=(0, 1, 0), up=(0, 0, 1)), m.gun)


def blister_plan(z):
    """Plan polygon of the bridge blister at height z: tip, shoulder, mid, rear-mid, back, back centre."""
    z0, z1 = 0.22, 0.72
    t = (z - z0) / (z1 - z0)
    A = [(2.0, 0.0), (1.4, 0.31), (0.95, 0.33), (0.35, 0.33), (-0.1, 0.3), (-0.3, 0.0)]
    B = [(1.32, 0.0), (1.02, 0.19), (0.8, 0.21), (0.35, 0.21), (0.08, 0.18), (-0.08, 0.0)]
    return [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(A, B)]


def bridge(root, m):
    """The bridge blister: faceted, a sloped brow and a thin cool-white visor slit wrapping the front."""
    P = Part('bridge')
    cx = 0.7

    def ring(z, inset=0.0):
        pl = blister_plan(z)
        half = pl[1:5]
        pts = [pl[0]] + half + [pl[5]] + [(x, -y) for x, y in reversed(half)]
        out = []
        for x, y in pts:
            d = V((x - cx, y))
            dn = d.normalized() if d.length > 1e-6 else V((1, 0))
            out.append(V((x - dn.x * inset, y - dn.y * inset, z)))
        return out
    zs = [(0.22, 0.0), (0.575, 0.0), (0.58, 0.012), (0.615, 0.012), (0.62, 0.0), (0.72, 0.0)]
    rings = [ring(z, i) for z, i in zs]
    n = len(rings[0])
    faces, _ = P.loft(rings, m.slate)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    front = {0, 1, 2, 7, 8, 9}      # tip -> shoulder -> mid -> rear-mid, both sides
    for idx, f in enumerate(faces[:-2]):
        band, e = idx // n, idx % n
        if band == 2 and e in front:
            P._set([f], m.visor)
        elif band in (1, 2, 3):
            P._set([f], m.dark)
        elif band == 4:
            P._set([f], m.slate2)
        elif band == 0 and e in (0, 9):
            P._set([f], m.slate2)
    top = faces[-1]
    P._set([faces[-2]], m.gun)
    r = bmesh.ops.inset_region(P.bm, faces=[top], thickness=0.022, depth=-0.004, use_even_offset=True)
    P._set(r['faces'], m.dark)
    P._set([top], m.slate2)
    # sensor bar and a small dark dome on the roof
    P.box((0.42, 0.05, 0.02), M((0.6, 0, 0.727)), m.dark, bevel=0.006)
    P.cyl(0.05, 0.03, M((0.2, 0, 0.735)), m.gun, segs=12, bevel=0.006)
    P.sphere(0.036, M((0.2, 0, 0.75)), m.glass, u=12, v=6)
    return P.finish(parent=root)


def wing(P, m, s):
    """Swept blade wing low at the stern (s = +1 port, -1 starboard) and its down-canted tip fin."""
    prof = [(0.0, 0.0), (0.28, 0.5), (0.72, 0.42), (1.0, 0.12), (1.0, -0.12), (0.72, -0.42), (0.28, -0.5)]

    def ring(y, z, xl, xt, t):
        return [V((xl + (xt - xl) * u, s * y, z + t * v)) for u, v in prof]
    root = (0.7, -0.1, -0.85, -3.85, 0.14)
    tip = (2.5, -0.36, -3.15, -4.05, 0.04)

    def at(k):
        return tuple(a + (b - a) * k for a, b in zip(root, tip))
    spans = [0.0, 0.45, 0.78, 0.83, 1.0]
    faces, _ = P.loft([ring(*at(k)) for k in spans], m.slate)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    n = len(prof)
    upper, lower = [], []
    for idx, f in enumerate(faces[:-2]):
        e, seg = idx % n, idx // n
        if e in (0, 6):
            P._set([f], m.trim)                  # leading-edge facets catch the light
        elif e == 3:
            P._set([f], m.dark)
        elif e in (1, 2) and seg == 2:
            P._set([f], m.livery)                # Authority stripe near the tip
        elif e in (1, 2) and seg < 2:
            upper.append(f)
        elif e in (1, 2):
            P._set([f], m.slate2)                # darker outer blade
        else:
            lower.append(f)
    P._set(faces[-2:], m.gun)
    P.inset_panels(upper, 0.009, -0.004, m_panel=m.slate, m_groove=m.dark)
    P.inset_panels(lower, 0.009, -0.004, m_panel=m.under, m_groove=m.dark)
    # tip fin: a thin blade canted down and out
    fprof = [(0.0, 0.0), (0.3, 0.5), (0.75, 0.4), (1.0, 0.0), (0.75, -0.4), (0.3, -0.5)]

    def fring(z, y, xl, xt, t):
        return [V((xl + (xt - xl) * u, s * (y + t * v), z)) for u, v in fprof]
    fr = [fring(-0.3, 2.5, -3.11, -4.07, 0.05), fring(-0.36, 2.505, -3.15, -4.07, 0.05),
          fring(-0.74, 2.6, -3.78, -4.12, 0.022)]
    ff, _ = P.loft(fr, m.slate2)
    bmesh.ops.recalc_face_normals(P.bm, faces=ff)
    for idx, f in enumerate(ff[:-2]):
        if idx % 6 in (0, 5):
            P._set([f], m.trim)
    P._set(ff[-2:], m.gun)
    # running-light housing at the wing tip's leading corner
    P.box((0.12, 0.05, 0.05), M((-3.18, s * 2.5, -0.36)), m.dark, bevel=0.01)


def lances(P, m):
    """Two slim emitter lances under the forward flanks (the enforcement hardware)."""
    for s in (1, -1):
        y, z = s * 0.5, -0.24
        P.lathe([(-0.45, 0.0), (-0.42, 0.04), (1.9, 0.04), (2.0, 0.032), (2.3, 0.022), (2.36, 0.0)],
                M((0.0, y, z), z=AX), m.gun, segs=6, phase=math.pi / 6)
        P.cyl(0.03, 0.06, M((2.27, y, z), z=AX), m.steel, segs=6)
        for x in (0.1, 1.4):
            P.box((0.3, 0.035, 0.12), M((x, y, z + 0.06)), m.slate2, bevel=0.008)


# engine bells: (y, z, scale); bell exit radius 0.245 * scale
ENGINES = [(0.0, 0.03, 1.0), (0.55, 0.0, 0.8), (-0.55, 0.0, 0.8)]
THROAT = STERN + 0.07


def details(P, m):
    # chin sensor: dark glass lens in a gunmetal collar under the prow
    P.cyl(0.07, 0.04, M((2.75, 0, -0.17), z=(0, 0, 1)), m.gun, segs=8, bevel=0.008)
    P.sphere(0.05, M((2.75, 0, -0.19)), m.glass, u=12, v=6)
    # deck hatches
    for x in (-1.6, -2.55):
        for s in (1, -1):
            y = s * 0.45
            z = deck_z(x, y)
            nrm = V((0, s * 0.08, 1)).normalized()
            P.box((0.36, 0.2, 0.014), M((x, y, z + 0.002), z=nrm, up=(1, 0, 0)), m.slate2, bevel=0.004)
    # RCS clusters at the bow flanks and the stern corners
    for x, s in ((2.6, 1), (2.6, -1), (-3.6, 1), (-3.6, -1)):
        w, zc, ht, hb = dims(x)
        y = s * (w * 0.78)
        z = deck_z(x, y)
        P.box((0.16, 0.08, 0.05), M((x, y, z + 0.015)), m.gun, bevel=0.01)
        for d in ((0, s, 0), (0, 0, 1)):
            P.cyl(0.013, 0.03, M(V((x, y, z + 0.02)) + V(d) * 0.04, z=d), m.steel, segs=6, r2=0.02)
    # engine collars in the stern bay
    for y, z, sc in ENGINES:
        P.cyl(0.245 * sc * 1.1, 0.12, M((THROAT + 0.04, y, z), z=AX), m.gun, segs=8, bevel=0.012)


def bell(m):
    """Engine bell along -X; origin at the throat, exit at x = -0.55."""
    P = Part('engine')
    ax = (-1, 0, 0)
    NL = 0.55
    outer = [(-0.04, 0.215), (0.0, 0.18), (0.12, 0.172), (0.3, 0.2), (NL, 0.245)]
    inner = [(NL, 0.228), (0.3, 0.183), (0.12, 0.148), (0.03, 0.13)]
    P.lathe(outer, M((0, 0, 0), z=ax), m.steel, segs=24)
    P.lathe(inner, M((0, 0, 0), z=ax), Pal.nozzle(), segs=24)
    P.lathe([(NL, 0.245), (NL, 0.228)], M((0, 0, 0), z=ax), m.gun, segs=24)
    for x, r in ((0.16, 0.18), (0.4, 0.222)):
        P.lathe([(x - 0.018, r + 0.012), (x + 0.018, r + 0.006)], M((0, 0, 0), z=ax), m.gun, segs=24)
    P.cyl(0.13, 0.01, M((-0.035, 0, 0), z=AX), Pal.e_engine(), segs=20)
    return P.finish()


def build():
    m = Mats()
    root = kit.empty('cutter', (0, 0, 0), size=0.5)
    P = Part('hull')
    hull(P, m)
    spine(P, m)
    for s in (1, -1):
        wing(P, m, s)
    lances(P, m)
    details(P, m)
    P.finish(parent=root)
    bridge(root, m)
    src = bell(m)
    for k, (y, z, sc) in enumerate(ENGINES):
        p = V((THROAT, y, z))
        e = kit.instance(f'engine_{k + 1}', src, M(p, scale=sc), parent=root)
        kit.empty(f'nozzle_{k + 1}', p - V((0.55 * sc, 0, 0)), parent=e, size=0.12)
    for c in list(src.users_collection):
        c.objects.unlink(src)
    L = Part('light_l')
    c = V((-3.11, 2.5, -0.36))
    L.sphere(0.03, M(c), m.running, u=10, v=6)
    lo = L.finish(parent=root, loc=c)
    kit.instance('light_r', lo, M((c.x, -c.y, c.z)), parent=root)
    return root


if __name__ == '__main__':
    a = kit.cli('cutter')
    kit.reset(seed=23)
    root = build()
    kit.export(a.out, root)
    if a.render:
        kit.render(a.render, **kit.view_args(a, -35, 22, 0.75))
