// Epilogue · "Every point stays where it is" (GDD §6.12): Ilse's last setting is the identity; the final
// pulse moves nothing; the crew records the Broadcast (the player's own chain of ideas); Ilse's six
// questions; an optional layer that sorts what no single matrix can; the ark wakes; credits over the
// player's Field Manual; one line after the credits.
import type { Beat, ChapterDef, Game } from '../../../game/types';
import { BuoyField } from '../../../gfx/buoys';
import { h } from '../../../ui/ui';
import { S as save } from '../../../core/save';
import { wait } from '../../../core/tween';
import { sfx } from '../../../audio/sfx';
import { music } from '../../../audio/music';
import { fadeBlack, letterbox, stamp, titleCard } from '../../../kit/cine';
import { bridgeShot, shipExterior } from '../../common/shots';
import { makeAnchor } from '../../common/set';
import { BROADCAST } from '../../broadcast';
import { GAME_TITLE } from '../../meta';
import { isPlayerFn } from '../../../game/build';
import { S } from './script';
import { p1, p2 } from './puzzles';
import { SIX } from './questions';

// ------------------------------------------------------------------ cinematics

async function open(g: Game): Promise<void> {
  await fadeBlack(g, true, 10);
  g.mood('void');
  await bridgeShot(g);
  await fadeBlack(g, false, 1600);
  await letterbox(g, true, 600);
  void titleCard(g, 'Epilogue', 'Every point stays where it is', 3600);
  await g.say(S.open);
  await letterbox(g, false, 500);
}

/** The final pulse: a shockwave crosses the lattice and not one buoy moves. */
async function lock(g: Game): Promise<void> {
  g.stage.clearWorld();
  const b = new BuoyField(g.stage, { extent: 8 });
  g.stage.world.add(b.object);
  void makeAnchor(g.stage, 0.45);
  await g.stage.view2D({ center: [0, 0], height: 13, ms: 0 });
  await letterbox(g, true, 500);
  music.stop(0.8);
  await g.say(S.lock, { noSkip: true });
  sfx.collapse();
  await g.stage.shockwave([0, 0, 0], 2600, 0.9);
  b.set([[1, 0], [0, 1]]); // the identity: honestly, nothing to animate
  await wait(g.headless ? 50 : 1400);
  g.mood('void');
  await g.say(S.still);
  await letterbox(g, false, 500);
}

/** The ark wakes; plates carry the player's own sentences; credits roll over their Field Manual. */
async function ending(g: Game): Promise<void> {
  g.stage.clearWorld();
  await shipExterior(g, { ark: true });
  await letterbox(g, true, 700);
  g.mood('triumph');
  await g.say(S.ending.slice(0, 1));
  // the bridge plates: sentences the player wrote in the Broadcast
  const sv = (save().flags.broadcast as Record<string, { order: string[]; links: Record<string, string> }> | undefined)?.[BROADCAST.id];
  const lines = sv ? Object.entries(sv.links).filter(([, t]) => t.trim()).slice(0, 4) : [];
  for (const [key, text] of lines) {
    const [a, b] = key.split('>');
    const term = (id: string) => BROADCAST.pages.find((p) => p.id === id)?.term ?? id;
    await stamp(g, `${term(b)} needs ${term(a)}, because ${text.trim()}`, g.headless ? 60 : 4200);
  }
  await g.say(S.ending.slice(1));
  await letterbox(g, false, 500);
  await credits(g);
  await fadeBlack(g, true, 900);
  await wait(g.headless ? 20 : 900);
  await g.say(S.postCredits);
  await fadeBlack(g, false, 900);
}

