"""Shared helpers for the procedural game assets (Blender 5.x as a Python module, bpy + bmesh).

Every asset script builds one or more *parts* (a bmesh with per-face material indices), turns each
part into a named object (a glTF node), parents them under a root empty, exports a .glb and can
render a Cycles preview. Blender axes: +X is the model's forward (nose), +Z is up. The glTF export
is Y-up, and the game's loader rotates it back so Blender's axes are the game's world axes.
"""
import argparse
import math
import os
import random
import sys

import bpy  # noqa: I001 (bpy must be imported before bmesh)
import bmesh
from mathutils import Matrix, Vector, noise

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
MODELS = os.path.join(ROOT, 'site', 'public', 'game', 'models')

V = Vector


# ------------------------------------------------------------------ command line / scene

def cli(name):
    a = argparse.ArgumentParser(description=f'Build the {name} model')
    a.add_argument('--out', default=os.path.join(MODELS, f'{name}.glb'), help='output .glb')
    a.add_argument('--render', default=None, help='optional preview .png (Cycles, CPU)')
    a.add_argument('--samples', type=int, default=48)
    a.add_argument('--res', default='960x540')
    a.add_argument('--view', default=None, help='az,el[,dist_scale] preview camera override (degrees)')
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    return a.parse_args(argv)


def reset(seed=7):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()
    random.seed(seed)


# ------------------------------------------------------------------ materials

_mats = {}


