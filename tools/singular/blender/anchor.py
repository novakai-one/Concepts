"""Anchor: an ancient alien structure. A gloss-black monolith core (a parallelepiped spanned by the
three spire directions, so the core itself is the sheared unit cube) with three long segmented
spires along the non-orthogonal axes (1, 0.2, 0.1), (0.3, 1, 0), (0, 0.2, 1), and fine pale violet
seams glowing along the spire edges and around the core panels.

  <blender-python> tools/singular/blender/anchor.py [--render preview.png]

Size: core about 0.95 tall, spire tips about 2.3 units from the core centre (scale it in the game).
Nodes the game can use: anchor (root) > core, spire_1, spire_2, spire_3. Each spire node has its
origin at the core centre and its local +X along the spire; spire_N_tip marks the tip.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Part, V  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Matrix  # noqa: E402

DIRS = [V((1, 0.2, 0.1)).normalized(), V((0.3, 1, 0)).normalized(), V((0, 0.2, 1)).normalized()]
HALF = (0.8, 0.8, 1.55)       # core half-extents along each direction (a tall sheared slab)
SPIRE = (6.6, 6.6, 6.0)       # spire lengths beyond the core face


def materials():
    black = kit.mat('obsidian', (0.005, 0.005, 0.007), metal=0.0, rough=0.18, coat=1.0, coat_rough=0.04)
    black2 = kit.mat('obsidian_matte', (0.012, 0.012, 0.015), metal=0.3, rough=0.42)
    violet = kit.hexrgb('#b9a8ff')
    seam = kit.emis('seam_violet', violet, 1.5)
    seam_dim = kit.emis('seam_violet_dim', violet, 0.45, base=(0.02, 0.016, 0.04))
    return black, black2, seam, seam_dim


def core(root, mats):
    black, black2, seam, seam_dim = mats
    P = Part('core')
    bm = P.bm
    vs = {}
    for a in (-1, 1):
        for b in (-1, 1):
            for c in (-1, 1):
                vs[(a, b, c)] = bm.verts.new(DIRS[0] * a * HALF[0] + DIRS[1] * b * HALF[1] + DIRS[2] * c * HALF[2])
    quads = [((1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)), ((-1, -1, -1), (-1, -1, 1), (-1, 1, 1), (-1, 1, -1)),
             ((-1, 1, -1), (-1, 1, 1), (1, 1, 1), (1, 1, -1)), ((-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)),
             ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)), ((-1, -1, -1), (-1, 1, -1), (1, 1, -1), (1, -1, -1))]
    faces = [bm.faces.new([vs[k] for k in q]) for q in quads]
    bmesh.ops.recalc_face_normals(bm, faces=faces)
    P._set(faces, black)
    b = bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=0.07, segments=2, affect='EDGES',
                        clamp_overlap=True, profile=0.5)
    P._set([f for f in bm.faces], black)
    big = [f for f in bm.faces if f.calc_area() > 0.5]
    # frame -> thin glowing seam -> recessed matte panel
    P.inset_panels(big, 0.16, 0.0)
    inner = [f for f in big if f.is_valid]
    r = bmesh.ops.inset_individual(bm, faces=inner, thickness=0.018, depth=-0.012, use_even_offset=True)
    P._set(r['faces'], seam)
    P._set(inner, black2)
    r2 = bmesh.ops.inset_individual(bm, faces=inner, thickness=0.05, depth=-0.03, use_even_offset=True)
    P._set(r2['faces'], black2)
    P._set(inner, black)
    # glyph seams: short grooves of light on the panels
    for f in inner:
        c = f.calc_center_median()
        n = f.normal
        es = sorted(f.edges, key=lambda e: -e.calc_length())
        t = (es[0].verts[1].co - es[0].verts[0].co).normalized()
        u = n.cross(t).normalized()
        L = es[0].calc_length()
        W = min(e.calc_length() for e in f.edges)
        for k in range(7):
            v = (k - 3) / 3.6 * W * 0.5
            ln = (0.25 + 0.5 * kit.random.random()) * L * 0.8
            off = kit.rnd(-0.5, 0.5) * (L * 0.8 - ln)
            P.box((0.012, 0.008, ln), M(c + t * off + u * v + n * 0.002, z=t, up=n), seam_dim)
    return P.finish(parent=root, sharp=40)


def notched(rx, ry, g, twist):
    """Diamond section (half-widths rx, ry) with a V notch at each corner (the seam), rotated by twist."""
    cs = [V((rx, 0)), V((0, ry)), V((-rx, 0)), V((0, -ry))]
    pts = []
    for i in range(4):
        p, pr, nx = cs[i], cs[i - 1], cs[(i + 1) % 4]
        pts.append(p + (pr - p).normalized() * g)
        pts.append(p * (1 - g * 1.4 / p.length))
        pts.append(p + (nx - p).normalized() * g)
    c, s = math.cos(twist), math.sin(twist)
    return [V((x * c - y * s, x * s + y * c)) for x, y in pts]


def spire(root, i, mats):
    black, black2, seam, seam_dim = mats
    d = DIRS[i]
    up = DIRS[(i + 2) % 3] - DIRS[(i + 2) % 3].dot(d) * d
    R = kit.basis(d, up=up)            # local Z = d
    ex, ey = R.col[0], R.col[1]
    P = Part(f'spire_{i + 1}')
    start = d * (HALF[i] * 0.5)
    zf = HALF[i] * 0.5                 # distance from `start` to the core face
    Ls = SPIRE[i]
    total = zf + Ls
    nseg = 5
    root_len = 0.75

    def radius(z):
        """Flared crystalline root at the core face, then a long taper to the tip."""
        if z <= zf:
            return 0.72
        if z <= zf + root_len:
            t = (z - zf) / root_len
            t = t * t * (3 - 2 * t)
            return 0.72 + (0.42 - 0.72) * t
        t = (z - zf - root_len) / (total - zf - root_len)
        return max(0.004, 0.42 * (1 - t) ** 0.85)

    bounds = [0.0, zf + root_len] + [zf + root_len + (total - zf - root_len) * k / (nseg - 1) for k in range(1, nseg)]
    gap = 0.08
    for s in range(len(bounds) - 1):
        a = bounds[s]
        tip = s == len(bounds) - 2
        b = bounds[s + 1] - (0 if tip else gap)
        if s == 0:
            steps = [0.0] + [zf / b + (1 - zf / b) * q for q in (0.0, 0.25, 0.5, 0.75, 1.0)]
        else:
            steps = [0.0, 0.05, 0.14, 0.6, 1.0] if not tip else [0.0, 0.05, 0.14, 0.45, 0.8, 1.0]
        rings = []
        for t in steps:
            z = a + (b - a) * t
            bulge = 1.0 if s == 0 else 1.0 + (0.12 if 0.03 < t < 0.2 else 0.0) - 0.08 * t
            rad = radius(z) * bulge if not (tip and t == 1.0) else 0.004
            g = min(0.03, rad * 0.1)
            sec = notched(rad, rad * 0.72, g, twist=(z / total) * math.radians(50))
            rings.append([start + d * z + ex * x + ey * y for x, y in sec])
        faces, rv = P.loft(rings, black, cap0=True, cap1=not tip)
        n = len(rings[0])
        for f in faces:
            if len(f.verts) != 4:
                P._set([f], black2)
        idx = {v: j for row in rv for j, v in enumerate(row)}
        # notch faces carry the seam on the two side edges (corners 0 and 2 of the diamond)
        for f in faces:
            if len(f.verts) == 4:
                ks = sorted({idx[v] for v in f.verts})
                if ks in ([k, k + 1] for k in (0, 6)) or ks in ([k + 1, k + 2] for k in (0, 6)):
                    P._set([f], seam)
        if not tip:
            zc = b + gap / 2
            P.cyl(radius(zc) * 0.42, gap + 0.02, Matrix.Translation(start + d * zc) @ R.to_4x4(), seam, segs=8)
    tipp = start + d * total
    # node frame: origin at the core centre, local +X along the spire
    yv = (ey - ey.dot(d) * d).normalized()
    zv = d.cross(yv)
    pivot = Matrix((d, yv, zv)).transposed().to_4x4()
    o = P.finish(parent=root, pivot=pivot, sharp=40)
    kit.empty(f'spire_{i + 1}_tip', tipp, parent=o, size=0.3)
    return o


EXPORT_SCALE = 0.3   # tips ~2.3 units from the core centre (matches the game's stand-in at scale 1)


def build():
    mats = materials()
    root = kit.empty('anchor', (0, 0, 0), size=1)
    core(root, mats)
    for i in range(3):
        spire(root, i, mats)
    kit.bake_scale(root, EXPORT_SCALE)
    return root


if __name__ == '__main__':
    a = kit.cli('anchor')
    kit.reset(seed=3)
    root = build()
    kit.export(a.out, root)
    if a.render:
        kit.render(a.render, **kit.view_args(a, -62, 16, 0.95, target=(0.48, 0.48, 0.54)))
