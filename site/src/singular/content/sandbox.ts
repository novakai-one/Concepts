// The holotable sandbox (GDD §11, SHOULD): free play with any 2×2 move, with overlays in plain words.
// Not part of the story order (dev: true); opened from the title screen.
import type { ChapterDef, PuzzleDef, V3 } from '../game/types';
import { MatrixView } from '../kit/matrixview';
import { FatLine } from '../gfx/lines';
import { InfLine } from '../gfx/shapes';
import { Label } from '../gfx/label';
import { h } from '../ui/ui';
import { C } from '../core/theme';
import { sfx } from '../audio/sfx';
import { nice } from '../math/frac';
import { det, eig2, svd, type Mat } from '../math/la';
import { T } from './truth';

const PRESETS: [string, Mat][] = [
  ['Shear', [[1, 1], [0, 1]]],
  ['Quarter turn', [[0, -1], [1, 0]]],
  ['Stretch', [[2, 0], [0, 0.5]]],
  ['Mirror', [[1, 0], [0, -1]]],
  ['Flatten', [[1, 2], [0.5, 1]]],
  ['The routine pulse', T],
  ['Nothing', [[1, 0], [0, 1]]],
];

const circle = (M: Mat, n = 96): V3[] => Array.from({ length: n + 1 }, (_, i) => {
  const t = (i / n) * 2 * Math.PI, x = Math.cos(t), y = Math.sin(t);
  return [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y, 0.01] as V3;
});

const table: PuzzleDef = {
  id: 'sandbox-p1',
  title: 'The holotable',
  goal: 'Drag the two column arrows, type numbers, or pick a preset. Turn on the overlays to see what the move does. Nothing here is marked.',
  hints: ['Each column says where one axis arrow lands.', 'The area factor is the determinant.', 'A move with area factor 0 flattens the plane onto a line.'],
  par: 99,
  setup(p) {
    p.g.stage.view2D({ center: [0, 0], height: 10, ms: 0 });
    const on = { area: true, lines: false, ellipse: false };
    const l1 = new InfLine(p.g.stage, [0, 0, 0], [1, 0, 0], { color: C.result, width: 2 });
    const l2 = new InfLine(p.g.stage, [0, 0, 0], [0, 1, 0], { color: C.u, width: 2 });
    const unit = new FatLine(p.g.stage, circle([[1, 0], [0, 1]]), { color: '#7d8aa5', width: 1.4, dashed: true, opacity: 0.7 });
    const ell = new FatLine(p.g.stage, circle([[1, 0], [0, 1]]), { color: C.result, width: 2.4, intensity: 1.3 });
    const ax1 = new FatLine(p.g.stage, [[0, 0, 0], [1, 0, 0]], { color: C.result, width: 2 });
    const ax2 = new FatLine(p.g.stage, [[0, 0, 0], [0, 1, 0]], { color: C.u, width: 2 });
    const lab1 = new Label('', [1, 0, 0], { className: 'tag' });
    const lab2 = new Label('', [0, 1, 0], { className: 'tag' });
    p.add(l1.object, l2.object, unit.object, ell.object, ax1.object, ax2.object, lab1.object, lab2.object);
    p.onDispose(() => { for (const x of [l1, l2, unit, ell, ax1, ax2]) x.dispose(); lab1.dispose(); lab2.dispose(); });
    const r = p.readout('This move');
    let mv: MatrixView | null = null;
    const upd = (M: Mat) => {
      const d = det(M);
      if (mv?.area) mv.area.object.visible = on.area;
      r.row('d', 'area factor', nice(+d.toFixed(4)), Math.abs(d) < 1e-9 ? C.violet : d < 0 ? C.orange : C.result);
      r.row('f', '', Math.abs(d) < 1e-9 ? 'flattened: some arrows land on zero' : d < 0 ? 'mirrored (orientation flips)' : 'keeps orientation');
      const e = eig2(M);
      const showLines = on.lines && e.kind === 'real';
      l1.object.visible = showLines && !!(e.kind === 'real' && e.vectors[0]);
      l2.object.visible = showLines && !!(e.kind === 'real' && e.vectors[1]) && !(e.kind === 'real' && Math.abs(e.values[0] - e.values[1]) < 1e-9);
      lab1.object.visible = l1.object.visible; lab2.object.visible = l2.object.visible;
      if (e.kind === 'real') {
        const [v1, v2] = e.vectors;
        if (v1) { l1.set([0, 0, 0], [v1[0], v1[1], 0]); lab1.set(`×${nice(+e.values[0].toFixed(3))}`); lab1.object.position.set(v1[0] * 3.2, v1[1] * 3.2, 0); }
        if (v2) { l2.set([0, 0, 0], [v2[0], v2[1], 0]); lab2.set(`×${nice(+e.values[1].toFixed(3))}`); lab2.object.position.set(v2[0] * 3.2, v2[1] * 3.2, 0); }
      }
      const same = e.kind === 'real' && Math.abs(e.values[0] - e.values[1]) < 1e-9;
      const every = same && Math.abs(M[0][1]) + Math.abs(M[1][0]) < 1e-9;
      r.row('l', 'lines that do not turn', e.kind !== 'real' ? 'none: every line turns' : every ? `every line (stretch ×${nice(+e.values[0].toFixed(3))})` : same ? `one line, stretch ×${nice(+e.values[0].toFixed(3))}` : `two: stretch ×${nice(+e.values[0].toFixed(3))} and ×${nice(+e.values[1].toFixed(3))}`);
      unit.object.visible = ell.object.visible = ax1.object.visible = ax2.object.visible = on.ellipse;
      if (on.ellipse) {
        ell.setPoints(circle(M));
        const { U, S } = svd(M);
        ax1.setPoints([[0, 0, 0.02], [U[0][0] * S[0], U[1][0] * S[0], 0.02]]);
        ax2.setPoints([[0, 0, 0.02], [U[0][1] * S[1], U[1][1] * S[1], 0.02]]);
        r.row('s', 'circle becomes an ellipse', `longest ${nice(+S[0].toFixed(3))}, shortest ${nice(+S[1].toFixed(3))}`);
      } else r.row('s', 'circle becomes an ellipse', 'overlay off');
    };
    const view = new MatrixView(p, { draggable: true, input: true, showArea: true, snap: 0.5, onChange: (M) => upd(M) });
    mv = view;
    const toggles = h('div', { class: 'sandbox-toggles' }, ...([['area', 'Area'], ['lines', 'Lines that do not turn'], ['ellipse', 'Circle → ellipse']] as const).map(([k, label]) => {
      const b = h('button', { class: 'btn small', type: 'button', 'aria-pressed': String(on[k]) }, label);
      b.addEventListener('click', () => { on[k] = !on[k]; b.setAttribute('aria-pressed', String(on[k])); sfx.click(); upd(view.get()); });
      return b;
    }));
    const presets = h('div', { class: 'sandbox-presets' }, ...PRESETS.map(([name, M]) => {
      const b = h('button', { class: 'btn ghost small', type: 'button' }, name);
      b.addEventListener('click', () => { void view.to(M, 1200); });
      return b;
    }));
    p.dock().append(toggles, presets);
    upd(view.get());
    return { showMe: async () => { await view.to([[2, 1], [1, 2]], 1200); } };
  },
};

export const SANDBOX: ChapterDef = {
  id: 'sandbox', act: 99, num: 0, dev: true,
  title: 'The holotable', subtitle: 'Free play', nodes: [],
  beats: [{ kind: 'puzzle', id: 'table', puzzle: table }],
};
