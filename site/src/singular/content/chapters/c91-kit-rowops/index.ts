// Developer showcase for the row-operation kit (kit/rowops.ts + kit/system.ts). Not part of the story.
// Open with ?chapter=c91. Each puzzle: the board on the left, the lines or planes on the right.
import type { ChapterDef, PuzzleDef, Prediction } from '../../../game/types';
import { RowOpsBoard } from '../../../kit/rowops';
import { SystemView } from '../../../kit/system';
import { fmat } from '../../../math/frac';
import { gaussJordanSteps, gaussSteps, type RowOp } from '../../../math/rref';
import { fracText } from '../../../kit/rowops-logic';
import { C } from '../../../core/theme';

interface RowPuzzleOpts {
  id: string;
  title: string;
  goal: string;
  hints: string[];
  aug: number[][];
  n: 2 | 3;
  /** Win at reduced row echelon form (default) or at row echelon form. */
  target?: 'rref' | 'ref';
  predict?: Prediction;
  /** Readout heading and how to describe where the rows meet. */
  meet: string;
}

function rowPuzzle(o: RowPuzzleOpts): PuzzleDef {
  const target = o.target ?? 'rref';
  const steps = (m: ReturnType<typeof fmat>): RowOp[] => (target === 'rref' ? gaussJordanSteps(m, o.n) : gaussSteps(m, o.n)).ops;
  const par = steps(fmat(o.aug)).length;
  return {
    id: o.id,
    title: o.title,
    goal: o.goal,
    subgoals: target === 'rref' ? ['Row echelon form', 'Reduced row echelon form'] : ['Row echelon form'],
    hints: o.hints,
    par,
    predict: o.predict,
    view: o.n === 3 ? '3d' : '2d',
    setup(p) {
      const board = new RowOpsBoard(p, { aug: o.aug, n: o.n });
      const view = new SystemView(p, { n: o.n, aug: o.aug, board });
      const r = p.readout(o.n === 2 ? 'The lines' : 'The planes');
      const cls = view.classification();
      const where = cls.kind === 'unique' ? `(${cls.x.map(fracText).join(', ')})` : cls.kind === 'infinite' ? 'a whole line' : 'nowhere';
      const paint = () => {
        r.row('meet', o.meet, where, C.result);
        r.row('ops', 'Row operations', String(board.moves()));
        r.row('par', 'Fewest needed', String(par));
      };
      const shape = o.n === 2 ? 'line' : 'plane';
      r.note(cls.kind === 'none'
        ? `The two lines are parallel, so no point is on both. A row operation never changes which points are on every ${shape}.`
        : cls.kind === 'unique'
          ? `Each row operation turns one ${shape} about the yellow point. The point does not move.`
          : `Each row operation turns one ${shape} about the yellow line. The line does not move.`);
      paint();
      const check = () => {
        paint();
        const ref = board.isREF(), rref = board.isRREF();
        p.subgoal(0, ref);
        if (target === 'rref') p.subgoal(1, rref);
        if (target === 'rref' ? rref : ref) p.win();
      };
      board.subscribe(() => check());
      return {
        async showMe() { await board.play(steps(board.get()), 750); },
        async solve() { await board.play(steps(board.get()), 40); },
      };
    },
  };
}

const twoLines = rowPuzzle({
  id: 'rowops-lines',
  title: 'Where do the two lines meet?',
  goal: 'Row-reduce the augmented matrix to **reduced row echelon form**. Watch the yellow point while you work.',
  hints: [
    'Drag one row onto another to add a multiple of it. The multiplier is filled in for you: it makes one entry 0.',
    'A pivot of 1 in the top-left corner keeps the numbers whole. R2 starts with 1, so swap the rows first (the ⇅ button).',
    'Swap R1 and R2. Then $R_2 \\to R_2 - 2R_1$, then $R_2 \\to \\tfrac13 R_2$, then $R_1 \\to R_1 + R_2$.',
  ],
  aug: [[2, 1, 4], [1, -1, -1]],
  n: 2,
  meet: 'Where they meet',
  predict: {
    prompt: 'You replace the red row by (red row − 2 × green row). What happens to the point where the two lines meet?',
    choices: [{ id: 'stay', text: 'It stays where it is' }, { id: 'move', text: 'It moves along the green line' }, { id: 'gone', text: 'The lines stop meeting' }],
    answer: 'stay',
    reveal: 'It stays at $(1, 2)$. The point $(1, 2)$ satisfies both old equations, so it also satisfies any combination of them. Whichever line a row operation changes turns about that point.',
  },
});

const threePlanes = rowPuzzle({
  id: 'rowops-planes',
  title: 'Where do the three planes meet?',
  goal: 'Each row is a plane. Row-reduce to **reduced row echelon form** and read off the one point on all three planes. Drag to turn the view.',
  hints: [
    'Clear column 1 under the first pivot: drag R1 onto R2, then R1 onto R3.',
    'R2 now starts with −1. Multiply it by −1 (the × button) to make the pivot 1, then clear the rest of column 2.',
    'One way: $R_2 \\to R_2 - 2R_1$, $R_3 \\to R_3 - R_1$, $R_2 \\to -R_2$, $R_1 \\to R_1 - R_2$, $R_3 \\to R_3 + 2R_2$, $R_3 \\to \\tfrac17 R_3$, $R_1 \\to R_1 + 2R_3$, $R_2 \\to R_2 - 3R_3$.',
  ],
  aug: [[1, 1, 1, 4], [2, 1, -1, 3], [1, -1, 2, 1]],
  n: 3,
  meet: 'Where all three meet',
});

const sharedLine = rowPuzzle({
  id: 'rowops-free',
  title: 'What if the planes share a whole line?',
  goal: 'Row-reduce to **reduced row echelon form**. One row becomes all zeros. Then read the solutions: one unknown is free.',
  hints: [
    'Clear column 1 under the first pivot. After that, look at R2 and R3.',
    'R2 and R3 become the same row. Subtracting one from the other gives $0 = 0$: that plane disappears, because every point satisfies $0 = 0$.',
    'One way: $R_2 \\to R_2 - 2R_1$, $R_3 \\to R_3 - 3R_1$, $R_2 \\to -R_2$, $R_1 \\to R_1 - R_2$, $R_3 \\to R_3 + R_2$. Then $z$ is free: $x = z$, $y = 3 - 2z$.',
  ],
  aug: [[1, 1, 1, 3], [2, 1, 0, 3], [3, 2, 1, 6]],
  n: 3,
  meet: 'Where all three meet',
});

const parallel = rowPuzzle({
  id: 'rowops-none',
  title: 'Do these two lines meet at all?',
  goal: 'Reach **row echelon form**, then read the last row.',
  hints: [
    'Clear the entry under the first pivot: drag R1 onto R2.',
    '$R_2 \\to R_2 - 2R_1$ gives the row $0\\;0 \\mid -5$, which reads $0 = -5$.',
  ],
  aug: [[1, 2, 4], [2, 4, 3]],
  n: 2,
  target: 'ref',
  meet: 'Where they meet',
});

const ch: ChapterDef = {
  id: 'c91', act: 99, num: 91, title: 'Kit: row operations', subtitle: 'Row-reduce an augmented matrix and watch the lines and planes', nodes: [], dev: true,
  beats: [
    { kind: 'puzzle', id: 'p1', puzzle: twoLines },
    { kind: 'puzzle', id: 'p2', puzzle: threePlanes },
    { kind: 'puzzle', id: 'p3', puzzle: sharedLine },
    { kind: 'puzzle', id: 'p4', puzzle: parallel },
  ],
};
export default ch;
