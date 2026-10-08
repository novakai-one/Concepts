# Chapter authoring guide

How to write a chapter of SINGULAR. **The GDD is the source of truth** (`docs/singular/GDD.md`); this file says how
to express it in today's engine. Read first: GDD §0, §2 (story bible, **§2.7 truth table**), §3, §4, §7, your chapter
in §6, Appendix C (term ledger), Appendix E; then this file; then `curriculum.md` for your nodes.

The reference chapters are `content/chapters/c00-prologue/` and `c01-vectors/`. Copy their structure and polish.

---

## 1. Files

```
site/src/singular/content/chapters/cNN-slug/
  index.ts      default export: ChapterDef (beats in order)
  script.ts     every voiced line of the chapter (plain data, no imports except types)
  puzzles.ts    PuzzleDef objects + their pure win checks (exported functions of plain state)
  briefing.ts   SayItDef, DoubtDefs, LawDef, CompareDef, (ProcedureDef)
  build.ts      BuildDefs
  logic.ts      pure win checks, law cores, doubt predicates (no three, no DOM; import with `.ts` suffixes)
```
- `logic.ts` is what the unit test imports (`node --experimental-strip-types --test`). Put every rule that decides a
  win, a doubt verdict or a law case there, and import it from `puzzles.ts` / `briefing.ts`. Use `game/lawcheck.ts`
  (`rng`, `checkLaw`, `rint`) to test that the target law survives 500 seeded cases and each near-miss breaks.
- The registry picks up `content/chapters/*/index.ts` automatically. Never edit shared files.
- `id` is `cNN` (Prologue `c00`, Epilogue `c27`); `act` and `num` from GDD §6.1. Puzzle ids `cNN-pM` as in the GDD.
- **Story numbers come from `content/truth.ts`** (TT1–TT22, computed and unit-tested). Never retype them.

## 2. Beat order (GDD §3.2) → beat kinds

| GDD step | Beat kind | Notes |
|---|---|---|
| Cold open (≤ 60 s) | `cinematic` or `scene` | the plot problem, shown, not explained |
| Chapter card + In short | `card` (`kind: 'inshort'`) | question as title, one literal sentence, no unearned term; also set `ChapterDef.inShort` |
| See it × 2–3, aha | `puzzle` | `predict` = the GDD's "Call it" (optional, never required) |
| Name it | `name` (CodexEntry) | saw → means → name → formula → why → cue → use |
| [D] where the formula comes from | `puzzle` | Cadet: watch + one drag. Navigator: typed steps (`StepWorksheet`). Commander: order the steps (`TileOrder`), then type the last line |
| [H] by hand | `puzzle` | `StepWorksheet`: Cadet = LANTERN computes, Navigator = each step checked, Commander = final only |
| Say it | `sayit` | Bram asks the node's check question; the player writes their Field Manual page first |
| Doubts × 2–3 (true and false mixed) | `doubt` (DoubtDef) | Challenge = counterexample; Back = demonstration + the Shake (engine) |
| Law | `law` (LawDef) | frame + slots; the Proving Ground fires 500 cases (engine); then the reason step |
| Procedure (Ch 9, 13, 18, 20, 22, 26) | `procedure` | tiles + `run()` that animates LANTERN executing them literally |
| Compare | `compare` | Ilse's model page + 2–3 "Did you say…?" key ideas |
| Why it matters + cue | `card` (`kind: 'why'`) | the playable AI/CS use; "When you see ___, think ___." |
| In code | `build` × 1–3 | Python on plain lists, `lantern.py` (GDD §5.5 lists the functions per chapter) |
| Story out | `cinematic` / `scene` | open or close a Case Board question (`pin` / `answer`) |

Nothing is ever locked: the engine adds Show me and Skip to every puzzle, doubt, law, procedure and build.

## 3. Puzzles

```ts
export const p2: PuzzleDef = {
  id: 'c03-p2', title: 'Which mount adds a new direction?',   // a plain question
  goal: 'Bolt the third thruster where it reaches the signal. Fire all three.',
  subgoals: ['…'],
  predict: { prompt, choices, answer, reveal },               // the GDD's "Call it"; optional
  hints: ['…', '…', 'the last hint all but gives it away'],
  par: 2, view: '3d', onWin: S.p2Win,
  setup(p) {
    // build the scene from the kit; p.add(...) everything; p.move() per counted action; p.win() when won
    return {
      async showMe() { /* drive the same controls to the reference answer, ending in p.win() */ },
      solve() { /* optional: set the reference answer instantly and call p.win() */ },
      wrong() { /* optional: a known-wrong attempt (a misconception); must NOT call p.win() */ },
    };
  },
};
```
- Keep each win test as a **pure exported function** of plain values in `puzzles.ts` (e.g. `export const p2Won = (mount: V3) => …`) and unit-test it (reference wins, the misconceptions do not).
- Difficulty (`p.difficulty`) changes parameters only, never content (GDD §7.1): snap (`p.snap()` = 1 / 0.5 / null), tolerance (±0.05 / ±0.05 / ±0.01), live preview (cadet only, or after the first commit on navigator), typed steps, seeded number ranges.
- Every miss teaches: leave the attempt where it landed and draw the gap; `sfx.miss()`; a literal LANTERN bark (`p.bark('lantern', …)`).
- Every win has weight: motion, `sfx.success()`, a short crew reaction (`onWin`).

