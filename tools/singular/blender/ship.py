"""Procedural survey ship for the game (Blender 5 / bpy). Exports a .glb and an optional preview render.
  python ship.py --out ship.glb [--render preview.png]
"""
import bpy, bmesh, math, sys, argparse
from mathutils import Vector, Matrix

def args():
    a = argparse.ArgumentParser()
    a.add_argument('--out', required=True)
    a.add_argument('--render', default=None)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    return a.parse_args(argv)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, base, metal=0.6, rough=0.35, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*base, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m

def obj_from_bm(name, bm, material=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    if material: o.data.materials.append(material)
    return o

def loft(name, sections, material, segs=24, cap=True):
    """sections: list of (x, ry, rz, yoff, zoff, squareness). Hull runs along +X."""
    bm = bmesh.new()
    rings = []
    for (x, ry, rz, yo, zo, sq) in sections:
        ring = []
        for i in range(segs):
            t = 2 * math.pi * i / segs
            c, s = math.cos(t), math.sin(t)
            # superellipse for a slightly boxy hull
            p = 2.0 / (2.0 + 4.0 * sq)
            cy = math.copysign(abs(c) ** p, c); sz = math.copysign(abs(s) ** p, s)
            ring.append(bm.verts.new((x, yo + ry * cy, zo + rz * sz)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bm.normal_update()
    o = obj_from_bm(name, bm, material)
    for f in o.data.polygons: f.use_smooth = True
    return o

def add_mod(o, kind, **kw):
    m = o.modifiers.new(kind.lower(), kind)
    for k, v in kw.items(): setattr(m, k, v)
    return m

def box(name, size, loc, material, bevel=0.02):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(loc)
    o = obj_from_bm(name, bm, material)
    if bevel: add_mod(o, 'BEVEL', width=bevel, segments=2)
    return o

def cyl(name, r, depth, loc, axis, material, verts=32, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    rot = {'x': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'y': Matrix.Rotation(math.pi / 2, 4, 'X'), 'z': Matrix.Identity(4)}[axis]
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(loc)) @ rot, verts=bm.verts)
    o = obj_from_bm(name, bm, material)
    for f in o.data.polygons: f.use_smooth = True
    return o

def build():
    hullm = mat('hull', (0.62, 0.66, 0.72), metal=0.7, rough=0.32)
    darkm = mat('dark', (0.08, 0.09, 0.11), metal=0.5, rough=0.5)
    trimm = mat('trim', (0.85, 0.55, 0.2), metal=0.8, rough=0.3)
    glowc = mat('glow_cyan', (0.1, 0.6, 0.8), metal=0, rough=0.4, emit=(0.35, 0.88, 1.0), strength=12)
    glowe = mat('glow_engine', (0.3, 0.5, 1.0), metal=0, rough=0.4, emit=(0.45, 0.75, 1.0), strength=30)
    window = mat('window', (0.9, 0.8, 0.5), metal=0, rough=0.2, emit=(1.0, 0.82, 0.55), strength=6)

    # main hull: nose at +X
    hull = loft('hull', [
        (-3.2, 0.55, 0.42, 0, 0.0, 0.6),
        (-2.6, 0.78, 0.55, 0, 0.0, 0.7),
        (-1.0, 0.85, 0.62, 0, 0.05, 0.7),
        (0.6, 0.78, 0.58, 0, 0.08, 0.65),
        (1.8, 0.58, 0.45, 0, 0.06, 0.5),
        (2.7, 0.30, 0.25, 0, 0.02, 0.3),
        (3.15, 0.06, 0.06, 0, 0.0, 0.0),
    ], hullm, segs=32)
    add_mod(hull, 'SUBSURF', levels=1, render_levels=1)

    # dorsal spine and bridge
    box('spine', (2.6, 0.18, 0.12), (-0.4, 0, 0.66), darkm, 0.04)
    bridge = loft('bridge', [(0.4, 0.22, 0.16, 0, 0.62, 0.3), (1.0, 0.26, 0.2, 0, 0.66, 0.3), (1.5, 0.12, 0.1, 0, 0.64, 0.2)], darkm, segs=20)
    box('bridge_glass', (0.32, 0.36, 0.05), (1.02, 0, 0.82), glowc, 0.01)

    # engine block + nacelles
    for side in (-1, 1):
        cyl(f'nacelle_{side}', 0.32, 2.4, (-2.0, side * 1.25, -0.05), 'x', hullm, 32)
        cyl(f'nacelle_ring_{side}', 0.36, 0.14, (-0.9, side * 1.25, -0.05), 'x', trimm, 32)
        cyl(f'nozzle_{side}', 0.26, 0.4, (-3.35, side * 1.25, -0.05), 'x', darkm, 32, r2=0.32)
        cyl(f'engine_glow_{side}', 0.22, 0.05, (-3.56, side * 1.25, -0.05), 'x', glowe, 32)
        box(f'pylon_{side}', (0.9, 0.5, 0.08), (-1.9, side * 0.85, -0.05), darkm, 0.03)
        # radiator fins
        for k in range(4):
            box(f'fin_{side}_{k}', (0.28, 0.02, 0.5), (-2.6 + k * 0.32, side * 1.25, 0.48), darkm, 0.005)
    cyl('main_nozzle', 0.34, 0.5, (-3.4, 0, 0.0), 'x', darkm, 32, r2=0.42)
    cyl('main_glow', 0.3, 0.05, (-3.66, 0, 0.0), 'x', glowe, 32)

    # running lights and windows
    for k in range(7):
        box(f'win_{k}', (0.09, 0.02, 0.05), (-1.6 + k * 0.38, 0.84, 0.18), window, 0)
        box(f'winr_{k}', (0.09, 0.02, 0.05), (-1.6 + k * 0.38, -0.84, 0.18), window, 0)
    box('stripe_l', (3.2, 0.012, 0.025), (-0.3, 0.86, -0.12), glowc, 0)
    box('stripe_r', (3.2, 0.012, 0.025), (-0.3, -0.86, -0.12), glowc, 0)

    # sensor dish under the nose
    dish = cyl('dish_arm', 0.04, 0.5, (1.4, 0, -0.62), 'z', darkm, 12)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.4)
    for v in list(bm.verts):
        if v.co.z > -0.12: bm.verts.remove(v) if False else None
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > -0.15], context='VERTS')
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector((1.4, 0, -0.55))) @ Matrix.Rotation(math.pi, 4, 'X') @ Matrix.Scale(1.0, 4), verts=bm.verts)
    d = obj_from_bm('dish', bm, trimm)
    add_mod(d, 'SOLIDIFY', thickness=0.02)

def apply_all():
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            with bpy.context.temp_override(object=o, active_object=o):
                bpy.ops.object.modifier_apply(modifier=m.name)

def join_all(name):
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, selected_objects=meshes):
        bpy.ops.object.join()
    meshes[0].name = name
    return meshes[0]

def render_preview(path):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 48
    scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 960, 540
    world = bpy.data.worlds.new('w'); scn.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.012, 0.025, 1)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scn.collection.objects.link(cam); scn.camera = cam
    cam.location = (5.5, -5.5, 2.6)
    direction = Vector((0, 0, 0)) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 42
    for (loc, e, col) in [((6, -4, 6), 900, (1, 0.95, 0.9)), ((-6, 5, 2), 500, (0.4, 0.7, 1.0))]:
        L = bpy.data.objects.new('l', bpy.data.lights.new('l', 'POINT'))
        L.data.energy = e; L.data.color = col; L.location = loc
        scn.collection.objects.link(L)
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    a = args()
    reset()
    build()
    apply_all()
    ship = join_all('ship')
    bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=False, export_apply=True, export_yup=True)
    print('exported', a.out, len(ship.data.polygons), 'faces')
    if a.render: render_preview(a.render)
