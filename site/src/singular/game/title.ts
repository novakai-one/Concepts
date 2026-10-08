// Title screen: a slowly orbiting 3-D lattice that keeps moving between transformations,
// with the game's name and the main menu over it.
import { h, button } from '../ui/ui';
import { Lattice3D } from '../gfx/shapes';
import { Arrow } from '../gfx/arrow';
import { C } from '../core/theme';
import { wait } from '../core/tween';
import { audio } from '../audio/audio';
import { GAME_TITLE, GAME_TAGLINE } from '../content/meta';
import type { App } from './app';
import { Vector3, type Object3D } from 'three';
import { makeAnchor } from '../content/common/set';
import { loadModel } from '../gfx/models';

export type TitleChoice = 'new' | 'continue' | 'chapters' | 'codex' | 'settings' | 'viva' | 'sandbox';

// Each pose is a real 3x3 move of the whole lattice. One of them flattens space onto a plane
// (its third row is zero): the title's quiet promise, paid off in Chapter 13.
const POSES: number[][][] = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  [[1, 0.6, 0], [0, 1, 0], [0, 0.4, 1]],
  [[0.8, -0.5, 0.2], [0.5, 0.9, 0], [0, 0.3, 1.2]],
  [[1, 0.3, 0.5], [0, 1, 0.5], [0, 0, 0]],
  [[1.4, 0, 0], [0, 0.6, 0], [0.3, 0, 1]],
  [[0, -1, 0], [1, 0, 0.3], [0, 0, 1]],
];
const FLAT = 3;

export class TitleScene {
  private lattice: Lattice3D;
  private arrows: Arrow[];
  private el: HTMLElement | null = null;
  private alive = true;
  private offTick: () => void;
  private props: Object3D[] = [];
  private ark: Object3D | null = null;

  constructor(private readonly app: App) {
    const st = app.stage;
    this.lattice = new Lattice3D(st, { extent: 4, opacity: 0.38 });
    // the Anchor at the centre of everything, and the ark far behind it
    void makeAnchor(st, 0.32).then((a) => { if (!this.alive) a.removeFromParent(); else this.props.push(a); });
    void loadModel('meridian').then((m) => {
      if (!m || !this.alive) return;
      m.rotation.set(Math.PI / 2, 0, 0.5);
      m.scale.setScalar(0.3);
      st.world.add(m);
      this.props.push(m);
      this.ark = m;
    });
    this.arrows = [
      new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, width: 0.06 }),
      new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, width: 0.06 }),
      new Arrow([0, 0, 0], [0, 0, 1], { color: C.u, width: 0.06 }),
    ];
    st.world.add(this.lattice.object, ...this.arrows.map((a) => a.object));
    void st.view3D({ distance: 17, azimuth: -55, elevation: 22, orbit: false });
    let az = -55;
    const fwd = new Vector3(), right = new Vector3(), lift = new Vector3(0, 0, 9);
    this.offTick = st.tick((dt) => {
      az += dt * 3;
      const r = 17, el = (22 * Math.PI) / 180, a = (az * Math.PI) / 180;
      st.camera.position.set(r * Math.cos(el) * Math.cos(a), r * Math.cos(el) * Math.sin(a), r * Math.sin(el) + 0.6);
      st.camera.up.set(0, 0, 1);
      st.camera.lookAt(0, 0, 0.6);
      if (this.ark) {
        // the ark hangs far off in the background, right of the lattice, wherever the camera is
        st.camera.getWorldDirection(fwd);
        right.crossVectors(fwd, st.camera.up).normalize();
        this.ark.position.copy(st.camera.position).addScaledVector(fwd, 100).addScaledVector(right, 27).add(lift);
        this.ark.rotation.z += dt * 0.01;
      }
    });
    void this.loop();
  }

  private async loop(): Promise<void> {
    let i = 0;
    while (this.alive) {
      await wait(2600);
      if (!this.alive) return;
      i = (i + 1) % POSES.length;
      const M = POSES[i];
      const cols = [0, 1, 2].map((j) => M.map((r) => r[j]) as [number, number, number]);
      await Promise.all([this.lattice.to(M, 2400), ...this.arrows.map((a, k) => a.moveTo(cols[k], 2400))]);
      if (i === FLAT) await wait(900); // hold the flattened lattice a moment
    }
  }

  menu(o: { canContinue: boolean; continueLabel: string; canViva?: boolean }): Promise<TitleChoice> {
    return new Promise((resolve) => {
      const pick = (c: TitleChoice) => { audio.unlock(); resolve(c); };
      this.el = h('div', { class: 'title-screen' },
        h('div', { class: 'title-block' },
          h('div', { class: 'kicker' }, 'A linear algebra game'),
          h('h1', { class: 'game-title' }, GAME_TITLE),
          h('p', { class: 'tagline' }, GAME_TAGLINE),
          h('div', { class: 'title-menu' },
            o.canContinue ? button(o.continueLabel, () => pick('continue'), { cls: 'primary' }) : null,
            button(o.canContinue ? 'New game' : 'Begin', () => pick('new'), { cls: o.canContinue ? '' : 'primary' }),
            button('Chapter map', () => pick('chapters')),
            button('Codex', () => pick('codex'), { cls: 'ghost' }),
            o.canViva ? button('Viva: revise every claim', () => pick('viva'), { cls: 'ghost' }) : null,
            button('Holotable: free play', () => pick('sandbox'), { cls: 'ghost' }),
            button('Settings', () => pick('settings'), { cls: 'ghost' }))),
        h('div', { class: 'title-foot c-muted' }, 'Headphones recommended · Mouse and keyboard'));
      this.el.style.pointerEvents = 'auto';
      this.app.ui.modal.appendChild(this.el);
      document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
    });
  }

  dispose(): void {
    this.alive = false;
    this.offTick();
    this.el?.remove();
    this.lattice.dispose();
    this.props.forEach((p) => p.removeFromParent());
    this.arrows.forEach((a) => a.dispose());
  }
}
