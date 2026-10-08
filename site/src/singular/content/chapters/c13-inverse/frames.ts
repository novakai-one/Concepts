// The bow frame plan: the Meridian's bow seen from above, its box frames drawn as cross lines, and the
// port hangar door marked so a flip shows. It rides any 2×2 or 3×3 move as one rigid drawing: the
// matrix is the group's matrix, so every line is moved by exactly that matrix.
import { DoubleSide, Group, Mesh, MeshBasicMaterial, Shape, ShapeGeometry, Vector2, Color } from 'three';
import type { Stage } from '../../../core/stage';
import type { V3 } from '../../../game/types';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { identity, matVec, type Mat } from '../../../math/la';
import { setGroupMatrix } from './play';

/** Hull outline of the bow (grid units), nose at +x. */
export const PLAN_COLOR = '#c4d8f5';
export const BOW_HULL: [number, number][] = [[-2.5, -1], [1.5, -1], [3, 0], [1.5, 1], [-2.5, 1]];
/** The box frames: one cross line per frame. */
export const BOW_FRAMES: [number, number][][] = [-2, -1, 0, 1].map((x) => [[x, -1], [x, 1]]);
/** The port hangar door (fills one side only, so a mirror image looks different). */
export const BOW_DOOR: [number, number][] = [[-1.7, 0.45], [-0.3, 0.45], [-0.3, 1], [-1.7, 1]];
/** Corners used to draw the gap after a miss. */
export const BOW_CORNERS: [number, number][] = [[-2.5, -1], [3, 0], [-2.5, 1]];

export interface PlanLook { color?: string; opacity?: number; fill?: number; dashed?: boolean; width?: number; door?: boolean }

export class FramePlan {
  readonly group = new Group();
  private readonly hull: FatLine;
  private readonly frames: FatSegments;
  private readonly fill: Mesh<ShapeGeometry, MeshBasicMaterial> | null;
  private readonly door: Mesh<ShapeGeometry, MeshBasicMaterial> | null;
  private readonly look: Required<PlanLook>;
  W: Mat = identity(3);

  constructor(stage: Stage, o: PlanLook = {}, z = 0.01) {
    this.look = { color: o.color ?? PLAN_COLOR, opacity: o.opacity ?? 0.9, fill: o.fill ?? 0.08, dashed: o.dashed ?? false, width: o.width ?? 2, door: o.door ?? true };
    const L = this.look;
    const pts = (xs: [number, number][]): V3[] => xs.map(([x, y]) => [x, y, z]);
    this.hull = new FatLine(stage, [...pts(BOW_HULL), [BOW_HULL[0][0], BOW_HULL[0][1], z]], { color: L.color, width: L.width, intensity: 1.05, opacity: L.opacity, dashed: L.dashed, dashSize: 0.16, gapSize: 0.12 });
    this.frames = new FatSegments(stage, BOW_FRAMES.map((f) => pts(f) as [V3, V3]), { color: L.color, width: L.width * 0.7, intensity: 0.95, opacity: L.opacity * 0.85, dashed: L.dashed, dashSize: 0.16, gapSize: 0.12 });
    this.group.add(this.hull.object, this.frames.object);
    if (L.fill > 0) {
      const shape = new Shape(BOW_HULL.map(([x, y]) => new Vector2(x, y)));
      this.fill = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color: new Color(L.color), transparent: true, opacity: L.fill, side: DoubleSide, depthWrite: false }));
      this.fill.position.z = z - 0.002;
      this.group.add(this.fill);
    } else this.fill = null;
    if (L.door) {
      const shape = new Shape(BOW_DOOR.map(([x, y]) => new Vector2(x, y)));
      this.door = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color: new Color(L.color), transparent: true, opacity: L.dashed ? 0.14 : 0.32, side: DoubleSide, depthWrite: false }));
      this.door.position.z = z;
      this.group.add(this.door);
    } else this.door = null;
    this.group.matrixAutoUpdate = false;
    this.group.userData.dispose = () => this.dispose();
  }

  get object(): Group { return this.group; }

  /** Move the drawing by M (2×2 on the floor, or a 3×3 world matrix during a flip). */
  set(M: Mat, t: readonly number[] = [0, 0, 0]): void {
    this.W = M.length === 2 ? [[M[0][0], M[0][1], 0], [M[1][0], M[1][1], 0], [0, 0, 1]] : M.map((r) => r.slice());
    setGroupMatrix(this.group, M, t);
  }

  setOpacity(a: number): void {
    this.hull.setOpacity(this.look.opacity * a);
    this.frames.setOpacity(this.look.opacity * 0.85 * a);
    if (this.fill) this.fill.material.opacity = this.look.fill * a;
    if (this.door) this.door.material.opacity = (this.look.dashed ? 0.14 : 0.32) * a;
    this.group.visible = a > 0.001;
  }

  setColor(c: string): void {
    this.hull.setColor(c, 1.05);
    this.frames.material.color = new Color(c).multiplyScalar(0.95);
    this.fill?.material.color.set(c);
    this.door?.material.color.set(c);
  }

  /** Where a plan point sits now (floor coordinates). */
  where(p: readonly number[]): V3 {
    const q = matVec(this.W, [p[0], p[1], 0]);
    return [q[0], q[1], q[2]];
  }

  dispose(): void { this.hull.dispose(); this.frames.dispose(); this.fill?.geometry.dispose(); this.fill?.material.dispose(); this.door?.geometry.dispose(); this.door?.material.dispose(); this.group.removeFromParent(); }
}
