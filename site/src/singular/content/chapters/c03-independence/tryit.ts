// Chapter 3, Try it: a v + b w = u, drawn tip to tail in 3-D. The player types a and b and presses Draw; a miss
// shows the calculation and the gap to u. Then one box: v + 2w + [?] u = 0, and the triangle closes.
import type { PuzzleDef } from '../../../game/types';
import { button, h, inline } from '../../../ui/ui';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { NumCell, eqRow, fresh, focusSoon, freshObjective, hideHint, hinter, plainDock, record, same, sg, UNREAD_M, type EqRow } from '../../../kit/plain';
import { Space, add3, mul3, puzzleHost, to3 } from './space';
import { TRY, U, V, W } from './text';

const KEY = 'c03';
const O: [number, number, number] = [0, 0, 0];
const V3 = to3(V), W3 = to3(W), U3 = to3(U);
/** The camera: the plane of v and w seen at a slant, so the picture reads as flat but not as a line. */
export const VIEW = { az: -140, el: 26, zoom: 0.85 };

export const tryit: PuzzleDef = {
  id: 'c03-try', title: TRY.title, goal: TRY.goal, subgoals: TRY.subgoals, hints: TRY.hints1, par: 3, view: '3d',
  setup(p) {
    freshObjective(p, TRY.goal, 2);
    const sp = new Space(puzzleHost(p));
    const d = plainDock(p, { head: TRY.head });
    const base = () => {
      sp.arrow('v', 'g').set(V3, O).label('$\\mathbf v$');
      sp.arrow('w', 'b').set(W3, O).label('$\\mathbf w$');
      sp.arrow('u', 'w').set(U3, O).label('$\\mathbf u$');
    };
    base();
    void sp.enter([V3, W3, U3], VIEW);

    // stage 1: [a] v + [b] w = u
    const a = new NumCell({ aria: 'a', onEnter: () => void draw(), cls: 'm', placeholder: 'a' });
    const b = new NumCell({ aria: 'b', onEnter: () => void draw(), cls: 'm', placeholder: 'b' });
    const go = button(TRY.go, () => void draw(), { cls: 'primary small' });
    const k = (t: string) => h('span', { class: 'k', html: inline(t) });
    const row1 = h('div', { class: 'tj-row' }, a.el, k('$\\mathbf v\\ +$'), b.el, k('$\\mathbf w = \\mathbf u$'), go);
    d.body.append(row1);
    d.msg(TRY.start);
    focusSoon(p, a);
    let stage = 0, busy = false;
    const att = fresh();
    let row2: EqRow<number> | null = null;

    const draw = async (x?: [number, number]) => {
      if (busy || stage !== 0) return;
      if (x) { a.set(x[0]); b.set(x[1]); }
      const s = a.value(), t = b.value();
      if (s === null || t === null) { d.msg(UNREAD_M, 'warn'); return; }
      busy = true; go.disabled = true; p.move(); d.msg('');
      try {
        sp.clear();
        base();
        sp.arrow('v', 'g').dim(0.35);
        sp.arrow('w', 'b').dim(0.35);
        const end = await sp.chain([{ id: 'av', v: mul3(s, V3), kind: 'g' }, { id: 'bw', v: mul3(t, W3), kind: 'b' }]);
        if (same(end, U)) {
          stage = 1;
          sfx.success();
          sg(p, 0);
          d.msg(TRY.hit, 'good');
          ask();
          return;
        }
        att.wrong++;
        sfx.miss();
        sp.gap(end, U3);
        d.msg(TRY.miss(s, t, end), 'bad');
      } finally { busy = false; go.disabled = stage !== 0; }
    };

    // stage 2: v + 2w + [?] u = 0
    const ask = () => {
      hideHint(p);
      p.setGoal(TRY.goal2);
      row2 = eqRow({ left: TRY.left2, right: TRY.right2, d, onCheck: (c) => void close(c) });
      row1.replaceWith(row2.el);
      focusSoon(p, row2);
    };
    const close = async (c: number) => {
      if (busy || stage !== 1 || !row2) return;
      busy = true; row2.enable(false); p.move(); d.msg('');
      try {
        sp.ghost(null);
        sp.gap(null);
        const cu = sp.arrow('cu', 'w');
        cu.hide();
        sp.arrow('u', 'w').dim(0.3);
        await cu.grow(mul3(c, U3), { from: U3 });
        const end = add3(U3, mul3(c, U3));
        if (same(c, -1)) {
          stage = 2;
          sp.arrow('u', 'w').hide();
          cu.label('$-\\mathbf u$');
          sfx.arrive();
          sg(p, 1);
          d.msg(TRY.hit2, 'good');
          record(KEY, 'try', att);
          await wait(p.g.headless ? 50 : 1600);
          p.win();
          return;
        }
        att.wrong++;
        sfx.miss();
        sp.ghost(end);
        sp.gap(end, O);
        d.msg(TRY.miss2(c, end), 'bad');
      } finally { busy = false; row2?.enable(stage === 1); }
    };

    const hint = hinter(() => (stage === 0 ? TRY.hints1 : stage === 1 ? TRY.hints2 : []), () => { att.help++; });
    const all = async () => {
      while (busy) await wait(20);
      att.help++;
      if (stage === 0) await draw([1, 2]);
      while (busy) await wait(20);
      if (stage === 1 && row2) { row2.set(-1); row2.check(); }
      while (!p.won) await wait(20);
    };
    return { hint, showMe: all, solve: all, async wrong() { await draw([1, 1]); } };
  },
};
