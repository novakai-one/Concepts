"""Debris: six small chunks (< 600 triangles each), one .glb per chunk.
  debris_0..2  rocks (displaced, fractured icospheres)
  debris_3     a torn, curved hull plate with stringers
  debris_4     a broken box-truss fragment
  debris_5     a ripped tank/fuselage shell with ring frames

  <blender-python> tools/singular/blender/debris.py [--render preview.png]   (writes all six)

Each file: root node debris_N > chunk_N (centred on the origin, about 1-2 units across).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Pal, Part, V  # noqa: E402
import bmesh  # noqa: E402
import bpy  # noqa: E402


def rock(P, seed, scale, m, m2):
    random.seed(seed)
    r = bmesh.ops.create_icosphere(P.bm, subdivisions=3, radius=1.0)
    off = V((seed * 3.1, seed * 1.7, seed * 0.3))
    for v in r['verts']:
        n = v.co.normalized()
        d = 0.86 + 0.2 * max(-1.0, min(1.0, kit.fbm(n * 1.1 + off, 3))) + 0.045 * max(-1.0, min(1.0, kit.fbm(n * 3.2 + off, 2)))
        v.co = n * d
    # fracture planes: flatten everything beyond a few random planes
    for _ in range(3):
        pn = V((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))).normalized()
        dist = random.uniform(0.55, 0.72)
        for v in r['verts']:
            h = v.co.dot(pn)
            if h > dist:
                v.co -= pn * (h - dist)
    for v in r['verts']:
        v.co = V((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    faces = list({f for v in r['verts'] for f in v.link_faces})
    P._set(faces, m)
    bmesh.ops.recalc_face_normals(P.bm, faces=faces)
    # flat fracture faces read as fresh, slightly lighter rock
    for f in faces:
        f.normal_update()
    for f in faces:
        nb = [g for e in f.edges for g in e.link_faces if g is not f]
        if nb and all(f.normal.angle(g.normal, 0) < 0.12 for g in nb):
            P._set([f], m2)


def plate(P, mh, md, mg):
    """Curved hull plate: outer panelled skin, inner dark skin, torn edge, two stringers."""
    random.seed(41)
    nu, nv = 7, 5
    R, arc, H = 2.2, 0.75, 1.2
    T = 0.05
    grid = []
    for i in range(nu):
        row = []
        for j in range(nv):
            a = -arc / 2 + arc * i / (nu - 1)
            z = -H / 2 + H * j / (nv - 1)
            edge = i in (0, nu - 1) or j in (0, nv - 1)
            jit = 0.09 if edge else 0.0
            a += random.uniform(-jit, jit) / R
            z += random.uniform(-jit, jit)
            row.append((a, z))
        grid.append(row)
    bm = P.bm
    outer = [[bm.verts.new(V(((R) * math.cos(a) - R, (R) * math.sin(a), z))) for a, z in row] for row in grid]
    inner = [[bm.verts.new(V(((R - T) * math.cos(a) - R, (R - T) * math.sin(a), z))) for a, z in row] for row in grid]
    of, inf = [], []
    for i in range(nu - 1):
        for j in range(nv - 1):
            if (i, j) in ((nu - 2, nv - 2), (nu - 3, nv - 2), (nu - 2, nv - 3)):
                continue   # a bite torn out of one corner
            of.append(bm.faces.new((outer[i][j], outer[i + 1][j], outer[i + 1][j + 1], outer[i][j + 1])))
            inf.append(bm.faces.new((inner[i][j + 1], inner[i + 1][j + 1], inner[i + 1][j], inner[i][j])))
    # rim: connect boundary edges of the outer sheet to the inner sheet
    rim = []
    for e in list(bm.edges):
        if len(e.link_faces) == 1 and e.link_faces[0] in of:
            a, b = e.verts
            ia = inner[[k for k, row in enumerate(outer) if a in row][0]][[row.index(a) for row in outer if a in row][0]]
            ib = inner[[k for k, row in enumerate(outer) if b in row][0]][[row.index(b) for row in outer if b in row][0]]
            try:
                rim.append(bm.faces.new((a, b, ib, ia)))
            except ValueError:
                pass
    P._set(of, mh)
    P._set(inf, md)
    P._set(rim, mg)
    bmesh.ops.recalc_face_normals(bm, faces=of + inf + rim)
    P.inset_panels([f for f in of if random.random() < 0.6], 0.025, 0.008)
    for f in of:                       # scorched patches
        if f.is_valid and random.random() < 0.12:
            P._set([f], mg)
    # stringers on the inside
    for a in (-0.18, 0.12):
        p0 = V(((R - T) * math.cos(a) - R, (R - T) * math.sin(a), -H / 2 + 0.05))
        p1 = V(((R - T) * math.cos(a) - R, (R - T) * math.sin(a), H / 2 - 0.25))
        nrm = V((math.cos(a), math.sin(a), 0))
        P.beam(p0 - nrm * 0.05, p1 - nrm * 0.05, 0.05, mg, h=0.1, up=nrm)


def truss_fragment(P, md, mg, ms):
    random.seed(7)
    w = 0.7
    cs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    lens = [2.1, 1.7, 1.35, 1.95]
    for (cx, cy), L in zip(cs, lens):
        bend = V((random.uniform(-0.1, 0.1), random.uniform(-0.1, 0.1), 0))
        p0 = V((-0.9, cx * w / 2, cy * w / 2))
        pm = V((-0.9 + L * 0.6, cx * w / 2, cy * w / 2))
        p1 = V((-0.9 + L, cx * w / 2, cy * w / 2)) + bend
        P.beam(p0, pm, 0.07, mg)
        P.beam(pm, p1, 0.07, mg)
    for x in (-0.9, -0.3, 0.3):
        pts = [V((x, cx * w / 2, cy * w / 2)) for cx, cy in cs]
        for k in range(4):
            if x == 0.3 and k == 2:
                continue  # a broken frame member
            P.beam(pts[k], pts[(k + 1) % 4], 0.055, ms)
    for x0, x1 in ((-0.9, -0.3), (-0.3, 0.3)):
        for k in (0, 2):
            a = V((x0, cs[k][0] * w / 2, cs[k][1] * w / 2))
            b = V((x1, cs[(k + 1) % 4][0] * w / 2, cs[(k + 1) % 4][1] * w / 2))
            P.beam(a, b, 0.04, md)
    # a dangling cable run and a junction box
    P.cyl(0.025, 1.4, M((-0.1, 0.0, -w / 2 - 0.06), rot=(0, math.pi / 2 + 0.1, 0.15)), ms, segs=6)
    P.box((0.2, 0.16, 0.12), M((-0.6, 0, w / 2 + 0.06)), mg, bevel=0.01)


def tank_shell(P, mh, md, mg):
    random.seed(13)
    segs, arc = 14, math.radians(210)
    R, T, H = 0.8, 0.04, 1.6
    bm = P.bm
    nz = 4
    outer, inner = [], []
    for k in range(segs + 1):
        a = -arc / 2 + arc * k / segs
        col_o, col_i = [], []
        for j in range(nz + 1):
            z = -H / 2 + H * j / nz
            if k in (0, segs) or j in (0, nz):
                z += random.uniform(-0.12, 0.12) if j in (0, nz) else 0
            col_o.append(bm.verts.new(V((R * math.cos(a), R * math.sin(a), z))))
            col_i.append(bm.verts.new(V(((R - T) * math.cos(a), (R - T) * math.sin(a), z))))
        outer.append(col_o)
        inner.append(col_i)
    of, inf, rim = [], [], []
    for k in range(segs):
        for j in range(nz):
            of.append(bm.faces.new((outer[k][j], outer[k + 1][j], outer[k + 1][j + 1], outer[k][j + 1])))
            inf.append(bm.faces.new((inner[k][j + 1], inner[k + 1][j + 1], inner[k + 1][j], inner[k][j])))
    for k in range(segs):
        for j in (0, nz):
            a, b = outer[k][j], outer[k + 1][j]
            ia, ib = inner[k][j], inner[k + 1][j]
            rim.append(bm.faces.new((a, b, ib, ia) if j == 0 else (b, a, ia, ib)))
    for k in (0, segs):
        for j in range(nz):
            a, b = outer[k][j], outer[k][j + 1]
            ia, ib = inner[k][j], inner[k][j + 1]
            rim.append(bm.faces.new((b, a, ia, ib) if k == 0 else (a, b, ib, ia)))
    P._set(of, mh)
    P._set(inf, md)
    P._set(rim, mg)
    bmesh.ops.recalc_face_normals(bm, faces=of + inf + rim)
    for f in of:                       # scorched patches
        if random.random() < 0.12:
            P._set([f], mg)
    # ring frames inside, and a torn pipe stub
    for z in (-0.35, 0.35):
        P.sweep_ring(R - T - 0.04, [(-0.04, -0.03), (0.04, -0.03), (0.04, 0.03), (-0.04, 0.03)], M((0, 0, z)), mg,
                     segs=12, arc=arc * 0.92, closed=False)
    P.cyl(0.08, 0.5, M((R * 0.2, 0, 0.1), z=(1, 0.3, 0.2)), Pal.steel(), segs=8)


def build(i):
    root = kit.empty(f'debris_{i}', size=0.5)
    rockm = kit.mat('rock', (0.06, 0.056, 0.052), metal=0.0, rough=0.88)
    rock2 = kit.mat('rock_fresh', (0.078, 0.073, 0.068), metal=0.0, rough=0.82)
    mh = kit.mat('hull_paint_burnt', (0.17, 0.17, 0.165), metal=0.3, rough=0.55)
    md, mg, ms = Pal.dark(), Pal.gunmetal(), Pal.steel()
    P = Part(f'chunk_{i}')
    if i == 0:
        rock(P, 1, (1.0, 0.8, 0.7), rockm, rock2)
    elif i == 1:
        rock(P, 2, (1.3, 0.6, 0.55), rockm, rock2)
    elif i == 2:
        rock(P, 5, (0.8, 0.75, 0.8), rockm, rock2)
    elif i == 3:
        plate(P, mh, md, mg)
    elif i == 4:
        truss_fragment(P, md, mg, ms)
    else:
        tank_shell(P, mh, md, mg)
    sharp = 28 if i < 3 else 45
    o = P.finish(parent=root, sharp=sharp, weighted=i >= 3)
    # centre on the origin
    bpy.context.view_layer.update()
    bb = [o.matrix_world @ V(c) for c in o.bound_box]
    c = sum(bb, V()) / 8
    o.data.transform(M(-c))
    return root


if __name__ == '__main__':
    a = kit.cli('debris_0')
    outdir = os.path.dirname(a.out)
    for i in range(6):
        kit.reset(seed=100 + i)
        root = build(i)
        kit.export(os.path.join(outdir, f'debris_{i}.glb'), root)
    if a.render:
        # one preview with all six in a row (3 x 2)
        kit.reset(seed=1)
        for i in range(6):
            r = build(i)
            r.location = V(((i % 3) * 2.8 - 2.8, 0, (1 - i // 3) * 2.4 - 1.2))
            r.rotation_euler = (0.3 * i, 0.5 if i == 3 else 0.0, 1.1 if i == 3 else 0.4 * i)
        kit.render(a.render, **kit.view_args(a, -80, 12, 0.8))
