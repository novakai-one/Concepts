// Chapter 2: linear combinations and span, in plain maths (docs/singular/ch18-plain-style.md, ch18-why.md).
// Two ideas, each found by typing numbers, then named, then practised:
//   a v + b w hits a target (a linear combination, its weights) → ten rounds;
//   everything a v + b w can make (the span: a plane, or one line when v and w are on one line) → six rounds.
// Then two harder puzzles: by hand (the rows become two equations), and in 3-D (a plane, and a point off it).
// rig.ts, reach.ts and logic.ts are no longer used here: Chapter 3 imports them.
import type { ChapterDef } from '../../../game/types';
import { tryLC, trySpan } from './try';
import { drill1, drill2 } from './drills';
import { byHand, in3d } from './hard';
import { lcVisual, spanVisual } from './visuals';
import { buildLincomb } from './build';
import { CATCHUP, IN_SHORT, NAME_LC, NAME_SPAN, TITLE, WRAP } from './text';

const ch: ChapterDef = {
  id: 'c02',
  act: 1,
  num: 2,
  title: TITLE,
  subtitle: 'Linear combinations and span',
  nodes: ['N03'],
  palette: 'default',
  music: 'explore',
  calm: true,
  inShort: IN_SHORT,
  prereqs: ['c01'],
  catchup: CATCHUP,
  beats: [
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: TITLE, body: IN_SHORT } },
    { kind: 'puzzle', id: 'p1', puzzle: tryLC },
    {
      kind: 'name', id: 'name-lincomb', entry: {
        id: 'linear-combination', term: 'linear combination', nodes: ['N03'], visual: lcVisual, ...NAME_LC,
      },
    },
    { kind: 'puzzle', id: 'drill1', puzzle: drill1 },
    { kind: 'puzzle', id: 'p2', puzzle: trySpan },
    {
      kind: 'name', id: 'name-span', entry: {
        id: 'span', term: 'span', nodes: ['N03'], visual: spanVisual, ...NAME_SPAN,
      },
    },
    { kind: 'puzzle', id: 'drill2', puzzle: drill2 },
    { kind: 'puzzle', id: 'p3', puzzle: byHand },
    { kind: 'puzzle', id: 'p4', puzzle: in3d },
    { kind: 'card', id: 'why', card: { kind: 'why', title: WRAP.title, body: WRAP.body } },
    { kind: 'build', id: 'build-lincomb', build: buildLincomb },
  ],
};

export default ch;
