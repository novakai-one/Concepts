# SINGULAR

*Pitch through the narrative-first, cinematic sci-fi lens. Every player-facing line in this document follows the house wording rules (BUILD_BRIEF 2, 2a, 2b). Every number in every puzzle has been checked by script.*

---

## 0. At a glance

| | |
|---|---|
| **Genre** | Narrative puzzle-adventure, fully voice-acted, third-person cinematic + hands-on 3D puzzles |
| **Length** | Prologue + 9 acts, 26 chapters, epilogue. About 14–18 hours on Navigator difficulty |
| **Player** | A silent navigator. Your hands plot every move. Your words write the ship's manual |
| **Core verb** | Plot an arrow or a matrix, call where it will land, commit, watch space respond |
| **Explain-back** | The Briefing: prove it to a sceptical engineer by building it, then write it in your own words. He etches your sentence onto the ship |
| **Tone** | Outer Wilds mystery and quiet; Mass Effect crew loyalty and pacing. No villains with moustaches. Maths settles arguments |
| **Tech** | Vite + TypeScript + Three.js (WebGL2, bloom, GLSL), KaTeX, WebAudio, Blender glTF, Kokoro TTS, Pyodide console |

---

## 1. Title and logline

### Title: **SINGULAR**

Three meanings, and the game uses all three, in this order:

1. **Singular as in alone.** A scientist has been alone for three years inside the region. A small ship is the only one that came.
2. **Singular as in a singular matrix.** A pulse that flattens space so it can never be undone. This is the disaster at the centre of the game.
3. **Singular as in singular values.** The stretch amounts that SVD finds. They are how the crew finds out the disaster is not what it looked like.

The title turns from a threat into the rescue. The final act is named after it.

### Logline

> A survey crew enters a region of space where, every few hours, a pulse moves every point at once: straight lines stay straight, the centre stays put, and a colony ark full of sleepers is being sheared and flattened. To bring them home, you must learn to read the pulse itself, and the last thing it teaches you is the difference between *gone* and *very, very thin*.

---

## 2. The core gameplay loop

### 2.1 What your hands do, minute to minute

Every chapter is a run of 3–5 hands-on puzzles set in the world (in open space, in the ark's corridors, or on the ship's holotable). Each puzzle runs the same five-beat loop:

| Beat | Time | Hands | Eyes |
|---|---|---|---|
| **1. Survey** | 5–20 s | Right-drag to orbit, scroll to zoom, press 1/2/3 for front/top/side views | The problem sits in the world: a target buoy, a debris line, a flattened hull, a cloud of points. The Case Board question is at top-left |
| **2. Plot** | 30–120 s | Left-drag arrow tips (magnet-snap to the grid), Shift-drag for height, type components with Tab, drag matrix columns as arrows, drag rows in the ledger | Green input arrows, red second arrows or matrix columns, the live formula panel beside the picture, every symbol coloured to match its arrow |
| **3. Call it** *(optional)* | 5 s | Press C and drop a ghost marker where you predict the result will land, or type the number you expect | A faint ghost in the world. Never required |
| **4. Commit** | 2–6 s | Space | Cinematic playback. The ship burns, or the grid of light buoys moves, or the ark's hull deforms. The camera cuts to the best angle. Music swells or resolves |
| **5. Read** | 10–30 s | Click any part of the overlay to pin it | LANTERN, the ship's computer, reports what the points, arrows and grid did in one or two literal sentences. A crew member reacts. Overlays draw the parallelogram, the shadow, the right angle |

**No timers, ever.** Pulses happen when you commit, or at story beats. Tension comes from what you can see happening to the ark and to people you care about, never from a countdown.

**Stars, never locks.** Each puzzle offers three optional stars: *Solved*, *Par* (fewest commits or least fuel), *Called it* (your ghost was within tolerance). Stars change Bram's banter and unlock cosmetic hull plates. Nothing is ever blocked.

**Show me / Skip** sit on every puzzle, top-right, at all times. Show me plays the canonical solution as a slow, narrated replay. Skip moves on; the story adapts a line ("I'll take LANTERN's numbers on that one.").

### 2.2 The instruments (tools you hold)

All instruments are available in every chapter from the Case Board. The story introduces them in order.

| Instrument | What it does on screen | Introduced |
|---|---|---|
| **Arrow** | Drag a tip in 2D or 3D. Chains tip-to-tail. Shows components live | Ch 1 |
| **Dials** | Integer-detented amounts for each arrow (on Cadet), half-steps (Navigator), free (Commander) | Ch 2 |
| **Lattice** | The grid of light buoys. Every pulse moves it. You read pulses from it | Prologue |
| **Dish** | A sensor arrow whose reading is drawn as a literal shadow on the signal arrow | Ch 4 |
| **Ledger** | An augmented matrix whose rows are planes in the 3D view. Drag a row onto another to add a multiple. Every row operation is animated on the planes | Ch 8 |
| **Spire bench** | The Anchor's three spires as three red column arrows. Drag them and the whole grid moves | Ch 11 |
| **Composition rail** | Drop matrices onto a rail, right to left. The grid plays them in order | Ch 12 |
| **Sweep** | Sweep a test arrow round the unit circle or sphere. Its image is drawn live. Lines that do not turn light up | Ch 18 |
| **Console** | A real Python console (Pyodide + NumPy), for the "in code" step. Exports to a Colab notebook | Ch 1, optional everywhere |

### 2.3 Why this is a game and not a quiz

- **The answer is a move, not a letter.** You never pick A, B, C or D. You fly a ship, set a spire, route power, brace a hull.
- **Reasoning beats fiddling.** Puzzles cost a commit, fuel or a pulse. Dragging blindly works, but slowly and with no star. The concept gets you there in one move. That one-move solution is the satisfying play.
- **Space answers you.** A correct plot makes the grid move in a way that is beautiful to watch. A wrong plot shows you *exactly* where it went, so the miss itself teaches.
- **Mystery pulls you forward.** Each chapter answers one Case Board question and opens the next. The maths is the only key to the story.
- **Tools stack.** Act IX's rescue needs the null space from Act V, the change of basis from Act VI, the least-squares fit from Act VIII and the SVD from Act IX, all at once. Late-game puzzles use every instrument you have learned to hold.
- **People react.** Wren cheers a one-burn solution in her own dry way. Bram grunts at a lucky one. Teo asks you things you learned ten hours ago, and you find you can answer.

### 2.4 The shape of every chapter (house order, built into play)

1. **Cold open (≤ 60 s, skippable).** A plot problem, shown, not explained.
2. **Problem first.** The Case Board pins a plain question as the chapter title, e.g. *"What can two thrusters reach?"*
3. **See it.** The first 2–3 puzzles. Predictions invited (Call it).
4. **Name it.** The aha lands, then a full-screen title card names the concept, with a one-sentence plain definition tied to the frozen scene. The chapter's question was the heading; the term arrives last.
5. **Formula.** The formula slides in beside the picture, colour-coded.
6. **By hand.** One puzzle where LANTERN's arithmetic is switched off and you do it in the ledger or on the bench.
7. **In code (optional).** A console task: automate what you did for 100 cases.
8. **The Briefing.** Prove it to Bram, then write it in your Field Manual (Section 4).
9. **Why it matters.** One LANTERN archive note linking the idea to a real AI use.
10. **Recognition cue.** "When you see ___, think ___."
11. **Story beat out (≤ 60 s).**

The **In short** box (2–3 lines: the question and the one-sentence answer) is one tap away on every Case Board card from the start, and is printed on every finished Field Manual page. It is never hidden, but it is folded by default so the aha is not spoiled.

### 2.5 The hub: the Lantern's bridge

- **The Case Board** is the chapter select and the curriculum map. It is a 3D web of plain questions ("Why did the buoys move but the Anchor did not?", "What went to zero?"). Lines show which question needs which. Every node opens at all times. A node you have finished shows your own Field Manual sentence.
- **The Fold Map** is a 3D chart of the region: the Anchor, the ark, debris streams, buoy lattices, Ilse's log beacons. Travel between places is plotted as arrows (light vector practice). On Cadet, click a place to autopilot.
- **The holotable** is where the Briefing happens and where the Sandbox lives after the game.
- **The plates.** Each time you convince Bram, he etches your sentence onto a metal plate on the bridge wall. By the end the bridge is covered in your own words.

---

## 3. The full arc

### 3.1 Story spine

| Act | Name | Plot problem | Maths | Twist / turn |
|---|---|---|---|---|
| — | Prologue | A pulse hits. Everything moves except the Anchor | Linearity, seen not named | "Nine numbers" in a distress call |
| I | Drift | Two thrusters left. Reach the ark's signal | Vectors, combinations, span, independence | The signal is off the reachable plane |
| II | Signal | Find, orient and dock with a sheared ark | Dot, cross, triple product, lines and planes | The ark's hull is losing volume |
| III | The Ledger | Restore power inside the dark ark | Systems, augmented matrix, REF, RREF | Teo's pod is empty |
| IV | The Pulse | Read the pulse, undo it, measure the loss | Transformations, composition, inverse, determinant | Position prediction off, volume exact. Then the Collapse |
| V | Collapse | The stern is flat. Is anything left? | Subspaces, column space, rank, null space, rank–nullity | Vell arrives: "Anything flattened is gone." |
| VI | The Wrong Grid | Why did Ilse's fix go wrong? | Basis, coordinates, change of basis | The numbers were right; the grid was wrong. Ilse is alive |
| VII | Stable Corridors | Vell's repeating pulse plan | Eigenvectors, diagonalisation, Markov chains | The fiftieth-pulse prediction makes Vell stand down |
| VIII | Shadows | Measure the collapse exactly from noisy data | Projection, Gram–Schmidt, orthogonal matrices, least squares | The leftover readings tap out a pattern. Teo is alive |
| IX | Singular | Unfold the stern without tearing it | Symmetric matrices, SVD, condition, PCA | "Zero, to two decimal places." |
| — | Epilogue | Quiet the Fold | The identity matrix | "Every point stays where it is." |

---

### PROLOGUE · "Where did everything go?"

**World.** The survey tug *Lantern* crosses into the region the crew calls the Fold, answering a three-year-old distress call from the colony ark *Meridian*. The distress call is a woman's voice and nine numbers, repeating. Ahead hangs the Anchor, an ancient black structure with three long spires. The ship's lattice projector seeds space with a grid of light buoys so the crew can see what space is doing.

**The first pulse.** A low tone. Every buoy slides at once. The Lantern is knocked sideways and loses two of its four thrusters.

**Playable beat (2 min).**
1. *Three in a row.* Before the pulse, LANTERN highlighted three buoys in a straight line. Click them after the pulse. **Win:** confirm they are still in a straight line (LANTERN draws the line through them).
2. *Evenly spaced?* Four buoys were evenly spaced along a line. **Win:** confirm they are still evenly spaced.
3. *What did not move?* **Win:** click the one object that is exactly where it was. (The Anchor.)

LANTERN: *"Pulse complete. Every buoy moved. Lines of buoys are still straight. Even spacing is still even. The Anchor did not move."*

Nothing is named. These three observations are pinned to the Case Board as the question *"Why did everything move except the Anchor?"* It is answered in Chapter 11.

---

### ACT I · DRIFT
*Vectors, combinations, span, independence. Mostly 2D, opening into 3D.*

#### Ch 1 · "Where is the beacon from here?" → **VECTOR**

**World.** The pulse threw the Lantern off course. The nearest beacon buoy is somewhere ahead. LANTERN can measure how far it is in each direction.

**Mechanic.** Drag a green arrow from the ship. A burn is an arrow. Burns chain tip to tail. The ship flies the chain on commit.

