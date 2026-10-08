// Chapter 3: "Can the other vectors already make this one?" (N04): linearly dependent, linearly independent.
// Plain maths in Chapter 18's calm look (docs/singular/ch18-why.md). The player makes u from v and w by typing
// a and b, closes the triangle v + 2w − u = 0, then the name; ten short rounds; four harder cases; a wrap-up.
// The end of Act I (the Meridian, sheared) stays as a short, skippable story beat.
import './c03.css';
import type { ChapterDef } from '../../../game/types';
import { S } from './script';
import { tryit } from './tryit';
import { drill, more } from './drill';
import { coldOpen, reveal, triangleVisual } from './scenes';
import { CATCHUP, INSHORT, NAME, TITLE, WRAP } from './text';

const ch: ChapterDef = {
  id: 'c03',
  act: 1,
  num: 3,
  title: TITLE,
  subtitle: 'Linear independence',
  nodes: ['N04'],
  palette: 'default',
  music: 'explore',
  script: S,
  calm: true,
  inShort: `${INSHORT.title}\n\n${INSHORT.body}`,
  prereqs: ['c02'],
  catchup: CATCHUP,
  beats: [
    { kind: 'cinematic', id: 'open', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: INSHORT.title, body: INSHORT.body } },
    { kind: 'puzzle', id: 'try', puzzle: tryit },
    {
      kind: 'name', id: 'name-dependent', entry: {
        id: 'linear-dependence', term: 'linearly dependent', question: NAME.question, nodes: ['N04'],
        saw: NAME.saw, means: NAME.means, name: NAME.name, formula: NAME.formula, why: NAME.why, use: NAME.use,
        visual: triangleVisual,
      },
    },
    { kind: 'puzzle', id: 'drill', puzzle: drill },
    { kind: 'puzzle', id: 'more', puzzle: more },
    { kind: 'card', id: 'wrap', card: { kind: 'inshort', title: WRAP.title, body: WRAP.body } },
    { kind: 'cinematic', id: 'reveal', run: reveal },
  ],
};

export default ch;
