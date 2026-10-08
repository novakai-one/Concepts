// [SP] Act VI set piece · Set the spires right (GDD §6.8): uses Acts II (distance to a line), IV (volume)
// and VI (a move written in the Anchor's grid). Then the Act VI Review, by Ilse, live.
import { Group, Matrix4, Vector3, type Object3D } from 'three';
import type { DoubtDef, PuzzleDef, ReviewDef, V3 } from '../../../game/types';
import { Arrow } from '../../../gfx/arrow';
import { Dot, Pad, glowSprite } from '../../../gfx/markers';
import { FatLine, FatSegments } from '../../../gfx/lines';
import { Parallelepiped } from '../../../gfx/shapes';
import { loadModel } from '../../../gfx/models';
import { RightAngle } from '../../../kit/geom';
import { MatrixInput, VectorInput } from '../../../ui/widgets';
import { h, button } from '../../../ui/ui';
import { C } from '../../../core/theme';
import { animate, ease, wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { rint, rng } from '../../../game/lawcheck';
import { isPlayerFn, pylib } from '../../../game/build';
import { makeAnchor } from '../../common/set';
import { C as COLLAPSE, ILSE_MEANT, P, P2, R, R2, T } from '../../truth';
import { col, det, identity, matVec, meq, mpow, type Mat } from '../../../math/la';
import { AnchorPath, COPPER, CopperGrid, SHIP_GRID, tag } from './grids';
import { gridHandles, randGrid } from './briefing';
import {
  ARK, ARK_AFTER, CLEARANCE, ILSE_PATH, P1_SHIP, PC, SP_SETTING, STREAM_X, anchorOf, distToStream, fmtN, fmtV, fourHomeHolds, inGrid,
  motionIn, basisMovesPointHolds, pToBHolds, sameEntriesHolds, shipMove, spClear, spFootOk, spForecast, spSettingOk, spVolumeOk, streamFoot,
  texSmall, turn3,
} from './logic';
import { normLine } from '../../lines';
import { S } from './script';

const v3 = (v: readonly number[], z = 0): V3 => [v[0], v[1], (v[2] ?? 0) + z];

// ------------------------------------------------------------------ shared staging: the stream, the ark miniature

/** A Matrix4 from a 3 × 3 matrix, acting about a centre point. */
function about(M: Mat, c: V3): Matrix4 {
  const m = new Matrix4().set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
  return new Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(m).multiply(new Matrix4().makeTranslation(-c[0], -c[1], -c[2]));
}

/** The Meridian, its stern still folded flat by the real Collapse pulse C (TT7) on the stern's own vertices. */
export async function arkModel(scale: number): Promise<Group> {
  const holder = new Group();
  const model = await loadModel('meridian');
  if (model) {
    model.rotation.x = Math.PI / 2;
    const M = about(COLLAPSE, [-21, 0, 0]);
    model.traverse((n) => {
      if (n.name !== 'aft' && n.name !== 'truss_aft') return;
      n.updateMatrix();
      n.matrixAutoUpdate = false;
      n.matrix.premultiply(M);
      n.matrixWorldNeedsUpdate = true;
    });
    model.scale.setScalar(scale);
    holder.add(model);
  }
  return holder;
}

/** The debris stream along x = 3 on the ground layer: pieces drifting along y. It keeps its course through a pulse. */
export function debrisStream(parent: Object3D, tick: (f: (dt: number) => void) => void, o: { n?: number; span?: number; scale?: number; width?: number } = {}) {
  const n = o.n ?? 34, span = o.span ?? 7, w = o.width ?? 0.7;
  const r = rng(17);
  const root = new Group();
  parent.add(root);
  const pieces: { obj: Object3D; y: number; x: number; z: number; spin: number; v: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p = { obj: new Group() as Object3D, y: -span + r() * 2 * span, x: STREAM_X + (r() * 2 - 1) * w, z: (r() * 2 - 1) * 0.25, spin: (r() - 0.5) * 1.4, v: 0.25 + r() * 0.2 };
    pieces.push(p);
    root.add(p.obj);
    void loadModel(`debris_${i % 6}`).then((m) => { if (m) { m.rotation.set(r() * 6, r() * 6, r() * 6); m.scale.setScalar((o.scale ?? 0.1) * (0.6 + r() * 0.8)); p.obj.add(m); } });
  }
  tick((dt) => {
    for (const p of pieces) {
      p.y += p.v * dt;
      if (p.y > span) p.y -= 2 * span;
      p.obj.position.set(p.x, p.y, p.z);
      p.obj.rotation.z += p.spin * dt;
      p.obj.rotation.x += p.spin * 0.6 * dt;
    }
  });
  return root;
}

// ------------------------------------------------------------------ [SP] Set the spires right

/** The spire translator checks the setting before it fires: the player's in_grid(P, R), else Lantern's backup. */
async function translator(): Promise<'mine' | 'backup'> {
  if (!isPlayerFn('in_grid')) return 'backup';
  try {
    const r = await Promise.race([pylib.call<number[][]>('in_grid', P, R), new Promise<null>((res) => setTimeout(() => res(null), 8000))]);
    if (r && meq(r, ILSE_MEANT, 1e-6)) return 'mine';
  } catch { /* the backup runs */ }
  return 'backup';
}

const STEPS = ['A true quarter turn, written in the Anchor’s grid', 'It keeps volume', `The ark ends at least ${CLEARANCE} from the stream`, 'Fire it once, unlocked'];

export const sp: PuzzleDef = {
  id: 'c17-sp',
  title: 'Can you set the spires to swing the ark out of the stream?',
  goal: `Enter the spire numbers $S$, **in the Anchor’s grid**. Check that the Anchor’s move $PSP^{-1}$ is a true quarter turn with the third spire upright, that it keeps volume, and that the ark lands at least ${CLEARANCE} from the stream. Then **fire it once**.`,
  subgoals: STEPS,
  hints: [
    'This is the setting Ilse meant: the columns are where the Anchor’s three arms must land, written in the Anchor’s numbers. The third arm stays upright: third column $(0, 0, 1)$.',
    'On the ground layer it is the setting from the replay: $\\begin{bmatrix} -1 & -2 \\\\ 1 & 1 \\end{bmatrix}$. Put it in the top-left, with $(0, 0, 1)$ as the third column.',
    'Forecast, then drag the white marker along the stream to the point straight across from the forecast: $(3, 3, 0)$. The gap is 4.',
  ],
  par: 7,
  view: '3d',
  onWin: S.spWin,
  setup(p) {
    void p.g.stage.view3D({ target: [1.0, 1.6, 0.2], distance: 12.5, azimuth: -112, elevation: 50, ms: 0 });
    p.grid({ ...SHIP_GRID, fade: 9 });
    const copper = new CopperGrid(p.g.stage, { M: P2, half: 7, opacity: 0.55, n: 14 });
    p.add(copper);
    const root = new Group();
    p.add(root);
    void makeAnchor(p.g.stage, 0.45, root);
    const lamp = glowSprite('#ffe9c4', 0.8, 0.85);
    lamp.position.set(0, 0, 0.1);
    root.add(lamp);
    debrisStream(root, (f) => p.tick(f));
    const streamLine = new FatLine(p.g.stage, [[STREAM_X, -8, 0.01], [STREAM_X, 8, 0.01]], { color: '#c9b49a', width: 1.6, dashed: true, opacity: 0.6, dashSize: 0.25, gapSize: 0.15 });
    p.add(streamLine.object);
    p.onDispose(() => streamLine.dispose());
    const st = tag('debris stream', [STREAM_X, 5, 0], 'dim', [0, 0]);
    p.add(st.object); p.onDispose(() => st.dispose());
    // the ark miniature at its centre (3, 1, 0), along the stream
    const ark = new Group();
    ark.position.set(...v3(ARK, 0.15));
    root.add(ark);
    void arkModel(0.021).then((m) => { m.rotation.z = Math.PI / 2; ark.add(m); });
    const at = tag(`ark ${fmtV(ARK)}`, v3(ARK), 'w', [0, 30]);
    p.add(at.object); p.onDispose(() => at.dispose());
    // Ilse's original setting, repeated: back into the stream every fourth pulse
    const old = new FatSegments(p.g.stage, ILSE_PATH.slice(0, 4).map((q, i) => [v3(q, 0.02), v3(ILSE_PATH[i + 1], 0.02)] as [V3, V3]), { color: '#8a96ad', width: 1.2, dashed: true, opacity: 0.45, dashSize: 0.12, gapSize: 0.1 });
    p.add(old.object); p.onDispose(() => old.dispose());
    // forecast ring, perpendicular to the stream, the foot marker
    const ghost = new Pad(p.g.stage, [0, 0, 0.02], { color: C.result, radius: 0.3 });
    const gt = tag('', [0, 0, 0], 'y', [0, -30]);
    p.add(ghost, gt.object); p.onDispose(() => gt.dispose());
    ghost.object.visible = false; gt.show(false);
    const drop = new FatLine(p.g.stage, [[0, 0, 0], [0, 0, 0]], { color: C.white, width: 1.8, dashed: true, opacity: 0.85, dashSize: 0.12, gapSize: 0.08 });
    drop.object.visible = false;
    p.add(drop.object); p.onDispose(() => drop.dispose());
    const foot = new Dot([STREAM_X, -1, 0.06], { color: C.white, size: 0.13 });
    const footRing = new Arrow([STREAM_X, -1, 0.06], [STREAM_X, -1, 0.06], { color: C.white, handle: true });
    const ft = tag('', [STREAM_X, -1, 0], 'w', [0, 26]);
    p.add(foot, footRing, ft.object); p.onDispose(() => ft.dispose());
    foot.setOpacity(0); footRing.object.visible = false; ft.show(false);
    let mark: RightAngle | null = null;
    // the unit cube under the setting's move, beside the Anchor
    const cubeAt: V3 = [5.4, -0.6, 0];
    const cube = new Parallelepiped(p.g.stage, [1, 0, 0], [0, 1, 0], [0, 0, 1], { color: C.result, opacity: 0.14 });
    cube.group.position.set(...cubeAt);
    p.add(cube);
    cube.group.visible = false;
    const ct = tag('', cubeAt, 'y', [0, 30]);
    p.add(ct.object); p.onDispose(() => ct.dispose());
    ct.show(false);

    const d = p.difficulty;
    let S0: Mat = R.map((r) => r.slice());
    const flags = [false, false, false, false];
    let won = false, firing = false;
    const tick = (i: number) => {
      if (!flags[i]) { flags[i] = true; p.subgoal(i); }
      fireBtn.disabled = won || firing || !(flags[0] && flags[1] && flags[2]);
    };
    const r = p.readout('The spires');
    let checked = false;
    const paint = () => {
      const M = shipMove(S0);
      const show = d === 'cadet' || checked;
      r.row('s', 'your setting $S$', `$${texSmall(S0)}$`, COPPER);
      r.row('m', 'the move in our grid $PSP^{-1}$', show ? `$${texSmall(M.map((x) => x.map((y) => Math.round(y * 1000) / 1000)))}$` : '?', C.white);
      r.row('v', 'volume scale', flags[1] ? fmtN(det(M)) : '·', C.result);
      r.row('c', 'gap to the stream', flags[2] ? fmtN(distToStream(spForecast(S0))) : '·', C.result);
    };
    const reset = () => {
      flags.fill(false); checked = false;
      [0, 1, 2, 3].forEach((i) => p.subgoal(i, false));
      ghost.object.visible = false; gt.show(false); drop.object.visible = false; footRing.object.visible = false; foot.setOpacity(0); ft.show(false);
      mark?.show(false); cube.group.visible = false; ct.show(false);
      fireBtn.disabled = true;
    };
    const input = new MatrixInput({ rows: 3, cols: 3, values: S0, colourCols: true, label: 'S =', step: 1, onChange: (m) => { S0 = m; reset(); paint(); } });
    input.el.classList.add('c17-in');
    const msg = h('div', { class: 'c17-msg' }, 'Ilse’s original setting is loaded. It was right for our grid, not for the Anchor’s.');
    const say = (t: string, kind: '' | 'good' | 'bad' = '') => { msg.className = `c17-msg ${kind}`; msg.innerHTML = t; };
    // the foot's height on the stream, typed (Commander drags with no snap, so exact values are typed)
    const footIn = new VectorInput({
      dim: 1, values: [-1], label: '\\text{foot } y =', step: p.snap() ?? 0.25,
      onChange: (v) => placeFoot(v[0], false), onSubmit: () => { if (won || firing) return; p.move(); checkFoot(); },
    });
    footIn.el.classList.add('c17-in');
    const checkSetting = () => {
      p.move(); checked = true; paint();
      if (spSettingOk(S0)) { tick(0); sfx.success(); say('A true quarter turn in our grid, third spire upright.', 'good'); return true; }
      sfx.miss();
      const M = shipMove(S0);
      say(meqR(S0) ? 'That is Ilse’s original setting. Read in the Anchor’s grid it leans our grid: the ark would go (3, 1) → (1, 2) → (−3, −1) → (−1, −2), and back into the stream on the fourth pulse.'
        : `Read in the Anchor’s grid, this setting sends the ark to ${fmtV(matVec(M, ARK))}. A true quarter turn sends ${fmtV([1, 0, 0])} to ${fmtV([0, 1, 0])} and keeps heights.`, 'bad');
      return false;
    };
    const measure = async (fast = false) => {
      p.move();
      const M = shipMove(S0);
      cube.group.visible = true; ct.show(true);
      cube.set([1, 0, 0], [0, 1, 0], [0, 0, 1]);
      if (fast) cube.set(v3(col(M, 0)), v3(col(M, 1)), v3(col(M, 2)));
      else await cube.morph(v3(col(M, 0)), v3(col(M, 1)), v3(col(M, 2)), p.g.headless ? 10 : 900);
      ct.set(`volume × ${fmtN(det(M))}`);
      if (spVolumeOk(S0)) { tick(1); sfx.success(); paint(); say('The unit cube keeps its volume: × 1.', 'good'); return; }
      const dM = det(M);
      const how = Math.abs(dM) < 1e-9 ? 'flattened'
        : dM < 0 ? (Math.abs(Math.abs(dM) - 1) < 1e-9 ? 'mirrored (turned over), though the same size' : `mirrored (turned over) and ${Math.abs(dM) < 1 ? 'crushed' : 'stretched'}`)
        : dM < 1 ? 'crushed' : 'stretched';
      paint(); sfx.miss(); say(`This setting scales volume by ${fmtN(dM)}. The ark would come out ${how}.`, 'bad');
    };
    const forecast = () => {
      p.move();
      const f = spForecast(S0);
      ghost.object.visible = true; ghost.at(v3(f, 0.02)); ghost.reset(C.result);
      gt.show(true); gt.at(v3(f)); gt.set(`forecast ${fmtV(f)}`);
      foot.setOpacity(1); footRing.object.visible = true; ft.show(true);
      placeFoot(footY);
      say('Drag the white marker along the stream, or type its height y, to the point closest to the forecast.');
    };
    let footY = -1;
    const placeFoot = (y: number, sync = true) => {
      footY = y;
      if (sync) footIn.set([y]);
      if (!footRing.object.visible) return;
      const fp: V3 = [STREAM_X, y, 0.06];
      foot.at(fp); footRing.set(fp, fp); ft.at([STREAM_X, y, 0]);
      const f = spForecast(S0);
      drop.setPoints([v3(f, 0.04), [STREAM_X, y, 0.04]]); drop.object.visible = true;
      ft.set(`foot (${fmtN(STREAM_X)}, ${y.toFixed(2).replace(/^-/, '−')})`);
    };
    const checkFoot = () => {
      if (won || firing) return;
      if (!footRing.object.visible) { sfx.miss(); say('Forecast first: the marker goes straight across from the forecast.', 'bad'); return; }
      const f = spForecast(S0);
      if (!spFootOk([STREAM_X, footY, 0], f, d === 'commander' ? 0.01 : 0.05)) {
        sfx.miss(); say(`The foot is at ${fmtV([STREAM_X, footY, 0])}. The dashed line does not meet the stream at a right angle yet.`, 'bad'); return;
      }
      placeFoot(streamFoot(f)[1]);
      mark ??= new RightAngle(p, [STREAM_X, footY, 0.05], [0, -1, 0], [f[0] - STREAM_X, 0, 0], 0.3);
      mark.set([STREAM_X, footY, 0.05], [0, -1, 0], [f[0] - STREAM_X, 0, 0]); mark.show(true);
      const dd = distToStream(f);
      if (spClear(S0)) { tick(2); sfx.success(); paint(); say(`The closest point of the stream is ${fmtV(streamFoot(f))}: the ark would be ${fmtN(dd)} steps clear.`, 'good'); }
      else { sfx.miss(); paint(); say(`Only ${fmtN(dd)} from the stream. Clearance needed: ${CLEARANCE}.`, 'bad'); }
    };
    p.g.drag.add({
      target: footRing.grab, getPos: () => new Vector3(STREAM_X, footY, 0.06), snap: () => p.snap(), planar: true,
      constrain: (q) => new Vector3(STREAM_X, Math.max(-6, Math.min(7, q.y)), 0.06),
      onMove: (q) => { placeFoot(q.y); sfx.tick(q.y); },
      onEnd: () => { p.move(); checkFoot(); },
    });
    const fire = async (fast = false) => {
      if (won || firing || !(flags[0] && flags[1] && flags[2])) return;
      firing = true; fireBtn.disabled = true;
      p.move();
      // the spire translator checks the setting before the one unlocked pulse
      const line = normLine(((await translator()) === 'mine' ? S.translatorMine : S.translatorBackup)[0]);
      p.bark(line.who, line.text);
      say(line.text, 'good');
      ghost.object.visible = false; gt.show(false); drop.object.visible = false; footRing.object.visible = false; foot.setOpacity(0); ft.show(false); mark?.show(false);
      sfx.collapse(); p.g.stage.flash(0.18, 400); void p.g.stage.shockwave([0, 0, 0], 1800, 0.8);
      // the pulse moves the ark (a quarter turn about the Anchor); the stream keeps its course
      const holder = new Group();
      root.add(holder);
      holder.add(ark);
      holder.matrixAutoUpdate = false;
      const place = (k: number) => {
        const M = turn3(k);
        holder.matrix.set(M[0][0], M[0][1], M[0][2], 0, M[1][0], M[1][1], M[1][2], 0, M[2][0], M[2][1], M[2][2], 0, 0, 0, 0, 1);
        holder.matrixWorldNeedsUpdate = true;
        const q = matVec(M, ARK); at.at(v3(q));
      };
      if (fast) place(1); else await animate(p.g.headless ? 20 : 2400, place, ease.inOut);
      at.set(`ark ${fmtV(ARK_AFTER)}`);
      won = true; firing = false; tick(3); sfx.success();
      say(`The ark is at ${fmtV(ARK_AFTER)}, clear of the stream.`, 'good');
      p.win();
    };
    const fireBtn = button('Fire once', () => void fire(), { cls: 'primary small' });
    fireBtn.disabled = true;
    p.dock().append(
      h('div', { class: 'c17-row' }, input.el),
      h('div', { class: 'c17-btns' }, button('Check setting', () => void checkSetting(), { cls: 'small' }), button('Measure volume', () => void measure(), { cls: 'small' }), button('Forecast', () => forecast(), { cls: 'small' }), footIn.el, fireBtn),
      msg);
    paint();
    const solveAll = async (fast: boolean) => {
      S0 = SP_SETTING.map((x) => x.slice()); input.set(S0); reset(); paint();
      checkSetting(); await measure(fast); forecast();
      placeFoot(streamFoot(spForecast(S0))[1]); checkFoot();
      await fire(fast);
    };
    return {
      async showMe() { await solveAll(false); },
      async solve() { await solveAll(true); },
      async wrong() { S0 = R.map((x) => x.slice()); input.set(S0); reset(); checkSetting(); await measure(true); forecast(); },
    };
  },
};
const meqR = (S0: Mat) => S0.every((row, i) => row.every((x, j) => Math.abs(x - R[i][j]) < 1e-9));

// ------------------------------------------------------------------ the Act VI Review (Ilse, live)

/** (F) "Changing the basis moves the point." */
const ilseMoves: DoubtDef = {
  id: 'c17-r-moves', who: 'ilse', isTrue: false,
  claim: 'Changing the basis moves the point.',
  reason: 'The point stays where it is. Only its numbers change: the buoy at $(3, 2)$ is $(1, 2)$ in the Anchor’s basis, and it never moved.',
  goal: 'Drag the grid arrows: a new basis. Watch the yellow point. **Challenge it** (the point stays put) or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [1.4, 1.8], height: 8.5, ms: 0 });
    const pt = new Dot(v3(P1_SHIP, 0.05), { color: C.result, size: 0.12 });
    const ptag = tag('', v3(P1_SHIP), 'y', [0, -26]);
    p.add(pt, ptag.object); p.onDispose(() => ptag.dispose());
    const path = new AnchorPath(p, identity(2), { showTag: false });
    const r = p.readout('One point');
    const gh = gridHandles(p, identity(2));
    gh.onChange((G) => {
      const c = anchorOf(P1_SHIP, G);
      path.setGrid(G);
      if (c) { path.show(true); path.set(c); } else path.show(false);
      ptag.set(c ? `stays at ${fmtV(P1_SHIP)} · numbers ${fmtV(c)}` : `stays at ${fmtV(P1_SHIP)}`);
      r.row('pos', 'where the point is', fmtV(P1_SHIP), C.result);
      r.row('num', 'its numbers in this basis', c ? fmtV(c) : 'none: the arrows are on one line', COPPER);
    });
    return {
      holds: () => basisMovesPointHolds(P1_SHIP, gh.G),
      describe: () => {
        const c = anchorOf(P1_SHIP, gh.G);
        if (!c) return 'the arrows lie on one line';
        if (meq(gh.G, identity(2), 1e-9)) return `basis ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))}: the basis has not changed yet, so the point is at ${fmtV(P1_SHIP)} and its numbers are ${fmtV(c)}`;
        return `basis ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))}: the point is still at ${fmtV(P1_SHIP)}; its numbers are ${fmtV(c)}`;
      },
      randomize(rr, edge) { gh.set(edge === 0 ? P2 : randGrid(rr)); },
      edgeCases: 1,
      async showMe() { await gh.to(P2, 900); },
    };
  },
};