async function credits(g: Game): Promise<void> {
  const st = save();
  const pages = Object.values(st.manual).filter((m) => m.see || m.means || m.called || m.cue).length;
  const laws = Object.values(st.laws).filter((l) => l.proven).length;
  const fns = Object.keys(st.code).filter((fn) => isPlayerFn(fn)).length;
  const roll = h('div', { class: 'credits-roll' },
    h('div', { class: 'credits-title' }, GAME_TITLE),
    h('div', { class: 'credits-sub' }, 'A linear algebra game'),
    h('div', { class: 'credits-block' }, h('div', { class: 'kicker' }, 'Your Field Manual'),
      h('div', null, `${pages} page${pages === 1 ? '' : 's'} in your own words`),
      h('div', null, `${laws} law${laws === 1 ? '' : 's'} proved`),
      h('div', null, `${fns} function${fns === 1 ? '' : 's'} of lantern.py written by you`)),
    h('div', { class: 'credits-block' }, h('div', { class: 'kicker' }, 'The crew'),
      h('div', null, 'Wren · pilot'), h('div', null, 'Bram Haldane · engineer'), h('div', null, 'LANTERN · ship'),
      h('div', null, 'Dr Ilse Varga · science officer, Meridian'), h('div', null, 'Teo Okafor · sleeper, Meridian'), h('div', null, 'Marcus Vell · director, Survey Authority')),
    h('div', { class: 'credits-block' }, h('div', { class: 'kicker' }, 'Made with'),
      h('div', null, 'Three.js · KaTeX · Pyodide · Kokoro voices · Blender')),
    h('div', { class: 'credits-block' }, h('div', { class: 'kicker' }, 'Twelve thousand sleepers'), h('div', null, 'awake')));
  const el = h('div', { class: 'cine credits' }, roll);
  g.ui.root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  await Promise.race([wait(g.headless ? 80 : 26000), new Promise<void>((res) => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { document.removeEventListener('keydown', k); res(); } };
    document.addEventListener('keydown', k);
  })]);
  el.remove();
}

// ------------------------------------------------------------------ builds (stretch)

const vec = (r: () => number, n: number) => Array.from({ length: n }, () => Math.round((r() * 20 - 10) * 2) / 2);

const BUILD_RELU: Beat = {
  kind: 'build', id: 'build-relu', build: {
    id: 'c27-relu', fn: 'relu', title: 'Clip the negatives',
    brief: 'Write `relu(v)`. It returns a list the same length as `v`, with every negative number replaced by 0 and every other number kept.',
    starter: 'def relu(v):\n    """Return v with every negative part set to 0."""\n    return []\n',
    solution: 'def relu(v):\n    """Return v with every negative part set to 0."""\n    return [max(0, x) for x in v]\n',
    assemble: { lines: ['def relu(v):', '    """Return v with every negative part set to 0."""', '    return [max(0, x) for x in v]'], decoys: ['    return [abs(x) for x in v]'] },
    tests: [
      { name: '`relu([3, -2, 0, 1.5])` is `[3, 0, 0, 1.5]`', args: [[3, -2, 0, 1.5]], expect: [3, 0, 0, 1.5] },
      { name: 'all negative: `relu([-1, -5])`', args: [[-1, -5]], expect: [0, 0] },
      { name: 'the empty list', args: [[]], expect: [] },
    ],
    swarm: { gen: (r) => [vec(r, 1 + Math.floor(r() * 6))], crew: (v) => (v as number[]).map((x) => Math.max(0, x)) },
    docPrompt: 'Why does the clip matter? What would four outputs x, −x, y, −y add up to without it?',
    payoff: 'The layer that sorted the record’s stars runs on your `relu`.',
  },
};

