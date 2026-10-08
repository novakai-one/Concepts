// Act III staging: the inside of the dark ark, drawn as LANTERN's scan hologram (GDD §9.4): a faint
// cyan lattice in a void, rows of sleeper pods as wire frames, fan-beam planes of light.
// Shared by Chapters 8, 9 and 10. Everything is added through worldHost, so clearing the world
// (the runner does it between beats) also stops the camera drift and the per-frame callbacks.
import {
  AdditiveBlending, CapsuleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, type Object3D,
} from 'three';
import type { Game, V3 } from '../../../game/types';
import { Lattice3D } from '../../../gfx/shapes';
import { Dot, glowSprite } from '../../../gfx/markers';
import { Label } from '../../../gfx/label';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { isPlayerFn, pylib } from '../../../game/build';
import { PlaneSet, worldHost, type Host } from './planes';
import { add, cross, dot, len, residuals, scale, type Aug } from './act3';
import { P2 } from './logic';
import { S } from './script';

export const HOLO = '#59e1ff';
export const AMBER = '#ffb347';

/** Drift the camera around a target (z up) until the world is cleared. */
export function orbit(host: Host, target: V3, dist: number, elevDeg: number, az0: number, degPerSec: number): void {
  const st = host.g.stage;
  st.disposeControls();
  st.mode = '3d';
  let az = az0;
  const place = () => {
    const a = (az * Math.PI) / 180, e = (elevDeg * Math.PI) / 180;
    st.camera.position.set(target[0] + dist * Math.cos(e) * Math.cos(a), target[1] + dist * Math.cos(e) * Math.sin(a), target[2] + dist * Math.sin(e));
    st.camera.up.set(0, 0, 1);
    st.camera.lookAt(target[0], target[1], target[2]);
  };
  place();
  // drift until another view takes the camera (a puzzle or a Briefing step turns orbit controls on)
  host.tick((dt) => { if (st.controls) return; az += dt * degPerSec; place(); });
}

/** The scan lattice: a faint cyan cube of lines around a centre. */
export function scanLattice(host: Host, at: V3, scaleK = 2.2, opacity = 0.35): Lattice3D {
  const lat = new Lattice3D(host.g.stage, { extent: 3, color: HOLO, opacity });
  // Lattice3D owns its matrix (matrixAutoUpdate off), so place and scale it through a parent
  const holder = new Group();
  holder.position.set(...at);
  holder.scale.setScalar(scaleK);
  holder.add(lat.object);
  host.add(holder);
  host.onDispose(() => lat.dispose());
  return lat;
}

const wire = (color = HOLO, opacity = 0.32) => new MeshBasicMaterial({ color: new Color(color), wireframe: true, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending });

/** A sleeper pod as a wire-frame capsule, lying along x, with a lid that can open and a status light. */
export class Pod {
  readonly group = new Group();
  readonly lid = new Group();
  readonly light: Dot;
  private readonly halo;
  constructor(host: Host, at: V3, o: { light?: string | null; opacity?: number } = {}) {
    const body = new Mesh(new CapsuleGeometry(0.42, 1.4, 3, 8), wire(HOLO, o.opacity ?? 0.3));
    body.rotation.z = Math.PI / 2;
    this.group.add(body);
    // the lid: a half shell over the top (+z), hinged along its back edge (y = −0.47)
    const shell = new Mesh(new CylinderGeometry(0.47, 0.47, 1.5, 10, 1, true, -Math.PI / 2, Math.PI), wire(HOLO, (o.opacity ?? 0.3) + 0.1));
    shell.rotation.z = Math.PI / 2;
    shell.position.set(0, 0.47, 0);
    this.lid.position.set(0, -0.47, 0.02);
    this.lid.add(shell);
    this.group.add(this.lid);
    this.light = new Dot([0.95, 0, 0.42], { color: o.light ?? AMBER, size: 0.07, glow: 2.6 });
    this.light.group.visible = o.light !== null;
    this.halo = glowSprite(o.light ?? AMBER, 0.9, 0.5);
    this.halo.position.set(0.95, 0, 0.42);
    this.halo.visible = o.light !== null;
    this.group.add(this.light.group, this.halo);
    this.group.position.set(...at);
    host.add(this.group);
    host.onDispose(() => { body.geometry.dispose(); shell.geometry.dispose(); this.light.dispose(); });
    host.tick((_dt, t) => { if (this.halo.visible) this.halo.material.opacity = 0.35 + 0.25 * Math.sin(t * 3); });
  }
  get object(): Object3D { return this.group; }
  setLight(color: string | null): void {
    this.light.group.visible = this.halo.visible = color !== null;
    if (color) { this.light.setColor(color); this.halo.material.color.set(color); }
  }
  async open(ms = 2200): Promise<void> {
    await animate(ms, (k) => { this.lid.rotation.x = -1.9 * k; }, ease.inOut);
  }
}

/** A field of pods on one deck (z), with one marked pod at `special`. */
export function podField(host: Host, special: V3, xs: number[], ys: number[]): Pod {
  let mine: Pod | null = null;
  for (const x of xs) for (const y of ys) {
    const isMine = Math.abs(x - special[0]) < 1e-9 && Math.abs(y - special[1]) < 1e-9;
    const p = new Pod(host, [x, y, special[2]], { light: isMine ? AMBER : null, opacity: isMine ? 0.4 : 0.07 });
    if (isMine) mine = p;
  }
  return mine ?? new Pod(host, special);
}