**Puzzles**
1. *Straight there.* The beacon is 3 across and 2 up from you. **Win:** one arrow whose tip is on (3, 2).
2. *Around the debris.* A debris cluster sits on the direct route. The damaged autopilot has already fired burn 1: (4, −1). Plot burn 2. **Win:** land on (3, 2). Answer (−1, 3). Then replay with the burns swapped: you land on the same point, and the two routes outline a parallelogram.
3. *One thruster, any amount.* The working thruster only pushes along (2, 1). Reach buoys at (6, 3) and then (−4, −2). **Win:** both, in one burn each. Answers 3 × (2, 1) and −2 × (2, 1).
4. *Three knocks.* Three pulses knock you by (2, 5), (−3, 1), (4, −2). **Win:** plot the single arrow home, and say how far home is. Answer (−3, −4), length 5.

**Aha.** "An arrow is a set of instructions: this far across, this far up. Adding arrows adds the instructions, in any order. Stretching an arrow keeps its line; a negative amount flips it."

**Named.** After puzzle 2: **VECTOR** — "An arrow that says how far to move in each direction." Then *adding vectors* (add matching parts), *scalar multiple* (stretch or flip), *length* = √(3² + 4²) = 5, from the right triangle drawn on the arrow.

**Prove it (Briefing).** Bram: *"East then north lands somewhere different from north then east."* Build both orders on the holotable. Bram shakes the arrows to five random values; the two routes still meet.

**Console.** Given 100 burn logs, compute where the ship ends and how far it is from home.

**Why it matters.** Every data point an AI model reads is a vector: a list of numbers that places it in space. **Cue:** when you see "how far in each direction", think *vector*.

#### Ch 2 · "What can two thrusters reach?" → **SPAN**

**World.** Only two thrusters work: one pushes along v = (2, 1) (green), one along w = (1, 3) (red). Each can fire any amount, forward or back. Somewhere is the ark's signal.

**Mechanic.** Two dials set amounts a and b. The yellow result a·v + b·w is drawn tip to tail. Every point you reach leaves a faint glow, so over the chapter the reachable region paints itself in.

**Puzzles**
1. *Reach (5, 5).* **Win:** exact. Answer 2v + 1w.
2. *Reach (0, 5).* **Win:** exact. Answer −1v + 2w. The first negative amount.
3. *Find a point you cannot reach.* With v and w the glow fills the whole plane, and LANTERN reports that every point you place is reachable. Then the red thruster fails over to its backup, which pushes along (−4, −2). **Win:** place a target the two thrusters cannot reach (anything off the line through (2, 1), e.g. (0, 1)). The game shows the closest you can get and the gap.
4. *Into 3D.* The Lantern's real thrusters push along (1, 0, 1) and (0, 1, 1). **Win (a):** reach the beacon at (2, 3, 5). Answer 2 and 3. **Win (b):** try the ark's signal at (1, 1, 0). Every combination is (a, b, a + b), so the height is always the sum of the other two. You cannot reach it.

**Aha.** "Two arrows that point different ways reach a whole plane. Two arrows on the same line reach only that line."

**Named.** After puzzle 2: **LINEAR COMBINATION** — "Stretch each arrow by some amount and add them." After puzzle 3: **SPAN** — "Every point you can reach by stretching v and w and adding them together."

**Prove it.** Bram: *"Make both thrusters twice as strong and we'll reach new places."* Show the span is unchanged; Bram's shake confirms for random arrows. Follow-up: *"What if I point one backwards?"* Same span.

**Console.** Write `reachable(v, w, target)` for 2D and test it on 100 targets.

**Why it matters.** A linear model can only produce outputs inside the span of what it combines. **Cue:** when you see "can we reach / can we make this from these", think *span*.

**Act beat.** The ark's signal sits off the reachable plane. Wren: *"So we can see him and we can't get to him."*

#### Ch 3 · "Is one of these thrusters wasted?" → **LINEAR INDEPENDENCE**

**World.** Bram bolts on a third thruster from spares to escape the plane. He mounts it along u = (1, 2, 3).

**Mechanic.** The 3D reach view shows the span of the mounted thrusters as a glowing plane or a filled volume. Re-mounting a thruster is a drag between bolt points.

**Puzzles**
1. *Why can't we reach it?* With (1, 0, 1), (0, 1, 1), (1, 2, 3) you still cannot reach (1, 1, 0). **Win:** find amounts of the first two that build the third. Answer 1 and 2: (1, 0, 1) + 2·(0, 1, 1) = (1, 2, 3). The new thruster pushes along a direction you already had.
2. *Pick a mount.* Bram offers three mounts: (2, −1, 1), (1, 1, 1), (0, 0, 2). **Win:** pick the mount that reaches (1, 1, 0) with the least total fuel. (2, −1, 1) lies in the old plane and reaches nothing new. (1, 1, 1) reaches it with amounts −1, −1, 2 (fuel 4). (0, 0, 2) reaches it with 1, 1, −1 (fuel 3). Par: (0, 0, 2).
3. *One arrow too many.* Four arrows: (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1). **Win:** remove one without shrinking what you can reach. Any of the first three works; (0, 0, 1) cannot go.
4. *Three in a plane (Navigator+).* Try to place three arrows in 2D so that none can be built from the other two. **Win:** explain why every attempt fails (the third is always a combination of the first two once they point different ways).

**Aha.** "An arrow is wasted when you can already build it from the others. It adds no new direction."

**Named.** After puzzle 1: **LINEARLY DEPENDENT** and **LINEARLY INDEPENDENT** — "A set of arrows is independent when none of them can be built from the rest."

**Prove it.** Bram: *"None of these three point the same way, so all three must be useful."* Build a counterexample: three different directions in one plane.

**Console.** Test a set of arrows for dependence by checking whether adding each one grows the span.

**Why it matters.** Redundant features in a dataset are dependent columns. They add cost and no information. **Cue:** when you see "is anything here redundant", think *independence*.

**Act beat.** The new mount fires. The Lantern lifts out of the plane. The *Meridian* comes into view: 1.2 km long, three sections, and visibly sheared: every box frame along its hull leans the same way.

---

### ACT II · SIGNAL
*Measuring with vectors: dot, cross, triple product, lines and planes.*

#### Ch 4 · "How much do two arrows point the same way?" → **DOT PRODUCT**

**World.** The ark's beacon is faint. The Lantern's dish gives a reading that grows as the dish lines up with the signal.

**Mechanic.** Rotate the green dish arrow. LANTERN draws the dish's shadow on the red signal arrow, cast by light falling at right angles to the signal. The reading is the shadow's length times the signal's length.

**Puzzles**
1. *Read the pattern.* LANTERN shows readings for dish arrows (1, 0) → 2 and (0, 1) → 4 against the signal (2, 4). **Call it:** what is the reading for (3, 1)? **Win:** 10. Three of the first plus one of the second gives 3·2 + 1·4.
2. *The silent direction.* Signal (2, 4). **Win:** find a whole-number dish arrow with reading exactly 0. Answer (2, −1) or any multiple. The shadow vanishes; the arrows are at a right angle.
3. *Turn to the ark.* Your heading is (1, 1, 0); the ark's spine runs along (1, 0, 1). **Win:** tell Wren the angle to turn through, within 1°. Answer 60°, from 1 = √2 · √2 · cos θ.
4. *Ahead or behind?* Heading h = (2, 1, 0). Beacons at (1, −3, 0), (0, 1, 5), (−1, 2, 4). **Win:** classify each as ahead, behind or exactly beside. Readings −1, 1, 0.
5. *Hidden bearing (Commander).* Three dish readings along the three axis arrows are 3, −1, 2. **Win:** plot the signal arrow. Answer (3, −1, 2): the readings along the axis arrows *are* the components.

**Aha.** "Big and positive: the arrows point the same way. Zero: they are at a right angle. Negative: they point apart."

**Named.** After puzzle 2: **DOT PRODUCT** — "Multiply matching parts and add. It measures how much two arrows point the same way." Both formulas sit beside the shadow picture: v·w = v₁w₁ + v₂w₂ + v₃w₃ = |v||w|cos θ.

**Prove it.** Bram: *"A reading of zero means the signal's gone."* Counterexample: a strong signal at a right angle to the dish. Second objection: *"Your two formulas can't both be right."* Rotate the axes on the holotable: the parts change, the reading does not.

**Console.** Given 200 dish orientations, find the one that best faces the beacon.

**Why it matters.** Attention in language models scores how well two word vectors line up with a dot product. **Cue:** when you see "how aligned", "angle", "perpendicular", think *dot product*.

#### Ch 5 · "Which way do we turn?" → **CROSS PRODUCT**

**World.** The ark tumbles slowly. To match it, Bram needs an axis to spin the Lantern around: at a right angle to both the heading and the target direction.

**Mechanic.** Two arrows shade a parallelogram. A third arrow rises at a right angle to it. A curved arc shows the turn from the first arrow to the second.

**Puzzles**
1. *Find the axis.* Heading v = (2, 0, 0), target w = (1, 3, 0). **Call it:** how long is the axis arrow? **Win:** set the axis arrow to (0, 0, 6). Its length equals the parallelogram's area, base 2 × height 3.
2. *Which order?* Spin about w × v = (0, 0, −6). The ship turns the wrong way. **Win:** choose the order that turns the heading onto the target. Seen from the tip of v × w, the turn from v to w is anticlockwise.
3. *Face the star.* A solar panel has edges a = (1, 2, 0) and b = (0, 1, 3). **Win:** set its normal arrow, then turn the panel so the normal points at the star. Answer a × b = (6, −3, 1), panel area √46 ≈ 6.78.
4. *No axis.* Two struts (2, 4, 6) and (1, 2, 3). **Win:** say what their cross product is and why. Answer (0, 0, 0): they lie on one line, so there is no parallelogram.

**Aha.** "The cross product is an arrow at a right angle to both, as long as the parallelogram's area. Swap the order and it flips."

**Named.** After puzzle 2: **CROSS PRODUCT** and the **right-hand rule**. Formula beside the picture, each component shown as the 2×2 pattern from the other two axes.

**Prove it.** Bram: *"v × w and w × v are the same arrow."* Show equal length, opposite direction.

**Console.** Compute surface normals for a 1,000-triangle hull mesh.

**Why it matters.** 3D rendering and robot motion use cross products for surface normals and turning axes. **Cue:** when you see "at a right angle to both" or "area in 3D", think *cross product*.

#### Ch 6 · "Is the hull still holding volume?" → **SCALAR TRIPLE PRODUCT · COPLANAR**

**World.** The ark's hull is a frame of boxes. Each box is held open by three struts from one node. The pulses are squeezing them.

**Mechanic.** Three arrows build a slanted box. The base area (cross product) and the height (shadow on the normal) are drawn. Volume = area × height.

**Puzzles**
1. *Design box.* Struts (2, 0, 0), (0, 3, 0), (0, 0, 4). **Call it:** volume? **Win:** 24.
2. *Lean it.* Change the third strut to (1, 1, 4) and the second to (1, 3, 0). **Call it:** volume? **Win:** 24 again. Then: move the third strut's tip anywhere you like without changing the volume. **Win:** any tip with height 4 (the tip slides in the plane z = 4).
3. *Section C.* The ark's struts read a = (2, 1, 0), b = (0, 1, 2), c = (1, 1, 1). **Win:** compute the volume. Answer (a × b)·c = (2, −4, 2)·(1, 1, 1) = 0. The box is flat. Then brace it: **Win:** choose the third component k of c = (1, 1, k) that restores a volume of 6. Answer k = 4.
4. *Inside out.* One reading is −24. **Win:** find which two struts were logged in swapped order.

**Aha.** "Volume zero means the three arrows lie in one plane, so the box is flat. That is the same as one arrow being built from the other two."

**Named.** After puzzle 3: **SCALAR TRIPLE PRODUCT** (a × b)·c — "The volume of the box three arrows make, with a sign for which way round they are." **COPLANAR** — "Three arrows that lie in one plane."

**Prove it.** Bram: *"Lean the third strut over and you lose volume."* Slide the tip parallel to the base; Bram shakes the base struts; the volume holds.

**Console.** Scan 5,000 hull nodes and flag every box under 10% of its design volume.

