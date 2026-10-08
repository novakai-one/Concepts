# SINGULAR — Chapter 18: the trajectory problem (authoritative spec)

Source: the user's brief (written with ChatGPT), Version 1.0. Pasted into the session on 2026-10-07.
Scope: the **opening eigenvector encounter of Chapter 18**, its immediate application and its practice sequence.
Everything else in Chapter 18 (the shear sweep, the λ dial, complex eigenvalues, the 3 × 3, the Briefing, the builds) is outside scope and is preserved.

Some mathematics was lost when the brief was pasted (its LaTeX did not survive).
Values restored from context are written plainly. Values that had to be **chosen** are marked **[chosen]** and are listed again in §11.

---

## 0. The outcome

The player should finish thinking:

> I understand what an eigenvector actually is. I needed one to keep my trajectory on the correct line, I could see why other vectors failed, and I learned how to calculate one. That was satisfying, and I want to try another challenge.

Do not reinterpret this as a request for quizzes, worksheets, more explanations or cosmetic effects.

## 1. Product requirements

| Outcome | Required experience |
|---|---|
| Engagement | Gameplay is stimulating, varied, responsive and rewarding |
| Relevance | Eigenvectors solve a concrete problem the player meets |
| Understanding | The player sees and reasons about why eigenvectors keep a line |
| Competence | The player calculates solutions repeatedly and transfers the skill to unfamiliar matrices |

Constraints:

- Keep SINGULAR's world, visual identity, controls, navigation, progression and renderer.
- Keep **green = input vector**, **yellow = transformed vector**.
- Exact maths, including signed eigenvalues and distinct eigenlines.
- Never reveal a solution before the player has tried that challenge.
- Lots of calculation practice; no long explanation after every attempt.
- Reward experimenting and understanding, not random clicking or copying.
- Commander is hard because of the maths, never because of obscure instructions or awkward controls.
- No separate worksheet interface, practice app or disconnected minigame.

## 2. Core concept: the trajectory problem

The ship must cross an unstable region of space. **Each navigation pulse applies the same linear transformation to its displacement vector.**
The player chooses the starting vector. They cannot change the transformation.
Most vectors are turned off their line by the pulse. Some stay on their own line, though their length may change.
The player must discover and calculate a stable trajectory, then use it to navigate.
Success is not "find an eigenvector". The eigenvector is the **tool** the mission needs.

Opening matrix: $A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$. Eigenvectors $(1, 1)$ with λ = 3 and $(1, -1)$ with λ = 1.

## 3. Scenes

### Scene 1 — the first failed launch

Goal: feel the problem before any terminology.

- Show the ship, an illuminated intended route through the origin, and the transformation region. Matrix in the HUD.
- Launch vector prefilled with $(1, 0)$.
- Instruction: **"Each pulse transforms your trajectory. Find a launch direction that stays on its original line."**
- No word "eigenvector". No solution lines, eigenvalues or labels.
- Player presses **Test this arrow** (or the launch control). $(1, 0) \to (2, 1)$.
- Sequence (about 1–2 s from pulse to settled): ship launches along the vector → pulse fires (distinct visual + audio) → yellow transformed vector appears → yellow trajectory leaves the intended line → brief off-course warning → settles with original and transformed vectors visible together.
- Feedback: **"Your launch direction changed. The pulse moved (1, 0) to (2, 1). Find a direction that the pulse doesn't turn."**
- Done: the player has seen a failure, can tell the original line from the new direction, and can try again at once.

### Scene 2 — discover a kept direction

Goal: some vectors change length without changing their line.

- The player edits both components with the existing coordinate controls. Every attempt shows the real result and whether it stayed on its line (e.g. $(0, 1)$, $(1, 2)$, $(1, 1)$).
- Success: $A(1, 1) = (3, 3)$. Green and yellow align; a strong, brief effect runs along the kept line; a distinctive success sound. The line visibly extends **three times as far** (if arrows are normalised, add a comparison view that shows the true ×3).
- Then: **"The direction stayed on the same line. The pulse changed its length, but didn't turn it."**
- Then: **"How much did the pulse multiply your vector?"** The player enters **3**.
- **Do not display 3 (the multiplier, ratio or λ) before this answer is committed.**
- Wrong (e.g. 2): show why: $2(1, 1) = (2, 2) \ne (3, 3)$.
- Right: lock the line and reveal the multiplier.
- Done: a valid direction chosen and the correct signed multiplier entered independently, with nothing to copy.

### Scene 3 — the second line

Goal: tell a different vector from a genuinely different line.

- First line stays visible; second stays hidden. **"One safe direction found. Is there another?"**
- If the player tests $(2, 2)$: it works but is the same line. **"(2, 2) also stays on this line. It's twice (1, 1), so you've found another vector, not another direction."** Taught visually with overlapping lines.
- The player finds $(1, -1) \to (1, -1)$, multiplier **1**, entered before it is revealed.
- Completion: both lines light up; the transformation region briefly shows how the grid behaves relative to them.
- Only now: **"Those kept directions are called eigenvectors. Their multipliers are eigenvalues."** Then $A\mathbf v = \lambda\mathbf v$, each symbol tied to the vectors and the matrix the player just used.
- Done: two distinct lines and their eigenvalues; multiples on one line visibly do not count as new directions.

