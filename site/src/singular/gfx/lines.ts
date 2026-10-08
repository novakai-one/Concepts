// Thick, anti-aliased lines (width in screen pixels) built on three's Line2.
import { Color } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { InterleavedBufferAttribute } from 'three';
import type { Stage, V3 } from '../core/stage';

/** Write new positions into the existing buffer when the size matches (no allocation per frame). */
function updateInPlace(g: LineSegmentsGeometry, flat: number[]): boolean {
  const attr = g.getAttribute('instanceStart') as InterleavedBufferAttribute | undefined;
  const buf = attr?.data;
  if (!buf || buf.array.length !== flat.length) return false;
  (buf.array as Float32Array).set(flat);
  buf.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return true;
}

/** Segment pairs for a polyline, as LineGeometry.setPositions builds them. */
function polylinePairs(points: V3[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length - 1; i++) out.push(...points[i], ...points[i + 1]);
  return out;
}

export interface LineOpts { color?: string; width?: number; intensity?: number; opacity?: number; dashed?: boolean; dashSize?: number; gapSize?: number; depthTest?: boolean }

function makeMaterial(stage: Stage, o: LineOpts): { mat: LineMaterial; off: () => void } {
  const mat = new LineMaterial({
    color: new Color(o.color ?? '#ffffff').multiplyScalar(o.intensity ?? 1).getHex(),
    linewidth: o.width ?? 2,
    transparent: true,
    opacity: o.opacity ?? 1,
    dashed: !!o.dashed,
    dashSize: o.dashSize ?? 0.25,
    gapSize: o.gapSize ?? 0.18,
    depthTest: o.depthTest ?? true,
    depthWrite: false,
    worldUnits: false,
  });
  // keep HDR intensity (getHex clamps), so set the colour directly
  mat.color = new Color(o.color ?? '#ffffff').multiplyScalar(o.intensity ?? 1);
  const off = stage.onResize((w, h) => mat.resolution.set(w, h));
  return { mat, off };
}

/** A polyline through the given points. */
export class FatLine {
  readonly object: Line2;
  private readonly off: () => void;
  readonly material: LineMaterial;

  constructor(stage: Stage, points: V3[], o: LineOpts = {}) {
    const { mat, off } = makeMaterial(stage, o);
    this.material = mat;
    this.off = off;
    const g = new LineGeometry();
    g.setPositions(points.flat());
    this.object = new Line2(g, mat);
    if (o.dashed) this.object.computeLineDistances();
    this.object.renderOrder = 2;
  }

  setPoints(points: V3[]): void {
    if (points.length > 1 && updateInPlace(this.object.geometry, polylinePairs(points))) {
      if (this.material.dashed) this.object.computeLineDistances();
      return;
    }
    const g = new LineGeometry();
    g.setPositions(points.flat());
    this.object.geometry.dispose();
    this.object.geometry = g;
    if (this.material.dashed) this.object.computeLineDistances();
  }

  setOpacity(a: number): void { this.material.opacity = a; this.object.visible = a > 0.001; }
  setColor(c: string, intensity = 1): void { this.material.color = new Color(c).multiplyScalar(intensity); }

  dispose(): void {
    this.off();
    this.object.geometry.dispose();
    this.material.dispose();
    this.object.removeFromParent();
  }
}

/** Many separate segments in one draw call: pairs of points. */
export class FatSegments {
  readonly object: LineSegments2;
  private readonly off: () => void;
  readonly material: LineMaterial;

  constructor(stage: Stage, segments: [V3, V3][], o: LineOpts = {}) {
    const { mat, off } = makeMaterial(stage, o);
    this.material = mat;
    this.off = off;
    const g = new LineSegmentsGeometry();
    g.setPositions(segments.flatMap(([a, b]) => [...a, ...b]));
    this.object = new LineSegments2(g, mat);
    if (o.dashed) this.object.computeLineDistances();
  }

  setSegments(segments: [V3, V3][]): void {
    if (segments.length && updateInPlace(this.object.geometry, segments.flatMap(([a, b]) => [...a, ...b]))) {
      if (this.material.dashed) this.object.computeLineDistances();
      return;
    }
    const g = new LineSegmentsGeometry();
    g.setPositions(segments.flatMap(([a, b]) => [...a, ...b]));
    this.object.geometry.dispose();
    this.object.geometry = g;
    if (this.material.dashed) this.object.computeLineDistances();
  }

  setOpacity(a: number): void { this.material.opacity = a; this.object.visible = a > 0.001; }

  dispose(): void {
    this.off();
    this.object.geometry.dispose();
    this.material.dispose();
    this.object.removeFromParent();
  }
}
