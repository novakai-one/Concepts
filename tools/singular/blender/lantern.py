"""Lantern: the hero ship, a small survey tug (~6 units, nose along +X, Z up).

Two hexagonal-section pressure modules (crew module with a cockpit window band at the front,
engineering module at the back) joined by an exposed tank section, an open lattice projector dish
at the bow, four thruster pods on truss outriggers, dorsal radiators, antenna mast, nav lights.

  <blender-python> tools/singular/blender/lantern.py [--render preview.png]

Nodes the game can use: lantern (root) > hull, projector (+ projector_focus at the emitter),
pod_fl, pod_fr, pod_rl, pod_rr (each with nozzle_fl / nozzle_fr / nozzle_rl / nozzle_rr at the
nozzle exit; exhaust goes along -X), light_beacon.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Pal, Part, V  # noqa: E402
import bmesh  # noqa: E402

HW, HH = 0.64, 0.48      # module half-width (y) and half-height (z) of the hexagon
CH = 0.05                # corner chamfer


def hex_pts(w, h, c=CH, mids=True):
    """Chamfered hexagon (flat top/bottom) in the YZ plane, CCW from +Y. 18 points with mids."""
    cs = [V((w, 0)), V((w / 2, h)), V((-w / 2, h)), V((-w, 0)), V((-w / 2, -h)), V((w / 2, -h))]
    pts = []
    for i in range(6):
        p, pr, nx = cs[i], cs[i - 1], cs[(i + 1) % 6]
        pts.append(p + (pr - p).normalized() * c)
        pts.append(p + (nx - p).normalized() * c)
        if mids:
            pts.append((p + nx) / 2)
    return pts


def ring(x, s=1.0, zo=0.0, w=HW, h=HH, c=CH, mids=True, top=1.0, sy=None):
    out = []
    for p in hex_pts(w, h, c, mids):
        z = p.y * s * (top if p.y > 0 else 1.0)
        out.append(V((x, p.x * (sy if sy is not None else s), z + zo)))
    return out


class Mats:
    def __init__(self):
        self.hull = Pal.hull()
        self.hull2 = Pal.hull2()
        self.paint = Pal.paint()
        self.dark = Pal.dark()
        self.gun = Pal.gunmetal()
        self.steel = Pal.steel()
        self.glass = kit.mat('cockpit_glass', (0.01, 0.013, 0.018), metal=0.0, rough=0.06,
                             emit=(0.014, 0.024, 0.034), strength=1.0)
        self.accent = Pal.accent()


def plate_module(P, m, st, window=None, stripe=None, plain_from=None):
    """Loft a hex module through stations [(x, scale, zoff, top)], then plate it."""
    rings = [ring(x, s, zo, top=t) for x, s, zo, t in st]
    faces, rv = P.loft(rings, m.hull)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    side = [f for f in faces if len(f.verts) == 4]
    caps = [f for f in faces if len(f.verts) != 4]
    P._set(caps, m.gun)
    chamfer, panels, win = [], [], []
    for f in side:
        c = f.calc_center_median()
        short = min(e.calc_length() for e in f.edges)
        if short < CH * 1.25:
            chamfer.append(f)
        elif window and window[0] < c.x < window[1] and f.normal.z > 0.3:
            win.append(f)
        elif abs(f.normal.x) > 0.55:      # steep end bevels stay plain
            P._set([f], m.hull2)
        else:
            panels.append(f)
    P._set(chamfer, m.hull2)
    if win:
        P.inset_panels(win, 0.022, -0.016, m_panel=m.glass, m_groove=m.dark)
    raised, hatch = [], []
    for f in panels:
        (hatch if kit.random.random() < 0.12 else raised).append(f)
    inner = P.inset_panels(raised, 0.013, 0.006)
    for f in inner:
        r = kit.random.random()
        x = f.calc_center_median().x
        if stripe and stripe[0] < x < stripe[1] and abs(f.normal.z) < 0.9:
            P._set([f], m.accent)                      # the ship's slate-blue identity band
        elif plain_from is not None and x > plain_from:
            P._set([f], m.hull)
        else:
            P._set([f], m.hull2 if r < 0.07 else m.paint if r < 0.3 else m.hull)
    hin = P.inset_panels(hatch, 0.03, -0.012, m_panel=m.gun, m_groove=m.hull2)
    for f in hin:
        c = f.calc_center_median()
        nrm = f.normal
        L = min(e.calc_length() for e in f.edges)
        if kit.random.random() < 0.6:   # vent slats
            for k in range(4):
                P.box((L * 0.55, 0.016, 0.01), M(c + V((1, 0, 0)) * (k - 1.5) * 0.04 + nrm * 0.003, z=nrm, up=(1, 0, 0)), m.dark)
        else:                            # a small access hatch with a handle
            P.box((L * 0.4, 0.08, 0.012), M(c + nrm * 0.004, z=nrm, up=(1, 0, 0)), m.hull2, bevel=0.004)
    return rv


def collar(P, m, x, wdt, s=1.04):
    a = ring(x - wdt / 2, s, mids=False)
    b = ring(x + wdt / 2, s, mids=False)
    P.loft([a, b], m.gun)
    for p in hex_pts(HW * s, HH * s, mids=False)[1::2]:
        P.box((wdt * 1.25, 0.045, 0.045), M((x, p.x * 1.01, p.y * 1.01)), m.steel, bevel=0.006)


def crew_module(P, m):
    st = [(0.62, 0.9, 0, 1.0), (0.68, 1.0, 0, 1.0)]
    st += [(0.68 + 0.27 * (i + 1), 1.0, 0, 1.0) for i in range(3)]          # .. 1.49
    st += [(1.72, 0.97, -0.005, 0.86), (1.95, 0.9, -0.02, 0.7), (2.14, 0.76, -0.04, 0.58),
           (2.26, 0.6, -0.05, 0.52), (2.32, 0.5, -0.05, 0.5)]
    plate_module(P, m, st, window=(1.75, 1.94), stripe=(1.22, 1.49), plain_from=1.95)
    collar(P, m, 0.69, 0.06)
    collar(P, m, 1.52, 0.05, 1.03)
    # port sensor blister and a starboard docking hatch with marker lights
    nrm = V((0, HH, HW / 2)).normalized()
    p = V((1.05, HW * 0.62, HH * 0.42))
    P.cyl(0.11, 0.05, M(p + nrm * 0.02, z=nrm), m.gun, segs=16, bevel=0.01)
    P.sphere(0.085, M(p + nrm * 0.05), m.glass, u=16, v=8)
    hp = V((0.9, -HW - 0.005, -0.02))
    P.cyl(0.17, 0.05, M(hp, z=(0, -1, 0)), m.gun, segs=20, bevel=0.012)
    P.cyl(0.12, 0.03, M(hp + V((0, -0.035, 0)), z=(0, -1, 0)), m.hull2, segs=20)
    for dz in (0.2, -0.2):
        P.box((0.025, 0.02, 0.025), M(hp + V((0, -0.01, dz))), Pal.e_cyan())
    # window frame lip and a warm dashboard glow line just under the glass band
    # nose: lidar bar, chin sensor turret, docking lights
    P.box((0.05, 0.34, 0.05), M((2.335, 0, 0.1)), m.dark, bevel=0.01)
    for s in (1, -1):
        P.box((0.02, 0.04, 0.018), M((2.36, s * 0.11, 0.1)), kit.emis('emit_dock', kit.COOL_WHITE, 1.2))
    P.cyl(0.1, 0.1, M((1.95, 0, -0.48), z=(0, 0, 1)), m.gun, segs=16, bevel=0.01)
    P.sphere(0.075, M((1.95, 0, -0.55)), m.glass, u=16, v=8)
    # crew window row (warm) along the upper side faces
    for s in (1, -1):
        nrm = V((0, s * HH, HW / 2)).normalized()
        t = 0.45
        y, z = HW * (1 - t) + HW / 2 * t, HH * t
        for k in range(5):
            x = 0.86 + k * 0.15
            p = V((x, s * y, z))
            P.box((0.05, 0.08, 0.012), M(p + nrm * 0.008, z=nrm, up=(1, 0, 0)), m.dark)
            P.box((0.032, 0.064, 0.012), M(p + nrm * 0.012, z=nrm, up=(1, 0, 0)), Pal.e_warm())
    # dorsal hatch + handrails
    P.box((0.3, 0.3, 0.04), M((1.1, 0, HH + 0.02)), m.hull2, bevel=0.012)
    P.cyl(0.1, 0.03, M((1.1, 0, HH + 0.05)), m.gun, segs=16)
    for s in (1, -1):
        P.beam((0.85, s * 0.22, HH + 0.06), (1.35, s * 0.22, HH + 0.06), 0.008, m.steel, segs=5)


def engineering_module(P, m):
    st = [(-2.36, 0.84, 0, 1.0), (-2.3, 1.0, 0, 1.0)]
    st += [(-2.3 + 0.28 * (i + 1), 1.0, 0, 1.0) for i in range(4)]          # .. -1.18
    st += [(-1.04, 1.0, 0, 1.0), (-0.98, 0.86, 0, 1.0)]
    plate_module(P, m, st, stripe=(-1.74, -1.46))
    collar(P, m, -2.24, 0.06)
    collar(P, m, -1.08, 0.06)
    # service bays on the lower flanks (ribbed covers) and heat-exchanger fins
    for s_ in (1, -1):
        nrm = V((0, s_ * HH, -HW / 2)).normalized()
        for x in (-1.95, -1.45):
            c = V((x, s_ * HW * 0.76, -HH * 0.46)) + nrm * 0.035
            P.box((0.24, 0.38, 0.07), M(c, z=nrm, up=(1, 0, 0)), m.hull2, bevel=0.012)
            for k in range(5):
                P.box((0.2, 0.025, 0.02), M(c + nrm * 0.045 + V((-0.14 + k * 0.07, 0, 0)), z=nrm, up=(1, 0, 0)), m.gun)
        for k in range(10):
            P.box((0.012, 0.09, 0.16), M((-2.15 + k * 0.05, s_ * (HW + 0.04), 0.12)), m.dark)
        # whip antennas on the engineering module
        P.cyl(0.006, 0.4, M((-2.05, s_ * 0.3, HH + 0.22)), m.steel, segs=5)
    # aft: docking collar / reactor access
    ax = (1, 0, 0)
    P.cyl(0.34, 0.14, M((-2.43, 0, 0), z=ax), m.gun, segs=24, bevel=0.012)
    P.cyl(0.27, 0.08, M((-2.52, 0, 0), z=ax), m.steel, segs=24)
    P.cyl(0.19, 0.03, M((-2.57, 0, 0), z=ax), m.dark, segs=24)
    for k in range(8):
        a = 2 * math.pi * k / 8 + math.pi / 8
        u = V((0, math.cos(a), math.sin(a)))
        P.box((0.12, 0.045, 0.06), M(V((-2.45, 0, 0)) + u * 0.35, z=ax, up=u), m.steel, bevel=0.006)
    for s in (1, -1):
        P.box((0.025, 0.05, 0.025), M((-2.37, s * 0.32, -0.3)), Pal.e_cyan())
    # ventral tug clamp
    P.box((1.0, 0.32, 0.07), M((-1.7, 0, -HH - 0.03)), m.hull2, bevel=0.015)
    for s in (1, -1):
        P.cyl(0.04, 0.09, M((-1.35, s * 0.13, -HH - 0.08), z=(0, 1, 0)), m.steel, segs=10)
        P.beam((-1.35, s * 0.13, -HH - 0.08), (-1.85, s * 0.2, -HH - 0.34), 0.07, m.gun, h=0.05)
        P.box((0.08, 0.07, 0.17), M((-1.9, s * 0.21, -HH - 0.4), rot=(0, 0.35, 0)), m.dark, bevel=0.01)


def tank_section(P, m):
    """Exposed section between the modules: a spine, four propellant tanks, hex frames, conduits."""
    ax = (1, 0, 0)
    x0, x1 = -0.98, 0.62
    # spine (narrow hex prism)
    sp = [ring(x0, 0.45, mids=False), ring(x1, 0.45, mids=False)]
    P.loft(sp, m.dark, cap0=False, cap1=False)
    # tanks
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        c = V((-0.18, 0, 0)) + V((0, math.cos(a) * 0.41, math.sin(a) * 0.33))
        r, L = 0.19, 1.36
        prof = [(-L / 2, 0.0), (-L / 2 + 0.03, 0.09), (-L / 2 + 0.08, 0.15), (-L / 2 + 0.16, r)]
        prof += [(L / 2 - 0.16, r), (L / 2 - 0.08, 0.15), (L / 2 - 0.03, 0.09), (L / 2, 0.0)]
        P.lathe(prof, M(c, z=ax), m.paint, segs=20, close0=False, close1=False)
        for xx in (-0.35, 0.0, 0.35):
            P.lathe([(xx - 0.02, r + 0.008), (xx + 0.02, r + 0.008)], M(c, z=ax), m.gun, segs=20)
    # hex frames that hold the tanks
    for x in (-0.6, 0.2):
        a = ring(x - 0.03, 1.0, mids=False)
        b = ring(x + 0.03, 1.0, mids=False)
        ai = ring(x - 0.03, 0.88, mids=False)
        bi = ring(x + 0.03, 0.88, mids=False)
        P.loft([a, b], m.gun, cap0=False, cap1=False)
        P.loft([bi, ai], m.gun, cap0=False, cap1=False)
        P.loft([ai, a], m.gun, cap0=False, cap1=False)
        P.loft([b, bi], m.gun, cap0=False, cap1=False)
    # longerons along the hex corners
    for p in hex_pts(HW * 0.95, HH * 0.95, mids=False)[::2]:
        P.beam((x0, p.x, p.y), (x1, p.x, p.y), 0.028, m.dark, segs=6)
    # dorsal conduit truss and side pipes
    P.truss((x0 - 0.1, 0, HH + 0.06), (x1 + 0.1, 0, HH + 0.06), 0.12, 0.012, m.gun, bays=5, up=(0, 0, 1))
    for s in (1, -1):
        P.cyl(0.025, x1 - x0 + 0.3, M(((x0 + x1) / 2, s * (HW + 0.0), 0.03), z=ax), m.steel, segs=8)
        P.cyl(0.018, x1 - x0 + 0.3, M(((x0 + x1) / 2, s * (HW - 0.02), -0.05), z=ax), m.gun, segs=8)


def radiators(P, m):
    rad = Pal.radiator()
    x0, x1 = -2.15, -1.12
    for s in (1, -1):
        ang = math.radians(16)
        out = V((0, s * math.cos(ang), math.sin(ang)))
        nrm = V((0, -s * math.sin(ang), math.cos(ang)))
        root = V((0, s * 0.2, HH + 0.1))
        width = 0.72
        L = x1 - x0
        def at(u, v, w=0.0):
            return V(((x0 + x1) / 2 + u, root.y, root.z)) + out * (v + width / 2 + 0.05) + nrm * w
        for x in (x0 + 0.12, x1 - 0.12):
            P.beam((x, s * 0.1, HH + 0.04), V((x, 0, 0)) + V((0, root.y, root.z)) + out * 0.08, 0.05, m.gun, h=0.04)
        P.box((width, L, 0.018), M(at(0, 0), z=nrm, up=(1, 0, 0)), rad)   # local x = across, y = along the ship
        for k in range(12):
            u = -L / 2 + 0.05 + k * (L - 0.1) / 11
            for w in (0.013, -0.013):
                P.box((width * 0.95, 0.018, 0.012), M(at(u, 0, w), z=nrm, up=(1, 0, 0)), m.gun)
        for v in (-width / 2, width / 2):
            P.box((0.03, L + 0.03, 0.036), M(at(0, v), z=nrm, up=(1, 0, 0)), m.hull2, bevel=0.005)
        for u in (-L / 2, L / 2):
            P.box((width, 0.03, 0.036), M(at(u, 0), z=nrm, up=(1, 0, 0)), m.hull2, bevel=0.005)
        P.cyl(0.026, L, M(at(0, -width / 2 - 0.03), z=(1, 0, 0)), m.steel, segs=10)
        # pale cyan edge light at the radiator tip
        P.box((0.04, 0.02, 0.02), M(at(L / 2 - 0.02, width / 2 + 0.02)), Pal.e_cyan())


def antenna(P, m, root):
    base = V((0.98, -0.16, HH + 0.02))
    P.cyl(0.065, 0.06, M(base + V((0, 0, 0.03))), m.gun, segs=12, bevel=0.01)
    P.cyl(0.022, 0.4, M(base + V((0, 0, 0.26))), m.steel, segs=8)
    dc = base + V((0.0, 0, 0.48))
    d = V((0.6, -0.3, 0.75)).normalized()
    prof = [(0.0, 0.02), (0.015, 0.06), (0.04, 0.11), (0.075, 0.16)]
    P.lathe(prof, M(dc, z=d), m.paint, segs=20)
    P.lathe([(z - 0.008, r) for z, r in reversed(prof)], M(dc, z=d), m.dark, segs=20)
    P.cyl(0.007, 0.15, M(dc + d * 0.07, z=d), m.steel, segs=6)
    wb = V((0.72, 0.18, HH + 0.04))
    P.cyl(0.028, 0.05, M(wb), m.gun, segs=10)
    P.cyl(0.007, 0.7, M(wb + V((0, 0, 0.37))), m.steel, segs=6)
    beacon = Part('light_beacon')
    beacon.sphere(0.026, M(wb + V((0, 0, 0.74))), Pal.e_white(), u=10, v=6)
    beacon.finish(parent=root, loc=wb + V((0, 0, 0.74)))


def projector(root, m):
    """Open lattice dish at the bow: rim ring, curved radial ribs, two hoops, a feed emitter."""
    P = Part('projector')
    cyan = kit.emis("emit_projector", kit.PALE_CYAN, 1.2)
    X0, R, D = 2.6, 0.9, 0.34
    xr = X0 + D

    def dish(r):
        return X0 + D * (r / R) ** 2
    ax = (1, 0, 0)
    sec = [(-0.05, -0.055), (0.05, -0.055), (0.065, -0.03), (0.065, 0.03), (0.05, 0.055), (-0.05, 0.055),
           (-0.065, 0.03), (-0.065, -0.03)]
    P.sweep_ring(R, sec, M((xr, 0, 0), z=ax), m.paint, segs=64)
    nrib = 16
    for k in range(nrib):
        a = 2 * math.pi * k / nrib
        c, s = math.cos(a), math.sin(a)
        P.box((0.14, 0.08, 0.065), M((xr, R * c, R * s), z=(0, c, s), up=(1, 0, 0)), m.gun, bevel=0.01)
        a2 = a + math.pi / nrib
        P.box((0.012, 0.12, 0.026), M((xr + 0.058, R * math.cos(a2), R * math.sin(a2)), z=(1, 0, 0),
                                       up=(0, math.cos(a2), math.sin(a2))), cyan)
        pts = [V((dish(r), r * c, r * s)) for r in [0.17 + (R - 0.17) * t / 5 for t in range(6)]]
        for p0, p1 in zip(pts, pts[1:]):
            P.beam(p0, p1, 0.026, m.gun if k % 2 else m.dark, h=0.05, up=(0, c, s))
    for r, mm in ((0.4, m.gun), (0.66, m.dark)):
        sq = [(-0.016, -0.016), (0.016, -0.016), (0.016, 0.016), (-0.016, 0.016)]
        P.sweep_ring(r, sq, M((dish(r), 0, 0), z=ax), mm, segs=40)
    P.cyl(0.19, 0.12, M((X0 - 0.03, 0, 0), z=ax), m.gun, segs=20, bevel=0.012)
    P.cyl(0.12, 0.05, M((X0 + 0.05, 0, 0), z=ax), m.steel, segs=20)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        c, s = math.cos(a), math.sin(a)
        P.beam((2.3, 0.2 * c, 0.18 * s), (X0 - 0.06, 0.15 * c, 0.15 * s), 0.05, m.dark, h=0.05)
        P.beam((2.22, 0.28 * c, 0.24 * s), (xr - 0.04, (R - 0.05) * c, (R - 0.05) * s), 0.03, m.gun, segs=6)
    F = V((xr + 0.3, 0, 0))
    for k in range(3):
        a = math.pi / 2 + k * 2 * math.pi / 3
        P.beam((xr + 0.01, (R - 0.04) * math.cos(a), (R - 0.04) * math.sin(a)), F - V((0.05, 0, 0)), 0.012, m.steel, segs=6)
    P.cyl(0.055, 0.1, M(F - V((0.03, 0, 0)), z=ax), m.gun, segs=16, r2=0.04, bevel=0.008)
    P.sphere(0.042, M(F + V((0.03, 0, 0))), cyan, u=14, v=8)
    o = P.finish(parent=root, loc=(X0, 0, 0))
    kit.empty('projector_focus', F + V((0.06, 0, 0)), parent=o, size=0.1)
    return o


def pod(root, name, c, m, outward):
    """Thruster pod: octagonal nacelle with a tapered nose, engine housing and a bell nozzle (-X)."""
    P = Part(f'pod_{name}')
    c = V(c)
    ax = (1, 0, 0)
    r = 0.22
    L = 1.2
    ph = math.pi / 8
    prof = [(-0.2, r), (0.1, r), (0.36, r), (0.48, 0.2), (0.56, 0.15), (0.6, 0.09)]
    body = P.lathe(prof, M(c, z=ax), m.hull, segs=8, close1=True, phase=ph)
    bmesh.ops.recalc_face_normals(P.bm, faces=body)
    big = [f for f in body if f.calc_area() > 0.012]
    inner = P.inset_panels(big, 0.012, 0.005)
    for f in inner:
        rr = kit.random.random()
        P._set([f], m.paint if rr < 0.45 else m.hull2 if rr < 0.6 else m.hull)
    # engine housing (dark) with cooling fins
    hous = [(-0.62, 0.17), (-0.56, 0.2), (-0.26, 0.205), (-0.2, 0.205)]
    P.lathe(hous, M(c, z=ax), m.gun, segs=16, phase=ph)
    for k in range(8):
        a = 2 * math.pi * k / 8
        u = V((0, math.cos(a), math.sin(a)))
        P.box((0.3, 0.012, 0.05), M(c + V((-0.42, 0, 0)) + u * 0.225, z=u, up=ax), m.dark)
    P.lathe([(-0.205, 0.235), (-0.17, 0.235)], M(c, z=ax), m.steel, segs=8, phase=ph)
    # nose cap
    P.cyl(0.08, 0.04, M(c + V((0.62, 0, 0)), z=ax), m.gun, segs=12)
    P.sphere(0.05, M(c + V((0.64, 0, 0))), m.glass, u=12, v=6)
    # nozzle
    nb = c - V((0.62, 0, 0))
    NL = 0.36
    outer = [(0.0, 0.15), (-0.05, 0.14), (-0.16, 0.165), (-0.27, 0.205), (-NL, 0.24)]
    P.lathe(outer, M(nb, z=ax), m.steel, segs=24)
    inner_p = [(-NL, 0.225), (-0.27, 0.19), (-0.16, 0.15), (-0.07, 0.115), (-0.02, 0.105)]
    P.lathe(inner_p, M(nb, z=ax), Pal.nozzle(), segs=24)
    P.lathe([(-NL, 0.24), (-NL, 0.225)], M(nb, z=ax), m.gun, segs=24)
    for z, rr in [(-0.11, 0.155), (-0.22, 0.186), (-0.31, 0.22)]:
        P.lathe([(z - 0.01, rr + 0.011), (z + 0.01, rr + 0.004)], M(nb, z=ax), m.gun, segs=24)
    P.cyl(0.105, 0.01, M(nb - V((0.03, 0, 0)), z=ax), Pal.e_engine(), segs=20)
    # outboard strake with nav light; dorsal RCS block
    o = V(outward)
    P.box((0.08, 0.55, 0.035), M(c + o * 0.235 + V((0.08, 0, 0)), z=o, up=ax), m.dark, bevel=0.01)
    P.sphere(0.026, M(c + o * 0.262 + V((0.36, 0, 0))), Pal.e_white(), u=10, v=6)
    P.box((0.12, 0.1, 0.08), M(c + V((0.12, 0, 0.23)), z=(0, 0, 1), up=ax), m.gun, bevel=0.01)
    for d in ((0, 1, 0), (0, -1, 0), (0, 0, 1)):
        P.cyl(0.013, 0.03, M(c + V((0.12, 0, 0.24)) + V(d) * 0.055, z=d), m.steel, segs=8, r2=0.02)
    obj = P.finish(parent=root, loc=c)
    kit.empty(f'nozzle_{name}', nb - V((NL, 0, 0)), parent=obj, size=0.12)
    return obj


def outrigger(P, a, b, m):
    a, b = V(a), V(b)
    d = b - a
    R = kit.basis(d, up=(1, 0, 0))
    ex, ey = R.col[0], R.col[1]
    n = 4
    hgt, wid = 0.085, 0.06
    for sy in (1, -1):
        for sx in (1, -1):
            o = ex * sx * wid + ey * sy * hgt
            P.beam(a + o, b + o, 0.02, m.dark, segs=6)
    for k in range(n + 1):
        p = a + d * (k / n)
        P.box((wid * 2 + 0.045, hgt * 2 + 0.045, 0.022), M(p, z=d, up=(1, 0, 0)), m.gun)
        if k < n:
            q = a + d * ((k + 1) / n)
            s0 = 1 if k % 2 == 0 else -1
            for sx in (1, -1):
                P.beam(p + ex * sx * wid + ey * s0 * hgt, q + ex * sx * wid - ey * s0 * hgt, 0.012, m.gun, segs=5)
    P.cyl(0.02, d.length * 0.92, M(a + d * 0.5, z=d), m.steel, segs=8)
    P.box((0.3, 0.28, 0.1), M(a + d.normalized() * 0.03, z=d, up=(1, 0, 0)), m.hull2, bevel=0.02)
    P.box((0.22, 0.24, 0.08), M(b - d.normalized() * 0.25, z=d, up=(1, 0, 0)), m.gun, bevel=0.015)


PODS = {'fl': (0.62, 1.38, -0.28), 'fr': (0.62, -1.38, -0.28), 'rl': (-1.66, 1.66, 0.18), 'rr': (-1.66, -1.66, 0.18)}


def build():
    m = Mats()
    root = kit.empty('lantern', (0, 0, 0), size=0.5)
    P = Part('hull')
    crew_module(P, m)
    engineering_module(P, m)
    tank_section(P, m)
    radiators(P, m)
    antenna(P, m, root)
    for k, c in PODS.items():
        c = V(c)
        s = 1 if k[1] == 'l' else -1
        hp = V((c.x + (0.22 if k[0] == 'f' else -0.05), s * HW * 0.9, c.z * 0.45))
        outrigger(P, hp, c - V((0, s * 0.24, 0)), m)
    P.finish(parent=root)
    projector(root, m)
    for k, c in PODS.items():
        pod(root, k, c, m, outward=(0, 1 if k[1] == 'l' else -1, 0))
    return root


if __name__ == '__main__':
    a = kit.cli('lantern')
    kit.reset(seed=11)
    root = build()
    kit.export(a.out, root)
    if a.render:
        kit.render(a.render, **kit.view_args(a, -50, 24, 0.72))
