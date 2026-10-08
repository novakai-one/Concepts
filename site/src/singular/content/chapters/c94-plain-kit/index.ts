// Chapter 94 (developer, off the map): proof of the plain maths kit (kit/plain). Open with ?chapter=c94.
// Five short puzzles in Chapter 18's calm look: u + v tip to tail, c·v, a·u + b·v onto a ring, the length
// of v, and a three-round drill of one-box equations.
import type { ChapterDef } from '../../../game/types';
import { add2, combo, drill, len1, scale1 } from './puzzles';

const ch: ChapterDef = {
  id: 'c94',
  act: 99,
  num: 94,
  title: 'Kit: plain maths',
  subtitle: 'Vectors, sums, multiples, length',
  nodes: [],
  dev: true,
  calm: true,
  beats: [
    { kind: 'puzzle', id: 'add', puzzle: add2 },
    { kind: 'puzzle', id: 'scale', puzzle: scale1 },
    { kind: 'puzzle', id: 'combo', puzzle: combo },
    { kind: 'puzzle', id: 'length', puzzle: len1 },
    { kind: 'puzzle', id: 'drill', puzzle: drill },
  ],
};
export default ch;