/** Turn a row's plane by `deg` about a line through `pivot` (so it still passes through the pivot). */
export function tiltRow(row: number[], pivot: number[], deg: number, axisHint: number[] = [0.3, 1, 0.2]): number[] {
  const n = row.slice(0, 3);
  let u = cross(n, axisHint);
  if (len(u) < 1e-9) u = cross(n, [1, 0, 0]);
  u = scale(u, 1 / len(u));
  const t = (deg * Math.PI) / 180;
  const n2 = add(scale(n, Math.cos(t)), scale(cross(u, n), Math.sin(t)));
  return [...n2, dot(n2, pivot)];
}

// ------------------------------------------------------------------ Chapter 8 cold open

export async function coldOpen(g: Game): Promise<void> {
  g.stage.clearWorld();
  await fadeBlack(g, true, 10);
  g.mood('void');
  const host = worldHost(g);
  const pod = P2.pod as V3;
  scanLattice(host, pod, 1.6, 0.13);
  const mine = podField(host, pod, [1, 3, 5, 7, 9], [-1, 1, 3, 5, 7]);
  mine.setLight(null);
  const start: Aug = P2.rows.map((r, i) => tiltRow(r, pod, [55, -48, 62][i], [[0.3, 1, 0.2], [1, 0.2, 0.4], [0.2, 0.3, 1]][i]));
  const beams = new PlaneSet(host, { n: 3, rows: start, labels: false, showSolution: false, size: 10, focus: pod, axes: false });
  beams.setFade(0);
  orbit(host, pod, 21, 24, -130, 2.4);
  await fadeBlack(g, false, 1400);
  await letterbox(g, true, 500);
  void titleCard(g, 'Act III · The Ledger', 'Where do the three planes meet?', 3400);
  void stamp(g, 'Colony ark *Meridian* · inside · no power', 4200);
  await wait(1200);
  await g.say(S.cold, {
    onLine: async (_l, i) => {
      if (i === 2) { mine.setLight(AMBER); sfx.snap(); void g.stage.shockwave(pod, 1200, 0.45); }
      if (i === 4) {
        void animate(900, (k) => beams.setFade(k), ease.out);
        sfx.whoosh(2.4);
        await beams.setRows(P2.rows, 2600);
        sfx.success();
        void g.stage.shockwave(pod, 1000, 0.6);
      }
    },
  });
  await letterbox(g, false, 500);
}

// ------------------------------------------------------------------ Chapter 8 story out

export async function closing(g: Game): Promise<void> {
  g.stage.clearWorld();
  g.mood('explore');
  const host = worldHost(g);
  const pod = P2.pod as V3;
  scanLattice(host, pod, 1.6, 0.14);
  const mine = podField(host, pod, [3, 5, 7], [1, 3, 5]);
  mine.setLight(AMBER);
  new PlaneSet(host, { n: 3, rows: P2.rows, labels: false, showSolution: true, solutionLabel: false, size: 9, focus: pod, axes: false, opacity: 0.6 });
  const tag = new Label('pod bay three · deck five', [pod[0], pod[1], pod[2] + 1.1], { className: 'c08-tag' });
  host.add(tag.object);
  host.onDispose(() => tag.dispose());
  orbit(host, pod, 22, 22, -60, 3);
  // LANTERN checks the position with the player's check() when it passes its tests, else its backup
  let mineFn = false;
  let res = residuals(P2.rows, P2.pod);
  if (isPlayerFn('check')) {
    try {
      const out = await Promise.race([pylib.call<number[]>('check', P2.rows, P2.pod), new Promise<null>((r) => window.setTimeout(() => r(null), 8000))]);
      if (Array.isArray(out) && out.length === 3) { res = out; mineFn = true; }
    } catch { /* LANTERN falls back to its backup */ }
  }
  void res; // the numbers LANTERN reads out are the ones in S.close (0, 0, 0)
  await g.say([...(mineFn ? S.closeYours : S.closeBackup), ...S.close]);
}

// ------------------------------------------------------------------ backdrops for scenes and cards (Act III)

/**
 * A quiet backdrop inside the ark for dialogue scenes, cards and naming cards: LANTERN's scan lattice
 * with a deck of pods ('pods'), the power board's generators ('gens', drawn by Chapter 9) or the pod bay
 * ('bay'). The camera drifts slowly.
 */
export function scanScene(kind: 'pods' | 'bay' = 'pods') {
  return async (g: Game): Promise<void> => {
    g.stage.clearWorld();
    const host = worldHost(g);
    if (kind === 'pods') {
      const at: V3 = [5, 3, -2];
      scanLattice(host, at, 1.8, 0.12);
      podField(host, at, [3, 5, 7], [1, 3, 5]).setLight(AMBER);
      orbit(host, at, 25, 24, -60, 2.2);
    } else {
      const at: V3 = [0, 0, 0];
      scanLattice(host, [0, 0, 0.3], 0.62, 0.12);
      new Pod(host, at, { light: AMBER, opacity: 0.5 });
      orbit(host, [0, 0, 0.2], 9, 24, -70, 2);
    }
  };
}