def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0, coat=0.0, coat_rough=0.05):
    """A Principled material (linear RGB). Specular stays at the glTF default (no
    KHR_materials_specular). For emissive parts use emis(), which knows the game's loader rule."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if coat and 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = coat_rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    m.diffuse_color = (*color, 1)
    _mats[name] = m
    return m


GAME_EMISSIVE_MIN = 2.5   # models.ts: emissiveIntensity = max(exported strength, 2.5)


def emis(name, rgb, level, base=None):
    """Emissive material that shows as rgb * level in the game (rgb: max channel 1).
    The loader multiplies the exported emissive factor by max(strength, 2.5), so levels up to 2.5
    are baked into the factor (strength 1) and brighter ones use KHR_materials_emissive_strength."""
    if name in _mats:
        return _mats[name]
    peak = max(rgb)
    rgb = tuple(c / peak for c in rgb)
    if level <= GAME_EMISSIVE_MIN:
        col, strength = tuple(c * level / GAME_EMISSIVE_MIN for c in rgb), 1.0
    else:
        col, strength = rgb, level
    return mat(name, base if base is not None else tuple(c * 0.2 for c in rgb), metal=0.0, rough=0.5,
               emit=col, strength=strength)


def hexrgb(h):
    """sRGB hex -> linear RGB tuple."""
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


COOL_WHITE = (0.82, 0.92, 1.0)
PALE_CYAN = (0.45, 0.85, 1.0)
WARM_WHITE = (1.0, 0.8, 0.56)


class Pal:
    """Shared hard-sci-fi palette, tuned for the game's lighting (strong ambient + hemisphere fill,
    key 2.2, ACES): light panels sit near 0.3 albedo, structure near 0.03-0.1."""
    @staticmethod
    def hull():      return mat('hull_metal', (0.3, 0.305, 0.31), metal=0.5, rough=0.38)
    @staticmethod
    def hull2():     return mat('hull_metal_dark', (0.155, 0.16, 0.168), metal=0.55, rough=0.42)
    @staticmethod
    def paint():     return mat('hull_paint', (0.36, 0.36, 0.35), metal=0.05, rough=0.5)
    @staticmethod
    def accent():    return mat('accent_slate', (0.05, 0.075, 0.11), metal=0.3, rough=0.42)
    @staticmethod
    def dark():      return mat('structure_dark', (0.03, 0.032, 0.036), metal=0.5, rough=0.45)
    @staticmethod
    def gunmetal():  return mat('gunmetal', (0.09, 0.093, 0.1), metal=0.85, rough=0.35)
    @staticmethod
    def steel():     return mat('steel_brushed', (0.3, 0.31, 0.325), metal=1.0, rough=0.34)
    @staticmethod
    def radiator():  return mat('radiator', (0.04, 0.045, 0.05), metal=0.7, rough=0.28)
    @staticmethod
    def nozzle():    return mat('nozzle_inner', (0.07, 0.06, 0.055), metal=1.0, rough=0.4)
    @staticmethod
    def glass():     return mat('glass_dark', (0.01, 0.012, 0.016), metal=0.0, rough=0.08,
                                emit=(0.012, 0.02, 0.028), strength=1.0)
    # emissive accents: cool white, pale cyan, warm white (never the maths green/red/yellow)
    @staticmethod
    def e_white(level=2.2):  return emis('emit_coolwhite', COOL_WHITE, level)
    @staticmethod
    def e_cyan(level=1.4):   return emis('emit_cyan', PALE_CYAN, level)
    @staticmethod
    def e_warm(level=1.1):   return emis('emit_warm', WARM_WHITE, level)
    @staticmethod
    def e_engine(level=2.0): return emis('emit_engine', (0.55, 0.78, 1.0), level)


# ------------------------------------------------------------------ transforms

def basis(z, up=(0, 0, 1)):
    """3x3 rotation whose local +Z points along z (local +X stays as close to `up` x z as possible)."""
    z = V(z).normalized()
    u = V(up)
    if abs(z.dot(u.normalized())) > 0.98:
        u = V((1, 0, 0)) if abs(z.x) < 0.9 else V((0, 1, 0))
    x = u.cross(z).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed()
    return m


def M(loc=(0, 0, 0), z=None, rot=None, scale=None, up=(0, 0, 1)):
    """4x4 matrix from a location and either a local +Z direction or an euler rot (radians)."""
    if z is not None:
        r = basis(z, up).to_4x4()
    elif rot is not None:
        from mathutils import Euler
        r = Euler(rot).to_matrix().to_4x4()
    else:
        r = Matrix.Identity(4)
    s = Matrix.Identity(4)
    if scale is not None:
        sc = scale if hasattr(scale, '__len__') else (scale, scale, scale)
        s = Matrix.Diagonal((*sc, 1))
    return Matrix.Translation(V(loc)) @ r @ s


AX = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1), '-x': (-1, 0, 0), '-y': (0, -1, 0), '-z': (0, 0, -1)}


# ------------------------------------------------------------------ parts (bmesh builders)

class Part:
    """A bmesh being built for one node. Every builder returns the faces it created."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _set(self, faces, m):
        i = self.mi(m)
        for f in faces:
            f.material_index = i
        return faces

    # -- primitives
    def box(self, size, mtx, m, bevel=0.0, seg=1):
        """Box of `size` (x, y, z) in the frame of `mtx` (a Matrix or a location). With
        M(loc, z=n, up=u) the local axes are x = u x n, y = n x x (close to u), z = n."""
        mtx = mtx if isinstance(mtx, Matrix) else M(mtx)
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mtx @ Matrix.Diagonal((*size, 1)))
        verts = r['verts']
        faces = list({f for v in verts for f in v.link_faces})
        if bevel > 0:
            edges = list({e for v in verts for e in v.link_edges})
            b = bmesh.ops.bevel(self.bm, geom=edges + verts, offset=bevel, segments=seg, affect='EDGES',
                                clamp_overlap=True, profile=0.5)
            faces = list(set(faces) | set(b['faces']))
            faces = [f for f in faces if f.is_valid]
            faces = list({f for f in faces} | {f for v in b['verts'] for f in v.link_faces})
        return self._set(faces, m)

    def cyl(self, r, depth, mtx, m, segs=24, r2=None, caps=True, bevel=0.0):
        """Cylinder/cone along local Z, centred."""
        mtx = mtx if isinstance(mtx, Matrix) else M(mtx)
        res = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r,
                                    radius2=r if r2 is None else r2, depth=depth, matrix=mtx)
        verts = res['verts']
        faces = list({f for v in verts for f in v.link_faces})
        if bevel > 0 and caps:
            edges = [e for e in {e for v in verts for e in v.link_edges} if len(e.link_faces) == 2 and
                     e.calc_face_angle(0) > 0.6]
            b = bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, affect='EDGES', clamp_overlap=True)
            faces = [f for f in set(faces) | set(b['faces']) if f.is_valid]
            faces = list(set(faces) | {f for e in b['edges'] if e.is_valid for f in e.link_faces})
        return self._set(faces, m)

    def sphere(self, r, mtx, m, u=16, v=8, ico=None):
        mtx = mtx if isinstance(mtx, Matrix) else M(mtx)
        if ico is not None:
            res = bmesh.ops.create_icosphere(self.bm, subdivisions=ico, radius=r, matrix=mtx)
        else:
            res = bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=r, matrix=mtx)
        faces = list({f for vv in res['verts'] for f in vv.link_faces})
        return self._set(faces, m)

    def poly(self, pts, m):
        """A single face from world points."""
        vs = [self.bm.verts.new(V(p)) for p in pts]
        return self._set([self.bm.faces.new(vs)], m)

    def loft(self, rings, m, cap0=True, cap1=True, closed=True):
        """rings: list of lists of 3-D points (same count). Returns (faces, ring_verts)."""
        rv = [[self.bm.verts.new(V(p)) for p in ring] for ring in rings]
        faces = []
        n = len(rings[0])
        for a, b in zip(rv, rv[1:]):
            for i in range(n if closed else n - 1):
                j = (i + 1) % n
                faces.append(self.bm.faces.new((a[i], a[j], b[j], b[i])))
        if cap0 and closed:
            faces.append(self.bm.faces.new(list(reversed(rv[0]))))
        if cap1 and closed:
            faces.append(self.bm.faces.new(rv[-1]))
        self._set(faces, m)
        return faces, rv

    def prism(self, pts2d, depth, mtx, m, center=True):
        """Extrude a 2-D polygon (local XY, CCW) along local Z."""
        mtx = mtx if isinstance(mtx, Matrix) else M(mtx)
        z0, z1 = (-depth / 2, depth / 2) if center else (0, depth)
        rings = [[mtx @ V((x, y, z0)) for x, y in pts2d], [mtx @ V((x, y, z1)) for x, y in pts2d]]
        f, _ = self.loft(rings, m)
        return f

    def lathe(self, prof, mtx, m, segs=24, close0=False, close1=False, phase=0.0):
        """Revolve a profile [(z, r), ...] around local Z. Returns faces."""
        mtx = mtx if isinstance(mtx, Matrix) else M(mtx)
        rings = []
        for z, r in prof:
            rings.append([mtx @ V((r * math.cos(2 * math.pi * i / segs + phase), r * math.sin(2 * math.pi * i / segs + phase), z))
                          for i in range(segs)])
        faces, rv = self.loft(rings, m, cap0=close0, cap1=close1)
        return faces

    def sweep_ring(self, R, section, mtx, m, segs=48, arc=2 * math.pi, closed=True):
        """Sweep a 2-D section [(dr, dz), ...] (CCW) around local Z at radius R (a torus-like ring)."""
        mtx = mtx if isinstance(mtx, Matrix) else M(mtx)
        n = segs if closed else segs + 1
        rings = []
        for i in range(n):
            a = arc * i / segs
            c, s = math.cos(a), math.sin(a)
            rings.append([mtx @ V(((R + dr) * c, (R + dr) * s, dz)) for dr, dz in section])
        rv = [[self.bm.verts.new(p) for p in ring] for ring in rings]
        faces = []
        k = len(section)
        pairs = list(zip(rv, rv[1:])) + ([(rv[-1], rv[0])] if closed else [])
        for a, b in pairs:
            for i in range(k):
                j = (i + 1) % k
                faces.append(self.bm.faces.new((a[i], b[i], b[j], a[j])))
        if not closed:
            faces.append(self.bm.faces.new(rv[0]))
            faces.append(self.bm.faces.new(list(reversed(rv[-1]))))
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        return self._set(faces, m)

    def beam(self, p0, p1, w, m, h=None, segs=None, up=(0, 0, 1), bevel=0.0):
        """A box (or `segs`-sided tube) from p0 to p1."""
        p0, p1 = V(p0), V(p1)
        d = p1 - p0
        L = d.length
        if L < 1e-6:
            return []
        mtx = M((p0 + p1) / 2, z=d, up=up)
        if segs:
            return self.cyl(w, L, mtx, m, segs=segs)
        return self.box((w, h if h is not None else w, L), mtx, m, bevel=bevel)

    def truss(self, p0, p1, w, rod, m, bays=4, up=(0, 0, 1), node_m=None, diag=True, segs=4):
        """A square box truss from p0 to p1: 4 longerons, frames at each bay and diagonals."""
        p0, p1 = V(p0), V(p1)
        d = (p1 - p0)
        R = basis(d, up)
        ex, ey = R.col[0], R.col[1]
        corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
        h = w / 2
        out = []
        for cx, cy in corners:
            o = ex * cx * h + ey * cy * h
            out += self.beam(p0 + o, p1 + o, rod, m, segs=segs)
        for b in range(bays + 1):
            t = b / bays
            c = p0 + d * t
            pts = [c + ex * cx * h + ey * cy * h for cx, cy in corners]
            for i in range(4):
                out += self.beam(pts[i], pts[(i + 1) % 4], rod * 0.8, node_m or m, segs=segs)
            if diag and b < bays:
                c2 = p0 + d * ((b + 1) / bays)
                pts2 = [c2 + ex * cx * h + ey * cy * h for cx, cy in corners]
                for i in range(4):
                    a_, b_ = (pts[i], pts2[(i + 1) % 4]) if b % 2 == 0 else (pts[(i + 1) % 4], pts2[i])
                    out += self.beam(a_, b_, rod * 0.7, m, segs=segs)
        return out

    # -- operations
    def inset_panels(self, faces, thick, depth, m_panel=None, m_groove=None, choose=None):
        """Inset each face (panel with a groove). Returns the new inner panel faces."""
        faces = [f for f in faces if f.is_valid]
        if not faces:
            return []
        r = bmesh.ops.inset_individual(self.bm, faces=faces, thickness=thick, depth=depth,
                                       use_even_offset=True, use_relative_offset=False)
        if m_groove is not None:
            self._set(r['faces'], m_groove)
        inner = faces  # inset_individual keeps the original faces as the inner ones
        if m_panel is not None:
            self._set([f for f in inner if f.is_valid], m_panel)
        return [f for f in inner if f.is_valid]

    def extrude_faces(self, faces, dist, m_side=None):
        faces = [f for f in faces if f.is_valid]
        r = bmesh.ops.extrude_discrete_faces(self.bm, faces=faces)
        new = r['faces']
        for f in new:
            n = f.normal.copy()
            for v in f.verts:
                v.co += n * dist
        if m_side is not None:
            sides = {g for f in new for e in f.edges for g in e.link_faces if g not in new}
            self._set(list(sides), m_side)
        return new

    def transform(self, faces, mtx):
        verts = list({v for f in faces for v in f.verts})
        bmesh.ops.transform(self.bm, matrix=mtx, verts=verts)

    def copy_mirror_y(self, faces):
        """Duplicate faces mirrored across the XZ plane (y -> -y)."""
        r = bmesh.ops.duplicate(self.bm, geom=list(faces))
        nf = [g for g in r['geom'] if isinstance(g, bmesh.types.BMFace)]
        nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
        for v in nv:
            v.co.y = -v.co.y
        bmesh.ops.reverse_faces(self.bm, faces=nf)
        return nf

    # -- finishing
    def finish(self, parent=None, sharp=48, weighted=True, loc=None, merge=0.0, pivot=None):
        """Build the object. Faces are shaded smooth, edges sharper than `sharp` degrees are split,
        and face-area weighted normals keep large panels flat while chamfers stay soft."""
        bm = self.bm
        if merge > 0:
            bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge)
        bm.normal_update()
        lim = math.radians(sharp)
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) != 2:
                e.smooth = False
            else:
                try:
                    e.smooth = e.calc_face_angle(0) < lim
                except ValueError:
                    e.smooth = False
        me = bpy.data.meshes.new(self.name)
        bm.to_mesh(me)
        bm.free()
        for m in self.mats:
            me.materials.append(m)
        o = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(o)
        if pivot is None and loc is not None:
            pivot = Matrix.Translation(V(loc))
        if pivot is not None:
            # move the origin (the node's pivot, possibly rotated) without moving the geometry
            me.transform(pivot.inverted())
            o.matrix_world = pivot
        if weighted and len(me.polygons):
            wm = o.modifiers.new('wn', 'WEIGHTED_NORMAL')
            wm.mode = 'FACE_AREA'
            wm.weight = 50
            wm.keep_sharp = True
            apply_modifiers(o)
        if parent is not None:
            set_parent(o, parent)
        return o


