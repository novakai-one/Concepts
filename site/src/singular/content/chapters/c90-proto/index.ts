// Prototype chapter used to test the engine end to end. Not part of the story.
import type { ChapterDef, PuzzleDef } from '../../../game/types';
import { doubtFlip, doubtOrder } from '../c01-vectors/briefing';
import { Arrow } from '../../../gfx/arrow';
import { Pad } from '../../../gfx/markers';
import { C } from '../../../core/theme';
import { Vector3 } from 'three';
import { nice } from '../../../math/frac';
import { sfx } from '../../../audio/sfx';

const reach: PuzzleDef = {
  id: 'proto-reach',
  title: 'Where is the beacon?',
  goal: 'Drag the tip of the green arrow onto the beacon.',
  hints: ['The beacon is 3 steps right and 2 steps up from the start.', 'Put the tip at (3, 2).'],
  predict: { prompt: 'How long will the arrow be?', choices: [{ id: 'a', text: '5' }, { id: 'b', text: 'About 3.6' }, { id: 'c', text: '6' }], answer: 'b', reveal: 'Its length is $\\sqrt{3^2+2^2}=\\sqrt{13}\\approx 3.6$.' },
  par: 1,
  setup(p) {
    p.grid();
    const v = new Arrow([0, 0, 0], [1, 0, 0], { color: C.v, label: '$\\mathbf v$', handle: true });
    const pad = new Pad(p.g.stage, [3, 2, 0], { label: 'beacon' });
    p.add(pad, v);
    const r = p.readout('Arrow');
    const upd = () => { r.row('v', '$\\mathbf v$', `(${nice(v.to.x)}, ${nice(v.to.y)})`, C.v); r.row('len', 'length', nice(v.to.length())); };
    upd();
    let last = '';
    p.g.drag.add({
      target: v.grab, getPos: () => v.to.clone(), snap: () => p.snap(),
      onMove: (q: Vector3) => { v.setTo([q.x, q.y, 0]); upd(); const k = `${Math.round(q.x)},${Math.round(q.y)}`; if (k !== last) { last = k; sfx.tick(q.y); } },
      onEnd: () => { p.move(); if (v.to.distanceTo(new Vector3(3, 2, 0)) < 0.05) { void pad.hit(); p.win(); } },
    });
    return {
      async showMe() { await v.moveTo([3, 2, 0], 900); upd(); await pad.hit(); p.win(); },
    };
  },
};

const ch: ChapterDef = {
  id: 'c90', act: 99, num: 90, title: 'Prototype', subtitle: 'Engine test', nodes: ['N01'], dev: true,
  beats: [
    { kind: 'scene', id: 's1', lines: [['you', 'This is a test of the comm channel. The words should fade in.'], ['narrator', 'A narration line, in italics, centred.']] },
    { kind: 'puzzle', id: 'p1', puzzle: reach },
    { kind: 'review', id: 'r1', review: { id: 'c90-review', who: 'bram', title: 'Test Review', claims: [{ ...doubtOrder, id: 'c90-r-order' }, { ...doubtFlip, id: 'c90-r-flip' }] } },
    { kind: 'name', id: 'n1', entry: { id: 'vector', term: 'vector', question: 'Where is it, and how do I get there?', saw: 'An arrow from the start to the beacon: **3 right, 2 up**.', means: 'The two numbers say how far to move along each direction.', name: 'A **vector** is a move: how far along each axis. We write it as a column of numbers.', formula: '\\mathbf v = \\begin{bmatrix} 3 \\\\ 2 \\end{bmatrix}', why: 'Each number is one step count along one axis.', cue: 'When you see **“how far and which way”**, think **vector**.', use: 'Every position, velocity and pixel colour in a game engine is a vector.' } },
    { kind: 'explain', id: 'e1', explain: { id: 'proto-e1', who: 'you', intro: 'Explain to the crew why the arrow is a vector.', steps: [{ ask: 'What do the two numbers of a vector tell you?', options: [{ id: 'a', text: 'How far to move along each axis.', right: true, why: 'Yes. 3 along x, 2 along y.' }, { id: 'b', text: 'Where the arrow starts.', right: false, why: 'The start can be anywhere. Move the arrow and the numbers stay the same.' }] }], summary: 'A vector is a move: **how far along each axis**. It does not care where it starts.', ownWords: 'Why is (3, 2) the same move wherever you start?' } },
    { kind: 'build', id: 'b1', build: { id: 'proto-add', fn: 'add', title: 'Add two moves', brief: 'Write `add(a, b)` that returns the move you get by doing `a` then `b`.', starter: 'def add(a, b):\n    # a and b are lists like [3, 2]\n    return []\n', solution: 'def add(a, b):\n    return [x + y for x, y in zip(a, b)]\n', tests: [{ name: 'add([1,2],[3,4])', args: [[1, 2], [3, 4]], expect: [4, 6] }, { name: '3-D', args: [[1, 0, 2], [0, 5, -2]], expect: [1, 5, 0] }], payoff: 'The ship adds your moves with this function.' } },
  ],
};
export default ch;