/** (F) "P converts standard numbers into B-numbers." */
const ilseP: DoubtDef = {
  id: 'c17-r-p', who: 'ilse', isTrue: false,
  claim: '$P$ converts standard numbers into B-numbers.',
  reason: '$P$ goes the other way: its columns are the basis arrows in standard numbers, so $P[\\mathbf x]_\\mathcal B = \\mathbf x$. B-numbers come from solving, $P^{-1}\\mathbf x$. For the Anchor’s basis and $(3, 2)$: $P(3, 2) = (5, 2)$, but the B-numbers are $(1, 2)$. My mistake was not this one. I never translated at all: I entered $R$ as it was, and the Anchor read it in its own grid.',
  goal: 'Drag the basis arrows and the point $\\mathbf x$. The orange dot is $P\\mathbf x$; the readout gives the B-numbers of $\\mathbf x$. **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [1.8, 1.9], height: 9, ms: 0 });
    let x: number[] = P1_SHIP.slice();
    const px = new Dot([0, 0, 0.05], { color: C.orange, size: 0.1 });
    const pxt = tag('', [0, 0, 0], 'dim', [0, 24]);
    p.add(px, pxt.object); p.onDispose(() => pxt.dispose());
    const r = p.readout('Which way does P go?');
    const gh = gridHandles(p, identity(2));
    const draw = () => {
      const G = gh.G, c = anchorOf(x, G), q = matVec(G, x);
      px.at(v3(q, 0.05)); pxt.at(v3(q)); pxt.set(`P x = ${fmtV(q)}`);
      r.row('x', '$\\mathbf x$, standard numbers', fmtV(x), C.result);
      r.row('px', '$P\\mathbf x$', fmtV(q), C.orange);
      r.row('b', 'B-numbers of $\\mathbf x$', c ? fmtV(c) : 'none', COPPER);
    };
    const xh = new Dot(v3(x, 0.06), { color: C.result, size: 0.12 });
    const xr = new Arrow(v3(x, 0.06), v3(x, 0.06), { color: C.result, handle: true, label: '$\\mathbf x$' });
    p.add(xh, xr);
    const setX = (q: number[]) => { x = [q[0], q[1]]; xh.at(v3(x, 0.06)); xr.set(v3(x, 0.06), v3(x, 0.06)); draw(); };
    p.g.drag.add({ target: xr.grab, getPos: () => new Vector3(x[0], x[1], 0.06), snap: () => p.snap(), planar: true, onMove: (q) => setX([q.x, q.y]), onEnd: () => {} });
    gh.onChange(() => draw());
    return {
      holds: () => pToBHolds(gh.G, x),
      describe: () => { const c = anchorOf(x, gh.G); return c ? `basis ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))}, $\\mathbf x$ = ${fmtV(x)}: $P\\mathbf x$ = ${fmtV(matVec(gh.G, x))}, ${pToBHolds(gh.G, x) ? 'and the B-numbers are also' : 'but the B-numbers are'} ${fmtV(c)}` : 'the basis arrows lie on one line'; },
      randomize(rr, edge) { if (edge === 0) { gh.set(P2); setX(P1_SHIP); } else { gh.set(randGrid(rr)); setX([rint(rr, -2, 3), rint(rr, -2, 3)]); } },
      edgeCases: 1,
      async showMe() { setX(P1_SHIP); await gh.to(P2, 900); },
    };
  },
};

