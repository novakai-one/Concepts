# SINGULAR — game pitch (lens: mechanics-first puzzle game)

Author: senior game designer, puzzle lens. Built on `design/curriculum.md` (nodes N01–N28, threads T1–T14). Every number in every puzzle below was checked in numpy.

Notation in this document: a matrix is written row by row, so `[[2, 1], [1, 3]]` has rows (2, 1) and (1, 3). Points and arrows are written (x, y) or (x, y, z) and are columns.

---

## At a glance

| | |
|---|---|
| **Genre** | First-person/orbit 3D puzzle game in the tradition of The Witness, Baba Is You, Opus Magnum, Monument Valley |
| **Core idea** | Linear algebra is the only physics in the world. Every concept arrives as a new **verb** the player can do to space. |
| **Length** | 8 acts, 26 chapters, 4 Inquests + 4 act finales, ~130 core puzzles, ~40 optional mastery sigils. 15–20 hours on the middle difficulty. |
| **Explain-back** | The **Codex**: Laws the world tries to break, Demonstrations for Tamsin, Procedures she runs literally, a Field Journal in your own words, and Inquests where you use all of it as evidence. |
| **Difficulty** | Wayfarer (see it), Surveyor (compute it), Cartographer (prove it). Switchable on any puzzle at any time. |
| **Look** | Pale stone islands on a night-indigo void; the coordinate grid is the fabric of the world; arrows are beams of light. No drawn art: 3D, shaders, light, type, motion. |
| **Voice** | Five Kokoro voices plus one minor role. Every line voiced. |
| **Gating** | None. Every chapter is open from the Atlas on minute one. Story order is a recommendation. |

---

## 1. Title and logline

### SINGULAR

The word carries three meanings, and the game uses all three:

1. A **singular** matrix flattens space and has no inverse. That is what happened to the world.
2. **Singular values** are how the world is rebuilt in the final act.
3. You are singular: the first new surveyor in nineteen years.

**Logline.** Nineteen years ago, in one night, the world of Tessel was pressed flat, and nobody has been able to undo it. You pick up the last Surveyor-General's compass and learn to move space itself, arrow by arrow and grid by grid, to find out what the Fold erased, why it was done, and what can still be rebuilt.

### Premise in six lines

- Tessel is a world of stone islands laid on one great grid, measured from a single point called the Origin.
- Nineteen years ago the **Fold** pressed every island onto the ground. Towers became floor plans. Heights became zero.
- At the Origin there has been a small, steady point of light ever since. Nobody knows what it is.
- Ines Haldane, the Surveyor-General, made the Fold and vanished. Her compass and her recorded survey logs remain.
- You arrive at the Origin holding the compass. Tamsin, the young keeper who grew up in the flat world, finds you.
- Ines's logs are scattered across Tessel. Each one names something you have already worked out with your hands.

---

## 2. The core gameplay loop

### 2.1 The one rule of Tessel

Everything in Tessel is a position measured from the Origin. Things move only by arrows. There is no other physics.

All puzzles are built from one small grammar of objects. Each object is introduced by one chapter, then combined with the others for the rest of the game, the way The Witness combines its panel symbols.

| Object | What it is on screen | Maths it carries | First chapter |
|---|---|---|---|
| **Arrow** | A beam of light from tail to tip. Drag the tip. | a vector | 1 |
| **Dial** | A ring on an arrow's shaft. Turn it to stretch or flip. | a scalar | 1 |
| **Beacon** | A lamp that lights when something lands on it exactly | a target point | 1 |
| **Paint** | Every point you have visited glows softly | a span / a set | 2 |
| **Plate** | A disc on a rail that shows one number | a dot product | 4 |
| **Box** | A slanted crystal built from three arrows | a scalar triple product | 6 |
| **Rail / Sheet** | A glowing line or pane of glass | a line / a plane | 7 |
| **Tablet** | A stone of engraved numbers, each row tied to a sheet | an augmented matrix | 9 |
| **Frame** | A brass ring at an island's Origin with grey basis arrows | a matrix | 11 |
| **Gold tile** | The unit square riding on every frame | the determinant | 14 |
| **Violet** | A dark glow on every starting point that a move sends to the Origin | the null space | 15 |
| **Tide** | A nightly event that applies one frame to all of Tessel | repeated multiplication | 18 |
| **Cloud** | Hundreds of measured points | data | 23 |