## 4. The Briefing contracts (`game/types.ts`)

```ts
const sayit: SayItDef = { id: 'c04', who: 'bram', ask: 'Why is v · w zero exactly when the arrows are at right angles?',
  frames: { see: 'The ___ arrow's shadow on the ___ arrow …' }, wordBank: ['shadow', 'dish', 'right angle'] };

const d1: DoubtDef = {
  id: 'c04-d1', who: 'bram', isTrue: false,
  claim: 'A bigger reading always means the arrows point closer together.',
  reason: 'The reading also grows with length. Two long arrows far apart can read more than two short ones close together.',
  view: '2d',
  setup(p) {
    // build a scene the player edits (handles, dials); return the scene interface:
    return {
      holds: () => /* does the claim hold for the scene as it is now? */,
      describe: () => `v = (${…}), w = (${…})`,
      randomize: (rng, edge) => { /* set free quantities to a random case, or the edge-th curated edge case */ },
      edgeCases: 2,
      async showMe(stance) { /* build the right construction for this claim */ },
    };
  },
};

const law: LawDef<{ v: number[]; w: number[] }> = {
  id: 'c04-law',
  frame: ['$\\cg{\\mathbf v} \\cdot \\cr{\\mathbf w}$ is ', { slot: 'sign' }, ' exactly when ', { slot: 'angle' }, { slot: 'extra' }],
  slots: { sign: { options: [{ id: 'zero', text: 'zero' }, …] }, angle: { … }, extra: { … } },
  answer: { sign: 'zero', angle: 'right', extra: 'or-zero' },
  gen: (rng) => ({ v: …, w: … }), edgeCases: [{ v: [0, 0], w: [1, 2] }, …],
  holds: (f, c) => …,                      // does the filled statement hold for case c?
  describe: (c) => 'w is the zero vector',
  draw: (g, c) => { … },                   // optional: draw the case on the holotable
  reason: { ask: 'Why?', options: [{ id, text, right, why }, …] },
};

const compare: CompareDef = { id: 'c04', page: 'Ilse's page (maths register, markdown)', formula: '…', keyIdeas: ['Did you say …?', …] };
```
- Doubts: mix true and false claims (GDD §6 lists the T and F claims per chapter). The engine runs the Shake (2 / 5 / 10 random cases + curated edges by difficulty), freezes on a breaking case, shows `reason`, and charges a star for challenging a true claim.
- Laws: `holds(filled, c)` must make the GDD's target statement survive every generated and edge case, and each listed near-miss filling must be broken by at least one case (unit-test this).
- `ProcedureDef.run(g, tileIds)` executes the tiles literally on the test case and animates; a missing key step reproduces its misconception visibly.

## 5. The kit (use these; do not re-implement)

| Module | Use it for |
|---|---|
| `kit/handle.ts` `VectorHandle`, `near` | any vector the player drags (snapping, ticks, moves, constraints) |
| `kit/flight.ts` `BurnChain` | burns tip to tail from the ship; **Fire** flies it; fixed burns; per-burn constraints; `onArrive` → `'win' / 'ok' / 'miss'` |
| `kit/matrixview.ts` `MatrixView`, `apply2` | a 2×2 matrix: moved grid + draggable column arrows + typed input + unit-square area |
| `kit/matrixview3.ts` `MatrixView3`, `apply3` | a 3×3 matrix: moved lattice + 3 column arrows + 3×3 input + unit-cube volume |
| `kit/rowops.ts` `RowOpsBoard`; `kit/system.ts` `SystemView` | augmented matrix with row operations; the lines/planes picture kept in sync |
| `kit/geom.ts` | `RightAngle`, `AngleArc`, `Shadow` (projection), `Sweep` (eigen hunt), `UnitCircleImage` (SVD) |
| `kit/data.ts` | `PointCloud`, `FitLine` (least squares), `Projector3D`, `PCAView` |
| `kit/steps.ts` | `StepWorksheet` ([H] typed steps by difficulty), `TileOrder` ([D] commander, procedures) |
| `kit/cine.ts` | `letterbox`, `fadeBlack`, `titleCard`, `NumberBoard`, `stamp`, `clearCine` |
| `gfx/buoys.ts` `BuoyField` | the lattice of light buoys moved by a matrix (`set`, `to`, `highlight`, `pick`) |
| `gfx/models.ts` | `loadModel(name)`, `Ship` (exhaust, `flyTo`, `face`); models: `lantern`, `meridian`, `anchor`, `buoy`, `debris_0..5`, `bridge` |
| `content/common/set.ts`, `shots.ts` | `makeAnchor`, `makeLantern`, `SPIRES`; `shipExterior`, `bridgeShot` for scenes |
| `content/truth.ts` | every story number (T, T3, C, C2, V, DRONES, HATCH, RECORD_SV, …) |
| `game/caseboard.ts` | `pin(id, question, chapter)`, `answer(id, text, chapter)` |
| `game/build.ts` `pylib` | `await pylib.call('matvec', A, x)`: the player's Python (or the reference) at story events; installs over many points: `const { values, who } = await pylib.map('matvec', cases)` (one worker call; `who` is `'yours'` or `'backup'`) |
| `gfx/*` | `Arrow`, `Grid2D` (via `p.grid()`), `Parallelogram`, `Parallelepiped`, `PlanePatch`, `InfLine`, `Outline2D`, `Lattice3D`, `Pad`, `Dot`, `Beacon`, `Label`, `burst`/`celebrate` |
| `ui/widgets.ts` | `MatrixInput`, `VectorInput`, `Slider`, `ChoiceCards`, `Readout`, `parseNum` |
| `math/la.ts`, `math/rref.ts`, `math/frac.ts` | all numbers; `nice()` for display; exact fractions for row reduction |
| `audio/sfx.ts` | `tick`, `snap`, `success`, `miss`, `whoosh`, `collapse`, `thrust`, `warp`, `alarm` |
| `g.stage` | `view2D`, `view3D`, `shockwave(at, ms, amp)`, `flash`, `nudge` |