/** (T) "If four pulses of one matrix bring every point home, four pulses of any similar matrix do too." */
const FOUR_HOME: { id: string; name: string; M: Mat }[] = [
  { id: 'turn', name: 'quarter turn', M: R2 },
  { id: 'half', name: 'half turn', M: [[-1, 0], [0, -1]] },
  { id: 'flip', name: 'flip', M: [[0, 1], [1, 0]] },
  { id: 'stretch', name: 'stretch', M: [[2, 0], [0, 1]] },
];
/** Four pulses bring every point home: A⁴ = I. */
const home4 = (M: Mat): boolean => meq(mpow(M, 4), identity(2), 1e-9);
/** The Shake tests the claim's condition, so it only picks moves that come home (not the stretch). */
const FOUR_HOME_SHAKE = FOUR_HOME.filter((f) => home4(f.M));
const ilseFour: DoubtDef = {
  id: 'c17-r-four', who: 'ilse', isTrue: true,
  claim: 'If four pulses of one matrix bring every point home, four pulses of any similar matrix do too.',
  reason: '$(PAP^{-1})^4 = PAP^{-1}\\,PAP^{-1}\\,PAP^{-1}\\,PAP^{-1} = PA^4P^{-1}$: each $P^{-1}P$ in the middle cancels. If $A^4 = I$ then $PA^4P^{-1} = PP^{-1} = I$. That is why the measured pulse brings the ground layer home every fourth time, like Ilse’s quarter turn.',
  goal: 'Pick a move $A$ and drag the grid arrows. White: four pulses of $A$. Copper: four pulses of the same move read in the copper grid. **Back it** (Ilse will shake it) or **Challenge it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.4, 0.4], height: 8.6, ms: 0 });
    let A: Mat = R2;
    const start = [1, 0.5];
    const trailA = new FatSegments(p.g.stage, [], { color: C.white, width: 1.5, dashed: true, opacity: 0.7, dashSize: 0.1, gapSize: 0.07 });
    const trailB = new FatSegments(p.g.stage, [], { color: COPPER, width: 1.5, dashed: true, opacity: 0.85, dashSize: 0.1, gapSize: 0.07 });
    const dotA = new Dot(v3(start, 0.05), { color: C.white, size: 0.09 });
    const dotB = new Dot(v3(start, 0.06), { color: COPPER, size: 0.09 });
    p.add(trailA.object, trailB.object, dotA, dotB);
    p.onDispose(() => { trailA.dispose(); trailB.dispose(); });
    const r = p.readout('Four pulses');
    const gh = gridHandles(p, P2);
    const draw = () => {
      const B = motionIn(A, gh.G);
      const seg = (M: Mat): [V3, V3][] => [0, 1, 2, 3].map((k) => [v3(matVec(mpow(M, k), start), 0.03), v3(matVec(mpow(M, k + 1), start), 0.03)]);
      trailA.setSegments(seg(A));
      if (B) trailB.setSegments(seg(B));
      trailB.object.visible = !!B;
      r.row('a', `four pulses of $A$ (${FOUR_HOME.find((f) => f.M === A)?.name ?? 'your move'})`, home4(A) ? 'home' : 'not home', C.white);
      r.row('b', 'four pulses of $PAP^{-1}$', B ? (home4(B) ? 'home' : 'not home') : 'no grid', COPPER);
    };
    gh.onChange(() => draw());
    const picks = h('div', { class: 'c17-btns' }, ...FOUR_HOME.map((f) => button(f.name, () => { A = f.M; draw(); sfx.click(); }, { cls: 'small' })));
    p.dock().append(h('div', { class: 'kicker' }, 'The move A'), picks);
    draw();
    const edges: [Mat, Mat][] = [[T, PC], [R2, [[0, 1], [1, 0]]], [[[-1, 0], [0, -1]], [[3, 1], [1, 1]]]];
    return {
      holds: () => fourHomeHolds(A, gh.G),
      describe: () => {
        const B = motionIn(A, gh.G);
        if (!B) return 'the grid arrows lie on one line';
        const where = (M: Mat) => (home4(M) ? 'home' : `to ${fmtV(matVec(mpow(M, 4), start))}`);
        return `$A$ = ${texFree(A)}, read in the grid ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))}: four pulses of $A$ bring $(1, 0.5)$ ${where(A)}, four pulses of $PAP^{-1}$ bring it ${where(B)}${home4(A) ? '' : ' ($A$ does not come home, so the claim says nothing about this case)'}`;
      },
      async play() {
        const B = motionIn(A, gh.G) ?? A;
        for (let k = 1; k <= 4; k++) { dotA.at(v3(matVec(mpow(A, k), start), 0.05)); dotB.at(v3(matVec(mpow(B, k), start), 0.06)); await wait(p.g.headless ? 2 : 90); }
      },
      randomize(rr, edge) {
        if (edge !== undefined) { const [a, g] = edges[edge]; A = a; gh.set(g); }
        else { A = FOUR_HOME_SHAKE[rint(rr, 0, FOUR_HOME_SHAKE.length - 1)].M; gh.set(randGrid(rr)); }
        draw();
      },
      edgeCases: edges.length,
      async showMe() { A = R2; await gh.to(P2, 500); draw(); },
    };
  },
};
const texFree = (M: Mat) => `(${M.map((r) => r.map((x) => fmtN(x)).join(', ')).join('; ')})`;

