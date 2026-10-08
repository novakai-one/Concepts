"""Bridge: the Lantern's bridge interior, a set for dialogue scenes (~12 x 8 x 4 units).
Origin at the holotable centre on the floor; +X looks out of the big curved window (an open
frame: the game's space backdrop shows through), Z up. Dark materials; mostly lit by its own
emissive screens, light strips and the holotable.

  <blender-python> tools/singular/blender/bridge.py [--render preview.png]

Nodes the game can use (under the root `bridge`): room, window_frame, holotable (+ holo_focus,
the point above the table top where holograms go), console_1..5, seat_1, seat_2, and camera hint
empties cam_wide, cam_window, cam_table (each looks at holo_focus).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Part, V  # noqa: E402
import bmesh  # noqa: E402

X0, X1 = -6.0, 5.0          # back wall, start of the window arc on the side walls
W, H = 4.0, 4.0             # half width, height
ARC_C, ARC_R = 0.8, 5.8     # window arc centre (x) and radius in plan: meets y = +-4 at x = 5, apex x = 6.6
ARC_A = math.asin(W / ARC_R)


class Mats:
    def __init__(self):
        self.floor = kit.mat('br_floor', (0.035, 0.037, 0.042), metal=0.6, rough=0.45)
        self.wall = kit.mat('br_wall', (0.05, 0.053, 0.06), metal=0.3, rough=0.6)
        self.wall2 = kit.mat('br_wall_light', (0.085, 0.09, 0.098), metal=0.35, rough=0.55)
        self.rib = kit.mat('br_rib', (0.07, 0.073, 0.08), metal=0.85, rough=0.35)
        self.dark = kit.mat('br_dark', (0.015, 0.016, 0.019), metal=0.5, rough=0.5)
        self.trim = kit.mat('br_trim', (0.2, 0.205, 0.215), metal=1.0, rough=0.3)
        self.body = kit.mat('br_console', (0.05, 0.053, 0.058), metal=0.5, rough=0.42)
        self.seat = kit.mat('br_seat', (0.035, 0.035, 0.04), metal=0.0, rough=0.7)
        self.glass = kit.mat('br_table_glass', (0.008, 0.01, 0.013), metal=0.0, rough=0.12,
                             emit=(0.004, 0.012, 0.016), strength=1.0)
        # emissives (in-game levels): soft cyan / cool white / warm white
        self.screen = kit.emis('br_screen_base', (0.3, 0.75, 1.0), 0.05)
        self.scr_mid = kit.emis('br_screen_mid', (0.3, 0.75, 1.0), 0.2)
        self.scr_hi = kit.emis('br_screen_hi', (0.32, 0.78, 1.0), 0.6)
        self.screen2 = kit.emis('br_screen_white', kit.COOL_WHITE, 0.45)
        self.keys = kit.emis('br_keys_warm', kit.WARM_WHITE, 0.4)
        self.strip = kit.emis('br_strip', kit.COOL_WHITE, 0.55)
        self.under = kit.emis('br_underglow', (0.2, 0.75, 1.0), 0.12)
        self.rim = kit.emis('br_holo_rim', kit.PALE_CYAN, 1.3)
        for mm in vars(self).values():
            mm.use_backface_culling = True     # single-sided: a camera outside a wall sees through it


def screen(P, T, c, n, up, w, h, m, seed=0, white=False):
    """A display: dim base with abstract UI (header, bars, a framed step graph, status dots). No text."""
    rnd = random.Random(seed)
    n, up = V(n).normalized(), V(up)
    xh = up.cross(n).normalized()
    yh = n.cross(xh)
    c = V(c)

    def el(s, t, sw, sh, mat, d=0.005):
        P.box((sw, sh, 0.004), T @ M(c + xh * s + yh * t + n * d, z=n, up=yh), mat)
    el(0, 0, w, h, m.screen, 0.0)
    hi = m.screen2 if white else m.scr_hi
    el(0, h / 2 - h * 0.08, w * 0.92, h * 0.035, hi)                                   # header bar
    el(-w * 0.38, h / 2 - h * 0.08, w * 0.08, h * 0.06, m.scr_mid)
    for k in range(4):                                                                  # left list of bars
        ln = w * rnd.uniform(0.12, 0.34)
        el(-w * 0.44 + ln / 2, h * 0.22 - k * h * 0.15, ln, h * 0.05, m.scr_mid if k else hi)
    fx, fy, fw, fh = w * 0.2, -h * 0.05, w * 0.48, h * 0.62                            # framed graph
    for s_, t_, sw, sh in ((fx, fy + fh / 2, fw, 0.01), (fx, fy - fh / 2, fw, 0.01), (fx - fw / 2, fy, 0.01, fh), (fx + fw / 2, fy, 0.01, fh)):
        el(s_, t_, sw, sh, m.scr_mid)
    nb = 9
    for k in range(nb):
        bh = fh * rnd.uniform(0.15, 0.8)
        el(fx - fw / 2 + fw * (k + 0.5) / nb, fy - fh / 2 + bh / 2 + 0.01, fw / nb * 0.55, bh, hi if k == nb - 3 else m.scr_mid)
    for k in range(3):                                                                  # status dots
        el(-w * 0.42 + k * w * 0.05, -h / 2 + h * 0.1, h * 0.05, h * 0.05, hi if k == 0 else m.scr_mid)


def arc_pt(t):
    """Point on the window arc in plan, t in [-1, 1] from -Y to +Y."""
    a = t * ARC_A
    return V((ARC_C + ARC_R * math.cos(a), ARC_R * math.sin(a)))


def room(root, m):
    P = Part('room')
    # floor + ceiling outlines (back wall to the arc)
    n_arc = 16
    outline = [V((X0, -W)), V((X1, -W))] + [arc_pt(-1 + 2 * k / n_arc) for k in range(1, n_arc)] + [V((X1, W)), V((X0, W))]
    # floor plates: a grid of panels clipped to the room (fill the arc with one polygon)
    for i in range(11):
        for j in range(8):
            x0, y0 = X0 + i, -W + j
            if x0 + 1 > X1 + 0.01:
                continue
            f = P.poly([(x0, y0, 0), (x0 + 1, y0, 0), (x0 + 1, y0 + 1, 0), (x0, y0 + 1, 0)], m.floor)
            P.inset_panels(f, 0.03, -0.008)
    P.poly([(X1, -W, 0)] + [(p.x, p.y, 0) for p in [arc_pt(-1 + 2 * k / n_arc) for k in range(1, n_arc)]] + [(X1, W, 0)], m.floor)
    ceil = P.poly([(p.x, p.y, H) for p in reversed(outline)], m.wall)
    # side walls with recessed panels between ribs
    for side in (-1, 1):
        for i in range(11):
            x0 = X0 + i
            for z0, z1 in ((0.0, 0.5), (0.5, 2.3), (2.3, 3.3), (3.3, H)):
                pts = [(x0, side * W, z0), (x0 + 1, side * W, z0), (x0 + 1, side * W, z1), (x0, side * W, z1)]
                if side < 0:
                    pts = pts[::-1]          # normals face into the room
                f = P.poly(pts, m.wall if z0 != 0.5 else m.wall2)
                if z0 in (0.5, 2.3):
                    P.inset_panels(f, 0.06, -0.03, m_panel=m.wall if z0 == 2.3 else m.wall2)
    # back wall with a doorway
    for y0, y1, z0, z1 in ((-W, -0.8, 0, H), (0.8, W, 0, H), (-0.8, 0.8, 2.5, H)):
        f = P.poly([(X0, y1, z0), (X0, y1, z1), (X0, y0, z1), (X0, y0, z0)], m.wall)
        P.inset_panels(f, 0.12, -0.04, m_panel=m.wall2)
    P.box((0.1, 1.5, 2.45), M((X0 - 0.15, 0, 1.225)), m.body, bevel=0.02)                 # the door leaf
    P.box((0.04, 0.05, 2.45), M((X0 - 0.08, 0, 1.225)), m.strip)                           # door seam light
    for y in (-0.86, 0.86):
        P.box((0.18, 0.12, 2.6), M((X0 + 0.05, y, 1.3)), m.rib, bevel=0.02)
    P.box((0.18, 1.85, 0.14), M((X0 + 0.05, 0, 2.57)), m.rib, bevel=0.02)
    P.box((0.03, 1.4, 0.04), M((X0 + 0.15, 0, 2.5)), m.strip)
    # wall/ceiling ribs: frames every 1.5 units following the section, with angled corner braces
    for x in [X0 + 0.5 + 1.5 * k for k in range(7)]:
        for side in (-1, 1):
            P.box((0.22, 0.2, H), M((x, side * (W - 0.1), H / 2)), m.rib, bevel=0.02)
            P.beam(V((x, side * (W - 0.1), 2.9)), V((x, side * (W - 1.0), H - 0.1)), 0.2, m.rib, h=0.22, up=(1, 0, 0))
            P.box((0.04, 0.03, 1.6), M((x + 0.13, side * (W - 0.12), 1.5)), m.strip)        # vertical light strip
        P.box((0.22, 2 * W - 1.8, 0.22), M((x, 0, H - 0.11)), m.rib, bevel=0.02)            # ceiling beam
    # cornice ducts along the top corners (sloped panels), with a cool light line under each
    for side in (-1, 1):
        p0, p1 = V((0, side * W, 3.1)), V((0, side * (W - 0.9), H))
        nrm = V((0, -side * 1, -1)).normalized()
        mid = (p0 + p1) / 2 + nrm * 0.08
        P.box(((p1 - p0).length, X1 - X0, 0.12), M(V(((X0 + X1) / 2, mid.y, mid.z)), z=nrm, up=(1, 0, 0)), m.wall2)
        P.box((X1 - X0 - 0.4, 0.05, 0.03), M(((X0 + X1) / 2, side * (W - 0.18), 3.02)), m.strip)
        # pipes along the lower walls
        for zz, r in ((0.22, 0.06), (0.36, 0.04)):
            P.cyl(r, X1 - X0, M(((X0 + X1) / 2, side * (W - 0.12), zz), z=(1, 0, 0)), m.trim, segs=8)
    # overhead: longitudinal conduits and the projector ring above the holotable
    for y in (-1.2, 1.2):
        P.cyl(0.07, X1 - X0, M(((X0 + X1) / 2, y, H - 0.32), z=(1, 0, 0)), m.trim, segs=8)
    P.sweep_ring(0.0, [(1.55, -0.12), (1.85, -0.12), (1.85, 0.12), (1.55, 0.12)], M((0, 0, 3.35)), m.rib, segs=48)
    P.sweep_ring(0.0, [(1.6, -0.125), (1.8, -0.125), (1.8, -0.135), (1.6, -0.135)], M((0, 0, 3.35)), m.rim, segs=48)
    for k in range(6):
        a = 2 * math.pi * k / 6
        u = V((math.cos(a), math.sin(a), 0))
        P.beam(u * 1.7 + V((0, 0, 3.45)), u * 2.6 + V((0, 0, H - 0.1)), 0.1, m.rib, segs=6)
        P.cyl(0.08, 0.12, M(u * 1.7 + V((0, 0, 3.18))), m.dark, segs=10)
        P.cyl(0.05, 0.01, M(u * 1.7 + V((0, 0, 3.115))), m.strip, segs=10)
    # floor: raised ring platform with a radial grating over an underglow
    P.lathe([(0.0, 2.5), (0.12, 2.5), (0.12, 2.38)], M((0, 0, 0)), m.rib, segs=48)
    P.lathe([(0.02, 2.38), (0.02, 1.45)], M((0, 0, 0)), m.under, segs=48)
    for k in range(56):
        a = 2 * math.pi * k / 56
        u = V((math.cos(a), math.sin(a), 0))
        P.beam(u * 1.42 + V((0, 0, 0.09)), u * 2.4 + V((0, 0, 0.09)), 0.05, m.floor, h=0.06, up=(0, 0, 1))
    P.sweep_ring(0.0, [(1.3, 0.0), (1.45, 0.0), (1.45, 0.12), (1.3, 0.12)], M((0, 0, 0)), m.rib, segs=48)
    # walkway grating toward the window, over an underglow strip
    P.box((X1 - 2.6 + 0.6, 1.0, 0.01), M(((X1 + 2.6) / 2 + 0.3, 0, 0.012)), m.under)
    for k in range(30):
        x = 2.62 + k * 0.1
        P.box((0.04, 1.1, 0.06), M((x, 0, 0.05)), m.floor)
    for y in (-0.57, 0.57):
        P.box((X1 - 2.5 + 0.7, 0.06, 0.1), M(((X1 + 2.5) / 2 + 0.35, y, 0.05)), m.rib)
    # side display panels on the walls (soft screens)
    for side in (-1, 1):
        for x in (-3.5, 1.0):
            P.box((1.3, 0.05, 0.75), M((x, side * (W - 0.06), 1.75)), m.dark, bevel=0.01)
            screen(P, M((0, 0, 0)), (x, side * (W - 0.085), 1.75), (0, -side, 0), (0, 0, 1), 1.2, 0.66, m, seed=int(x * 10) + side, white=x > 0)
    return P.finish(parent=root)


def window(root, m):
    """Curved window frame: sill wall, mullions, transom and header along the arc. The panes are open."""
    P = Part('window_frame')
    n = 12
    zs, zh = 0.75, 3.55
    pts = [arc_pt(-1 + 2 * k / n) for k in range(n + 1)]
    for p0, p1 in zip(pts, pts[1:]):
        # sill wall (inner face) and header
        P.poly([(p0.x, p0.y, zs), (p1.x, p1.y, zs), (p1.x, p1.y, 0), (p0.x, p0.y, 0)], m.wall)
        P.poly([(p0.x, p0.y, H), (p1.x, p1.y, H), (p1.x, p1.y, zh), (p0.x, p0.y, zh)], m.wall)
        a, b = V((p0.x, p0.y, zs)), V((p1.x, p1.y, zs))
        P.beam(a + V((0, 0, 0.0)), b, 0.2, m.rib, h=0.16, up=(0, 0, 1))                 # sill rail
        P.beam(V((p0.x, p0.y, zh)), V((p1.x, p1.y, zh)), 0.24, m.rib, h=0.2, up=(0, 0, 1))  # header
        P.beam(V((p0.x, p0.y, 2.75)), V((p1.x, p1.y, 2.75)), 0.08, m.rib, h=0.08, up=(0, 0, 1))  # transom
        c = (p0 + p1) / 2
        inward = (V((ARC_C, 0)) - c).normalized()
        P.box((0.05, 0.03, 0.03), M((c.x + inward.x * 0.15, c.y + inward.y * 0.15, zs + 0.1)), m.strip)
    for k, p in enumerate(pts):
        w = 0.2 if k in (0, n) else 0.11
        P.beam(V((p.x, p.y, zs)), V((p.x, p.y, zh)), w, m.rib, h=0.22, up=(0, 0, 1))
    # outer shell lip so the opening has depth
    for p0, p1 in zip(pts, pts[1:]):
        d0 = (p0 - V((ARC_C, 0))).normalized() * 0.35
        d1 = (p1 - V((ARC_C, 0))).normalized() * 0.35
        P.poly([(p0.x + d0.x, p0.y + d0.y, zs), (p1.x + d1.x, p1.y + d1.y, zs), (p1.x, p1.y, zs), (p0.x, p0.y, zs)], m.dark)
        P.poly([(p0.x, p0.y, zh), (p1.x, p1.y, zh), (p1.x + d1.x, p1.y + d1.y, zh), (p0.x + d0.x, p0.y + d0.y, zh)], m.dark)
    return P.finish(parent=root)


def holotable(root, m):
    P = Part('holotable')
    P.lathe([(0.0, 0.95), (0.12, 0.95), (0.18, 0.7), (0.3, 0.55), (0.7, 0.5), (0.78, 0.8), (0.82, 1.2),
             (0.86, 1.3), (0.94, 1.3)], M((0, 0, 0)), m.body, segs=48)
    P.lathe([(0.3, 0.56), (0.7, 0.51)], M((0, 0, 0)), m.rib, segs=24)
    for k in range(8):
        a = 2 * math.pi * k / 8
        u = V((math.cos(a), math.sin(a), 0))
        P.box((0.04, 0.06, 0.32), M(u * 0.56 + V((0, 0, 0.5)), rot=(0, 0, a)), m.strip)
    # glowing rim band and the flat glass top with faint inset rings
    P.lathe([(0.9, 1.31), (0.95, 1.31)], M((0, 0, 0)), m.rim, segs=64)
    P.lathe([(0.95, 1.31), (0.95, 1.27)], M((0, 0, 0)), m.trim, segs=64)
    P.lathe([(0.95, 1.27), (0.95, 0.0)], M((0, 0, 0)), m.glass, segs=48, close1=True)
    for r in (0.45, 0.8):
        P.lathe([(0.956, r + 0.008), (0.956, r - 0.008)], M((0, 0, 0)), m.screen, segs=48)
    o = P.finish(parent=root)
    kit.empty('holo_focus', (0, 0, 1.5), parent=o, size=0.3)
    return o


def console(root, name, loc, facing, m, wide=1.6, tall=False):
    """Operator console: cabinet, sloped work surface with a soft screen, an upright screen above."""
    P = Part(name)
    f = V(facing).normalized()
    yaw = math.atan2(f.y, f.x)
    T = M(loc, rot=(0, 0, yaw))
    # side profile in local X (depth, + toward the operator is -X) / Z, extruded along local Y
    prof = [(0.35, 0.0), (0.35, 0.85), (0.15, 1.05), (-0.45, 0.9), (-0.45, 0.75), (-0.2, 0.7), (-0.2, 0.0)]
    P.prism([(x, z) for x, z in prof], wide, T @ M(rot=(math.pi / 2, 0, 0)), m.body)
    # sloped screen on the work surface
    a, b = V((0.13, 0, 1.03)), V((-0.42, 0, 0.885))
    mid = (a + b) / 2
    slope = (a - b).normalized()
    nrm = V((slope.z, 0, -slope.x))
    if nrm.z < 0:
        nrm = -nrm
    screen(P, T, mid + nrm * 0.004 + slope * 0.03, nrm, slope, wide - 0.25, 0.42, m, seed=hash(name) % 1000)
    P.box((wide - 0.3, 0.06, 0.01), T @ M(b + slope * 0.045 + nrm * 0.006, z=nrm, up=slope), m.keys)
    # upright screen on a stalk
    P.box((0.06, 0.08, 0.5), T @ M((0.25, 0, 1.3)), m.rib)
    P.box((0.06, wide - 0.2, 0.62 if tall else 0.5), T @ M((0.22, 0, 1.65)), m.dark, bevel=0.015)
    screen(P, T, (0.188, 0, 1.65), (-1, 0, 0), (0, 0, 1), wide - 0.3, 0.54 if tall else 0.42, m, seed=len(name) * 7 + int(wide * 10), white=tall)
    # trim and a toe-kick light
    P.box((0.03, wide, 0.03), T @ M((-0.45, 0, 0.9)), m.trim)
    P.box((0.02, wide - 0.2, 0.02), T @ M((-0.205, 0, 0.06)), m.strip)
    return P.finish(parent=root, pivot=T)


def seat(root, name, loc, facing, m):
    P = Part(name)
    f = V(facing).normalized()
    T = M(loc, rot=(0, 0, math.atan2(f.y, f.x)))
    P.cyl(0.25, 0.04, T @ M((0, 0, 0.02)), m.rib, segs=16)
    P.cyl(0.06, 0.42, T @ M((0, 0, 0.24)), m.trim, segs=10)
    P.box((0.55, 0.55, 0.1), T @ M((0, 0, 0.5)), m.seat, bevel=0.04)
    P.box((0.1, 0.55, 0.65), T @ M((-0.3, 0, 0.88), rot=(0, -0.18, 0)), m.seat, bevel=0.04)
    for s in (-1, 1):
        P.box((0.4, 0.06, 0.06), T @ M((0.02, s * 0.3, 0.7)), m.rib, bevel=0.01)
    return P.finish(parent=root, pivot=T)


def build():
    m = Mats()
    root = kit.empty('bridge', size=1)
    room(root, m)
    window(root, m)
    holotable(root, m)
    consoles = [((4.3, -1.3, 0), (1, 0, 0), 1.6, False), ((4.3, 1.3, 0), (1, 0, 0), 1.6, False),
                ((-1.6, -3.25, 0), (0, -1, 0), 2.0, True), ((-1.6, 3.25, 0), (0, 1, 0), 2.0, True),
                ((-4.6, -2.4, 0), (-0.6, -0.8, 0), 1.4, False)]
    for k, (loc, f, w, tall) in enumerate(consoles):
        console(root, f'console_{k + 1}', loc, f, m, wide=w, tall=tall)
    seat(root, 'seat_1', (3.45, -1.3, 0), (1, 0, 0), m)
    seat(root, 'seat_2', (3.45, 1.3, 0), (1, 0, 0), m)
    focus = V((0, 0, 1.5))
    for name, p in (('cam_wide', (-5.2, -2.9, 2.6)), ('cam_window', (-2.5, 1.2, 1.7)), ('cam_table', (2.2, -2.4, 2.1))):
        d = focus - V(p)
        kit.empty(name, p, parent=root, size=0.3, rot=d.to_track_quat('-Z', 'Y').to_euler())
    return root


if __name__ == '__main__':
    a = kit.cli('bridge')
    kit.reset(seed=23)
    root = build()
    kit.export(a.out, root)
    if a.render:
        kit.render(a.render, samples=a.samples, res=a.res, cam_loc=(-5.3, -2.6, 2.5), look=(3.0, 0.6, 1.3), lens=20,
                   env=0.05, key=0.6, rim=0.6, softbox=0.0, bg=(0.004, 0.006, 0.012), bounces=3)
