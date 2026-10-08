import 'katex/dist/katex.min.css';
import '../styles/game.css';
import { Stage } from '../core/stage';
import { Backdrop } from '../gfx/background';
import { Grid2D } from '../gfx/grid';
import { Arrow } from '../gfx/arrow';
import { C } from '../core/theme';

const el = document.getElementById('stage')!;
const stage = new Stage(el);
(window as any).__stage = stage;
new Backdrop(stage);
const grid = new Grid2D(stage);
stage.world.add(grid.object);
const M = [[1, 1], [0, 1]];
const v = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, label: '$\\hat\\imath$' });
const w = new Arrow([0, 0, 0], [0, 1, 0], { color: C.w, label: '$\\hat\\jmath$' });
const r = new Arrow([0, 0, 0], [3, 2, 0], { color: C.result, label: '$A\\vec v$', handle: true });
stage.world.add(v.object, w.object, r.object);
void stage.view2D({ height: 10 });
stage.start();
const params = new URLSearchParams(location.search);
const mode = params.get('m') ?? 'shear';
(async () => {
  if (mode === 'shear') { grid.set(M); v.set([0,0,0],[1,0,0]); w.set([0,0,0],[1,1,0]); }
  if (mode === 'squash') { grid.set([[1, 2], [0.5, 1]]); }
  if (mode === '3d') { grid.set([[2, 1], [-1, 1]]); await stage.view3D({ distance: 18, azimuth: -70, elevation: 30 }); }
  (window as any).__ready = true;
})();
if (mode === 'wave') { grid.set([[1, 0], [0, 1]]); setTimeout(() => void stage.shockwave([0, 0, 0], 3000), 300); }
if (mode === 'buoys') {
  import('../gfx/buoys').then(async ({ BuoyField }) => {
    grid.setLook({ main: 0.15, base: 0.1, axis: 0.3 });
    const f = new BuoyField(stage, { extent: 6 });
    stage.world.add(f.object);
    f.highlight([f.indexOf([1, 1, 0]), f.indexOf([2, 2, 0]), f.indexOf([3, 3, 0])], '#59e1ff');
    await f.to([[1, 0.6], [0, 1]], 300);
  });
}