### Scene 4 — use it: the two-pulse mission

Goal: understanding is needed to succeed.

- Same $A$. The ship must reach a waypoint after **exactly two pulses**. Destination $(9, 9)$. The player chooses the launch vector $\mathbf v$; two pulses apply $A^2\mathbf v$.
- **"Two pulses remain. Set your launch vector so the ship reaches the waypoint at (9, 9)."**
- Intended reasoning: $(1, 1) \to (3, 3) \to (9, 9)$.
- Show the waypoint at its exact coordinate, pulses remaining, the intermediate point after pulse 1 and the final point after pulse 2.
- Success: short, high-quality payoff (docking or corridor clearance, audio confirmation, clear visual reward).
- Wrong vector: its true endpoint, visibly missing. Retry without replaying dialogue.
- Validate with real matrix arithmetic; accept any vector that meets the constraint.

### Scene 5 — fluency: ten practice rounds

Same environment and controls. Not a worksheet. Ten rounds in the first sequence, with more available on demand.

| Round | Maths | Gameplay |
|---|---|---|
| 1 | Recognise an eigenvector of the previous matrix | Rapid trajectory lock |
| 2 | Calculate its eigenvalue | Set the correct pulse multiplier |
| 3 | Tell a scaled vector from a new eigendirection | Reject a duplicate flight path |
| 4 | Find both eigenlines of a new symmetric matrix | Unlock two navigation corridors |
| 5 | Calculate both eigenvalues without seeing them first | Calibrate two pulse channels |
| 6 | A negative eigenvalue | A direction-reversing pulse |
| 7 | A zero eigenvalue collapses displacement to zero | Identify a collapsed trajectory |
| 8 | The kept line of a shear | A region that drifts sideways |
| 9 | A new matrix, no hints, no revealed directions | Independent navigation |
| 10 | Eigenvector + eigenvalue for repeated pulses | Multi-pulse mission |