## 5b. Builds (GDD §5)

```ts
{ id: 'c04-dot', fn: 'dot', title, brief, starter, solution, tests: [...],
  swarm: { gen: (r, difficulty) => [args…], crew: (...args) => expected, tol? },   // required: random cases vs the crew version
  fill?: 'def dot(v, w):\n    return sum(___ for a, b in zip(v, w))\n',          // optional; derived from the solution if omitted
  assemble?: { lines: [...solution lines], decoys: ['    return sum(a + b ...)'] }, // optional; decoys are misconceptions
  docPrompt?, ilseNote?, uses?: ['length'], payoff }
```
- The builder offers Assemble / Fill / Write (Settings → Code; Off skips builds). Show me works in every mode.
- The swarm fires 20 / 100 / 300 cases by difficulty. Compare a canonical form when many answers are right
  (an RREF, a normalised basis, a sorted list).
- `ChapterDef.catchup`: one or two literal sentences that re-teach what the chapter assumes (shown when the previous
  chapter is unfinished; never "recall that"). `prereqs` defaults to the previous chapter.

## 6. Words (BUILD_BRIEF.md §2a and GDD §1.4 are the law)

- Two registers (GDD §1.4): **story** (Wren, Bram, Teo, Vell, Ilse live) never explains maths and never uses a term
  before its naming beat; **maths** (LANTERN, Ilse's logs, cards, goals, Laws, model pages) is literal first.
- Literal: say what the arrows, points and grid do. Short sentences (≤ 20 words). One bold key idea per block.
- No analogies. Banned: fruit, shopping, cooking, factories, machines that eat or spit, sports, personification of maths objects.
- A matrix is never a machine. It moves points; it transforms the grid.
- Never: simply, just, obviously, clearly, trivially, easy to see, recall that, note that, it turns out, as you know. No exclamation marks.
- One word per idea (Appendix C): "linear transformation", "null space" (never kernel), "column space", "augmented matrix", "pivot",
  "row echelon form", "reduced row echelon form", "span", "scalar triple product", "coplanar", "diagonalisation".
- Colours: `\cg{}` green (first vector / column 1), `\cr{}` red (second / column 2), `\cb{}` blue (third / column 3), `\cy{}` yellow (result).
  Inside `aligned` / `array` (where `\cr` is TeX's row break) write `\htmlClass{c-red}{…}` instead of `\cr{…}`. The macros also work in 3-D labels.
  Violet is reserved for the null space. Speaker colours never appear in the 3-D maths scene.
- Voiced lines with maths get `say:` (how to read them aloud, no symbols). Lines are written for Kokoro's flat delivery: short, plain.

## 7. Done means

1. `npx tsc --noEmit -p tsconfig.json` clean for your files.
2. `tests/singular/game-cNN.test.ts`: puzzle numbers, pure win checks (reference wins, misconceptions do not), Law frames
   (target survives, near-misses break), doubt predicates (canonical construction right, the special case found).
3. `node tests/singular/browser/game-solve-all.mjs cNN`: every puzzle passes at cadet, navigator and commander, no console errors.
4. `node tests/singular/browser/game-flow.mjs cNN <dir>`: look at every screenshot; nothing cluttered, overlapping or off screen.
   Every build prints `assemble true, fill true, write true` (or `not offered` for a one-line body).
5. `node tests/singular/browser/game-wording.mjs cNN` reports nothing.
6. Every voiced line is in `script.ts` and reachable from `ChapterDef.script` or a beat.