const BUILD_DENSE: Beat = {
  kind: 'build', id: 'build-dense', build: {
    id: 'c27-dense', fn: 'dense', title: 'One layer',
    brief: 'Write `dense(W, b, x)`: multiply the matrix `W` (a list of rows) by the vector `x`, then add the vector `b`. If you wrote `matvec` and `add`, you can call them.',
    starter: 'def dense(W, b, x):\n    """Return W x + b."""\n    return []\n',
    solution: 'def dense(W, b, x):\n    """Return W x + b."""\n    return [sum(w * xi for w, xi in zip(row, x)) + bi for row, bi in zip(W, b)]\n',
    uses: ['matvec', 'add'],
    tests: [
      { name: 'the layer from the record: `W` = [[1, 0], [−1, 0], [0, 1], [0, −1]], `b` = 0, `x` = (2, −1)', args: [[[1, 0], [-1, 0], [0, 1], [0, -1]], [0, 0, 0, 0], [2, -1]], expect: [2, -2, -1, 1] },
      { name: 'a bias shifts every output', args: [[[1, 2]], [5], [1, 1]], expect: [8] },
      { name: 'three inputs, two outputs', args: [[[1, 0, 2], [0, 1, -1]], [1, -1], [3, 2, 1]], expect: [6, 0] },
    ],
    swarm: {
      gen: (r) => { const m = 1 + Math.floor(r() * 4), n = 1 + Math.floor(r() * 4); return [Array.from({ length: m }, () => vec(r, n)), vec(r, m), vec(r, n)]; },
      crew: (W, b, x) => (W as number[][]).map((row, i) => row.reduce((s, w, j) => s + w * (x as number[])[j], 0) + (b as number[])[i]),
    },
    payoff: 'Stack `dense` and `relu` and you have a neural network: every layer is a matrix you can now read.',
  },
};

// ------------------------------------------------------------------ the chapter

const beats: Beat[] = [
  { kind: 'cinematic', id: 'open', run: open },
  { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'Every point stays where it is', body: 'Which setting leaves every point where it is?\n\nThe one whose columns are the axis arrows themselves: **the identity**. It reads the same in every grid.' } },
  { kind: 'puzzle', id: 'p1', puzzle: p1 },
  { kind: 'cinematic', id: 'lock', run: lock },
  { kind: 'scene', id: 'broadcast-intro', lines: S.broadcastIntro },
  { kind: 'broadcast', id: 'broadcast', broadcast: BROADCAST },
  { kind: 'scene', id: 'questions-intro', lines: S.questionsIntro },
  { kind: 'review', id: 'six', review: { id: 'c27-six', who: 'ilse', title: 'Ilse’s six questions', claims: SIX } },
  { kind: 'scene', id: 'questions-out', lines: S.questionsOut },
  { kind: 'scene', id: 'layer-intro', lines: S.layerIntro },
  { kind: 'puzzle', id: 'p2', puzzle: p2 },
  {
    kind: 'name', id: 'n-layer', entry: {
      id: 'layer', term: 'layer, weights, bias, ReLU', question: 'How do a few steps sort what one matrix cannot?',
      saw: 'Four outputs x, −x, y, −y; negatives clipped to zero; added up. The score |x| + |y| fences the cluster inside a diamond.',
      means: 'A matrix keeps lines straight, so on its own it can only cut with a straight line. The clip bends the picture, and the next step can use the bend.',
      name: 'A **layer** multiplies by a matrix of **weights**, adds a vector called the **bias**, then clips every negative output to zero: the **ReLU**.',
      formula: '\\text{layer}(\\mathbf x) = \\max\\big(0,\\; W\\mathbf x + \\mathbf b\\big)',
      why: 'Without the clip, two layers in a row are one matrix plus one bias: $W_2W_1\\mathbf x + (W_2\\mathbf b_1 + \\mathbf b_2)$ (Chapter 12). The cut is still a straight line, so nothing new can be sorted.',
      cue: 'When you see **“sort what no straight line can”**, think **layers**.',
      use: 'Every neural network is layers like this, stacked. Training adjusts the weights; every layer is still a matrix you can read.',
    },
  },
  BUILD_RELU,
  BUILD_DENSE,
  { kind: 'cinematic', id: 'ending', run: ending },
];

const ch: ChapterDef = {
  id: 'c27',
  act: 10,
  num: 27,
  title: 'Every point stays where it is',
  subtitle: 'The identity, and the Broadcast',
  nodes: [],
  palette: 'gold',
  music: 'void',
  script: S,
  inShort: 'Which setting leaves every point where it is? The identity: the same in every grid.',
  catchup: 'This is the end of the story. Every idea the Broadcast asks for was named in an earlier chapter; your Field Manual holds the pages you wrote.',
  beats,
};

export default ch;
