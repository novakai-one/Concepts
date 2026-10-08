# Procedural Blender models for the game

Each script builds one asset from code (bpy + bmesh) and writes a glTF binary to
`site/public/singular/models/`. `kit.py` holds the shared parts: mesh builders, the material palette,
glTF export and the Cycles preview rig.

## Regenerate

You need Blender 5.x, either as the `bpy` Python module (`pip install bpy`, tested with 5.2.2 LTS)
or the Blender app in background mode. Run from the repo root:

```sh
python tools/singular/blender/lantern.py     # lantern.glb   hero ship (survey tug)
python tools/singular/blender/cutter.py      # cutter.glb    Vell's Survey Authority cutter
python tools/singular/blender/meridian.py    # meridian.glb  colony ark
python tools/singular/blender/anchor.py      # anchor.glb    alien monolith + three spires
python tools/singular/blender/buoy.py        # buoy.glb      navigation buoy
python tools/singular/blender/debris.py      # debris_0.glb .. debris_5.glb
python tools/singular/blender/bridge.py      # bridge.glb    bridge interior set
```

With the app instead of the module: `blender -b -P tools/singular/blender/lantern.py -- [options]`.

Options (every script): `--render preview.png` also renders a Cycles preview (CPU, about 10-60 s;
the bridge interior is slower), `--samples 48`, `--res 960x540`, `--view az,el[,dist_scale]`,
`--out path.glb`. The output is the same every run (seeded).

Check them in the engine with the dev chapter `c93` (`?chapter=c93`, or
`node tests/singular/browser/game-flow.mjs c93 <outDir>`): one slowly orbiting shot per asset under the game's
real lights, bloom and tone mapping.

## Conventions

- Blender axes are the game's world axes: **+X is forward (nose), +Z is up**. The export is glTF
  Y-up, and the loader (`rotation.x = PI / 2`) turns it back.
- PBR material values only (no textures, no UVs), so files stay small. Repeated parts are linked
  duplicates, stored once in the .glb.
- Shading: faces smooth, edges sharper than about 48 degrees split, face-area weighted normals
  (big panels stay flat, chamfers stay soft). Modifiers are applied before export.
- Emissive levels follow the loader in `gfx/models.ts`, which shows emissive as
  `factor x max(strength, 2.5)`. Use `kit.emis(name, rgb, level)`: `level` is what you get in the
  game (about 0.05-0.6 soft screens, 1-1.5 windows and seams, about 2 nav lights). The preview
  render applies the same rule, so previews match the engine. Emissive colours are cool white,
  pale cyan, warm white (and pale violet on the Anchor); the maths colours green #3ddc84,
  red #ff5c6c and yellow #ffd166 are never used.
- Albedos are tuned for the game's strong fill light: light panels about 0.3, structure 0.03-0.1.
- Specular stays at the glTF default (a Principled "Specular IOR Level" above 0.5 would export
  `KHR_materials_specular` and turn dark gloss silver).

## Nodes the game can use

| Model | Size | Nodes |
|---|---|---|
| `lantern` | about 6 long (x -2.6 to 3.3) | `hull`, `projector` (+ `projector_focus` at the emitter), `pod_fl`, `pod_fr`, `pod_rl`, `pod_rr`, each with `nozzle_fl` / `nozzle_fr` / `nozzle_rl` / `nozzle_rr` at the nozzle exit (exhaust along -X), `light_beacon` |
| `cutter` | about 9 long (x -4.6 to 4.5, wing span 5.2) | `hull`, `bridge`, `engine_1` (centre) / `engine_2` (port, +Y) / `engine_3` (starboard, -Y), each with `nozzle_1..3` at the bell exit (exhaust along -X; the side bells are scaled 0.8), `light_l` / `light_r` (white running lights at the +Y / -Y wing tips). `makeCutter` in c15 scales it to the old 10.2-long wedge |
| `meridian` | about 63 long | `bow`, `hangar_door_s` (-Y), `hangar_door_p` (+Y), `truss_fore` / `truss_aft` (origin at the section centre; children `frame_f1..f6` / `frame_a1..a6`, one rectangular frame each in the YZ plane, plus `truss_*_braces`), `hub`, `ring_1..3` (spin about local X), `aft` (`tank_1..6`, `radiator_l/r`, `engine_1..3`), `nozzle_1..3` |
| `anchor` | spire tips about 2.3 from the core | `core`, `spire_1..3` (origin at the core centre, local +X along the spire; directions (1, 0.2, 0.1), (0.3, 1, 0), (0, 0.2, 1) normalised), `spire_1_tip..spire_3_tip` |
| `buoy` | about 1.9 tall | `body`, `core` (the glow, can be pulsed), `light_tip` |
| `debris_0..5` | 1-2 across | `chunk_N` (0-2 rocks, 3 hull plate, 4 truss fragment, 5 torn tank shell) |
| `bridge` | 12 x 8 x 4 room | `room`, `window_frame` (open: the backdrop shows through), `holotable` (+ `holo_focus` at z 1.5), `console_1..5`, `seat_1..2`, camera hints `cam_wide`, `cam_window`, `cam_table`. Origin at the holotable centre on the floor, the window toward +X. The shell is single-sided, so a camera that drifts outside a wall sees through it. |
