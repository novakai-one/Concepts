"""Meridian: a colony ark (~63 units long, nose along +X, Z up; the game scales it).

Bow command section with a dust shield, bridge band, window rows and two hangar doors; two exposed
box-frame truss sections (clear repeated rectangular frames); a habitat spine with three rotating
ring habitats on spokes; an engineering section with a tank farm, big radiator wings and three
main engines. Repeated parts are linked duplicates, so each mesh is stored once in the .glb.

  <blender-python> tools/singular/blender/meridian.py [--render preview.png]

Nodes the game can use (under the root `meridian`):
  bow, hangar_door_s (starboard, -Y), hangar_door_p (port, +Y)
  truss_fore, truss_aft: origin at the section centre; children frame_f1..f6 / frame_a1..a6 (one
      rectangular frame each, in the YZ plane) and truss_fore_braces / truss_aft_braces
  hub; ring_1, ring_2, ring_3: origin on the ship axis, spin them about local X
  aft (tank_1..6, radiator_l/r, engine_1..3 below it); nozzle_1..3 at the engine exits (-X)
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Pal, Part, V  # noqa: E402
import bmesh  # noqa: E402

AX = (1, 0, 0)


class Mats:
    def __init__(self):
        self.hull = kit.mat('ark_hull', (0.25, 0.255, 0.26), metal=0.35, rough=0.42)
        self.hull2 = Pal.hull2()
        self.paint = kit.mat('ark_paint', (0.3, 0.3, 0.295), metal=0.05, rough=0.5)
        self.accent = Pal.accent()
        self.dark = Pal.dark()
        self.gun = Pal.gunmetal()
        self.steel = Pal.steel()
        self.rad = Pal.radiator()
        self.glass = Pal.glass()
        self.win_w = kit.emis('ark_window_warm', kit.WARM_WHITE, 1.25)
        self.win_c = kit.emis('ark_window_cool', kit.COOL_WHITE, 1.15)
        self.cyan = Pal.e_cyan(1.5)
        self.white = Pal.e_white(2.2)
        self.engine = Pal.e_engine(2.0)


def ngon(n, ry, rz, chamfer=0.0, mids=False, phase=None):
    """Regular n-gon in the YZ plane (flat top), optional corner chamfers and edge midpoints."""
    ph = math.pi / n if phase is None else phase
    cs = [V((ry * math.cos(ph + 2 * math.pi * i / n), rz * math.sin(ph + 2 * math.pi * i / n))) for i in range(n)]
    pts = []
    for i in range(n):
        p, pr, nx = cs[i], cs[i - 1], cs[(i + 1) % n]
        if chamfer > 0:
            pts.append(p + (pr - p).normalized() * chamfer)
            pts.append(p + (nx - p).normalized() * chamfer)
        else:
            pts.append(p)
        if mids:
            pts.append((p + nx) / 2)
    return pts


def section(x, pts, s=1.0, zo=0.0):
    return [V((x, p.x * s, p.y * s + zo)) for p in pts]


def plate(P, m, faces, p_hatch=0.1, chamfer_len=None):
    """Raise most faces as plates (groove around each), recess a few as hatches, vary the tones."""
    raised, hatch = [], []
    for f in faces:
        if chamfer_len and min(e.calc_length() for e in f.edges) < chamfer_len:
            P._set([f], m.hull2)
            continue
        (hatch if random.random() < p_hatch else raised).append(f)
    inner = P.inset_panels(raised, 0.045, 0.02)
    for f in inner:
        r = random.random()
        P._set([f], m.hull2 if r < 0.05 else m.paint if r < 0.3 else m.accent if r < 0.32 else m.hull)
    P.inset_panels(hatch, 0.12, -0.06, m_panel=m.gun, m_groove=m.hull2)


# ------------------------------------------------------------------ bow

def bow(root, m):
    P = Part('bow')
    oct_ = ngon(8, 3.0, 2.7, chamfer=0.18, mids=True)
    st = [(15.8, 0.9), (16.2, 1.0)] + [(16.2 + 1.05 * k, 1.0) for k in range(1, 10)]      # .. 25.65
    st += [(26.6, 0.93), (27.5, 0.8), (28.3, 0.64), (28.9, 0.52)]
    rings = [section(x, oct_, s) for x, s in st]
    faces, rv = P.loft(rings, m.hull)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    quads = [f for f in faces if len(f.verts) == 4]
    caps = [f for f in faces if len(f.verts) != 4]
    P._set(caps, m.gun)
    door_zone = [f for f in quads if 18.0 < f.calc_center_median().x < 23.3 and abs(f.normal.y) > 0.9]
    bridge = [f for f in quads if 26.5 < f.calc_center_median().x < 27.6 and f.normal.z > 0.35]
    rest = [f for f in quads if f not in door_zone and f not in bridge]
    P.inset_panels(bridge, 0.07, -0.05, m_panel=m.glass, m_groove=m.dark)
    plate(P, m, rest, p_hatch=0.035, chamfer_len=0.2)
    P._set(door_zone, m.hull2)
    # module rings (structural bands)
    for x in (16.25, 19.4, 22.55, 25.7):
        P.loft([section(x - 0.18, ngon(8, 3.0, 2.7, 0.18), 1.035), section(x + 0.18, ngon(8, 3.0, 2.7, 0.18), 1.035)], m.gun)
    # dust shield at the nose: a faceted octagonal dome of armour plates, a sensor mast at its cap
    shield = [(28.75, 3.2), (29.05, 3.32), (29.45, 2.95), (29.8, 2.2), (30.02, 1.25), (30.1, 0.55)]
    sf = P.lathe(shield, M((0, 0, 0), z=AX), m.hull2, segs=8, close1=True, phase=math.pi / 8)
    bmesh.ops.recalc_face_normals(P.bm, faces=sf)
    plates = P.inset_panels([f for f in sf if len(f.verts) == 4 and f.calc_area() > 0.3], 0.07, 0.04, m_groove=m.gun)
    for f in plates:
        P._set([f], m.hull if random.random() < 0.5 else m.hull2)
    P.cyl(0.5, 0.25, M((30.2, 0, 0), z=AX), m.gun, segs=12)
    P.cyl(0.14, 1.4, M((30.95, 0, 0), z=AX), m.steel, segs=10, r2=0.04)
    P.sphere(0.11, M((31.65, 0, 0)), m.cyan, u=10, v=6)
    # window rows along both flanks (3 rows on the side faces and the upper/lower diagonals)
    random.seed(21)
    for side in (1, -1):
        y = 3.0 * math.cos(math.pi / 8)
        for zrow in (-0.62, 0.0, 0.62):
            for k in range(46):
                x = 16.7 + k * 0.19
                if 17.9 < x < 23.4 or abs(x - 19.4) < 0.3 or abs(x - 22.55) < 0.3 or abs(x - 25.7) < 0.3:
                    continue
                if random.random() < 0.22:
                    continue
                P.box((0.11, 0.03, 0.07), M((x, side * (y + 0.05), zrow)), m.win_w if random.random() < 0.7 else m.win_c)
    # sensor masts and antennas
    for zs in (1, -1):
        P.cyl(0.08, 2.2, M((24.5, 0, zs * 3.6), z=(0, 0, 1)), m.steel, segs=8)
        P.box((0.5, 0.5, 0.25), M((24.5, 0, zs * 2.75)), m.gun, bevel=0.04)
        P.sphere(0.07, M((24.5, 0, zs * 4.72)), m.white, u=8, v=4)
    for k in range(3):
        P.box((1.2, 0.35, 0.3), M((17.0 + k * 3.2, 0, 2.62)), m.hull2, bevel=0.05)
    # adapter to the fore truss
    P.prism([(p.x, p.y) for p in ngon(8, 2.2, 2.2)], 0.6, M((15.5, 0, 0), z=AX), m.gun)
    o = P.finish(parent=root)
    # hangar doors (one node per side; recessed bay frame is part of the bow)
    for side, nm in ((-1, 's'), (1, 'p')):
        yb = side * 3.0 * math.cos(math.pi / 8)
        D = Part(f'hangar_door_{nm}')
        cx, w, h = 20.65, 4.9, 2.0
        nrm = V((0, side, 0))
        D.box((w + 0.5, 0.25, h + 0.5), M((cx, yb + side * 0.02, 0)), m.gun, bevel=0.05)      # frame
        for k in range(4):                                                                   # door leaves
            D.box((w / 4 - 0.06, 0.12, h), M((cx - w / 2 + w / 8 + k * w / 4, yb + side * 0.16, 0)), m.hull2 if k % 2 else m.hull, bevel=0.03)
            for zz in (-0.5, 0.0, 0.5):
                D.box((w / 4 - 0.25, 0.05, 0.08), M((cx - w / 2 + w / 8 + k * w / 4, yb + side * 0.23, zz)), m.gun)
        for zz in (h / 2 + 0.16, -h / 2 - 0.16):                                            # edge lights
            for k in range(12):
                D.box((0.16, 0.05, 0.05), M((cx - w / 2 + 0.2 + k * (w - 0.4) / 11, yb + side * 0.16, zz)), m.win_w)
        D.box((0.1, 0.05, h + 0.2), M((cx - w / 2 - 0.16, yb + side * 0.16, 0)), m.cyan)
        D.box((0.1, 0.05, h + 0.2), M((cx + w / 2 + 0.16, yb + side * 0.16, 0)), m.cyan)
        D.finish(parent=o, loc=(cx, yb, 0))
    return o


# ------------------------------------------------------------------ trusses

def truss_section(root, name, cx, m, src=None):
    """Box-frame truss centred at cx: six rectangular frames (instanced) + longerons and X-bracing."""
    L, half, nfr = 6.4, 2.25, 6
    xs = [cx - L / 2 + L * k / (nfr - 1) for k in range(nfr)]
    T = kit.empty(name, (cx, 0, 0), parent=root, size=1.0)
    frames = []
    if src is None:
        F = Part('truss_frame')
        t = 0.34
        for (y0, z0), (y1, z1) in [((-half, -half), (half, -half)), ((half, -half), (half, half)),
                                   ((half, half), (-half, half)), ((-half, half), (-half, -half))]:
            F.beam(V((0, y0, z0)), V((0, y1, z1)), t, m.paint, h=t * 0.8, bevel=0.03)
        for cy in (-1, 1):                                             # corner gussets
            for cz in (-1, 1):
                F.box((0.36, 0.5, 0.5), M((0, cy * (half - 0.12), cz * (half - 0.12))), m.gun, bevel=0.04)
        frame_src = F.finish()
        B = Part('truss_braces')
        for cy in (-1, 1):
            for cz in (-1, 1):
                B.beam(V((-L / 2 - 0.3, cy * half, cz * half)), V((L / 2 + 0.3, cy * half, cz * half)), 0.16, m.dark, segs=8)
        for k in range(nfr - 1):
            x0, x1 = -L / 2 + L * k / (nfr - 1), -L / 2 + L * (k + 1) / (nfr - 1)
            for face in range(4):
                a = [(-half, -half), (half, -half), (half, half), (-half, half)]
                (y0, z0), (y1, z1) = a[face], a[(face + 1) % 4]
                if k % 2 == 0:
                    B.beam(V((x0, y0, z0)), V((x1, y1, z1)), 0.07, m.gun, segs=6)
                else:
                    B.beam(V((x0, y1, z1)), V((x1, y0, z0)), 0.07, m.gun, segs=6)
        # central conduit, utility pipes and cargo pods clamped to it
        B.cyl(0.45, L + 0.6, M((0, 0, 0), z=AX), m.hull2, segs=16)
        for k in range(nfr):
            B.cyl(0.6, 0.22, M((-L / 2 + L * k / (nfr - 1), 0, 0), z=AX), m.gun, segs=16)
        for a in (0.6, 2.2, 3.8, 5.4):
            B.cyl(0.13, L + 0.6, M((0, 1.05 * math.cos(a), 1.05 * math.sin(a)), z=AX), m.steel, segs=8)
        random.seed(5)
        for k in range(nfr - 1):
            xm = -L / 2 + L * (k + 0.5) / (nfr - 1)
            for q in range(4):
                if random.random() < 0.7:
                    continue
                a = math.pi / 4 + q * math.pi / 2
                u = V((0, math.cos(a), math.sin(a)))
                B.box((0.7, 0.9, 0.7), M(V((xm, 0, 0)) + u * 1.0, z=u, up=AX), random.choice([m.hull, m.accent]), bevel=0.05)
        # small pale cyan marker lights on the four corners of the end frames
        for x in (-L / 2, L / 2):
            for cy in (-1, 1):
                for cz in (-1, 1):
                    B.sphere(0.07, M((x, cy * (half + 0.2), cz * (half + 0.2))), m.cyan, u=8, v=4)
        brace_src = B.finish()
    else:
        frame_src, brace_src = src
    tag = name.split('_')[1][0]
    for k, x in enumerate(xs):
        frames.append(kit.instance(f'frame_{tag}{k + 1}', frame_src, M((x, 0, 0)), parent=T))
    kit.instance(f'{name}_braces', brace_src, M((cx, 0, 0)), parent=T)
    return T, (frame_src, brace_src)


# ------------------------------------------------------------------ habitat

def ring_mesh(m):
    """One ring habitat (axis = X, origin on the axis): smooth rim with a window band, slim joint
    ribs, side-wall window rows, four spokes with elevator housings, a rotating bearing collar."""
    P = Part('ring_habitat')
    R_in, R_out, hw, ch = 7.3, 8.3, 0.8, 0.12
    N = 120
    sec = [(R_in, -hw + ch), (R_in, hw - ch), (R_in + ch, hw), (R_out - ch, hw), (R_out, hw - ch),
           (R_out, -hw + ch), (R_out - ch, -hw), (R_in + ch, -hw)]
    base = M((0, 0, 0), z=AX)        # sweep around local Z, mapped onto the ship's X axis
    faces = P.sweep_ring(0.0, sec, base, m.hull, segs=N)
    for f in faces:                  # long painted arcs alternating with bare-metal arcs
        c = f.calc_center_median()
        a = math.atan2(c.z, c.y) % (2 * math.pi)
        if int(a / (2 * math.pi / 12)) % 2 == 0:
            P._set([f], m.paint)
    rib = [(R_in - 0.04, -hw - 0.04), (R_in - 0.04, hw + 0.04), (R_out + 0.05, hw + 0.04), (R_out + 0.05, -hw - 0.04)]
    for k in range(12):
        a = 2 * math.pi * k / 12
        P.sweep_ring(0.0, rib, base @ M(rot=(0, 0, a - 0.012)), m.gun, segs=1, arc=0.024, closed=False)
    # window band on the outer face (dark glass) with lit windows
    band = [(R_out + 0.004, -0.2), (R_out + 0.004, 0.2), (R_out + 0.02, 0.2), (R_out + 0.02, -0.2)]
    for k in range(12):
        a = 2 * math.pi * k / 12 + 0.02
        P.sweep_ring(0.0, band, base @ M(rot=(0, 0, a)), m.glass, segs=9, arc=2 * math.pi / 12 - 0.04, closed=False)
    random.seed(9)

    def quad(center, t, n, w, h, mat):
        b = n.cross(t).normalized()
        pts = [center + t * sx * w / 2 + b * sy * h / 2 for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        P.poly(pts, mat)
    for k in range(N * 2):
        a = 2 * math.pi * (k + 0.5) / (N * 2)
        if (a % (2 * math.pi / 12)) < 0.03 or (a % (2 * math.pi / 12)) > 2 * math.pi / 12 - 0.03:
            continue
        rad = V((0, math.cos(a), math.sin(a)))
        tan = V((0, -math.sin(a), math.cos(a)))
        for z in (-0.09, 0.09):
            if random.random() < 0.3:
                continue
            quad(rad * (R_out + 0.026) + V((z, 0, 0)), tan, rad, 0.13, 0.1, m.win_w if random.random() < 0.7 else m.win_c)
        for sx in (-1, 1):
            if random.random() < 0.4:
                continue
            quad(rad * (R_in + 0.5) + V((sx * (hw + 0.006), 0, 0)), tan, V((sx, 0, 0)), 0.13, 0.09,
                 m.win_w if random.random() < 0.6 else m.win_c)
    for k in range(4):
        a = 2 * math.pi * k / 4 + math.pi / 4
        P.sphere(0.08, M(V((0, math.cos(a), math.sin(a))) * (R_out + 0.1)), m.white, u=8, v=4)
    # spokes with elevator housings
    for k in range(4):
        a = 2 * math.pi * k / 4
        u = V((0, math.cos(a), math.sin(a)))
        P.cyl(0.24, R_in - 2.6, M(u * (2.6 + (R_in - 2.6) / 2), z=u), m.hull2, segs=12)
        P.cyl(0.36, 0.3, M(u * 2.9, z=u), m.gun, segs=12)
        P.cyl(0.4, 0.3, M(u * (R_in - 0.05), z=u), m.gun, segs=12)
        P.box((0.6, 0.5, 1.1), M(u * 5.0, z=u, up=AX), m.paint, bevel=0.05)
        for q in range(3):
            P.box((0.03, 0.1, 0.16), M(u * (4.7 + q * 0.3) + V((0.31, 0, 0)), z=u, up=AX), m.win_c)
        P.cyl(0.07, R_in - 3.0, M(u * (2.8 + (R_in - 3.0) / 2) + V((0.34, 0, 0)), z=u), m.steel, segs=6)
    # rotating bearing collar
    P.sweep_ring(0.0, [(2.2, -0.8), (2.7, -0.8), (2.7, 0.8), (2.2, 0.8)], base, m.gun, segs=32)
    P.sweep_ring(0.0, [(2.7, -0.3), (2.85, -0.3), (2.85, 0.3), (2.7, 0.3)], base, m.steel, segs=32)
    return P.finish()


def hub(root, m):
    P = Part('hub')
    x0, x1 = -9.8, 9.8
    prof = [(x0, 1.6), (x0 + 0.3, 1.85), (x1 - 0.3, 1.85), (x1, 1.6)]
    faces = P.lathe(prof, M((0, 0, 0), z=AX), m.hull, segs=24, close0=True, close1=True)
    big = [f for f in faces if f.calc_area() > 0.5]
    # split the long faces into panels by insetting each lathe band
    P.inset_panels(big, 0.04, 0.02)
    for x in (-6.4, 0.0, 6.4):
        P.lathe([(x - 1.1, 2.05), (x + 1.1, 2.05)], M((0, 0, 0), z=AX), m.gun, segs=24, close0=False)
        P.lathe([(x - 1.15, 1.86), (x - 1.15, 2.08), (x + 1.15, 2.08), (x + 1.15, 1.86)], M((0, 0, 0), z=AX), m.hull2, segs=24)
    for a in range(8):
        aa = 2 * math.pi * a / 8 + math.pi / 8
        u = V((0, math.cos(aa), math.sin(aa)))
        for xa, xb in ((-9.6, -7.2), (-4.8, -1.2), (1.2, 4.8), (7.2, 9.6)):
            P.cyl(0.09, xb - xa, M(V(((xa + xb) / 2, 0, 0)) + u * 1.95, z=AX), m.steel, segs=6)
    for x in (-3.0, 3.0):
        for a in (0, math.pi):
            u = V((0, math.cos(a + math.pi / 2), math.sin(a + math.pi / 2)))
            P.cyl(0.45, 0.5, M(V((x, 0, 0)) + u * 2.0, z=u), m.gun, segs=12)
            P.cyl(0.3, 0.1, M(V((x, 0, 0)) + u * 2.27, z=u), m.cyan, segs=12)
    return P.finish(parent=root)


# ------------------------------------------------------------------ engineering

def aft(root, m):
    P = Part('aft')
    # tank farm spine and end frames
    P.prism([(p.x, p.y) for p in ngon(8, 1.0, 1.0)], 6.2, M((-19.0, 0, 0), z=AX), m.dark)
    for x in (-21.9, -16.1):
        P.prism([(p.x, p.y) for p in ngon(8, 3.6, 3.6, chamfer=0.3)], 0.35, M((x, 0, 0), z=AX), m.gun)
        P.prism([(p.x, p.y) for p in ngon(8, 3.75, 3.75, chamfer=0.3)], 0.12, M((x, 0, 0), z=AX), m.hull2)
    # engineering block
    oct_ = ngon(8, 3.1, 3.1, chamfer=0.2, mids=True)
    st = [(-22.1, 0.9), (-22.3, 1.0), (-23.45, 1.0), (-24.6, 1.0), (-25.75, 1.0), (-26.0, 0.94), (-26.4, 0.8)]
    rings = [section(x, oct_, s) for x, s in st]
    faces, rv = P.loft(list(reversed(rings)), m.hull)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    quads = [f for f in faces if len(f.verts) == 4]
    P._set([f for f in faces if len(f.verts) != 4], m.gun)
    plate(P, m, [f for f in quads if abs(f.normal.x) < 0.5], p_hatch=0.15, chamfer_len=0.22)
    for x in (-22.35, -25.7):
        P.loft([section(x - 0.15, ngon(8, 3.1, 3.1, 0.2), 1.04), section(x + 0.15, ngon(8, 3.1, 3.1, 0.2), 1.04)], m.gun)
    # radiator root booms (the panels themselves are instanced nodes)
    for side in (1, -1):
        P.truss(V((-21.8, side * 2.9, 0)), V((-21.8, side * 10.8, 0)), 0.5, 0.06, m.gun, bays=8, up=AX)
        P.box((1.4, 0.9, 0.9), M((-21.8, side * 3.1, 0)), m.hull2, bevel=0.08)
    # thrust structure: octagonal frustum + engine mounts
    P.lathe([(-26.4, 2.5), (-27.6, 2.9), (-27.9, 2.9)], M((0, 0, 0), z=AX), m.gun, segs=8, phase=math.pi / 8)
    P.prism([(p.x, p.y) for p in ngon(8, 2.9, 2.9)], 0.15, M((-27.95, 0, 0), z=AX), m.dark)
    # aft window row and lights
    random.seed(4)
    for side in (1, -1):
        for k in range(16):
            if random.random() < 0.3:
                continue
            P.box((0.12, 0.02, 0.07), M((-25.6 + k * 0.22, side * 3.1 * math.cos(math.pi / 8) * 1.01, 0.6)), m.win_c)
    return P.finish(parent=root)


def tank_mesh(m):
    P = Part('tank')
    r, L = 1.05, 5.2
    prof = [(-L / 2, 0.0), (-L / 2 + 0.15, 0.55), (-L / 2 + 0.45, 0.92), (-L / 2 + 0.85, r), (L / 2 - 0.85, r),
            (L / 2 - 0.45, 0.92), (L / 2 - 0.15, 0.55), (L / 2, 0.0)]
    P.lathe(prof, M((0, 0, 0), z=AX), m.paint, segs=24)
    for x in (-1.4, 0.0, 1.4):
        P.lathe([(x - 0.08, r + 0.03), (x + 0.08, r + 0.03)], M((0, 0, 0), z=AX), m.gun, segs=24)
    P.cyl(0.15, 0.5, M((0, 0, r + 0.15)), m.steel, segs=8)
    return P.finish()


def radiator_mesh(m):
    """Radiator wing, root at the origin, extends along +Y (7.6 long), 8 wide in X."""
    P = Part('radiator')
    Lx, Ly = 8.0, 7.6
    P.box((Lx, Ly, 0.08), M((0, Ly / 2, 0)), m.rad)
    for k in range(24):
        x = -Lx / 2 + 0.2 + k * (Lx - 0.4) / 23
        for zz in (0.07, -0.07):
            P.box((0.08, Ly - 0.2, 0.06), M((x, Ly / 2, zz)), m.gun)
    for x in (-Lx / 2, Lx / 2):
        P.box((0.18, Ly, 0.2), M((x, Ly / 2, 0)), m.hull2, bevel=0.03)
    for y in (0.0, Ly / 2, Ly):
        P.box((Lx, 0.18, 0.2), M((0, y, 0)), m.hull2, bevel=0.03)
    P.cyl(0.14, Lx, M((0, 0.25, 0.12), z=AX), m.steel, segs=8)
    P.sphere(0.12, M((Lx / 2 - 0.1, Ly + 0.15, 0)), m.white, u=8, v=4)
    P.sphere(0.12, M((-Lx / 2 + 0.1, Ly + 0.15, 0)), m.cyan, u=8, v=4)
    return P.finish()


def engine_mesh(m):
    """Main engine bell along -X; origin at the gimbal (throat), exit at x = -3.2."""
    P = Part('engine')
    NL = 3.2
    outer = [(0.3, 0.75), (0.0, 0.55), (-0.4, 0.6), (-1.2, 0.85), (-2.2, 1.15), (-NL, 1.42)]
    inner = [(-NL, 1.34), (-2.2, 1.07), (-1.2, 0.77), (-0.5, 0.5), (-0.2, 0.42)]
    P.lathe([(-x, r) for x, r in outer], M((0, 0, 0), z=(-1, 0, 0)), m.steel, segs=32)
    P.lathe([(-x, r) for x, r in inner], M((0, 0, 0), z=(-1, 0, 0)), Pal.nozzle(), segs=32)
    P.lathe([(NL, 1.42), (NL, 1.34)], M((0, 0, 0), z=(-1, 0, 0)), m.gun, segs=32)
    for x, r in ((-0.9, 0.8), (-1.7, 1.02), (-2.6, 1.28)):
        P.lathe([(-x - 0.07, r + 0.06), (-x + 0.07, r + 0.03)], M((0, 0, 0), z=(-1, 0, 0)), m.gun, segs=32)
    P.cyl(0.42, 0.05, M((-0.25, 0, 0), z=AX), m.engine, segs=24)
    P.cyl(0.8, 0.5, M((0.45, 0, 0), z=AX), m.gun, segs=16, bevel=0.04)
    for k in range(4):
        a = k * math.pi / 2
        u = V((0, math.cos(a), math.sin(a)))
        P.beam(V((0.3, 0, 0)) + u * 0.7, V((1.3, 0, 0)) + u * 1.2, 0.18, m.dark, segs=8)
    return P.finish()


def build():
    m = Mats()
    root = kit.empty('meridian', size=2)
    bow(root, m)
    t1, src = truss_section(root, 'truss_fore', 12.5, m)
    truss_section(root, 'truss_aft', -12.6, m, src=src)
    hub(root, m)
    rsrc = ring_mesh(m)
    for k, x in enumerate((-6.4, 0.0, 6.4)):
        r = kit.instance(f'ring_{k + 1}', rsrc, M((x, 0, 0), rot=(0.4 * k, 0, 0)), parent=root)
    A = aft(root, m)
    tsrc = tank_mesh(m)
    for k in range(6):
        a = 2 * math.pi * k / 6 + math.pi / 6
        kit.instance(f'tank_{k + 1}', tsrc, M((-19.0, 2.35 * math.cos(a), 2.35 * math.sin(a))), parent=A)
    rad = radiator_mesh(m)
    kit.instance('radiator_l', rad, M((-21.8, 3.4, 0)), parent=A)
    kit.instance('radiator_r', rad, M((-21.8, -3.4, 0), rot=(0, 0, math.pi)), parent=A)
    eng = engine_mesh(m)
    for k in range(3):
        a = math.pi / 2 + 2 * math.pi * k / 3
        p = V((-28.4, 1.55 * math.cos(a), 1.55 * math.sin(a)))
        e = kit.instance(f'engine_{k + 1}', eng, M(p), parent=A)
        kit.empty(f'nozzle_{k + 1}', p - V((3.2, 0, 0)), parent=e, size=0.5)
    # cleanup: the source meshes for instances are unlinked from the scene (only instances export)
    for o in (src[0], src[1], rsrc, tsrc, rad, eng):
        bpy_unlink(o)
    return root


def bpy_unlink(o):
    import bpy
    for c in list(o.users_collection):
        c.objects.unlink(o)


if __name__ == '__main__':
    a = kit.cli('meridian')
    kit.reset(seed=17)
    root = build()
    kit.export(a.out, root)
    if a.render:
        kit.render(a.render, **kit.view_args(a, -38, 18, 0.62))
