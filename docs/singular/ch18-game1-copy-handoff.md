# Chapter 18 — Game 1 copy handoff (ChatGPT-authored)

**Status:** Copy authored; NOT wired into gameplay yet. No preview has been verified for these changes.
**Base:** merged PR #2, default branch commit `dbcd94d`.
**Scope:** `c18-p1`, its directly preceding intro, its immediate post-win line, and the existing explanatory card after it. Only ONE game. No changes to the 10-round drill, two-pulse mission, other chapter puzzles, global prose, or production deployment.

## Authoritative source

`site/src/singular/content/chapters/c18-eigen/game1-copy.ts`

This exports:

- `GAME1`: exact opening-game title, objectives, hints, stage feedback and dynamic strings.
- `game1WrongMultiplier`: game-specific wrong-number explanations calculated from the existing verdict.
- `game1PredictionLabel`: labels the *player's* multiplier prediction, not the matrix result.
- `GAME1_UI`: HUD/input/legend/inline result wording.
- `GAME1_DIALOGUE`: brief optional entry and win lines.
- `GAME1_NAME`: the existing post-game eigenvector name card.

**Copy text verbatim.** Do not invent equivalent prose. Substitute numerical values only through the supplied functions. Mathematical grading and animations remain owned by the existing game.

## Integration map

1. In `traj-puzzles.ts`, import `GAME1 as P1`, `GAME1_UI` and `game1PredictionLabel` directly from `./game1-copy`. Keep existing imports from `traj-text.ts` for other puzzles. Do **not** import the new module through `traj-text.ts` (circular reference).
2. Connect the existing `c18-p1` P1 call sites to the new object. Property names are intentionally the same. The first failed test still uses (1,0). Testing remains free; only submitted multipliers cost moves.
3. For `c18-p1` alone, use `P1.zero`, `P1.unreadVector`, `P1.unreadMultiplier`, and `P1.wrongMultiplier(cur.v, verdict)` instead of the old shared messages. Don't alter the shared `wrongMult`, `ZERO`, `UNREAD`, or `UNREAD_M` used by other puzzles. The wrong-number message must use the *pending question's vector*, not the most recently tested one.
4. Use `game1PredictionLabel(cur.v, m)` for the ghost circle and `GAME1_UI.lockedChip` and `GAME1_UI.result` for the locked-line chip and settled result. These contain math syntax and must pass through the existing `inline()` renderer.
5. For the existing Game 1 vector and multiplier inputs/buttons, use `GAME1_UI.vectorLabel`, `test`, `check`, `firstCoordinateAria`, `secondCoordinateAria`, `multiplierAria`, and `signTitle`. The existing UI widget types can gain optional per-instance labels; defaults for other games must not change.
6. For Game 1 only, change the matrix label to `GAME1_UI.matrixLabel` and show `matrixNote` next to it; show `vectorHelp` beside the vector input and `legend` beside the green/yellow result. Explain the Anchor with `anchorLabel`. Optional `TrajView` labels are `offCourse` and `turnAngle`. Other games keep their current HUD labels.
7. Add a **collapsed** native `<details>` labelled `GAME1_UI.numberHelpTitle`, containing `numberHelp`, beside the inputs. Don't display this long information all the time.
8. In `index.ts`, replace only `IN_SHORT_PROBLEM` with `GAME1_NAME.inShort`. Preserve the separate after-chapter `IN_SHORT_ANSWER` and all later name cards. Update only the existing `NAME_EIG` card using `GAME1_NAME` (question, dynamic `saw(seen())`, means with symbols, name, formula, why, cue, use). No new card is required. Use the existing formula renderer.
9. In `script.ts`, replace only `S.p1Intro` and `S.p1Win` with `GAME1_DIALOGUE.intro` and `win`. Avoid reusing old voice-bank audio for rewritten lines; disclose lack of regenerated voice.

## Important teaching and state constraints

- Before the first test, the player must know: Anchor = (0,0), green = chosen starting vector, yellow = result, **a pulse means applying the displayed matrix once**. The ship changes displacement/position relative to the Anchor; do not invent velocity or an engine-force explanation.
- Show no solution lines or eigenvalues before independent input is required.
- After an attempted wrong multiplier, contrast *what the student's number predicts* with *what the matrix actually produced*. Keep the ghost label identified as their prediction.
- A reversed vector on the same line is still the same eigendirection, even if its length is identical. This is a deliberate correction to the first copy pass.
- If the player finds the second line while a multiplier is pending, the message must direct them to finish the visible pending equation first.
- Do not show all hints or explanations in one panel. Keep a single current feedback sentence/paragraph; deeper input help is collapsed. Old error states must clear on correction.
- Keep story skippable without losing the essential labels.
- Maths values inside prose use the game's existing KaTeX renderer. Coordinate pairs should not appear inconsistently as unstyled plain text.

## Minimum one-game acceptance check

A short Commander browser pass, not an all-chapter project:

| Action | Expected evidence |
|---|---|
| Start (1,0), press Test | (2,1) appears, ship visibly leaves green line; matrix/pulse/colours are explained on the first screen |
| Try (1,1), type multiplier 2 | Visible specific mismatch: predicted (2,2) versus actual (3,3); doesn't reveal the correct multiplier |
| Correct to 3 | Previous warning/prediction ring clears; first line locks and the next objective is clear |
| Try (-1,-1) afterward | Says it points in the opposite direction but is the same line, not merely another-sized vector |
| On a fresh run find (1,-1) first | Correctly handles multiplier 1 and points subsequent hints to the other diagonal |
| Finish both lines, view existing name card | Eigenvector and eigenvalue introduced after both multipliers are committed, with examples tied to actual outcomes and no invented history |

**Deliver:** a branch/preview URL and screenshots of the first screen, wrong multiplier, opposite-vector duplicate, and name card. State what remains untested. Minimal build/typecheck as necessary for playability; don't block the preview on unrelated extensive suites. Keep production untouched.

**Done means the actual first game renders the approved text at the correct events and is playable. Committing these content files alone is not a completed integration.**
