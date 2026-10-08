// Prologue: "Where did everything go?" A first look at a linear transformation, in plain maths
// (docs/singular/ch18-plain-style.md). A short call (nine numbers, the ship leans), a grid grows, then the
// player presses Apply A and watches the whole grid move, carrying rows of points with it; they fill in where
// the next point lands (equal steps) and where the origin lands. Named after that. Ten short rounds with new
// matrices. A short close: the three facts, one open question.
import type { ChapterDef } from '../../../game/types';
import { pin } from '../../../game/caseboard';
import { coldOpen, gridOpen, rowsVisual } from './scenes';
import { drill, p1 } from './puzzles';
import { CLOSE, IN_SHORT, NAME } from './text';
import { S } from './script';

const ch: ChapterDef = {
  id: 'c00',
  act: 0,
  num: 0,
  title: 'Where did everything go?',
  subtitle: 'What a matrix does to the grid',
  nodes: ['N12'],
  palette: 'void',
  music: 'void',
  calm: true,
  inShort: IN_SHORT,
  beats: [
    { kind: 'cinematic', id: 'call', run: coldOpen },
    { kind: 'cinematic', id: 'grid', run: gridOpen },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    {
      kind: 'name', id: 'name-linear', entry: {
        id: NAME.id, term: NAME.term, question: NAME.question, nodes: ['N12'],
        saw: NAME.saw, means: NAME.means, name: NAME.name, use: NAME.use,
        visual: (g) => rowsVisual(g, { right: 600 }),
      },
    },
    { kind: 'puzzle', id: 'drill', puzzle: drill },
    {
      kind: 'card', id: 'close', card: {
        kind: 'inshort', title: CLOSE.title, body: CLOSE.body,
        visual: async (g) => {
          // the questions later chapters answer (Case board, behind the menu): no toast, nothing to read now
          pin('nine', 'What do the numbers in $A$ mean?', 'c00');
          pin('linear', 'Why does the origin never move?', 'c00');
          pin('light', 'What is the light at the origin?', 'c00');
          await rowsVisual(g);
        },
      },
    },
    { kind: 'scene', id: 'hook', lines: S.hook },
  ],
  script: S,
};

export default ch;