def bake_scale(root, s):
    """Uniformly scale a finished hierarchy into its mesh data and local offsets (export stays unscaled)."""
    done = set()
    for o in root.children_recursive:
        if o.type == 'MESH' and o.data.name not in done:
            o.data.transform(Matrix.Diagonal((s, s, s, 1)))
            done.add(o.data.name)
        o.location = o.location * s
        if o.type == 'EMPTY':
            o.empty_display_size *= s
    bpy.context.view_layer.update()


def apply_modifiers(o):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = o.data
    o.modifiers.clear()
    o.data = me
    name = old.name
    if old.users == 0:
        bpy.data.meshes.remove(old)
    me.name = name


def empty(name, loc=(0, 0, 0), parent=None, size=0.2, rot=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = size
    bpy.context.scene.collection.objects.link(e)
    e.location = V(loc)
    if rot is not None:
        e.rotation_euler = rot
    if parent is not None:
        set_parent(e, parent)
    return e


def set_parent(child, parent):
    """Parent keeping the child's world transform (with the parent's inverse baked into the local)."""
    bpy.context.view_layer.update()
    w = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = Matrix.Identity(4)
    child.matrix_world = w  # sets a plain local transform relative to the parent
    bpy.context.view_layer.update()


def instance(name, src, mtx, parent=None):
    """A linked duplicate (shares mesh data: stored once in the glTF)."""
    o = bpy.data.objects.new(name, src.data)
    bpy.context.scene.collection.objects.link(o)
    o.matrix_world = mtx if isinstance(mtx, Matrix) else M(mtx)
    if parent is not None:
        set_parent(o, parent)
    return o


# ------------------------------------------------------------------ export / stats

def tri_count(objs=None):
    objs = objs or [o for o in bpy.context.scene.objects if o.type == 'MESH']
    n = 0
    for o in objs:
        o.data.calc_loop_triangles()
        n += len(o.data.loop_triangles)
    return n


def export(path, root):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root, *root.children_recursive]:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
        export_texcoords=False, export_normals=True, export_tangents=False, export_cameras=False,
        export_lights=False, export_animations=False, export_extras=False, export_vertex_color='NONE')
    size = os.path.getsize(path)
    meshes = [o for o in [root, *root.children_recursive] if o.type == 'MESH']
    tris = tri_count(meshes)
    unique = len({o.data.name for o in meshes})
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ V(c) for o in meshes for c in o.bound_box]
    lo = V((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = V((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    print(f'[export] {os.path.relpath(path, ROOT)}  {tris} triangles  {len(meshes)} mesh nodes ({unique} unique meshes)'
          f'  {size / 1024:.0f} KB  bounds x {lo.x:.2f}..{hi.x:.2f} y {lo.y:.2f}..{hi.y:.2f} z {lo.z:.2f}..{hi.z:.2f}')
    names = [o.name for o in root.children_recursive if not o.name.startswith('_')]
    print('[nodes]', ', '.join(sorted(names))[:2000])
    return tris, size


# ------------------------------------------------------------------ preview render

def _compositor_bloom(scn, threshold=1.0, strength=0.35, size=7):
    try:
        tree = bpy.data.node_groups.new('comp', 'CompositorNodeTree')
        tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        rl = tree.nodes.new('CompositorNodeRLayers')
        gl = tree.nodes.new('CompositorNodeGlare')
        gl.inputs['Type'].default_value = 'Bloom'
        gl.inputs['Threshold'].default_value = threshold
        gl.inputs['Strength'].default_value = strength
        gl.inputs['Size'].default_value = size / 10 if size > 1 else size
        out = tree.nodes.new('NodeGroupOutput')
        tree.links.new(rl.outputs['Image'], gl.inputs['Image'])
        tree.links.new(gl.outputs['Image'], out.inputs[0])
        scn.render.compositor_device = 'CPU'
        scn.compositing_node_group = tree
        scn.render.use_compositing = True
    except Exception as e:  # preview only: carry on without bloom
        print('[render] no bloom:', e)


def render(path, az=-55, el=22, dist_scale=1.0, samples=48, res='960x540', target=None, lens=50,
           env=0.75, key=2.2, rim=1.2, bloom=True, cam_loc=None, look=None, extra_lights=(), bg=(0.004, 0.006, 0.012),
           clip_end=2000, softbox=0.8, bounces=6, exposure=0.6):
    """Cycles preview: dark space background, soft studio reflections, key light and cyan rim
    (same directions as the game's lights), 3/4 view auto-framed on the scene's bounds."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    scn.cycles.max_bounces = bounces
    try:
        scn.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    w, h = (int(x) for x in res.split('x'))
    scn.render.resolution_x, scn.render.resolution_y = w, h
    scn.render.resolution_percentage = 100
    for vt in ('ACES 1.3', 'ACES 2.0', 'AgX'):
        try:
            scn.view_settings.view_transform = vt
            break
        except Exception:
            continue
    scn.view_settings.look = 'None'
    scn.view_settings.exposure = exposure
    # world: camera rays see near-black space, everything else sees a soft blue-grey studio gradient
    world = bpy.data.worlds.new('w')
    scn.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.2
    ramp.color_ramp.elements[0].color = (0.3, 0.33, 0.42, 1)
    ramp.color_ramp.elements[1].position = 0.8
    ramp.color_ramp.elements[1].color = (0.75, 0.82, 1.0, 1)
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1
    mr.inputs['From Max'].default_value = 1
    env_bg = nt.nodes.new('ShaderNodeBackground')
    env_bg.inputs['Strength'].default_value = env
    cam_bg = nt.nodes.new('ShaderNodeBackground')
    cam_bg.inputs['Color'].default_value = (*bg, 1)
    lp = nt.nodes.new('ShaderNodeLightPath')
    mix = nt.nodes.new('ShaderNodeMixShader')
    L = nt.links
    L.new(tc.outputs['Generated'], sep.inputs[0])
    L.new(sep.outputs['Z'], mr.inputs['Value'])
    L.new(mr.outputs['Result'], ramp.inputs['Fac'])
    L.new(ramp.outputs['Color'], env_bg.inputs['Color'])
    L.new(lp.outputs['Is Camera Ray'], mix.inputs['Fac'])
    L.new(env_bg.outputs[0], mix.inputs[1])
    L.new(cam_bg.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs['Surface'])

    def sun(name, frm, strength, color, angle=3.0):
        ld = bpy.data.lights.new(name, 'SUN')
        ld.energy = strength
        ld.color = color
        ld.angle = math.radians(angle)
        lo = bpy.data.objects.new(name, ld)
        scn.collection.objects.link(lo)
        lo.rotation_euler = (-V(frm)).to_track_quat('-Z', 'Y').to_euler()
        return lo

    sun('_key', (6, -8, 14), key, (1.0, 0.97, 0.93))
    sun('_rim', (-10, 12, -4), rim, (0.35, 0.88, 1.0))
    for i, (loc, energy, col, size) in enumerate(extra_lights):
        ld = bpy.data.lights.new(f'_pt{i}', 'POINT')
        ld.energy = energy
        ld.color = col
        ld.shadow_soft_size = size
        lo = bpy.data.objects.new(f'_pt{i}', ld)
        lo.location = loc
        scn.collection.objects.link(lo)

    # frame the bounds
    pts = []
    for o in scn.objects:
        if o.type == 'MESH':
            pts += [o.matrix_world @ V(c) for c in o.bound_box]
    lo_ = V((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi_ = V((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = V(target) if target is not None else (lo_ + hi_) / 2
    r = (hi_ - lo_).length / 2
    cam = bpy.data.objects.new('_cam', bpy.data.cameras.new('_cam'))
    scn.collection.objects.link(cam)
    scn.camera = cam
    cam.data.lens = lens
    cam.data.clip_end = clip_end
    cam.data.clip_start = 0.02
    if cam_loc is not None:
        cam.location = V(cam_loc)
        tgt = V(look) if look is not None else c
    else:
        fh = 2 * math.atan(18.0 / lens)                      # 36 mm sensor across the wide side
        fv = 2 * math.atan(math.tan(fh / 2) * min(w, h) / max(w, h))
        d = r / math.sin(fv / 2) * 0.82 * dist_scale
        a, e = math.radians(az), math.radians(el)
        cam.location = c + V((math.cos(e) * math.cos(a), math.cos(e) * math.sin(a), math.sin(e))) * d
        tgt = c
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    if softbox:
        # large soft panels seen only in reflections, like the game's RoomEnvironment map
        for i, (dirv, k) in enumerate([((0.3, -0.4, 1.0), softbox), ((-0.6, 0.8, 0.3), softbox * 0.6), ((1, 0.2, -0.2), softbox * 0.5)]):
            ld = bpy.data.lights.new(f'_soft{i}', 'AREA')
            ld.shape = 'RECTANGLE'
            ld.size, ld.size_y = 2.5 * r, 1.2 * r
            ld.energy = k * ld.size * ld.size_y
            ld.color = (0.9, 0.95, 1.0)
            lo = bpy.data.objects.new(f'_soft{i}', ld)
            scn.collection.objects.link(lo)
            lo.location = c + V(dirv).normalized() * 4 * r
            lo.rotation_euler = (c - lo.location).to_track_quat('-Z', 'Y').to_euler()
            try:
                lo.visible_diffuse = False
            except Exception:
                pass
    for mm in bpy.data.materials:              # emulate models.ts: emissiveIntensity >= 2.5
        b = mm.node_tree.nodes.get('Principled BSDF') if mm.node_tree else None
        if b and b.inputs['Emission Strength'].default_value > 0 and max(b.inputs['Emission Color'].default_value[:3]) > 0:
            b.inputs['Emission Strength'].default_value = max(b.inputs['Emission Strength'].default_value, GAME_EMISSIVE_MIN)
    if bloom:
        _compositor_bloom(scn)
    scn.render.filepath = path
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print('[render]', path)


def view_args(a, az, el, ds=1.0, **kw):
    if a.view:
        p = [float(x) for x in a.view.split(',')]
        az, el = p[0], p[1]
        if len(p) > 2:
            ds = p[2]
    return dict(az=az, el=el, dist_scale=ds, samples=a.samples, res=a.res, **kw)


# ------------------------------------------------------------------ misc

def rnd(a, b):
    return random.uniform(a, b)


def chance(p):
    return random.random() < p


def fbm(p, octaves=4):
    return noise.fractal(V(p), 0.5, 2.0, octaves, noise_basis='PERLIN_ORIGINAL')
