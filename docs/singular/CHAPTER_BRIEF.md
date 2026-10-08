# Brief for a chapter builder

You are building chapters of **SINGULAR**, a voiced story game that teaches university linear algebra, in the repo
`/home/user/concepts`. The engine, kit and reference chapters exist. You write content on top of them.
The bar is a shipped, best-in-class game: every screen polished, every number right, every sentence plain.

## Read first, in this order (do not skip)
1. `docs/singular/GDD.md`: §0, §1.4 (tone, two registers), §2 (story bible; **§2.7 truth table**), §3 (loops), §4 (the
   Briefing), §5.5 (functions per chapter), §7 (difficulty), **your chapters in §6 in full**, Appendix C (term ledger),
   Appendix E (mapping onto today's engine).
2. `docs/singular/AUTHORING.md` — files, beat order → beat kinds, puzzle contract, Briefing contracts, kit table, words, done.
3. `docs/singular/curriculum.md` — your nodes (question, picture, derivation, by-hand skills, misconceptions, explain-back).
4. `site/src/singular/game/types.ts` — the contract. `site/src/singular/content/truth.ts` — the story numbers (use them).
5. The reference chapters: `site/src/singular/content/chapters/c00-prologue/` and `c01-vectors/`. Match their voice and polish.
6. The kit you will use: `site/src/singular/kit/*.ts`, `site/src/singular/gfx/*.ts`, `site/src/singular/content/common/*.ts`,
   `site/src/singular/ui/widgets.ts`. Read the files you use; do not guess APIs.

## What to build
Your chapters exactly as GDD §6 describes them: cold open, chapter card with In short, the See-it puzzles and the aha,
naming beats, the [D] and [H] puzzles, the Briefing (sayit → doubts → law → procedure if listed → compare), the Why-it-matters
card with the cue, the builds (GDD §5.5), and the story-out beat (Case Board pin/answer as listed in GDD §2.3).
Where the GDD is vague, decide, following the house rules. Use the GDD's puzzle numbers and story numbers from `truth.ts`.

**Engine status.** Every beat kind works today, including the Briefing (`card`, `sayit`, `doubt`, `law`, `compare`,
`procedure`): the flow test drives them all. Still **unit-test** the Briefing data (law: the target survives and
near-misses break; doubts: the canonical construction gives the right verdict and the Shake finds the breaking case;
procedures: the reference order succeeds and dropping each key step fails). The geometry and data kits are finished
(`kit/geom.ts`: `Knob`, `RightAngle`, `AngleArc`, `Shadow`, `Sweep`, `UnitCircleImage`; `kit/data.ts`: `PointCloud`,
`FitLine`, `Projector3D`, `PCAView`); the dev chapter `c92-kit-geom` shows each one in use.

**Also in the engine** (use, do not rebuild): the act **Review** beat (`kind: 'review'`, `ReviewDef`: four claims by one
speaker, built like doubts) for act-end chapters; the **Teach Teo** beat (`kind: 'teo'`, `TeoDef` = Procedure + `ask`) for
callbacks T1–T5 (GDD §4.4); the **Broadcast** beat (Epilogue only; data in `content/broadcast.ts`); **installs** through
`pylib.map(fn, cases)` / `pylib.call(fn, ...args)` with `isPlayerFn(fn)` to say whose code ran; the Case Board
`pin` / `answer` and the constellation `lightStar(id)` / `linkStars(a, b)` (game/caseboard.ts, ids in `STARS`).
The act's NumPy card and the catch-up card are automatic. Builds need a `swarm` (AUTHORING.md §5b).

## Craft standards
- The picture does the teaching. Keep scenes uncluttered: at most ~4 arrows, labels never overlapping, readouts for exact numbers.
- Make winning feel good (motion, sound, a short crew line). Make failing teach (the gap drawn, a literal LANTERN bark).
- Small whole numbers first; the GDD's seeded ranges by difficulty. Verify every number with `math/la.ts` / `rref.ts`.
- Notation: basis arrows are e₁, e₂, e₃ (`\mathbf e_1`), never î/ĵ; the shared matrix views label columns A e₁, A e₂.
- Story lines are short, in character, no exclamation marks, no banned words, maths objects never personified, and no
  term before its naming beat — in dialogue too (an automated check enforces it game-wide).
- Scenes without their own visuals get the ship exterior automatically; give the important beats their own staging
  (the ark, the Anchor, the buoys, the holotable) with the models in `public/singular/models/`.

## Verify (required before you report)
1. `npx tsc --noEmit -p tsconfig.json` has no errors in your files.
2. `node --experimental-strip-types --test tests/singular/game-<chapterId>.test.ts` passes (write it).
3. `node tests/singular/browser/game-solve-all.mjs <chapterIds…>` — every puzzle passes at cadet, navigator and commander, no console errors.
   The dev server runs on http://localhost:5173 (no hot reload; new chapter folders are picked up). If it is down, start
   it with `npx vite --port 5173 > /dev/null 2>&1 &` from the repo root.
4. `node tests/singular/browser/game-flow.mjs <chapterId> <scratch dir>` — LOOK at every screenshot with the Read tool and fix what is
   cluttered, overlapping, off-screen, unreadable or ugly. Iterate until it looks shipped.
5. `node tests/singular/browser/game-wording.mjs <chapterId>` reports 0 hits.
6. Interact for real at least once per chapter with a small Playwright script kept in your scratch dir (drag a handle,
   type an answer, press Fire) and confirm the puzzle reacts.

The machine is shared (4 CPU cores, software rendering, several agents), so browser tests are slow. Run at most one browser
process at a time; re-run single beats (`node tests/singular/browser/game-flow.mjs cNN <dir> <beatIndex>`) after a change; do not start extra servers.

## Rules
- Create/modify only: `site/src/singular/content/chapters/<your chapter dirs>/**` and `tests/singular/game-<chapterId>*.test.ts`.
  Need a reusable component that does not exist? Put it in your chapter folder. Do not edit shared files (kit, engine,
  types, truth, other chapters). If a shared file has a bug or needs a feature, work around it locally and say so.
- Do not commit. The lead reviews and commits.
- The scratchpad is shared with other agents: prefix every scratch file and folder with your chapter id (`c13-flow.mjs`).
- Final report (concise): files; each puzzle with its win condition and solve result per difficulty; codex entries;
  Briefing data written; builds; anything not done; recommended shared-file changes.