**Why it matters.** Geometry code uses the sign of this volume to test which side of a plane a point is on (collision checks, meshes). **Cue:** when you see "are these flat / in one plane", think *triple product equals zero*.

**Foreshadow.** Section C is flat. Something is flattening the ark.

#### Ch 7 · "Where does our path meet the door?" → **LINES AND PLANES**

**World.** Debris streams travel in straight lines. The ark's hangar door is a flat triangle. Dock.

**Mechanic.** A line is a point plus t times a direction: a yellow bead slides along it as you drag t. A plane is a point plus a normal arrow: every point whose arrow from the fixed point is at a right angle to the normal.

**Puzzles**
1. *Same place, same time?* Your path: t·(1, 1, 0). Debris: (4, 0, 0) + s·(−1, 1, 0), with t and s both in minutes. **Win (a):** find where the paths cross: (2, 2, 0), at t = s = 2, a collision. **Win (b):** change your speed so you miss. Any speed except the one that puts you there at minute 2 (e.g. double speed: you pass at minute 1).
2. *Never crossing.* Path t·(1, 0, 0). Debris (0, 1, 2) + s·(0, 1, 0). **Win:** the closest distance. Answer 2, measured along (1, 0, 0) × (0, 1, 0) = (0, 0, 1).
3. *Write the door.* Corners P = (1, 0, 0), Q = (0, 2, 0), R = (0, 0, 3). **Win:** the door's equation. Normal (Q − P) × (R − P) = (6, 3, 2), so 6x + 3y + 2z = 6.
4. *Hit the centre.* From the Lantern at the origin. **Win:** an approach line that meets the door at its centre. Direction (1, 2, 3); it meets the door at (1/3, 2/3, 1) when t = 1/3.
5. *How far out?* **Win:** distance from the holding point (3, 3, 3) to the door's plane. Answer 27/7 ≈ 3.86, since |n| = 7.

**Aha.** "A plane is every point whose arrow from one fixed point is at a right angle to the normal. That is a dot product equal to zero."

**Named.** After puzzle 1: **vector equation of a line** r = p + t·d. After puzzle 3: **normal vector** and **equation of a plane** n·(x − p) = 0.

**Prove it.** Bram: *"Two lines in space that aren't parallel have to cross."* Counterexample: puzzle 2's lines.

**Console.** Check 300 debris tracks against the approach line; report minimum distances.

**Why it matters.** A linear classifier splits data with a plane w·x + b = 0. Which side a point lands on is the prediction. **Cue:** when you see "flat surface" or "boundary", think *normal vector and a dot product*.

**Act beat.** Docked. The ark is dark. A log beacon plays the first of Dr. Ilse Varga's recordings: *"Power is down in all three sections. If you are hearing this, you can do what I could not. Start with the ledger."*

---

### ACT III · THE LEDGER
*Systems, augmented matrix, row echelon form, reduced row echelon form.*

#### Ch 8 · "Where do the three planes meet?" → **AUGMENTED MATRIX · ROW OPERATIONS**

**World.** Teo's sleeper pod sends a weak ping. Three ranging sensors each say "the pod lies somewhere on this plane". The pod is where all three agree.

**Mechanic.** The **Ledger**. Each equation is a row and a plane in the 3D view. Drag a row onto another to add a multiple of it; double-click to scale; drag up and down to swap. On every operation, the moving plane pivots around the planes' shared point. The shared point never moves.

**Puzzles**
1. *Two lines first (2D).* x + y = 5 and x − y = 1. **Win:** mark where they cross: (3, 2). Then add the rows: 2x = 6. The new line x = 3 passes through the same point.
2. *Find the pod.* x + y + z = 6; 2y + 5z = −4; 2x + 5y − z = 27. **Win:** the pod at (5, 3, −2).
3. *Keep the point still.* **Win:** remove x from rows 2 and 3 using row operations only. Par: 1 operation (row 2 has no x already). The marker never moves.
4. *Break it on purpose.* Try a forbidden move (add 1 to the left side only; multiply a row by 0). **Win:** observe that the meeting point moves or a plane vanishes, and name which.

**Aha.** "Each row operation turns a plane around the point they share. The planes change. The meeting point stays."

**Named.** After puzzle 2: **SYSTEM OF LINEAR EQUATIONS**, **AUGMENTED MATRIX** (the numbers only, with the right-hand side after a bar), **ROW OPERATIONS** (swap, scale by a non-zero number, add a multiple of one row to another).

**Prove it.** Bram: *"Add one equation to another and you've changed the answer."* Demonstrate on a system he shakes to random values: the point holds.

**Console.** Build the augmented matrix from three sensor readings and check a candidate point.

**Why it matters.** Fitting the weights of a linear model is solving a system. **Cue:** when you see "several conditions that must all hold", think *system, augmented matrix*.

#### Ch 9 · "Can the ledger become a staircase?" → **ROW ECHELON FORM · PIVOT**

**World.** The ark's power ledger: three generators, three meters. Find each generator's output.

**Mechanic.** The Ledger again, with a staircase outline drawn under the matrix. Cells below the staircase glow until they are zero.

**Puzzles**
1. *Make the staircase.* [1 2 1 | 8], [2 5 4 | 24], [1 3 4 | 19]. **Win:** row echelon form in par 3 operations (R2 − 2R1, R3 − R1, R3 − R2), giving [1 2 1 | 8], [0 1 2 | 8], [0 0 1 | 3].
2. *Climb back up.* **Win:** back substitution. z = 3, y = 2, x = 1. Each step lights a generator.
3. *Zero on top.* [0 2 1 | 5], [1 1 1 | 4], [2 1 0 | 4]. **Win:** staircase form. You must swap first. Answer (1, 2, 1).
4. *By hand.* LANTERN's arithmetic switches off. **Win:** puzzle 1 again with typed row results.

**Aha.** "Once the ledger is a staircase, the bottom row has one unknown. Solve it and climb back up."

**Named.** After puzzle 2: **ROW ECHELON FORM**, **PIVOT** (the first non-zero entry in each row), **BACK SUBSTITUTION**, *Gaussian elimination*.

**Prove it.** Bram: *"Swapping two rows changes the answer."* Show it does not. Then: *"So which move would?"* Build one.

**Console.** Write `eliminate(A, b)` in NumPy. Time it on 100×100 and 400×400 systems; the cost grows about 64 times for 4 times the size.

**Why it matters.** Elimination is the workhorse under most solvers, and its n³ cost is a classic complexity lesson. **Cue:** when you see a system you must solve by hand, think *staircase, then climb*.

#### Ch 10 · "What if there is no single answer?" → **REDUCED ROW ECHELON FORM · FREE VARIABLE**

**World.** The conduits from the generators branch into more pipes than junctions. Power can be routed many ways. One meter may be lying.

**Puzzles**
1. *Finish the job.* Take Ch 9's staircase to the form where each pivot is 1 with zeros above and below. **Win:** [I | (1, 2, 3)]. The answer reads straight off.
2. *A line of answers.* Flows: x₁ − x₂ = 2, x₂ − x₃ = 1, x₁ − x₃ = 3. **Win:** reduce it; the bottom row becomes all zeros, and x₃ has no pivot. Solutions (3 + t, 1 + t, t). In 3D the three planes meet in a line. Then route it: **Win:** pick t so every pipe carries between 0 and 5. Any t from 0 to 2. Par: t = 0 (least total load, 4).
3. *The lying meter.* Change the third meter to 4. **Win:** reduce it and read the bottom row [0 0 0 | 1], which says 0 = 1. The three planes form a prism with no shared point. Then fix it: change one meter so a solution exists.
4. *Read four ledgers.* Four reduced ledgers, unlabelled. **Win:** say for each whether the planes meet in a point, a line, a plane, or nowhere, then see the planes.

**Aha.** "A row of zeros with a non-zero number on the right says 0 = 1: the planes never meet. A column without a pivot is a free direction: the planes meet along a line."

**Named.** After puzzle 2: **REDUCED ROW ECHELON FORM**, **FREE VARIABLE**, *consistent* and *inconsistent*.

**Prove it.** Bram: *"Three equations, three unknowns: always exactly one answer."* Counterexamples from puzzles 2 and 3.

**Console.** Write `rref(A)` and use it to classify 50 random ledgers.

**Why it matters.** Free variables are why a model with more weights than data points has many perfect fits, and why we then need a rule to pick one. **Cue:** when you see "how many solutions", think *reduce, then count pivots*.

**Act beat.** Power returns. Teo's pod opens. It is empty. A text log on the pod: *"Woken by Dr. Varga. Gone to the stern to brace the struts. — T."* Wren goes quiet. Ilse's next log: *"I set the Anchor's spires myself. I thought I could move us out of the debris stream."*

---

### ACT IV · THE PULSE
*Matrix transformations, composition, inverse, determinant.*

#### Ch 11 · "What did the pulse do to the grid?" → **MATRIX TRANSFORMATION**

**World.** The crew watches a pulse through the buoy lattice. To protect the ark they need to predict where any point will land.

**Mechanic.** The **Spire bench**. The Anchor's spires are drawn as red column arrows. Drag them and the whole grid moves live. A green input point and its yellow landing point.

**Puzzles**
1. *Read the pulse.* The buoy one step along the first grid arrow moved to (2, 1). The buoy one step along the second moved to (−1, 1). **Call it:** where does the buoy at (3, 2) land? **Win:** (4, 5). Three of the first landing plus two of the second.
2. *Build a pulse.* **Win:** set the two columns so that (1, 1) lands on (3, 3) and (1, −1) stays where it is. Answer columns (2, 1) and (1, 2). (This matrix returns in Ch 18.)
3. *Which of these is a pulse?* Four grid animations: a slide of everything sideways, a curved warp, a shear, a rotation. **Win:** pick the two that keep lines straight, keep even spacing and keep the centre fixed.
4. *3D.* Spires at (1, 0, 0), (1, 1, 0), (0, 1, 1). **Win:** where the ark's beacon at (1, 1, 1) lands: (2, 2, 1), the sum of the three columns.

**Aha.** "Know where the grid arrows land and you know where every point lands. The columns *are* those landing spots."

**Named.** After puzzle 1: **LINEAR TRANSFORMATION** — "A move of space that keeps lines straight and evenly spaced and keeps the origin fixed." **MATRIX** — the columns written side by side. **Matrix–vector multiplication** as Av = x·(column 1) + y·(column 2). The prologue's Case Board question closes.

**Planted clue.** LANTERN uses this matrix to predict where the ark's bow will be after the next pulse. The prediction misses by a skewed offset. The volume prediction (Ch 13) is exact. Case Board: *"Why was our position prediction off when the volume prediction was exact?"* Unanswered until Ch 17.

**Prove it.** Bram: *"Knowing where two buoys go isn't enough to know where all of them go."* Predict any buoy he picks after shaking the columns.

**Console.** Apply a matrix to 10,000 buoy positions in one line (A @ X).

**Why it matters.** One layer of a neural network multiplies by a matrix: it moves every data point in space at once. **Cue:** when you see "where does everything go", think *columns are where the grid arrows land*.

#### Ch 12 · "What do two pulses do, and can we undo one?" → **MATRIX MULTIPLICATION · INVERSE**

**World.** The Anchor alternates two pulses: a shear A, then a quarter-turn B. Then the crew tries to undo the damage to the bow.

**Mechanic.** The **Composition rail**. Drop matrices on the rail, right to left. The grid plays them in order, then shows the single matrix that does the same.

