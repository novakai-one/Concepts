# SINGULAR — Game Design Document

Version 1.0 (final). Owner: creative director.
Built from: `curriculum.md` (nodes N01–N28, threads T1–T14), the three pitches (narrative = spine, puzzle and builder = grafts) and the three judge verdicts. Every must-fix item from the verdicts is addressed; Appendix D traces each one to the section that fixes it.
Every number in this document was recomputed in NumPy (`docs/singular/verify_gdd.py`, 483 checks). Chapter authors must still bind every on-screen number to the maths library (§11.2), never type it by hand.

**Read in this order if you are writing a chapter:** §0, §2.7 (maths truth table), §3, §4, your chapter in §6, §7, Appendix C (term ledger), Appendix E (how to map all of this onto today's engine), then `docs/singular/AUTHORING.md`.

---

## 0. The decisions in one page

| Decision | What we chose | Why |
|---|---|---|
| Spine | The narrative pitch: the survey tug *Lantern*, the colony ark *Meridian*, the Anchor that moves space. | Strongest emotional engine; the existing engine, cast and voice bank already match it. |
| What the player does | Plot arrows and matrices with their hands; the world moves by the real matrix; space answers. | "Linear algebra is the physics of the world" (puzzle pitch). Answers are world states, never letters. |
| Chapters | 26 chapters, one curriculum node each (N01+N02 and N12+N13 share a chapter), in 9 acts, plus Prologue and Epilogue. | At most one major new idea per chapter. Spectral theorem and SVD are separate chapters. Composition and inverse are separate. Basis and change of basis are separate. |
| Explain-back | One stack with four parts: **Doubts** (counterexample duels by construction, checked by the Shake), **Laws** (a templated statement the world attacks with test cases), **Execute-my-steps** (LANTERN runs your procedure; Teo follows your message), **Field Manual** (you write first; the model page appears after). | Explanations are checked by consequence. No free text is ever graded. |
| Builder thread | The player rewrites the ship computer's maths library, `lantern.py`, in real Python (Pyodide, plain lists). Each chapter adds 1–3 short functions. Installs run the player's code at story events, never per frame. LANTERN's backup ("crew version") runs anything not yet written. | "Make something real" for a CS student, without gating and without a compiler project. |
| Central maths truth | The Collapse pulse is **not** exactly singular. Its smallest singular value is exactly 1/750. LANTERN only ever says "zero, to two decimal places". The exact-zero lesson is taught on the two-decimal model and paid off again by the final transmission. | Keeps "det exactly 0 means gone, by anyone" and "tiny means invertible but ill-conditioned" cleanly separate (§2.7). |
| Difficulty | Three independent settings, switchable per chapter at any time: **Maths depth** (Cadet = see it, Navigator = compute it, Commander = prove it), **Code help** (Off, Assemble, Fill, Write), **Assists** (toggles). | Decouples maths demand from Python help and from numeric help. |
| Never gate | Every chapter, puzzle, doubt, law, procedure and build is open from minute one, with Show me and Skip. Stars and par change banter and cosmetics only. | Brief §2b. A Playwright test asserts it. |
| Puzzle contract | Every puzzle is a declarative model: serialisable state, one reducer shared by input and Show me, pure `isWon`, a reference action list per difficulty, and at least one known-wrong action list. | Headless solvability, negative tests, fast CI (§12). |

---

## 1. Title, logline, pillars, tone

### 1.1 Title: **SINGULAR**

The word carries three meanings. The game uses all three, in this order, and pays each one off on screen:

1. **Alone.** A scientist has been alone in the Fold for three years. One small ship came.
2. **A singular matrix.** A move that flattens space and has no inverse. The title card returns on screen in Chapter 13 at the moment the term is earned: *"A matrix that flattens space is called singular. It has no inverse."*
3. **Singular values.** The stretches the SVD finds. In Act IX they show that the disaster was thin, not gone.

The title is branding only until Chapter 13. No player-facing maths text uses the word "singular" before then.

### 1.2 Logline

> A survey crew answers a three-year-old distress call into a region where, every few hours, a pulse moves every point at once. Straight lines stay straight. One point never moves. A colony ark with twelve thousand sleepers is being sheared and squeezed. To bring them home you must learn to read the pulse itself, and the last thing it teaches you is the difference between *gone* and *very, very thin*.

### 1.3 Pillars

1. **The maths is the physics.** Every deformation on screen is the actual matrix applied to actual vertices. Nothing is faked. If the picture and the numbers disagree, the build fails.
2. **Answers are things you make.** A burn that lands, a brace that holds, a grid that matches, a Law that survives attack, a function that passes its swarm. No multiple choice anywhere on a scoring path.
3. **Explain it so it works.** Your explanations are run: Bram shakes them, LANTERN executes them, Teo follows them. When one fails, you see exactly which idea was missing.
4. **Every twist is a number.** The story's surprises are maths results the player computes, planted on screen acts earlier and fair to an attentive player.
5. **Nothing is locked.** Any chapter, any order, any time, with Show me and Skip everywhere.

### 1.4 Tone

- Quiet, precise, warm. Outer Wilds mystery and stillness; Mass Effect crew loyalty; Return of the Obra Dinn deduction.
- No villains. Vell is reasonable and wrong about one number. Arguments are settled by maths the player commits.
- Two registers, enforced by speaker id (§11.9):
  - **Story register** (Wren, Bram, Teo, Vell, Ilse live): people with feelings. They never explain maths and never use a term before its naming beat.
  - **Maths register** (LANTERN, Ilse's recorded logs, naming cards, goal lines, Laws, model pages, tiles, error messages): literal first, house wording, course terms once earned.
- Emotion is carried by short lines, silence, music and the voiceprint visuals, never by punctuation or acted crying (§10.1). No exclamation marks anywhere.

---

## 2. Story bible

### 2.1 Setting

- **The Fold.** A region of space around an ancient structure called **the Anchor**. Every few hours the Anchor fires a **pulse**: one linear transformation applied to every point inside the Fold at once. Debris streams flow through the Fold from outside; a pulse moves what is inside at that moment, and the streams keep their course.
- **The Anchor.** A black monolith with three long spires. Its base sits at the one point no pulse can move. The spire tips set where the three grid arrows land, **written in the Anchor's own skewed grid** (b₁ = (1, 0, 0), length 1; b₂ = (1, 1, 0), length 1.41, at 45° to b₁; b₃ = (0, 0, 1), length 1). Nobody knows this until Act VI. When its spires are locked, the Anchor repeats the same pulse every few hours. Unlocked, it fires once.
- **The *Lantern*.** A survey tug, crew of three plus the player. Its lattice projector seeds space with a square grid of light buoys, one every 100 m, so the crew can see what space is doing. All puzzle coordinates are in buoy units. LANTERN puts the origin at the point that does not move.
- **The *Meridian*.** A colony ark, 1.2 km long, three sections (Bow, Mid, Stern), 12,000 sleepers. Its hull is a frame of boxes held open by struts.
- **The core.** A sealed room inside the Anchor's base, at the origin.

### 2.2 Cast

| Character | Role | Personality | Wants | Arc | Kokoro voice (speed) | Backup |
|---|---|---|---|---|---|---|
| **You ("Nav")** | The *Lantern*'s new navigator, CS-trained | Silent. Your hands plot every move; your sentences become the ship's manual and your code becomes its library. | — | From new hire to the person who rewrote LANTERN's library and the ark's manual. | not voiced | — |
| **Wren Okafor** (31) | Pilot | Warm, fast, dry humour, wound tight. Her younger brother Teo sleeps on the *Meridian*. | Get to Teo. | From "get me to him" to the one who insists on all 625 readings before the unfold. | `af_heart` (1.04) | `af_bella` |
| **Bram Haldane** (64) | Engineer | Gruff, patient, sceptical, kind. Lost a crewmate to a number nobody checked. Builds nothing he cannot explain. The explain-back mechanic as a person. | Proof he can bolt on. | From doubting you to etching your sentences onto his ship. | `bm_george` (0.94) | `bm_fable` |
| **LANTERN** | Ship computer | Literal. Reports what points, arrows and grids did. Never guesses, never comforts, never rounds without saying so. Its deadpan is often funny. Models the house wording. | — | Its maths library was corrupted by the first pulse; by the end it runs on yours. | `bf_isabella` (1.00) | `bf_alice` |
| **Dr Ilse Varga** (52) | *Meridian*'s science officer | Calm, exact, wry, ashamed. Learned to set the Anchor; wrote the right numbers in the wrong grid. Has lived three years in the core, at the one point no pulse can move. | That someone finishes what she started. | From recorded voice, to confession, to the person who sets the Anchor to the identity. | `bf_emma` (0.95); logs band-passed | `bf_lily` |
| **Teo Okafor** (19) | Sleeper, woken early by Ilse | Curious, frightened, funny under pressure. Trapped in the stern when it flattens. The person you teach. | Out. | From static and taps to a clear voice. | `am_puck` (1.04) | `am_liam` |
| **Director Marcus Vell** | Survey Authority | Calm, reasonable, under orders. Believes the ark is lost and the Anchor's record is worth more. Right that exact flattening cannot be undone; wrong that this pulse was exact. | The Anchor's record for his home colony. | Changed twice by maths: a forecast (Act VII) and six decimals (Act IX). | `am_onyx` (0.92) | `am_fenrir` |

Six voices. Speaker accent colours (dialogue UI only, never in the 3D maths scene): Wren #ff9ecb, Bram #d9a76a, Ilse #aab8ff, Teo #9fefe6, Vell #c4cad8, LANTERN #59e1ff.

### 2.3 The mystery (what the player is trying to find out)

Pinned on the Case Board from the Prologue:
1. *Why did everything move except the point under the Anchor?* (Answered Ch 11: a linear transformation keeps the origin fixed.)
2. *What do Ilse's nine numbers mean?* (Ch 11: three landing spots, a quarter turn. Ch 17: read in the wrong grid.)
3. *What is the light at the point that never moves?* (Ch 17: Ilse's lamp. She has lived at the only place no pulse can move.)

Opened later: *Why did the prediction from the spires miss when the volume prediction matched?* (Ch 11 → Ch 17), *Where is Teo?* (Ch 10 → Ch 23), *Why does every fourth pulse bring the ground layer home?* (Ch 11 → Ch 18), *Is the stern gone?* (Ch 14 → Ch 25).

### 2.4 Act-by-act plot, and how each act's maths solves it

| Act | Title | Plot problem | The maths that solves it | How it is solved on screen | Turn |
|---|---|---|---|---|---|
| Prologue | The first pulse | A pulse knocks out two thrusters. Everything moves except one point. | Linearity, seen not named | You fly the first burn and watch lines stay straight. | Nine numbers in a distress call; a light at the fixed point. |
| I | Drift | Two thrusters left. Reach the ark's signal. | Vectors, combinations, span, independence | You find what two thrusters can reach, prove the signal is off that plane, and mount a third thruster that adds a new direction. | The camera tilts into 3D for the first time; the ark is sheared. |
| II | Signal | Find, orient and dock with the tumbling ark. | Dot, cross, triple product, lines and planes | Dish aim by dot product, turning axis by cross product, hull strut check by triple product, docking line through the hangar door's plane. | Section C's struts enclose zero volume. |
| III | The Ledger | Restore power inside the dark ark; find Teo's pod. | Systems, augmented matrix, row echelon form, reduced row echelon form | Three fan-beam planes locate the pod; elimination routes generator power; free variables route the flows. | Teo's pod is empty. |
| IV | The Pulse | Predict the pulse, undo its damage, measure the loss. | Linear transformations, product, inverse, determinant | You read the pulse from the lattice, fuse moves, build undo matrices, forecast volume. | The spire prediction misses while the volume prediction matches. Then your own forecast reads 0.00, and you cannot brace against it: the Collapse. |
| V | Collapse | The stern is flat. What survives? | Column space, null space, basis, rank, the four subspaces | You find where everything lands (our old thruster plane), what was crushed, and how many directions survive. | Vell: "Anything flattened is gone." On the two-decimal model, he is right. |
| VI | The Wrong Grid | Why did Ilse's fix go wrong? | Coordinates, change of basis, similar matrices | You replay her quarter turn in the Anchor's grid and recover the measured pulse exactly; then set the spires right and swing the ark out of the debris. | Ilse is alive, at the origin. |
| VII | Lines That Hold | Vell's plan: fifty repeats of his pulse. | Eigenvectors (real and complex), diagonalisation, Markov chains | You find the lines his pulse does not turn, forecast fifty pulses in one step, and route the drones. | His own cutter ends at (2, 2, 2) with volume × 10⁻⁵⁰. He stands down. |
| VIII | Shadows | Measure the Collapse pulse far past two decimals, from noisy data. | Projection, Gram–Schmidt, orthogonal matrices, least squares | Closest points, a re-squared frame, and a least-squares fit of the pulse from drone readings. | The fit's leftovers tap out a pattern. Teo is alive. |
| IX | Singular | Unfold the stern without tearing it. | Symmetric matrices, quadratic forms, SVD, conditioning, PCA | Brace along principal stress axes, read the singular values to six decimals, average 625 readings, invert, convert into the Anchor's grid, set the spires. | "Zero, to two decimal places." Thin, not gone. |
| Epilogue | Every point stays where it is | Quiet the Fold. | The identity matrix | You check Ilse's final setting: the one matrix that is the same in every grid. | Post-credits: the component you left out was not noise. |

### 2.5 Detailed plot beats

**Prologue.** Cold open: Ilse's recording from three years ago, the *Meridian* in nebula light, a pulse front sweeping across it, every box frame leaning (the routine pulse, applied to the real hull). Her voice: *"The Anchor moves everything around it. I have learned to set it. Nine numbers. They should turn us out of the debris. First spire: zero, one, zero. Second: minus one, zero, zero. Third: zero, zero, one. Twelve thousand people are asleep on this ship. If anyone can hear this, please come."* Title. The *Lantern* arrives, seeds the lattice, takes the first pulse, flies its first burn. LANTERN: *"Every buoy moved. Straight lines of buoys are still straight. Even spacing is still even. One point did not move: the point under the Anchor. There is a light there."*

**Act I · Drift.** The pulse locked the thruster gimbals flat. Two thrusters reach a plane. Bram unlocks the gimbals at the end of Ch 2: the real thrusters push along (1, 0, 1) and (0, 1, 1), the camera tilts into 3D, and the ark's signal sits off the plane they reach. Wren: *"So we can see him and we can't get to him."* Ch 3: a spare thruster bolted on in the wrong place adds nothing; the right mount lifts the *Lantern* out of the plane, and the *Meridian* comes into view, sheared.

**Act II · Signal.** The dish finds the ark's beacon among decoys. A cross product gives the axis to match the ark's tumble. The hull's strut boxes are losing volume; Section C encloses none. The *Lantern* docks through a triangular hangar door. An old log from Ilse: *"Power is down in all three sections. Start with the power equations."* LANTERN reads its timestamp: *"Recorded two years, eleven months ago."*

**Act III · The Ledger.** Three fan-beam sensors each sweep a flat beam; each records the plane its beam was on when Teo's pod pinged. Elimination untangles the ark's power board. Power returns. Teo's pod opens. It is empty: *"Woken by Dr Varga. Gone to the stern to brace the struts. — T."* A newer log: *"Recorded fourteen months ago."*

**Act IV · The Pulse.** The crew reads the routine pulse from the lattice: columns (1, 1, 0), (−2, −1, 0), (0, 0, 0.8). LANTERN reads the spire tips: (0, 1, 0), (−1, 0, 0), (0, 0, 0.8). The third spire has been bending under debris strikes. A prediction made from the spire numbers puts the bow at (0, 1, 0); it lands at (1, 1, 0). The volume prediction from the spires (× 0.8) matches exactly. Pinned. Every fourth pulse the ground layer comes home; heights do not. Then a heavy debris strike knocks all three spires. LANTERN reads the new tips: (1, 0, 1), (0, 1, 2), and the third swinging into line with the second, now at (0, 1, 2.004). When two spires point the same way, the box the three spires make is flat. Your forecast of the next pulse's determinant reads 0.004: *"zero point zero zero, to two decimal places."* Teo is in the stern. You try to brace it; every arrangement of braces loses the same fraction of its volume. You seal the mid-section bulkhead to save the rest. The pulse fires. The stern folds into a sheet. The music loses one of its three voices. Teo's channel goes to static. LANTERN: *"Pulse complete. The stern is flat, to two decimal places."* The third spire is now jammed: the Anchor goes quiet.

**Act V · Collapse.** Every point the Collapse pulse touched now lies on one plane: z = x + y, the plane the two thrusters reached on day one. A pile of debris sits at the point that never moves: pieces from along one line, all landed together on the two-decimal model. Vell arrives: *"I'm sorry about your brother. Anything flattened is gone. We're here for the Anchor."* The four-subspace review settles what the two-decimal model can and cannot do. Low point: Wren in the airlock. In the corner of LANTERN's display: *"Determinant 0.00 (two decimal places)."* A new log: *"Recorded nine days ago."*

**Act VI · The Wrong Grid.** Bram measures the Anchor's arms: not at right angles, not the same length. LANTERN had drawn them square. Replaying Ilse's quarter turn in the Anchor's grid produces the measured pulse exactly. The volume clue closes: area scaling does not depend on the grid. The newest log is two days old. Then a live voice: *"I wrote the right numbers. I did not know whose grid would read them."* Ilse is at the origin, in the core, the one place no pulse can move. The crew frees the spires jammed since the Collapse, converts a true quarter turn into the Anchor's grid and fires it once: the ark swings out of the debris stream for the first time in three years.

**Act VII · Lines That Hold.** Vell plans to lock his own pulse and run it fifty times to gather the debris (and the Anchor's surroundings) onto one line for towing. You find the lines his pulse does not turn, forecast fifty pulses in one step, and show where his own cutter ends: (2, 2, 2), its volume multiplied by 0.1 every pulse. He stands down and lends his drones; you route 300 drones so that at least 100 settle at the stern. Ilse comes aboard in her own pod: older than her logs, steady, useful.

**Act VIII · Shadows.** The *Lantern*, back on its two original thrusters, gets within tether range of the stern hatch it could not reach on day one. LANTERN's attitude frame has been drifting since the Collapse; Gram–Schmidt sets the world upright. The drones log hundreds of before-and-after positions around the stern. A least-squares fit gives the Collapse pulse to three decimals. LANTERN plots what the fit leaves over. Three short, three long, three short. Wren: *"That's him. That's how we used to knock on the bunk wall."*

**Act IX · Singular.** The hull is braced along its principal stress axes. The *Lantern* spins about a stable axis to hold position (and players who pick the middle axis watch the Flip). The SVD of the fitted pulse: *"Stretches: 3.00, 1.00, 0.00."* Vell: *"Zero is zero."* You press *Show more decimals*: 0.001333. Bram, quietly: *"Thin. Not gone."* The unfold: a raw inverse throws a test cluster 7.5 units off; the two-decimal model has no inverse at all; 625 averaged readings bring the error under the 0.3 tear limit; the undo is written for today's frame and converted into the Anchor's grid; you set the spires and commit. Over twenty seconds the stern fills back out of a sheet. The third voice returns. Teo's voiceprint resolves: *"Wren? Why is everyone so loud?"* The 750× stretch cracks the Anchor. Its core holds a record of 10,000 entries of 12 numbers; the *Lantern* can send two numbers per entry before the core fails. You choose which two.

**Epilogue.** Ilse sets the spires one last time. You check her setting: the identity, the one matrix that reads the same in every grid. She locks it. The final pulse fires and nothing moves. The *Meridian* wakes its sleepers. Vell takes the record home: *"Two numbers per entry. It will have to be enough."* The camera drifts across the bridge plates, each etched with a sentence you wrote. Post-credits: Ilse looking at the record's third component, the one you could not send: *"This one isn't noise either."*

### 2.6 Twists, in order, with where each is planted

| # | Twist | Planted (on screen, fair play) | Paid off |
|---|---|---|---|
| 1 | Teo's pod is empty | Ilse's logs mention "help"; the pod's wake light in Act III | Ch 10 |
| 2 | The spire prediction misses; the volume prediction matches | Ch 11 p4, Ch 14 p1 | Ch 17 p6 |
| 3 | Every fourth pulse brings the ground layer home | LANTERN line in Ch 11 | Ch 18 p4 (λ = ±i, so λ⁴ = 1) |
| 4 | The Collapse | Ch 14's forecast, computed by the player | End of Ch 14 |
| 5 | Ilse is alive, at the origin | The light at the fixed point (Prologue); log timestamps getting newer (Acts II–V) | Ch 17 |
| 6 | Right numbers, wrong grid | Ilse's nine numbers vs the measured pulse (Ch 11) | Ch 17 |
| 7 | Vell's own cutter | His plan includes the region his cutter sits in (Ch 18) | Act VII set piece |
| 8 | The Residual: Teo is alive | Teo's static never stops (Acts V–VII) | Ch 23 p6 |
| 9 | Zero, to two decimal places | LANTERN always says "to two decimal places" for the Collapse, and plain "zero" for exact cases (Ch 13, 15, 16) | Ch 25 p6 |
| 10 | The third component | Its singular value 1.5 is visibly larger than the noise tail (Ch 26 p5) | Post-credits |

### 2.7 Maths truth table (the story's facts, bound to the maths library)

Every story fact below lives in `content/truth.ts`, computed from the maths library at load time, and has a unit test. Dialogue numbers are generated from these values, never typed.

| ID | Fact | Value | Test |
|---|---|---|---|
| TT1 | Anchor grid P (columns b₁, b₂, b₃) | (1,0,0), (1,1,0), (0,0,1); lengths 1, 1.41, 1 | — |
| TT2 | Ilse's spire numbers R (columns) | (0,1,0), (−1,0,0), (0,0,1) | — |
| TT3 | Routine pulse, ship grid, 2D slice: T = P R P⁻¹ | [[1, −2], [1, −1]] (rows); e₁ → (1, 1), e₂ → (−2, −1) | det 1, trace 0, T⁴ = I, eigenvalues ±i |
| TT4 | Spire numbers now (third spire bent) S | (0,1,0), (−1,0,0), (0,0,0.8) | det S = det(P S P⁻¹) = 0.8 |
| TT5 | Routine pulse now, 3D | columns (1,1,0), (−2,−1,0), (0,0,0.8) | bow (1,0,0) → (1,1,0); spire forecast → (0,1,0) |
| TT6 | What Ilse meant to enter, in the Anchor's grid: P⁻¹ R P | [[−1, −2], [1, 1]] | P(P⁻¹RP)P⁻¹ = R |
| TT7 | Collapse pulse, true: C = columns (1,0,1), (0,1,1), (1,1,2+δ) | δ = 0.0040036 (fit shows "2.004"); C is symmetric | singular values 3.00267, 1, 1/750 = 0.0013333 |
| TT8 | det C | 0.0040036 → "0.00" to two decimals | — |
| TT9 | Two-decimal model C₂ (δ = 0) | rank 2; column space z = x + y; null space t·(1, 1, −1) | C₂(2,0,1) = C₂(3,1,0) = (3,1,4) |
| TT10 | Amplification and condition | 1/σ_min = 750; condition number σ_max/σ_min = 2252 | — |
| TT11 | Readings needed | noise 0.01 per reading, tear limit 0.3: 0.01 × 750 / √N ≤ 0.3 ⇒ N = 625 | raw inverse error 7.5 |
| TT12 | Pseudoinverse of C₂ | sends every point back with its (1, 1, −1) part set to zero | the exact model cannot unfold the stern |
| TT13 | Vell's pulse V (symmetric) | (1/60)·[[37,7,16],[7,37,16],[16,16,28]]; λ = 1, 0.5, 0.2 along (1,1,1), (1,−1,0), (1,1,−2) | cutter (4,2,0) → (2,2,2) after 50; det 0.1 |
| TT14 | Drone transition matrix (columns = from Bow, Mid, Stern) | (0.8,0.1,0.1), (0.2,0.7,0.1), (0.2,0.2,0.6) | 300 from Bow → (240,30,30) → (204,51,45); steady (150,90,60); other eigenvalues 0.6, 0.5 |
| TT15 | Drone design | Stern stay 80% (leavers split evenly) → (125, 75, 100); 79% → 96.8 at Stern | — |
| TT16 | Hatch on day one and in Act VIII | (1, 1, 0); closest point on z = x + y is (1/3, 1/3, 2/3); distance 1.155 < tether 1.2 | — |
| TT17 | Collapse fit data | 20 input points; outputs = C x + E where E is built to be perpendicular to the column space of the input data, so the least-squares fit returns C exactly and the residual is exactly E. E carries the knock pattern (3 short, 3 long, 3 short) plus seeded noise of size 0.002 | fit third column rounds to 2.004; residual pattern present |
| TT18 | Anchor record | 12 singular values 9.0, 7.0, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2 | k = 2 keeps 96.4% of the squared total; k = 3 keeps 98.0% |
| TT19 | Lantern inertia matrix (10⁵ kg·m²) | [[4,−2,0],[−2,4,0],[0,0,9]]; axes (1,1,0) 2, (1,−1,0) 6, (0,0,1) 9 | middle axis flips (RK4 test) |
| TT20 | Final setting | identity; P I P⁻¹ = I | — |
| TT21 | Spire readings at the Collapse, S_c = P⁻¹ C P | columns (1, 0, 1), (0, 1, 2), (0, 1, 2 + δ): the third tip is 0.004 from the second | det S_c = det C (similar matrices) |
| TT22 | Unfold spire settings, today's frame. The stern was flattened before Act VI's quarter turn R, so today the Collapse reads R C R⁻¹ (same singular values) and the undo is R C⁻¹ R⁻¹; in the Anchor's grid: P⁻¹ R C⁻¹ R⁻¹ P | column lengths about 613, 1, 612 | the settings undo P⁻¹ R C R⁻¹ P exactly; R C R⁻¹ has singular values 3.00267, 1, 1/750; a split into two pulses stretches at most √750 ≈ 27.4 each |

**The honesty rule for the central catastrophe.** Exactly zero and tiny are never confused:
- Act V teaches null space and rank on the **two-decimal model** C₂, which LANTERN labels "the two-decimal model" every time. On C₂, "anything flattened is gone" is true, and the game says so (Vell's claim is a true trap in the Act V review).
- Act IX shows the **real** pulse C is not exactly flat (σ_min = 1/750). It has an inverse, and that inverse multiplies every error in the thin direction by 750. The unfold needs clean data, not a miracle.
- In the same set piece the player tries to undo C₂ itself: no inverse exists, and the pseudoinverse brings the stern back as a sheet. The exact zero stays lost, by anyone.
- The finale transmission is an exact rank-2 projection: the third component cannot be rebuilt by anyone (post-credits sting).

### 2.8 Ending

The ark is whole. Teo is out. Ilse comes home. The Anchor, cracked by the 750× pulse, sends its record as two numbers per entry and goes dark under the identity. The final shot is the *Lantern*'s bridge: a holotable in a dark void, ringed by plates of your own sentences, and the Field Manual cover: *Written by [your name]*. After the credits: export your Field Manual, your `lantern.py` and your lecture (§4.8).

---

## 3. Core loop and session structure

### 3.1 The five-beat puzzle loop (every puzzle)

| Beat | Time | Hands | Eyes |
|---|---|---|---|
| **1. Survey** | 5–20 s | Right-drag orbits (once 3D is unlocked), scroll zooms, 1/2/3 snap to front/top/side | The problem sits in the world: a beacon, a debris line, a flattened hull, a cloud. The goal line is top-left. |
| **2. Plot** | 30–120 s | Drag arrow tips (snap per settings), Shift-drag for height, type components with Tab, drag matrix columns, drag rows onto rows, turn dials | Green input, red second arrow or column, blue third, yellow result. The live formula panel sits next to the picture, symbols coloured to match. |
| **3. Call it** (optional) | 5 s | Press C: drop a ghost marker where you predict the result lands, or type the number you expect | A faint ghost in the world. Never required. Worth the "Called it" star. |
| **4. Commit** | 2–6 s | Space | Playback with weight: the ship burns, the lattice moves, the hull deforms. The camera cuts to the best angle. Music resolves or tightens. |
| **5. Read** | 10–30 s | Click any overlay to pin it | LANTERN reports, literally, what the points, arrows and grid did. Overlays draw the parallelogram, the shadow, the right angle, the gap. A miss stays where it landed and the gap arrow is drawn (fail usefully). |

No timers anywhere. Pulses fire when you commit or at story beats.

### 3.2 The chapter loop (30–45 minutes), in house order

| Step | Beat kind | What happens | House rule |
|---|---|---|---|
| 1 | `cinematic` ≤ 60 s, skippable | The plot problem, shown, not explained. | Problem first |
| 2 | `card` | The chapter's plain question as its title, and the **In short** box: the question and a one-sentence literal answer, with no unearned term. Visible at the start, pinned in the corner after. | In short |
| 3 | `puzzle` × 2–3 | **See it.** Wordless or near-wordless openers, then variations. Call it invited. | Prediction; challenges |
| 4 | `puzzle` (aha) | A puzzle that breaks the pattern and forces the insight. | Challenge with stakes |
| 5 | `name` | **Name it.** Full-screen card over the frozen scene: what you saw → what it means → its name (one plain sentence) → formula, colour-coded. | Name it last |
| 6 | `puzzle` [D] | **Where the formula comes from.** One interactive derivation per chapter (§6 lists them). Watch-and-drag on Cadet, typed steps on Navigator, assembled steps plus a written reason on Commander. | Formula |
| 7 | `puzzle` [H] | **By hand.** LANTERN's arithmetic switches off per the Maths depth setting; the exam skill is typed step by step. | By hand |
| 8 | `sayit` → `doubt` → `law` → (`procedure`) → `compare` | **The Briefing** (§4): Say it → Doubts → Law → (Procedure) → compare with the model page. | Explain-back |
| 9 | `card` | **Why it matters**: one real AI/CS use, which is also a playable moment in the chapter (§6 "So what"). **When you see ___, think ___.** | Why it matters; cues |
| 10 | `build` (optional, last) | **In code.** One to three Python functions for `lantern.py`; install at a story event. | In code |
| 11 | `cinematic` ≤ 60 s | Story beat out; a Case Board question opens or closes. | — |

At least 70% of chapter time is hands-on. Playtest metric per chapter: time in puzzles, time in console, time in cinematics.

### 3.3 Fast lane (Acts I–II)

A CS student already knows vector addition. Chapters 1–4 open with an optional **Fast lane** mastery puzzle. Solving it at par marks that chapter's See-it warm-ups as optional (still playable, still shown on the chapter list) and jumps to the naming beat. The derivation, by-hand puzzle and Briefing still follow. Nothing is skipped silently.

### 3.4 Session structure

- **First 10 minutes** (Prologue, §6.2): within 60 seconds the player sees the catastrophe as a real matrix moving a full-quality 3D ark; by minute 4 they have flown a burn that lands with weight and sound; minute 10 ends on three concrete questions pinned on the Case Board.
- **A typical session** is one chapter (30–45 min), ending on a story beat and an open question.
- **Act end** (every 2–4 chapters): a combinatorial **set piece** that needs verbs from the current act and at least two earlier acts (from Act III on; Act II uses Act I), then the act's **Review** (four mixed claims, §4.6).
- **The hub** is the *Lantern*'s bridge: a holotable in a dark void. From it: the chapter list (all open), the Case Board, the Field Manual, the Console and library graph, the Sandbox, Viva and Survey runs (§8).
- **Out-of-order play.** Opening any chapter whose prerequisites are not done plays a voiced 20-second **catch-up card**: one picture that re-teaches the prerequisite in literal words (never "recall that") and a one-line story recap. Crew versions fill any missing functions.

### 3.5 The object and verb grammar

Each concept arrives as an object or verb the player can use for the rest of the game. Later puzzles and set pieces combine them.

| Object / verb | On screen | Maths | First chapter |
|---|---|---|---|
| Arrow, BURN | A beam from tail to tip; drag the tip | vector, addition | 1 |
| Dial, STRETCH | A ring on an arrow's shaft | scalar multiple | 1 |
| Beacon | A lamp that lights when something lands on it exactly | target point | 1 |
| Reach glow, SWEEP | Every point the yellow tip has visited glows | span | 2 |
| Mount, PRUNE, LOOP | Bolt or unbolt thrusters; fire all and come back | independence | 3 |
| Dish, AIM, CAST | A sensor whose reading is drawn as a shadow | dot product, projection | 4 |
| RAISE | An arrow grows straight out of two edges | cross product | 5 |
| Box | A slanted crystal from three struts | scalar triple product | 6 |
| Path and Wall, LAY | A glowing line and a glass plane | lines and planes | 7 |
| Fan beams, MEET | Planes whose common points glow | systems | 8 |
| Row board, REDUCE | Rows tied to planes; drag a row onto a row | augmented matrix, row operations | 9 |
| Free dial | A dial on each column without a pivot | free variables | 10 |
| Spire bench, WARP | Drag where the grid arrows land; the lattice follows | matrix, linear transformation | 11 |
| Sequence rail, STACK | Drop matrices on a rail, right to left | matrix product | 12 |
| UNDO | Build the move that returns the ghost | inverse | 13 |
| Unit tile / cube, MEASURE | A frosted square that rides the grid | determinant | 14 |
| Violet glow, PROBE | Every start that lands on the origin glows violet | null space | 15 |
| Survivor counter, COUNT | Kept + flattened = columns | rank, nullity | 16 |
| Second grid, TRANSLATE | A copper dashed grid over the white one | change of basis | 17 |
| Sweep probe, λ dial | A probe sweeps the circle; A − λI flattens | eigenvectors | 18 |
| Repeat rail | Apply n times; re-grid to the eigenvector grid | diagonalisation | 19 |
| Flow board | Bars per station, arrows between | Markov chain | 20 |
| DROP | Drop a perpendicular; its foot glows | projection | 21 |
| SQUARE | Subtract shadows, then scale | Gram–Schmidt | 22 |
| Fit board, twin view | Residual squares; data space beside it | least squares | 23 |
| Surface, DESCEND | A bowl or saddle; a probe rolls | quadratic forms | 24 |
| UNFOLD, LAYER | Turn the input cross; stack rank-one layers | SVD | 25 |
| Cloud, SPREAD | Turn a line through a cloud; two readouts | PCA | 26 |

In-world names label objects only. Once a chapter earns the course term, every maths-register string uses the course term (Appendix C).

---

## 4. The explain-back system: the Briefing

The student proves understanding by making explanations that work. Every part below is checked by **consequence** (a construction satisfies a predicate, a statement survives attack, a procedure runs, a person following your message succeeds) or by **self-check against a model page**. No free text is graded. Nothing blocks. Every claim, law, procedure and message has Show me and Skip.

Bram Haldane will not bolt anything onto his ship that he does not understand. At the end of each chapter you brief him at the holotable. The Briefing has a fixed order, built so the student **generates before recognising**.

### 4.1 Step 1 — Say it (generate first)

- Bram asks the chapter's **check question**, taken from the curriculum node (each node's check question is posed explicitly at least once; §6 lists them).
- The Field Manual page opens with four empty slots, in house order:
  1. **What you see** (one sentence about the arrows, grid or points)
  2. **What it means** (the answer to the check question)
  3. **What it's called**
  4. **When you see ___, think ___**
- Free text first. A voice note is a stretch option (§13). The lowest assist, **Help me start**, offers sentence frames with blanks and a word bank built from the objects in the player's own scene. It is off by default at every level and never auto-opens.
- The page auto-captures a frozen 3D snapshot from the player's best solve, so the page shows their arrows.
- The model page and the key-idea checklist are **not** shown yet (step 5).

### 4.2 Step 2 — Bram's Doubts (counterexample duels by construction)

Bram makes two or three claims per chapter (four in an act Review). Each claim comes from the node's misconception list or its true facts. **Every set mixes true and false claims, in random order**, so the student judges each claim instead of assuming the sceptic is wrong.

For each claim the player chooses:
- **Challenge it** → build a counterexample on the holotable. A predicate checks the construction. Bram: *"Noted. That one's wrong."*
- **Back it** → build a demonstration. **The Shake** then randomises every free quantity in the scene and re-checks.

Objecting to a true claim costs the chapter's Briefing star: the player's "counterexample" is run, it fails the predicate, and Bram shows one sentence on why the claim holds. Backing a false claim fails at the Shake, which freezes on the case that breaks it. Either way the player sees the reason and can try again.

**The Shake** (from the narrative pitch, presented as Bram's hands on the holotable):
- Bram randomises the free quantities of the player's own scene 2 / 5 / 10 times (Cadet / Navigator / Commander), on screen, so the player watches their construction move.
- Navigator adds one curated edge case; Commander adds all of the chapter's curated edge cases: the zero vector, parallel arrows, a singular matrix, a rotation, a repeated eigenvalue, a non-square matrix, a reflection, a negative scalar, as relevant.
- On failure Bram names exactly what broke, in literal words: *"Held for your arrows. Not when I made them parallel."*
- After any successful Shake, the card reads: **"Survived 10 cases. That is evidence, not a proof. The reason:"** followed by the one-line reason (step 3).

Data per claim (all in chapter data, §11.4): `text`, `who`, `isTrue`, `kind: 'existential' | 'universal'`, `freeParams`, `generators`, `edgeCases`, `predicate(scene)`, `reason`, `showMe(actions)`.

### 4.3 Step 3 — Engrave the Law (statement plus property test plus reason)

The player turns their idea into a precise statement using the chapter's **Law frame**: a templated sentence whose slots offer only earned words and plain words (EXACTLY WHEN, ALWAYS, NEVER, OR, ZERO, PERPENDICULAR …). Frames are per chapter, not a general grammar compiler.

Example (Ch 4): `[v · w] is [ZERO / POSITIVE / NEGATIVE] EXACTLY WHEN [the angle is 90° / the angle is under 90° / …] [— / OR one of them is the zero vector]`.

- Each slot option maps to a predicate fragment in TypeScript; the filled frame compiles to one predicate.
- **The Proving Ground** fires 500 cases at it (random plus the chapter's curated edge cases), flickering across the holotable. The first counterexample freezes the world on that case, drawn in full: *"This case breaks your Law: w is the zero vector."*
- A Law that survives is labelled **Survived 500 cases**. It becomes **Proven** only when the player completes the reason step: arrange the chapter's reason line (Cadet: pick the reason card that matches; Navigator: complete it; Commander: write it, then compare with Ilse's line). The game states, every time: *"Surviving cases is not a proof. A reason is."*
- Proven Laws are etched on a plate on the bridge (DOM/CSS2D plate ring around the holotable).

### 4.4 Step 4 — Execute my steps: LANTERN's Procedures and Teach Teo

**LANTERN runs exactly what you wrote.** In the six algorithm chapters (Ch 9 row reduction, Ch 13 inverse by [A | I], Ch 18 eigenvalues and eigenvectors, Ch 20 steady state by repetition, Ch 22 Gram–Schmidt, Ch 26 PCA) the player assembles a **Procedure** from step tiles (FIND PIVOT, SWAP, CLEAR BELOW, NEXT COLUMN, APPLY TO BOTH HALVES, FORM A − λI, FOR EACH, SUBTRACT SHADOW ON EACH EARLIER ARROW, SCALE TO LENGTH 1, CENTRE, KEEP k, …).

- LANTERN then runs the procedure literally on a new case, animating each step in the world.
- Each **key step** (K1–K3, taken from the node's explain-back sentence) that is missing or misplaced is replaced by that node's listed **misconception**, and the misconception fails visibly on the case: *"You told me to subtract the shadow on the first arrow. You did not say what to do about the second."* The third arrow leans.
- Beside the tiles, the procedure appears as **Python** (each tile carries a snippet). Your explanation compiles. With Code help on, it can be opened in the console as the starting point for that chapter's build.
- Two executor families cover all six: a **row machine** (row operations on an augmented matrix, with swap tracking) and a **vector machine** (vector operations, repetition, sorting). Each procedure is data: tiles, reference order, key steps, misconception substitutions, the test case.

**Teach Teo** (spaced retrieval, five callbacks, Acts V–IX). From inside the flattened stern, Teo can receive one short message: step tiles plus up to 40 words of free text, with one holotable scene attached. He follows the tiles literally (the same rule engine); the free text is never graded. His reply shows whether it landed: he braces the right strut, or the wrong one, and asks a sharper question. Each callback re-teaches an idea met 5–15 hours earlier, in a new setting:

| # | When | Old idea | Teo's task | Key ideas (missing → his visible failure) |
|---|---|---|---|---|
| T1 | after Ch 15 | Triple product (Ch 6) | "Are my struts still holding volume?" Node N = (2,1,1); ends A = (3,2,1), B = (2,2,2), C = (3,3,2). | K1 use edge arrows from the node → he uses positions, gets −2, trusts a flat set. K2 cross two, dot with the third. K3 zero means flat. |
| T2 | after Ch 17 | Q − P (Ch 1) and coordinates (Ch 17) | "Send me my position in the Anchor's grid." Teo at ship (4, 3) → Anchor numbers (1, 3). | K1 the arrow from the base to him is position minus base. K2 the matrix with the Anchor's arrows as columns turns Anchor numbers into ship numbers; its inverse goes the other way → he uses P and reports (7, 3). |
| T3 | after Ch 19 | Row operations (Ch 9) | Solve his 3×3 air-mix system by hand. | K1 do it to the whole row, right side included. K2 clear below each pivot, column by column. K3 read from the bottom up. |
| T4 | after Ch 22 | Dot product (Ch 4) | Aim his suit antenna at the *Lantern* using one reading per heading. | K1 reading = shadow length × length. K2 zero means a right angle. K3 make the direction one unit long first → his readings come out scaled. |
| T5 | before the Unfold | Exact zero vs tiny (Ch 13, 15, 25) | "Why can't a flattened thing be undone, and why can you undo me?" He must hold still through 625 readings. | K1 exactly flat: two points land together, no undo. K2 thin: an undo exists and multiplies errors by 1/σ. K3 average readings first → he moves during the readings and the test fails. |

Teo's channel bandwidth grows with each message that lands (his voice is reconstructed from more singular values; §10.1). Skipping a callback leaves his voice noisier until the Unfold; nothing else changes.

### 4.5 Step 5 — Compare with the model page

- Only now does **Ilse's notebook page** for the idea appear beside the player's page (written in the maths register; it is the node's explain-back sentence set as a page, with the formula and the picture).
- A **key-idea checklist** (2–3 items, literal: *"Did you say what happens to area? Did you say what zero means? Did you say what a negative sign means?"*). The player ticks which ideas their own page covers and may revise. On Commander, an optional local keyword matcher may *suggest* ticks; the player confirms. Ticks are never scored by the machine.
- **Then and now.** From Act IV on, the Field Manual shows the player's first page beside its latest revision.

### 4.6 The act Review (four claims, mixed)

At the end of each act, after the set piece, one character makes four claims about the act's ideas: Bram (Acts I–IV), Vell (Acts V–VII), Ilse (Acts VIII–IX). It is the Doubt mechanic with four claims: at least one true and at least one false, built from the act's misconceptions, answered by construction. Objecting to a true claim costs a star; the speaker shows why it holds. Reviews carry story: Vell's Act V claim "anything flattened is gone" is **true** on the two-decimal model, and the player must not object.

### 4.7 The Invertible Matrix constellation (thread T3)

The Case Board has one special thread: thirteen statements about a square matrix that are all the same fact. Stars light as chapters earn them. **Linking two stars requires one construction on one shared example** (the two-decimal model C₂ for the Act V set piece; the player's own matrices later):

det = 0 (Ch 14) · the grid is flattened (Ch 13) · columns dependent (Ch 3) · columns do not reach every point (Ch 2) · a column with no pivot (Ch 9) · reduced row echelon form is not I (Ch 10) · null space contains a non-zero vector (Ch 15) · rank < n (Ch 16) · some b has no solution or many (Ch 8) · no inverse (Ch 13) · scalar triple product of the columns is 0 (Ch 6) · 0 is an eigenvalue (Ch 18) · smallest singular value is 0 (Ch 25).

Eleven stars light in the Act V set piece; the last two light in Ch 18 and Ch 25. When all are linked the student can answer the exam question "why are these all the same statement?" with one picture: space being flattened.

### 4.8 The Broadcast (finale explain-back) and "Down to the arrows"

Before the sleepers wake, the crew records one broadcast explaining how to read the Fold. The player builds it from their own work:

1. **The chain.** Order twelve Field Manual pages from *vector* to *singular value decomposition*. Each link gets one sentence: "this needs that because ___" (free text; Help me start available). *"The determinant needs volume, because a determinant is the volume of the box the columns make."*
2. **Ilse's six questions.** Six replayed Doubts, mixed, answered by construction: *Why does a zero determinant mean no inverse? Why are the eigenvectors of a symmetric matrix at right angles? Why is least squares a projection? Why are the A v_i perpendicular? Why must a transition matrix have eigenvalue 1? Why can't a linear system have exactly two solutions?*
3. **Down to the arrows** (players who built code): the game walks the library graph from `svd` down: `svd → sym_eigen → power_iteration → matvec → lincomb → scale, add`. At each node the player's own docstring is the subtitle and their best holotable replay plays.
4. **Export.** The Field Manual exports as Markdown, HTML and PDF (with snapshots and colour-coded formulas): a linear algebra study guide written by the student. The chain plays back as **your lecture** and exports as one self-contained HTML page.

### 4.9 What adds up to university-level understanding

| Need | Where the game trains it |
|---|---|
| Exam skills | Navigator requires typed intermediate steps on every [H] puzzle; all 12 exam patterns are core puzzles (Appendix B). |
| Where every formula comes from | One [D] puzzle per chapter; required for the Commander "Proved" star. |
| Statements and their conditions | Laws plus the Proving Ground; "survived" vs "proven". |
| Judging claims | Doubts and Reviews mixing true and false claims, answered by construction. |
| Algorithms | Procedures executed literally; the builder thread. |
| Explaining in own words | Field Manual (generate first), Teach Teo, the Broadcast. |
| Recognition | Unlabelled Survey runs (§8.3); the "When you see ___, think ___" list the player writes. |
| Retention | Teach Teo callbacks 5–15 hours later; Viva mode; then-and-now pages. |

---

## 5. The CS-builder thread: `lantern.py`

### 5.1 Premise and promise

The first pulse corrupted LANTERN's maths library. LANTERN runs on old backup routines (the **crew versions**). The navigator is the only person aboard who can program. Over the game the player rewrites the library one short Python function at a time, and the ship visibly runs on it. By the end the student owns about 50 functions (roughly 600 lines of plain Python), each with a docstring in their own words, exported as `lantern.py` plus a Colab notebook.

Rules that keep this honest and never gating:
- **The code step is always last** in a chapter and always optional. Skipping it loses no maths: every maths beat (see it, name it, derive, by hand) comes before it.
- **Code help** is its own setting (Off / Assemble / Fill / Write), independent of Maths depth (§7).
- **Show me** writes the solution line by line (animated), then runs the swarm.
- **Nothing in the world waits for player code.** The world runs the crew version until the player's function passes; then it switches at the next story event.

### 5.2 Language and runtime

- **Real Python 3 via Pyodide**, already in the engine (`game/pyrunner.ts`), self-hosted, **lazy-loaded on first console open** (never on the Prologue's critical path).
- Plain lists and `math` only. No NumPy inside builds (each act's NumPy card shows the library call that does the same job, §5.7).
- Runs in a Web Worker. A call that exceeds 2 s is stopped by terminating the worker and restarting it; the player sees: *"Your function did not finish in 2 seconds. Check your loop's stopping condition."*
- **Errors in plain words tied to the picture**, by mapping common exceptions in `pyrunner`: *"`matvec` returned 3 numbers. The ship moves in 2D, so it needs 2."* *"Line 4 adds `v[0]` to `w[1]`: the green arrow's x to the red arrow's y."*
- An optional 5-minute **Console primer** (lists, functions, loops) is reachable from the console at any time. It is not on the story path.

### 5.3 The three code-help modes

| Mode | What the player does | Distractors |
|---|---|---|
| **Assemble** | Drag 3–8 given lines into order (a Parsons puzzle). | Up to 2 decoy lines, each one a known misconception (e.g. `v[0] + w[1]`, dividing by `length(u)` once). |
| **Fill** | 2–5 blanks in a written function. | — |
| **Write** | Empty body under the signature and a docstring prompt. | — |

### 5.4 The test swarm, Bug mirror and library graph

- **Test swarm.** Run fires 20 / 100 / 300 cases (by Maths depth) onto the holotable as arrows. Passing tips land yellow on target; failing cases flash with a hollow ghost where the answer should be. Failures that share a pattern are grouped (*"all 12 have a negative first component"*). Step through a case: each line highlights and the matching arrow animates.
- **Bug mirror** (F9). Runs a small sandboxed copy of the current world scene on the failing version, so the bug is visible at full scale (half the hull lit from inside, the forecast ghosts mirrored). The real world always keeps the last passing version.
- **Library graph** (DOM/SVG panel). Each function is a node; each call is an edge (`lincomb → scale, add`). Grey = crew version, ring = yours. **Nodes for chapters not yet opened show the chapter's plain question, not the function name**, so no term appears before it is earned.
- **Honesty overlay** (L). Labels every system on screen as **yours**, **LANTERN backup**, or **engine** (shaders, physics integration, rendering).

### 5.5 Functions by chapter, installs and refactor beats

Installs run the player's function **at event time** (a commit, a pulse, a story beat), batched into one worker call, then cached. The result is checked against the crew version within tolerance. On disagreement the world keeps the backup and says so: *"Your matvec disagreed on 3 of 2,000 buoys. Using LANTERN's backup. Open Bug mirror to see them."*

| Ch | Functions (uses) | Install: what in the world runs on it | Refactor beat |
|---|---|---|---|
| 1 | `add(v, w)`, `scale(c, v)`, `length(v)` | Burn planner: the ghost path of chained burns | — |
| 2 | `lincomb(cs, vs)` (scale, add); `reachable(v, w, target)` brute force over dials −10..10 in steps of 0.1 (40,401 tries) | Reach planner marks reachable beacons; the swarm shows it failing on a target needing a = 13.7 ("to be replaced") | seeded |
| 3 | `find_loop(vs)` brute force over integer dials −5..5 | Thruster audit flags a wasted mount | seeded |
| 4 | `dot`, `length` rewritten as `sqrt(dot(v, v))`, `angle`, `shadow(v, u)` | Beacon matcher ranks 200 signatures by cosine similarity | `length` via `dot` |
| 5 | `cross`, `normal(a, b, c)`, `area(a, b, c)` | Hull lighting: the *Meridian*'s 18,000 hull triangles are lit from your normals and `dot`, baked once at install | — |
| 6 | `triple(a, b, c)`, `coplanar(p, q, r, s)` | Strut scan of 5,000 hull nodes flags flat boxes (Section C appears) | — |
| 7 | `ray_plane(p, d, n, k)` (returns t or None), `dist_to_plane` | Click-picking on the hangar door places the docking marker | — |
| 8 | `check(rows, x)`: how far off each equation is (row view; column view on Write) | LANTERN verifies a guessed pod position | — |
| 9 | `row_echelon(M)` (swap, scale, add-multiple), `back_sub(M)` | Power routing: generators light from your solution | — |
| 10 | `rref(M)`, `solve(M)` → `{kind: none/one/many, point, directions}` | Flow routing; **`reachable` replaced by `solve`**: the a = 13.7 target now passes | `reachable` → `solve` |
| 11 | `matvec(A, x)` (column view via `lincomb`; row view via `dot` on Write) | Pulse forecast: ghosts for 2,000 buoys; the next pulse lands on them | — |
| 12 | `matmul(A, B)` (calls `matvec` per column), `transpose(A)` | Forecast fuses chained moves into one matrix | `matmul` via `matvec` |
| 13 | `identity(n)`, `inverse(A)` (rref on [A \| I]; None when a pivot is missing) | Undo planner for the bow frames | — |
| 14 | `det(A)` by elimination (pivots, sign per swap); `det3` by formula, for checking | **The Collapse forecast runs on your `det`** | — |
| 15 | `null_space(A)` (free columns of rref), `col_space(A)` (original pivot columns) | Debris sorter groups pieces that landed together; **`find_loop` replaced by `null_space`** | `find_loop` → `null_space` |
| 16 | `rank(A)`, `basis_for_span(vs)` | Survey scanner reports kept and flattened directions | — |
| 17 | `to_coords(B, x)` (solve), `from_coords(B, c)` (matvec), `in_grid(P, A)` | Spire translator: converts ship-grid moves into the Anchor's grid (used in Acts VI and IX) | — |
| 18 | `eig2(A)` (trace and determinant; complex roots returned as stretch and angle), `power_iteration(A, x, steps)` | Line finder for pulses | — |
| 19 | `mat_pow(A, k)` (repeated squaring), `diagonalise2(A)` | Vell's fifty-pulse forecast runs on your code | — |
| 20 | `steady_state(P)` (power iteration, rescale to sum 1) | Drone allocation | — |
| 21 | `project(A, b)` (transpose, matmul, solve) | Tether planner finds the closest reachable point | — |
| 22 | `gram_schmidt(vs)`, `qr(A)` | **The Drift fix**: LANTERN's attitude frame is re-squared at each chapter start | — |
| 23 | `least_squares(A, b)` (normal equations; QR on Write) | The Collapse fit and the residual plot run on your code: the knock appears in your own residuals | — |
| 24 | `quad_form(S, x)`, `sym_eigen(S)` (power iteration plus deflation) | Hull brace planner along principal stress axes | — |
| 25 | `svd(A)` (sym_eigen on AᵀA, then u_i = A v_i / σ_i), `low_rank(A, k)` (sum of rank-one layers) | *Show more decimals* runs your `svd` on the fitted pulse; Teo's voice is rebuilt by your `low_rank` | `svd` built on `sym_eigen` |
| 26 | `covariance(X)`, `pca(X, k)` | The record transmission is projected by your `pca` | — |
| Epilogue (stretch) | `relu(v)`, `dense(W, b, x)` (matvec, add) | The optional layer puzzle (§6, Epilogue) | — |

### 5.6 Crew versions and fallbacks

- Every function has a crew version implemented in TypeScript (the maths library, `math/la.ts`, `math/rref.ts`, `math/frac.ts`). The world always works.
- A player function replaces the crew version only after it passes the chapter swarm and the install-time comparison.
- Opening Ch 20 with no `power_iteration` written: the world uses the crew version; the library graph shows a grey node labelled with Ch 18's plain question.
- Saving: player code lives in the save (`code` map). Export and import work through a file if storage is blocked.

### 5.7 NumPy cards and export

- One card per act (9) at the act's end: the NumPy call that answers the act's question (`np.linalg.solve`, `np.linalg.det`, `np.linalg.matrix_rank`, `np.linalg.eig`, `np.linalg.lstsq`, `np.linalg.qr`, `np.linalg.svd`, …), what it does differently (compiled code, partial pivoting, LAPACK), and one line comparing it with the player's own function.
- **Export:** `lantern.py` (player functions with their docstrings), `test_lantern.py` (the swarm cases as asserts), and one Colab notebook that imports them, runs the tests and shows the nine NumPy cards side by side with the player's versions.
- **Docstrings in your own words.** After a function passes, the editor opens its docstring: *"What question does this function answer, and why does the code work? Write it the way you would tell Bram."* Then Ilse's original note for the same routine appears (text; voiced for the nine act-end functions) and a 2–3 item checklist appears for self-ticking. Never graded.

---

## 6. Chapter by chapter

### 6.0 How to read the chapter cards

- Puzzle ids are `cNN-pM` (Prologue `c00`, Epilogue `c27`). Tags: **[F]** Fast lane mastery opener, **[D]** where the formula comes from, **[H]** by hand (typed steps at Navigator and Commander), **[Xn]** covers exam pattern n (curriculum §6, Appendix B), **[S]** stretch (one per chapter, optional at every level), **[SP]** act set piece (referenced as SP-I … SP-IX by act).
- Every win is a **world state or a construction**. A classification appears only as a Call it prediction before a construction.
- Numbers are fixed story data unless marked "seeded" (drawn from the chapter's generator; ranges per difficulty, §7).
- **Name it** lists the puzzle after which each term is earned. Terms in Appendix C may not appear in any player-facing string before that beat.
- **Briefing** lists: the check question (Say it), the two Doubts (T = true claim, F = false claim; shown in random order), the Law frame, and any Procedure or Teo callback.
- **So what** is the chapter's real AI/CS use as something the player does or installs.
- **Difficulty deltas** list only what this chapter changes beyond the general rules in §7.

### 6.1 Summary table

| Ch | Act | Plain question (chapter title) | Nodes | Plot beat | Signature mechanic | Build |
|---|---|---|---|---|---|---|
| 0 | Prologue | Where did everything go? | (N12 seen) | First pulse; first burn | Seed the lattice; burn arrow | — |
| 1 | I Drift | Where is the beacon from here? | N01, N02 | Two thrusters lost | Burn arrows tip to tail; dials | add, scale, length |
| 2 | I | What can two thrusters reach? | N03 | First height; signal off the plane | Reach glow; gimbals unlock into 3D | lincomb, reachable |
| 3 | I | Is one of these thrusters wasted? | N04 | Third mount; ark in view | Mount, prune, loop | find_loop |
| 4 | II Signal | How much do two arrows point the same way? | N05 | Find the beacon | Dish shadow meter | dot, length, angle, shadow |
| 5 | II | Which way is straight out of this panel? | N06 | Match the tumble; light the hull | RAISE between two edges | cross, normal, area |
| 6 | II | Is the hull still holding volume? | N07 | Section C is flat | Strut box | triple, coplanar |
| 7 | II | Where does our path meet the door? | N08 | Docking | Path bead and glass wall | ray_plane, dist_to_plane |
| 8 | III Ledger | Where do the three planes meet? | N09 | Locate Teo's pod | Fan-beam planes; twin view | check |
| 9 | III | How do we untangle the equations without changing the answer? | N10 | Power board | Row board tied to planes | row_echelon, back_sub |
| 10 | III | What if there is no single answer? | N11 | Flows; the empty pod | Free dial | rref, solve |
| 11 | IV Pulse | What did the pulse do to the grid? | N12, N13 | Read the pulse; the spire clue | Spire bench | matvec |
| 12 | IV | What do two moves in a row do? | N14 | Pulse then stabiliser | Sequence rail | matmul, transpose |
| 13 | IV | How do we undo a move? | N15 | Square the bow frames | Undo bench | identity, inverse |
| 14 | IV | Why is the ark getting smaller? | N16 | The Collapse | Unit tile and cube | det |
| 15 | V Collapse | Where can anything land, and what went to zero? | N17 | Debris at the origin; Vell | Violet probe | null_space, col_space |
| 16 | V | How many directions survived? | N18 | Vell's review | Survivor counter; four rooms | rank, basis_for_span |
| 17 | VI Wrong Grid | Same point, different grid: what are its numbers now? | N19 | Ilse is alive; spires set right | Copper second grid; three-slot rail | to_coords, from_coords, in_grid |
| 18 | VII Lines | Which lines does the pulse not turn? | N20 | Vell's plan | Sweep and λ dial | eig2, power_iteration |
| 19 | VII | Where will everything be after fifty pulses? | N21 | Forecasts | Repeat rail; re-grid | mat_pow, diagonalise2 |
| 20 | VII | Where do the drones settle? | N22 | Vell stands down; Ilse aboard | Flow board | steady_state |
| 21 | VIII Shadows | What is the closest point we can reach? | N23 | The hatch from day one | DROP | project |
| 22 | VIII | Can we build a square grid from a skewed one? | N24 | The Drift | SQUARE | gram_schmidt, qr |
| 23 | VIII | What is the best answer when the readings disagree? | N25 | The Residual: Teo is alive | Fit board and twin view | least_squares |
| 24 | IX Singular | Which moves only stretch along perpendicular axes? | N26 | Brace the stern; the Flip | Bowl and saddle surface | quad_form, sym_eigen |
| 25 | IX | What does any matrix do to a circle? | N27 | Thin, not gone; the Unfold | UNFOLD and LAYER | svd, low_rank |
| 26 | IX | What should we keep? | N28 | The Anchor's record | Cloud with two readouts | covariance, pca |
| 27 | Epilogue | Every point stays where it is | (identity; AI bridge) | Quiet the Fold | Spire bench, final | relu, dense (stretch) |

---

### 6.2 Prologue · "Where did everything go?" (about 10 minutes)

**In short.** Something moved every point at once. Lines stayed straight, even spacing stayed even, and one point did not move at all.

**Beats (the hook).**
- **0:00–1:00 Cold open** (cinematic, full quality, 3D). Ilse's recording from three years ago: the *Meridian* in nebula light; a pulse front sweeps across it; every box frame of the hull leans the same way. The motion is the routine pulse T₃ applied to the real hull vertices, animated as P R(θ) P⁻¹ for θ from 0 to 90° so area is constant at every frame (§11.3). Ilse reads the nine numbers (TT2). Title card: **SINGULAR**.
- **1:00–2:30 Arrival.** The *Lantern* drops out of transit 40 km from the Anchor. Wren, Bram, LANTERN (≤ 8 lines). The player presses Space to **seed the lattice**: 4,000 light buoys bloom outward into a square grid with a rising shimmer. Reference buoys: three in a white line at (−1, 1), (0, 2), (1, 3); four cyan at (2, 0), (3, 0), (4, 0), (5, 0).
- **c00-p1 First burn** (wordless). The nearest beacon is 3 across and 2 up. Drag one green arrow from the ship. **Win:** Space commits; the ship stops within 0.05 of (3, 2); thrust, camera follow, settle, the beacon ignites.
- **The pulse.** LANTERN: *"Pulse detected. Brace."* The shockwave front passes; every buoy slides (T, animated honestly); the *Lantern* is knocked; thrusters three and four go dark.
- **c00-p2 Call it, then check.** Before the next scan, optional: drop ghosts where you think the white buoys went. **Win (construction):** lay the line tool through the three landed white buoys, now at (−3, −2), (−4, −2), (−5, −2) (within 0.05 of all three); then lay the cyan step arrow tip to tail along the four cyan buoys, now at (2, 2), (3, 3), (4, 4), (5, 5): one step (1, 1) fits every gap.
- **c00-p3 What did not move?** Toggle the before and after lattices. **Win:** place the marker on the one point that is where it was. A faint light is on there. LANTERN: *"One point did not move: the point under the Anchor. There is a light there. Setting the origin of our grid at that point."*
- **Close.** The Case Board pins three questions (§2.3). Wren: *"Two thrusters gone, an ark we cannot see, and a rule we do not know. Nav, get us to the next beacon."*

Nothing is named. Music: drone plus two voices (the flat lattice).

---

### 6.3 Act I · Drift (vectors, combinations, reach, waste)

Visual: the debris field in nebula light, the flat lattice, top-down orthographic camera until c02-p6, then 3D for the rest of the game.

#### Ch 1 · "Where is the beacon from here?" — N01, N02

**In short.** How do I tell the ship where to go? Give it an arrow: so far across, so far up. Doing one arrow after another lands where the tip-to-tail chain ends, in either order.

**Plot beat.** The pulse knocked the *Lantern* off course and its autopilot is half-dead. Reach the next beacons and line up for the ark's signal.

**Signature mechanic.** Burn arrows chain tip to tail; the ship flies the chain on commit. Dials stretch or flip an arrow.

**Puzzles.**
1. `c01-p1` [F] *Two thrusters, whole pulses.* Thrusters push along v = (2, 1) and w = (1, 2), whole numbers of pulses each. Reach (7, 8). **Win:** beacon lit in one commit (2 of v, 3 of w). Fast lane: solving at par marks p2–p3 optional.
2. `c01-p2` *Around the debris.* The autopilot has already fired burn 1 = (4, −1). Plot burn 2. **Win:** land on (3, 2) with (−1, 3); then replay with the burns swapped and land on the same point. The two routes outline a parallelogram with the yellow arrow as its diagonal.
3. `c01-p3` *One thruster, any amount.* The working thruster pushes along (2, 1). **Win:** light beacons at (6, 3) and (−4, −2) with one burn each (dial 3, dial −2); then place the third beacon's marker at (3, 2) on the "out of reach" pad after sweeping the dial fully, which draws the whole line the thruster can reach.
4. `c01-p4` [H] *From P to Q.* The ship is at P = (1, 4), the dock at Q = (6, 1). **Win:** the burn lands, with the typed arrow Q − P = (5, −3) and its length √34 ≈ 5.83 set on the tether before commit (Navigator); then drop marker buoys at the midpoint (3.5, 2.5) and at a quarter of the way, P + 0.25(Q − P) = (2.25, 3.25).
5. `c01-p5` *Three knocks.* Three pulses knocked the ship by (2, 5), (−3, 1), (4, −2). **Win:** one burn home from (3, 4): the arrow (−3, −4). Call it: how far is home? (5.)
6. `c01-p6` [D] *Where length comes from.* The arrow (3, 4) with its right triangle; then a holotable inset of (2, 3, 6): drag the floor diagonal (length √13), then the vertical. **Win:** tether set to 7 = √(13 + 36). Pythagoras twice.
7. `c01-p7` [S] Whole pulses only: show that (1, 1) cannot be reached with whole numbers of v and w, and reach it with thirds on the free dial.

**Aha.** An arrow is a move, not a place. The same arrow from anywhere is the same move. Adding arrows adds moves, in either order. Stretching keeps the arrow on its line; a negative amount flips it.

**Name it.** After p2: **vector** — "An arrow that says how far to move in each direction"; **vector addition**. After p3: **scalar**, **scalar multiple**, **parallel**. After p5: **length**. Formulas: Q − P; v + w = (v₁ + w₁, v₂ + w₂); cv = (cv₁, cv₂); ‖v‖ = √(v₁² + v₂²).

**Briefing.** Check question: *Why is the arrow from P to Q equal to Q minus P?* Doubts: (F) Bram: "East then north lands somewhere different from north then east." (T) "A negative amount flips the arrow but keeps it on the same line." Law frame: `Doing v then w lands [AT THE SAME POINT AS / AT A DIFFERENT POINT FROM] doing w then v [ALWAYS / ONLY WHEN …]`; reason: each direction adds on its own, and v₁ + w₁ = w₁ + v₁.

**So what.** The burn planner (install) is `position += velocity * dt`, the update inside every game loop. Card: a 28 × 28 image is one arrow with 784 parts.

**Build.** `add`, `scale`, `length` → burn planner ghost path. Assemble decoy: `v[0] + w[1]`.

**Difficulty deltas.** Cadet: whole-number snap, live landing preview, components drawn. Navigator: halves; preview after Call it; Q − P and length typed. Commander: free placement, blind commit, exact √34 typed.

**Cue.** When you see "from here to there", think *end minus start*.

#### Ch 2 · "What can two thrusters reach?" — N03

**In short.** Which points can two thrusters reach? Every point you get by stretching each thrust arrow by any amount, forward or back, and adding. Two arrows that point different ways reach a whole plane; two on one line reach only that line.

**Plot beat.** Only two thrusters work. The ark's signal is somewhere ahead. At the end of the chapter Bram unlocks the gimbals and the world gets height.

**Signature mechanic.** The **reach glow**: two dials set a and b in a·v + b·w; every point the yellow tip visits glows, so the reachable set paints itself in.

**Puzzles.**
1. `c02-p1` [F] *Every k that breaks it.* v = (1, 2), w = (2, k). **Win:** drag k until the glow collapses to a line, then place a beacon the pair cannot reach. Only k = 4 works. [X1]
2. `c02-p2` v = (2, 1) green, w = (1, 3) red. **Win:** land on (5, 5) (2 and 1).
3. `c02-p3` **Win:** land on (0, 5) (−1 and 2). The first negative dial; the game never says in advance that dials can go negative.
4. `c02-p4` [H] [X2] *Is it reachable?* Is (4, 7) a mix of v and w? **Win:** the ship lands on (4, 7) with dials typed after solving 2a + b = 4, a + 3b = 7 by substitution (a = 1, b = 2).
5. `c02-p5` *The backup thruster.* The red thruster fails over to its backup, which pushes along (−4, −2). **Win:** the glow collapses onto the line through (2, 1); place a target off that line; the game draws the gap from the nearest glowing point.
6. `c02-p6` [D] *Why the glow is flat, and first height.* Pick two reachable points; drag a third along the line through them: its dials update and it stays reachable. Then Bram unlocks the gimbals: the real thrusters push along (1, 0, 1) and (0, 1, 1). **The camera leaves top-down for the first time** and the music gains its third voice. **Win:** light the beacon at (2, 3, 5) (2 and 3); then turn the camera edge-on to the glowing plane so the ark's signal at (1, 1, 0) is visibly off it. Every reachable point is (a, b, a + b).
7. `c02-p7` [S] RGB: reach a target colour as a mix of the holotable's three light arrows; then with two arrows show a colour off their plane.

**Aha.** Two arrows that point different ways reach a whole plane. Two arrows on one line reach only that line. The reachable set is always flat and always contains the origin.

**Name it.** After p3: **linear combination** — "Stretch each arrow by some amount and add them"; **weight**. After p5: **span** — "Every point you can reach by stretching v and w and adding them together." Formula: span{v, w} = {a v + b w : a, b any numbers}.

**Briefing.** Check question: *Can two vectors in 3D ever span all of 3D space? Why not?* Doubts: (F) "Make both thrusters twice as strong and we'll reach new places." (T) "Point one thruster backwards and we reach exactly the same places." Law frame: `The span of v and w is [THE WHOLE PLANE / A LINE / A POINT] EXACTLY WHEN [v and w are NOT on one line / …]`; the Proving Ground catches the version that forgets the zero vector.

**So what.** Card and install: a linear model's predictions always lie in the span of its feature columns; the reach planner marks reachable beacons.

**Build.** `lincomb(cs, vs)` (scale, add); `reachable(v, w, target)` as a brute-force dial search (seeds the Ch 10 refactor).

**Difficulty deltas.** Commander: p1 asks for every k in symbols before dragging; p4 typed with fractions.

**Cue.** When you see "can I make this from these?", think *span*.

**Act beat.** The signal sits off the plane. Wren: *"So we can see him and we can't get to him."*

#### Ch 3 · "Is one of these thrusters wasted?" — N04

**In short.** Is one of these thrusters wasted? It is wasted when the others can already reach its tip. Then some firing of all of them, not all zero, brings the ship back where it started.

**Plot beat.** Bram bolts a spare third thruster on to escape the plane. The first mount adds nothing.

**Signature mechanic.** **Mount** and **prune** thrusters; **loop**: fire every thruster and come back to the start.

**Puzzles.**
1. `c03-p1` [F] *Fire all, go nowhere.* u = (1, 0, 2), v = (0, 1, 1), w = (2, 3, 7). **Win:** dials not all zero that return the ship to its start: 2u + 3v − w. [X3]
2. `c03-p2` *Why can't we reach it?* With (1, 0, 1), (0, 1, 1) and the spare mounted along (1, 2, 3), the signal (1, 1, 0) is still out of reach. **Win:** build the spare's arrow from the first two: 1 and 2.
3. `c03-p3` *Pick a mount.* Bolt points (2, −1, 1), (1, 1, 1), (0, 0, 2). **Win:** reach (1, 1, 0) with total fuel ≤ 3: mount (0, 0, 2), dials 1, 1, −1. ((1, 1, 1) needs −1, −1, 2, fuel 4. (2, −1, 1) lies in the old plane and reaches nothing new.)
4. `c03-p4` *Prune.* Arrows (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1). **Win:** unbolt one while the glow stays all of space (any of the first three; (0, 0, 1) cannot go).
5. `c03-p5` [D] *Why four arrows in 3D always loop.* Bram picks four random arrows (Shake). **Win:** reach the fourth arrow's tip with the first three (LANTERN guides the dials on Cadet); the game closes the loop. If the first three point in three independent directions they reach every point, so the fourth is reachable; if they do not, they already have a loop, and dial 0 on the fourth makes it a loop of all four.
6. `c03-p6` [S] Try to place three arrows in the plane with no loop; the game finds a loop every time.

**Aha.** An arrow is wasted when the others already reach its tip. That is the same as a loop with dials not all zero.

**Name it.** After p1: **linearly dependent**, **linearly independent** — "A set of arrows is independent when none of them can be built from the rest"; **trivial combination**. Formula: c₁v₁ + … + cₖvₖ = 0 only when every c is 0.

**Briefing.** Check question: *Why must four vectors in 3D be dependent?* Doubts: (F) "No two of these three lie on one line, so all three must be useful." (T) "Any set with the zero arrow in it has a loop." Law frame: `Arrows are DEPENDENT EXACTLY WHEN [some dials, NOT ALL ZERO, / two of them are PARALLEL] bring the ship back to the start`.

**So what.** The thruster audit (install) is the redundant-feature check every regression needs: dependent columns make the weights non-unique.

**Build.** `find_loop(vs)` brute force (seeds the Ch 15 refactor).

**[SP] Act I set piece · Lift.** Mounts v = (1, 0, 1), w = (0, 1, 1), u = (0, 0, 2) and a fourth spare (2, −1, 1). **Win:** reach the ark's approach point (4, −1, 6) with fuel ≤ 6.5 (4, −1, 1.5), declining the spare, which adds no direction. The *Lantern* lifts out of the plane and the *Meridian* comes into view: 1.2 km, every box frame along its hull leaning the same way.

**Act I Review (Bram).** "Three arrows always reach more than two." (F) · "If you can reach a point, there is only one way to reach it." (F: show two firings to one crate when an arrow is wasted) · "Two arrows that are not on one line reach every point of a flat deck." (T) · "An arrow of length zero can belong to an independent set." (F).

**NumPy card I.** `np.linalg.matrix_rank` and `np.linalg.solve` for the reach question.

**Difficulty deltas.** Cadet: LANTERN draws the plane any two arrows reach; loop dials snap to whole numbers. Navigator: dials in halves; p1 solved by substitution with typed steps. Commander: p5 with fractional arrows; the loop typed exactly.

**Cue.** When you can remove something and lose nothing, think *dependent*.

---

### 6.4 Act II · Signal (measuring space)

Visual: the *Meridian*'s exterior, box frames, the triangular hangar door, the star's low light.

#### Ch 4 · "How much do two arrows point the same way?" — N05

**In short.** How much does one arrow point along another? Multiply matching parts and add. The number is the length of one arrow's shadow on the other, times that other arrow's length. It is zero exactly at a right angle.

**Plot beat.** The ark's beacon is faint and buried among decoys. The dish reading grows as the dish lines up with a signal.

**Signature mechanic.** The **dish meter**: light falls at a right angle onto the signal's line and the dish arrow's shadow is drawn there; the reading is shadow × length. A clear chime sounds when two arrows are perpendicular.

**Puzzles.**
1. `c04-p1` [F][D] *Read the pattern.* Against the signal (2, 4), the dish arrow (1, 0) reads 2 and (0, 1) reads 4. Call it: (3, 1)? **Win:** build (3, 1) as 3 of the first plus 1 of the second and watch the reading equal 3·2 + 1·4 = 10. This is where v₁w₁ + v₂w₂ comes from.
2. `c04-p2` *The silent direction.* **Win:** a whole-number dish arrow that reads exactly 0 against (2, 4): (2, −1) or any multiple.
3. `c04-p3` [D] *The law of cosines.* Draw v, w and v − w as a triangle. Drag freely: two readouts, v₁w₁ + v₂w₂ and ‖v‖‖w‖cos θ, stay equal. **Win:** complete the expansion ‖v − w‖² = ‖v‖² + ‖w‖² − 2 v·w and match it with the law of cosines term by term (Cadet watches and drags one term; Navigator types; Commander orders the steps and writes the last line).
4. `c04-p4` *Turn to the ark.* Heading (1, 1, 0), the ark's spine (1, 0, 1). **Win:** turn the *Lantern* through 60° within 1° (cos θ = 1/(√2·√2) = 1/2).
5. `c04-p5` *Which one is the ark?* (cosine similarity) Target signature t = (3, 4); candidates a = (6, 8), b = (4, 3), c = (0, 20). Raw readings 50, 24, 80 favour c. **Win:** drop the "divide by both lengths" step onto the meter and lock the ark's beacon: a (1.00), not b (0.96) or c (0.80).
6. `c04-p6` [H] *Cast the shadow.* v = (3, 4) onto the line through u = (2, 1). **Win:** mark the shadow's tip (4, 2) from typed v·u = 10, u·u = 5, scale 2; the gap (−1, 2) reads 0 against u. Trap: dividing by ‖u‖ only once overshoots and is drawn.
7. `c04-p7` [S] *Hidden bearing.* Readings along the three axis arrows are 3, −1, 2: plot the signal (3, −1, 2). Then show that a shadow is never longer than its arrow, |v·w| ≤ ‖v‖‖w‖ (Cauchy–Schwarz), on Bram's Shake.

**Aha.** Big and positive: the arrows point the same way. Zero: a right angle. Negative: they point apart.

**Name it.** After p2: **dot product** — "Multiply matching parts and add; it measures how much two arrows point the same way"; **orthogonal**. After p3: **angle between vectors**. After p6: **projection onto a line**, **unit vector**, **component along**; length is also called the **norm** (named once). Formulas: v·w = v₁w₁ + v₂w₂ + v₃w₃ = ‖v‖‖w‖cos θ; proj_u v = (v·u / u·u) u.

**Briefing.** Check question: *Why does v · w change sign at 90°?* Doubts: (F) "A reading of zero means the signal's gone." (T) "Turn both arrows together and the reading does not change." Law frame: `v · w is [ZERO / POSITIVE / NEGATIVE] EXACTLY WHEN [the angle is 90° / under 90° / over 90°] [— / OR one of them is the zero vector]`.

**So what.** p5 is cosine similarity, the ranking inside search engines and embedding models; the beacon matcher install ranks 200 signatures with your `dot`.

**Build.** `dot`, `length` (refactored onto `dot`), `angle`, `shadow` → beacon matcher.

**Difficulty deltas.** Cadet: angle readout shown; the shadow drawn live. Navigator: v·w and u·u typed before the shadow appears. Commander: no angle readout; p3 assembled from step tiles; cosines typed as fractions.

**Cue.** When you see "how aligned", "angle" or "perpendicular", think *dot product*.

#### Ch 5 · "Which way is straight out of this panel?" — N06

**In short.** Which way is straight out of a panel, and how big is it? One arrow is at a right angle to both edges and as long as the panel's area. Swap the edges and it points the other way.

**Plot beat.** The ark tumbles. To match it the *Lantern* needs a turning axis at a right angle to both its heading and the target direction. Half the ark's hull renders dark.

**Signature mechanic.** **RAISE**: two edge arrows shade a parallelogram; a third arrow grows out of it while two dish meters (Ch 4) show its reading against each edge.

**Puzzles.**
1. `c05-p1` [D] *Find the axis.* Edges v = (2, 0, 0), w = (1, 3, 0). **Win:** an arrow with both meters at 0 and length equal to the shaded area: (0, 0, 6).
2. `c05-p2` *Which order?* Spinning about w × v = (0, 0, −6) turns the ship the wrong way. **Win:** choose the order that turns the heading onto the target; the right-hand rule appears on the compass.
3. `c05-p3` [D] *Where the formula comes from.* Edges a = (1, 2, 0), b = (0, 1, 3). Solve n·a = 0, n·b = 0: a whole line of answers. **Win:** pick the one whose parts follow the 2 × 2 pattern, (6, −3, 1), and confirm both dot products are 0; its squared length is ‖a‖²‖b‖² − (a·b)² = 50 − 4 = 46, so the area is √46 ≈ 6.78.
4. `c05-p4` [H] [X4] *The hangar door.* Corners P = (1, 0, 0), Q = (0, 2, 0), R = (0, 0, 3). **Win:** set the door's normal (Q − P) × (R − P) = (6, 3, 2) (typed) and its area 7/2 = 3.5 on the patch order.
5. `c05-p5` *The inside-out hull.* 9,000 of the ark's 18,000 hull triangles list their corners in the wrong order, so their normals point inward and render dark. **Win:** fix the corner-order rule until every normal has a positive reading against the centre-to-triangle arrow; the whole hull lights.
6. `c05-p6` *No axis.* Struts (2, 4, 6) and (1, 2, 3). **Win:** shrink the angle between them to 0 on the holotable and watch the raised arrow vanish: zero area, so the cross product is (0, 0, 0).
7. `c05-p7` [S] In 2D the number v₁w₂ − v₂w₁ is the signed area: use its sign to say whether a path turns left or right at three waypoints (the convex hull test).

**Aha.** One arrow carries two facts: its direction is straight out of the panel and its length is the panel's area.

**Name it.** After p2: **cross product** — "An arrow at a right angle to both, as long as the parallelogram's area"; **right-hand rule**; **normal vector**. Formula next to p3's picture: v × w = (v₂w₃ − v₃w₂, v₃w₁ − v₁w₃, v₁w₂ − v₂w₁); triangle area = ½‖v × w‖.

**Briefing.** Check question: *Why is v × v = 0?* Doubts: (F) "v × w and w × v are the same arrow." (T) "Double one edge and the cross product's length doubles." Law frame: `a × b is PERPENDICULAR to [a / b / a AND b], and its LENGTH is [the AREA they enclose / the product of their lengths]`.

**So what.** p5 and the install: surface normals light every 3D mesh; your `normal` and `dot` light the *Meridian*'s hull.

**Build.** `cross`, `normal`, `area` → hull lighting baked at install. Bug mirror shows the inside-out hull when the order is wrong.

**Difficulty deltas.** Cadet: both meters read live while dragging. Navigator: the cross product typed before RAISE commits. Commander: p3 solved from the two equations with typed steps; the order in p2 chosen before the turn plays.

**Cue.** When you need a direction at a right angle to two others, or an area in 3D, think *cross product*.

#### Ch 6 · "Is the hull still holding volume?" — N07

**In short.** How much space do three struts enclose? Base area times height. Zero means the three struts lie flat in one plane.

**Plot beat.** The hull is a frame of boxes, each held open by three struts from one node. The pulses are squeezing them.

**Signature mechanic.** The **strut box**: three arrows build a slanted crystal; base area (cross product) and height (shadow on the normal) are drawn; volume shows live.

**Puzzles.**
1. `c06-p1` *Slide the top.* Struts (2, 0, 0), (0, 3, 0), (0, 0, 4); Call it the volume (24). Lean them to (2, 0, 0), (1, 3, 0), (1, 1, 4). **Win:** move the third strut's tip to three different points of the plane z = 4 and keep 24 each time.
2. `c06-p2` [D] *Base times height.* **Win:** assemble volume = ‖v × w‖ × (height of u along the unit normal) = u·(v × w); the animation lays each factor on the box.
3. `c06-p3` [X4] *Section C.* Struts a = (2, 1, 0), b = (0, 1, 2), c = (1, 1, 1). a × b = (2, −4, 2) and (a × b)·c = 0: flat. **Win:** brace it by setting k in c = (1, 1, k) so the volume is 6: k = 4.
4. `c06-p4` [H] [X4] *Will the clamps latch?* Clamps P = (1, 0, 0), Q = (2, 1, 0), R = (1, 1, 1), S = (2, 2, 1). **Win:** certify they lie on one plane using the edge arrows from P: (1, 1, 0), (0, 1, 1), (1, 2, 1) enclose 0. The trap is drawn first: using the position vectors directly gives −1 and the wrong verdict. Then S is bent to (2, 2, 3): fill the tetrahedron PQRS with light; its volume reads 2/6 = 1/3 (typed at Navigator).
5. `c06-p5` *Inside out.* One box logs −24. **Win:** find the two struts logged in swapped order and swap them back; the crystal's inside and outside faces trade places.
6. `c06-p6` [H] [X4] *The sensor housing.* A tetrahedron on the edges (2, 0, 0), (0, 3, 0), (1, 1, 4). **Win:** fill one of the six tetrahedra the box splits into; the readout is 24/6 = 4.
7. `c06-p7` [S] Cyclic order: show u·(v × w) = v·(w × u) on Bram's Shake.

**Aha.** Volume 0 means the three arrows lie in one plane, which is the same as one arrow being built from the other two (Ch 3).

**Name it.** After p3: **scalar triple product** — "The volume of the box three arrows make, with a sign for which way round they are"; **coplanar**; **parallelepiped**. After p5: **orientation**, **signed volume**. Formula: u·(v × w); tetrahedron = |u·(v × w)| / 6.

**Briefing.** Check question: *Why does a zero triple product mean one arrow is a combination of the other two?* Doubts: (F) "Lean the third strut over and you lose volume." (T) "Swapping two struts flips the sign of the volume." Law frame: `Three arrows are COPLANAR EXACTLY WHEN [u · (v × w) is ZERO / two of them are PARALLEL]`.

**So what.** The strut scan (install) runs your `triple` on 5,000 hull nodes and flags flat boxes. Section C lights up as flat. Orientation tests like this sit inside every mesh and physics engine.

**Build.** `triple`, `coplanar` → strut scan.

**Difficulty deltas.** Cadet: base area and height shown as numbers on the box. Navigator: the triple product typed as a 3 × 3 determinant. Commander: k found symbolically; the coplanarity verdict committed before the box is drawn.

**Cue.** When asked "do these four points lie on one plane?", think *scalar triple product of edge arrows*.

#### Ch 7 · "Where does our path meet the door?" — N08

**In short.** How do I describe a straight path or a flat wall with numbers? A path is a point plus any multiple of a direction. A wall is every point whose arrow from a fixed point is at a right angle to one arrow sticking out of it.

**Plot beat.** Debris streams travel in straight lines. The ark's hangar door is the triangle from Ch 5. Dock.

**Signature mechanic.** A **path bead** slides along a line as you drag t; a **glass wall** with its normal arrow; the bead glows where it meets the wall.

**Puzzles.**
1. `c07-p1` *Same place, same time?* Your path t(1, 1, 0); debris (4, 0, 0) + s(−1, 1, 0), both in minutes. They cross at (2, 2, 0) when t = s = 2. **Win:** change your speed so you pass that point at a different minute.
2. `c07-p2` [X4] *Never crossing.* Your path t(1, 0, 0); debris (0, 1, 2) + s(0, 1, 0). Not parallel, never meeting. **Win:** drag one bead on each path until the segment between them is at a right angle to both; its length is 2, along (1, 0, 0) × (0, 1, 0) = (0, 0, 1).
3. `c07-p3` [D] [H] [X4] *Write the door.* **Win:** place the normal (6, 3, 2) at P and test three points on the door: each arrow from P reads 0 against the normal; type the equation 6x + 3y + 2z = 6.
4. `c07-p4` *Hit the centre.* **Win:** an approach path from the origin that meets the door at its centre (1/3, 2/3, 1): direction (1, 2, 3), meeting at t = 1/3.
5. `c07-p5` [X4] *How far out?* **Win:** drop the perpendicular from the holding point (3, 3, 3) to the door's plane: 27/7 ≈ 3.86 (‖n‖ = 7). Then the distance from the same point to the approach path t(1, 2, 3): ‖(3, 3, 3) × (1, 2, 3)‖ / ‖(1, 2, 3)‖ = √(27/7) ≈ 1.96.
6. `c07-p6` [H] [X4] *The weld seam.* The door's plane meets the hull plane x − y = 0. **Win:** lay the weld line along n₁ × n₂ = (2, 2, −9) through (0, 0, 3); then set the angle between the two planes from their normals: cos θ = 3 / (7√2), θ ≈ 72.4°.
7. `c07-p7` [S] A path whose direction reads 0 against the normal: make `ray_plane` return "no single hit".

**Aha.** A plane is every point whose arrow from one fixed point is at a right angle to the normal: a dot product equal to zero. The numbers in front of x, y, z are the normal.

**Name it.** After p1: **parametric (vector) equation of a line**, **direction vector**. After p3: **Cartesian equation of a plane**, **normal of a plane**. After p2: **skew lines**. Formulas: r = p + t d; n·(x − p) = 0, i.e. ax + by + cz = d; distance |n·(q − p)| / ‖n‖; skew distance |(p₂ − p₁)·(d₁ × d₂)| / ‖d₁ × d₂‖.

**Briefing.** Check question: *Why does ax + by + cz = d describe a flat plane and not a curved surface?* Doubts: (F) "Two lines in space that aren't parallel have to cross." (T) "The numbers in front of x, y and z point straight out of the plane." Law frame: `In ax + by + cz = d, the arrow (a, b, c) is [PERPENDICULAR TO / INSIDE] the plane`.

**So what.** Ray picking (install): clicking the hangar door runs your `ray_plane`. Card: a linear classifier is a plane w·x + b = 0 whose normal is the weight vector.

**Build.** `ray_plane`, `dist_to_plane` → click-picking.

**[SP] Act II set piece · Docking.** (Uses Act I and Act II.) **Win:** (1) roll the *Lantern* so its axis lies along the door's normal (cross product); (2) lay the approach path along the normal through the door's centre (1/3, 2/3, 1); (3) confirm the path clears the nearest debris track by more than 1.5 (skew-line distance); (4) reach the path's start point with one burn built from the three thrusters (dials). The *Lantern* docks.

**Act II Review (Bram).** "If two arrows have dot product zero, one of them has a zero part." (F: (1, 2, 2) and (2, 1, −2)) · "If a × b = 0, then a or b is the zero arrow." (F) · "Three points always fix exactly one plane." (F: three points on a line) · "Swapping two struts flips the sign of the volume." (T).

**NumPy card II.** `np.dot`, `np.cross`, `np.linalg.det` on a 3 × 3 of struts.

**Act beat.** Docked. The ark is dark. Ilse's log: *"Power is down in all three sections. Start with the power equations."* LANTERN: *"Recorded two years, eleven months ago."*

**Difficulty deltas.** Cadet: the path bead snaps to quarters; distances drawn. Navigator: the plane's equation and t typed. Commander: the skew distance typed from the formula, without the bead aid.

**Cue.** When you see "where does this path hit that surface", substitute the path into the plane's equation.

---

### 6.5 Act III · The Ledger (solving)

Visual: inside the dark ark, shown as LANTERN's scan hologram: planes of light in a dark void, a flashlight cone, the row board floating beside them.

#### Ch 8 · "Where do the three planes meet?" — N09

**In short.** Where do several flat conditions all hold at once? Where their planes meet: at one point, along a line, in a whole plane (when they are all the same plane), or nowhere. Never at exactly two points.

**Plot beat.** Teo's sleeper pod sends a weak ping. Three fan-beam sensors each sweep a flat beam and record the plane the beam was on when the ping arrived. The pod lies on all three planes. (Planes, not range spheres.)

**Signature mechanic.** **Fan-beam planes** whose common points glow; the **twin view**: the same numbers as rows (planes meeting) and as columns (arrows mixed to reach the right-hand side), linked.

**Puzzles.**
1. `c08-p1` *Two lines first.* x + y = 5, x − y = 1. **Win:** place the point (3, 2) in the row view; in the column view the dials read 3·(1, 1) + 2·(1, −1) = (5, 1). Dragging one view moves the other.
2. `c08-p2` *Find the pod.* x + y + z = 6; 2y + 5z = −4; 2x + 5y − z = 27. **Win:** the marker sits on all three planes at (5, 3, −2) (each plane glows when the marker is on it).
3. `c08-p3` [D] *Never two.* x + y + z = 3, x − y = 1, 2x + z = 4. Wren: "I found exactly two spots where the pod could be." **Win:** place two solutions, then drag a third marker along the line through them, beyond them and between them: it stays on all three planes. The line is (0, −1, 4) + t(1, 1, −2).
4. `c08-p4` *The prism.* Change the last right side to 5. **Win:** turn the camera to look down the three parallel lines where pairs of planes meet: a triangular tube with no common point.
5. `c08-p5` [H] *From words to planes.* The ark's three ballast tanks (a word problem). **Win:** type the coefficients and right-hand sides; the planes appear and meet at the stated solution; then write the column form x₁a₁ + x₂a₂ + x₃a₃ = b.
6. `c08-p6` [S] x + y + z = 1 and x + y + z = 2: more unknowns than equations, and no solution.

**Aha.** Each equation is a plane; solutions are where all of them meet. Two solutions bring the whole line through them, so never exactly two. The row picture and the column picture are the same question.

**Name it.** After p2: **system of linear equations**, **solution**. After p4: **consistent**, **inconsistent**, **solution set**. After p1 (replayed): **row picture**, **column picture**.

**Briefing.** Check question: *Why can't a linear system have exactly two solutions?* Doubts: (F) "More unknowns than equations means infinitely many solutions." (T) "If the column arrows can reach the right-hand side, the planes meet." Law frame: `IF two points solve the system THEN [EVERY point on the line through them / ONLY those two] solve it`.

**So what.** Intersection tests in every engine. LANTERN verifies the pod position with your `check`.

**Build.** `check(rows, x)` (row view; Write adds the column view and the swarm shows both agree).

**Difficulty deltas.** Cadet: each plane glows when the marker is within 0.1 of it. Navigator: the case (one, many, none) is called before the planes are drawn. Commander: the twin view stays off until commit.

**Cue.** When several conditions must all hold, think *planes meeting*.

#### Ch 9 · "How do we untangle the equations without changing the answer?" — N10

**In short.** Combine whole equations. Each step turns one plane about where it meets the others, so the meeting point never moves. Keep going until the bottom equation has one unknown.

**Plot beat.** The ark's power board: three generators, three meters.

**Signature mechanic.** The **row board**: each row is tied to a plane. Drag a row onto another to add a multiple (dial); drag to swap; turn a row's dial to scale (never to zero). The common point stays pinned with a small light.

**Puzzles.**
1. `c09-p1` *Make the staircase.* [1 2 1 | 8], [2 5 4 | 24], [1 3 4 | 19]. **Win:** row echelon form in par 3 operations (R2 − 2R1, R3 − R1, R3 − R2), giving [1 2 1 | 8], [0 1 2 | 8], [0 0 1 | 3].
2. `c09-p2` *Climb back.* **Win:** back substitution lights each generator: z = 3, y = 2, x = 1.
3. `c09-p3` *Zero on top.* [0 2 1 | 5], [1 1 1 | 4], [2 1 0 | 4]. **Win:** staircase form after a swap; answer (1, 2, 1).
4. `c09-p4` [D] *Break it on purpose.* In a sandbox copy, try a forbidden move: scale a row by 0, change one side only, swap two columns. The pinned point jumps or a plane vanishes. **Win:** perform each, undo it, then show a legal move keeps the point: a combination of true equations is true, and every legal move can be undone.
5. `c09-p5` [H] [X1] *Parameter.* [1 2 | 3], [2 k | 6]. **Win:** three subgoals by dragging k and the last right-hand side, with R2 − 2R1 = [0 (k − 4) | 0] typed: one solution (k ≠ 4), infinitely many (k = 4), none (k = 4 with the 6 changed to 7).
6. `c09-p6` [H] *By hand.* p1 again with LANTERN's arithmetic off. Two separate stars: fewest operations, and no fractions.
7. `c09-p7` [S] Partial pivoting: [ε 1 | 1], [1 1 | 2] with ε = 10⁻²⁰. Without a swap, floating point gives x = 0; the true answer is very close to (1, 1). Swap the largest entry into the pivot position.

**Aha.** A row operation turns a plane about the line where it meets another, so the point where all of them meet never moves.

**Name it.** After p1: **coefficient matrix**, **augmented matrix**, **row operation** (swap, scale, replace), **row echelon form**, **pivot**, **pivot column**. After p2: **back substitution**, **Gaussian elimination**, **row equivalent**.

**Briefing.** Check question: *Why does adding a multiple of one equation to another not change the solutions?* Doubts: (F) "Swapping two rows changes the answer." (F) "Multiplying a row by any number keeps the solutions." (T) "Two people can reach different row echelon forms and the same pivot positions." Law frame: `A row operation [KEEPS / CHANGES] the solution set [ALWAYS / UNLESS it scales a row by ZERO]`. **Procedure (LANTERN):** FIND PIVOT → SWAP IF ZERO → CLEAR BELOW → NEXT ROW AND COLUMN → BACK SUBSTITUTE FROM THE BOTTOM. Missing "swap if zero" makes LANTERN divide by zero on p3's system.

**So what.** Elimination costs about ⅔n³ operations: the console shows a 4× larger system taking about 64× longer. Power routing runs on your `row_echelon`.

**Build.** `row_echelon`, `back_sub` → generators light.

**Difficulty deltas.** Cadet: LANTERN computes each new row after the player picks the operation. Navigator: each new row typed. Commander: only the final staircase checked; the no-fractions star needs whole numbers throughout.

**Cue.** When you see a system to solve by hand, think *augmented matrix, staircase, climb back*.

#### Ch 10 · "What if there is no single answer?" — N11

**In short.** What does the answer look like when there are infinitely many? One answer plus any amount of each free direction. A row that says 0 = 1 means no answer.

**Plot beat.** The conduits branch into more pipes than junctions; power can be routed many ways. One meter may be lying.

**Signature mechanic.** The **free dial**: each column without a pivot gets a dial; turning it slides a yellow point along the solution set while every plane stays satisfied.

**Puzzles.**
1. `c10-p1` *Finish the job.* **Win:** take Ch 9's staircase to the form [I | (1, 2, 3)].
2. `c10-p2` *A line of answers.* Flows x₁ − x₂ = 2, x₂ − x₃ = 1, x₁ − x₃ = 3. The bottom row becomes all zeros; x₃ has no pivot. Solutions (3 + t, 1 + t, t). **Win:** set t so every pipe carries between 0 and 5 (t from 0 to 2); par star at t = 0 (least total load, 4).
3. `c10-p3` *The lying meter.* Change the third meter to 4. **Win:** reduce until the row [0 0 0 | 1] appears (it says 0 = 1); then change one meter so a solution exists.
4. `c10-p4` [H] *A plane of answers.* x + 2y − z = 4. **Win:** with two free dials, land on three marked points: (4, 0, 0) + s(−2, 1, 0) + t(1, 0, 1).
5. `c10-p5` [H] [X1] *Parameters in 3 × 3.* [1 1 1 | 1], [1 2 3 | 2], [1 3 k | m]. Reduce to [0 0 (k − 5) | (m − 3)]. **Win:** three subgoals: one solution (k ≠ 5), infinitely many (k = 5, m = 3), none (k = 5, m ≠ 3).
6. `c10-p6` [D] *One answer plus the zero-right-side answers.* The same system as p2 with zeros on the right: its solution line passes through the origin, parallel to p2's. **Win:** move one line onto the other with a single arrow, the particular solution (3, 1, 0).
7. `c10-p7` [S] [1 2 1 1 | 5], [2 4 0 2 | 6], [1 2 2 1 | 7] to reduced row echelon form, whole numbers only: x₁ = 3 − 2x₂ − x₄, x₃ = 2.

**Aha.** A column without a pivot is a free direction. Every solution is one particular solution plus a solution of the same system with zeros on the right.

**Name it.** After p1: **reduced row echelon form** ("In reduced row echelon form every pivot is 1, with zeros above and below it"). After p2: **free variable**, **basic variable**, **parameter**, **parametric vector form**. After p6: **homogeneous system**, **trivial solution**, **particular solution**.

**Briefing.** Check question: *Why are all the solutions of a system one solution plus the solutions of the same system with zeros on the right?* Doubts: (F) "Three equations in three unknowns always have exactly one answer." (F) "Free variables come from zero rows." (T) "If the right-hand column has a pivot, there is no solution." Law frame: `The number of free variables is [the number of columns without a pivot / the number of zero rows]`.

**So what.** With more weights than data points a model has infinitely many perfect fits, which is why ML needs a rule to pick one (p2's "least load" par is that rule).

**Build.** `rref`, `solve` → flow routing. **Refactor:** Ch 2's brute-force `reachable` is replaced by your `solve`; the swarm reruns and the target needing a = 13.7 now passes.

**[SP] Act III set piece · Power to the pod bay.** (Uses Acts I, II, III.) **Win:** (1) one meter is damaged and reads m: the system [1 1 1 | 1], [1 2 3 | 2], [1 3 5 | m] has solutions only for m = 3; set it; (2) its flows are (t, 1 − 2t, t); choose t so every flow lies between 0 and 1 (t from 0 to 0.5); (3) send the drone with the spare fuse along a straight path that meets the pod-bay door's plane at the door's centre (Act II), with its burn built from the drone's thrusters (Act I).

**Act III Review (Bram).** "More unknowns than equations always means infinitely many solutions." (F) · "A system can have exactly two solutions." (F) · "Multiplying a row by a negative number changes the answer." (F) · "Three equations in three unknowns can have no solution." (T).

**NumPy card III.** `np.linalg.solve` (with partial pivoting) and why `np.linalg.lstsq` exists.

**Act beat.** Power returns. Teo's pod opens. Empty. *"Woken by Dr Varga. Gone to the stern to brace the struts. — T."* LANTERN, on a newer log: *"Recorded fourteen months ago."*

**Difficulty deltas.** Cadet: free dials appear by themselves. Navigator: the player marks the free columns before the dials appear. Commander: the parametric form typed before the solution set is drawn.

**Cue.** When you see "how many solutions" or "describe all solutions", think *reduce, then count pivots*.

---

### 6.6 Act IV · The Pulse (moving space)

Visual: the Anchor up close; the lattice moving under real pulses; the spire bench as three glowing spires whose tips are the matrix columns (green, red, blue).

#### Ch 11 · "What did the pulse do to the grid?" — N12, N13

**In short.** Where does the pulse send every point? Find where the two grid arrows land. Every other point lands at the same mix of those two landing spots.

**Plot beat.** To protect the ark, the crew must predict where any point lands. LANTERN can now read the Anchor's spire tips.

**Signature mechanic.** The **spire bench**: drag the tips of the grey grid arrows e₁, e₂ (e₃); where they land become the green, red (and blue) columns, and the whole lattice follows live.

**Puzzles.**
1. `c11-p1` *Read the pulse.* After a routine pulse, the buoy one step along the first grid arrow is at (1, 1); the buoy one step along the second is at (−2, −1). Call it: where did the buoy at (3, 2) land? **Win:** place its landing marker at (−1, 1); the yellow arrow is drawn as three green columns plus two red columns, tip to tail.
2. `c11-p2` *Build a pulse.* **Win:** set the two columns so (1, 1) lands on (3, 3) and (1, −1) stays where it is: columns (2, 1) and (1, 2). (This matrix returns in Ch 18, 21, 24 and 25.)
3. `c11-p3` [D] *Why two arrows fix everything.* Drag any point: its split into x e₁ + y e₂ is drawn; apply the pulse: the two parts move to the columns and reassemble at the landing spot. Then try to build "everything slides 3 to the right". **Win:** match the shear and the quarter-turn targets with the column tips, and mark the slide and the curved warp with their evidence drawn (the origin moved; a grid line bent).
4. `c11-p4` *The spire numbers.* LANTERN reads the spire tips: (0, 1, 0), (−1, 0, 0), (0, 0, 0.8). **Win:** build both matrices on the bench (the spire numbers, and the measured pulse with columns (1, 1, 0), (−2, −1, 0), (0, 0, 0.8)) and place both predictions for the bow at (1, 0, 0): (0, 1, 0) from the spires, (1, 1, 0) for real. The gap is drawn. Case Board: *"Why does a prediction from the spire numbers miss?"* LANTERN adds: *"Every fourth pulse the ground layer returns to where it started. Heights do not."*
5. `c11-p5` [H] *Both ways.* A = [[1, 0, 2], [0, 1, −1]] (2 × 3) and x = (3, 1, 2). **Win:** place A x = (7, −1), typed both as a mix of columns and as each row dotted with x; then the 3D spire bench (1, 0, 0), (1, 1, 0), (0, 1, 1) sends the beacon (1, 1, 1) to the sum of the columns, (2, 2, 1).
6. `c11-p6` *Rows or columns?* Ilse's nine numbers, read as rows instead of columns, turn the grid the other way. **Win:** build both readings and show which one turns the grid the same way round as the pulse in the cold open (the columns reading does).
7. `c11-p7` [S] Build rotation by 30° ((0.866, 0.5), (−0.5, 0.866)), the reflection in y = x, and the projection onto the x-axis.

**Aha.** Know where the grid arrows land and you know where every point lands. The columns are those landing spots. A x is the mix of the columns with x's numbers as the weights.

**Name it.** After p1: **linear transformation** — "A move of space that keeps the origin fixed and grid lines straight, parallel and evenly spaced"; **matrix** — the landing spots written as columns; **standard basis vectors e₁, e₂, e₃**. After p5: **matrix–vector product A x**, **matrix equation A x = b**, **size m × n**. After p7: rotation, reflection, shear, scaling and projection matrices. The Prologue's first question closes (the origin is fixed by every linear transformation, which is why the point under the Anchor never moves). Formula: A x = x₁a₁ + x₂a₂ (+ x₃a₃); entry i is row i · x.

**Briefing.** Check questions: *Why do two arrows, T(e₁) and T(e₂), fix the whole transformation?* and *What is A e₂, and why?* Doubts: (F) "Knowing where two buoys go isn't enough to know where all of them go." (T) "No pulse can ever move the point under the Anchor." Law frame: `The [COLUMNS / ROWS] of A are where e₁ and e₂ land`.

**So what.** One layer of a neural network is W x. The pulse forecast (install) runs your `matvec` on 2,000 buoys at once; the next pulse lands every buoy on your ghost.

**Build.** `matvec` (column view via `lincomb`; row view via `dot` on Write) → pulse forecast.

**Difficulty deltas.** Cadet: landing spots preview live. Navigator: A x typed both ways. Commander: landing markers placed blind; p7's matrices built from a description only.

**Cue.** When you see a matrix, ask *where do the grid arrows land?*

#### Ch 12 · "What do two moves in a row do?" — N14

**In short.** What single move does two moves in a row? Follow each grid arrow through both moves; where they end up are the columns of the single move. The move next to the point happens first, and order matters.

**Plot beat.** Each pulse is followed by the ark's own stabiliser turn. LANTERN needs one matrix for both, and the crew needs to know if the order matters.

**Signature mechanic.** The **sequence rail**: drop matrices on a rail, right to left; the lattice plays them in order (right-hand first), then fuses them into one.

**Puzzles.**
1. `c12-p1` *The pair as one.* A = [[1, 1], [0, 1]] (shear), B = [[0, −1], [1, 0]] (quarter turn). **Win:** build one matrix equal to "A, then B" by following e₁ → (1, 0) → (0, 1) and e₂ → (1, 1) → (−1, 1): B A = [[0, −1], [1, 1]].
2. `c12-p2` *Order.* **Win:** place a point that lands in different places under "A then B" and "B then A": (1, 0) lands on (0, 1) one way and (1, 1) the other. Then reflect in y = x twice: the grid returns.
3. `c12-p3` [H] *By the row–column rule.* [[1, 2, 0], [0, 1, 3]] times [[1, 0], [2, 1], [0, 4]]. **Win:** typed entries [[5, 2], [2, 13]]; each column of the product is drawn as the first matrix applied to a column of the second.
4. `c12-p4` [D] *Moving a matrix across a dot product.* B = [[1, 2], [0, 1]]. **Win:** enter M so that (B x)·y = x·(M y) for every x and y; Bram shakes 200 pairs. Answer M = [[1, 0], [2, 1]], B with rows turned into columns. Then (AB)ᵀ = BᵀAᵀ by applying the rule twice.
5. `c12-p5` *Zero from non-zero.* **Win:** two non-zero matrices whose product sends everything to the origin: project onto the x-axis first, then onto the y-axis.
6. `c12-p6` *Three layers, one matrix.* **Win:** fuse three given moves into the one matrix that does all three; then try to build any single matrix that separates a ring of points from the blob inside it, and see that none can (it keeps lines straight and the origin fixed). This returns in the Epilogue.
7. `c12-p7` [S] Associativity on the rail: group three moves both ways.

**Aha.** Multiplying matrices is doing one move after the other. The right-hand matrix acts first. Doing two moves in a different order can leave the grid somewhere else.

**Name it.** After p1: **composition**, **matrix product AB**. After p2: **identity matrix I**, **non-commutative**. After p4: **transpose Aᵀ** — "the matrix that moves to the other side of a dot product: rows become columns"; **symmetric matrix** (equal to its own transpose). After p7: **associative**. Formulas: (AB)x = A(Bx); column j of AB = A b_j; (AB)ᵢⱼ = row i of A · column j of B; (Ax)·y = x·(Aᵀy); (AB)ᵀ = BᵀAᵀ.

**Briefing.** Check question: *Why is column j of AB equal to A times column j of B?* Doubts: (F) "Shear then turn is the same as turn then shear." (F) "If AB is the zero matrix then A or B is zero." (T) "Three moves give the same result however you group them." Law frame: `In AB, [B / A] moves the grid first`.

**So what.** Graphics pipelines fuse model, view and projection into one matrix; stacked layers with nothing between them collapse into one matrix (p6).

**Build.** `matmul` (calls your `matvec` per column), `transpose` → fused forecasts. Par: a 3 × 3 product in 27 multiplications.

**Difficulty deltas.** Cadet: the rail plays each stage slowly with e₁ and e₂ traced. Navigator: product entries typed. Commander: the fused matrix entered before playback.

**Cue.** When you see "do this, then that", think *multiply, first move on the right*.

#### Ch 13 · "How do we undo a move?" — N15

**In short.** How do I undo a move? Build the move that sends every landing spot back. It exists exactly when no two points landed on the same spot.

**Plot beat.** Three years of routine pulses have left the bow's frames sheared. Square them again.

**Signature mechanic.** The **undo bench**: the moved grid and a ghost of the original; build the matrix that returns every point.

**Puzzles.**
1. `c13-p1` *Undo a quarter turn.* **Win:** [[0, 1], [−1, 0]] returns the ghost.
2. `c13-p2` *Undo by landing spots.* A = [[2, 1], [1, 1]]. **Win:** find the point A sends to e₁, (1, −1), and to e₂, (−1, 2), and set them as the undo's columns. A times the undo leaves the grid unchanged.
3. `c13-p3` *Square the bow.* **Win:** undo the routine pulse's ground layer, T = [[1, −2], [1, −1]]: T⁻¹ = [[−1, 2], [−1, 1]]. LANTERN: *"That is also three more routine pulses."* (Paid off in Ch 18.)
4. `c13-p4` [D] [H] [X5] *Why [A | I] works.* Each row operation is drawn as the grid move it is (an elementary matrix). A = [[1, 1, 0], [0, 1, 1], [1, 0, 1]]. **Win:** row reduce [A | I] to [I | A⁻¹] = ½·[[1, −1, 1], [1, 1, −1], [−1, 1, 1]]; the stack of moves that turns A into I is A⁻¹, and doing the same moves to I writes it down. Subgoal: solve A X = B for a given 3 × 2 B with the same moves.
5. `c13-p5` *Undo a chain.* A frame was turned, then sheared. **Win:** stack the undo cards so the shear is undone first.
6. `c13-p6` *The one that cannot be undone.* A = [[1, 2], [2, 4]]. **Win:** show two points that land on the same spot: (2, 0) and (0, 1) both land on (2, 4). Then the **title card returns**: *"A matrix that flattens space is called singular. It has no inverse."*
7. `c13-p7` [S] LU: record the multipliers of elimination without swaps as L.

**Aha.** An undo exists exactly when no two points land on the same spot, which is exactly when nothing is flattened.

**Name it.** After p2: **inverse A⁻¹**, **invertible**. After p4: **elementary matrix**. After p6: **singular**, **non-singular**. Formulas: A A⁻¹ = A⁻¹A = I; 2 × 2: A⁻¹ = (1/(ad − bc))·[[d, −b], [−c, a]] (the divisor is named in Ch 14); (AB)⁻¹ = B⁻¹A⁻¹; [A | I] → [I | A⁻¹].

**Briefing.** Check question: *Why does (AB)⁻¹ reverse the order?* Doubts: (F) "Every matrix that is not all zeros has an undo." (F) "(AB)⁻¹ = A⁻¹B⁻¹." (T) "A move that flips the grid over can still be undone." Law frame: `A is INVERTIBLE EXACTLY WHEN [NO TWO POINTS land on ONE spot / no entry is zero]`. **Procedure (LANTERN):** [A | I] — FIND PIVOT → SWAP IF ZERO → SCALE TO 1 → CLEAR BELOW AND ABOVE → APPLY TO BOTH HALVES. Missing "apply to both halves" leaves the right half as I.

**So what.** Clicking on a 3D scene uses the inverse of the camera matrix to turn a pixel into a ray; the holotable's picking runs on your `inverse`. Card: solvers rarely build A⁻¹; they eliminate.

**Build.** `identity`, `inverse` (rref on [A | I]; returns None when a pivot is missing) → bow-frame undo planner.

**Difficulty deltas.** Cadet: the undo's columns snap to the found points. Navigator: [A | I] rows typed. Commander: the inverse typed; LANTERN checks only A A⁻¹ = I.

**Cue.** When you need to go back, think *inverse*, and first check that nothing was flattened.

#### Ch 14 · "Why is the ark getting smaller?" — N16

**In short.** What happens to area and volume? Every square of the grid scales by the same factor, with a minus sign if the grid flips. Zero means space was flattened.

**Plot beat.** The ark's hull volume drops by a fifth every pulse. The third spire is bending a little further each time. Then the forecast.

**Signature mechanic.** The **unit tile** (frosted white square, later a cube) rides the grid; its signed area or volume shows on it; a flipped tile shows its back face.

**Puzzles.**
1. `c14-p1` *Shape a hold.* **Win:** drag the columns until the unit tile has area exactly 6 (e.g. (3, 0) and (1, 2)); then apply [[2, 1], [1, 1]] and watch the shape change and the area stay 1. LANTERN: *"Volume prediction from the spire numbers: times 0.8. Measured: times 0.8."* The Case Board clue from Ch 11 sharpens: the spires predicted the volume exactly and the position wrongly.
2. `c14-p2` [D] *Where ad − bc comes from.* Columns (3, 1) and (1, 2) sit in a 4 × 3 box. **Win:** drag the corner pieces out (two triangles of 1.5, two of 1, two rectangles of 1) until only the parallelogram is left: 12 − 3 − 2 − 2 = 5 = 3·2 − 1·1.
3. `c14-p3` *Products and scalings.* A doubles area, B triples it. Call it: AB? **Win:** build AB and read 6. Then: scale a unit-area matrix by one number k so the area becomes exactly 4: k = 2, not 4 (in 3D, doubling every entry gives 8). Then [[0, 1], [1, 0]] gives −1 and the tile shows its back.
4. `c14-p4` [D] [H] [X6] *Cofactor expansion.* **Win:** typed 3 × 3 expansion of [[2, 1, 0], [1, 3, 1], [0, 1, 2]] = 8 along a chosen row, then the 4 × 4 [[1, 2, 0, 3], [0, 1, 0, 0], [2, 0, 1, 1], [1, 1, 0, 2]]: expand along row 2 (one non-zero entry), then along the middle column of the 3 × 3 minor: det = −1. [D] link: the 3 × 3 rule is the scalar triple product of the columns from Ch 6, expanded along the first row; the + − + pattern comes from the cross product's components.
5. `c14-p5` [H] [X6] *Row reduction method, and the k that flattens.* [[0, 2, 1], [1, 1, 1], [2, 1, 0]]: swap (sign flips), eliminate to triangular, multiply the pivots: det = 3. Then the shield generator [[2, k], [3, 6]]. **Win:** drag k until the grid collapses: k = 4.
6. `c14-p6` [SP] **The Collapse** (Act IV set piece; uses Acts II, III, IV). A debris strike has knocked the spires: LANTERN reads (1, 0, 1), (0, 1, 2) and a third tip swinging into line with the second, now at (0, 1, 2.004) (TT21). (1) **Forecast:** compute the next pulse's determinant from the spire readings (with your own `det` if you wrote it): 0.004, which LANTERN reports as *"zero point zero zero, to two decimal places"*. (2) **Try to undo it in advance:** row reduce [A | I] on the two-decimal reading, whose second and third columns are equal; a pivot is missing. (3) **Brace it:** Teo is in the stern. Place three braces from his node in any arrangement; the preview applies the forecast pulse; every arrangement's box loses the same fraction of its volume (× 0.004). Try at least three. (4) **Win:** seal the mid-section bulkhead to save the rest of the ark (commit). The pulse fires.
7. `c14-p7` [S] Cramer's rule from "A sends the identity with column i replaced by x to A with column i replaced by b".

**Aha.** The determinant is how much a pulse scales area or volume, with a sign for flips. Zero means space is flattened, and flattened means no undo. Scale factors of successive moves multiply.

**Name it.** After p2: **determinant** — "the factor by which a matrix scales area (or volume), with a minus sign if it flips orientation"; **signed area**. After p3: **orientation reversal**. After p4: **minor**, **cofactor**, **cofactor expansion**, **triangular matrix**. Formulas: det [[a, b], [c, d]] = ad − bc; det(AB) = det A det B; det(kA) = kⁿ det A; det Aᵀ = det A; det A⁻¹ = 1/det A; 3 × 3 = scalar triple product of the columns.

**Briefing.** Check questions: *Why does adding a multiple of one column to another not change the determinant?* (slide the parallelogram's top edge) and *If A doubles area and B triples it, what does AB do?* Doubts: (F) "Double every number in a 2 × 2 and you double the area." (F) "det(A + B) = det A + det B." (T) "A matrix with no inverse has determinant zero." Law frame: `det A = 0 EXACTLY WHEN A [FLATTENS SPACE / has a ZERO entry]`.

**So what.** Normalising flows (generative models) track how each layer scales volume with this number; the hull volume tracker runs on your `det`.

**Build.** `det` by elimination (product of pivots, sign per swap); `det3` by formula for checking → **the Collapse forecast runs on your `det`**.

**Act IV Review (Bram, before the forecast).** "AB = BA." (F) · "det(A + B) = det A + det B." (F: A = B = I in 2D) · "A matrix with no zero entries always has an undo." (F) · "A matrix that flips the grid can be undone." (T).

**NumPy card IV.** `A @ B`, `np.linalg.inv`, `np.linalg.det`, and why `np.linalg.solve` beats `inv(A) @ b`.

**Act beat · The Collapse.** Short lines, no begging. Teo: *"Struts are holding. I can see the hatch from here."* Wren: *"Teo. The hatch."* Teo: *"Going."* Silence. The pulse fires: the stern folds into a sheet in front of the player, the real matrix on the real hull. The music drops from three voices to two. Teo's voiceprint becomes static. LANTERN: *"Pulse complete. The stern is flat, to two decimal places."* Then nothing from Teo.

**Difficulty deltas.** Cadet: LANTERN expands minors on request. Navigator: each cofactor typed. Commander: the player chooses the expansion row; the row-reduction determinant typed with its sign tracking.

**Cue.** When you see "area", "volume", "flattened" or "can this be undone", think *determinant*.

---

### 6.7 Act V · Collapse (spaces inside spaces)

Visual: the stern as a vast thin sheet edge-on to the star; a debris pile glowing at the origin; violet glow on everything that lands on the origin. Music: two voices.

Every Act V puzzle that uses the Collapse pulse uses **the two-decimal model** C₂ (columns (1, 0, 1), (0, 1, 1), (1, 1, 2)), measured from the lattice after the pulse, and LANTERN names it that way every time.

#### Ch 15 · "Where can anything land, and what went to zero?" — N17

**In short.** What can this move reach, and what does it send to the origin? It reaches every mix of its columns. A whole line or plane of starting points can land on the origin, and two starts land together exactly when they differ by one of those.

**Plot beat.** After the Collapse, LANTERN fires 2,000 test buoys through the two-decimal model. A pile of debris sits at the point that never moves. Vell's cutter arrives.

**Signature mechanic.** **PROBE**: send probe points through a matrix; landing spots paint yellow; every start that lands on the origin glows violet (the only use of violet in the game).

**Puzzles.**
1. `c15-p1` *The landing plane.* **Win:** place the plane that all 2,000 landed buoys lie on: z = x + y, normal (1, 1, −1). Wren: *"That's our thruster plane from the first day."*
2. `c15-p2` [X2] *Possible landings.* Targets (1, 2, 3), (1, 1, 1), (0, 0, 0), (2, −1, 1). **Win:** for each reachable target set input dials that land on it; for (1, 1, 1) place it and draw its gap from the plane.
3. `c15-p3` [H] *Land on the origin.* **Win:** a non-zero input that lands on the origin: (1, 1, −1) (column 1 + column 2 − column 3 = 0). The whole violet line through it appears. Then reduce C₂ on the row board and read the same line from the free variable: t(−1, −1, 1).
4. `c15-p4` *Same landing.* Pieces from (2, 0, 1) and (3, 1, 0). Call it: same landing? **Win:** show both land on (3, 1, 4) and that their difference (1, 1, −1) lies on the violet line; then place three different starts that land on (1, 2, 3): (1, 2, 0) + t(1, 1, −1).
5. `c15-p5` [D] [X7] *What counts as a landing set?* Candidates: a plane through the origin, a line through the origin, the plane z = x + y + 1, the two axes together, the first quarter of the plane. **Win:** for each impostor build an arrow that escapes (two arrows in the set whose sum is not, or one whose stretch is not, or the missing origin). Then: each row of C₂ reads 0 against (1, 1, −1), so the violet line is perpendicular to every row.
6. `c15-p6` *Move the elbow, not the hand.* The drone arm's three motors push the gripper along the columns of A = [[1, 0, 1], [0, 1, 1]]. **Win:** swing the elbow clear of a pipe while the gripper stays on the handle, using the command (1, 1, −1).
7. `c15-p7` [S] A damaged arm A = [[1, 2, 3], [2, 4, 6]]: name a target it cannot reach and two different still-commands, (−2, 1, 0) and (−3, 0, 1).

**Aha.** Every landing is a mix of the columns, so everything lands in the span of the columns. Two starts land together exactly when they differ by an arrow the move sends to the origin.

**Name it.** After p1: **column space Col A**. After p3: **null space Nul A** — "every input the matrix sends to the origin" (never any other word). After p5: **subspace** (contains the origin, closed under adding and stretching). After p4: **one-to-one**; after p2: **onto**. LANTERN: *"The two-decimal model has a null space: the line through (1, 1, −1). Every piece that started on it landed on the origin."*

**Briefing.** Check question: *Why does every solution of A x = b differ from another by a null space vector?* Doubts: (F) "Start a point in the right place and the pulse can land it anywhere." (F) "Any plane is a subspace." (T) "If two starts land on the same point, their difference lands on the origin." Law frame: `A x = b has a solution EXACTLY WHEN b is IN the [COLUMN SPACE / NULL SPACE]`. **Teo callback T1** follows this chapter (§4.4).

**So what.** p6 is null-space motion on a redundant robot arm. The debris sorter (install) groups pieces that landed together using your `null_space`.

**Build.** `null_space` (free columns of `rref`), `col_space` (original pivot columns) → debris sorter. **Refactor:** Ch 3's `find_loop` is replaced by `null_space`.

**Act beat.** Vell: *"I'm sorry about your brother. Anything flattened is gone. We're here for the Anchor."*

**Difficulty deltas.** Cadet: the violet glow previews while probing. Navigator: the null space read from a typed reduction. Commander: subspace counterexamples built without the escape hint.

**Cue.** "What can it reach?" → column space. "What does it send to the origin?" → null space.

#### Ch 16 · "How many directions survived?" — N18

**In short.** How many directions survive? Each input direction is either kept or flattened. Kept plus flattened is always the number of inputs.

**Plot beat.** Vell's scanner surveys the stern and the debris. He holds a review: what can and cannot be done with a flattened region.

**Signature mechanic.** The **survivor counter**: after reduction, pivot columns glow (kept directions) and the others dim (flattened directions); a bar shows kept + flattened = columns.

**Puzzles.**
1. `c16-p1` *Smallest set.* From (1, 0, 1), (0, 1, 1), (1, 1, 2), (2, 1, 3). **Win:** prune to the fewest arrows that keep the same reach glow: any two independent ones, count 2.
2. `c16-p2` [H] [X7] *Count.* A = [[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]]. **Win:** reduce (pivots in columns 1 and 3), set rank 2, and place the null space's two arrows (−2, 1, 0, 0) and (−1, 0, −2, 1); the counter reads 2 + 2 = 4.
3. `c16-p3` [X7] *The trap.* The game takes the reduced matrix's pivot columns as a basis for the column space and draws their plane; A's own columns stick out of it. **Win:** rebuild the plane from A's original pivot columns (1, 2, 3) and (0, 1, 1); every column of A lies in it.
4. `c16-p4` *Orders.* **Win:** build a 3 × 4 matrix with rank 2 and nullity 2; for "rank 3, nullity 2, four columns" and "a 3 × 5 that flattens nothing", the counter refuses, and the player places the bar that shows why (kept + flattened must equal the columns; kept is at most 3).
5. `c16-p5` [H] *Strut bend profiles are vectors too.* Each strut's bend is a profile p(t) = a + b t + c t², stored as (a, b, c): coordinates in the basis 1, t, t². Profiles add and stretch like arrows. The rate-of-bend rule sends a + b t + c t² to b + 2c t. **Win:** build its matrix by sending 1, t, t² through the rule (where the basis lands): D = [[0, 1, 0], [0, 0, 2], [0, 0, 0]]; apply it to 5 − 3t + 2t² (gets −3 + 4t); place its null space, the constant profiles (1, 0, 0); confirm {1 + t, t + t², 1 + t²} is a basis (its coordinate matrix has determinant 2).
6. `c16-p6` [D] *Why kept + flattened = columns.* **Win:** for six matrices the player builds, show each non-pivot column gives one free variable (one null-space direction) and each pivot column one output direction; the Shake randomises the matrices.
7. `c16-p7` [S] Extend an independent set to a basis of 3D.

**Aha.** Every input direction is either kept or flattened, so rank + nullity = the number of columns. Every basis of a space has the same number of arrows.

**Name it.** After p1: **basis** — "a set of arrows that reaches the whole space with none wasted"; **dimension**. After p2: **rank**, **nullity**, **rank–nullity theorem**. After p5: **vector space** — "any set where adding and stretching follow the same rules gets every tool in this game". In the set piece: **row space Row A**, **left null space Nul Aᵀ**, **the four fundamental subspaces**, **the Invertible Matrix Theorem**.

**Briefing.** Check question: *Why can a 3 × 5 matrix never be one-to-one?* Doubts: (F) "Use the columns of the reduced matrix as a basis for the column space." (F) "A subspace has only one basis." (T) "Every basis of a plane has exactly two arrows." Law frame: `RANK + NULLITY = the number of [COLUMNS / ROWS]`.

**So what.** LoRA fine-tunes large language models with low-rank updates; the survey scanner (install) reports kept and flattened directions with your `rank`.

**Build.** `rank` (counts pivots), `basis_for_span`.

**[SP] Act V set piece · Vell's review: four rooms and one fact.** (Uses Acts II, III, IV, V.)
1. **Four rooms.** Vell's scanner matrix M = [[1, 2, 3], [2, 4, 6], [1, 1, 1]] (rank 2). **Win:** in input space, place the row space (the plane spanned by (1, 2, 3) and (1, 1, 1), normal (1, −2, 1) by a cross product) and the null space (the line through (1, −2, 1)), and show they are perpendicular; in output space, place the column space (normal (2, −1, 0)) and the left null space (the line through (2, −1, 0)), perpendicular again. Show dim Row = dim Col = 2.
2. **One fact.** On the two-decimal model C₂, light eleven stars of the Invertible Matrix constellation (§4.7), each with one construction: the lattice flattened onto a plane; the loop (1, 1, −1); the unreachable (1, 1, 1); (1, 1, 1) with no solution and (1, 2, 3) with a line of them; a column with no pivot; reduced form not I; the violet line; rank 2; two points landing together, so no inverse; triple product 0; det 0.
3. **Vell's claims** (the act Review): "Anything flattened is gone." (**T** on this model: objecting costs a star, and Vell shows two starts with one landing) · "Rank 2 in a 3 × 3 means two directions are crushed." (F) · "The row space and the column space are always the same plane." (F: M's are different planes) · "The null space is perpendicular to every row." (T).

**NumPy card V.** `np.linalg.matrix_rank`, `scipy.linalg.null_space`, `scipy.linalg.orth`.

**Act beat (low point).** Vell: *"You can't run a flattened ark backwards. Your own maths says so."* Wren in the airlock, Bram beside her. In the corner of LANTERN's display: *"Determinant 0.00 (two decimal places)."* A log: *"Recorded nine days ago."*

**Difficulty deltas.** Cadet: the counter fills itself after reduction. Navigator: rank and nullity typed before the counter shows. Commander: p5's matrix built without the basis-landing animation.

**Cue.** When asked how many solutions or free choices, count pivots.

---

### 6.8 Act VI · The Wrong Grid (coordinates)

Visual: the Anchor's skewed grid in copper dashed lines over the white lattice; the core's light; the ark finally swinging clear of the debris stream.

#### Ch 17 · "Same point, different grid: what are its numbers now?" — N19

**In short.** Its numbers are the amounts of each grid arrow you need to reach it. Change the arrows and the numbers change; the point does not move. To do a move written in another grid: translate in, move, translate back.

**Plot beat.** Bram measures the Anchor's arms: b₁ = (1, 0) (length 1) and b₂ = (1, 1) (length 1.41), 45° apart. LANTERN had drawn them square. Replaying Ilse's numbers in this grid reproduces the measured pulse. Ilse is alive.

**Signature mechanic.** **TRANSLATE**: the copper Anchor grid over the white ship grid; one yellow point, two readouts. The **three-slot rail**: "into the Anchor's grid", "the spire numbers", "back to the ship's grid".

**Puzzles.**
1. `c17-p1` *Name it the Anchor's way.* **Win:** the Anchor's numbers for the ship point (3, 2): (1, 2), since 1·b₁ + 2·b₂ = (3, 2).
2. `c17-p2` *And back.* **Win:** the ship point for Anchor numbers (2, −1): (1, −1).
3. `c17-p3` [H] *Between two skewed grids.* Vell's cutter uses c₁ = (1, 1), c₂ = (−1, 1) (both length 1.41, at 90°). **Win:** convert Anchor numbers (2, 1) to Vell's numbers: through ship (3, 1), to (2, −1); then build the one conversion matrix P_C⁻¹ P_B.
4. `c17-p4` *Replay what happened.* Ilse's quarter turn R = [[0, −1], [1, 0]] applied in the Anchor's grid. Call it: where does the bow at ship (1, 0) go? **Win:** build P R P⁻¹ on the rail and match the measured pulse from Ch 11: [[1, −2], [1, −1]]. The bow goes to (1, 1), not (0, 1). The Case Board's nine-numbers question closes.
5. `c17-p5` *What she meant to enter.* **Win:** the Anchor-grid numbers that make a true quarter turn in ship space: P⁻¹ R P = [[−1, −2], [1, 1]]; the replay shows a clean turn.
6. `c17-p6` [D] *What did not change.* **Win:** measure R and P R P⁻¹ side by side and light each invariant that matches: determinant (1 and 1), trace (0 and 0), four pulses return home (both); entries and the landing of (1, 0) do not match. Then the reason: det(P⁻¹AP) = det P⁻¹ · det A · det P = det A. The Ch 11 / Ch 14 clue closes: the volume prediction was exact because area scaling does not depend on the grid.
7. `c17-p7` [S] Re-run Ch 11's bow prediction with the translated matrix: it lands exactly where the bow went.

**Aha.** The same numbers move space differently in different grids. A matrix with messy numbers can be a plain turn or stretch in the right grid.

**Name it.** After p1: **coordinates relative to a basis [x]_B**. After p4: **change-of-coordinates matrix P_B**, **change of basis**. After p6: **similar matrices** — "two descriptions of one move in two grids". Formulas: x = P_B [x]_B; [x]_B = P_B⁻¹ x; [T]_B = P⁻¹ A P; P_{C←B} = P_C⁻¹ P_B.

**Briefing.** Check question: *Why is the matrix of T in basis B equal to P⁻¹AP and not PAP⁻¹?* Doubts: (F) "A grid needs right angles to name points." (F) "Same numbers, same motion." (T) "Two similar matrices scale area by the same amount." Law frame: `The matrix whose COLUMNS are the new grid arrows turns [NEW numbers into OLD numbers / OLD numbers into NEW numbers]`. **Teo callback T2** follows.

**So what.** World, camera and object frames in every game engine; the spire translator (install) converts ship-grid moves into the Anchor's grid with your `to_coords` and `in_grid`.

**Build.** `to_coords`, `from_coords`, `in_grid`.

**[SP] Act VI set piece · Set the spires right.** (Uses Acts II, IV, VI.) Bram frees the spires jammed since the Collapse. The ark's centre sits at (3, 1, 0) inside the debris stream, which flows along the line x = 3, z = 0. **Win:** (1) convert a true quarter turn into the Anchor's grid (P⁻¹ R P, third spire upright); (2) check it keeps volume (det 1); (3) check the ark's new position (−1, 3, 0) is at least 2 from the stream's line (it is 4); (4) fire it once, unlocked. The ark swings clear of the stream for the first time in three years. (With Ilse's original setting, the ark went (3, 1) → (1, 2) → (−3, −1) → (−1, −2) → back into the stream every fourth pulse.)

**Act VI Review (Ilse, live).** "Changing the basis moves the point." (F) · "P converts standard numbers into B-numbers." (F) · "If four pulses of one matrix bring every point home, four pulses of any similar matrix do too." (T: (P A P⁻¹)⁴ = P A⁴ P⁻¹) · "Similar matrices have the same entries." (F).

**NumPy card VI.** `np.linalg.solve(P, x)` for coordinates; `np.linalg.inv(P) @ A @ P`.

**Act beat · Ilse is alive.** The newest log is two days old. Then a live voice, no hiss: *"I wrote the right numbers. I did not know whose grid would read them."* She has lived three years in the core, at the origin, the one point no pulse can move. The light was hers.

**Difficulty deltas.** Cadet: both readouts live. Navigator: coordinates typed by solving. Commander: P⁻¹AP typed before the replay.

**Cue.** When two people give the same point different numbers, think *change of basis*.

---

### 6.9 Act VII · Lines That Hold (eigenvectors)

Visual: Vell's cutter; drone swarms; held notes in the music for lines that hold.

#### Ch 18 · "Which lines does the pulse not turn?" — N20

**In short.** Which arrows stay on their own line? Most arrows turn. A few only stretch, shrink or flip. They sit where the move minus a stretch flattens space. A quarter turn keeps no line at all.

**Plot beat.** Vell plans to lock his own pulse into the Anchor and repeat it fifty times to gather the debris field onto a line he can tow. The ark's sections must ride lines through the Anchor that his pulse does not turn.

**Signature mechanic.** The **sweep**: a green probe sweeps the unit circle; its yellow image is drawn; a chime sounds when they share a line. The **λ dial** applies A − λI to the grid, which collapses with the Collapse's own visual and sound at each eigenvalue while the characteristic polynomial's graph is drawn beside it.

**Puzzles.**
1. `c18-p1` *An old friend.* A = [[2, 1], [1, 2]] (from Ch 11). **Win:** lock both lines that hold and their stretches: (1, 1) × 3 and (1, −1) × 1.
2. `c18-p2` *A shear.* [[1, 1], [0, 1]]. **Win:** lock the only line, the x-axis (× 1), with the full sweep drawn as evidence that no second line exists.
3. `c18-p3` [D] *The λ dial.* A = [[4, 1], [2, 3]]. **Win:** stop the dial where the grid of A − λI flattens, at λ = 5 and λ = 2, the roots of λ² − 7λ + 10 = 0 graphed beside it; lock the lines (1, 1) and (1, −2). The reason: A v = λ v means (A − λI) v = 0 with v not zero, so A − λI flattens a direction (Ch 15), so det(A − λI) = 0 (Ch 14).
4. `c18-p4` *No line at all.* The routine pulse T = [[1, −2], [1, −1]]. The sweep finds no line; the λ dial never flattens for real λ; λ² + 1 = 0 gives λ = ±i. Then D = [[1, −1], [1, 1]]: λ = 1 ± i. **Win:** build D on the rail as "turn 45°, then stretch by 1.41" (|λ| = √2, angle 45°); check sum of eigenvalues = trace = 2 and product = det = 2; then put four routine pulses on the rail and show they fuse to I: i⁴ = 1. The Case Board question "why does every fourth pulse bring the ground layer home?" closes.
5. `c18-p5` [H] [X8] *A 3 × 3.* [[2, 0, 0], [0, 3, 4], [0, 4, −3]]. **Win:** typed characteristic equation and stretches 2, 5, −5 along (1, 0, 0), (0, 2, 1), (0, 1, −2), with the checks 2 + 5 − 5 = trace and 2·5·(−5) = −50 = det; then read the eigenvalues of a triangular matrix off its diagonal.
6. `c18-p6` *Vell's lines.* **Win:** test the candidate lines (1, 1, 1), (1, −1, 0), (1, 1, −2) under Vell's pulse and set their stretches 1, 0.5, 0.2 (Navigator); find them yourself (Commander).
7. `c18-p7` [S] Row reduce A first, then look for its eigenvalues: the answers change (row operations change eigenvalues).

**Aha.** Most arrows change direction; eigenvectors only stretch, shrink or flip. The stretches are the λ that make A − λI flatten space. A quarter turn keeps no real line, so its eigenvalues are complex: a turn and a stretch.

**Name it.** After p1: **eigenvector**, **eigenvalue** — "Most arrows change direction when the matrix moves them. Eigenvectors don't. They only get longer, shorter, or flipped." After p3: **characteristic polynomial**, **characteristic equation**, **eigenspace**. After p4: **complex eigenvalues**, **trace**. Coda to p3: the λ dial on the two-decimal model C₂ flattens at λ = 0, and the constellation's star "0 is an eigenvalue" lights. After p5: **algebraic multiplicity**.

**Briefing.** Check question: *Why do we need det(A − λI) = 0 rather than solving (A − λI)v = 0 directly?* Doubts: (F) "Every pulse has some line it doesn't turn." (F) "The zero arrow is an eigenvector of every matrix." (T) "The eigenvalues add up to the trace." Law frame: `λ is an EIGENVALUE of A EXACTLY WHEN A − λI is [SINGULAR / ZERO]`. **Procedure (LANTERN):** FORM A − λI → SET det = 0 → SOLVE FOR λ → FOR EACH λ FIND THE NULL SPACE OF A − λI → EXCLUDE THE ZERO ARROW. Missing "for each λ" makes LANTERN report one eigenvector only.

**So what.** Repeated multiplication by a matrix whose eigenvalues exceed 1 in size is why gradients explode in recurrent networks; your `power_iteration` swings an arrow onto the dominant line on the holotable.

**Build.** `eig2` (trace and determinant; complex roots returned as stretch and angle), `power_iteration`.

**Difficulty deltas.** Cadet: the sweep chimes near a line. Navigator: the characteristic polynomial typed. Commander: eigenvectors typed without the sweep; complex stretch and angle typed.

**Cue.** When you see "repeated", "stable direction" or "long run", think *eigenvectors*.

#### Ch 19 · "Where will everything be after fifty pulses?" — N21

**In short.** Where is a point after fifty pulses? Write it in the grid of lines that hold. Each part only stretches, so fifty pulses multiply each part by its stretch fifty times.

**Plot beat.** To argue with Vell, the crew needs forecasts far ahead without fifty multiplications.

**Signature mechanic.** The **repeat rail**: apply a matrix n times; **re-grid** switches to the eigenvector grid, where every step only stretches along the grid lines.

**Puzzles.**
1. `c19-p1` *Press five times.* V = [[0.75, 0.25], [0.25, 0.75]]. A debris cloud thins onto one line. Call it: (3, 1) after fifty pulses? **Win:** place the forecast at (2, 2), since (3, 1) = 2·(1, 1) + 1·(1, −1) with stretches 1 and 0.5; then run fifty pulses and land on it.
2. `c19-p2` [D] *Fifty as three moves.* **Win:** build V⁵⁰ on the rail as P D⁵⁰ P⁻¹ (translate–move–translate from Ch 17); the rail shows P D P⁻¹ · P D P⁻¹ · … with each inner P⁻¹P pair cancelling to I and vanishing.
3. `c19-p3` [H] [X8] *Diagonalise by hand.* A = [[3, 1], [0, 2]]. **Win:** typed P (columns (1, 0), (1, −1)), D = diag(3, 2), P⁻¹; then A¹⁰(1, 1) = 2·3¹⁰·(1, 0) − 2¹⁰·(1, −1) = (117074, 1024) with one power per direction. Subgoal: diagonalise Ch 18's 3 × 3 and give A⁴ = diag(16, 625, 625) in that grid.
4. `c19-p4` *Not enough lines.* **Win:** try to build P for the shear [[1, 1], [0, 1]] from its eigenvectors; both columns land on the one line, the rail rejects P (det 0), and the player pins that evidence. Card: the quarter turn is not diagonalisable with real numbers; it is diagonalisable with complex ones.
5. `c19-p5` *Two-site forecast.* [[0.9, 0.2], [0.1, 0.8]] starting at (1, 0). **Win:** forecast the long run (2/3, 1/3) from the eigenvector with stretch 1, and show the gap shrinking by 0.7 per step.
6. `c19-p6` [S] Fibonacci: [[1, 1], [1, 0]]⁵⁰ holds F₅₀ = 12,586,269,025; par: 10 or fewer products by repeated squaring; the ratio of neighbours settles at the larger stretch, 1.618.

**Aha.** In the eigenvector grid the move only stretches each axis. Repeating it repeats the stretching, so A^k = P D^k P⁻¹, and the largest stretch decides the long run.

**Name it.** After p2: **diagonalisation A = P D P⁻¹**, **diagonalisable**. After p4: **geometric multiplicity**. After p5: **discrete dynamical system**.

**Briefing.** Check question: *Why do the P⁻¹P pairs cancel in A^k?* Doubts: (F) "After fifty pulses everything ends up at the Anchor." (F) "Diagonalisable means invertible." ([[0, 0], [0, 1]]) (T) "A 2 × 2 matrix with two different eigenvalues can always be diagonalised." Law frame: `A^k = P D^k P⁻¹ BECAUSE [each P⁻¹P pair CANCELS / D is DIAGONAL]`. **Teo callback T3** follows.

**So what.** Fibonacci in O(log n) steps; counting walks of length k in a graph; whether a recurrent network's signal grows or fades. Vell's forecast (install) runs your `mat_pow`.

**Build.** `mat_pow` (repeated squaring), `diagonalise2`.

**Difficulty deltas.** Cadet: re-grid on by default. Navigator: P, D and P⁻¹ typed. Commander: forecasts committed blind.

**Cue.** When you see A¹⁰⁰ or "after n steps", think *re-grid first*.

#### Ch 20 · "Where do the drones settle?" — N22

**In short.** Where do the drones settle? At the arrangement one more hour leaves unchanged. Every other part of the arrangement shrinks away each hour.

**Plot beat.** The rescue will need at least 100 of the ark's 300 drones at the stern. Every hour drones move between Bow, Mid and Stern by fixed shares (TT14). Vell's crew counts on the same drones for his plan.

**Signature mechanic.** The **flow board**: three compartments with drone particles and bars; red share arrows between compartments (columns are "from", rows are "to").

**Puzzles.**
1. `c20-p1` *One hour.* **Win:** build the transition matrix from the shares so that 300 drones starting in the Bow become (240, 30, 30) after one hour; Call it the second hour: (204, 51, 45).
2. `c20-p2` [H] [X9] *Where it settles.* **Win:** solve (P − I) q = 0 on the row board, scale so the entries add to 300: (150, 90, 60); run 40 hours and watch the bars land on it.
3. `c20-p3` *Different starts.* **Win:** run from all-Bow, all-Stern and an even split; all three end at (150, 90, 60) (the Shake adds random starts).
4. `c20-p4` [D] *Why 1 is always an eigenvalue.* **Win:** drag the all-ones arrow through Pᵀ and see it come back unchanged (each column adds to 1, so Pᵀ1 = 1); then the λ dial on P flattens at λ = 1, because P and Pᵀ have the same characteristic polynomial (det(Pᵀ − λI) = det((P − λI)ᵀ)).
5. `c20-p5` *Design the rules.* Change only the Stern's "stay" share (leavers split evenly between Bow and Mid). **Win:** the smallest whole-percent value that settles at least 100 drones at the Stern: 80%, settling at (125, 75, 100) (79% gives 96.8).
6. `c20-p6` *The swap.* Two bays that trade all their drones every hour: [[0, 1], [1, 0]]. **Win:** run it and show it never settles (eigenvalue −1); then add a 10% stay share and show it settles.
7. `c20-p7` [S] Rank four ark terminals by where a reader following links settles, with a 15% jump (damping 0.85): C 0.394, A 0.373, B 0.196, D 0.038; par 13 steps of repetition.

**Aha.** Each column adds to 1, so no drone is lost. The settle point is an eigenvector with eigenvalue 1; the other eigenvalues (0.6 and 0.5 here) are smaller than 1, so their parts shrink away.

**Name it.** After p1: **probability vector**, **transition (stochastic) matrix**, **Markov chain**. After p2: **steady-state vector**. After p6: **regular chain**. Convention card: many CS texts use rows instead of columns (the transpose).

**Briefing.** Check question: *Why must a matrix whose columns sum to 1 have eigenvalue 1?* Doubts: (F) "Where they end up depends on where they start." (F) "Every chain settles." (T) "Steady state does not mean the drones stop moving." Law frame: `IF every COLUMN adds to 1 THEN [1 is an EIGENVALUE / the chain SETTLES]` (the Proving Ground breaks the second with the swap). **Procedure (LANTERN):** START ANYWHERE → APPLY P → RESCALE TO ADD TO 1 → REPEAT UNTIL THE CHANGE IS UNDER 0.001.

**So what.** PageRank is p7; the drone allocation (install) runs your `steady_state`.

**Build.** `steady_state` (your `power_iteration`, rescaled).

**[SP] Act VII set piece · The fiftieth pulse.** (Uses Acts IV, VI, VII.) Vell's pulse V = (1/60)·[[37, 7, 16], [7, 37, 16], [16, 16, 28]]. **Win:** (1) its three lines (Ch 18 p6); (2) write his cutter at (4, 2, 0) in that grid: (2, 1, 1) (Ch 17); (3) forecast fifty pulses: (2, 2, 2) (Ch 19); (4) its volume factor per pulse, det = 1 × 0.5 × 0.2 = 0.1, so 10⁻⁵⁰ after fifty (Ch 14); (5) where the drones he needs would be. Vell reads the forecast in silence, then stands down and lends his crew. Bonus line (Navigator+): his three lines are at right angles to each other; the reason waits in Ch 24.

**Act VII Review (Vell).** "Every real matrix has a real eigenvector." (F) · "Every matrix can be diagonalised." (F) · "The steady state of a regular chain does not depend on the start." (T) · "The eigenvalues of a triangular matrix are on its diagonal." (T).

**NumPy card VII.** `np.linalg.eig`, `np.linalg.matrix_power`.

**Act beat.** Ilse's pod docks. She is older than her logs, steady, useful. Vell's drones reroute to the stern.

**Difficulty deltas.** Cadet: the bars animate every hour. Navigator: the steady state typed from the row board. Commander: the design dial stays blind until commit.

**Cue.** When you see "fixed chances of moving between states", think *transition matrix, eigenvalue 1*.

---

### 6.10 Act VIII · Shadows (closest points)

Visual: low star light casting long orthographic shadows (the rendered shadows are drawn from the same projection the puzzles use, but the puzzle's numbers come from the maths library, never from the shadow map); the leaning horizon fixed in Ch 22.

#### Ch 21 · "What is the closest point we can reach?" — N23

**In short.** The point where the leftover arrow is at a right angle to everything we can reach.

**Plot beat.** Bram took the third thruster for the drones. The *Lantern* is back to its two original thrusters, which reach only the plane z = x + y. Wren parks the *Lantern* so the stern's tether hatch sits at (1, 1, 0) from the ship, the same arrow as the ark's signal on day one, off that plane. The tether is 1.2 long.

**Signature mechanic.** **DROP**: from a target, drop a perpendicular onto a line or plane; its foot glows; the leftover arrow gets a right-angle mark and snaps yellow when it is perpendicular.

**Puzzles.**
1. `c21-p1` *Onto a line.* a = (1, 2), b = (3, 1). **Win:** the closest point to b on the line through a: (1, 2); the leftover (2, −1) reads 0 against a.
2. `c21-p2` *Get close enough.* **Win:** park the *Lantern* at the closest point of z = x + y to the hatch: (1/3, 1/3, 2/3), distance 1.155 < 1.2. Wren: *"The point we couldn't reach on day one. Now we know how close we can get."*
3. `c21-p3` [D] *Sum of shadows, perpendicular basis.* The plane of u₁ = (1, 1, 0) and u₂ = (0, 0, 1) (perpendicular). Beacon (3, 1, 2). **Win:** add the two shadows: 2u₁ + 2u₂ = (2, 2, 2); the leftover (1, −1, 0) is perpendicular to both.
4. `c21-p4` *The trap.* Skewed basis (1, 0, 0) and (1, 1, 0); beacon (2, 3, 4). The game adds the two shadows and lands on (4.5, 2.5, 0). **Win:** drop the true perpendicular to (2, 3, 0) and draw the overlap between the two shadows that caused the error.
5. `c21-p5` [H] [X10] *Projection onto a plane, any basis.* a₁ = (1, 1, 0), a₂ = (0, 1, 1), b = (1, 2, 3). **Win:** typed AᵀA = [[2, 1], [1, 2]] (the old friend again), Aᵀb = (3, 5), weights (1/3, 7/3), point (1/3, 8/3, 7/3); the leftover (2/3, −2/3, 2/3) reads 0 against both columns.
6. `c21-p6` *Remove the hum.* Teo's signal s = (4, 3) carries the Anchor's hum along d = (0.6, 0.8). **Win:** keep only the part of s perpendicular to d: (1.12, −0.84) (the part along d is (2.88, 3.84)). His static drops a step.
7. `c21-p7` *Twice is once.* P = (1/5)·[[1, 2], [2, 4]], projection onto the line through (1, 2). **Win:** apply it twice and show the second application moves nothing; its determinant is 0 and the perpendicular line glows violet.
8. `c21-p8` [S] Build P = A(AᵀA)⁻¹Aᵀ for p5's plane and check P² = P and Pᵀ = P.

**Aha.** The shortest leftover arrow is perpendicular to the plane; any other point is further away, by Pythagoras. With a perpendicular basis, the projection is the sum of the shadows; with a skewed one it is not.

**Name it.** After p2: **orthogonal projection onto a subspace**. After p3: **orthogonal set**, **orthogonal basis**. After p5: **orthogonal complement W⊥**. After p7: **projection matrix**.

**Briefing.** Check question: *Why does the shortest error arrow have to be perpendicular to the plane?* Doubts: (F) "The closest point on the plane is straight up from the hatch." ((1, 1, 2) is 2 away) (F) "Adding the shadows works for any basis." (T) "Projecting twice lands on the same point as projecting once." Law frame: `The CLOSEST point is where the leftover is [PERPENDICULAR TO the plane / SHORTEST along z]`.

**So what.** p6 is how a direction is removed from word embeddings (projecting onto its orthogonal complement). The tether planner (install) runs your `project`.

**Build.** `project` (transpose, matmul, solve).

**Difficulty deltas.** Cadet: the right-angle snap. Navigator: AᵀA and Aᵀb typed. Commander: no snap; the projection typed exactly.

**Cue.** When you see "closest", "best approximation" or "component along", drop a perpendicular.

#### Ch 22 · "Can we build a square grid from a skewed one?" — N24

**In short.** Take the arrows one at a time; remove each one's shadows on the arrows already done; make it one unit long.

**Plot beat.** **The Drift.** Since the Collapse, LANTERN has updated its attitude by multiplying in small turns from a damaged gyro. Rounding has crept in. The horizon on the holotable has leaned a little more each chapter (0.4° per chapter from Ch 15, about 2.8° by now) and the star looks slightly egg-shaped. To set the Anchor precisely, LANTERN also needs a square frame built from the Anchor's skewed arms.

**Signature mechanic.** **SQUARE**: subtract each arrow's shadow on every finished arrow (Ch 4's shadow), then scale to length 1.

**Puzzles.**
1. `c22-p1` *Square up two.* b₁ = (3, 4), b₂ = (2, 1). **Win:** q₁ = (0.6, 0.8); remove b₂'s shadow 2·q₁ to get (0.8, −0.6), already length 1.
2. `c22-p2` [H] [X10] *Square up three.* (1, 1, 0), (1, 0, 1), (0, 1, 1). **Win:** (1, 1, 0)/√2, (1, −1, 2)/√6, (−1, 1, 1)/√3, every dot product under 10⁻⁹, built step by step with typed shadows.
3. `c22-p3` [D] *Coordinates by dot products.* A record written in the grid q₁ = (3/5, 4/5), q₂ = (−4/5, 3/5). **Win:** decode the point (5, 5) as (7, −1) with one dot product each; then show why: dotting x = c₁q₁ + c₂q₂ with q₁ removes every term but one, which is QᵀQ = I, so Q⁻¹ = Qᵀ.
4. `c22-p4` *Safe moves.* [[0.6, −0.8], [0.8, 0.6]], [[1, 0], [0, −1]], the shear, [[2, 0], [0, 0.5]], [[0, 1], [1, 0]], [[1, 1], [−1, 1]]. **Win:** apply each to the unit circle and a square; pin the ones under which the circle stays a circle and the square stays square (the first, second and fifth). [[2, 0], [0, 0.5]] keeps area but not lengths; [[1, 1], [−1, 1]] has perpendicular columns of length 1.41.
5. `c22-p5` *Fix the Drift.* LANTERN's attitude frame: column lengths 1.03, 0.98, 1.01; one pair at 88.6°. **Win:** re-square it; the horizon stands up and the star is round again.
6. `c22-p6` [H] *QR.* A with columns (1, 1, 0), (1, 0, 1). **Win:** Q from p2's first two arrows; R = QᵀA, upper triangular.
7. `c22-p7` [S] Nearly parallel (1, 10⁻⁸, 0) and (1, 0, 10⁻⁸): classical against modified Gram–Schmidt, measured by how far the result is from a right angle.

**Aha.** Subtract each arrow's shadows on the finished ones and what is left is at right angles to all of them. In a square unit grid each coordinate is one dot product, so the undo is the transpose.

**Name it.** After p2: **orthonormal set**, **orthonormal basis**, **Gram–Schmidt process**. After p4: **orthogonal matrix** (columns of length 1 at right angles). After p6: **QR factorisation**.

**Briefing.** Check question: *Why is QᵀQ = I when the columns are orthonormal?* Doubts: (F) "Any matrix with determinant 1 is a safe move." (F) "Perpendicular columns are enough." (T) "Gram–Schmidt keeps the plane the arrows span." Law frame: `QᵀQ = I EXACTLY WHEN the COLUMNS of Q are [ORTHONORMAL / PERPENDICULAR]`. **Procedure (LANTERN):** FOR EACH ARROW → SUBTRACT ITS SHADOW ON EACH EARLIER FINISHED ARROW → SCALE TO LENGTH 1. Missing "each earlier" leans the third arrow; missing "scale" leaves the grid square but stretched. **Teo callback T4** follows.

**So what.** Re-squaring rotations in games, drones and robots (p5, installed); a camera's right/up/forward frame; QR inside least-squares solvers.

**Build.** `gram_schmidt`, `qr` → the Drift fix runs at each chapter start.

**Difficulty deltas.** Cadet: shadows drawn automatically. Navigator: each shadow coefficient typed. Commander: the final orthonormal arrows typed exactly, with roots.

**Cue.** When a basis is skewed and you want easy coordinates, or a rotation drifts, think *Gram–Schmidt*.

#### Ch 23 · "What is the best answer when the readings disagree?" — N25

**In short.** No exact answer fits all the readings. The best one makes its predictions the closest point to the readings, and the leftover is at a right angle to everything the model can produce.

**Plot beat.** To undo the Collapse, the crew needs the pulse far past LANTERN's two decimals. The drones log before-and-after positions around the stern (TT17). Every reading carries noise; no matrix fits them all.

**Signature mechanic.** The **fit board**: each reading's vertical error is drawn as a literal square; the total area is the score. The **twin view**: the same problem in data space, where the readings are one arrow b and every prediction the model can make is a plane.

**Puzzles.**
1. `c23-p1` *Drag the line.* Times 0, 1, 2, 3; positions 1, 2, 2, 4. **Win:** a line within 1% of the smallest total square area; the exact best line is y = 0.9 + 0.9t.
2. `c23-p2` [D] *See the right angle.* Readings 1, 2, 4 at times 0, 1, 2 form one arrow b = (1, 2, 4) in data space; the columns (1, 1, 1) and (0, 1, 2) span the prediction plane. **Win:** drag a point in that plane to the closest spot, (5/6, 7/3, 23/6), where the leftover (1/6, −1/3, 1/6) reads 0 against both columns. That right angle is Aᵀ(b − A x̂) = 0, which rearranges to AᵀA x̂ = Aᵀb.
3. `c23-p3` [H] [X10] *Five readings by hand.* (0, 1), (1, 3), (2, 2), (3, 5), (4, 4). **Win:** typed AᵀA = [[5, 10], [10, 30]], Aᵀb = (15, 38), line y = 1.4 + 0.8t, total square area 3.6.
4. `c23-p4` *A curve through every point.* The stern sheet's drift from its anchor point over six hours: 412.0, 410.9, 410.1, 408.8, 408.1, 406.9. A degree-5 curve passes through all six. **Win:** forecast when the drift reaches 380 with the best line (y ≈ 411.98 − 1.006t, hour ≈ 31.8); the degree-5 curve's forecast for hour 10 (−316) is drawn as the trap.
5. `c23-p5` [SP] *Fit the Collapse pulse.* (Act VIII set piece; uses Acts III, IV, V, VIII.) **Win:** set up the 3 × 3 fit from 20 before-and-after pairs (each row of the pulse is a least-squares problem), solve it (Cadet: LANTERN solves the normal equations; Navigator: the player sets up A and b, LANTERN solves; Commander: via QR, typed or with your `qr`); the third column comes out (1, 1, 2.004).
6. `c23-p6` *What's left over.* LANTERN plots the fit's leftover against time. **Win:** mark the start and end of the part that is not random: groups of three short, three long, three short. Played as sound, they are taps on a hull.
7. `c23-p7` [S] Fit a parabola (three unknowns) to five readings; solve the same fit through QR and compare accuracy with the normal equations on nearly dependent columns.

**Aha.** When no mix of the columns hits b, take the closest point you can reach: project b onto the column space. The leftover is perpendicular to every column.

**Name it.** After p2: **least-squares solution x̂**, **residual**, **normal equations**. After p3: **line of best fit**.

**Briefing.** Check question: *What is perpendicular to what in least squares, and in which space?* Doubts: (F) "The best line goes through as many points as it can." (F) "Least squares makes the perpendicular distances to the line small." (it uses vertical distances; perpendicular distances are Ch 26) (T) "If the readings fit exactly, least squares returns that exact answer." Law frame: `The RESIDUAL is PERPENDICULAR to [EVERY COLUMN of A / the line]`.

**So what.** Linear regression is least squares; gradient descent on squared error reaches the same answer; looking at residuals is how you find what a model missed (p6). The Collapse fit and the residual plot (install) run on your `least_squares`, so the knock appears in your own residuals.

**Build.** `least_squares` (normal equations; QR on Write).

**Act VIII Review (Ilse).** "A curve through every reading is the best fit." (F) · "Gram–Schmidt changes the plane the arrows span." (F) · "Projecting twice moves the point further." (F) · "The residual is perpendicular to every column." (T).

**NumPy card VIII.** `np.linalg.lstsq`, `np.linalg.qr`.

**Act beat · The Residual.** Wren hears it before LANTERN finishes the sentence. *"That's him. That's how we used to knock on the bunk wall."* Teo is alive inside the stern.

**Difficulty deltas.** Cadet: the best line appears as a ghost after the first drag. Navigator: the normal equations typed. Commander: the fit solved through QR; the residual pattern marked without the audio cue.

**Cue.** When you see "more equations than unknowns" or "noisy data", think *least squares*.

---

### 6.11 Act IX · Singular (the shape of data)

Visual: the stern braced with glowing struts along its principal axes; ellipses and ellipsoids from circles and spheres; the unfold over twenty seconds; the cracked Anchor.

#### Ch 24 · "Which moves only stretch along perpendicular axes?" — N26

**In short.** Moves whose matrix equals its own transpose. In those axes a height formula has no mixed term, so the signs of the stretches tell a bowl from a saddle.

**Plot beat.** Before any unfold, the stern must be braced along its main stress lines. The *Lantern* must hold position beside the stern, and a spinning ship holds steadier.

**Signature mechanic.** **DESCEND**: the surface z = xᵀAx over the plane; release a probe and it rolls. The survey grid can be turned; a readout shows the mixed (xy) term.

**Puzzles.**
1. `c24-p1` [D] *Stress lines, and why they are perpendicular.* S = [[3, 1], [1, 3]]. **Win:** brace along (1, 1) × 4 and (1, −1) × 2, at right angles. Bram shakes five random symmetric matrices: always perpendicular. A = [[4, 1], [2, 3]] from Ch 18: its lines (1, 1) and (1, −2) are not. Then the reason, built step by step: λ(v·w) = (Av)·w = v·(Aᵀw) = v·(Aw) = μ(v·w), so with λ ≠ μ, v·w = 0. *"Five cases were evidence. This is the reason."*
2. `c24-p2` *Turn the grid.* E(x) = xᵀ[[2, 1], [1, 2]]x = 2x² + 2xy + 2y². **Win:** turn the survey grid until the xy term reads 0 (45°): E = 3u² + v².
3. `c24-p3` [X11] *Bowl or saddle.* [[1, 2], [2, 1]], eigenvalues 3 and −1. Call it, then release a probe. **Win:** start the probe so it escapes along (1, −1); then on [[3, 2], [2, 3]] (the matrix of 3x² + 4xy + 3y², with the cross-term coefficient split in half; eigenvalues 5 and 1) find the lowest point.
4. `c24-p4` [H] [X11] *Orthogonally diagonalise, with a repeated eigenvalue.* S = [[2, 1, 1], [1, 2, 1], [1, 1, 2]]: eigenvalues 4 along (1, 1, 1) and 1 on the whole plane x + y + z = 0. **Win:** pick two perpendicular eigenvectors inside that plane with Gram–Schmidt ((1, −1, 0)/√2 and (1, 1, −2)/√6), build Q and check Q D Qᵀ = S and S = Σ λᵢ qᵢqᵢᵀ.
5. `c24-p5` *Highest and lowest on the circle.* **Win:** drag a probe around the unit circle under E = xᵀ[[2, 1], [1, 2]]x and stop at the largest value, 3 at (1, 1)/√2, and the smallest, 1 at (1, −1)/√2: the largest and smallest eigenvalues.
6. `c24-p6` *The Flip.* The *Lantern*'s inertia matrix (TT19): axes (1, 1, 0) with 2, (1, −1, 0) with 6, (0, 0, 1) with 9. **Win:** choose a spin axis and hold it for ten simulated minutes (rigid-body Euler equations, RK4). Spinning about the middle axis, (1, −1, 0), holds for a while, then the ship flips end over end, and back. Players who pick it see the Flip; the win needs the largest or smallest axis. One-line reason: the middle eigenvalue.
7. `c24-p7` [S] Negative definite and semidefinite surfaces; a 3 × 3 form's lowest point.

**Aha.** A symmetric matrix stretches along perpendicular axes: turn, stretch, turn back (Q D Qᵀ). In those axes a quadratic form has no mixed term, and the signs of the eigenvalues say bowl, saddle or upside-down bowl. The value one unit out along an eigenvector is its eigenvalue.

**Name it.** After p1: **spectral theorem**, **orthogonally diagonalisable**. After p2: **quadratic form**, **principal axes**. After p3: **positive definite**, **negative definite**, **indefinite**, **positive semidefinite**. After p4: **spectral decomposition**.

**Briefing.** Check question: *Why are eigenvectors of a symmetric matrix with different eigenvalues perpendicular?* Doubts: (F) "Positive entries mean a bowl." (F) "Every real matrix has real eigenvalues." (T) "On the unit circle, xᵀSx is never larger than S's largest eigenvalue." Law frame: `A SYMMETRIC matrix's EIGENVECTORS for DIFFERENT EIGENVALUES are [PERPENDICULAR / PARALLEL]`.

**So what.** A positive definite Hessian marks a minimum; saddle points slow neural-network training; covariance matrices (Ch 26) are symmetric. The brace planner (install) runs your `sym_eigen`; Vell's symmetric pulse from Act VII is named again.

**Build.** `quad_form`, `sym_eigen` (power iteration plus removing each found layer).

**Difficulty deltas.** Cadet: the surface's eigenvector axes drawn. Navigator: the form's matrix and eigenvalues typed. Commander: the classification committed before the surface appears.

**Cue.** When you see a symmetric matrix, xᵀAx or "energy", think *perpendicular eigenvectors and their signs*.

#### Ch 25 · "What does any matrix do to a circle?" — N27

**In short.** It turns some perpendicular pair of arrows into another perpendicular pair, stretched. So any matrix is a turn, a stretch along axes, and a turn. The biggest stretches carry most of the picture.

**Plot beat.** The crew must see the Collapse pulse in its plainest form, and Teo's voice must come through a thin channel.

**Signature mechanic.** **UNFOLD**: turn a perpendicular input cross until its outputs are also perpendicular. **LAYER**: rebuild a picture one rank-one layer at a time with a k slider and a storage counter.

**Puzzles.**
1. `c25-p1` *Circle to ellipse.* C = [[3, 0], [4, 5]]. **Win:** turn the input cross until both outputs are perpendicular: inputs (1, 1)/√2 and (1, −1)/√2; images of length √45 ≈ 6.71 and √5 ≈ 2.24 along (1, 3) and (3, −1); their product is 15 = |det C|.
2. `c25-p2` [D] *Where the axes come from.* **Win:** build CᵀC = [[25, 20], [20, 25]] (symmetric, so Ch 24 applies), find its eigenvalues 45 and 5 (the squared stretches) and eigenvectors; then show C v₁ · C v₂ = v₁ᵀ CᵀC v₂ = 5 (v₁·v₂) = 0. That is why the images are perpendicular.
3. `c25-p3` *Three moves.* **Win:** build C on the rail as turn (Vᵀ), stretch along the axes by 6.71 and 2.24 (Σ), turn (U): the circle stays a circle, becomes an upright ellipse, then tilts into place.
4. `c25-p4` [H] [X11] *SVD by hand, non-square.* A = [[1, 1], [0, 1], [1, 0]] (3 × 2). **Win:** typed AᵀA = [[2, 1], [1, 2]] (the old friend), σ = √3 and 1, v₁ = (1, 1)/√2, v₂ = (1, −1)/√2, u₁ = (2, 1, 1)/√6, u₂ = (0, −1, 1)/√2.
5. `c25-p5` *Teo's voice, layer by layer.* LANTERN receives Teo's voice as a 64-row spectrogram. **Win:** rebuild it from k = 1, 2, 4, 8, 16, 32, 64 rank-one layers σ u vᵀ and stop at the smallest k where his words are clear (the cliff in his singular values); the storage counter reads k × (rows + columns + 1). Then keep only C's first layer and measure the error: √5.
6. `c25-p6` *The Collapse pulse, exactly.* LANTERN runs the decomposition on the fitted pulse (with your `svd` if you wrote it): *"Stretches: 3.00, 1.00, 0.00."* **Win:** press *Show more decimals*: 3.002670, 1.000000, 0.001333. Set the stern-thickness readout to 1/750 of its old thickness, not 0. The constellation's star "smallest singular value is 0" stays dark for this pulse and lights for C₂.
7. `c25-p7` [S] Pseudoinverse: V Σ⁺ Uᵀ gives the shortest least-squares answer even with dependent columns.

**Aha.** Every matrix turns, stretches along perpendicular axes, and turns again. A zero stretch flattens; a tiny stretch squashes thin, and the space is still there.

**Name it.** After p1: **singular values**, **left and right singular vectors**. After p3: **singular value decomposition A = U Σ Vᵀ**. After p5: **rank-one matrix**, **low-rank approximation** (A = Σ σᵢ uᵢ vᵢᵀ; keep the k largest). In the set piece: **condition number**, **pseudoinverse**.

**Briefing.** Check question: *Why are the vectors A vᵢ perpendicular to each other?* Doubts: (F) "Singular values are the eigenvalues." (C's eigenvalues are 3 and 5; its singular values are 6.71 and 2.24) (F) "The SVD only exists for square matrices." (T) "For a square matrix, the singular values multiply to |det|." Law frame: `The best rank-k picture keeps the k [LARGEST / FIRST] layers`. **Teo callback T5** comes before the set piece.

**So what.** Image and model compression, recommender systems, LoRA. Your `low_rank` rebuilds Teo's voice; your `svd` shows the decimals.

**Build.** `svd` (on your `sym_eigen` of AᵀA, then uᵢ = A vᵢ / σᵢ), `low_rank`.

**Act beat.** Vell: *"Zero is zero."* The player puts the decimals on the main screen. Bram, quietly: *"Thin. Not gone."*

**[SP] Act IX set piece · Thin, Not Gone (the Unfold).** (Uses Acts IV, V, VI, VII, VIII, IX.)
1. **Try it raw.** Build the inverse from 0.01-noise readings and apply it to a test cluster of buoys. Call it: how far off? **Win:** the cluster lands about 7.5 off along one axis (0.01 × 750). **Name it:** **condition number** σ_max/σ_min ≈ 2,252.
2. **Try the exact model.** Undo the two-decimal model C₂: no inverse exists (LANTERN: *"No inverse. Rank 2."*). Its pseudoinverse brings the stern back as a sheet with its (1, 1, −1) part set to zero. **Win:** pin the comparison card: *"Exactly zero: gone, by anyone. Tiny: still there, under noise multiplied by 750."* **Name it:** **pseudoinverse**.
3. **Clean the readings.** Averaging N readings divides the noise by √N; the frame tears if any point lands more than 0.3 off. **Win:** N = 625 from 0.01 × 750 / √N ≤ 0.3; the drones (Ch 20) take them while Teo holds still (T5).
4. **Brace.** **Win:** set the stern's braces along the principal axes of its stress matrix (Ch 24).
5. **Write it for today, in the Anchor's grid.** The stern was flattened before Act VI's quarter turn R, so in today's frame the Collapse reads R C R⁻¹: the same stretches, because turning the frame does not change them (Ch 17). **Win:** the undo R C⁻¹ R⁻¹, converted into the Anchor's grid as P⁻¹ R C⁻¹ R⁻¹ P (TT22); two spires reach out past 600 while the third stays at length 1.
6. **Unfold.** Commit. **Win:** the stern's hull error is within tolerance, graded from the player's N and settings. Over twenty seconds the stern fills back out of a sheet under the true inverse (animated on a path that never flattens, §11.3). The music regains its third voice. Teo's voiceprint resolves: *"Wren? Why is everyone so loud?"*
7. [S] *Two gentler pulses.* Split the inverse into two pulses, each stretching at most √750 ≈ 27.4. Bram: *"Good to know. The spires are already set."*

**Act IX Review (Ilse, after the Unfold).** "A tiny determinant means no inverse." (F) · "Singular values can be negative." (F) · "The condition number says how much a solver can multiply errors." (T) · "For a symmetric matrix with positive eigenvalues, the singular values are the eigenvalues." (T: the Collapse pulse itself).

**NumPy card IX.** `np.linalg.svd`, `np.linalg.pinv`, `np.linalg.cond`.

**Difficulty deltas.** Cadet: the input cross snaps to the answer within 5°. Navigator: AᵀA and the singular values typed. Commander: U, Σ and V typed for the 3 × 2.

**Cue.** When you see "compress", "approximate with fewer numbers" or "how unstable is this inverse", think *SVD*.

#### Ch 26 · "What should we keep?" — N28

**In short.** Which directions in a cloud of data matter? The ones along which the centred cloud spreads most. Keep a few of them and you keep most of the shape.

**Plot beat.** The 750× pulse cracked the Anchor. It will go dark within the hour. Its core holds a record: 10,000 entries of 12 numbers. The *Lantern* can send two numbers per entry before the core fails. Which two?

**Signature mechanic.** **SPREAD**: turn a line (or plane) through a cloud; two readouts move together, the spread of the shadows and the total squared perpendicular distance, and they always add to the same total.

**Puzzles.**
1. `c26-p1` *The widest shadow.* A 2D cloud of 200 points. **Win:** turn the line to the most spread; the two readouts always add to the same total, by Pythagoras, so most spread and least perpendicular error are the same line. Then a tilted 3D pancake of 500 points (spread about 5, 2 and 0.1): turn the viewing plane to within 95% of the largest spread.
2. `c26-p2` *Centre first.* An off-centre cloud. **Win:** see the "best" direction point at the cloud, not along it, and fix it by dragging the origin to the mean.
3. `c26-p3` [D] *Why an eigenvector.* The spread along a unit direction w is wᵀCw: a quadratic form (Ch 24). **Win:** with C = [[4, 2], [2, 3]], drag w around the unit circle to the largest value, about 5.56 out of a total of 7 (79%), and see it is the top eigenvector; these directions are also the right singular vectors of the centred data (Ch 25).
4. `c26-p4` [H] *By hand.* Four readings (6, 6), (2, 4), (5, 7), (3, 3). **Win:** typed mean (4, 5); centred rows (2, 1), (−2, −1), (1, 2), (−1, −2); covariance (1/3)·[[10, 8], [8, 10]]; eigenvalues 6 and 2/3; first principal direction (1, 1)/√2 keeping 90%; the four projected values ±3/√2.
5. `c26-p5` *How many to keep.* The record's twelve singular values (TT18). **Win:** the fewest components that keep 95% of the squared total: 2 (96.4%).
6. `c26-p6` *Send it.* **Win:** project the record onto two components and transmit. The points form a spiral of star positions with one path marked through them. The third component is not sent; nobody on the receiving end can rebuild it.
7. `c26-p7` [S] Two groups that the first direction does not separate: choose the second direction and say why (PCA finds spread, not labels).

**Aha.** The directions of most spread are the eigenvectors of the covariance matrix, the same directions the SVD finds. Keep the biggest few and you keep most of the shape. Least squares used vertical distances; this uses perpendicular ones.

**Name it.** After p2: **mean-centring**. After p3: **covariance matrix**, **principal component**. After p5: **explained variance**, **principal component analysis**, **dimensionality reduction**.

**Briefing.** Check question: *Why is the direction of largest spread an eigenvector of the covariance matrix?* Doubts: (F) "Keep the two biggest columns of the data." (F) "PCA fits data the way least squares does." (T) "Without centring, the first direction points toward the mean." Law frame: `The FIRST principal component is the EIGENVECTOR of the [COVARIANCE matrix / data matrix] with the LARGEST eigenvalue`. **Procedure (LANTERN):** CENTRE → COVARIANCE → EIGENVECTORS SORTED BY EIGENVALUE → KEEP k → PROJECT. Missing "centre" sends the first direction toward the mean.

**So what.** PCA is the first tool for seeing high-dimensional data; the student's own digits map on the AI Field Explorer site is one. The transmission (install) is projected by your `pca`.

**Build.** `covariance`, `pca`.

**Difficulty deltas.** Cadet: the spread readout ghosts the best line. Navigator: the covariance matrix typed. Commander: k chosen from the singular values without the cumulative bar.

**Cue.** When you see "too many dimensions" or "most of the variation", think *PCA*.

---

### 6.12 Epilogue · "Every point stays where it is"

- **c27-p1 The last setting.** Ilse sets the spires one last time. **Win:** check her setting on the spire bench: the identity. Card: P I P⁻¹ = I: the one matrix that reads the same in every grid. She locks it. The final pulse fires and nothing moves. The music is a single chord that does not change.
- **The Broadcast** (§4.8): the chain, Ilse's six questions, Down to the arrows, export.
- **c27-p2 [S] The layer (AI bridge, optional).** In the record's principal coordinates, one class of points forms a blob of radius at most 1 and another a ring of radius 2 to 3 around it. **Win:** first show that no single matrix plus one straight cut separates them (Ch 12 p6); then W = [[1, 0], [−1, 0], [0, 1], [0, −1]], set every negative entry to zero, and add the four outputs: |x| + |y|. A threshold of 1.7 separates them (blob ≤ 1.42, ring ≥ 2). **Name it:** **layer**, **weights**, **bias**, **ReLU**. Build: `relu`, `dense`.
- **Ending.** The *Meridian* wakes. Vell: *"Two numbers per entry. It will have to be enough."* The camera drifts across the bridge plates. Credits roll over the player's Field Manual.
- **Post-credits.** Ilse, looking at the record's third component, spread 1.5: *"This one isn't noise either."*

---

### 6.13 Curriculum node → chapter mapping (every node covered)

| Node | Chapter | Core puzzles | Folded items (curriculum §1) and where they live |
|---|---|---|---|
| N01 Vectors as displacements | 1 | c01-p2, p4, p5, p6 | Q − P (p4); length by Pythagoras in 2D and 3D (p6); ℝⁿ (card: a 784-part image) |
| N02 Adding and scaling | 1 | c01-p1–p4 | midpoint and P + t(Q − P) (p4); negative scalar (p3); parallel (p3) |
| N03 Combinations and span | 2 | c02-p1–p6 | is b in the span, find the weights (p4); span as point, line, plane (p6); a vector not in the span (p5) |
| N04 Independence | 3 | c03-p1–p5 | dependence relation (p1); more than n vectors are dependent (p5); zero vector (Doubt) |
| N05 Dot product | 4 | c04-p1–p6 | unit vector, length, angle (p4); projection onto a line and splitting into parallel and perpendicular parts (p6; again c21-p6); Cauchy–Schwarz (p7 [S]) |
| N06 Cross product | 5 | c05-p1–p6 | triangle area (p4); right-hand rule (p2); normal to the plane through three points (p4) |
| N07 Triple product | 6 | c06-p1–p6 | tetrahedron 1/6 (p4, p6); four coplanar points (p4); find k (p3); cyclic order (p7 [S]) |
| N08 Lines and planes | 7 | c07-p1–p6 | line–plane (p4); point–plane and point–line distance (p5); skew lines and their distance (p2); line of intersection and angle between planes (p6) |
| N09 Systems, the picture | 8 | c08-p1–p5 | three cases (p2–p4); never two (p3); column picture (p1); word problems (p5) |
| N10 Augmented matrix, REF, pivots | 9 | c09-p1–p6 | parameter questions (p5); consistency (p3, p5); partial pivoting (p7 [S]) |
| N11 RREF, free variables | 10 | c10-p1–p6 | homogeneous systems and particular + homogeneous (p6); parameters in 3 × 3 (p5) |
| N12 Linear transformations | 11 | c11-p1–p3, p6 | matrix types (p7 [S]); translation is not linear and the linearity test (p3) |
| N13 Matrix–vector product | 11 | c11-p1, p5 | m × n sizes, A eⱼ, A x = b (p5 and Briefing) |
| N14 Composition, transpose | 12 | c12-p1–p6 | transpose by the dot-product rule and (AB)ᵀ (p4); symmetric (p4); AB = 0 (p5); identity (p2) |
| N15 Inverse | 13 | c13-p1–p6 | [A \| I] with elementary matrices (p4); A X = B (p4); (AB)⁻¹ (p5); 2 × 2 formula (Name it); LU (p7 [S]) |
| N16 Determinant | 14 | c14-p1–p6 | ad − bc from the box (p2); det(AB), det(kA) (p3); cofactor 3 × 3 and 4 × 4 (p4); row-reduction method and find k (p5); Cramer (p7 [S]) |
| N17 Subspaces, Col, Nul | 15 | c15-p1–p6 | one-to-one and onto (p2, p4); subspace test (p5); null space perpendicular to the rows (p5) |
| N18 Basis, dimension, rank | 16 + Act V set piece | c16-p1–p6, SP-V | row space, left null space, four subspaces, Invertible Matrix Theorem (SP-V, §4.7); abstract vector spaces (p5); extend to a basis (p7 [S]) |
| N19 Coordinates, change of basis, similar | 17 | c17-p1–p6 | P_{C←B} (p3); similarity invariants (p6) |
| N20 Eigenvalues, eigenvectors | 18 | c18-p1–p6 | complex eigenvalues as turn and stretch, trace and det checks (p4); triangular (p5); multiplicity (p5) |
| N21 Diagonalisation | 19 + Act VII set piece | c19-p1–p5, SP-VII | A^k (p3); not diagonalisable (p4); dynamical systems (p5); Fibonacci (p6 [S]) |
| N22 Markov chains | 20 | c20-p1–p6 | why eigenvalue 1 (p4); swap chain and regularity (p6); PageRank and power iteration (p7 [S], Procedure) |
| N23 Orthogonal projection | 21 | c21-p1–p7 | orthogonal basis sum and its failure for a skewed basis (p3, p4); W⊥ (p5); projection matrices (p7, p8 [S]) |
| N24 Orthonormal bases, Gram–Schmidt, QR | 22 | c22-p1–p6 | orthogonal matrices (p4); Q⁻¹ = Qᵀ (p3); QR (p6); drift (p5) |
| N25 Least squares | 23 | c23-p1–p6 | normal equations from the right angle (p2); by hand (p3); overfitting (p4); QR route (p5, p7 [S]) |
| N26 Symmetric matrices, quadratic forms | 24 | c24-p1–p6 | definiteness (p3); constrained max and min on the unit circle (p5); repeated eigenvalue and spectral decomposition (p4) |
| N27 SVD, low rank | 25 + Act IX set piece | c25-p1–p6, SP-IX | AᵀA and why the A vᵢ are perpendicular (p2); non-square (p4); rank-one layers (p5); condition number and pseudoinverse (SP-IX) |
| N28 PCA | 26 | c26-p1–p6 | centring (p2); covariance as a quadratic form (p3); explained variance (p4, p5); PCA against regression (p1, Doubt); spread, not labels (p7 [S]) |

The full by-hand and exam-pattern coverage matrix is Appendix B.

---

## 7. Difficulty: three independent settings

All three settings are switchable per chapter at any time, from the pause menu or the chapter card. Changing a setting never resets progress. Stars record the level they were earned at. **Content is the same at every level**: difficulty changes parameters on one puzzle definition (snap, preview, assist, tolerance, typed steps, number range of seeded puzzles), never 2D-only or 3D-only variants and never level-only content. Story numbers are fixed at every level.

### 7.1 Maths depth (the curriculum's See / Compute / Prove)

| Parameter | **Cadet — see it** | **Navigator — compute it** (default) | **Commander — prove it** |
|---|---|---|---|
| Snap step | 1 | 0.5 | none (free; type exact values) |
| Win tolerance | ±0.05 when snapping, ±0.1 otherwise | ±0.05 | ±0.01; typed values exact |
| Result preview | live ghost while dragging | ghost after a Call it or after the first commit | none; blind commit; commits count against par |
| [H] by-hand arithmetic | LANTERN computes every intermediate; the player chooses the operations | the player types each intermediate; LANTERN checks each step as it is typed | the player types; LANTERN checks only the final answer |
| [D] derivation | watch, plus one drag | complete with typed steps | assemble the steps from shuffled tiles, then write the last line; counts toward the **Proved** mark |
| Seeded number range | small integers | integers, halves, simple fractions | wider range, fractions, decimals |
| Hints | after a miss: nudge, then picture, then Show me offered | on request (three tiers) | on request; any hint clears the "no hints" star |
| The Shake | 2 random cases | 5 random + 1 curated edge case | 10 random + every curated edge case |
| Law frame | two open slots | all slots | all slots; the condition slot must be filled |
| Reason step | pick the matching reason card | complete the reason | write it, then compare with Ilse's line |
| Procedures | after a failure, LANTERN highlights the kind of step that was missing | tiles | tiles plus decoy tiles (misconception steps) |
| Field Manual | free text; Help me start available | free text; Help me start available | free text; key-idea self-check needed for the Explained mark |
| Par | generous, shown | move par | tight par, plus "no fractions" and "no hints" stars |
| Test swarm (if coding) | 20 cases | 100 cases incl. zero vectors, parallel arrows, singular matrices | 300 cases incl. near-singular matrices, tolerances and timing |

**What "university level" needs.** Each node gets an **Exam-ready** mark in the Field Manual only when its [H] and [D] puzzles have been solved at Navigator or Commander. Cadet alone shows the pictures; it cannot earn Exam-ready. The mark is information, never a gate.

### 7.2 Code help (independent)

| Setting | Build beats |
|---|---|
| **Off** | Build beats are listed but folded; the world runs crew versions. |
| **Assemble** | Parsons puzzles with up to two misconception decoys. |
| **Fill** | 2–5 blanks. |
| **Write** | Empty body plus a docstring prompt. |

The first build beat (Ch 1) asks which mode to use, with Off as an equal choice. It can be changed per chapter or per function.

### 7.3 Assists (independent toggles)

Snapping (overrides the level), live preview (overrides), arithmetic assist (overrides), number pad for every value, slower animations, larger handles, alternative colour palette (shape cues are always on), reduced motion (no shake, no depth of field, shorter cuts), subtitles (on by default), text size up to 150%, voice on or off, auto-advance dialogue, high-contrast HUD.

---

## 8. Progression and rewards that never gate

### 8.1 What the player earns

| Reward | Earned by | What it changes |
|---|---|---|
| **Puzzle stars**: Solved, Par, Called it | solving, solving at par, a prediction within tolerance | Bram's banter, the plate count, cosmetics |
| **Chapter marks**: Explained, Built, Proved | finishing the Briefing; a function passing its swarm; the [D] step plus a Proven Law at Commander | a ring on the chapter in the chapter list |
| **Exam-ready** (per node) | [H] and [D] at Navigator or Commander | shown in the Field Manual and exported study guide |
| **Case Board** | story questions close as chapters answer them | the board fills in |
| **Bridge plates** | each Proven Law | the bridge's ring of plates fills with the player's sentences (DOM/CSS2D) |
| **Constellations** | linking Invertible Matrix stars (§4.7); fainter threads T1, T7, T9 | the holotable dome |
| **Library constellation** | each function written | a star per function; the credits list each with the first line of its docstring |
| **Cosmetics** | stars | *Lantern* hull liveries and holotable themes in non-maths hues (never green, red, blue, yellow or violet), voiceprint styles, music stems in the bridge jukebox |
| **Exports** | at any time | Field Manual (Markdown, HTML, PDF), your lecture (HTML), `lantern.py`, tests, Colab notebook |

### 8.2 Always available from minute one

- **Chapter list** (DOM): every chapter, its plain question, its marks; story order shown as a faint path. Out-of-order openings play the catch-up card (§3.4).
- **Sandbox**: every instrument on the holotable, no goals.
- **Viva**: every Doubt and Review claim in random order, filterable by act; no puzzles. For exam revision.
- **Survey runs** (§8.3).

### 8.3 Survey runs (unlabelled, interleaved practice)

- Seeded generators for the twelve exam patterns (Appendix B), set in the Fold: *"Clamps at (0, 0, 0), (1, 2, 3), (2, 1, 0), (3, 3, 4). Will the shuttle latch?"* The problem never names the method.
- The player picks a tool (an instrument, or one of their functions) or works by hand. If the tool answers a different question, the game says what it did answer: *"The angle tool gives the angle between two clamp arrows. It does not tell you whether four clamps lie on one plane."*
- Topics mix every chapter played so far; older topics come back after a gap.
- Each correct routing adds a line to the player's own **cue list** ("When you see ___, think ___"), which merges with Field Manual slot 4.
- Worked solution one click away. No timers.

No timers, no locks, no score that blocks anything, anywhere.

---

## 9. Visual direction

### 9.1 The one idea: space you can see bend

The grid of light is the art. Every deformation on screen is the actual matrix applied to actual vertices in a shader. The game must look tier-1 from the first second: the cold open is full quality, 3D, cinematic. The flat top-down view of Act I is short (about 25 minutes) and visually rich (nebula light, bloom, debris, the reach glow) and the player has already seen the full 3D world before it.

### 9.2 Palette and reservations

| Use | Colour | Shape cue (always on) |
|---|---|---|
| Background | ink blue to near-black #05070d → #0b1220, cool nebula | — |
| Lattice | pale cool white, low alpha, bloom | thin points |
| **v**, first column, input | green #3ddc84 | solid shaft, triangular head, label **v** / **a₁** |
| **w**, second column, weights | red #ff5a5f | dashed shaft, diamond head, label **w** / **a₂** |
| **u**, third column | blue #4da3ff | dotted shaft, square head, label **u** / **a₃** |
| Result (A x, v + w, projection, solution) | yellow #ffd23f | double shaft, double head |
| Grid arrows before a move (e₁, e₂, e₃) | neutral grey #8f9bb3 | thin, labelled |
| Null space (anything sent to the origin) | violet #b18cff, only here | hatched glow that slightly darkens its surroundings |
| Unit square / cube (determinant) | frosted white #e8f0ff at 22% with a white edge; back face cross-hatched | — |
| Any second grid (the Anchor's, the eigenvector grid) | copper #c9844f | dashed lines |
| Leftover / residual / error arrows | white | dashed, with a right-angle mark |
| LANTERN and HUD | cyan #59e1ff | — |
| Story UI | desaturated blue-greys #8a96ad | — |

Green, red, blue, yellow and violet appear nowhere else in the 3D scene or the HUD: no green suits, no red alarms (alarms are amber #ffb347), no yellow stars. Speaker accent colours (§2.2) appear only on name plates, voiceprints and suit stripes, never on arrows or grids. **Alternative palette** (toggle): v #009e73, w #d55e00, u #56b4e9, result #f0e442, null space #cc79a7; the shape cues and labels never change.

### 9.3 Shaders and rendering

- **The frame uniform.** One shared vertex-shader chunk used by the lattice, debris, the ark hull, the stern and the Anchor. Every pulse, the Collapse and the Unfold apply the real matrix to real vertices. Flattening is the same shader with a rank-deficient matrix.
- **Honest interpolation** (§11.3): a move is animated on a path that never shows a flattening the matrix does not have. Turns animate by angle; the routine pulse animates as P R(θ) P⁻¹; reflections in 2D animate as a half-turn through 3D about the mirror line; 3D reflections are a labelled two-stage swap; compositions animate stage by stage, right-hand matrix first.
- **Infinite grid shader.** A full-screen fragment shader maps each pixel back through A⁻¹ and draws lines where the result is near a whole number, anti-aliased with screen-space derivatives. A singular A is drawn as its image line or plane.
- **The flatness effect.** When rank drops, the crushed direction compresses with thin-film interference colours along the sheet's edge, a pressure-drop sound and one music voice leaving. The same effect plays at every node of thread T3: the Collapse, the λ dial, singular matrices, zero triple products.
- **Pulse front.** A spherical shockwave with screen-space refraction; chromatic fringe only on pulses.
- **Reach glow.** An accumulation buffer that keeps every point the yellow tip has visited.
- **Crystal box.** Distinct inside and outside faces, so orientation flips are visible.
- **Holograms.** Fresnel rim, scanlines, slight flicker: the holotable, voiceprints, LANTERN's scans.
- **Sky.** Layered fBm nebula on a sky sphere; a soft glow around the star.
- **Shadows in Act VIII.** The sun's shadow camera is orthographic, so rendered shadows are drawn by the same projection the puzzles teach. Puzzle numbers always come from the maths library, never from the shadow map.
- **Post.** Bloom, ACES tone mapping, SMAA, light grain and vignette; depth of field and letterbox only in cinematics.

### 9.4 Scenes per act

| Act | Place | Look |
|---|---|---|
| Prologue | Approach to the Anchor | the *Meridian* in nebula light (cold open); the lattice blooming; the first pulse |
| I | Debris field near the Anchor | top-down lattice, debris, reach glow; first tilt into 3D at c02-p6 |
| II | Outside the *Meridian* | box-frame hull, the triangular hangar door, the star low on the horizon |
| III | Inside the dark ark | LANTERN's scan: planes of light in a void, a flashlight cone, the row board |
| IV | Under the Anchor | spires glowing green, red, blue at their tips; the lattice moving; the Collapse |
| V | Beside the stern sheet | a thin sheet edge-on to the star; the debris pile at the origin; violet glow; Vell's cutter |
| VI | The Anchor's grid | copper dashed grid over white; the core's light; the ark swinging clear |
| VII | The field around the ark | drone swarms, the flow board, held notes |
| VIII | Long shadows | low star, orthographic shadows; the horizon set upright |
| IX | The stern | braces along principal axes; ellipses from circles; the unfold; the cracked Anchor; the record's spiral |
| Epilogue | The bridge | a still, square lattice; the plates; the sleepers waking |

### 9.5 UI style

- **HUD minimal.** Always visible: top-left the chapter question and the goal line; top-right **Show me**, **Skip**, **Call it** and the star/par strip. Bottom: the instrument tray for the current puzzle only. Right edge: the live formula panel next to the picture, coloured to match. No permanent multi-pane layout.
- **Panels toggled by key:** F Field Manual, B Case Board, \` Console (with library graph), L honesty overlay, Esc menu and chapter list.
- **Controls:** left-drag arrow tips, right-drag orbit, scroll zoom; Tab cycles handles; arrow keys nudge (Shift for 0.1); typing sets components (fractions like 7/6 accepted); Space commits; C calls it; H hint; Z undo; 1/2/3 camera views; F9 Bug mirror. Every action is keyboard-reachable.
- **Naming cards.** Full screen over the frozen scene: the term in wide capitals, one plain sentence underneath, then the formula slides in beside the picture. Held 3 seconds, then folded into the corner.
- **Everything touchable.** Hover a symbol in a formula and its arrow glows; drag an arrow and its symbol updates.
- **Typography** (bundled locally, no CDN): Space Grotesk (UI), JetBrains Mono (numbers, code), Barlow Condensed (naming and act cards), KaTeX for formulas with the colour macros `\cg{}`, `\cr{}`, `\cb{}`, `\cy{}`.
- **Phone (bonus).** Touch-drag arrows, two-finger orbit, Low preset, larger handles.

### 9.6 Characters without drawn art

- **Helmeted figures.** The crew wear sealed suits in the Fold: reflective visors, no faces ever. One figure kit with per-character suit cut, accent stripe (speaker colour) and posture.
- **Voiceprints.** Each speaker's portrait is a 3D form driven live by their audio's spectrum (WebAudio analyser): Wren a quick, bright, tight ribbon; Bram heavy low bars; Ilse a calm sine-like ribbon (in logs, flat and broken by tape hiss; live from Act VI); LANTERN a strict 8 × 8 dot matrix that lights in order; Vell a smooth dark ribbon with little movement; Teo a band of static from Act IV whose noise level is set by his channel's rank k (§10.1) and clears in the Unfold.
- **Typographic name plates**: name, role, location, comms delay.

### 9.7 Blender asset list (procedural `bpy`, glTF with meshopt)

A kit of at most 12 parts, assembled and instanced in Three.js. **Every `bpy` script also renders a preview still; a reviewer agent inspects it before the asset is integrated.** AO and curvature baked to vertex colours or 1k textures.

| # | Part | Budget | Use |
|---|---|---|---|
| 1 | *Lantern* survey tug (hexagonal hull, lattice projector dish, four thruster pods, two dark) | 25k tris | exterior shots |
| 2 | Ark spine segment | 6k | instanced along 1.2 km |
| 3 | Ark ring habitat | 8k | three rings |
| 4 | Ark box-frame strut module | 2k | instanced hundreds of times (Ch 6 struts) |
| 5 | Ark hangar door module (the triangle) | 3k | Ch 5, Ch 7 |
| 6 | Anchor monolith with emissive seam mask | 15k | throughout |
| 7 | Anchor spire (instanced ×3; tip glows in its column colour) | 3k | Acts IV–IX |
| 8 | Light buoy | 60 | instanced 4,000 |
| 9 | Debris set (6 displaced variants in one file) | 400 each | instanced |
| 10 | Drone | 800 | instanced 300 |
| 11 | Vell's cutter | 12k | Acts V–VII |
| 12 | Crew figure (sealed suit, visor; accent variants) | 8k | holotable and cinematics |

The whole ark stays under 60k triangles on screen through instancing. No modelled interior: the bridge is a holotable in a dark void; plates are DOM/CSS2D; the ark interior is LANTERN's scan hologram.

**Cycles stills** (CPU, 1600 × 900, denoised, about 12): title key art, nine act cards, the Field Manual cover, the credits background.

### 9.8 Performance

60 fps at 1080p on an integrated laptop GPU (Medium preset): instancing everywhere, ≤ 300 draw calls, baked lighting plus one key and one rim light, shadows only near the camera, a hard cap on CSS2D labels per scene. Low preset for phones and headless tests (SwiftShader). Initial download under 40 MB; voice streamed per act; Pyodide loaded only on first console open.

---

## 10. Audio direction

### 10.1 Voice

| Character | Kokoro voice | Speed | Processing |
|---|---|---|---|
| Wren Okafor | `af_heart` | 1.04 | helmet room reverb, light compression |
| Bram Haldane | `bm_george` | 0.94 | close, warm EQ |
| LANTERN | `bf_isabella` | 1.00 | subtle ring modulation at low mix, narrow room |
| Dr Ilse Varga | `bf_emma` | 0.95 | logs: band-pass 300–3400 Hz, tape hiss, slight flutter; live from Act VI: clean |
| Teo Okafor | `am_puck` | 1.04 | Acts IV–IX: rebuilt from k singular values of his spectrogram (below) |
| Director Marcus Vell | `am_onyx` | 0.92 | clean, slightly close |

Backups: Wren `af_bella`, Bram `bm_fable`, LANTERN `bf_alice`, Ilse `bf_lily`, Teo `am_liam`, Vell `am_fenrir`.

**Writing for Kokoro's limits.** Emotional beats must work with flat synthetic delivery: short lines, silence, music, filtered comms audio, the voiceprint visuals, per-line speed and pause values. No line may need acted crying, shouting or begging. Meaning and feeling live in the words. No raw formulas are spoken: every line containing maths has a `say:` field ("A times v", "the determinant is zero point eight").

**Budget.** Target 700 voiced lines, hard cap 800: Prologue 40; about 65 per act (585); a bark bank of 60 short reusable puzzle reactions; 26 catch-up cards × 2 lines (52). Ilse's notes on functions are text, except the nine act-end ones, which are voiced. Roughly 50 minutes of audio; generation budget 1 hour on the 4-core CPU including encoding.

**Pipeline.** Lines live in each chapter's `script.ts` → a manifest (line id → speaker → text → say → hash) → a pronunciation lexicon listen-checked **before** bulk generation (eigen "EYE-gen", Gram–Schmidt "gram shmit", λ "lambda", Aᵀ "A transpose", e₁ "e one", "Varga", "Haldane", "Meridian") → Kokoro → loudness normalised to −16 LUFS → mono mp3 at 64–96 kbps. Only lines whose hash changed are regenerated. A listening pass per act. Subtitles are the source of truth and are on by default.

**Teo's voice by rank.** Offline, for his eight key lines: STFT → SVD of the magnitude spectrogram → keep the top k layers for k = 1, 2, 4, 8, 16, 32, 64 → resynthesise with the original phase → mp3. In game his voice plays at the k his channel currently allows (more with each Teach Teo message that lands, full after the Unfold). Ch 25 p5 is played on exactly these files.

### 10.2 Music system (WebAudio, generative)

A per-act score built from stems: drone, pad, plucked arpeggio, bass, a formant choir-like pad, bells for success, a low pulse for Reviews. A look-ahead scheduler; a different mode and tempo per act.

| Rule | How it sounds |
|---|---|
| **Voices = rank** | The flat lattice of the Prologue and Act I carries two melodic voices; the first tilt into 3D (c02-p6) adds the third. The Collapse drops to two (Acts V–VIII); the Unfold brings the third back. Whenever a puzzle's matrix loses rank, one voice falls silent and the stereo field narrows toward mono. |
| **Lines that hold** | In Act VII one held note stays fixed in pitch while the others glide during a pulse: the eigenvector. |
| **Stretch as interval** | Repeated pulses shift the drone by the ratio λ: Vell's 0.5 is an octave down per pulse along one line; the routine pulse (λ = ±i) is a loop of four chords that returns home on the fourth. |
| **Tension follows distance** | As a plot nears the win, the filter opens and the harmony moves toward the home chord; an exact solve resolves on it. |
| **The Shake** | Rapid soft ticks; a hard stop on a counterexample. |
| **Epilogue** | One sustained chord that never changes. |

| Act | Mode and texture |
|---|---|
| Prologue, I | sparse drone, two plucked voices, then three |
| II | warmer pad, low star-light shimmer |
| III | muted, close, a ticking pulse in the dark ark |
| IV | rising bass, the four-chord routine loop; the Collapse silence |
| V | two voices, low register, wide reverb |
| VI | the copper grid's motif: the same melody in a different mode |
| VII | held notes, gliding voices, drone intervals |
| VIII | long tones, clean bells |
| IX | full arrangement returning voice by voice through the Unfold |

### 10.3 SFX (synthesised in WebAudio)

Arrow drag: soft ticks per grid unit, pitched by length. Snap: a glass click with a tiny overshoot. Commit: an ignition swell. Thrust: a rumble. Pulse: sub-bass thump, metal shimmer, a creak as the grid moves. Row operation: a sliding glass tone. Perpendicular: a clear chime. Landing on the origin: a hush. Flattening: a pressure drop to near silence. Called it: two-note chime. Miss: a soft detune, never a buzzer. Shake: rattling ticks and a freeze hit. Test swarm: a soft note per pass, a low detuned tone per failure. Install: a clean chime. Naming card: a low swell. Show me: a soft whoosh.

### 10.4 Mix

Dialogue ducks music by 6 dB. Separate sliders for master, voice, music and SFX. The game is fully playable with audio off.

---

## 11. Engine requirements (build these first)

The minimal set of reusable systems the chapters need. Existing modules are named in brackets; everything else is new.

### 11.1 Puzzle runtime: the declarative contract

Every puzzle is a pure model plus a view.

```ts
interface PuzzleModel<S, A> {
  init(seed: number, d: Difficulty): S;        // plain JSON, serialisable
  reduce(s: S, a: A): S;                        // pure; player input AND Show me dispatch the same actions
  isWon(s: S, d: Difficulty): boolean;          // pure; tolerance from §7.1
  subgoals?(s: S): boolean[];
  reference(d: Difficulty): A[];                // reaches a won state from init(seed, d)
  wrong: A[][];                                  // known-wrong action lists; none may win
  par?: number;                                  // counted actions for the Par star
  callIt?: { prompt: string; check(s: S, guess: unknown): boolean };
  generator?: (seed: number, d: Difficulty) => Partial<S>;   // seeded puzzles only
}
interface PuzzleDef<S, A> {
  id: string; title: string; goal: string; tags: ('F'|'D'|'H'|'S'|'SP'|`X${number}`)[];
  view: '2d' | '3d'; model: PuzzleModel<S, A>;
  render(p: PuzzleCtx, store: Store<S, A>): PuzzleRuntime;   // draws from state, dispatches actions
  hints: string[]; onWin?: Line[];
}
```

- **Show me** dispatches `reference(d)` with tweens through the same controls. **`solve()`** dispatches it instantly (target under 2 s per puzzle headless).
- The store emits state to the view; the view never holds win logic.
- The existing imperative `PuzzleDef` (`setup` + `showMe` + `p.win()`) may wrap a model during migration, but CI requires a model for every chapter puzzle.

### 11.2 Maths library, truth table and number binding

- [`math/la.ts`, `math/rref.ts`, `math/frac.ts`] already provide 2 × 2, 3 × 3 and n × n operations, exact-fraction row reduction, eigen (2 × 2 incl. complex, symmetric), power iteration, Gram–Schmidt, QR, least squares, SVD, low rank, PCA, coordinates.
- Add: `interpMat3` and 3 × 3 polar decomposition (§11.3); complex 2 × 2 eigenvalues as (modulus, angle); a seeded RNG (mulberry32); `content/truth.ts` (§2.7) computed at load.
- **Number binding.** Player-facing strings carry numbers as bindings (`{TT11.N}`, `{c14.det}`), formatted by `nice()` (exact fractions where the maths is exact; stated decimals otherwise). A CI check flags any digit in a player-facing string that is neither bound nor on a short list of plain literals (chapter numbers, "two decimal places").

### 11.3 The frame uniform and honest interpolation

- One shared vertex-shader chunk applies a 3 × 3 matrix (plus optional per-object translation for story placement) to the lattice, debris, ark hull, stern and Anchor. A rank-deficient matrix flattens with the same shader.
- **Interpolation rules** (2 × 2 and 3 × 3):
  - det A > 0: polar split A = Q S (Q a rotation, S symmetric positive definite, from the SVD). Path M(t) = Q(t)·((1 − t)I + tS), with Q(t) the rotation by t times Q's angle (2D) or the slerp of its axis–angle (3D). det M(t) > 0 for all t.
  - A known factorisation wins: the routine pulse animates as P R(θ) P⁻¹ (det 1 at every frame); compositions animate stage by stage, right-hand first.
  - det A = 0 (singular target): the same polar path with S positive semidefinite; rank drops only at t = 1.
  - det A < 0, 2D: A = A′F with F a reflection; animate A′ as above, then F as a half-turn through 3D about the mirror line. 3D reflections: two labelled stages with a ghost (*"A mirror flip has no in-between."*).
- **Tests:** 500 random 2 × 2 and 3 × 3 targets per case: for det > 0, min det along the path > 0 and rank never drops; for singular targets, det > 0 for t < 0.999 and rank(M(1)) = rank(A); for det < 0, the path contains the labelled flip stage; the routine pulse path has det exactly 1 at 7 sample angles.

### 11.4 Chapter data contract

Each chapter folder `content/chapters/cNN-slug/`:

| File | Holds |
|---|---|
| `index.ts` | `ChapterDef`: id, act, num, plain question, In short, nodes, beats in order |
| `script.ts` | every voiced line (speaker, text, `say`, speed, pause), plain data |
| `puzzles.ts` | `PuzzleDef`s with models (§11.1) |
| `briefing.ts` | check question, Field Manual model page and key ideas, Doubts, Law frame, Procedure (if any), Teo callback (if any), Review (act-end chapters) |
| `build.ts` | `BuildDef`s: signature, assemble lines and decoys, fill template, reference, swarm generators per level, install id, crew id, docstring prompt, Ilse's note |
| `terms.ts` | terms earned, each with the beat id that earns it |
| `coverage.ts` | node, by-hand skills → puzzle ids, exam patterns, derivation puzzle id |

Beat kinds: `cinematic`, `scene`, `card` (chapter card with In short; Why it matters; NumPy), `puzzle`, `name`, `sayit`, `doubt`, `law`, `procedure`, `teo`, `compare`, `review`, `build`, `catchup`.

### 11.5 Kit widgets (one per signature mechanic)

| Widget | Status |
|---|---|
| Vector handle, dials, burn chain with flight | [`kit/handle.ts`, `kit/flight.ts`] |
| Reach glow (accumulation buffer) | new |
| Mount, prune, loop | new, small |
| Dish meter, shadow, right-angle mark, angle arc | [`kit/geom.ts`] |
| RAISE (arrow out of two edges with two meters) | new, on geom |
| Strut box (parallelepiped, tetrahedron, inside/outside faces) | [`gfx/shapes.ts`] + faces |
| Path bead, glass wall, skew segment | [`gfx/shapes.ts` InfLine, PlanePatch] + segment |
| Fan-beam planes and twin view | [`kit/system.ts`] |
| Row board with free dials and parameter dials | [`kit/rowops.ts`] + free dial |
| Spire bench (2 × 2 and 3 × 3), unit tile and cube | [`kit/matrixview.ts`, `kit/matrixview3.ts`] |
| Sequence rail (composition, repeat, re-grid, three-slot change of basis) | new |
| Violet probe | new |
| Survivor counter, four-rooms view | new |
| Second grid (any basis), infinite grid shader | [`gfx/grid.ts`] + shader |
| Sweep and λ dial with polynomial graph | [`kit/geom.ts` Sweep] + λ dial |
| Flow board | new |
| DROP, SQUARE | on geom |
| Fit board and data-space twin view | [`kit/data.ts` FitLine, Projector3D] |
| Surface with DESCEND probe | new |
| UNFOLD (circle to ellipse), LAYER (rank-one stack, k slider) | [`kit/geom.ts` UnitCircleImage] + layer stack |
| Cloud with two readouts (spread, perpendicular error) | [`kit/data.ts` PCAView] + readouts |
| Rigid-body simulation (Euler equations, RK4) for the Flip | new |
| Constellation (DOM/SVG) | new |

### 11.6 Explain-back engines

- **Doubt engine**: claim data (§4.2), Challenge/Back, predicate, the Shake (free params, generators, curated edge cases per level), star cost on a true claim, reason line.
- **Law engine**: per-chapter frames; slot option → predicate fragment; the Proving Ground runner (500 cases, counterexample freeze drawn in full); Survived/Proven labels; reason step.
- **Procedure executors**: a row machine and a vector machine; tiles with Python snippets; reference order; key steps; misconception substitution; a test case per procedure.
- **Teach Teo**: the same executors, a 40-word box, bandwidth state.
- **Field Manual**: four slots, snapshot capture, Help me start frames, model page, key-idea checklist, then-and-now, export (Markdown, HTML, PDF).
- **Review** (four Doubts), **Broadcast** (chain ordering, six replays, Down to the arrows, lecture export).

### 11.7 Builder

- [`game/pyrunner.ts`] Pyodide in a worker: lazy load on first console open, 2-second limit with worker restart, plain-word error mapping.
- Console panel: Assemble, Fill and Write modes; test swarm view; step-through; Bug mirror sandbox scene; library graph (DOM/SVG); honesty overlay.
- **Install registry**: named event-time hooks (`hullLighting`, `pulseForecast`, `collapseForecast`, `residualPlot`, …) that batch one worker call, compare with the crew version within tolerance, cache, and fall back with a message.
- Crew versions: the TypeScript maths library.

### 11.8 Presentation

Dialogue and subtitles [`ui/dialogue.ts`], voiceprints [`ui/portrait.ts`], cinematics from timeline JSON (camera splines, voice cue ids, subtitles, music cues, matrix keyframes), chapter list (DOM), Case Board (DOM/SVG), catch-up cards, chapter card with In short, naming cards, HUD, toggled panels, plates (CSS2D).

### 11.9 Wording linter and term ledger

Extends the site's `check:wording` to every player-facing game string: `script.ts` lines (by speaker register), LANTERN status lines, goal lines, In short, naming cards, model pages, Doubts, Reviews, Law tiles, Procedure tiles, Help me start frames, error messages, docstring prompts.
- Banned words (BUILD_BRIEF §2a), exclamation marks, filler openings, the banned analogy list, personification patterns (a maths noun followed by wants / likes / tries / feels / favourite), "machine" near "matrix".
- Maths-register sentences over 20 words are flagged.
- **Term ledger**: each term's earning beat (Appendix C). Any string in an earlier beat using the term fails, character dialogue included.
- **Synonym list** (Appendix C): flagged in maths-register strings once the course term is earned. "Kernel" always fails.

### 11.10 Audio engine

Voice playback with manifest and ducking [`audio/voice.ts`]; generative music with stems and the rules of §10.2 [`audio/music.ts`]; synthesised SFX [`audio/sfx.ts`].

### 11.11 Save and settings

[`core/save.ts`] extended: Maths depth, Code help and Assists as three independent settings with per-chapter overrides; stars with the level earned; Field Manual pages; Laws; Teo state; player code; every access in try/catch; export and import as a file.

---

## 12. Testability

### 12.1 Debug API (`window.__game`)

`listPuzzles()`, `load(id, {difficulty, seed})`, `state()` (JSON), `dispatch(action)`, `solve()` (instant reference), `wrong(i)`, `isWon()`, `goto(chapter, beatId)`, `setDifficulty()`, `setCodeHelp()`, `setAssists()`, `seed(n)`, `skipCinematics(true)`, `doubt.answer(id, construction)`, `doubt.shake(id, n)`, `law.check(chapterId, slots)` → `{survived, counterexample?}`, `procedure.run(id, tiles)` → `{ok, failedStep?, misconception?}`, `teo.send(id, tiles)`, `build.run(fn, source)` → swarm results, `build.install(fn)`, `coverage()`, `truth()`.

### 12.2 Test layers

1. **Unit (Node, under 60 s):** maths library; every truth-table value (TT1–TT22); every puzzle model: `reference(d)` wins at all three levels, every `wrong` list does not win, seeded generators give winnable puzzles for 100 seeds; interpolation path tests (§11.3); every Law frame: the target statement survives 500 cases and each listed near-miss is broken; every Doubt: the canonical construction passes predicate and Shake, the listed special case fails; every Procedure and Teo handover: the full tile list succeeds and removing each key step produces exactly its misconception failure; every build: the reference passes its swarm (Pyodide in Node or CPython) and each decoy version fails at least one case; the exported `lantern.py` imports and passes its tests in CPython.
2. **Browser (Playwright, SwiftShader, Low preset):** every puzzle at Navigator: `load → solve → isWon` under 2 s each (about 170 puzzles, about 6 minutes); every [H] and [D] puzzle also at Cadet and Commander; Show me and Skip present on every puzzle, Doubt, Law, Procedure and build; one screenshot per chapter at fixed seed and time, 1440 and 390 wide, no console errors, no horizontal page scroll; every voice line id has an mp3 whose hash matches the manifest.
3. **CI checks:** wording linter and term ledger; **coverage** (Appendix B: every by-hand skill and exam pattern maps to an existing core puzzle tagged H or X, never only S; every node has a D puzzle); **no gating** (a fresh save reaches every chapter, puzzle, Briefing step and build, and nothing is disabled); number binding.
4. **Playtest metrics** (logged locally, exported by the tester): time in puzzles, console and cinematics per chapter; Show me and Skip rates; Doubt objection rates on true claims.

---

## 13. Scope plan

### 13.1 MUST (a complete, polished game)

- **Engine:** §11.1–11.11 except the items listed under SHOULD; the debug API and test layers 1–3.
- **Content:** Prologue, 26 chapters, Epilogue. In every chapter: the chapter card with In short; puzzle p1, the aha puzzle and every puzzle tagged [D], [H], [X] or [SP]; the naming beats; the Briefing (Say it, two Doubts, the Law with Shake and reason, the compare step); the six Procedures; the nine act set pieces and nine Reviews; catch-up cards (text and picture); the Broadcast chain and Field Manual export.
- **Builder:** Pyodide runner, Fill and Write modes, test swarm view, crew versions, library graph, honesty overlay, four installs (hull lighting Ch 5, pulse forecast Ch 11, Collapse forecast Ch 14, Collapse fit and residual Ch 23), `lantern.py` export. Build data (reference, tests) for every chapter.
- **Voice:** every story line (≤ 800) with the lexicon; Teo's rank versions for eight lines.
- **Music and SFX:** the adaptive engine with rank voices and the act table; the SFX set.
- **Art:** the 12-part kit with reviewed previews; the shaders of §9.3; about 12 Cycles stills.

### 13.2 SHOULD

Remaining See-it variations (untagged puzzles); Fast lane; Teach Teo (five callbacks); the remaining installs and the three refactor beats; Assemble mode; Bug mirror; Survey runs; Viva; Sandbox; bridge plates; constellations beyond the Invertible Matrix one; NumPy cards and the Colab notebook; then-and-now pages; Down to the arrows and the lecture export; voiced catch-up cards; the Flip simulation; the Drift; cosmetics.

### 13.3 STRETCH

All [S] puzzles; the Epilogue layer (ReLU); optional voice notes in the Field Manual (stored in the browser); in-browser TTS reading the player's lecture; phone layouts beyond the basics; extra Cycles stills.

### 13.4 Order of work

1. Maths library additions, truth table, interpolation tests.
2. Puzzle runtime contract, debug API, CI skeleton (unit, browser, wording, coverage, no-gating).
3. **Vertical slice:** Prologue, Ch 1, Ch 2 (first height), Ch 11, Ch 14 (the Collapse), Ch 17 (the twist), each with its Briefing and the Ch 11 install. Proves: arrows, reach glow, the tilt into 3D, the spire bench, the rail, the Collapse, the twist, voice, music, the builder. Then freeze the engine API.
4. Term ledger, coverage files, wording linter for game strings.
5. Chapters by act in parallel (one agent per act), each passing CI before merge.
6. Blender kit with preview reviews; Cycles stills.
7. Text freeze → lexicon listen-check → Kokoro generation → listening pass.
8. Full browser pass, playtest metrics, fixes.
9. SHOULD items in value order: Teach Teo, installs, Survey runs, Bug mirror, Viva, NumPy cards, then the rest.

**Cut order** if time runs short: STRETCH first, then SHOULD from the end of the list. The MUST list is never cut.

---

## Appendix A. Alignment with the current code

- `content/cast.ts`: ids and voices already match §2.2 (wren, bram, lantern, ilse, ilselog, teo, vell). Add the backup voices as comments.
- `core/save.ts`: keep `Difficulty = 'cadet' | 'navigator' | 'commander'` with the meanings of §7.1; add `codeHelp` and `assists`; per-chapter overrides.
- `game/types.ts`: `PuzzleDef` gains `model` and `tags` (§11.1). `ExplainDef` (option picking) is replaced by the `sayit`, `doubt`, `law`, `procedure`, `teo`, `compare` and `review` beats. `BuildDef` gains modes, swarm generators, install, crew, docstring prompt and Ilse's note.
- `content/chapters/c00-prologue`: rework to §6.2. Ilse's nine numbers become her spire settings, read as three landing spots: (0, 1, 0), (−1, 0, 0), (0, 0, 1). The visible pulse becomes the routine pulse T, animated as P R(θ) P⁻¹ (replacing `PULSE0`). Reference buoys are white and cyan (violet is reserved for the null space). The first burn comes before the pulse; the three confirmation clicks become the constructions c00-p2 and c00-p3.
- `math/la.ts`: add `interpMat3`, 3 × 3 polar decomposition, complex 2 × 2 eigenvalues as (modulus, angle), seeded RNG; make `interpMat2('auto')` follow §11.3.
- `game/debug.ts`: implement §12.1. `tests/singular/browser/game-solve-all.mjs` switches from animated Show me to instant `solve()` plus `wrong` lists.
- KaTeX macros: add `\cb{}` (blue, third column).
- `docs/singular/AUTHORING.md`: update to the new beat kinds, the puzzle model contract, `briefing.ts`, `terms.ts` and `coverage.ts` (engine owner, before parallel chapter work).

---

## Appendix B. Coverage matrix

### B.1 The twelve exam patterns (curriculum §6) → core puzzles with typed steps at Navigator

| # | Pattern | Puzzles |
|---|---|---|
| 1 | Parameter questions: for which k none, one, infinitely many | c02-p1, c09-p5, c10-p5, SP-III |
| 2 | Is b in the span; write it as a combination | c02-p4, c15-p2, c11-p5 |
| 3 | Independence with a dependence relation | c03-p1, c16-p1 |
| 4 | Plane through three points; line where two planes meet; point–plane distance; triangle area; tetrahedron volume; four coplanar points | c05-p4, c07-p3, c07-p6, c07-p5, c05-p4, c06-p4 and c06-p6, c06-p4 |
| 5 | Inverse by [A \| I]; solve A X = B | c13-p4 |
| 6 | 3 × 3 and 4 × 4 determinants by cofactor expansion and by row reduction; k that makes A singular | c14-p4, c14-p5 |
| 7 | Bases for Col A, Row A, Nul A; rank and nullity; is this set a subspace | c16-p2, c16-p3, SP-V, c15-p5 |
| 8 | Eigenvalues and eigenspaces of a 3 × 3; diagonalise or explain why not; A^k | c18-p5, c19-p3, c19-p4 |
| 9 | Steady state of a Markov chain | c20-p2 |
| 10 | Gram–Schmidt on three vectors; projection onto a plane; least-squares line through 4–5 points | c22-p2, c21-p5, c23-p3 |
| 11 | Orthogonally diagonalise a symmetric matrix; classify a quadratic form; SVD of a small matrix | c24-p4, c24-p3, c25-p4 |
| 12 | True/false with a one-line reason | every chapter's Doubts, every act Review, Viva |

### B.2 By-hand skills per node → puzzles

| Node | By-hand skills (curriculum) → puzzles |
|---|---|
| N01 | vector from P to Q, its length → c01-p4, c01-p6; equal components = same vector → c01-p2 |
| N02 | add, subtract, scale → c01-p2, c01-p5; midpoint and P + t(Q − P) → c01-p4; parallel test → c01-p3 |
| N03 | is b a combination, find weights → c02-p4; describe a span → c02-p6; a vector outside a span → c02-p5 |
| N04 | dependence relation → c03-p1; more than n vectors dependent → c03-p5; set containing 0 → Doubt T |
| N05 | dot, lengths, unit vectors, angles → c04-p4; orthogonality → c04-p2; projection and split → c04-p6, c21-p6 |
| N06 | cross product → c05-p3; triangle area and normal through three points → c05-p4; right-hand rule → c05-p2 |
| N07 | triple product, volume, tetrahedron, coplanar, find k → c06-p3, c06-p4, c06-p6 |
| N08 | line and plane equations → c07-p3; intersections → c07-p4, c07-p6; distances → c07-p5, c07-p2; angle between planes → c07-p6; parallel / meeting / skew → c07-p2 |
| N09 | word problem to equations, column form → c08-p5; the three cases → c08-p2, c08-p3, c08-p4 |
| N10 | augmented matrix, row operations, REF, pivots, back substitution → c09-p1, c09-p2, c09-p6; consistency, parameters → c09-p5 |
| N11 | RREF, free variables, parametric form → c10-p2, c10-p4; homogeneous → c10-p6; parameters → c10-p5 |
| N12 | matrix of a described move, linearity test → c11-p2, c11-p3, c11-p7 |
| N13 | A x both ways, sizes → c11-p5 |
| N14 | multiply, sizes, composition matrix, AB ≠ BA, transposes, (AB)ᵀ → c12-p1, c12-p2, c12-p3, c12-p4 |
| N15 | [A \| I], 2 × 2 formula, no inverse, (AB)⁻¹, A X = B → c13-p2, c13-p4, c13-p5, c13-p6 |
| N16 | 2 × 2, 3 × 3, cofactor any row, row reduction, triangular, properties, find k → c14-p2, c14-p3, c14-p4, c14-p5 |
| N17 | subspace or not, Nul A spanning set, b in Col A, one-to-one and onto → c15-p5, c15-p3, c15-p2, c15-p4 |
| N18 | bases for Col, Row, Nul; rank, nullity; rank–nullity; IMT → c16-p2, c16-p3, c16-p4, SP-V |
| N19 | coordinates, between two bases, P⁻¹AP, could two matrices be similar → c17-p1, c17-p3, c17-p4, c17-p6 |
| N20 | 2 × 2 and 3 × 3 eigenvalues, eigenspaces, triangular, trace and det checks, complex → c18-p3, c18-p5, c18-p4 |
| N21 | diagonalise or show it cannot be done, A^k, dynamical systems → c19-p3, c19-p4, c19-p5 |
| N22 | build P, steps, steady state, regularity → c20-p1, c20-p2, c20-p6 |
| N23 | W⊥, projection with an orthogonal basis, split b = p + e, distance → c21-p3, c21-p5, c21-p2 |
| N24 | orthonormality, coordinates by dot products, Gram–Schmidt, Q and R, orthogonal matrices → c22-p2, c22-p3, c22-p4, c22-p6 |
| N25 | set up A and b, normal equations, residual, QR route → c23-p3, c23-p2, c23-p5 |
| N26 | orthogonally diagonalise (repeated eigenvalue), matrix of a form, classify, constrained max/min, spectral decomposition → c24-p4, c24-p3, c24-p5 |
| N27 | small SVD via AᵀA, rank and bases from U and V, rank-one expansion and error → c25-p4, c25-p2, c25-p5 |
| N28 | centre, covariance, principal directions, explained variance, project, choose k → c26-p4, c26-p5 |

### B.3 Where each formula comes from ([D] puzzles)

N01–N02 c01-p6 (and the parallelogram in c01-p2) · N03 c02-p6 · N04 c03-p5 · N05 c04-p1 (from the two measured readings) and c04-p3 (law of cosines) · N06 c05-p1, c05-p3 · N07 c06-p2 · N08 c07-p3 · N09 c08-p3 · N10 c09-p4 · N11 c10-p6 · N12–N13 c11-p3 · N14 c12-p4 · N15 c13-p4 · N16 c14-p2 (bounding box) and c14-p4 (cofactors from the triple product) · N17 c15-p5 · N18 c16-p6 · N19 c17-p6 · N20 c18-p3 · N21 c19-p2 · N22 c20-p4 · N23 c21-p3 · N24 c22-p3 · N25 c23-p2 · N26 c24-p1 (transpose argument) · N27 c25-p2 · N28 c26-p3.

### B.4 CI

Each chapter's `coverage.ts` lists `{ node, byHand: [{ skill, puzzles }], examPatterns, derivation }`. A test reads the fixed skill list above and fails if any skill or pattern maps to no existing puzzle, or only to [S] puzzles, or if a node has no [D] puzzle.

---

## Appendix C. Term ledger and one word per idea

### C.1 Terms earned, by chapter (the earning beat is in each chapter card)

| Ch | Terms |
|---|---|
| 1 | vector, component, displacement, position vector, vector addition, scalar, scalar multiple, parallel, length, zero vector, ℝ², ℝ³, ℝⁿ |
| 2 | linear combination, weight, span |
| 3 | linearly dependent, linearly independent, trivial combination |
| 4 | dot product, orthogonal, angle between vectors, unit vector, projection onto a line, component along, norm (named once as another word for length) |
| 5 | cross product, right-hand rule, normal vector |
| 6 | scalar triple product, coplanar, parallelepiped, tetrahedron volume, orientation, signed volume |
| 7 | parametric (vector) equation of a line, direction vector, Cartesian equation of a plane, skew lines |
| 8 | system of linear equations, solution, solution set, consistent, inconsistent, row picture, column picture |
| 9 | coefficient matrix, augmented matrix ("matrix" as a grid of numbers), row operation, row equivalent, row echelon form, pivot, pivot column, back substitution, Gaussian elimination |
| 10 | reduced row echelon form, basic variable, free variable, parameter, parametric vector form, homogeneous system, trivial solution, particular solution |
| 11 | transformation, linear transformation, standard basis vectors, matrix (of a linear transformation), matrix–vector product, A x = b, size m × n, rotation / reflection / shear / scaling / projection matrix |
| 12 | composition, matrix product, identity matrix, non-commutative, associative, transpose, symmetric matrix |
| 13 | inverse, invertible, non-singular, singular, elementary matrix (LU in [S]) |
| 14 | determinant, signed area, orientation reversal, minor, cofactor, cofactor expansion, triangular matrix (Cramer's rule in [S]) |
| 15 | subspace, closed under addition and scalar multiplication, column space, null space, one-to-one, onto |
| 16 | basis, dimension, rank, nullity, rank–nullity theorem, vector space, row space, left null space, four fundamental subspaces, Invertible Matrix Theorem |
| 17 | coordinates relative to a basis, change-of-coordinates matrix, change of basis, similar matrices |
| 18 | eigenvector, eigenvalue, eigenspace, characteristic polynomial, characteristic equation, algebraic multiplicity, complex eigenvalues, trace |
| 19 | diagonalisation, diagonalisable, geometric multiplicity, discrete dynamical system |
| 20 | probability vector, transition (stochastic) matrix, Markov chain, steady-state vector, regular chain |
| 21 | orthogonal set, orthogonal basis, orthogonal projection, orthogonal complement, projection matrix |
| 22 | orthonormal set, orthonormal basis, orthogonal matrix, Gram–Schmidt process, QR factorisation |
| 23 | least-squares solution, residual, normal equations, line of best fit |
| 24 | spectral theorem, orthogonally diagonalisable, spectral decomposition, quadratic form, positive definite, negative definite, indefinite, positive semidefinite, principal axes |
| 25 | singular value, left and right singular vectors, singular value decomposition, rank-one matrix, low-rank approximation, condition number, pseudoinverse |
| 26 | mean-centring, covariance matrix, principal component, explained variance, principal component analysis, dimensionality reduction |
| 27 | layer, weights, bias, ReLU ([S]) |

Plain words usable from the Prologue: arrow, point, grid, grid arrows, origin, line, plane, flat, stretch, flip, turn, land, reach, shadow, right angle, area, volume.

### C.2 One word per idea (maths register, once the course term is earned)

| Never write | Write |
|---|---|
| sheet, glass, wall (as the maths object) | plane |
| rail, path (as the maths object) | line |
| tablet, ledger, row board (as the maths object) | augmented matrix |
| frame, pulse, spire numbers (as the maths object) | matrix, or linear transformation |
| map, operator, function, machine (for a linear transformation) | linear transformation |
| corridor, heading, line that holds (after Ch 18) | eigenvector (its line: the eigenvector's line, or eigenspace) |
| spread matrix | covariance matrix |
| kernel | null space (always) |
| image, range | column space (Ch 15 may say once that books also use "range") |
| norm (after Ch 4's one mention) | length |
| crushed line, flattened set (after Ch 15) | null space |

In-world nouns (pulse, spires, lattice, dish, row board, spire bench) may name the **objects** on screen in any register. Story-register characters may say "flat", "crushed", "lines that hold" before and after naming, but never a course term before its naming beat.

---

## Appendix D. Must-fix traceability

### D.1 Verdict 1 (builder judged strongest)

| Must-fix | Where it is fixed |
|---|---|
| Coverage gaps: row space, left null space, four subspaces; complex eigenvalues (core); det(AB), det(kA); cofactor 3 × 3 and 4 × 4 and row reduction; [A \| I] with elementary matrices; skew lines and plane intersections; tetrahedron and coplanarity; quadratic forms, definiteness, constrained max/min; rank-one layers; why eigenvalue 1; swap chain | SP-V; c18-p4; c14-p3; c14-p4, c14-p5; c13-p4; c07-p2, c07-p6; c06-p4, c06-p6; c24-p3, c24-p5; c25-p5; c20-p4; c20-p6 (§6.13) |
| Coverage matrix checked in CI; nothing only optional | Appendix B, §12.2 |
| One "where the formula comes from" step per node, required at Prove; reason after random testing; "surviving cases is not a proof" | [D] puzzles (B.3), §4.2, §4.3, §7.1 |
| Generate before recognising; tiles lowest assist; model after; check question posed; consequence test; nothing blocks | §4.1–4.5 |
| Mixed true and false claims; objecting to a true claim costs | §4.2, §4.6 |
| One word per idea; linter synonyms | Appendix C.2, §11.9 |
| No term or notation before earned (A x = b, Aᵀ, function names, file names, chapter lists); title as branding with payoff | Appendix C.1, §5.4, §3.2, Ch 10 check question, `lantern.py`, §1.1 |
| In short at the start of every chapter | §3.2, every chapter card |
| Decouple maths depth, code help, assists | §7 |
| Code step last, skippable, no maths lost; Compute needs by-hand work; console-time metric | §5.1, §3.2, §7.1, §12.2 |
| Trilateration premise | Ch 8: fan-beam planes, not range spheres |
| No false flattening in animations | §9.3, §11.3 |
| Precision slips | Ch 19 p4 card (complex diagonalisation); drone matrix verified (TT14), no (0.5, 0.25, 0.25) example; "value one unit out along an eigenvector", never "curvature" (Ch 24); arrow lengths stated for skewed grids (§2.1, Ch 17) |
| det exactly 0 vs tiny kept separate | §2.7 honesty rule, SP-IX steps 1–2, Act V review |
| One major idea per chapter; N26 and N27 split; composition vs inverse; basis vs change of basis | §0, §6.1 |
| Vector spaces in the main path as a Compute puzzle | c16-p5 |

### D.2 Verdict 2 (puzzle judged strongest)

| Must-fix | Where it is fixed |
|---|---|
| No quiz-shaped wins | §6.0 rule; every win in §6 is a construction or world state |
| A hook in the first 10 minutes | §3.4, §6.2 |
| Act I pacing for a CS student | Fast lane §3.3; mastery openers c01-p1, c02-p1; flat view only until c02-p6 |
| One word per idea | Appendix C.2 |
| Agency at every signature moment | c14-p6 (your forecast, your braces, your seal), c23-p6, c25-p6, SP-VII, SP-IX, c26-p6 |
| Write for Kokoro; 600–900 lines | §10.1 (target 700, cap 800) |
| One explain-back stack; difficulty as parameters | §4 (Doubts, Laws, Execute-my-steps, Field Manual); §7; voice notes only as [STRETCH] |
| Systemic escalation | an [SP] per act, each listing the acts it draws on |
| Compute covers all 12 exam patterns | Appendix B.1 |
| Never fake-grade free text | §4 |
| Python via Pyodide; no compiler; crew versions | §5.2, §5.6 |
| Duels by construction, not true/false lists | §4.2 |
| "So what" playable | each chapter's So what |
| One maths-truth table; numbers from data | §2.7, §11.2 |
| Out-of-order play | §3.4 catch-up cards, §5.6, §12.2 no-gating test |
| Unified colour and cue system | §9.2 |
| Minimal HUD | §9.5 |
| Tier-1 first impression | §9.1, §6.2 cold open |

### D.3 Verdict 3 (narrative judged strongest)

| Must-fix | Where it is fixed |
|---|---|
| Declarative puzzle contract, shared reducer, negative tests | §11.1, §12.2 |
| Difficulty changes parameters only | §7 (content identical at every level; [S] open to all) |
| Cut side systems | chapter list and Case Board in DOM/SVG; Viva as a filter over Doubts; Broadcast = chain plus six replays; five Teo callbacks; one Colab notebook and nine NumPy cards. **Partly adopted:** builds stay per chapter because each is data only (reference, tests, lines); the costly installs are limited to four in MUST |
| Voice cap, hashing, lexicon first, `say`, generation budget | §10.1 |
| At most 12 kit parts, reviewed previews, ark under 60k triangles, no modelled interior | §9.7 |
| 3 × 3 animation specified and tested | §11.3 |
| Seeded data and asserted story numbers | §2.7 (TT17 residual-designed data), §12.2 |
| Wording: no "kernel"; linter by speaker, tiles, errors; term ledger includes dialogue | §11.9, Appendix C |
| Never grade free text | §4 |
| Construction-based Doubts with the Shake as the main explain-back | §4.2; Appendix A replaces `ExplainDef` |
| Headless budget; instant `solve()` | §11.1, §12.2 |
| Colour-blind cues; Pyodide lazy; plain lists | §9.2, §5.2 |

---

## Appendix E. Interim mapping onto the current engine (until §11 lands)

Chapter builders working before the engine changes in §11 and Appendix A are merged map the design onto today's contract (`game/types.ts`, `AUTHORING.md`, `CHAPTER_BRIEF.md`) like this, so that nothing written now has to be thrown away:

| GDD element | Today's contract | Rule |
|---|---|---|
| Puzzle model (§11.1) | `PuzzleDef` with `setup` / `showMe` | Keep the win test in a pure exported function of plain state in `puzzles.ts`, and give each puzzle a `solve()` that sets the reference answer instantly. Both wrap into `model` later. |
| Doubt by construction (§4.2) | `puzzle` with `style: 'doubt'` and `claim: { who, text }` | Goal text says "Challenge it" (build a counterexample) or "Back it" (build a demonstration). Implement the Shake inside the puzzle: randomise the scene's free quantities 2 / 5 / 10 times by difficulty, plus the listed edge cases, and re-check. Mix true and false claims. |
| Reason step of the Law (§4.3) | `explain` beat (`ExplainDef`) | Use option picking **only** as the reason step (the Cadet form in §7.1): each wrong option's `why` refutes a curriculum misconception with the picture. It never replaces a construction. |
| Say it (§4.1) | `explain.ownWords` | Ask the chapter's check question in `ownWords`; never grade it. |
| Model page and key ideas (§4.5) | `name` beat (`CodexEntry`: saw, means, name, formula, why, cue, use) | The CodexEntry text is Ilse's model page; put the 2–3 key ideas in `means`. |
| Build (§5) | `build` beat (`BuildDef`) | One or two functions per chapter as listed in §5.5; plain lists; tests include an edge case; `uses` for earlier functions. |
| Third-column colour | KaTeX `\cg{}`, `\cr{}`, `\cy{}` | Until `\cb{}` exists, label the third column **u** / **a₃** in text and draw it blue in the scene. |

**The two chapters already built.**
- `c00-prologue` needs the Appendix A rework (nine numbers as spire settings, the routine pulse T, white and cyan reference buoys, the first burn before the pulse). Its three prediction puzzles map onto c00-p2 and c00-p3.
- `c01-vectors` maps as: `c01-straight` ≈ c00-p1 (keep it in Ch 1 until the Prologue rework lands), `c01-debris` = c01-p2, `c01-scale` = c01-p3, `c01-home` = c01-p5, `c01-doubt` = the (F) Doubt. Still to add: c01-p1 [F], c01-p4 [H], c01-p6 [D], the (T) Doubt and the Law frame.