Fixtures (the brief's table lost its matrices; these meet its stated targets):

| Matrix | Target |
|---|---|
| $\begin{bmatrix} 3 & 1 \\ 1 & 3 \end{bmatrix}$ **[chosen]** | Two lines: $(1, 1)$ λ = 4, $(1, -1)$ λ = 2 |
| $\begin{bmatrix} 2 & 0 \\ 0 & -1 \end{bmatrix}$ **[chosen]** | Axis eigenvectors; $(0, 1)$ reverses, λ = −1 |
| $\begin{bmatrix} 2 & 0 \\ 1 & 0 \end{bmatrix}$ **[chosen]** | Zero eigenvalue on the vertical axis: $(0, 1) \to (0, 0)$; second line $(2, 1)$, λ = 2 |
| $\begin{bmatrix} 1 & 1 \\ 0 & 1 \end{bmatrix}$ | One eigendirection $(1, 0)$, λ = 1 |
| $\begin{bmatrix} 4 & -2 \\ 1 & 1 \end{bmatrix}$ **[chosen, round 9]** | $(1, 1)$ λ = 2, $(2, 1)$ λ = 3 |

Use them as distinct situations, not the same prompt with new numbers.
Pacing: most rounds 20–60 s once the mechanics are known; application rounds may take minutes. Rhythm: **challenge → calculate → execute → next**. No long reflective questions between rounds. Every few rounds, a more substantial challenge.

### Scene 6 — the independent challenge

- A matrix not met in this sequence. No visible eigenlines, eigenvalues or answer-revealing animations. Matrix, own calculations and the transformation mechanics only.
- Ideally a short multi-pulse navigation objective.
- Passing requires independent calculation and correct application.
- Optional help, but record whether it was used. A solution reached with revealed answers does not count as independent mastery.
- After completion: a brief summary connecting the strategy to $A\mathbf v = \lambda\mathbf v$.
- **[chosen]** $B = \begin{bmatrix} 5 & -2 \\ 1 & 2 \end{bmatrix}$ (eigen: $(1, 1)$ λ = 3, $(2, 1)$ λ = 4). Mission: reach $(32, 16)$ after exactly two pulses. Unique answer $\mathbf v = (2, 1)$ since $B$ is invertible; validate by computing $B^2\mathbf v$.

## 4. The mathematics taught

Geometric: an eigenvector is **non-zero** and stays on its line; it may get longer, shorter, reverse or collapse to zero; the eigenvalue is the signed multiplier; many vectors share one eigenline; not every matrix has two real eigenlines.

Computational: $A\mathbf v = \lambda\mathbf v$ by direct multiplication and comparison early. $(A - \lambda I)\mathbf v = \mathbf 0$ and $\det(A - \lambda I) = 0$ only where the curriculum has taught them (the λ dial puzzle later in Chapter 18 teaches the determinant route; do not require it before then).
The calculation must help solve the gameplay challenge.
On Commander, never show λ before the player has had a fair chance to calculate it in the designated rounds. Early exploratory rounds may reveal it to support discovery.

## 5. Wrong answers

| Player action | Response |
|---|---|
| Tests a vector that turns | Original and transformed lines, and the actual deviation |
| Wrong eigenvalue | Which component or equality fails |
| Multiple of a found eigenvector | Why it is the same line |
| The zero vector | It does not define a direction, so it is not an eigenvector |
| Wrong vector for repeated pulses | The actual trajectory and the missed destination |
| Several failures | Progressively more useful hints, never forced |
| Corrects an answer | Clear old errors, show the success state |

Scoring must separate **exploring** (testing arrows) from **committing** a wrong answer. Do not punish exploration so hard that guessing beats exploring.

## 6. Engagement and senses

- Ship motion follows the real transformation. Green/yellow comparison. Kept directions: striking, brief alignment effects. Failed trajectories visibly diverge.
- Distinct visual identities for stretch, reversal, collapse and shear.
- After animations, the mathematical state stays inspectable.
- Sounds: launch, pulse, unstable trajectory, alignment, mission complete. Use existing audio systems. Never hide information in audio; everything works muted.
- Do not repeat one screen/prompt/animation ten times; do not make ten unrelated minigames.
- Fast retry, short success responses, no mandatory long dialogue on Commander, no needless text after correct answers, a clear next objective at once, optional deeper explanation without leaving the game.

## 7. Commander

| Dimension | Requirement |
|---|---|
| Discovery | Visual experimenting, no early solutions |
| Calculations | Independent numerical/algebraic work at designated stages |
| Hints | On demand, never forced |
| Story | Skippable without losing essential maths |
| Demonstrations | Optional; skipping leaves no knowledge gap |
| Difficulty | Hard decisions, not tedious controls |
| Repetitions | Substantial, fast, varied |
| Solutions | Only on request or after commit/completion |
| Progress | Separate **independent**, **corrected** and **assisted** success |

## 8. Implementation boundaries

- Start from the existing game. Inspect c18-eigen, the puzzle controls, renderer, feedback, navigation, scoring/save, audio/animation, and docs/singular/.
- Old worksheet/drill experiments are not approved designs.
- Keep working gameplay; preserve Chapter 18 outside scope.
- Do not replace navigation, asset pipeline, chapter architecture or the established experience.
- If something cannot be done faithfully, document the constraint and propose the smallest compatible change.

## 9. Definition of done (22 criteria)

Gameplay fidelity
1. Recognisably SINGULAR, using the existing environment and transformation controls.
2. The trajectory mission is genuinely playable, not a text description.
3. Mathematical choices visibly determine the ship's trajectory and success.

Learning
4. An unsuccessful transformation before any terminology.
5. Kept and non-kept directions visually distinguishable.
6. Eigenvalues never shown before independent input is required.
7. Eigenvector knowledge needed to complete a meaningful navigation objective.
8. Ten varied practice challenges, including signed and zero eigenvalues.
9. A final unfamiliar challenge requiring independent transfer.

Engagement and pacing
10. Discovery, repetition and application feel different within the same game.
11. Major discoveries and mission successes have visual/audio payoff.
12. Retries and practice rounds never replay unnecessary story or explanation.
13. The player always has a clear next action.

Technical and QA
14. Maths and visual trajectories numerically consistent.
15. Correct alternative answers accepted; invalid and near-valid answers handled.
16. Existing chapters, navigation, saves and settings still work.
17. Desktop and mobile checked.
18. Build and automated tests pass.

Evidence
19. A real Commander playthrough from first launch to final challenge.
20. Screenshots or video of the key scenes and outcomes.
21. Wrong answers, hints, corrections and rapid retries exercised.
22. Unmet criteria or untested behaviour disclosed.

Required evidence: screenshots of the failed launch, kept-line discovery, eigenvalue entry, second-line discovery, multi-pulse navigation, practice variation and independent challenge; a reproducible Commander playthrough; a report mapping each criterion to evidence; a list of anything not implemented, not verified or changed.

## 10. Delivery

- Implement in a **separate branch** (`claude/ch18-trajectory-preview`) and a **separate preview build**.
- **Do not republish the existing production SINGULAR artifact** until the user has reviewed the preview.
- Subagent reviews must judge the delivered gameplay against this spec, not just code quality.
- Passing tests or rendering a page is not the goal; if an experiential criterion fails, the work is incomplete.

## 11. Ambiguities resolved during implementation

| Gap in the pasted brief | Resolution |
|---|---|
| Fixture matrices lost | §3 Scene 5 table, marked [chosen] |
| Independent-challenge matrix not given | $B = \begin{bmatrix} 5 & -2 \\ 1 & 2 \end{bmatrix}$, target $(32, 16)$ in two pulses |
| Round 10 mission not given | $\begin{bmatrix} 3 & 1 \\ 1 & 3 \end{bmatrix}$, reach $(-8, 8)$ after three pulses, $\mathbf v = (-1, 1)$, λ = 2 |
