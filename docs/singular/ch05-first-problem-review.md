# Chapter 5: first-problem review

Reviewed 2026-10-09, from origin/main at f6c3aeb, on branch `codex/ch05-cross-product-rebuild`.

## Initial audit: scope and evidence

The request was narrowed to one problem for calibration. This is an initial assessment, not learner acceptance or a completed rebuild.

- Read `docs/singular/ch18-why.md`, `ch18-plain-style.md`, `CLAUDE.md`, and the Notion project page's “Why Chapter 18 changed” section.
- Opened `singular/?chapter=c05&beat=3` locally, headless, at 1440 × 900.
- Selected Commander in Settings, reloaded, and verified the saved difficulty was `commander`.
- Captured the initial screen, then typed the column vector [0, 0, 2] and pressed Raise. No dragging or solve shortcut was used.
- Inspected both saved screenshots. The first feedback capture was too early to show the message; replaced it with a capture after the message appeared.
- Did not play or capture the second puzzle, finish the first, or check phone and assistive-technology behavior. No game code was changed.

Local screenshots:

1. `output/playwright/ch05-audit/01-puzzle1-commander-start.png`
2. `output/playwright/ch05-audit/02-puzzle1-commander-wrong-length.png`

## Findings

1. **Initial screen: task is harder to decode than necessary.** The goal, input, and results occupy three corners; the diagram sits low in the centre amid a large starfield and grid. Persistent title, stars, navigation, and utility buttons compete with the maths. Commander still displays dragging instructions. The proposed repair is the existing calm layout, a larger useful diagram, one short instruction, and nearby typed input and feedback.
2. **The dot-product connection is obscured.** “Reading of n against v” gives a meter and a number rather than n·v and its calculation. The input is a column vector, but supplied vectors and the output readout are horizontal tuples. Use consistent column notation and actual dot-product equations after submission.
3. **The wrong-length attempt exposes a missing connection.** For [0, 0, 2], the upright arrow and right-angle marks help: both dot products are zero. The message says the length is 2 and must match the panel's area, but the scene does not show a base-height construction or an area-to-length comparison. Start by finding a nonzero perpendicular vector, then introduce the cross product's additional length rule with a visual area construction (base 2, perpendicular height 3). On an unsuccessful length attempt, show the relevant calculation and mismatch, not another paragraph.
4. **There is one fixed instance here, not a practice sequence.** The first puzzle uses only v=[2,0,0], w=[1,3,0]. A rebuild should develop the idea through about ten short rounds with changing numbers and later planes, signs, and parallel cases. This observation is scoped to this puzzle, not a claim that the entire chapter has no further exercises.

## Proposed learning sequence

- Empty typed input; “Find a nonzero vector perpendicular to both vectors.” Let attempts change the diagram and reveal the two dot products.
- Once that idea is established, show how the parallelogram's area is computed and introduce the rule that the cross product's length equals that area. This length rule is additional: perpendicularity alone does not force length 6.
- Treat the two directions honestly. In this example [0,0,6] and [0,0,-6] both satisfy perpendicularity and length. The current first puzzle correctly accepts either. A later step must establish the order/right-hand convention before calling one of them v×w.
- Name the idea after the learner has encountered it; build fluency through varied typed practice with fading help.

## Review of this assessment

The weakness is not “there should be no words” or “3D is bad.” The diagram, typed input, and right-angle feedback are valuable foundations. The repair should make the mathematical relationships legible and remove competing interface elements. The initial values are not a free correct answer, so the Chapter 18 default-answer criticism does not apply here. These screenshots do not establish motion quality, full accessibility, or that the proposed rebuild will be understood; the learner playing it remains the acceptance check.

## Implementation and whole-screen review

The owner approved implementation, emphasising Commander-only typed play, moderate difficulty, achievable early examples, and motion that teaches university-level concepts. The first problem now contains ten rounds. Other Chapter 5 problems retain their existing implementations.

- Rounds 1–3: find a nonzero perpendicular vector, first in coordinate planes and then in a tilted plane. Any valid length and either normal direction are accepted.
- Rounds 4–6: add the area/length condition, including a negative projection of the second edge and a tilted parallelogram. Either normal direction remains valid.
- Rounds 7–10: introduce the ordered cross product, reverse the same pair, solve a general three-component case, and handle parallel vectors.
- All inputs start empty. The learner submits values and sees that vector move, the two angle checks, the area swept by the base, and (in the ordered rounds) the curl from v to w. Calculations use the submitted values. Hints are optional and progressive; Show me demonstrates only the current round and records help.
- State survives reload. The final screen records independent, corrected and assisted rounds and offers an optional observation in the learner's own words.

Concrete repairs found while inspecting the whole output:

1. A fixed camera made the tilted third-round plane look almost like a line. The initial replacement exposed the plane but projected the normal onto another edge. The revised camera selection checks all three projected directions. `final-round03.png` shows distinct v, w and n with the two zero dot products.
2. Feedback initially shifted the controls. They now stay at the top of the question column. Literal line-break markup in an early area calculation was replaced with separate equation elements; the length/area comparison uses consistent quantities.
3. Area labels overlapped arrowheads and the sloping edge. Labels now sit off the relevant segments; the height has a perpendicular marker, and a negative base projection has a dashed extension.
4. The phone diagram scrolled away while reviewing feedback. At 390 × 844 it now remains visible, uses larger labels and crops excess chart margins. New rounds start at the question rather than scrolling directly to the focused input. The desktop review used 1440 × 900.
5. Framing stays fixed for ordinary retries, so a changed arrow length is not disguised by rescaling the diagram. Extreme entries can expand the bounds. All vectors share one mathematical scale; the orthographic projection foreshortens vectors according to their angle to the camera.
6. The results screen initially retained the diagram's input prompt after the input was gone. It now shows only the round record and observation field, centred on screen.

Gameplay verification used typed Commander input through all ten rounds, including wrong direction, zero-vector rejection in early rounds, a correct perpendicular vector of the wrong length, opposite-sign acceptance before the order rule, opposite-sign rejection afterwards, and the parallel zero result. Selected saved rounds were revisited to inspect repairs. After the final camera change, a second uninterrupted typed run completed all ten rounds and captured every result. Blank/invalid entries, fractions, replay, resume after reload and the single-round Show me path were also exercised. Finish/Continue returned to Chapter 5 beat 4 and removed the practice layout and scoped body class.

`npm run build` passed, as did the 455 existing tests. No new test suite was added. Existing audio-autoplay browser warnings and the build's large-bundle warning remain. The established green/red/yellow colours are retained with direct labels and equations; full colour-vision and assistive-technology compliance is not claimed. Phone screenshots do not establish physical-keyboard or touch-device behaviour. The difficulty and educational usefulness still need the owner's actual play experience.

Local implementation screenshots are in `output/playwright/ch05-audit/`: `final-round01-start.png`, `final-round01.png` through `final-round10.png`, `final-round04-miss.png`, `final-results.png` and `final-mobile.png`. These are review artifacts, not published repository assets.