/** (F) "Similar matrices have the same entries." */
const ilseEntries: DoubtDef = {
  id: 'c17-r-entries', who: 'ilse', isTrue: false,
  claim: 'Similar matrices have the same entries.',
  reason: 'They describe the same move, but the entries depend on the grid. My quarter turn $R = \\begin{bmatrix} 0 & -1 \\\\ 1 & 0 \\end{bmatrix}$ is $\\begin{bmatrix} -1 & -2 \\\\ 1 & 1 \\end{bmatrix}$ in the Anchor’s basis: same area scale, same sum down the diagonal, different entries.',
  goal: 'The move is Ilse’s quarter turn $R$. Drag the basis arrows: the readout gives $P^{-1}RP$, the same move in that basis. **Challenge it** or **Back it**.',
  view: '2d',
  setup(p) {
    void p.g.stage.view2D({ center: [0.8, 0.8], height: 8.5, ms: 0 });
    const r = p.readout('One move, two descriptions');
    r.row('a', '$R$ in our basis', `$${texSmall(R2)}$`, C.white);
    const gh = gridHandles(p, identity(2));
    gh.onChange((G) => { const B = inGrid(R2, G); r.row('b', '$P^{-1}RP$ in the copper basis', B ? `$${texSmall(B.map((x) => x.map((y) => Math.round(y * 1000) / 1000)))}$` : 'no basis', COPPER); });
    return {
      holds: () => sameEntriesHolds(R2, gh.G),
      describe: () => { const B = inGrid(R2, gh.G); return B ? `in the basis ${fmtV(col(gh.G, 0))}, ${fmtV(col(gh.G, 1))}, the quarter turn has entries ${texFree(B.map((x) => x.map((y) => Math.round(y * 1000) / 1000)))}` : 'the arrows lie on one line'; },
      randomize(rr, edge) { gh.set(edge === 0 ? P2 : randGrid(rr)); },
      edgeCases: 1,
      async showMe() { await gh.to(P2, 900); },
    };
  },
};

export const review: ReviewDef = {
  id: 'c17-review', who: 'ilse', title: 'Act VI Review',
  claims: [ilseMoves, ilseFour, ilseP, ilseEntries],
};