**Puzzles**
1. *The pair as one.* A = [[1, 1], [0, 1]], B = [[0, −1], [1, 0]]. **Win:** build one matrix that equals "A, then B". Track the grid arrows: (1, 0) → (1, 0) → (0, 1); (0, 1) → (1, 1) → (−1, 1). Answer BA = [[0, −1], [1, 1]].
2. *Order.* **Win:** find a point that lands in different places under "A then B" and "B then A". (1, 0) lands on (0, 1) one way and (1, 1) the other.
3. *Undo.* **Win:** build the single pulse that returns the bow to its shape after "A then B". Undo the last pulse first: A⁻¹B⁻¹ = [[1, 1], [−1, 0]]. LANTERN checks the product is the grid unchanged.
4. *The 2×2 undo by hand.* A = [[2, 1], [1, 1]]. **Win:** its inverse [[1, −1], [−1, 2]]. The game shows where the swap-and-negate pattern comes from, and why it is divided by a number that here equals 1. (That number is the subject of Ch 13.)

**Aha.** "Multiplying matrices is doing one pulse after another. Read right to left: the matrix next to the point acts first. To undo, undo the last one first."

**Named.** After puzzle 1: **MATRIX MULTIPLICATION** as composition. After puzzle 3: **IDENTITY MATRIX** (the pulse that moves nothing) and **INVERSE MATRIX** (the pulse that sends every point back).

**Prove it.** Bram: *"Shear then turn is the same as turn then shear."* Counterexample from puzzle 2.

**Console.** Check that (AB)⁻¹ equals B⁻¹A⁻¹ for 100 random pairs, and find a pair where A⁻¹B⁻¹ fails.

**Why it matters.** Stacking network layers multiplies their matrices. Without something non-linear between them, ten layers collapse into one matrix. **Cue:** when you see "do this, then that", think *multiply, right to left*.

#### Ch 13 · "Why is the ark getting smaller?" → **DETERMINANT**

**World.** The ark's hull volume drops each pulse. The Anchor's third spire was struck by debris and is bending a little further each time.

**Mechanic.** The unit square (or cube) is filled with light. After each pulse its new area or volume is shown as a number on the shape.

**Puzzles**
1. *Area after one pulse.* [[3, 1], [0, 2]]. **Call it.** **Win:** area 6. Then [[2, 1], [1, 1]]: the shape changes, the area stays 1.
2. *Where ad − bc comes from.* The parallelogram with columns (3, 1) and (1, 2) sits in a 4-by-3 box. The game cuts away the corner triangles and rectangles one by one. **Win:** predict the area left: 3·2 − 1·1 = 5.
3. *Flipped.* [[0, 1], [1, 0]]. **Win:** say what happened. Area 1, but the green and red arrows have swapped their turning order. Determinant −1.
4. *Pulse after pulse.* The ark's pulse has determinant 0.8. **Win:** volume left after three pulses: 0.512. Then two pulses with determinants 2 and 0.25: **Win:** 0.5.
5. *The forecast.* The bending spire's path is projected. LANTERN: *"Next pulse. Determinant: zero point zero zero."* **Win:** say what happens to the stern's volume, and why the pulse cannot then be undone. Two different points will land in the same place, and nothing afterwards can tell them apart.

**Aha.** "The determinant is how much a pulse scales area or volume. Zero means space is flattened, and a flattened space cannot be undone."

**Named.** After puzzle 2: **DETERMINANT**, ad − bc for 2×2, and for 3×3 the scalar triple product of the columns (Ch 6 returns). det(AB) = det(A)·det(B). Determinant zero ⇔ no inverse ⇔ dependent columns.

**Prove it.** Bram: *"Double every number in a 2×2 and you double the area."* Show it is four times (both columns double). In 3D, eight.

**Console.** Track the ark's volume over 20 logged pulses from their determinants.

**Why it matters.** Normalising flows, a family of generative models, track how much each layer stretches volume with exactly this number. **Cue:** when you see "does area or volume change" or "can this be undone", think *determinant*.

**Act beat · The Collapse.** Teo is on comms from the stern, bracing struts. Wren begs him to get out. He cannot reach the hatch in time. The pulse fires. The stern folds flat into a sheet in front of you. The music loses one of its three voices. LANTERN: *"Pulse complete. The stern is flat, to two decimal places."* Then nothing from Teo.

---

### ACT V · COLLAPSE
*Subspaces, column space, rank, null space, rank–nullity.*

#### Ch 14 · "Where can anything still land?" → **COLUMN SPACE · RANK · SUBSPACE**

**World.** After the collapse pulse, every point the pulse touches lands on one plane. The crew has to know what that plane is and what is still possible.

**Mechanic.** Apply a matrix to a cloud of 2,000 debris points. Watch the cloud become a volume, a plane, a line or a point. Spin the camera edge-on to see the flatness.

**Puzzles**
1. *The landing plane.* LANTERN's two-decimal reading of the collapse pulse has columns (1, 0, 1), (0, 1, 1), (1, 1, 2). **Win:** place the plane everything lands on. Answer z = x + y, normal (1, 1, −1). The third column is the sum of the first two. Wren: *"That's our thruster plane from the first day."*
2. *Possible landings.* **Win:** say which targets the pulse can land something on: (1, 2, 3) yes, (1, 1, 1) no, (0, 0, 0) yes, (2, −1, 1) yes.
3. *Sort by survival.* Four matrices: the identity, the collapse pulse, [[1, 2, 3], [2, 4, 6], [1, 2, 3]] and the zero matrix. **Win:** sort by how many dimensions survive: 3, 2, 1, 0.
4. *Could this be a landing set?* A plane through the origin, a line through the origin, the plane z = x + y + 1, two crossing lines. **Win:** pick which ones a pulse could land everything on. The two through the origin. The shifted plane misses the origin, which always lands on itself. The crossing lines fail because adding an arrow on one to an arrow on the other leaves the set.

**Aha.** "Every landing point is a combination of the columns. So everything lands in the span of the columns."

**Named.** After puzzle 1: **COLUMN SPACE** — "The span of the columns: everywhere the pulse can land a point." After puzzle 3: **RANK** — "How many dimensions survive." After puzzle 4: **SUBSPACE** — "A set that contains the origin, and stays the same set when you add any two of its arrows or stretch any one."

**Prove it.** Bram: *"Start a point in the right place and the pulse can land it anywhere."* Counterexample: a target off the plane.

**Console.** Use `matrix_rank` on the four matrices; then build a 5×5 with rank 2.

**Why it matters.** A layer can only output points inside its column space. A low-rank layer squeezes everything into a thin slice. **Cue:** when you see "which outputs are possible", think *column space*.

**Act beat.** A cutter arrives. Director Marcus Vell of the Survey Authority. Calm, reasonable: *"I'm sorry about your brother. Anything flattened is gone. We're here for the Anchor."*

#### Ch 15 · "What went to zero?" → **NULL SPACE · RANK–NULLITY**

**World.** A pile of debris has gathered at the Anchor. Different pieces, from different places, all landed on the origin. Which direction was crushed?

**Mechanic.** Paint a line of points through the origin and pulse it. The Ledger is open beside the 3D view.

**Puzzles**
1. *Land on the Anchor.* **Win:** find a non-zero point the collapse pulse sends to the origin. Answer (1, 1, −1), since column 1 + column 2 − column 3 = 0. Then every multiple of it: the whole line lands on the origin.
2. *Use the ledger.* **Win:** reduce the pulse's matrix and read off the same line from the free variable: t·(−1, −1, 1).
3. *Same landing.* Two debris pieces start at (2, 0, 1) and (3, 1, 0). **Call it:** same landing point? **Win:** yes, both land on (3, 1, 4). Their difference is on the crushed line.
4. *Count dimensions.* Four matrices including a 2×4 (four inputs into a plane). **Call it:** for each, how many dimensions are crushed? **Win:** fill the table; the game shows survivors + crushed = inputs every time.
5. *Where did it start?* A piece now sits at (1, 2, 3). **Win:** give every starting point that lands there. (1, 2, 0) + t·(1, 1, −1). A whole line. You cannot tell which.

**Aha.** "Every input dimension either survives into the column space or is crushed to the origin. Once points land together, nothing can separate them."

**Named.** After puzzle 1: **NULL SPACE** (also called the kernel) — "Every point the pulse sends to the origin." After puzzle 4: **NULLITY** and the **RANK–NULLITY THEOREM**: rank + nullity = number of columns. After puzzle 5: solutions of Ax = b are one solution plus the null space.

**Prove it.** Bram: *"Only one direction got crushed. We can still undo the rest."* Show two starts that land together; then show that the inverse would have to send one landing point to two places.

**Console.** Find null space bases with `scipy.linalg.null_space` and confirm the theorem on 100 random matrices.

**Why it matters.** Inputs a layer sends to zero are invisible to every later layer. Changes along those directions cannot affect the output. **Cue:** when you see "what is lost" or "which inputs give the same output", think *null space*.

**Act beat.** The low point. Vell: *"You can't run a flattened ark backwards. Your own maths says so."* The player has nothing to say back yet. Wren, alone in the airlock: *"He was bracing the struts because of me. I told him to be useful."* Bram sits with her. LANTERN's display, in the corner, still reads: *Determinant 0.00 (two decimal places).*

---

### ACT VI · THE WRONG GRID
*Basis, coordinates, change of basis.*

#### Ch 16 · "What do the numbers mean on a skewed grid?" → **BASIS · COORDINATES**

**World.** Bram finally measures the buoys around the Anchor's arms directly. The Anchor's grid arrows are not at right angles. LANTERN had been drawing them square.

**Mechanic.** Two grids overlaid: the ship's square grid (white) and the Anchor's skewed grid (violet). One point, two sets of numbers.

**Puzzles**
1. *Name it the Anchor's way.* The Anchor's arrows are b₁ = (1, 0) and b₂ = (1, 1). **Win:** the Anchor's numbers for the ship point (3, 2). Answer (1, 2): one of b₁ and two of b₂.
2. *And back.* **Win:** the ship point for the Anchor's numbers (2, −1). Answer (1, −1).
3. *Is this a usable grid?* {(1, 0), (2, 0)}, {(1, 0), (0, 1), (1, 1)}, {(1, 2), (3, 1)}. **Win:** pick the one that gives every point exactly one name. The first misses points; the second gives some points two names; the third works.
4. *3D.* Anchor arrows (1, 0, 0), (1, 1, 0), (1, 1, 1). **Win:** the Anchor's numbers for the ark beacon at (2, 3, 4), using the ledger. Answer (−1, −1, 4).

**Aha.** "Coordinates are the amounts of each grid arrow you need. Change the arrows, and the same point gets different numbers."

**Named.** After puzzle 3: **BASIS** — "A set of independent arrows that reaches everything: every point gets exactly one name." **COORDINATES** relative to a basis. **DIMENSION** — the number of arrows in any basis.

**Prove it.** Bram: *"A grid needs right angles to name points."* Counterexample: the Anchor's grid names every point exactly once.

**Console.** Convert 1,000 buoy positions between the two grids with `np.linalg.solve`.

**Why it matters.** Word embeddings are coordinates in a learned basis. The same meaning can be written in many bases. **Cue:** when you see "the same thing measured two ways", think *basis*.

#### Ch 17 · "Did Ilse type the wrong numbers?" → **CHANGE OF BASIS**

**World.** The distress call's nine numbers were a quarter-turn: the spire settings Ilse entered to swing the ark out of the debris stream. She wrote them in the ark's square grid. The Anchor applied them in its own skewed grid. (The game teaches the 2D slice first; Navigator and up then do the full 3×3.)

**Mechanic.** The Composition rail with three slots: "into the Anchor's grid", "the pulse", "back to the ship's grid".

**Puzzles**
1. *Replay what happened.* Ilse's numbers R = [[0, −1], [1, 0]] applied in the Anchor's grid. **Call it:** where does the bow marker at ship (1, 0) go? **Win:** (1, 1). Not (0, 1). The replay shows the ark sliding along a skewed path, deeper into the debris.
2. *Translate the pulse.* P has the Anchor's arrows as columns. **Win:** build the motion the ark really felt: P R P⁻¹ = [[1, −2], [1, −1]].
3. *What she meant to enter.* **Win:** the Anchor-grid numbers that would make a true quarter-turn in ship space: P⁻¹ R P = [[−1, −2], [1, 1]]. The replay shows a clean turn.
4. *What did not change.* Compare R and P R P⁻¹. **Win:** pick which match: determinant (both 1), trace (both 0), four pulses return everything home (both). The entries and the landing of (1, 0) do not match. The Case Board question from Ch 11 closes: the volume prediction was exact because area scaling does not depend on which grid writes the numbers.
5. *Fix the old prediction (Navigator+).* Re-run Ch 11's bow prediction with the translated matrix. **Win:** it lands exactly where the bow went.