**Colour language (fixed, matches the student's site):** green = the input arrow **v** (or **x**), red = the second arrow **w** or the weights, yellow = the result. When a frame is shown by its columns, column 1 is green, column 2 is red, and **Ax** is yellow. Basis arrows before a move are neutral grey. Violet is reserved for the null space. Gold is the unit tile. Every colour also has a shape cue (section 6) for colour-blind players.

### 2.2 What your hands do, minute to minute

A worked example from Chapter 2, "The Reach", on Surveyor difficulty:

1. **You arrive.** The camera glides to an island. A ferry sits at the Origin. Two currents leave it: a green arrow (1, 2) and a red arrow (3, 1), each with a brass dial. Out on the water, a beacon at (5, 5) is dark. One plain line of text: "Light the beacon. You have these two arrows."
2. **You predict (optional).** A ghost marker hangs from your cursor. Drop it where you think the dials should stop, or press Skip. The game remembers your guess.
3. **You act.** Scroll on the green dial. The green arrow stretches; the ferry's ghost slides along its line. Scroll on the red dial. The red arrow is drawn from the green tip, and the yellow result arrow runs from the Origin to the red tip. Every point the yellow tip passes leaves a faint glow on the water.
4. **You commit.** Press Enter. The ferry sails the green leg, then the red leg. If it lands on (5, 5), the beacon ignites, the music resolves, and the dial values (2, 1) are engraved beside the beacon.
5. **You fail usefully.** If the ferry stops at (4, 5), it stays there. A thin line shows the gap (−1, 0). Nothing resets, nothing scolds. You turn a dial and try again.
6. **You notice.** By the fifth beacon, the glow on the water has covered most of the map. The next puzzle hands you two arrows that lie on one line. The glow refuses to leave that line.

**Why this is play and not a quiz:**
- The answer is always a **state of the world** (a beacon lit, a grid matched, a hold of the right size), never a choice from a list.
- Most puzzles have many solutions. Par scores reward elegant ones.
- Failure draws a picture of exactly what went wrong.
- The world reacts instantly and physically: inertia on drags, a click on whole numbers, a chime when two arrows are perpendicular, a hush when an arrow lands on the Origin.
- Optional **sigils** hide in the scenery, as in The Witness: three lamp posts whose shadows line up only from one spot; a reflection in the sea that shows a frame you have not been told about.

### 2.3 The chapter loop (30–45 minutes)

Every chapter follows the house order **problem → see it → name it → formula → by hand → in code**:

| Step | What happens | House rule served |
|---|---|---|
| 1. Wordless opener | A puzzle with only objects and a beacon. No text beyond the goal. | Problem first |
| 2. Variations | Two or three puzzles that build the pattern in the player's hands | See it |
| 3. Prediction | A ghost marker or a "which of these?" mark before acting. Always skippable. | Invite a prediction |
| 4. The aha puzzle | A puzzle that breaks the pattern and forces the insight | Challenges, not sliders |
| 5. Ines's log | A recorded log names what you did, then shows the formula next to the picture, symbols colour-matched. Hover a symbol and its object glows in the world. | Name it last |
| 6. By hand | The same idea with typed numbers (required on Surveyor) | By hand |
| 7. Script stone | One optional line of Python (numpy) that solves a puzzle | In code |
| 8. Codex entry | Engrave a Law, show Tamsin, write a Journal line | Explain-back |
| 9. Sigils | Optional mastery puzzles mixing this verb with older ones | Challenge to grow |

Each chapter also ends with two plain lines on its Codex page: **"Where you will meet this"** (one real use in AI or CS) and **"When you see ___, think ___."**

### 2.4 The Atlas: nothing is locked

The level map is Tessel itself, seen from above: a coordinate space with the Observatory at the Origin and each chapter as a site at its own position. Every site is open from the first minute. Story order is shown as a faint path. Opening a chapter out of order plays a 20-second **catch-up card** that re-teaches its prerequisite with a picture (never "recall that"). Every puzzle shows **Show me** and **Skip** at all times. Stars and par scores only brighten the Atlas; they never open anything.

---

## 3. The full arc: 8 acts, 26 chapters

| Act | Title | Plain question | Chapters | Curriculum nodes |
|---|---|---|---|---|
| I | The Flat | Where can I go? | 1–3 | N01–N04 |
| II | Shadow and Height | How do I measure space? | 4–6 | N05–N07 |
| III | Where Things Meet | Where do all the conditions agree? | 7–10 | N08–N11 |
| IV | Frames | How do I move all of space, and can I undo it? | 11–14 | N12–N16 |
| V | What the Fold Kept | What survives a move, and what is lost? | 15–17 | N17–N19 |
| VI | The Tide | What happens when a move repeats? | 18–20 | N20–N22 |
| VII | The Closest Point | No exact answer exists. What is the best one? | 21–23 | N23–N25 |
| VIII | Singular | What is the shape of what remains? | 24–26 | N26–N28 |

The camera follows the dimension of the maths. Acts I and the start of II are seen straight down, flat. The first cross product (Chapter 5) tilts the camera into 3D for the first time. From then on the world has height.

---

### ACT I — THE FLAT ("Where can I go?")

*Story.* Tamsin finds you at the Origin with the Surveyor-General's compass. Tessel is a map of pale floor plans on dark water. Ferries move between islands only by arrows. At the end of the act, Provost Aurel Haldane arrives to question the stranger with his sister's compass.

#### Chapter 1 · Ferry Stones — "Where is it, and how do I get there?" (N01, N02)

- **World problem.** Tamsin's ferry must cross between flat islands. The only way to move anything in Tessel is to give it an arrow.
- **New verbs.** STEP (drag an arrow's tip; the ferry moves by it), CHAIN (draw the next arrow from the last tip), STRETCH (turn a dial on an arrow).
- **Puzzles.**
  1. *(wordless)* Ferry at P = (1, 1), beacon at Q = (5, 2), one arrow. Win: ferry on Q. Answer (4, 1).
  2. Three ferries at (0, 0), (2, 3), (−1, 4); beacons at (3, 1), (5, 4), (2, 5). One arrow moves all three. Win: all lit with (3, 1).
  3. Fixed arrows v = (2, 1) and w = (−1, 3). Reach (1, 4) using each once, then in the other order. Win: both orders light the beacon; the two routes draw a parallelogram.
  4. One arrow v = (2, 1) with a dial. Beacons at (6, 3), (−4, −2), (3, 2). Win: light the first two (dial 3, dial −2) and mark the third "unreachable". It is off v's line.
  5. Rope: a rope of length 5 can make which arrows: (3, 4), (4, 4), (5, 0)? Win: pick (3, 4) and (5, 0); the right triangle under each arrow is drawn.
  6. *Mastery:* v = (2, 1), w = (1, 2), whole-number dials only. Reach (7, 8). Answer 2 and 3.
- **Aha.** An arrow is a move, not a place. The same arrow works from anywhere, and the arrow from P to Q is Q − P.
- **Named.** After puzzle 2, Ines's first log: "What you dragged is a vector: how far across and how far up. Where you draw it does not change it." Adding and scalar multiplication are named after puzzle 4. Formula cards: Q − P; v + w = (v₁ + w₁, v₂ + w₂); cv; |v| = √(v₁² + v₂²) with the triangle drawn.
- **Proof of understanding.** Show Tamsin: she claims the arrow from P to Q is P − Q; build a case where her arrow points the wrong way. Law: "The ARROW from P to Q is Q MINUS P." Script stone: `q - p`.
- **Where you will meet this:** `position += velocity * dt` in every game loop; a 28 × 28 image is one vector of 784 numbers.
- **Cue:** "When you see 'from P to Q', think Q − P."

#### Chapter 2 · The Reach — "Which points can I reach with these arrows?" (N03)

- **World problem.** The bridges are gone. Each ferry can only travel along two currents, v and w, each with a dial. Which islands can a ferry ever reach?
- **New verb.** REACH. Turning two dials paints every point the yellow tip visits. A sweep paints the whole region.
- **Puzzles.**
  1. v = (1, 2), w = (3, 1). Reach (5, 5). Answer: dials 2 and 1.
  2. Same arrows. Reach (−1, 3). Answer: 2 and −1. The game never says in advance that dials can go negative.
  3. *Prediction:* five beacons across the map. Mark the ones you think you can reach, then reach them. All five are reachable.
  4. *The impossible beacon:* v = (1, 2), w = (−2, −4). Beacons at (3, 6), (−1, −2), (2, 1). Win: light the first two, mark (2, 1) unreachable, trace the line the paint fills.
  5. *Mastery:* v = (1, 2), w = (2, k). Find every k for which some beacon is unreachable. Answer: k = 4.
- **Aha.** Two arrows in different directions reach the whole plane. Two arrows on one line reach only that line.
- **Named.** After puzzle 4: "Every point you can reach by stretching v and w and adding them is the span of v and w." "Linear combination" is named in the same log. Formula: span{v, w} = {av + bw : a, b any numbers}.
- **Proof.** Law: "The SPAN of v and w is the WHOLE PLANE EXACTLY WHEN v and w are NOT on ONE LINE." The Proving Ground (section 4) attacks it with parallel pairs and the zero arrow. Show Tamsin: she thinks (2, 1) is unreachable from v = (1, 0), w = (1, 1) "because you can't go backwards." Script: `np.linalg.solve(np.column_stack([v, w]), b)`.
- **Where you will meet this:** every colour a screen shows is a combination of three light vectors; a linear model's predictions always lie in the span of its feature columns.
- **Cue:** "When a problem asks 'can I make b from these?', think span."

#### Chapter 3 · Dead Weight — "Is one of these arrows wasted?" (N04)

- **World problem.** The ferry fleet runs on five currents, and each one burns lamp oil. Tamsin wants to cut as many as possible without losing a single island.
- **New verbs.** PRUNE (remove an arrow; the paint shrinks if it mattered), LOOP (find dials that bring the ferry back to where it started).
- **Puzzles.**
  1. a = (1, 0), b = (0, 1), c = (1, 1), d = (2, 2), e = (−1, 3). Remove as many as you can while the whole plane stays painted. Par: keep 2.
  2. With a, b, c only: find dials, not all zero, that bring the ferry home. Answer 1, 1, −1.
  3. (1, 2), (2, 4), (3, 6): keep the paint unchanged with as few arrows as possible. Answer: one. The paint was only ever a line.
  4. *Prediction, then attempt:* build three arrows in the plane with no loop. The game finds a loop every time.
  5. *Mastery:* Tamsin's rule says "a set is wasteful only when two arrows are parallel." Break it: a, b, c from puzzle 1 have no parallel pair and still loop.
- **Aha.** An arrow is wasted when the others already reach its tip. That is the same thing as a closed loop with dials that are not all zero.
- **Named.** After puzzle 2: "linearly dependent", "linearly independent". Formula: c₁v₁ + c₂v₂ + … + cₖvₖ = 0 only when every c is 0.
- **Proof.** Law: "Arrows are DEPENDENT EXACTLY WHEN SOME NOT-ALL-ZERO dials make a LOOP." The Proving Ground breaks "DEPENDENT EXACTLY WHEN two are PARALLEL" with puzzle 5. Show Tamsin: "Why must three arrows in the plane be dependent?"
- **Where you will meet this:** duplicated features make regression weights non-unique (multicollinearity); a robot arm with extra joints has dependent joint directions.
- **Cue:** "When you can remove something and lose nothing, think dependent."

#### Inquest I — "The Provost's Questions"

Haldane cross-examines the stranger. Testimony: (1) "Two arrows always reach the whole plane." (2) "Removing an arrow always shrinks what you can reach." (3) "A negative dial reaches nowhere new." (4) "The arrow from the Origin to Q has the same numbers as Q." Statements 1–3 are false; present the matching construction from your Codex. Statement 4 is true: objecting to it costs a star and Haldane shows why it holds. He leaves unconvinced but curious.

---

### ACT II — SHADOW AND HEIGHT ("How do I measure space?")

*Story.* Bram, an old bridge-wright, remembers towers. Council law since the Fold reads "Nothing rises." Nobody remembers why. Bram asks you to raise one pillar. You do. The world gets its third dimension back, and Bram is put on trial.

#### Chapter 4 · Shadowline — "How much does one arrow point along another?" (N05)

- **World problem.** Bram's sun plates sit on rails. Each plate shows one number for any arrow you aim at it. The low sun casts every arrow's shadow onto the rails.
- **New verbs.** AIM (turn an arrow; watch the plate), CAST (drop an arrow's shadow onto a rail).
- **Puzzles.**
  1. Rail arrow w = (3, 0). Your arrow v has length 4. Turn it until the plate shows 6. Win at 60°. The readout shows shadow 2 × rail 3 = 6.
  2. *Prediction:* "At what angle will the plate go negative?" Then find the heading where it shows exactly 0: at right angles. Past 90° the shadow points backwards.
  3. v = (2, 3), w = (4, −1). Predict the plate, then aim: 8 − 3 = 5. Then build an arrow that shows 0 against w: (1, 4).
  4. Target t = (3, 4). Candidates a = (6, 8), b = (4, 3), c = (0, 20). "Which points most along t?" The plate favours c (80 against 50 and 24), but c is the least aligned. Dividing by both lengths gives 1, 0.96 and 0.8: a wins.
  5. Cast the shadow of v = (3, 4) onto the rail through u = (2, 1). Win: mark the shadow's tip (4, 2). The gap arrow (−1, 2) shows 0 against the rail.
- **Aha.** The plate shows (length of v's shadow on w) × (length of w). It is zero exactly at right angles and negative past them.
- **Named.** After puzzle 3: "dot product", "orthogonal". Formula v · w = v₁w₁ + v₂w₂ = |v||w|cos θ, beside the law-of-cosines picture that shows why the two sides agree. Projection onto a line after puzzle 5: (v · u / u · u) u.
- **Proof.** Law: "v · w is ZERO EXACTLY WHEN v is PERPENDICULAR to w OR one of them is ZERO." The Proving Ground catches the version that forgets the zero arrow. Show Tamsin: "Why does the reading change sign at 90°?" Script: `v @ w`.
- **Where you will meet this:** cosine similarity ranks search results and compares embeddings; one neuron computes a dot product of weights and inputs; surface brightness in rendering is max(0, n · l).
- **Cue:** "When you see 'how similar' or 'how much along', think dot product."

#### Chapter 5 · Raise — "Which way is straight out of this surface?" (N06) — *signature moment*

- **World problem.** Bram's panel lies on the ground. He wants a pillar straight out of it, as tall as the panel's area. Nothing in Tessel has had height for nineteen years.
- **New verb.** RAISE. Choose two edge arrows; a third arrow grows out of both.
- **Puzzles.**
  1. *(wordless)* Edges a = (2, 0, 0), b = (0, 3, 0). Two plates from Chapter 4 sit on the edges. Drag the new arrow until both show 0, then set its length to the panel's area. Answer (0, 0, 6). As the arrow leaves the ground, the camera leaves top-down for the first time.
  2. Swap the order: b then a gives (0, 0, −6). The pillar drops into the void. The compass shows the right-hand rule.
  3. Slanted panel: a = (1, 2, 0), b = (0, 1, 3). Raise the shield arrow (6, −3, 1), length √46 ≈ 6.78. Both plates must show 0.
  4. Triangle hull plate A = (1, 1, 0), B = (3, 1, 0), C = (1, 1, 2). Area? AB × AC = (0, −4, 0), so the triangle's area is 2.
  5. Edges a = (1, 2, 3), b = (2, 4, 6). Raise. Nothing grows. Win by declaring "no area".
- **Aha.** One arrow is perpendicular to both edges, its length is the parallelogram's area, and the order decides up or down.
- **Named.** After puzzle 2: "cross product", "right-hand rule". Formula after puzzle 3, each component drawn as the signed area of the panel's shadow on one coordinate plane.
- **Proof.** Show Tamsin: "Why is v × v zero?" (collapse the parallelogram). Law: "a × b is PERPENDICULAR to a AND b, and its LENGTH is the AREA they enclose." Script: `np.cross(a, b)`.
- **Where you will meet this:** every triangle in a 3D mesh gets its normal from (B − A) × (C − A); the 2D version is the left-turn test inside convex hull algorithms.
- **Cue:** "When you need a direction perpendicular to two others, think cross product."

#### Chapter 6 · The Hold — "How much space do three arrows enclose?" (N07)

- **World problem.** With height back, Bram builds cargo holds. Three struts from one corner make a slanted box.
- **New verb.** BOX. Three arrows; the box fills with light; the volume shows. A box turned inside out shows its inner face in a different pattern.
- **Puzzles.**
  1. a = (2, 0, 0), b = (0, 3, 0), c = (1, 1, 4). Predict the volume, then build: 24. Now drag c's tip anywhere across the height-4 sheet. The volume stays 24.
  2. Make the volume exactly 12 by moving only c. Any tip at height 2 works.
  3. *Sabotage:* a = (1, 2, 3), b = (0, 1, 1), c = (2, k, 7). Find k that flattens the hold. k = 5, and then c = 2a + b.
  4. Survey stakes P = (0, 0, 0), Q = (1, 0, 2), R = (0, 1, 1), S = (2, 3, 7). One flat sheet or not? Yes, coplanar. Move S to (2, 3, 5): not coplanar, and the tetrahedron PQRS holds 1/3.
  5. Swap two struts: the volume reads −24 and the box turns inside out.
- **Aha.** Volume is base area × height, so sliding the top does not change it. Zero volume means the three arrows lie in one sheet, which is Chapter 3's dependence seen in 3D.
- **Named.** After puzzle 3: "scalar triple product", "coplanar". Formula a · (b × c). (The word determinant is held back until Chapter 14, which calls back to this hold.)
- **Proof.** Law: "Three arrows are COPLANAR EXACTLY WHEN a · (b × c) is ZERO." Show Tamsin: "Why does zero volume mean one arrow is a combination of the other two?"
- **Where you will meet this:** ray–triangle tests in physics engines; spotting flat tetrahedra in simulation meshes; the volume of a closed mesh.
- **Cue:** "When asked 'do these four points lie on one plane?', think scalar triple product."

#### Inquest II — "Bram's Trial"

Bram is charged with raising a pillar. Haldane's testimony: "The cross product of two arrows lies in their plane." "A slanted hold holds more than a straight one with the same base and height." "Three arrows with no parallel pair cannot be coplanar." True trap: "Swapping two struts flips the sign of the volume." You win Bram a fine instead of a ban. Haldane asks you to help the council with its tablets.

---

### ACT III — WHERE THINGS MEET ("Where do all the conditions agree?")

*Story.* Haldane wants relays built to reach the Archive, lost since the Fold. He is a master of the council's stone tablets and a strict, fair teacher. You find the Archive as a whole line of possible places, and Wren, the Archivist, living inside it.

#### Chapter 7 · Rails and Sheets — "How do I describe a straight path or a flat surface with one equation?" (N08)

- **World problem.** Lay light-rails between docks and set glass sheets as floors and walls.
- **New verb.** LAY. A rail is a point plus any multiple of a direction. A sheet is a point and a normal arrow.
- **Puzzles.**
  1. Rail from P = (1, 0, 2) through Q = (3, 4, 2). Does it pass G = (5, 8, 2)? Yes, at t = 2. H = (5, 8, 3)? No.
  2. A floor perpendicular to the pillar n = (1, 2, 2) through A = (2, 0, 1). Turn the sheet until it is square to the pillar, then read its equation: x + 2y + 2z = 4.
  3. A sheet through A = (1, 0, 0), B = (0, 2, 0), C = (0, 0, 3). Raise its normal from AB and AC: (6, 3, 2). Equation 6x + 3y + 2z = 6.
  4. Beacon Q = (3, 3, 3) above the floor from puzzle 2. Drop a rail straight down onto it. Distance 11/3.
  5. *Mastery:* patrol rails s(1, 0, 0) and (0, 1, 2) + t(0, 1, 0) never meet. Shortest gap between them: 2.
- **Aha.** A sheet is every point whose arrow from A is perpendicular to n, so its equation is a dot product. The numbers in front of x, y, z are the normal.
- **Named.** After puzzle 2: "parametric equation of a line", "normal vector", "equation of a plane".
- **Proof.** Law: "In ax + by + cz = d, the ARROW (a, b, c) is PERPENDICULAR to the SHEET." Show Tamsin: "Why does ax + by + cz = d describe a flat sheet and not a curved one?"
- **Where you will meet this:** ray casting is a line meeting a plane; a linear classifier is a sheet w · x + b = 0 whose normal is the weight vector.
- **Cue:** "When an equation has no powers and no products of unknowns, think flat."

#### Chapter 8 · Crossing Point — "Where do these sheets all meet?" (N09)

- **World problem.** A relay must sit in range of three transmitters, which means inside three sheets at once.
- **New verbs.** MEET (common points glow) and TWIN VIEW: a split screen showing the same numbers as rows (sheets meeting) and as columns (arrows reaching b).
- **Puzzles.**
  1. Flat warm-up: x + y = 5, x − y = 1. The lines cross at (3, 2). Twin view: 3·(1, 1) + 2·(1, −1) = (5, 1). Drag the point on the left; the dials on the right move with it.
  2. x + y + z = 6, x − y + 2z = 5, 2x + y − z = 1. One point: (1, 2, 3).
  3. x + y + z = 3, x − y = 1, 2x + z = 4. Classify first ("one, none, or many?"), then place three relays on the common line (0, −1, 4) + t(1, 1, −2).
  4. Change the last right side to 5. No common point: the sheets meet in pairs along three parallel lines. Classify "none".
  5. Tamsin says she found exactly two relay spots. Show that the point halfway between them works too.
- **Aha.** None, one, or infinitely many, never two, because two solutions bring the whole line through them. The row picture and the column picture ask the same question.
- **Named.** After puzzle 3: "system of linear equations", "solution set", "consistent", "inconsistent". The shorthand Ax = b is introduced as a label for the twin view.
- **Proof.** Law: "IF two POINTS solve the system THEN EVERY point on the LINE through them solves it." Show Tamsin: puzzle 5.
- **Where you will meet this:** every intersection test in a game engine; fitting n data points exactly with n weights.
- **Cue:** "When several conditions must hold at once, think sheets meeting."

#### Chapter 9 · The Tablets — "How do I untangle the equations without changing the answer?" (N10)

- **World problem.** Haldane's council writes every survey on a stone tablet. Each row of a tablet is tied to one sheet in the world.
- **New verb.** REDUCE, with three gestures: swap two rows (drag one onto another); scale a row (turn its dial, never to zero); add a multiple of one row to another (drag with a multiplier dial). The sheets turn live. Their common point stays pinned with a small light.
- **Puzzles.**
  1. [1 1 | 5; 1 −1 | 1]. One move to a staircase. The second line turns flat; the crossing stays at (3, 2).
  2. Chapter 8's three sheets. Two separate stars: fewest moves (3, with a fraction) and no fractions (4, using a swap). Answer (1, 2, 3).
  3. [0 2 1 | 4; 1 1 1 | 4; 2 1 3 | 9]. The top-left entry is 0, so the first move must be a swap. Answer (1, 1, 2).
  4. *Parameter:* [1 2 | 3; 2 k | 6]. Drag k and watch the lines. Exactly one solution for k ≠ 4; at k = 4 the lines coincide. Change the 6 to a 7: at k = 4 there is no solution.
  5. Try to swap two columns. The pinned point jumps. Win by explaining why rows may be swapped and columns may not.
- **Aha.** Adding a multiple of one row to another turns its sheet about the line where the two sheets meet, so the common point never moves. Every legal move can be undone, so no solution is gained or lost.
- **Named.** After puzzle 2: "augmented matrix", "row operations", "pivot", "row echelon form", "back substitution".
- **Proof.** Procedure (Tamsin runs it, section 4): "FIND a PIVOT; CLEAR every entry BELOW it; MOVE to the NEXT ROW and COLUMN." It shows its Python translation beside it. Show Tamsin: "Why does adding a multiple of one equation to another not change the solutions?"
- **Where you will meet this:** Gaussian elimination sits inside `numpy.linalg.solve`; partial pivoting avoids dividing by tiny numbers.
- **Cue:** "When you see a system, write the augmented matrix and look for pivots."

#### Chapter 10 · Free Ground — "What does the answer look like when there are infinitely many?" (N11)

- **World problem.** The Archive drifts. Any spot that meets the council's constraints is a safe landing, and there are infinitely many. Describe all of them with dials.
- **New verb.** FREE. Mark a column with no pivot as free. A dial appears; turning it slides a marker along the whole solution set.
- **Puzzles.**
  1. Reduce Chapter 8's puzzle 3 to reduced row echelon form: x = 2 − z/2, y = 1 − z/2, z free. Enter (2, 1, 0) + t(−1, −1, 2) and turn t to land on three marked spots, one of them (0, −1, 4).
  2. One equation, three unknowns: x + 2y − z = 4. Two free columns, two dials: (4, 0, 0) + s(−2, 1, 0) + t(1, 0, 1). The solutions fill a sheet.
  3. The same tablet as puzzle 1 with zeros on the right. The solution line now passes through the Origin, parallel to the first. Win: move one line onto the other with a single arrow.
  4. Crane: three joints with directions (1, 0), (0, 1), (1, 1); the hook must stay at (3, 2). All settings: (3, 2, 0) + t(−1, −1, 1). Turn t and watch the crane move while the hook stays still.
  5. *Mastery:* [1 2 1 1 | 5; 2 4 0 2 | 6; 1 2 2 1 | 7] to reduced row echelon form in par moves, whole numbers only. Answer: x₁ = 3 − 2x₂ − x₄, x₃ = 2.
- **Aha.** Each column without a pivot is a free choice. Every solution is one particular solution plus a solution of the system with zeros on the right.
- **Named.** After puzzle 1: "reduced row echelon form", "free variable", "basic variable", "parametric form". After puzzle 3: "homogeneous system".
- **Proof.** Law: "EVERY SOLUTION of Ax = b is ONE SOLUTION PLUS a SOLUTION of Ax = 0." Show Tamsin: puzzle 3.
- **Where you will meet this:** with more weights than data points, infinitely many weight settings fit perfectly, which is why machine learning needs regularisation.
- **Cue:** "When a column has no pivot, think free dial."

#### Inquest III — "The Council's Method"

Testimony: "More unknowns than equations means infinitely many solutions." (False: x + y + z = 1 and x + y + z = 2 share none.) "Multiplying a row by any number keeps the solutions." (False: zero.) "A free column always means infinitely many solutions." (False: the system can still be inconsistent.) True trap: "Three equations in three unknowns can have no solution." After the Inquest, Haldane shows you the Great Frame that made the Fold. He intends to run it backwards.

---

### ACT IV — FRAMES ("How do I move all of space, and can I undo it?")

*Story.* Haldane teaches you the Frames: brass rings that move a whole island at once. He is training you because he needs a surveyor to undo the Fold. The act ends at the Great Frame.

#### Chapter 11 · Frames — "Where do the grid lines go?" (N12, N13)

- **World problem.** Each frame shows two grey basis arrows, e₁ and e₂. Drag where they land, and every point on the island moves with them: houses, canals, lamps.
- **New verbs.** WARP (drag where e₁ and e₂ land; the whole grid follows), LAND (predict where one point goes).
- **Puzzles.**
  1. *(wordless)* Match the ghost of the island turned a quarter turn. *Prediction:* "Before you drag: where must e₁ go?" Answer: e₁ to (0, 1), e₂ to (−1, 0).
  2. Match a leaning tower: e₁ stays at (1, 0), e₂ goes to (1, 1). The grid lines stay straight, parallel and evenly spaced.
  3. A frame with columns (2, 1) and (1, 3). A lamp sits at x = (2, −1). Mark where it lands before applying: (3, −1) = 2·(2, 1) − 1·(1, 3). The yellow arrow is built from the green and red columns on screen.
  4. Same frame. Which point lands on the dock at (5, 5)? x = (2, 1). (This is Chapter 2's puzzle, now inside a frame.)
  5. Four warps: a quarter turn; sliding everything right by 1; bending the canals into curves; pressing everything flat onto the x-axis. Which can a frame make? The turn and the press. Sliding moves the Origin; bending curves the grid lines.
- **Aha.** Two arrows fix everything, because every point is a combination of e₁ and e₂. Ax is the combination of A's columns with x's numbers as the dials.
- **Named.** After puzzle 3: "linear transformation", "matrix" (its columns are where e₁ and e₂ land), "matrix–vector product". Formula Ax = x₁a₁ + x₂a₂, then the row-by-row dot product view beside it.
- **Proof.** Law: "The COLUMNS of A are where e₁ and e₂ LAND." Show Tamsin: "Why do T(e₁) and T(e₂) fix the whole transformation?" Script: `A @ x`.
- **Where you will meet this:** every 3D game moves models with matrices; each neural network layer is a matrix followed by a non-linear function.
- **Cue:** "When you see a matrix, ask where the basis arrows land."

#### Chapter 12 · Stacked Frames — "What single move does two moves in a row?" (N14)

- **World problem.** Two frames share one pedestal. The right-hand frame acts first.
- **New verb.** STACK.
- **Puzzles.**
  1. Quarter turn R = [[0, −1], [1, 0]] and shear S = [[1, 1], [0, 1]]. The target is "turn, then shear". Predict the order, then check: SR = [[1, −1], [1, 0]] matches; RS = [[0, −1], [1, 1]] lands elsewhere.
  2. Type the single frame for "turn, then shear" by following e₁ and e₂ through both moves: e₁ ends at (1, 1), e₂ at (−1, 0).
  3. Reflect across the line y = x twice. The grid returns. Name the frame that changes nothing.
  4. *Mastery:* find two frames, neither all zeros, that stack to the frame that sends everything to the Origin. One answer: B = [[1, 0], [0, 0]] first, then A = [[0, 0], [0, 1]].
  5. *Cartographer:* B = [[1, 2], [0, 1]]. Find M so that (Bx) · y = x · (My) for every x and y. The Proving Ground tests 200 random pairs. Answer [[1, 0], [2, 1]].
- **Aha.** Column j of AB is where e_j lands after both moves. Doing two moves in a different order can leave the grid in a different place.
- **Named.** After puzzle 2: "matrix product", "composition". After puzzle 3: "identity matrix". After puzzle 5: "transpose".
- **Proof.** Law: "In AB, B MOVES FIRST." Show Tamsin: "Why is column j of AB equal to A times column j of B?"
- **Where you will meet this:** graphics pipelines multiply model, view and projection matrices into one; stacked linear layers with no non-linear step collapse to one matrix.
- **Cue:** "When two moves happen in a row, multiply right to left."

#### Chapter 13 · Undoing — "How do I undo a move?" (N15)

- **World problem.** On the night of the Fold, smaller frames warped the outer islands. Put them back.
- **New verb.** UNDO. Build the frame that returns every point. The original island shows as a ghost to match.
- **Puzzles.**
  1. Undo the quarter turn: [[0, 1], [−1, 0]].
  2. A = [[2, 1], [1, 1]]. "Which point does A send to e₁? Which to e₂?" Answers (1, −1) and (−1, 2). Those are the columns of the undo frame.
  3. *Surveyor:* row-reduce [A | I] on a tablet with A = [[1, 1, 0], [0, 1, 1], [1, 0, 1]]. Inverse = ½·[[1, −1, 1], [1, 1, −1], [−1, 1, 1]].
  4. An island was turned, then sheared. Stack the two undo frames. Only one order works: undo the shear first.
  5. A = [[1, 2], [2, 4]]. Win by declaring "cannot be undone" and showing two points that land on the same spot: (2, 0) and (0, 1) both land on (2, 4).
- **Aha.** An undo frame exists exactly when no two points land on the same spot, which is exactly when nothing is flattened.
- **Named.** After puzzle 2: "inverse", "invertible". After puzzle 5, the title lands: "A matrix that flattens space is called singular. It has no inverse."
- **Proof.** Law: "A is INVERTIBLE EXACTLY WHEN NO TWO POINTS LAND on ONE SPOT." Procedure: row-reduce [A | I]. Show Tamsin: "Why does (AB)⁻¹ reverse the order?"
- **Where you will meet this:** clicking on a 3D scene uses the inverse camera matrix to turn a pixel into a ray; numerical libraries solve Ax = b instead of building A⁻¹.
- **Cue:** "When you need to go back, think inverse, and first check that nothing was flattened."

#### Chapter 14 · The Measure of Area — "What happens to the area?" (N16) — *act climax*

- **World problem.** Every frame carries a gold unit tile. Haldane is preparing the Great Frame.
- **New verb.** MEASURE. The gold tile shows its area after the move. If the move flips it, the tile shows its back face.
- **Puzzles.**
  1. Shape a hold of area exactly 6 by dragging e₁ and e₂. One answer: (3, 0) and (1, 2).
  2. *Derive it:* columns (3, 1) and (1, 2). Drag the corner pieces out of the 4 × 3 bounding box until only the parallelogram is left: 12 − 3 − 2 − 2 = 5 = 3·2 − 1·1.
  3. A doubles area and B triples it. Predict what AB does, then check: 6. A reflection gives −1 and the tile shows its back.
  4. A shield generator [[2, k], [3, 6]]. Find k that flattens it: k = 4.
  5. Slide the top edge of a parallelogram along its own line. The area does not change, so adding a multiple of one column to another keeps the determinant. (Callback to the Hold.)
  6. *Surveyor:* the frame from Chapter 13 scales volume by 2. Its columns' scalar triple product from Chapter 6 gives the same 2.
  7. *Story:* the Great Frame's gold cube measures 0. Haldane's council believes a sliver of height survived and has built a near-undo frame that multiplies every height by 1000. Apply it to the Archive's heights, each off by 1 mm. Islands are flung metres into the sky.
- **Aha.** The determinant is the factor by which a move scales area (or volume), with a sign for flips. Zero means flattened, and flattened means no inverse.
- **Named.** After puzzle 2: "determinant", ad − bc. Surveyor adds cofactor expansion and the row-reduction method for 3 × 3.
- **Proof.** Law: "det A = 0 EXACTLY WHEN A FLATTENS SPACE." Show Tamsin: "Why does det(AB) = det A × det B?" Script: `np.linalg.det(A)`.
- **Where you will meet this:** normalising flows track how probability density changes with the Jacobian determinant; orientation tests in graphics.
- **Cue:** "When asked 'can it be undone?' or 'is it flat?', compute the determinant."

#### Inquest IV — "The Great Frame"

The climax of the first half. Haldane's testimony: "Any move can be undone if you are precise enough." "A determinant of 0.001 is as good as any other that is not zero." "To undo turn-then-shear, undo the turn first." "The Fold left a little height. We can scale it back." Evidence: two points on one spot; the 1 mm error that becomes 1 m; the order demonstration. True trap: "A frame with determinant −1 can be undone." You stop the Great Frame. Haldane: "She was my sister. I have tried to bring her back for nineteen years." He leaves the council.

---

### ACT V — WHAT THE FOLD KEPT ("What survives a move, and what is lost?")

*Story.* With Haldane gone, Tamsin and Wren help you study the Fold itself. You find out what the light at the Origin is. At the Eastern Shelf, an island tilted in the Fold, you find a sealed log from Ines.

#### Chapter 15 · Blind Spots — "What can this move reach, and what does it send to the Origin?" (N17)

- **World problem.** Wren keeps old frames whose effects nobody recorded. Fire probe points through them and map what happens.
- **New verb.** PROBE. Send probe points through a frame. Where they land paints yellow. Every probe that lands on the Origin leaves its starting point glowing violet.
- **Puzzles.**
  1. A = [[1, 0, 1], [0, 1, 1], [1, 1, 2]]. Find a probe, not the Origin itself, that lands on the Origin: (1, 1, −1). The violet line appears through it.
  2. Same frame. Which beacons can it land on: (1, 2, 3), (2, 2, 3), (0, 0, 0)? Place the yellow sheet z = x + y; the first and third.
  3. Survey zones must hold the Origin and stay closed when you add or stretch arrows inside them. Test: the line y = 2x; the line y = 2x + 1; the first quarter of the plane; the two axes together; the sheet z = x + y. For each impostor, find an arrow that escapes.
  4. Solve Ax = (1, 2, 3). One answer is (1, 2, 0). Find all: (1, 2, 0) + t(1, 1, −1), a line parallel to the violet line.
  5. *Story:* probe the Great Frame F = [[1, 0, 0], [0, 1, 0], [0, 0, 0]].
- **Aha.** The yellow region is everything the move can reach; the violet region is everything it sends to the Origin. Two inputs land on the same spot exactly when they differ by a violet arrow.
- **Named.** After puzzle 2: "subspace", "column space", "null space".
- **The light at the Origin** (signature moment, section 8): in puzzle 5, the violet region of the Great Frame is the vertical line through the Origin. Every point on it, at every height, landed on one point. The Observatory Tower stood on that line.
- **Proof.** Laws: "Ax = b has a SOLUTION EXACTLY WHEN b is IN the COLUMN SPACE." "TWO SOLUTIONS DIFFER by an arrow in the NULL SPACE." Show Tamsin: "Why does every solution of Ax = b differ from another by a null space arrow?"
- **Where you will meet this:** a robot arm's null-space motion moves the elbow without moving the hand; directions a network layer sends to zero are invisible to the next layer.
- **Cue:** "'What can it reach?' → column space. 'What does it send to zero?' → null space."

#### Chapter 16 · Counting Directions — "How many directions survive?" (N18)

- **World problem.** Wren needs new frames built to order, and some of the orders are impossible.
- **New verb.** COUNT. The Ledger splits a frame's columns into pivot columns (directions kept) and free columns (directions flattened).
- **Puzzles.**
  1. From (1, 0, 1), (0, 1, 1), (1, 1, 2), (2, 1, 3), keep a smallest set that still reaches everything the four reach. Any two independent arrows; the count is 2.
  2. A = [[1, 2, 0, 1], [2, 4, 1, 4], [3, 6, 1, 5]]. Reduce. Pivots in columns 1 and 3, so rank 2. Null space from the free columns: (−2, 1, 0, 0) and (−1, 0, −2, 1). Count: 2 + 2 = 4 columns.
  3. *Trap:* the game uses the reduced matrix's pivot columns as a basis for the column space and draws the sheet they reach. It misses A's own columns. Use the original columns (1, 2, 3) and (0, 1, 1).
  4. Orders: a 3 × 4 frame with rank 2 and nullity 2 (build it); a 3 × 4 frame with rank 3 and nullity 2 (impossible: explain); a 3 × 5 frame that flattens nothing (impossible).
  5. **The Constellation:** a star map in the Observatory. For a 3 × 3 frame, each star is one statement: det ≠ 0; columns independent; columns span 3D; a pivot in every column; reduced row echelon form is I; null space is only the Origin; invertible. Each link is drawn by a short construction. Completing it shows they are one fact.
- **Aha.** Every input direction is either kept or flattened, so rank + nullity = the number of columns.
- **Named.** After puzzle 1: "basis", "dimension". After puzzle 2: "rank", "nullity", "rank–nullity theorem". After puzzle 5: "the Invertible Matrix Theorem".
- **Proof.** Law: "RANK + NULLITY = the NUMBER of COLUMNS." Show Tamsin: "Why can a 3 × 5 matrix never be one-to-one?"
- **Where you will meet this:** LoRA fine-tunes large language models with low-rank updates; the rank of a data matrix counts truly independent features.
- **Cue:** "When asked how many solutions or free choices, count pivots."

#### Chapter 17 · Other Grids — "Same point, different grid: what are its numbers now?" (N19)

- **World problem.** The Eastern Shelf tilted in the Fold. Its people measure with a skewed grid: b₁ = (2, 1), b₂ = (1, 1). Pell, a Shelf runner, gives every direction in Shelf numbers.
- **New verb.** TRANSLATE. Overlay both grids. Every point carries two sets of numbers.
- **Puzzles.**
  1. Pell says "3 along b₁, −1 along b₂." Where is that in your grid? (5, 2).
  2. Your beacon is at (4, 3). What are its Shelf numbers? (1, 2).
  3. The Shelf's move is "stretch along b₁ by 2, keep b₂". In Shelf numbers it is [[2, 0], [0, 1]]. Type it in your grid: [[3, −2], [1, 0]]. Check: b₁ doubles, b₂ stays.
  4. Try P⁻¹AP and PAP⁻¹. Only one of them gives the Shelf's frame. Convert in, move, convert out.
  5. *Mastery:* [[3, −2], [1, 0]] and [[2, 0], [0, 1]] both have determinant 2. Explain why without computing either.
- **Aha.** A matrix with messy numbers can be a plain stretch in the right grid.
- **Named.** After puzzle 1: "coordinates relative to a basis", "change-of-basis matrix". After puzzle 4: "similar matrices".
- **Proof.** Law: "The MATRIX whose COLUMNS are the NEW BASIS arrows turns NEW numbers into OLD numbers." Show Tamsin: "Why is the matrix in the new basis P⁻¹AP and not PAP⁻¹?"
- **Where you will meet this:** world, camera and object frames in every game engine; JPEG stores images in a cosine basis.
- **Cue:** "When two people give the same point different numbers, think change of basis."

#### Act V finale — Tamsin's Inquest

Tamsin, angry that Ines made the Fold, runs this one. Her testimony: "The Fold destroyed the Tower." (It sent the Tower to one point; it did not remove the records of it.) "Two different matrices can never describe the same move." "A 3 × 5 frame always flattens something." (True.) Then the sealed log at the Shelf, in Ines's voice: "Nothing rises. The Tide comes back in nineteen years. If you are hearing this, it is close."

---

### ACT VI — THE TIDE ("What happens when a move repeats?")

*Story.* The Great Tide arrives: thirty nights. Each Tide night, every point of Tessel moves by the same matrix: the islands turn 30° about the Origin and every height grows by a quarter. Bram's pillars from Act II start to stretch.

#### Chapter 18 · Lines That Hold — "Which arrows stay on their own line?" (N20)

- **World problem.** Find out exactly what the Tide does, before it pulls everything apart.
- **New verb.** SWEEP. Turn a probe arrow through a full circle while a frame acts on it. The output arrow follows. A chime sounds when input and output lie on one line.
- **Puzzles.**
  1. A = [[3, 1], [0, 2]]. Find both lines that hold and their stretches: along (1, 0) by 3, along (1, −1) by 2.
  2. A quarter turn. No line holds. Win by declaring it.
  3. Shear [[1, 1], [0, 1]]. Only one line holds, with stretch 1.
  4. *The flattening dial:* drag λ. The game applies A − λI to the grid. At λ = 3 and λ = 2 the grid collapses onto a line, with the same visual and sound as the Fold. det(A − λI) = (3 − λ)(2 − λ).
  5. *Surveyor:* [[2, 0, 0], [0, 3, 4], [0, 4, −3]]. Stretches 2, 5, −5 along (1, 0, 0), (0, 2, 1), (0, 1, −2).
  6. *Story:* sweep a probe through the Tide in 3D. Every ground direction turns. Only the vertical line holds, with stretch 1.25.
- **Aha.** Most arrows change direction under a move. The ones that stay on their line only get longer, shorter or flipped. The stretches are exactly the λ that make A − λI flatten space.
- **Named.** After puzzle 1: "eigenvector", "eigenvalue". After puzzle 4: "characteristic equation".
- **Proof.** Law: "λ is an EIGENVALUE EXACTLY WHEN A − λI is SINGULAR." Show Tamsin: "Why do we need det(A − λI) = 0 rather than solving (A − λI)v = 0 directly?"
- **Where you will meet this:** exploding and vanishing gradients in recurrent networks; spectral clustering.
- **Cue:** "When the same move repeats, look for the lines that hold."

#### Chapter 19 · A Thousand Nights — "What happens if I repeat this move many times?" (N21)

- **World problem.** Forecast the Tide, then build something that stops it tearing Tessel apart.
- **New verbs.** REPEAT (apply a frame n times) and RE-GRID (switch to the grid of lines that hold, where the frame only stretches along the axes).
- **Puzzles.**
  1. The Shelf's frame from Chapter 17, T = [[3, −2], [1, 0]]. Start at (3, 2). Where is it after 10 nights? In the grid of lines that hold, (3, 2) = b₁ + b₂, so the answer is 1024·b₁ + b₂ = (2049, 1025). Par: one power, no repeated multiplication.
  2. Choose a start that never drifts: any multiple of b₂ = (1, 1).
  3. The Archive's tally follows "next = this + previous", starting 1, 1. Use [[1, 1], [1, 0]] to find the 20th value: 6765. The ratio of neighbours settles near 1.618, the larger stretch.
  4. Try to re-grid the shear [[1, 1], [0, 1]]. It has only one line that holds, so no such grid exists. Declare it.
  5. *Story:* the Great Tide in 3D. After 12 nights the ground is back where it began, and a 2 m post is 29.1 m tall. After 30 nights a 10 m tower would be over 8 km tall. This is Ines's reason, in numbers.
  6. *Story climax — the Ward:* build a frame W so that W after T keeps every height. In the ground grid, W = diag(1, 1, 0.8). The Ward stones are cut in the Shelf's 3D grid (b₁ = (2, 1, 0), b₂ = (1, 1, 0), b₃ = (1, 0, 1)), so type W there: [[1, 0, 0.2], [0, 1, −0.2], [0, 0, 0.8]].
- **Aha.** In the right grid, repeating the move only repeats the stretching: A^k = PD^kP⁻¹. The largest stretch decides the long run.
- **Named.** After puzzle 1: "diagonalisation", A = PDP⁻¹, "diagonalisable".
- **Proof.** Law: "A^k = P D^k P⁻¹ BECAUSE the P⁻¹P PAIRS CANCEL." Show Tamsin: "Why do the P⁻¹P pairs cancel?"
- **Where you will meet this:** Fibonacci in O(log n) steps; counting walks of length k in a graph; stability of recurrent networks.
- **Cue:** "When you see A¹⁰⁰, think re-grid first."

#### Chapter 20 · Where Everything Settles — "Where does everything end up?" (N22)

- **World problem.** The Ward needs light. Each night, light moves between beacons in fixed shares. The Ward lights only if, in the long run, at least half of all light sits at its site.
- **New verb.** FLOW. Set the shares in each column (each column must add to 1). Watch the light redistribute night by night.
- **Puzzles.**
  1. Two sites, P = [[0.9, 0.2], [0.1, 0.8]]. All light starts at A. Predict where it settles: 2/3 at A. Start it all at B instead: the same place.
  2. How fast? The other eigenvalue is 0.7, so the gap shrinks by 0.7 each night. After 10 nights it is under 3% of what it was.
  3. Three sites, every column (0.5, 0.25, 0.25) in some order: settles at 1/3 each. Edit the columns so the Ward site gets at least half. One answer: columns (0.8, 0.1, 0.1), (0.4, 0.4, 0.2), (0.4, 0.2, 0.4), which settles at 2/3.
  4. The swap chain [[0, 1], [1, 0]]: the light moves back and forth forever. Declare "never settles" and point to the eigenvalue −1.
  5. *Mastery:* a lantern network of five islands with damping 0.85. Rank the islands by long-run light (the PageRank construction).
- **Aha.** The settled state is an eigenvector with eigenvalue 1. Every other part shrinks away night by night.
- **Named.** After puzzle 1: "Markov chain", "transition matrix", "steady state", "probability vector".
- **Story.** Haldane returns and redirects the council's light to the Ward. On the next Tide night, nothing stretches.
- **Proof.** Law: "IF every COLUMN ADDS to 1 THEN 1 is an EIGENVALUE." Show Tamsin: "Why must a matrix whose columns add to 1 have eigenvalue 1?"
- **Where you will meet this:** PageRank; Markov decision processes in reinforcement learning; n-gram language models.
- **Cue:** "When you see 'in the long run' with fixed shares, think eigenvalue 1."

---

### ACT VII — THE CLOSEST POINT ("No exact answer exists. What is the best one?")

*Story.* The Tide is tamed, so heights can return. But the Fold erased every height, and there is no inverse. Wren's Archive holds old survey records taken before the Fold: shadows of each island on many survey sheets, measured by hand, and they disagree with each other.

#### Chapter 21 · Drop the Perpendicular — "What is the closest point I can reach?" (N23)

- **World problem.** Each Archive record is a shadow on a sheet. Learn exactly how a shadow relates to the point that cast it.
- **New verb.** DROP. From a beacon, drop a perpendicular onto a line or sheet. Its foot glows.
- **Puzzles.**
  1. A ferry confined to the sheet reached by (1, 0, 0) and (0, 1, 0) must get as close as it can to (3, 4, 5). Answer (3, 4, 0), distance 5.
  2. Sheet reached by u₁ = (1, 1, 0) and u₂ = (0, 0, 1), which are perpendicular. Beacon (3, 1, 2). Closest point (2, 2, 2); the error arrow (1, −1, 0) is perpendicular to both.
  3. *Trap:* sheet reached by (1, 0, 0) and (1, 1, 0); beacon (2, 3, 4). The game adds the two shadows and gets (4.5, 2.5, 0). Explain why that is wrong. The closest point is (2, 3, 0).
  4. Build the frame that sends every point to its shadow on the line through u = (1, 2): (1/5)·[[1, 2], [2, 4]]. Apply it twice: the second time nothing moves. Its determinant is 0.
  5. *Story:* write the frame of the Fold as a shadow onto the ground: [[1, 0, 0], [0, 1, 0], [0, 0, 0]].
- **Aha.** The shortest error arrow is perpendicular to the sheet. Any other point is further away, by Pythagoras.
- **Named.** After puzzle 2: "orthogonal projection", "orthogonal complement". After puzzle 4: "projection matrix".
- **Proof.** Law: "The CLOSEST POINT is where the ERROR is PERPENDICULAR to the SHEET." Show Tamsin: "Why does the shortest error arrow have to be perpendicular?"
- **Where you will meet this:** removing an unwanted direction from word embeddings; orthographic views in CAD and strategy games.
- **Cue:** "When you see 'closest' or 'best approximation', drop a perpendicular."

#### Chapter 22 · Square Grid — "How do I build a square grid from a skewed one?" (N24)

- **World problem.** The Archive's measuring frame has drifted over nineteen years. Its axes are skewed and of different lengths. Rebuild a square grid of unit arrows over the same sheet.
- **New verb.** SQUARE. Take the arrows one at a time. Remove each one's shadows on the earlier ones. Scale it to length 1.
- **Puzzles.**
  1. a₁ = (3, 1), a₂ = (2, 2). Remove a₂'s shadow on a₁: (−0.4, 1.2). Scale both to length 1.
  2. a₁ = (1, 1, 0), a₂ = (1, 0, 1), a₃ = (0, 1, 1). Square them: (1, 1, 0), (1/2, −1/2, 1), (−2/3, 2/3, 2/3), then scale.
  3. Decode a record written in the grid q₁ = (3/5, 4/5), q₂ = (−4/5, 3/5). The point (5, 5) has numbers (7, −1), found with one dot product each.
  4. Which frames move the grid without stretching or skewing it? [[3/5, −4/5], [4/5, 3/5]]: yes. [[0, 1], [1, 0]]: yes. [[1, 1], [−1, 1]]: no, its columns are perpendicular but have length √2. The shear: no.
  5. A turn frame has drifted after 10,000 multiplications to [[0.99, −0.13], [0.15, 1.01]]. Square it again.
- **Aha.** In a square unit grid, each coordinate is one dot product, because every other grid arrow is perpendicular. So the inverse of such a frame is its transpose.
- **Named.** After puzzle 2: "orthonormal basis", "Gram–Schmidt process". After puzzle 4: "orthogonal matrix". Surveyor: "QR factorisation".
- **Proof.** Procedure (Tamsin runs it): "FOR EACH arrow: SUBTRACT its SHADOW on EVERY EARLIER arrow; SCALE to LENGTH 1." Its Python appears alongside. Law: "QᵀQ = I WHEN the COLUMNS of Q are ORTHONORMAL."
- **Where you will meet this:** re-squaring rotation matrices in games and robots; building a camera's right/up/forward frame; orthogonal weight initialisation.
- **Cue:** "When a basis is skewed and you need easy coordinates, think Gram–Schmidt."

#### Chapter 23 · Best Answer — "No exact answer exists. What is the best one?" (N25)

- **World problem.** Raise each island to its old height using Archive records that disagree.
- **New verb.** FIT. Drag a line through data points. Residual bars show each miss; the score is the sum of their squares. TWIN VIEW: the data view beside the column-space view, where b sits off the sheet of predictions you can make.
- **Puzzles.**
  1. Four records of one island's height: 4.1, 3.9, 4.3, 3.7. Best single height: 4.0, the mean.
  2. Shoreline heights (0, 1), (1, 2), (2, 2). Fit y = c + mx. Par score 1/6, at c = 7/6, m = 1/2. In the twin view, b = (1, 2, 2) is off the sheet and the best prediction is its shadow.
  3. *Prediction:* "Will moving the line towards the outlier lower the score?" Data (0, 0), (1, 1), (2, 1), (3, 4). Best line y = −0.3 + 1.2x.
  4. *Surveyor:* write AᵀAx = Aᵀb for puzzle 2 and solve by hand: [[3, 3], [3, 5]]x = (5, 6). Each row says "the residual is perpendicular to this column."
  5. *Mastery:* fit a parabola to five records (three unknowns).
- **Aha.** Least squares is a projection. The best prediction is the shadow of b on the column space, so the residual is perpendicular to every column.
- **Named.** After puzzle 2: "least squares", "residual". After puzzle 4: "normal equations".
- **Story.** The islands rise. Tessel has height again. Only the Tower is missing: every point of it sits on the Origin, and the island records say nothing about it.
- **Proof.** Law: "The RESIDUAL is PERPENDICULAR to EVERY COLUMN of A." Show Tamsin: "What is perpendicular to what in least squares, and in which space?" Script: `np.linalg.lstsq(A, b)`.
- **Where you will meet this:** linear regression, where machine learning starts; gradient descent on squared error reaches the same answer; GPS position fixes.
- **Cue:** "More equations than unknowns, and they disagree? Think least squares."

---

### ACT VIII — SINGULAR ("What is the shape of what remains?")

*Story.* Every point of the Tower sits on the Origin, and no measurement taken after the Fold can tell those points apart. Wren opens the Archive's deepest room. Before the Fold, the Tower was the most-surveyed building in Tessel: every apprentice recorded its stones, and the order kept likeness records of all forty surveyors who worked there. Rebuilding them is a data problem.

#### Chapter 24 · Bowls and Saddles — "Which moves only stretch along perpendicular axes?" (N26)

- **World problem.** The light at the Origin sits in a field whose height at each point x is E(x) = xᵀAx. To open it safely, find the field's lowest point, if it has one.
- **New verb.** DESCEND. Release a probe on the surface; it rolls downhill.
- **Puzzles.**
  1. A = [[2, 1], [1, 2]], so E = 2x² + 2xy + 2y². Turn the survey grid until the xy term vanishes: 45°. In the new grid E = 3u² + v².
  2. A = [[1, 2], [2, 1]]. Classify before releasing: a saddle (eigenvalues 3 and −1). The probe rolls away along (1, −1).
  3. Write [[2, 1], [1, 2]] as turn, stretch, turn back: QDQᵀ with Q's columns (1, 1)/√2 and (1, −1)/√2, and D = diag(3, 1).
  4. Tamsin tries to build a symmetric frame whose two lines that hold meet at 60°. Every attempt fails. Show why.
  5. On the unit circle, find where E is largest: at (1, 1)/√2, value 3, the largest eigenvalue.
- **Aha.** A symmetric matrix stretches along perpendicular axes. In those axes there is no cross term, and the signs of the eigenvalues say bowl, saddle or upside-down bowl.
- **Named.** After puzzle 3: "symmetric matrix", "spectral theorem", "quadratic form". After puzzle 2: "positive definite", "indefinite".
- **Proof.** Law: "A SYMMETRIC matrix's EIGENVECTORS for DIFFERENT EIGENVALUES are PERPENDICULAR." Show Tamsin: puzzle 4.
- **Where you will meet this:** a positive definite Hessian marks a minimum; saddle points slow neural network training; covariance matrices are symmetric.
- **Cue:** "When you see xᵀAx, find the eigenvalues of A."

#### Chapter 25 · Unfolding — "What does any matrix do to a circle?" (N27)

- **World problem.** Take the Fold apart, and compress Wren's records so the Ward stones can hold them.
- **New verbs.** UNFOLD (turn a perpendicular input cross until its outputs are also perpendicular; the move splits into turn, stretch, turn) and LAYER (rebuild a picture one rank-one layer at a time).
- **Puzzles.**
  1. A = [[3, 0], [4, 5]]. Turn the input cross until the outputs are perpendicular: inputs along (1, 1) and (1, −1). Stretches √45 ≈ 6.71 and √5 ≈ 2.24. Their product is 15 = |det A|.
  2. Unfold the Fold: stretches 1, 1 and 0. The 0 is the lost direction.
  3. Unfold Haldane's near-undo frame from Chapter 14: stretches 1, 1 and 0.001. The ratio of the largest to the smallest is 1000, which is why 1 mm became 1 m.
  4. Send a 64 × 64 schematic of the Tower door through the Ward stones. Choose the smallest k that passes the readability check. Cost: k × (64 + 64 + 1) numbers instead of 4096.
  5. Wren's Tower records (12 numbers per stone) have singular values 52, 31, 18, 1.4, 1.2, 1.0, … Where is the cliff? Keep 3: the stones live in 3D, and the rest is measurement noise.
- **Aha.** Every matrix sends some perpendicular input directions to perpendicular output directions. Keeping the largest layers gives the closest low-rank picture.
- **Named.** After puzzle 1: "singular value decomposition", "singular values". After puzzle 3: "condition number". After puzzle 4: "low-rank approximation".
- **Proof.** Law: "The BEST rank-k picture KEEPS the k LARGEST LAYERS." Show Tamsin: "Why are the arrows Av₁ and Av₂ perpendicular?" Script: `U, s, Vt = np.linalg.svd(A)`.
- **Where you will meet this:** image and model compression; recommender systems; LoRA; how much a solver can amplify errors.
- **Cue:** "When data is large and probably redundant, think SVD."

#### Chapter 26 · The Shape of Her — "Which directions in my data matter?" (N28) — *finale*

- **World problem.** Rebuild the Tower, and the people in it, from Wren's records.
- **New verb.** SPREAD. Turn a line through a cloud of points. Two readouts move together: the spread of the shadows along the line (up) and the sum of squared perpendicular distances (down).
- **Puzzles.**
  1. A 2D cloud of 200 points. Turn the line to get the most spread. The two readouts always add to the same total, by Pythagoras, so most spread and least error are the same line.
  2. An off-centre cloud. The best line through the Origin misses it. Move the Origin to the cloud's mean first.
  3. Covariance C = [[4, 2], [2, 3]]. Its largest eigenvalue is about 5.56 out of a total of 7, so the first axis keeps about 79% of the spread.
  4. *Story:* 2,000 Tower stones, each recorded as 12 shadow lengths on 12 old survey sheets. Three components keep 99% of the spread, because the stones live in 3D; the rest is noise. The first component is the Tower's long axis. Rebuild the Tower from the three.
  5. Two groups (Tower people and Shelf people) that the first axis does not separate. Win by choosing the second axis and saying why: the first axis finds spread, not groups.
  6. *Finale:* Ines's likeness record: 3,000 measurements of 400 numbers each. Choose k. Her figure and her voice rebuild as k grows.
- **Aha.** The direction of largest spread is the top eigenvector of the covariance matrix, which is also the top right singular vector of the centred data.
- **Named.** After puzzle 3: "principal component analysis", "principal components", "covariance matrix", "explained variance".
- **Proof.** Law: "The FIRST PRINCIPAL COMPONENT is the EIGENVECTOR of the COVARIANCE with the LARGEST EIGENVALUE." Show Tamsin: "Why is the direction of largest spread an eigenvector of the covariance matrix?" Script: PCA in four lines of numpy (centre, SVD, keep k, project).
- **Where you will meet this:** visualising embeddings and MNIST in 2D; eigenfaces; denoising data before training; finding dominant directions inside networks.
- **Cue:** "When each item has many measurements and you want the few that matter, think PCA."

#### Epilogue — "The Last Lesson"

Ines steps out of the light. Final exchange: Ines: "What did I lose?" Tamsin: "The smallest directions. Mostly noise." Ines: "Mostly." Then Ines asks you to teach Tamsin the one idea you think matters most. You pick any chapter and build one last demonstration. It is saved as the first page of your Codex. The credits roll over your own Laws and Journal entries (section 8).

### Post-game

- **The Survey Office:** endless generated by-hand exercises covering the curriculum's 12 exam patterns (parameter questions, bases for the four subspaces, Gram–Schmidt on three vectors, 2 × 2 SVD), each with a worked solution one click away.
- **Sigils:** about 40 optional mastery puzzles hidden in the world, each mixing verbs from different acts. Example: "Find the frame that sends the shadow of this tower onto that wall" (projection + composition + inverse). Example: "Abstract arrows" (Cartographer): polynomials of degree 2 as arrows; differentiation as a 3 × 3 frame; find its null space (the constants).

---

## 4. The explain-back system: the Codex

The goal is that by the end the student can explain every concept in their own words. The Codex makes explaining a game mechanic with stakes, adversaries and visible results. It has five parts. None of them ever blocks progress.

### 4.1 Laws and the Proving Ground: "the world tries to break what you say"

After a chapter names its idea, you **engrave a Law**: a short statement assembled from word tiles.

- **Tiles are earned words.** Only terms the game has introduced are available, plus plain words (EVERY, SOME, EXACTLY WHEN, IF … THEN, BECAUSE, PLUS, ZERO, LINE, SHEET). This enforces "no term before it is earned" and builds your vocabulary visibly.
- **Sentences are typed, like code.** The composer checks the sentence is well-formed (an ARROW can be PERPENDICULAR to an ARROW; a MATRIX can be INVERTIBLE; an ARROW cannot be INVERTIBLE). Ill-formed sentences will not snap together, the way a type checker rejects bad code.
- **The Proving Ground tests it live.** Every well-formed Law compiles to a predicate. The world then runs it against hundreds of cases: random ones, plus edge cases curated per chapter (the zero arrow, parallel arrows, singular matrices, rotations, repeated eigenvalues). You watch the cases flicker across the island at speed.
- **A counterexample freezes the world.** If a case breaks your Law, everything stops on that case, drawn in full: "This case breaks your Law: det A = 0, and b is still reachable." You refine the Law (often by adding a condition) and test again.
- **What survives is engraved.** Laws that survive are carved into the walls of the Observatory at the Origin. Over the game the hub becomes a monument to what you know. Laws that match a known theorem are marked **Proven**; others that survive are marked **Survived 500 cases** and stay honest about the difference.

Why it is fun: it is adversarial and visual. You are trying to say something true and general, and the world is trying to catch you out. It also teaches the habit that matters most at university level: a statement is only as good as its conditions.

### 4.2 Show Tamsin: "answer a why by building it"

Tamsin is clever and untrained. She grew up flat. In every chapter she says one thing that is wrong, or asks one "why?" from the curriculum's check questions. You answer with a **construction** in a sandbox, not with words.

- A property checker confirms the construction actually shows the idea. Example: "Why can't a system have exactly two solutions?" Place two solutions; then drag a third point along the line through them. The checker confirms every point you drag to still solves the system.
- You add a one-line caption in your own words (free text, never graded).
- Tamsin replays your construction and says back what she now understands, in her own voice. Her line is a model explanation you can compare with your caption.
- Saved constructions become **evidence** you can present in Inquests.

### 4.3 Procedures: "Tamsin runs exactly what you wrote"

For the algorithmic ideas (row reduction, the inverse by [A | I], Gram–Schmidt, finding eigenvalues, power iteration for the steady state, PCA), you write a short **Procedure** from step tiles: FOR EACH, FIND, SUBTRACT, SHADOW, SCALE, SWAP, CLEAR BELOW, UNTIL.

- Tamsin then carries it out literally on a new problem, step by step, with the world animating each step.
- If a step is vague or missing, she stops exactly where it fails. "You told me to subtract the shadow on the first arrow. You didn't say what to do about the second."
- Beside the tiles, the Procedure appears as Python. **Your explanation compiles.** For a CS student heading into a Master of AI, this is the bridge from understanding to code.

### 4.4 The Field Journal: "in your own words, and again later"

- After each chapter: one page, prompted with "Explain this to someone who missed the lecture." One to three sentences, free text. No grading.
- A short self-check list sits beside it, written literally: "Did you say what happens to the grid? Did you say why, not only what?"
- **Echo.** When you return to the Observatory after two or more chapters, one older page has faded. You may re-explain it from memory, then compare with what you wrote before. This is spaced retrieval practice. It is always optional.
- Optional **Say it aloud**: record 30 seconds through the microphone and play it back next to Tamsin's model explanation. Stored only in the browser.
- The whole Codex exports as Markdown study notes.

### 4.5 Inquests: "use what you know under pressure"

At the end of each act, someone gives testimony: four to six statements about the act's ideas, built from the curriculum's listed misconceptions. The rules borrow from courtroom puzzle games:

- **Press** a statement to hear its hidden assumption.
- **Present** a Law, a saved construction, or a quick new build that breaks a false statement.
- Objecting to a **true** statement fails: the witness shows why it is true, and you lose a star. This trains discrimination, not suspicion.
- Every Inquest can be skipped. The story then continues with a short recap.

Inquests are where the story's arguments are won. Haldane loses the Great Frame argument because you can show him two points landing on one spot and a 1 mm error becoming 1 m.

---

## 5. Difficulty levels

Three levels, set per puzzle at any time. Every puzzle shows its stars for all three. Nothing is locked at any level.

| | **Wayfarer** — see it | **Surveyor** — compute it | **Cartographer** — prove it |
|---|---|---|---|
| **Input** | Drag tips and turn dials. Whole-number snapping. | Commit requires typed numbers (matrix entries, parametric forms, eigenvalues). Dragging still explores. | Typed numbers, and **blind commit**: the world does not respond until you commit. |
| **Preview** | Live ghost of every result | Ghost appears only after you mark a prediction | None |
| **Numbers** | Small whole numbers | Fractions, negatives, decimals | Parameters ("for which k …?"), symbolic answers |
| **Dimension** | 2D versions where possible; 3D by dragging | Standard 3 × 3 | 4 × 4, and abstract arrows (polynomials, matrices) |
| **Tolerance** | ±0.1 | ±0.01 | Exact |
| **Par** | Generous | Move-count par on tablets and frames | Tight par, plus "no fractions" and "no hints" stars |
| **Laws** | 3–4 tiles, random cases | Full tiles, curated edge cases | Must include conditions; adversarial cases built to break near-misses |
| **Inquests** | 3 statements, 1 false | 5 statements, 2 false, 1 true trap | Subtle statements ("AB = BA whenever both are invertible") |
| **Code** | Script stones shown as finished lines to run | Fill in one blank | Write the line |
| **Exam drill** | Off by default | Survey Office in "exam pattern" mode | Mixed, unlabelled problems |

Independent assists can be switched on at any level: snapping, previews, number pad, slower animations, colour-blind shapes, larger handles.

---

## 6. Visual, audio and UI direction

### 6.1 Visual identity without drawn art

**Look in one line:** pale limestone architecture floating over a night-indigo void, laid on a luminous grid that is the fabric of the world, lit by one low warm sun and by the arrows themselves.

- **The grid is the world.** A custom GLSL grid shader draws an infinite, anti-aliased major/minor grid on the ground and water. Frames transform it in the vertex shader, animating from I to A (rotations interpolate by angle so they turn rather than shrink). The grid is the first thing on screen and the last.
- **The visuals are the maths.** All world geometry passes through one "frame uniform" in its vertex shader. The Fold, every frame puzzle, every projection and the final restoration of heights are the same shader doing real matrix multiplication. The flat world of Act I is the real 3D models with their z multiplied by 0.
- **Shadows are projections.** The directional sun uses an orthographic shadow camera, so the shadows you see in Act II and Act VII are true orthogonal projections. Puzzle shadows and rendered shadows agree.
- **Arrows are light.** Capsule beams with an emissive core, a fresnel rim, and a faint flow pattern running tail to tip. Bloom makes them glow. Shape cues for colour-blind players: v has a triangular head and solid shaft; w has a diamond head and a dashed shaft; the result has a double head.
- **Signature shaders:** reach paint (accumulated soft glow on water); the crystal box for volumes, with distinct inside and outside faces; violet null-space glow, which darkens its surroundings slightly instead of lighting them; the Tide aurora across the night sky; a mirror sea that reflects the grid (and doubles as the reflection puzzles); point-cloud holograms for Ines's logs.
- **Post-processing:** bloom, ACES tone mapping, SMAA, gentle vignette and film grain; depth of field only in story scenes; chromatic aberration only during the Fold.
- **Blender (bpy, procedural, exported to glTF with baked ambient occlusion):** a modular stone kit (~30 pieces: blocks, arches, stairs, columns, domes, bridge spans) aligned to the grid; the Observatory; the Tower; brass armillary Frames; stone Tablets; beacons; ferries; sun plates; Ward stones; the Archive's drawers and lenses; five cloaked, masked figures. Draco or meshopt compression.
- **Key art.** Eight act title cards and the menu background rendered as Cycles CPU stills at 1600 × 900 with denoising. Everything else is real-time.
- **Characters without faces.** Each character is a cloaked figure with a distinct geometric mask, in the tradition of Journey: no anatomy to get wrong, strong silhouettes. Masks: Tamsin, copper with one horizontal slit; Haldane, a tall bronze plate engraved like a tablet; Bram, iron-bound wood; Wren, glass with a lens; Ines, silver. Character colours avoid green, red, yellow and violet so the maths colours stay unambiguous.
- **Ines is flat.** Her logs play as a flat silhouette of points, because they were recorded on the night of the Fold. In the finale her figure fills out into 3D as you raise k.

### 6.2 Audio

**Voice cast (Kokoro, pre-generated to mp3, every line voiced, subtitles always on):**

| Character | Kokoro voice | Speed | Traits |
|---|---|---|---|
| **Ines Haldane**, Surveyor-General (logs) | `bf_emma` (UK) | 0.95 | Calm, exact, warm, carrying guilt. Speaks every naming line. |
| **Tamsin**, keeper, 18 | `af_heart` (US) | 1.05 | Quick, blunt, funny, sceptical. Has never seen height. |
| **Aurel Haldane**, Provost | `bm_george` (UK) | 0.92 | Formal, measured, deep. Grief under control until Act IV. |
| **Bram**, bridge-wright, 60s | `am_onyx` (US) | 0.90 | Low, slow, dry. "Show me the numbers. Then show me the bridge." |
| **Wren**, Archivist | `af_nicole` (US) | 0.95 | Soft, near-whispered, precise; loves records. |
| **Pell**, Shelf runner (minor) | `am_puck` (US) | 1.08 | Fast, cheerful, speaks only in Shelf coordinates. |

Pipeline: one script per line id → Kokoro → loudness-normalised to −16 LUFS → mono mp3 at 64–96 kbps. Per-character WebAudio treatment: Ines's logs are band-limited and slightly roomy (they are "flat" recordings); in the finale her voice regains its missing frequencies as k rises. Those versions are made offline by keeping the top k singular values of her voice's spectrogram for k = 1, 2, 4, 8, 16, 32, 64, then resynthesising each one. The player hears her voice return one singular value at a time.

**Adaptive procedural music (WebAudio):**
- **Voices = dimensions.** Act I has a single melodic line over a drone. The first Raise adds a second and third voice. Rank drops are heard: when anything flattens, the stereo field collapses to mono and one voice falls silent. An arrow landing on the Origin goes quiet.
- **The Tide is a major third.** Each Tide night, the drone rises by a ratio of 1.25, which is a pure major third (5:4). Three nights is 1.953, nearly an octave. The Ward's 0.8 is a major third down. When the Ward first holds, the two thirds cancel into a unison.
- **Feedback mapping:** perpendicular arrows ring a clear chime; a plate's reading sets a filter's brightness; the gold tile's area sets the pad's width; a correct commit resolves the current chord.
- **Stems:** drone, pad, plucked arpeggio, bass (from Act II), bells for success, a low pulse for Inquests, a low swell for Tide nights.

**SFX (synthesised in WebAudio):** drag tone pitched by arrow length, whole-number clicks, beacon ignition, frame apply (glassy sweep), tablet row moves (stone slides), the Fold (sub-bass press), the Proving Ground (rapid soft ticks, then a hard stop on a counterexample).

### 6.3 UI and feel

- **Typography leads.** Titles in Cormorant Garamond or Fraunces (engraved feel), interface in Inter or IBM Plex Sans, numbers in IBM Plex Mono. Formulas in KaTeX with symbols coloured to match their objects.
- **Mostly diegetic.** Tablets, frames, plates and the Codex are objects in the world. A minimal HUD shows the goal line, Show me, Skip, and the star/par strip.
- **Dialogue.** A lower third with the speaker's mask turning slowly in a small 3D lens, their name in small capitals, and a ring around the lens driven by the voice's live amplitude.
- **Controls.** Drag tips; scroll on dials; right-drag to orbit; click-to-travel between sites; click any number to type it (fractions accepted, such as 7/6). Keyboard: Tab cycles handles; arrow keys nudge by 1 (Shift for 0.1); Enter commits; Z undoes; H hint; S Show me; K Skip; C Codex; M Atlas.
- **Feel.** Handles enlarge on hover; drags have slight inertia and settle with a click on whole numbers; the camera eases; every success has a short, satisfying light-and-chord moment under one second. Target 60 fps on a mid-range laptop, with a quality tier that drops bloom resolution and shadows.
- **Phone (bonus).** The Atlas, Codex, Journal and 2D chapters work by touch; 3D chapters are playable with larger handles and numeric entry.

---

## 7. Story

### 7.1 The cast

| | Role | Wants | Arc |
|---|---|---|---|
| **You** (unvoiced) | The new surveyor, holding Ines's compass | To understand what happened | From stranger to the one who rebuilds Tessel. Addressed as "Surveyor". |
| **Tamsin** | Keeper of the Origin, 18 | To see height for herself | Sceptic to apprentice. She is the one you teach. Her wrong guesses are honest and common, so correcting them is the explain-back. |
| **Ines Haldane** | Surveyor-General, made the Fold | Her logs: for someone to finish what she started | Villain in rumour, rescuer in fact. Her logs turn out to be a lesson plan. |
| **Aurel Haldane** | Provost of the council, Ines's brother | To bring his sister back by undoing the Fold | Antagonist through Act IV; returns in Act VI to light the Ward; accepts the approximation in the finale. |
| **Bram** | Bridge-wright, remembers towers | To build something that stands up | Breaks the law with you in Act II; keeps the work grounded. |
| **Wren** | Archivist | To keep every record | Quiet and exact. The decades of Tower records Wren protected, all taken before the Fold, make the ending possible. |

### 7.2 Stakes

- **Act I–IV:** personal and political. Can you be trusted with the compass? Will Haldane run the Great Frame backwards?
- **Act IV climax:** physical. Haldane's near-undo frame flings islands into the sky. People are hurt.
- **Act VI:** existential. The Great Tide returns. In thirty nights, anything with height will be stretched apart, including everything you rebuilt.
- **Act VIII:** human. Forty people are on the line that the Fold sent to the Origin, Ines among them.

### 7.3 Twists, in order

1. **"Nothing rises" was Ines's own order** (Act II). The person blamed for flattening the world left instructions to keep it flat.
2. **The Fold is singular** (Act IV). It cannot be undone, by anyone, however precise. Haldane's attempt shows what happens when you try to divide by almost nothing.
3. **The light at the Origin is the Tower** (Act V). It has been on screen since the first frame of the game.
4. **The Fold was a rescue** (Act VI). The Tide's only line that holds is vertical, with stretch 1.25. Ines flattened the world so that nothing had height for the Tide to stretch.
5. **The logs were a curriculum** (Act VII). Wren finds Ines's index. Every log you found was left in the order you would need it. She was teaching her replacement.
6. **You cannot undo; you can rebuild** (Act VIII). The past is not recovered exactly. The closest point you can reach is built from what was measured before the Fold.

### 7.4 Ending

The Tower rises along the axis that the data found. Forty figures fill out from flat silhouettes into 3D as you choose how many components to keep. The game does not choose k for you. A small k gives a recognisable but blurred Ines; a large k reintroduces the noise in Wren's records. The best ending is the one at the cliff in the singular values, which the player has learned to see.

Ines: "What did I lose?"
Tamsin: "The smallest directions. Mostly noise."
Ines: "Mostly."

Haldane, to Ines: "You are not exactly who you were." Ines: "Nobody is, after nineteen years."

Then the last lesson: Ines asks you to teach Tamsin the idea you think matters most. Tone throughout: quiet, a little melancholy, warm humour from Tamsin and Bram. No hype, no villains who are only villains.

### 7.5 How story and maths stay honest

The story never claims anything false about the maths. The Fold cannot be undone, and the game never pretends otherwise. The Tower is rebuilt from extra measurements taken before the Fold, which is exactly what real reconstruction needs. Story characters have feelings; maths objects never do. Story dialogue never explains maths. Every explanation is in the literal maths voice, mostly Ines's logs.

---

## 8. Why this will be remembered: three signature moments

1. **The first height (Chapter 5).** For four chapters the camera has looked straight down at a flat world. You drag an arrow until two plates both read zero, then set its length. A pillar of light rises out of the ground, the camera tilts into perspective for the first time, and the music gains its second and third voices. The cross product is the moment the world gets its third dimension back.

2. **The light at the Origin (Chapter 15).** There has been a small point of light at the Origin since the first second of the game. In Chapter 15 you probe the Great Frame, and the violet region appears: the vertical line through the Origin. Every point on that line, at every height, landed on that one point. The Tower stood there. The people in it are in that light. You have walked past the null space a hundred times.

3. **"Mostly." (Chapter 26).** You choose k. Ines's flat silhouette fills out into 3D, and her voice regains its missing frequencies one singular value at a time. You stop at the cliff. She asks what she lost. Then the credits roll over your own Codex: every Law you engraved and every Journal line you wrote. The last thing the game shows you is what you now know, in your own words.

Honourable mentions players will also talk about: Haldane's near-undo frame turning 1 mm into 1 m; the Tide drone rising by a major third every night; Tamsin running your Gram–Schmidt Procedure and stopping exactly where you left a step out.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Scope:** 26 chapters, ~130 puzzles, 3 difficulties, voice, story | One shared engine with ~15 verbs (section 2.1). Puzzles are data, not code. Difficulty variants are parameter changes on the same puzzle, not new content. Build a **vertical slice** first (Act I, Chapter 5, Inquest I) and freeze the engine API before parallel chapter work. Voice capped at ~60 lines per act. |
| **Tone:** a fantasy frame invites analogies and personification | Two strictly separate registers. The **story register** (characters with feelings) never explains maths. The **maths register** (goal lines, Ines's naming logs, formula cards, Laws) follows house rules: literal first, no analogies, no "simply/just/obviously/clearly/recall that/note that/it turns out", no exclamation marks, never a matrix as a machine. Frames, plates and the Tide are in-world objects that hold or show maths; their text always says literally what happens to points and grids. |
| **Wording drift across many writers** | Automated lint in CI: banned words, exclamation marks, banned analogy terms, sentence length over 20 words flagged. A **term registry** per chapter: the lint fails any player-facing string that uses a term before the chapter that earns it. A wording-review agent reads every chapter against brief section 2a. |
| **Story contradicting the maths** | A "maths truth table" for the story: each story claim (the Fold is a projection; the Tower is on its null space; the Tide's eigenvalue is 1.25) is written as a literal statement and checked by the curriculum owner. |
| **Explain-back becoming trivia** | Win conditions are world states or tested statements, never picking one of four answers. Laws are compositional and checked by testing, so players can state true things the designers did not anticipate. Free text is never graded, only compared with a model. |
| **Proving Ground false confidence** | Random testing cannot prove a Law. The Codex labels "Proven" (matches a known theorem) separately from "Survived 500 cases". Each chapter supplies curated edge-case generators so common near-misses are caught. |
| **3D manipulation is fiddly in a browser** | Constraint planes and axis handles; whole-number snapping; numeric entry for every value; camera presets per puzzle; 2D versions on Wayfarer. |
| **Performance on laptops** | Instanced geometry; one shared grid shader; quality tiers; a hard cap on CSS2D labels per scene (fade distant ones). Lazy-load each act's assets. |
| **Download weight** | Voice mp3s streamed per act (~600 lines ≈ 20 MB total); Draco/meshopt glTF; Pyodide for script stones loaded only when a script stone is opened, with a small TypeScript numpy subset as fallback. |
| **Gating creeping back in** | Atlas opens every chapter from minute one. Show me / Skip on every puzzle and Inquest. Catch-up cards for out-of-order play. Stars and par never unlock anything. A Playwright test asserts every chapter is reachable from a fresh save. |
| **Red–green colour blindness** | Shape cues on every arrow (section 6.1), labels always present, and an optional alternative palette. |
| **Testability** | Every puzzle is declared as data: initial objects, allowed verbs, win predicate, par, and a reference solution as a list of verb actions. A debug API (`window.__singular`) exposes `listPuzzles()`, `load(id)`, `solve(id)` (plays the reference solution and returns the win state), `getState()`, `checkLaw(chapter, tiles)` (returns pass or a counterexample), and `runInquest(id, choices)`. Playwright runs `solve` on every puzzle at every difficulty, asserts Show me and Skip exist, checks every voice line id has an mp3, and captures one screenshot per act. A numeric test asserts every number in the puzzle data (like the ones in this pitch) against numpy-equivalent computations. |

---

*End of pitch.*
