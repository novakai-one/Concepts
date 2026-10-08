# Chapter 18 trajectory problem: build note

How `ch18-trajectory-spec.md` (Scenes 1–6) is built inside the existing game.
Branch: `claude/ch18-trajectory-preview`. Production is unchanged until the preview is reviewed.

---

## Beat order

| Beat | Kind | What | Spec |
|---|---|---|---|
| 0–2 | scene, dialogue | Chapter opening (unchanged); `p1Intro` is now three short lines | – |
| 3 | puzzle `c18-p1` | Failed launch → first kept line → multiplier → second line → multiplier → showcase | Scenes 1–3 |
| 4 | name card | "eigenvector", "eigenvalue", $A\mathbf v = \lambda\mathbf v$ with the player's own vectors | Scene 3, end |
| 5 | puzzle `c18-m1` | Reach $(9, 9)$ after exactly two pulses | Scene 4 |
| 6 | puzzle `c18-drill` | Ten rounds, then results, then extra rounds on demand | Scene 5 |
| 7 | puzzle `c18-solo` | Unfamiliar $B$, reach $(32, 16)$ after two pulses; another challenge on demand | Scene 6 |
| 8 → | unchanged | The rest of Chapter 18 (shear sweep, λ dial, complex, 3 × 3, Briefing) | out of scope |

Scenes 1–3 are one puzzle: `p.win()` ends a puzzle, and the spec wants them as one continuous discovery.

---

## Files

| File | Role |
|---|---|
| `c18-eigen/traj-logic.ts` | Pure maths: kept / turned, multiplier verdicts, typed-number parsing, missions, plan sorting, fixtures, round generators, progress rule |
| `c18-eigen/traj-text.ts` | Every string the player reads in Scenes 1–6 (DOM-free, unit-tested for wording) |
| `c18-eigen/traj.ts` | `TrajView` (ship, arrows, grid, copper lines, waypoints, framing), number inputs, the dock, progress records |
| `c18-eigen/traj.css` | Dock and tag styles, phone layout |
| `c18-eigen/traj-puzzles.ts` | Scenes 1–3 (`p1`), Scene 4 (`m1`), Scene 6 (`solo`), the shared mission panel |
| `c18-eigen/drill.ts` | Scene 5 |
| `game/types.ts`, `game/runner.ts` | Two optional puzzle hooks (below) |
| `audio/sfx.ts` | `pulse`, `align`, `offcourse`, `flip`, `arrive` |
| `tests/singular/game-c18-traj*.test.ts` | Maths, fixtures, generators, wording |

---

## Rules the code follows

**Explore vs commit**

- Free (never counted): testing an arrow, scanning, probing, typing.
- Committed (counted as a move): a multiplier answer, a mission launch, a checked flight log, a picked plan.
- Only committed wrong answers count as mistakes.

**Progress record** (`flags['c18-traj']`)

- `independent`: no help, no wrong commit.
- `corrected`: wrong commits, then right, no help.
- `assisted`: any hint or Show me.

**No early answers**

- Before the name card: no "eigenvector", "eigenvalue" or λ anywhere (unit-tested).
- A kept line shows `×?` (dashed copper) until the player enters its multiplier.
- Round 1 locks its line as `×?`: round 2 asks for that multiplier.
- Round 4 scans show heading only; round 5 asks both multipliers.
- Scene 6 shows no lines; probes are the player's own experiments.

**Honest motion**

- A pulse moves every grid point and the ship along the same straight path from $\mathbf p$ to $A\mathbf p$ (`mlerp(I, A, k)`).
- After a pulse the grid fades to rest instead of animating back, so nothing moves backwards.

**Colours**

- Green: launch vector. Yellow: the vector after the pulse.
- Copper: a kept line (dashed `×?` until answered).
- Orange: turned angle, off-course warning, missed endpoint.
- Violet ring: collapse. White ring: a typed multiplier's prediction.

---

## Runner hooks (the only engine change)

- `PuzzleRuntime.hint()`: the puzzle supplies its own hint for the current stage; the runner counts it.
- `PuzzleRuntime.showStep()`: Show me demonstrates the current stage only and does not end the puzzle; the runner counts it as help.
- Puzzles without these hooks behave exactly as before.

---

## Known limits

- Scenes 4 and 6 can also be solved as a 2 × 2 linear system, without eigenvectors.
- Round 8's shear also appears in the later shear puzzle (`c18-p2`).
- The new dialogue lines have no recorded voice yet.
- Beat indices after beat 3 moved by three, so an old save resting inside Chapter 18 resumes three beats early.
- Old saves may hold stars for the old `c18-p1`.