**Aha.** "The same numbers move space differently in different grids. To do a move written in one grid, translate into it, move, and translate back."

**Named.** After puzzle 2: **CHANGE OF BASIS MATRIX** P, and **SIMILAR MATRICES** (A and P⁻¹AP are the same motion written in two grids).

**Prove it.** Bram: *"Same numbers, same motion."* Counterexample from puzzle 1.

**Console.** Write `in_grid(P, A)` and check that determinant and eigenvalues survive the translation for 100 random grids.

**Why it matters.** Whitening data, PCA and many ML tricks change basis so the problem becomes simple. **Cue:** when you see "the same transformation in another coordinate system", think *P A P⁻¹*.

**Act beat · Ilse is alive.** The newest of Ilse's logs is timestamped two days ago. Then a live voice, no hiss: *"I wrote the right numbers. I did not know whose grid would read them."* She has been alone in the Anchor's core for three years, where the pulses do not reach. She woke Teo eight months ago because she needed help. She asks the player to come and get her.

---

### ACT VII · STABLE CORRIDORS
*Eigenvectors, eigenvalues, diagonalisation, Markov chains.*

#### Ch 18 · "Which lines does the pulse not turn?" → **EIGENVECTOR · EIGENVALUE**

**World.** Vell has a plan: run the Anchor with his own matrix, over and over, to pull the debris field into a shape his cutter can tow. The ark's surviving sections must be moved along lines through the Anchor that the pulse does not turn, or they will be sheared apart.

**Mechanic.** The **Sweep**. Sweep a green test arrow round the circle. Its yellow image is drawn live. When the image lies on the same line as the arrow, that line lights up as a corridor.

**Puzzles**
1. *Corridors of an old friend.* A = [[2, 1], [1, 2]] (from Ch 11). **Win:** find both corridors and read their stretch. (1, 1) stretched ×3; (1, −1) kept ×1.
2. *A shear.* [[1, 1], [0, 1]]. **Win:** find every corridor. Only one: the x-axis, ×1.
3. *A quarter-turn.* **Win:** find every corridor. None. Every arrow turns by 90°.
4. *Without sweeping.* A = [[4, 1], [2, 3]]. If v only stretches by λ, then (A − λI)v = 0, so A − λI crushes v's line (Ch 15). That means det(A − λI) = 0. **Win:** λ² − 7λ + 10 = 0, so λ = 5 and 2, with corridors (1, 1) and (1, −2).

**Aha.** "Most arrows change direction when the pulse moves them. Eigenvectors don't. They only get longer, shorter, or flipped."

**Named.** After puzzle 1: **EIGENVECTOR** and **EIGENVALUE** (the stretch along it). After puzzle 4: the **characteristic equation** det(A − λI) = 0.

**Prove it.** Bram: *"Every pulse has some line it doesn't turn."* Counterexample: puzzle 3.

**Console.** Use `np.linalg.eig` and check each pair with A @ v versus λ v.

**Why it matters.** Google's original PageRank, the stability of recurrent networks and vibration analysis all come down to eigenvectors. **Cue:** when you see "repeated", "stable direction", or "long-run", think *eigenvectors*.

#### Ch 19 · "Where will everything be after fifty pulses?" → **DIAGONALISATION**

**World.** Vell intends fifty pulses. Show him where everything ends up, including his own cutter.

**Puzzles**
1. *Press five times.* V = [[0.75, 0.25], [0.25, 0.75]]. Pulse a debris cloud five times; it thins onto one line. **Call it:** where is the point (3, 1) after fifty pulses? **Win:** (2, 2). In corridor numbers, (3, 1) is 2·(1, 1) + 1·(1, −1). The first part keeps ×1; the second halves fifty times and vanishes.
2. *Fifty as three moves.* **Win:** build V⁵⁰ on the Composition rail as P · D⁵⁰ · P⁻¹: into the corridor grid, stretch each axis fifty times, back out. (Ch 17's translate–move–translate, used again.)
3. *Show Vell.* Vell's 3D pulse is (1/60)·[[37, 7, 16], [7, 37, 16], [16, 16, 28]]. **Win (Navigator):** test the given candidate lines and find the stretches: (1, 1, 1) ×1, (1, −1, 0) ×0.5, (1, 1, −2) ×0.2. **Win (Commander):** find them yourself. Then: **Win:** where his cutter at (4, 2, 0) ends after fifty pulses: (2, 2, 2). Its hull volume is multiplied by 0.1 every pulse, 10⁻⁵⁰ in all. Vell stands down.
4. *Which can be made diagonal?* The shear, A from Ch 18, and the quarter-turn. **Win:** classify. The shear cannot: one corridor is not enough to make a grid.
5. *Growth (Commander).* [[1, 1], [1, 0]] produces Fibonacci numbers. **Win:** predict the ratio of successive terms from the larger eigenvalue: about 1.618.

**Aha.** "In the eigenvector grid, the pulse only stretches each axis. Fifty pulses means stretching each axis by its λ fifty times."

**Named.** After puzzle 2: **DIAGONALISATION** A = P D P⁻¹, and **diagonalisable**.

**Prove it.** Bram: *"After fifty pulses everything ends up at the Anchor."* Counterexample: the ×1 corridor keeps (2, 2).

**Console.** Compute V¹⁰⁰⁰ two ways (repeated multiplication and P D P⁻¹) and compare speed.

**Why it matters.** Gradient descent's speed along each direction, and whether a recurrent network's signal explodes or fades, are set by eigenvalues raised to a power. **Cue:** when you see "after n steps" with a fixed matrix, think *diagonalise*.

#### Ch 20 · "Where do the drones settle?" → **MARKOV CHAIN · STEADY STATE**

**World.** The ark's 300 maintenance drones move between Bow, Mid and Stern every hour by fixed rules. The rescue will need at least 100 of them in the Stern.

**Mechanic.** Three glowing compartments, drones as particles, the transition matrix as red arrows between compartments labelled with percentages. Columns are "from", rows are "to".

The rules: from Bow, 80% stay, 10% go to Mid, 10% to Stern. From Mid, 20% to Bow, 70% stay, 10% to Stern. From Stern, 20% to Bow, 20% to Mid, 60% stay.

**Puzzles**
1. *One hour.* All 300 start in Bow. After one hour: (240, 30, 30). **Call it:** after two? **Win:** (204, 51, 45).
2. *Where it settles.* **Call it** before running 40 hours. **Win:** (150, 90, 60). Found with the Ledger as the solution of (T − I)x = 0 that adds up to 300.
3. *Different start.* All 300 start in Stern. **Win:** predict the settle point. The same (150, 90, 60).
4. *Design the rules.* Change only the Stern's "stay" percentage (the leavers split evenly between Bow and Mid). **Win:** the smallest value that settles at least 100 drones in Stern. Answer 80%, settling at (125, 75, 100).
5. *Rank the terminals (Commander).* Four ark terminals link to each other. **Win:** rank them by where a reader following links settles.

**Aha.** "Each column adds to 1, so no drone is lost. The settle point is the arrangement one more hour leaves unchanged: an eigenvector with eigenvalue 1."

**Named.** After puzzle 2: **MARKOV CHAIN**, **TRANSITION MATRIX**, **STEADY-STATE VECTOR**.

**Prove it.** Bram: *"Where they end up depends on where they start."* Demonstrate with three starts; Bram shakes the starts.

**Console.** Simulate 300 drones with random moves and compare with the eigenvector.

**Why it matters.** Reinforcement learning's environments, PageRank and the text generators of the past are Markov chains. **Cue:** when you see "fixed chances of moving between states", think *transition matrix, eigenvalue 1*.

**Act beat.** Vell's crew helps reroute the drones. Ilse is aboard the Lantern now: older than her logs, steady, ashamed, useful.

---

### ACT VIII · SHADOWS
*Projection, Gram–Schmidt, orthogonal matrices, least squares.*

#### Ch 21 · "What is the closest point we can reach?" → **ORTHOGONAL PROJECTION**

**World.** Bram took the third thruster for the drones. The Lantern is back to its two original thrusters, which reach only the plane z = x + y (Act I). A tether hatch on the Anchor's core is at (1, 1, 0), off the plane. The tether is 1.2 long.

**Mechanic.** A light shines at right angles to a line or plane, and the target's shadow is drawn on it. The leftover arrow from the shadow to the target is drawn with a right-angle mark.

**Puzzles**
1. *Onto a line.* a = (1, 2), b = (3, 1). **Win:** the closest point to b on the line through a: (1, 2). The leftover (2, −1) is at a right angle to a.
2. *Get close enough.* **Win:** the closest reachable point to the hatch: (1/3, 1/3, 2/3), at distance 2/√3 ≈ 1.15. Inside the tether's 1.2. Wren: *"The point we couldn't reach on day one. Now we know how close we can get."*
3. *Split a signal.* s = (4, 3), dish direction d = (0.6, 0.8). **Win:** split s into a part along d, (2.88, 3.84), and a part at a right angle, (1.12, −0.84).
4. *Twice is once.* Apply the projection as a pulse, twice. **Win:** predict that the second pulse moves nothing.

**Aha.** "The closest point is where the leftover arrow is at a right angle to the line or plane."

**Named.** After puzzle 1: **ORTHOGONAL PROJECTION**, onto a line: (a·b / a·a)·a. After puzzle 4: **projection matrix** P = aaᵀ/(aᵀa), with P² = P.

**Prove it.** Bram: *"The closest point on the plane is straight up from the hatch."* Counterexample: moving only along the height axis reaches the plane at (1, 1, 2), distance 2, more than 1.15.

**Console.** Project 1,000 noisy points onto a plane and report the average leftover.

**Why it matters.** Linear regression is a projection: the predictions are the shadow of the data on everything the model can produce. **Cue:** when you see "closest", "best approximation", "component along", think *projection*.

#### Ch 22 · "Can we build a square grid from a skewed one?" → **GRAM–SCHMIDT · ORTHOGONAL MATRIX**

**World.** To set the Anchor precisely during the rescue, LANTERN needs a frame of unit arrows at right angles, built from the Anchor's own skewed arms. And the crew needs to know which moves are safe for the ark: moves that never stretch or squash it.

**Puzzles**
1. *Square up two arrows.* b₁ = (3, 4), b₂ = (2, 1). **Win:** u₁ = (0.6, 0.8); then remove b₂'s shadow along u₁ (2.0 · u₁) to get (0.8, −0.6), already length 1.
2. *Square up the Anchor (3D).* Arms (1, 1, 0), (1, 0, 1), (0, 1, 1). **Win:** build the frame step by step: (1, 1, 0)/√2, (1, −1, 2)/√6, (−1, 1, 1)/√3. Each step subtracts shadows, then rescales.
3. *Safe moves.* Five candidate pulses: [[0.6, −0.8], [0.8, 0.6]], [[1, 0], [0, −1]], a shear, [[2, 0], [0, 0.5]], [[0, 1], [1, 0]]. **Win:** pick the ones that keep every length and angle. The first, second and fifth. [[2, 0], [0, 0.5]] keeps area (determinant 1) but turns circles into ellipses.
4. *Undo for free.* **Win:** undo [[0.6, −0.8], [0.8, 0.6]] in one move by flipping it across its diagonal.

**Aha.** "Remove each arrow's shadow along the arrows you already have. What's left is at a right angle to all of them."

**Named.** After puzzle 2: **ORTHONORMAL BASIS** and the **GRAM–SCHMIDT PROCESS**. After puzzle 3: **ORTHOGONAL MATRIX** — columns are unit length and at right angles; QᵀQ = I, so Q⁻¹ = Qᵀ. Commander adds **QR factorisation**.

**Prove it.** Bram: *"Any matrix with determinant 1 is a safe move."* Counterexample from puzzle 3.

**Console.** Write `gram_schmidt(B)`; compare with `np.linalg.qr`; watch it lose accuracy on nearly dependent arrows.

**Why it matters.** Rotations in 3D graphics and robotics are orthogonal matrices; some networks are kept orthogonal so signals neither explode nor fade. **Cue:** when you see "perpendicular frame" or "rotation", think *Gram–Schmidt, orthogonal matrix*.

#### Ch 23 · "What is the best answer when the readings disagree?" → **LEAST SQUARES**

**World.** To undo the collapse, the crew needs the collapse pulse to many more decimal places than LANTERN's two. The drones log hundreds of before-and-after buoy positions. Every reading carries noise. No matrix fits them all exactly.

**Mechanic.** Each reading's error is drawn as a literal square on the plot. The total area of the squares is the score. Then the same problem in 3D: a target arrow, and the plane of everything the model can produce.

**Puzzles**
1. *Drag the line.* The stern's drift: times 0, 1, 2, 3 and positions 1, 2, 2, 4. **Win:** drag a line to within 1% of the smallest total square area. Then the exact best line: y = 0.9 + 0.9t.
2. *See the right angle.* Three readings, 1, 2, 4 at times 0, 1, 2. The readings form one arrow b = (1, 2, 4) in 3D. The model's columns (1, 1, 1) and (0, 1, 2) span a plane. **Win:** move a point in that plane to be closest to b. It lands at (0.83, 2.33, 3.83), and the leftover (0.17, −0.33, 0.17) is at a right angle to both columns. That right angle *is* the formula: Aᵀ(b − Ax) = 0, so AᵀAx = Aᵀb.
3. *Fit the collapse pulse.* **Win (Navigator):** fit the 2D slice from 6 noisy pairs. **Win (Commander):** fit the full 3×3 from 20 pairs. The fit gives the third column as (1, 1, 2.004), not (1, 1, 2).
4. *What's left over.* LANTERN plots the leftover of the best fit over time. **Win:** mark anything that is not random. The spikes come in groups: three short, three long, three short. Played as sound, they are taps on a hull.

**Aha.** "When no exact answer exists, take the closest one: project the readings onto everything the model can produce. The error left over is at a right angle to it."

**Named.** After puzzle 2: **LEAST SQUARES**, the **NORMAL EQUATIONS** AᵀAx̂ = Aᵀb, and the **RESIDUAL**.

**Prove it.** Bram: *"The best line goes through as many points as it can."* Counterexample: a line through two readings with a larger total square area than the least-squares line.

**Console.** Fit with `np.linalg.lstsq`, then plot the residuals and find the pattern yourself.

**Why it matters.** Linear regression, the first model in every machine-learning course, is least squares. Looking at residuals is how you find what a model is missing. **Cue:** when you see "more equations than unknowns" or "noisy data", think *least squares*.

**Act beat · The Residual.** Wren hears the taps before LANTERN finishes the sentence. *"That's him. That's how we used to knock on the bunk wall."* Teo is alive inside the flattened stern.

---

### ACT IX · SINGULAR
*Symmetric matrices, SVD, conditioning, PCA.*

#### Ch 24 · "Which directions does the pulse stretch most?" → **SYMMETRIC MATRIX · SINGULAR VALUE DECOMPOSITION**

**World.** Before any unfolding, the ark's hull must be braced along its main stress lines. Then the crew must see the collapse pulse in its plainest form.

**Mechanic.** The Sweep, now with a whole unit circle of points (or a sphere). The yellow image is an ellipse (or ellipsoid). Drag a pair of input arrows at a right angle; their images are drawn.

**Puzzles**
1. *Stress lines.* The hull's stress readings S = [[3, 1], [1, 3]]. **Win:** brace along the two corridors: (1, 1) ×4 and (1, −1) ×2. They meet at a right angle. Bram shakes in five random matrices that equal their own mirror across the diagonal: the corridors are always at right angles. Then A = [[4, 1], [2, 3]] from Ch 18: its corridors are not.
2. *Circle to ellipse.* C = [[3, 0], [4, 5]]. **Win:** find the pair of input arrows at a right angle whose images are also at a right angle. Answer (1, 1)/√2 and (1, −1)/√2. Their images have lengths 6.71 and 2.24, along (1, 3) and (3, −1). Check: 6.71 × 2.24 = 15 = |det C|.
3. *Three moves.* **Win:** build C on the Composition rail as turn, stretch along the axes by 6.71 and 2.24, turn. The circle stays a circle, becomes an upright ellipse, then tilts.
4. *The collapse pulse, exactly.* LANTERN runs the decomposition on the fitted pulse from Ch 23. Display: *"Stretches: 3.00, 1.00, 0.00."* **Win:** press *Show more decimals*. 0.00133. Then say what it means for the stern: squashed to about 1/750 of its thickness. Not to zero.

**Aha.** "Every matrix turns space, stretches it along axes at right angles, then turns it again. A zero stretch means flattened. A tiny stretch means squashed thin, but still there."

**Named.** After puzzle 1: **SYMMETRIC MATRIX** (equal to its own mirror across the diagonal) and the **spectral theorem**: real eigenvalues, eigenvectors at right angles, S = QΛQᵀ. After puzzle 3: **SINGULAR VALUE DECOMPOSITION** A = UΣVᵀ, and **SINGULAR VALUES**, found as square roots of the eigenvalues of AᵀA (a symmetric matrix, so puzzle 1 applies).

**Prove it.** Bram: *"The longest output comes from one of the grid arrows."* Counterexample: (1, 0) and (0, 1) both land with length 5; (1, 1)/√2 lands with length 6.71.

**Console.** `np.linalg.svd` on the fitted pulse, then rebuild it from U, Σ, Vᵀ.

**Why it matters.** Compressing images, recommender systems and low-rank fine-tuning of large language models all keep the biggest singular values and drop the rest. **Cue:** when you see "how much does it stretch, in which directions", think *SVD*.

**Act beat.** Vell: *"Zero is zero."* The player puts the decimals on the main screen. Bram, quietly: *"Thin. Not gone."*

#### Ch 25 · "Can we unfold the stern without tearing it?" → **INVERSE BY SVD · CONDITION NUMBER**

**World.** The Anchor can apply the exact inverse of the collapse pulse: V Σ⁻¹ Uᵀ. Along the thin direction, that stretches by about 750. Every error in that direction is stretched by 750 too.

**Puzzles**
1. *Try it raw.* Apply the inverse to a test cluster of buoys whose readings carry 0.01 of noise. **Call it:** how far off will they land? **Win:** about 7.5. The cluster bursts along one axis.
2. *Clean the readings.* Averaging N readings divides the noise by √N. The stern's frame tears if any point lands more than 0.3 off. **Win:** the fewest readings: 0.01 × 750 / √N ≤ 0.3, so N = 625. The drones from Ch 20 take them.
3. *Write it in the Anchor's grid.* **Win:** convert the inverse into the Anchor's grid before entering it: P⁻¹ C⁻¹ P (Ch 17). Set the three spires. One spire extends far past the others.
4. *Unfold.* Commit. **Win:** the stern's hull error within tolerance (graded from the player's N and settings).
5. *Two gentler pulses (Commander).* The Anchor's spires cannot extend past 400. **Win:** split the inverse into two pulses whose product is V Σ⁻¹ Uᵀ, each stretching at most √750 ≈ 27.4.

