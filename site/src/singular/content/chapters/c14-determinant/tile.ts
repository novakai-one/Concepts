// The unit tile (GDD §3.5, Ch 14): a frosted white square that rides the grid. Its signed area shows on
// it. It is one mesh moved by the matrix itself, front face white and back face amber, so a move that
// turns the grid over shows the tile's back: no sign is painted on, the winding does it. (three.js
// re-flips the winding of any mesh whose world matrix has a negative determinant, so a mirror on the
// floor would keep showing the front; set() undoes that so the screen winding decides the face.)
import { BackSide, Color, FrontSide, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { Stage } from '../../../core/stage';
import type { V3 } from '../../../game/types';
import { FatLine } from '../../../gfx/lines';
import { Label } from '../../../gfx/label';
import { C } from '../../../core/theme';
import { matVec, type Mat } from '../../../math/la';
import { setGroupMatrix } from '../c13-inverse/play';
import { embed } from '../c13-inverse/honest';
import { fmtN } from './logic';

export const BACK = '#ffb35c';

export class UnitTile {
  readonly group = new Group();
  private readonly front: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly back: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly edge: FatLine;
  readonly label: Label;
  private readonly root = new Group();
  readonly at: [number, number];
  private name: string;
  W: Mat = embed([[1, 0], [0, 1]]);
  private mirrored = false;

  /** A unit square with its lower-left corner at `at` (grid units), riding whatever matrix it is given. */
  constructor(stage: Stage, o: { at?: [number, number]; color?: string; opacity?: number; name?: string; labelSize?: number } = {}) {
    this.at = o.at ?? [0, 0];
    this.name = o.name ?? 'area';
    const [x, y] = this.at;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array([x, y, 0, x + 1, y, 0, x + 1, y + 1, 0, x, y + 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const color = o.color ?? '#eef4ff';
    this.front = new Mesh(g, new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: o.opacity ?? 0.34, side: FrontSide, depthWrite: false }));
    this.back = new Mesh(g, new MeshBasicMaterial({ color: new Color(BACK), transparent: true, opacity: 0.42, side: BackSide, depthWrite: false }));
    this.edge = new FatLine(stage, [[x, y, 0.002], [x + 1, y, 0.002], [x + 1, y + 1, 0.002], [x, y + 1, 0.002], [x, y, 0.002]], { color, width: 2, intensity: 1.3, opacity: 0.95 });
    this.root.add(this.front, this.back, this.edge.object);
    this.root.matrixAutoUpdate = false;
    this.label = new Label('', [0, 0, 0], { size: o.labelSize ?? 15, color: C.white });
    Object.assign(this.label.el.style, { fontFamily: 'var(--mono)', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', background: 'rgba(6, 10, 22, 0.72)', border: '1px solid rgba(232, 241, 255, 0.28)', whiteSpace: 'nowrap' });
    this.group.add(this.root, this.label.object);
    this.group.userData.dispose = () => this.dispose();
    this.set([[1, 0], [0, 1]]);
  }
  get object(): Group { return this.group; }

  /** Ride a move: M is a 2×2 on the floor, or a 3×3 world frame (a turn-over in progress). */
  set(M: Mat): void {
    this.W = embed(M);
    setGroupMatrix(this.root, this.W);
    const w = this.W;
    const d3 = w[0][0] * (w[1][1] * w[2][2] - w[1][2] * w[2][1]) - w[0][1] * (w[1][0] * w[2][2] - w[1][2] * w[2][0]) + w[0][2] * (w[1][0] * w[2][1] - w[1][1] * w[2][0]);
    const mirrored = d3 < 0;
    if (mirrored !== this.mirrored) {
      this.mirrored = mirrored;
      this.front.material.side = mirrored ? BackSide : FrontSide;
      this.back.material.side = mirrored ? FrontSide : BackSide;
      this.front.material.needsUpdate = true;
      this.back.material.needsUpdate = true;
    }
    const c = matVec(this.W, [this.at[0] + 0.5, this.at[1] + 0.5, 0]);
    this.label.at([c[0], c[1], c[2] + 0.05]);
    const floor = M.length === 2 || (Math.abs(M[2][0]) + Math.abs(M[2][1]) + Math.abs(M[0][2]) + Math.abs(M[1][2]) < 1e-9 && Math.abs(M[2][2] - 1) < 1e-9);
    if (floor) {
      const a = M[0][0] * M[1][1] - M[0][1] * M[1][0];
      this.label.set(`${this.name} ${fmtN(Math.round(a * 1000) / 1000)}`);
      this.label.el.style.color = a < -1e-9 ? BACK : C.white;
      this.label.show(true);
    } else this.label.show(false);
  }

  setName(n: string): void { this.name = n; this.set(this.W); }
  setColor(c: string): void { this.front.material.color.set(c); this.edge.setColor(c, 1.3); }
  setOpacity(a: number): void { this.front.material.opacity = 0.34 * a; this.back.material.opacity = 0.42 * a; this.edge.setOpacity(0.95 * a); this.label.show(a > 0.3); this.group.visible = a > 0.001; }
  corner(): V3 { const c = matVec(this.W, [this.at[0], this.at[1], 0]); return [c[0], c[1], c[2]]; }

  dispose(): void {
    this.front.geometry.dispose(); this.front.material.dispose(); this.back.material.dispose(); this.edge.dispose(); this.label.dispose(); this.group.removeFromParent();
  }
}
