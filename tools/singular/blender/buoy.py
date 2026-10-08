"""Buoy: a small navigation buoy (< 500 triangles). Two faceted octagonal shells around a glowing
pale cyan core, four bridging struts, an antenna with a cool white tip light, a small thruster.
About 1.9 units tall, Z up.

  <blender-python> tools/singular/blender/buoy.py [--render preview.png]

Nodes: buoy (root) > body, core (the glowing part, can be pulsed by the game), light_tip.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, Pal, Part, V  # noqa: E402


def build():
    root = kit.empty('buoy', size=0.5)
    shell = kit.mat('buoy_shell', (0.24, 0.245, 0.25), metal=0.3, rough=0.4)
    band = kit.mat('buoy_band', (0.035, 0.038, 0.045), metal=0.6, rough=0.4)
    steel = Pal.steel()
    P = Part('body')
    ph = math.pi / 8
    up = [(0.09, 0.3), (0.14, 0.42), (0.3, 0.42), (0.78, 0.12), (0.88, 0.05)]
    lo = [(-0.09, 0.3), (-0.14, 0.42), (-0.3, 0.42), (-0.66, 0.15), (-0.74, 0.08)]
    P.lathe(up, M((0, 0, 0)), shell, segs=8, close0=True, close1=True, phase=ph)
    P.lathe(list(reversed(lo)), M((0, 0, 0)), shell, segs=8, close0=True, close1=True, phase=ph)
    # dark accent bands at the shell rims
    P.lathe([(0.14, 0.425), (0.21, 0.425)], M((0, 0, 0)), band, segs=8, phase=ph)
    P.lathe([(-0.21, 0.425), (-0.14, 0.425)], M((0, 0, 0)), band, segs=8, phase=ph)
    # struts across the glowing gap
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        u = V((math.cos(a), math.sin(a), 0))
        P.box((0.07, 0.05, 0.3), M(u * 0.37, z=(0, 0, 1), up=u), band)
    # antenna + bottom thruster
    P.cyl(0.018, 0.5, M((0, 0, 1.1)), steel, segs=6)
    P.cyl(0.07, 0.06, M((0, 0, -0.77)), band, segs=8)
    P.cyl(0.05, 0.12, M((0, 0, -0.85)), steel, segs=8, r2=0.075, caps=False)
    # four small vanes on the upper shell
    for k in range(4):
        a = k * math.pi / 2
        u = V((math.cos(a), math.sin(a), 0))
        P.box((0.02, 0.16, 0.26), M(u * 0.3 + V((0, 0, 0.5)), rot=(0, 0, a + math.pi / 2)), band)
    P.finish(parent=root, sharp=30, weighted=False)
    C = Part('core')
    C.cyl(0.27, 0.2, M((0, 0, 0)), kit.emis('buoy_core', kit.PALE_CYAN, 0.9), segs=8)
    C.finish(parent=root, sharp=30, weighted=False)
    T = Part('light_tip')
    T.sphere(0.04, M((0, 0, 1.37)), Pal.e_white(2.0), ico=1)
    T.finish(parent=root, sharp=30, weighted=False, loc=(0, 0, 1.37))
    return root


if __name__ == '__main__':
    a = kit.cli('buoy')
    kit.reset(seed=5)
    root = build()
    kit.export(a.out, root)
    if a.render:
        kit.render(a.render, **kit.view_args(a, -50, 18, 1.3))