**Aha.** "Dividing by a tiny singular value multiplies every error in that direction by the same huge amount. Clean the readings first."

**Named.** After puzzle 1: **inverse by SVD** A⁻¹ = VΣ⁻¹Uᵀ, and the **CONDITION NUMBER** σ_max/σ_min (here about 2,250). After puzzle 4: the **pseudo-inverse**, which divides only by the singular values that are not zero, and is the honest answer for directions that are truly gone.

**Prove it.** Bram: *"The error's tiny, use the inverse now."* Demonstrate: noise × 750.

**Console.** Solve a nearly singular system with and without averaging; plot error against N.

**Why it matters.** Ill-conditioned problems are why ML code adds a small number to the diagonal (regularisation) before inverting. **Cue:** when you see "tiny singular value" or "unstable inverse", think *condition number, clean the data or regularise*.

**Act beat · Thin, Not Gone.** The stern fills back out of a sheet, over twenty seconds, under the true inverse. The music regains its third voice. Teo's voiceprint, a jagged band of static since Act IV, resolves into a clean line. *"Wren? Why is everyone so loud?"*

#### Ch 26 · "What should we keep?" → **PRINCIPAL COMPONENT ANALYSIS**

**World.** The 750× pulse has cracked the Anchor. It will go dark within the hour. Its core holds a record left by the people who built it: 10,000 entries of 12 numbers each. The Lantern can send only 2 numbers per entry before the core fails. Which 2?

**Mechanic.** A point cloud. A viewing plane you can turn; the cloud's shadow on it, with a meter showing how spread out the shadow is.

**Puzzles**
1. *The widest shadow.* 500 points in a tilted pancake, spread about 5, 2 and 0.1 along its axes. **Win:** turn the viewing plane until the shadow's spread is within 95% of the largest possible.
2. *Centre first.* Without moving the origin to the cloud's middle, the "best" direction points at the cloud instead of along it. **Win:** spot it and drag the origin to the mean.
3. *The spread matrix.* LANTERN computes the spread of the centred cloud as a matrix. It is symmetric (Ch 24). **Win:** match its eigenvectors to the plane you found by hand. They agree, and they are also the SVD's directions for the centred data.
4. *How many to keep.* The record's 12 singular values: 9.0, 7.0, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.3, 0.2, 0.2. **Win:** the fewest components that keep 95% of the spread (sum of squares). Answer 2 (96.4%).
5. *Look.* Project the record onto those two components. **Win:** none needed. The points form a spiral of star positions with one path marked through them.

**Aha.** "The directions with the most spread are the eigenvectors of the data's spread matrix, the same directions the SVD finds. Keep the biggest few and you keep most of the shape."

**Named.** After puzzle 3: **PRINCIPAL COMPONENT ANALYSIS**, **PRINCIPAL COMPONENTS**, **COVARIANCE MATRIX**, **explained variance**.

**Prove it.** Bram: *"Keep the two biggest columns of the data."* Counterexample: the best two directions are mixes of the original columns, and keeping raw columns keeps less spread.

**Console.** PCA on a real dataset (the student's own MNIST digits from the AI Field Explorer site), then reconstruct digits from 2, 10 and 50 components.

**Why it matters.** PCA is the first tool for seeing high-dimensional data, and the map of digits on the student's own site is one. **Cue:** when you see "too many dimensions" or "most of the variation", think *PCA*.

---

### EPILOGUE · "Every point stays where it is."

Ilse sets the Anchor's three spires along the three grid arrows, one last time. **Playable:** you check her settings. **Win:** the identity matrix. The final pulse fires and nothing moves. The buoys hang still. The grid is square.

The *Meridian* wakes its 12,000 sleepers. Vell takes the star map home: *"Two numbers per entry. It will have to be enough."* The camera drifts across the bridge wall, plate after plate, each with a sentence you wrote. Credits roll over your Field Manual.

**Post-credits.** Ilse, looking at the record's third component, the one with spread 1.5 that you left out: *"This one isn't noise either."*

---

## 4. The explain-back system: **The Briefing**

Every chapter ends at the holotable. Bram Haldane will not bolt anything onto his ship that he does not understand. You have to convince him. This happens in two layers: **show it**, then **say it**.

### 4.1 Show it: Bram's Doubt

Bram raises one to three objections. Each is a real misconception students hold (Section 3 lists one per chapter). Each objection is one of three types:

| Type | Bram says | You do | The engine checks |
|---|---|---|---|
| **Counterexample** | "None of these three point the same way, so all three are useful." | Build a scene where the claim fails | A predicate on the holotable scene (e.g. three arrows, pairwise not parallel, triple product 0) |
| **Demonstration** | "Show me the order of burns doesn't matter." | Build a scene that shows the property | The predicate holds, then **Bram's Shake** |
| **Predict and defend** | "Double one strut, volume doubles. Right?" | Commit a prediction, then build the case that settles it | Prediction plus predicate |

**Bram's Shake** is the heart of it. After a demonstration, Bram randomises every free quantity in your scene five times (ten on Commander, including edge cases such as a zero arrow or two parallel arrows). If your demonstration only worked because you picked special numbers, the shake breaks it, and Bram says exactly what broke: *"Held for your arrows. Not when I made them parallel."* This teaches the difference between an example and a reason, without the word "proof" ever being needed.

### 4.2 Say it: your Field Manual

The game has no codex written for you. **The codex is written by you.** After Bram is convinced, you write that chapter's Field Manual page in four short slots that follow the house order:

1. **What you see** (one sentence about the arrows, grid or points)
2. **What it means**
3. **What it's called**
4. **When you see ___, think ___**

The formula is supplied by the game, colour-coded, and you choose which of your own winning snapshots it sits next to. The page auto-captures a frozen 3D scene from your best solve, so your page shows *your* arrows.

**Feedback, never a gate.**
- *Cadet:* sentence frames with blanks and a word bank built from the objects in your scene.
- *Navigator:* free text. After you file it, Ilse's own notebook page for the same idea appears beside yours. You tick a three-item self-check ("Did I say what happens to area? Did I say what zero means? Did I say what a negative sign means?").
- *Commander:* free text, then **Bram reads it.** A small local rubric looks for the key ideas as concept tags with synonyms. For the determinant: {area | volume} + {scale | times | multiplies} + {zero → flat | squashed | no undo}. A missing tag triggers a recorded Bram line naming the gap: *"You haven't said what zero does."* You can revise, or *File it anyway*.

**Consequence in the world.** Bram etches your "what it means" sentence onto a metal plate and mounts the device he built from it (the shadow sensor, the brace jig, the spire bench). The device is used in the next chapter either way. If you skipped the Briefing, Bram builds it anyway and says so: *"Built it from Ilse's notes. Still not sure why it works."*

### 4.3 Teach Teo (spaced retrieval, Acts V–IX)

From inside the flattened stern, Teo can receive only short messages: **40 words** and one holotable scene per message. He needs old ideas to help from inside: how to tell if his three struts still hold volume (Ch 6), how to send his position in the Anchor's grid (Ch 1 + Ch 16), why the ledger trick keeps the answer (Ch 8), what a dish reading measures (Ch 4), why a flattening cannot be undone (Ch 15).

You answer by sending a scene plus an edited version of your own Field Manual sentence. The 40-word limit forces the core idea. Teo's reply shows whether it landed (he braces the right strut, or he asks a sharper follow-up). His bandwidth grows as the rescue proceeds, so later messages can carry more. This puts each early concept back in front of you 5–15 hours after you first met it, in a new setting.

### 4.4 The Broadcast (finale)

Before the sleepers wake into a region that still looks strange, the crew records one broadcast to explain what happened and how to read the place. You build it:

1. **The chain.** Drag 12 of your Field Manual pages into an order from *vector* to *SVD*. Each link needs one sentence: "this needs that because ___". (*Determinant needs volume, because a determinant is the volume of the box the columns make.*)
2. **Ilse's six questions.** Ilse asks six mixed "why" questions, each answered with a holotable scene and a sentence: *"Why does a zero determinant mean no inverse?" "Why are the corridors of a symmetric matrix at right angles?" "Why is least squares a projection?"*
3. **Then and now.** The game shows your first Field Manual page from Act I beside your latest revision of it.

**Export.** The finished Field Manual exports as Markdown and PDF, with your snapshots and the formulas. It is a linear algebra study guide written by the student. Every console task exports as a Colab notebook.

### 4.5 Sorties (unlabelled practice)

From the Case Board, any time: procedurally generated mixed problems (seeded, so they are testable) set in the Fold. The problem never names the method. *"Three beacons at these positions. Is the ark's hull section between them still holding volume?"* You pick the instrument. This trains recognition, the house rule "unlabelled practice", and exam readiness.

---

## 5. Difficulty levels

Difficulty can be changed at any time, per chapter, with no penalty. **Show me / Skip** exist on every level.

| | **Cadet** | **Navigator** (default) | **Commander** |
|---|---|---|---|
| Dimension | 2D first for most puzzles; 3D where the story needs it | 3D wherever the topic allows | 3D, plus 4×4 systems and 4D data in Acts III, VIII, IX |
| Snapping | Whole numbers | Halves | Tenths; non-integer data |
| Result preview | Live: you see where the result will land as you drag | Hidden until commit; Call it encouraged | Hidden; commits are counted against par |
| Arithmetic | LANTERN does it on request; you choose the operations | You do it in the ledger and on the bench; LANTERN checks each step | You do it; LANTERN checks only the final answer |
| Hints | After a miss: nudge, then picture, then Show me | On request | On request; one tier only (picture) |
| Puzzles | Core puzzles only | Core + one stretch | All, including Commander-only puzzles (marked in Section 3) |
| Labelling | Tool suggested by the scene | Tool not suggested | Chapter puzzles can mix in earlier topics, unlabelled |
| Bram's Shake | 2 shakes, no edge cases | 5 shakes | 10 shakes including zero and parallel arrows |
| Field Manual | Sentence frames + word bank | Free text + self-check against Ilse's page | Free text + Bram's rubric read |
| Console | Fill in blanks in given code | Write the function; tests given | Implement without the matching `np.linalg` call |

A fourth mode, **Viva**, is unlocked from the start (never gated): every chapter's Briefing objections in a random order, no puzzles. For revision before an exam.

---

## 6. Visual, audio and UI direction

### 6.1 Visual direction: "Space you can see bend"

**The one idea.** The grid of light *is* the art. Everything visual serves showing what space is doing. Every deformation on screen is the actual matrix applied to actual vertices in a shader. Nothing is faked, so the picture is always honest.

**Palette.**
- Background: deep ink blue to near-black (#05070d → #0b1220), with a cool nebula.
- Lattice: pale cool white, low alpha, with bloom.
- **Maths colours are reserved:** green (#3ddc84) input arrow v, red (#ff5a5f) second arrow w, matrix columns and weights, yellow (#ffd23f) result. Nothing else in the game uses these three hues. No green suits, no red warning lights, no yellow star.
- Story and UI: desaturated blue-greys, violet (#9b8cff) for the Anchor's grid and story UI, cyan for LANTERN.
- Colour-blind support: green arrows solid, red arrows dashed, yellow arrows double-stroke with a glow; every arrow carries its letter label.

**Hero assets (Blender bpy scripts → glTF with meshopt compression).**

| Asset | Look | Budget |
|---|---|---|
| *Lantern* (survey tug) | Hexagonal hull, open lattice projector dish at the bow, four thruster pods (two visibly dead), interior bridge with holotable and wall plates | 60k tris exterior, 40k interior |
| *Meridian* (ark) | 1.2 km spine, three sections with ring habitats, struts in exposed box frames (Ch 6), hangar door triangle (Ch 7). Procedural detail from instanced modules | 150k tris, instanced; LOD 3 levels |
| The Anchor | Obsidian monolith, three spires of glowing seams (the columns, red when set). Gloss black with fine procedural grooves | 30k tris + emissive mask |
| Buoys, debris, drones | Instanced. Debris is displaced icospheres in 12 variants | < 500 tris each |
| Crew figures | Low-poly spacesuits with **reflective visors** (the crew wear helmets in the Fold, so no faces are ever needed). Identity from suit cut, accent colour and posture | 8k tris each |

Materials are PBR with procedural noise baked to 1k textures in Cycles (AO, curvature-based wear). A handful of Cycles CPU stills (title screen, act cards, Field Manual cover, credits backgrounds) at 1080p with denoising, about 10 renders.

**Shaders.**
- Grid deformation: matrix uniform interpolated from I to A, so every point moves in a straight line to its landing spot (honest to the maths). For rotations, interpolate by angle (polar split) so the playback never passes through a flattened state that the pulse itself does not have.
- The pulse wave: a spherical shockwave front with screen-space refraction and a chromatic fringe; the grid deforms as the front passes.
- Flatness: when rank drops, the crushed direction compresses with thin-film interference colours along the sheet edge.
- Nebula sky: layered fBm on a sky sphere, slowly drifting; a soft volumetric glow around the star.
- Holograms: fresnel rim, scanlines, slight flicker on the holotable and voiceprints.
- Post: UnrealBloom, ACES filmic tone mapping, SMAA, subtle grain and vignette; depth of field and letterbox only in cinematics.

**Character portraits without drawn art.** Each speaker has a **voiceprint**: a 3D ribbon driven live by the voice audio's spectrum, in the speaker's accent colour and form.
- Wren: quick, bright, tight ribbon.
- Bram: heavy, slow low bars.
- Ilse: a calm sine-like ribbon; in logs, broken by tape hiss.
- LANTERN: a strict 8 × 8 dot matrix that lights in order.
- Teo: a band of static from Act IV, whose noise level is **literally tied to the rescue's residual error**. It clears in Ch 25.
- Vell: a smooth dark ribbon with very little movement.

Combined with the helmeted figures and strong typographic name plates, the cast reads as distinct people without a single drawn face.

**Cinematics.** In-engine, from a timeline JSON (camera splines, voice cue ids, subtitles, music cues, matrix keyframes). Every cutscene is skippable and under 90 seconds.

**Typography.** Space Grotesk for UI, JetBrains Mono for numbers and console, KaTeX for formulas, and a wide-tracked condensed display face (Barlow Condensed) for the naming cards. All fonts bundled from npm, no CDN.

**Performance target.** 60 fps on an integrated laptop GPU at 1080p on the Medium preset. Instancing everywhere, three LODs, ≤ 300k triangles on screen, baked lighting plus one key light and one rim light, shadows only near the camera. Low preset for headless tests and phones.

### 6.2 Audio direction

**Voice cast (Kokoro, pre-generated to mp3).**

| Character | Voice id | Speed | Traits | Processing |
|---|---|---|---|---|
| Wren Okafor, pilot | `af_heart` | 1.05 | Warm, quick, dry humour | Helmet room reverb, light compression |
| Bram Haldane, engineer | `bm_george` | 0.92 | Deep, slow, gruff, kind | Close mic, warm EQ |
| LANTERN, ship computer | `bf_isabella` | 1.00 | Even, precise, literal | Subtle ring modulation (low mix), narrow room |
| Dr. Ilse Varga, scientist | `bf_emma` | 0.95 | Calm, exact, wry | Logs: band-pass 300–3400 Hz, tape hiss, slight flutter. Live from Act VI: clean |
| Teo Okafor, Wren's brother | `am_puck` | 1.08 | Young, curious, scared, funny | Static mix tied to rescue progress |
| Director Marcus Vell | `am_onyx` | 0.90 | Deep, measured, reasonable | Clean, slightly close |

Backups if a voice tests poorly: Bram `bm_fable`, Teo `am_liam`, Vell `am_fenrir`, LANTERN `af_nicole`.

**Scale.** About 1,800 lines, roughly 3.5 hours of audio. Generated after a text freeze, by act, with a manifest (line id → speaker → text → file). A pronunciation lexicon maps hard words to spellings Kokoro reads well ("eigen" → "eye-gen", "Gram–Schmidt" → "gram shmit", "Varga", "Haldane"). No raw formulas are ever spoken; lines are written to be said: "A times v", "the determinant is zero point eight".

**Adaptive procedural music (WebAudio).** A generative score per act: pad, pulse, arpeggio, bass and a formant choir-like pad.
- *Tension follows distance.* The filter opens and the harmony moves toward the home chord as your plot nears the win. An exact solve resolves on the home chord.
- *Rank in the music.* In Acts V and IX the score has as many independent melodic voices as the current transformation's rank. The Collapse drops from three voices to two. The unfold brings the third back.
- *Corridors in the music.* In Act VII, one held note stays fixed in pitch while the others glide each pulse.
- Each act has its own mode and tempo; the epilogue is a single sustained chord that does not change.

**SFX (synthesised in WebAudio).** Arrow drag: soft ticks per grid unit, pitched by length. Snap: a glass click. Commit: ignition swell. Pulse: sub-bass thump, metal shimmer, a creak as the grid moves. Row operation: a sliding glass tone. Determinant reaching zero: a pressure drop to near silence. Called it: two-note chime. A miss: a soft detune, never a buzzer.

**Mix.** Dialogue ducks music by 6 dB. Separate sliders for voice, music, SFX.

### 6.3 UI and feel

- **Layout.** Top-left: the chapter question. Right: the formula panel, colour-coded and live, sitting next to the picture. Bottom: the instrument tray. Top-right, always: *Show me*, *Skip*, *Call it*.
- **Everything touchable.** Hover a symbol in a formula and its arrow glows; drag an arrow and its symbol updates.
- **Snap and weight.** Arrow tips have a magnetic snap with a tiny overshoot. Committed moves have weight: a short anticipation, then motion with a soft settle.
- **Naming cards.** A full-screen typographic card over the frozen scene, the term in wide caps and a one-sentence plain definition underneath, held for 3 seconds, then folded into the corner.
- **Controls.** Mouse: left-drag arrows, right-drag orbit, scroll zoom. Keyboard: Tab between handles, arrow keys nudge, typing sets components, Space commits, C calls, H hints, F opens the Field Manual, Esc pauses. Every action is keyboard-reachable.
- **Accessibility.** Subtitles always on by default with speaker names; text size; reduced motion (no shake, no DOF, shorter cuts); colour-blind line styles; screen-reader labels on all DOM UI.
- **Phone (bonus).** Touch-drag arrows, two-finger orbit, Cadet's 2D variants, Low preset.

---

## 7. Story

### 7.1 Characters

**You, the Navigator.** Silent. Named by the player; the crew calls you "Nav". You plot every move, and your sentences become the ship's manual. Silence matters here: your explanations *are* your voice.

**Wren Okafor, pilot (31).** Warm, fast, funny, and wound tight. Her younger brother Teo is a sleeper on the *Meridian*. She flies whatever you plot, and tells you if it is ugly. Arc: from *"Get me to him"* to being the one who insists on all 625 readings before the unfold.
> *"I fly what you plot. So plot something I can fly."*

**Bram Haldane, engineer (64).** Gruff, patient, sceptical, quietly kind. Years ago he lost a crewmate to a number nobody checked, and since then he builds nothing he cannot explain. He is the explain-back mechanic made into a person. Arc: from doubting you to etching your words onto his ship.
> *"Don't tell me it works. Show me why. Then I'll bolt it on."*

**LANTERN, the ship's computer.** Literal. Reports only what points, arrows and grids did. Never guesses, never comforts. Its deadpan is often funny, and its lines model the house wording for the whole game. In the finale it reads your Field Manual pages aloud for the Broadcast.
> *"Pulse complete. Every buoy moved. Lines of buoys are still straight. The Anchor did not move."*

**Dr. Ilse Varga, the Meridian's science officer (52).** Heard first only in old logs, then live. Precise, patient, dry. She found the Anchor, learned that its spires set where the grid arrows land, and tried to use it to save the ark. She wrote the right numbers in the wrong grid. Three years alone in the Anchor's core. Arc: from voice in the past, to confession, to the person who sets the Anchor to the identity.
> *"I wrote the right numbers. I did not know whose grid would read them."*

**Teo Okafor, Wren's brother (19).** Woken early by Ilse because she needed help. Curious, frightened, funny under pressure. Trapped in the stern when it flattens. He becomes the person you teach. Arc: from static and taps to a clear voice.
> *"Okay. Say it like I slept through the lecture. Because I did. For three years."*

**Director Marcus Vell, Survey Authority.** Calm, reasonable, under orders, responsible for a home colony that needs the Anchor. Not cruel; he believes the ark is lost and the Anchor is worth more. He is wrong about one thing: he thinks "flat to two decimal places" means gone. The maths, not a fight, changes his mind twice.
> *"I'm sorry about your brother. Anything flattened is gone."*

### 7.2 Stakes

- **12,000 sleepers** on the *Meridian*, being sheared and squeezed pulse by pulse.
- **Teo**, personally, for Wren and for you.
- **Ilse's guilt** and three years alone.
- **The Anchor and its record**, which Vell needs and which will not survive the rescue.

### 7.3 Twists, in order

1. **The empty pod** (end of Act III). Teo is awake, somewhere.
2. **The clue that did not fit** (Act IV). The position prediction is off; the volume prediction is exact. Left open on the Case Board.
3. **The Collapse** (end of Act IV). The stern folds flat, with Teo inside.
4. **The right numbers, the wrong grid** (Act VI). Ilse's fix was correct in the ark's grid. The Anchor applied it in its own. The Act IV clue resolves. **Ilse is alive.**
5. **The fiftieth pulse** (Act VII). Your prediction shows Vell his own cutter ending on a line. He stands down.
6. **The Residual** (Act VIII). The leftovers of the best fit are not noise. They are Teo, knocking.
7. **Zero, to two decimal places** (Act IX). The smallest singular value is 0.00133. Thin, not gone.
8. **The third component** (post-credits). What you left out was not noise either.

Every twist is a fair-play reveal: the clue is on screen earlier (LANTERN's "two decimal places", the skewed buoy lattice, the volume match), and the maths is the only way to read it.

### 7.4 Ending

The ark is whole. Teo is out. Ilse comes aboard. The Anchor, cracked by the 750× pulse, sends its record as two numbers per entry and goes dark. Ilse sets it to the identity for its last pulse, and nothing moves. The final shot is the Lantern's bridge wall, covered in plates of your sentences, and the Field Manual's cover: *Written by [your name]*.

---

## 8. Why this will be remembered: three signature moments

1. **The Collapse (end of Act IV).** You spent a chapter learning that a determinant is the volume a pulse leaves behind. LANTERN forecasts *zero point zero zero*. You cannot stop it. You watch a 1.2 km ship fold into a sheet with the real matrix applied to its real vertices, as the music loses one of its three voices, and Teo's line goes to static. Players will remember *why* determinant zero means no undo, because they felt it.

2. **The Residual (Act VIII).** A least-squares chapter. You fit a line, you see the right angle, you fit the pulse. Then LANTERN plots what is left over, and asks if anything there is not random. Three short, three long, three short. Wren hears it first. A lesson about looking at residuals becomes the moment the player learns a character is alive.

3. **Thin, Not Gone (Act IX).** Vell says zero is zero. You press *Show more decimals*: 0.00133. Then you do everything at once: clean the readings, invert by SVD, translate into the Anchor's grid, set the spires, and watch the stern fill back out of a sheet as Teo's static clears into his voice. The difference between a zero singular value and a tiny one, a graduate-level idea, becomes the emotional peak of the game.

*And the closer:* the bridge wall covered in metal plates, each etched with a sentence the player wrote, read aloud by LANTERN in the final broadcast.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Scope.** 26 chapters, voice, 3D, cinematics | One chapter data contract (Section 10). Five hero assets reused everywhere. Cinematics in-engine from timeline JSON, no hand animation. **Vertical slice first:** Prologue, Ch 1–3, Ch 11, Ch 17 (proves arrows, span, spire bench, composition rail, the twist, voice, music). Then one agent per act in parallel. Voice generated only after text freeze. Cap: 4 core puzzles + 1 stretch per chapter |
| **Story swamps the maths** | Cutscenes ≤ 90 s and skippable. At least 70% of play time is hands-on. Every plot beat ends on a Case Board question that only the next chapter's maths answers. Playtest metric: time-in-puzzle vs time-in-cinematic per chapter |
| **Wording rules in dialogue** (drama tempts exclamation marks, hype, personification) | A wording linter in CI over every player-visible string (dialogue, UI, LANTERN, Field Manual model pages, naming cards): banned words list, the exclamation mark character, filler openings, analogy word list, third-person *wants / likes / thinks / feels / tries* after a maths noun, the word "machine" near "matrix". Emotion is carried by voice and plain words, never punctuation. Characters may feel; maths objects never do |
| **Terms used before they are earned** (characters say "span" in Act I before Ch 2 names it) | A term ledger (JSON: term → chapter where named). The linter flags any use of a term in a scene earlier than its chapter. Dialogue before naming uses literal words ("everywhere we can reach") |
| **Wrong maths** | Every number in every puzzle and every line of dialogue comes from a shared TypeScript maths library with unit tests. Each puzzle's text numbers are generated from its data, not typed. Tests assert each stated value (e.g. Ch 20's settle point 150/90/60) |
| **Testability** | A debug API on `window.__singular`: `goto(chapter, puzzle)`, `state()`, `solve()` (applies the canonical solution), `isWon()`, `setDifficulty()`, `seed(n)`, `skipCinematics(true)`, `briefing.solve(objectionId)`, `shake(n)`. Deterministic RNG. Playwright runs every puzzle × difficulty: goto → solve → assert won, and a known wrong answer → assert not won. Every Bram objection: canonical scene → shake → passes; a special-case scene → shake → fails. Screenshot checks at fixed seed and time on the Low preset (SwiftShader) |
| **Explain-back grading is fragile** | The rubric is advisory only and never blocks. Navigator uses self-check against Ilse's page. The "show it" layer, which is fully checkable, carries the weight. An optional LLM-read mode can be added later behind a setting |
| **Kokoro limits** (pronunciation, emotional range) | Pronunciation lexicon; lines written so meaning and feeling are in the words; speed variation per line; music under emotional beats; a listening pass per act; backup voices listed |
| **Performance on laptops** | Quality presets, instancing, LODs, baked lighting, triangle budget, a frame-time HUD in debug builds |
| **Never gate** | All chapters open from the Case Board from the first minute; a "Previously" recap card (voiced) when jumping ahead; Show me / Skip on every puzzle and objection; stars and par never block; no timers anywhere |
| **Colour language collisions** | Green, red and yellow reserved exclusively for v, w and results. Line-style and letter labels for colour-blind players |
| **Pyodide size** (≈ 10–15 MB with NumPy) | Loaded lazily only when the console first opens, cached by the browser, bundled locally; the game runs fully without it |

---

## 10. Build notes for parallel agents (short)

**Chapter data contract** (`src/chapters/chNN-slug.ts`):
- `meta`: id, act, question title, term card text, In short text, recognition cue, why-it-matters note.
- `scenes`: world setup (assets, camera, lattice, instruments enabled).
- `puzzles[]`: setup data, instruments, difficulty variants, `isWon(state)`, `canonicalSolution`, `par`, `callIt` tolerance, Show me script.
- `naming`: trigger (after puzzle n), card text, formula (KaTeX with colour macros).
- `briefing`: objections with type, predicate, shake parameters, edge cases; Field Manual slots, rubric tags, Ilse's model page.
- `teoCallbacks[]`: (Acts V–IX) question, 40-word limit, reply variants.
- `console`: task text, starter code, hidden tests, Colab export.
- `dialogue`: line ids only; text lives in one script file per act for the wording linter and the voice manifest.

**Shared engine** owns: renderer and post, lattice and deformation shader, arrow and matrix widgets, ledger, composition rail, sweep, holotable, Case Board, Field Manual, dialogue and subtitles, voice playback, music engine, save (local), debug API.

**Order of work.** Maths library and tests → engine and instruments → vertical slice → wording linter and term ledger → chapters by act in parallel → Blender assets → text freeze → Kokoro generation → full Playwright pass → playtest and fix.
