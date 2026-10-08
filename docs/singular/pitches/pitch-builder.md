# BASIS

**Pitch through the CS-builder lens: the game runs on your code.**

Owner: game designer (builder lens). Aligned to `curriculum.md` nodes N01–N28 and threads T1–T14. All player-facing text in this pitch (dialogue, headings, UI strings, tile text) follows BUILD_BRIEF sections 2, 2a and 2b. Every puzzle number below was checked in NumPy (Appendix B).

---

## 1. Title and logline

### BASIS
*Everything else is built from it.*

**Double meaning.** In ordinary English a basis is the foundation something stands on. In linear algebra a basis is a set of arrows that reaches every point in a space with nothing wasted. The library the player writes is the file `basis.py` from the first minute. Until Chapter 16 it is only a filename. In Chapter 16 the word is earned, and a recorded note from the library's original author explains why she chose it.

### Logline
When a storm knocks out the sealed maths library that runs Lantern, a survey station orbiting an ice moon, the newest crew member has to rebuild it from nothing, one Python function at a time. Every function you write is wired straight back into the station (your vectors fly the drone, your matrices aim the cameras, your eigenvectors stop the spin) until the whole station, and the secret buried in its data, runs on code you understand line by line.

### The promise to the student
- You finish with a working library of about **60 functions** (roughly 900 lines of Python) that you wrote, tested and explained.
- Every function carries a docstring **in your own words**. The game exports `basis.py` plus a Colab notebook that runs it.
- The world you play in is drawn, lit, aimed and stabilised by that library. When your code is right, you see it. When it is wrong, you see that too.

### Comparable games (for the team, not the player)
- **TIS-100, Shenzhen I/O, Opus Magnum:** programming puzzles with par scores and a love of optimisation.
- **Human Resource Machine:** code that a beginner can assemble from tiles before typing it.
- **Outer Wilds, Return of the Obra Dinn:** knowledge is the progression. Nothing is unlocked by items; you progress because you understand.
- **Nand2Tetris, tinyrenderer:** "build the whole stack yourself" curricula that people finish because each layer visibly works.

---

## 2. The core gameplay loop

### 2.1 Three surfaces, always on screen

| Surface | What it is | What the player's hands do |
|---|---|---|
| **The World** | Lantern Station in 3D (Three.js): the hull, the drone, the arm, the ice moon below. | Look, click, fly the camera. Watch a system come back online when a function is installed. |
| **The Bench** | A clean maths space floating in the ops room: arrows, grids, planes, point clouds, all draggable. | Drag arrow tips, turn coefficient dials, drag rows of an augmented matrix onto each other, sweep a probe arrow. This is where the player *sees it* and works *by hand*. |
| **The Console** | A Python editor, a test swarm view, a step debugger and a trace log. | Assemble, fill in or write a function. Run it. Step through it. Fix it. Install it. |

A comms strip runs along the top: crew portraits, subtitles, and an objective card that always shows the win condition with **Show me** and **Skip** next to it.

### 2.2 Minute to minute (worked example: Chapter 11, "Where do the grid lines go?")

| Time | Beat | What the player sees and does |
|---|---|---|
| 0:00 | **Incident** | Suri: "The docking camera feed is sideways and slanted. The shuttle can't line up on it." The World shows the feed: the docking marker is rotated a quarter turn and sheared. |
| 0:40 | **Predict** (optional) | "If the picture is turned a quarter turn back, where does the top-left corner end up?" The player clicks a ghost corner. Show me / Skip sit beside it. |
| 1:00 | **Bench** | The player grabs the tip of the grey arrow e₁ and drags it. The whole grid swings with it. They do the same with e₂. Every drag writes a line in the Trace: `e1 lands on (0, -1)`. Three puzzles, each with a live win check. |
| 6:00 | **See it, then name it** | Puzzle 4 shows where the point (3, 2) lands: three green column arrows tip to tail, then two red ones, ending on a yellow dot at (4, 5). Only now does the game name *linear transformation* and *matrix*. |
| 7:00 | **Numbers become names** | The three Trace logs from the puzzles line up side by side. The numbers that change between them glow. The player drags name tags (`x[0]`, `x[1]`, `column 0`, `column 1`) onto the glowing numbers. The Trace turns into the formula, which slides in next to the picture in KaTeX, coloured to match. |
| 9:00 | **By hand** | Two quick computations. Intern: drag the answer arrow. Engineer and Architect: type the numbers. |
| 11:00 | **Build** | The player writes `matvec(A, x)`. Run: 200 test cases fly onto the Bench as arrow pairs. 188 tips land yellow on target. 12 flash red, each with a hollow ghost where the answer should be. All 12 have a negative first coordinate. The player steps through one; each line of code lights up and the matching arrow animates on the Bench. They find the bug and rerun: 200 of 200. |
| 16:00 | **Install** | `matvec` is wired into the station. The holographic station model (2,400 points) now turns under the player's own rotation matrix every frame. A frame-time counter shows 0.3 ms. Dev: "That's the first thing on this station that moves the way I expect." |
| 17:00 | **Handover** (optional) | Dev has to straighten the aft camera himself while the player is busy elsewhere. The player builds his handover card. Dev follows it on three new cases. If the card leaves something out, Dev fails in a specific, visible way (Section 4). |
| 22:00 | **Optional** | Par challenge (fewest multiplications), an Overclock puzzle, or two maintenance tickets from earlier chapters. |

The order inside every chapter is the house order: **problem → see it → name it → formula → by hand → in code**. The Bench is where seeing and by-hand happen. The Console comes last.

### 2.3 Why this is a game and not a quiz
- **Answers are things you make.** Positions, arrows, matrices, pictures and code. There is no multiple choice anywhere in the core loop.
- **Your code has consequences you can see.** A wrong cross product renders half the hull inside out. A wrong order in `matmul` sends the camera spinning the wrong way. A wrong `det` sign mirrors a module.
- **Bugs are spectacle, not punishment.** The **Bug mirror** toggle runs the World on your failing version so you can watch the bug happen at full scale. Then you switch back. The World always keeps the last version that passed.
- **The world improves because of you.** The game starts as glowing points on black. It ends as a fully lit station over an ice moon. Each upgrade arrives because a function you wrote went in (Section 6.1).
- **Optimisation is optional and addictive.** Par scores for multiplications, lines and iterations. Ilse's original numbers are the target to beat. None of it blocks anything.
- **Questions come from the station, not from a test.** "Can the drone still reach the crates?" is span. "Will the shuttle latch?" is coplanarity. "Which way can we spin without wobbling?" is eigenvectors.
- **Arguments are duels.** At the end of each act an auditor makes confident claims. Some are false. You win by building the picture that breaks them.

### 2.4 Lantern Python: the in-game language
The student is new to Python and heading into a Master of AI. The console language is therefore **real Python**, restricted to a small subset.

- **The subset:** `def`, `return`, `if / elif / else`, `for ... in range(...)`, `while`, lists, tuples, list comprehensions, `len`, `abs`, `min`, `max`, `sum`, `zip`, `enumerate`, `math.sqrt`, `math.cos`, `math.sin`, float and int arithmetic, `None`, `assert`. No imports beyond `math`. No NumPy inside the game.
- **Every valid Lantern program is valid Python.** The exported `basis.py` runs unchanged in Colab. A build step checks this by running every reference solution in CPython and in the game's compiler and comparing results.
- **Compiled, not interpreted line by line.** The subset compiles to JavaScript, so the player's `matvec` can run on 2,400 points per frame. A debug build adds line events for the step debugger and an instruction budget so an infinite loop stops with a plain message instead of freezing the tab.
- **Errors in plain words, tied to the picture.** "`matvec` returned a list of 3 numbers. The drone moves in 2D, so it needs 2." "Line 4 adds `v[0]` to `w[1]`. On the Bench, that is the green arrow's x added to the red arrow's y."
- **Three editing modes** (set by difficulty, switchable per function at any time):
  - **Assemble:** drag pre-written lines into order (a Parsons puzzle). Up to two decoy lines, each one a known misconception.
  - **Fill:** the function is written except for 2–5 blanks.
  - **Write:** an empty body under the signature and a docstring prompt.
- **The NumPy card.** At the end of each act, one card shows the NumPy call that answers the same question (`np.linalg.solve`, `np.linalg.eig`, `np.linalg.svd`) and says what it does differently (C code, partial pivoting, LAPACK). The student leaves knowing both their own version and the tool they will use in the course.

### 2.5 The library graph, and what happens if you skip
- A **library graph** shows every function as a node and every call as an edge. `svd` calls `sym_eigen`, which calls `power_iteration`, which calls `matvec`, which calls `lincomb`, which calls `scale` and `add`. The graph grows every chapter and becomes the map for the final explain-back (Section 4.4).
- **Nothing is locked.** The chapter list shows all 26 chapters from the start. If the player opens Chapter 20 without having written `det`, the station runs on a **crew version** of `det` (written by Ilse years ago, recovered from backup). Crew versions show as grey nodes. Writing your own replaces them, any time.
- **Refactors are story beats.** The brute-force `reach()` from Chapter 2 tries 40,401 combinations. In Chapter 10 the game puts it next to your new `solve()` and offers the swap. The swarm reruns and the target that brute force missed now passes. The player feels the library getting better because they learned something.

### 2.6 Unlabelled practice: maintenance tickets
A ticket queue in the ops room holds short station problems in plain words with numbers. **A ticket never names the method** (house rule 8). Example: "Clamps at (0,0,0), (1,2,3), (2,1,0), (3,3,4). Will the shuttle latch?"

- The player picks a tool from their library, or works by hand on the Bench, and answers.
- If they pick a tool that answers a different question, the game shows what that tool did answer: "`angle` tells you the angle between two clamp arrows. It does not tell you whether all four clamps lie on one plane."
- Tickets mix topics from every chapter played so far, and older topics come back after a gap (spaced, interleaved practice).
- At Engineer level, tickets are written in the style of first-year exam questions (MTH1030 / ENG1005).
- Each correct routing adds a line to the **Triage rules** codex in the student's own collection of recognition cues: "When you see ___, think ___."

---

## 3. The full arc

### 3.1 Acts at a glance

8 acts, 26 chapters, plus a prologue and a finale. Recommended order only. Every chapter is open from the start.

| Act | Station crisis | Chapters (curriculum node) | Library module | What the World gains |
|---|---|---|---|---|
| Prologue · Cold Boot | Everything that does maths has stopped. | (Python primer) | `plot`, first lists | Ten glowing points on black. |
| I · Dark Deck | The algae bay is freezing; the drone has no navigation. | 1 Moves (N01–N02), 2 Span (N03), 3 Independence (N04) | vectors | A blueprint deck map of points and arrows. |
| II · Hull Light | Cameras dead; batteries dying; the hull is only a point cloud. | 4 Dot (N05), 5 Cross (N06), 6 Triple product (N07), 7 Lines and planes (N08) | geometry | A lit hull with correct normals, back-face culling and mouse picking. |
| III · Fix | The station does not know where it is; power cannot be routed. | 8 Systems (N09), 9 Row echelon form (N10), 10 Reduced row echelon form (N11) | solve | A position fix; the power grid comes back. |
| IV · First Light | The camera feeds are garbled; a shuttle cannot dock. | 11 Transformations (N12–N13), 12 Composition (N14), 13 Inverse (N15), 14 Determinant (N16) | matrices | **First Light**: the full 3D renderer, through your matrices. |
| V · The Arm | Dev is trapped; the arm has to reach him around debris. | 15 Column and null space (N17), 16 Basis and rank (N18), 17 Change of basis (N19) | spaces | Local frames: the arm, the drone camera and Dev's helmet camera. |
| VI · Spin | Lantern is tumbling; the algae culture and the air are failing. | 18 Eigen (N20), 19 Diagonalisation (N21), 20 Markov (N22) | eigen | A stable spin, real rigid-body physics, a CO₂ flow model. |
| VII · Drift | The orbit is decaying; your camera has been drifting since First Light. | 21 Projection (N23), 22 Gram–Schmidt (N24), 23 Least squares (N25) | closest | A camera that stays square; an orbit forecast; the reboost burn. |
| VIII · Signal | A buried archive and a 19-minute uplink window. | 24 Symmetric matrices (N26), 25 SVD (N27), 26 PCA (N28) | data | The archive opens; the hidden structure appears. |
| Finale · Uplink | Find every site on the moon and send it all before the window closes. | The layer (application of N12–N28) | `dense`, `relu` | The transmission; the library rises as a constellation. |

### 3.2 What runs on the player's code (honesty table)
The game tells the truth about this. An overlay (key `L`) labels every system on screen as **yours**, **crew version**, or **engine**.

| System | Runs on | From |
|---|---|---|
| Drone navigation, cargo planner | `add`, `sub`, `scale`, `lincomb`, `solve` | Act I, III |
| Hull lighting | Per-vertex brightness from your `normal` and `dot` (CPU, 18,000 triangles, recomputed when the light moves) | Act II |
| Back-face culling | Sign of your `triple` | Act II |
| Mouse picking in 3D | Your `ray_plane` against module bounding planes | Act II |
| Position fix, power routing | Your `solve` | Act III |
| Every object and camera matrix | Your `matvec`, `matmul`, `inverse`, `view_matrix`; Three.js receives them with `matrixAutoUpdate = false` | Act IV on |
| Arm motion planning | Your `null_space`, `to_coords` | Act V |
| Attitude control, CO₂ model | Your `power_iteration`, `eig2`, `steady_state` | Act VI |
| Camera re-squaring each frame | Your `reorthonormalize` | Act VII |
| Image compression, data analysis, site detection | Your `svd`, `low_rank`, `pca`, `dense` | Act VIII, Finale |
| Bloom, tone mapping, shadows, atmosphere, the planet shaders | Engine (GPU shaders). Labelled as engine. | Always |

### 3.3 Chapter template
Each chapter below lists: **World problem** · **Signature mechanic** · **Puzzles** (concrete numbers and win conditions) · **Aha** (what the puzzle is built to make the player see) · **Named** (when and how the term arrives) · **Build and install** · **Proof** (how the player shows understanding: handover key ideas, plus the act audit) · **Cue** (recognition cue) · **Real use** (why it matters in AI or CS).

Handover key ideas are written as **K1, K2, K3**. If a key idea is missing from the player's card, Dev falls back on the misconception listed after the arrow (→), and the player watches that misconception fail. See Section 4.2.

---

### Prologue · Cold Boot (about 15 minutes)

**World problem.** The player's shuttle docks at Lantern during a radiation storm. Every screen goes black and shows one line: `CORE LIBRARY NOT FOUND`. The station has power but nothing that turns sensor readings into positions. A single console still accepts Python.

**Signature mechanic.** The console and the empty void beside it. Anything the player plots appears as a glowing point.

**Puzzles.**
1. `print(drone.pos)` prints `[1, 2]`. Win: run it. (Lists are introduced as "a list of numbers: here, a position".)
2. Store the heater core's position `[4, 6]` in a variable and plot it. Win: a point appears at (4, 6).
3. Write `def double(x): return 2 * x` and call it. Win: `double(21)` returns 42.
4. Plot ten points along the corridor, starting at `[0, 0]` and stepping by `[1, 2]`, with a `for` loop. Prediction first: "Where will the tenth point be?" Win: the ten points sit on the corridor's emergency lights, ending at (9, 18).

**Aha.** A list of numbers can be a place, and a loop can draw a path. Ten points on black are the first thing Lantern has drawn since the storm.

**Named.** No maths terms. Python terms only: variable, list, index, function, loop.

**Dialogue (sample).**
- LANTERN (status voice): "Core library not found. Navigation offline. Rendering offline. Power routing offline."
- DEV: "New hire. You did computer science, right. Good. Everything on this station that does maths has stopped. It has power and no idea what to do with it."
- MAREN: "There's a console that still runs Python. There's you. Start with where the drone is."

---

### ACT I · DARK DECK (vectors)

The deck is dark. The algae bay heater has failed, and Suri's culture will die below 4 °C. The drone has no navigation. The World is a blueprint deck plan: cyan linework, glowing points, arrows.

#### Chapter 1 · How do I get from here to there? *(N01, N02 · drone navigation)*

**World problem.** The drone's navigation takes only one kind of command: "move by (dx, dy)". The lidar gives positions. Get the spare heater core from storage to the algae bay.

**Signature mechanic.** **Arrow drag on the deck grid.** Drag from the drone to a destination and a green arrow is drawn. Moves chain tip to tail. A pulse thruster fires the same arrow again and again.

**Puzzles.**
1. Drone at (1, 2), heater core at (4, 6). Send one move. Prediction: "How long is the trip?" Win: the drone stops within 0.05 m of the core. (Answer: (3, 4), length 5.)
2. Two drones, one command. Drone A at (0, 0) and drone B at (5, −1) both receive (2, 3). Prediction: where does B end? Win: place both ghost markers correctly: (2, 3) and (7, 2).
3. Route the core through the bay door at (−2, 5) to the heater socket at (0, 0), starting from (4, 6). Win: three moves that end on the socket. Bonus: send the drone back to its start and show that the four moves add to (0, 0).
4. The pulse thruster fires v = (2, 1). Reach (6, 3) and then (−4, −2). Win: 3 pulses, then −2 pulses (fire it backwards).
5. Two pulse thrusters v = (2, 1) and w = (−1, 1). Reach (1, 5). Win: a = 2, b = 3. Then fire w first and v second: the drone lands on the same spot, and the two routes outline a parallelogram.

**Aha.** An arrow is a move, not a place. The same arrow from a different start lands somewhere else. Doing one move after another adds the arrows, in either order.

**Named.** After puzzle 2: "An arrow that describes a move is called a **vector**." After puzzle 5: **scalar** (the number of pulses), **scalar multiplication**, and **linear combination**: "2v + 3w is a linear combination of v and w."

**Build and install.** `add(v, w)`, `sub(b, a)`, `scale(k, v)`, `lincomb(cs, vs)`. `lincomb` calls `scale` and `add`: the first edge in the library graph. The swarm draws 200 random arrow chains. Installed into drone navigation. The core reaches the bay and the bay warms (an amber glow spreads across the blueprint).

**Proof.** Handover: Dev routes the second drone.
- K1 "A move is the same arrow wherever it starts." → Dev aims at the destination's coordinates as if the drone were at the origin, and misses.
- K2 "The move from a to b is b − a." → Dev computes a − b and the drone flies backwards.

**Cue.** When you see "from here to there", think b − a.
**Real use.** Velocities and offsets in every game engine. In AI, word vectors: the arrow from "man" to "woman" is close to the arrow from "king" to "queen".

#### Chapter 2 · Which points can I reach with these arrows? *(N03 · damaged thrusters)*

**World problem.** A thruster cracked. The drone now has two nozzles. Supply crates are scattered across the deck and up a vertical storage shaft. Which crates can it still reach?

**Signature mechanic.** **Sweep.** Two dials set a and b in a·v + b·w. Turning them leaves a trail of yellow dust at every point reached. The dust shows the shape of everything reachable.

**Puzzles.**
1. v = (1, 2), w = (3, 1). Reach the crate at (7, 4). Win: a = 1, b = 2.
2. Prediction: "If you sweep a and b from −3 to 3, will the dust cover the deck, a line, or a curved patch?" Win: sweep until the dust touches all four deck edges.
3. Damaged pair v = (1, 2), w = (2, 4). Crates at (3, 6) and (1, 0). Win: reach the first, then flag the second as unreachable. Every grain of dust lies on one line.
4. Storage shaft (3D): v = (1, 0, 1), w = (0, 1, 1). Crate at (2, 3, 5): a = 2, b = 3. Crate at (1, 1, 0): the dust forms a tilted flat sheet and this crate floats off it. Win: reach the first, flag the second.
5. Overclock: add a third nozzle u = (1, 1, 2). Does the drone reach (1, 1, 0) now? Win: answer no, and show that u is v + w, so it lies in the same sheet.

**Aha.** Two arrows reach a whole flat plane, or only a line when they point along the same line. The reachable set is never a curved patch.

**Named.** After the sweep in puzzle 2: "Every point you can reach by stretching v and w and adding them is the **span** of v and w."

**Build and install.** `reach(v, w, target)`. First version: brute force over a and b from −10 to 10 in steps of 0.1 (40,401 tries per target). The swarm shows it failing on a target that needs a = 13.7. The game marks the function "to be replaced in Chapter 10". Engineer and Architect also solve two 2×2 cases by hand by elimination. Installed into the cargo planner, which marks reachable crates.

**Proof.** Handover:
- K1 "Two arrows along the same line reach only that line." → Dev promises a crate off the line.
- K2 "Two arrows in different directions reach every point on the deck." → Dev reports a reachable crate as unreachable.

**Cue.** When you see "can I reach this point using these arrows", think span.
**Real use.** The outputs of a neural network layer always lie in the span of its weight matrix's columns. Robot workspace planning.

#### Chapter 3 · Is one of these arrows wasted? *(N04 · the narrow vent)*

**World problem.** The drone is too wide for the vent into the freezer. Dev wants to unbolt one thruster without losing any reach.

**Signature mechanic.** **Fire all, go nowhere.** Set every thruster's dial and fire. Win when the drone returns exactly to its start with at least one dial not at zero.

**Puzzles.**
1. Deck (2D): u = (1, 0), v = (0, 1), w = (1, 1). Win: a firing that goes nowhere (u + v − w). Then unbolt w and check that every crate is still reachable.
2. Shaft (3D): u = (1, 0, 2), v = (0, 1, 1), w = (2, 3, 7). Win: fire 2u + 3v − w and go nowhere.
3. u = (1, 0, 0), v = (1, 1, 0), w = (1, 1, 1). Try to go nowhere. Win: declare "impossible", then reach three crates that need all three thrusters.
4. Prediction: "Four thrusters in the 3D shaft. Is one always wasted?" Win: show a go-nowhere firing for a random set of four.

**Aha.** An arrow is wasted when the others can reach its tip. That is the same as being able to fire them all, not all at zero, and end where you started.

**Named.** After puzzle 3: **linearly dependent** (some firing goes nowhere) and **linearly independent** (only the all-zero firing goes nowhere).

**Build and install.** `find_zero_combo(vs)`, a brute-force integer search from −5 to 5. Marked "to be replaced in Chapter 15". Installed: Dev unbolts w and the drone fits the vent.

**Proof.** Handover:
- K1 "If the others can reach an arrow's tip, that arrow is wasted." → Dev removes a thruster that was needed.
- K2 "Three arrows in a plane always have a wasted one." → Dev keeps all three.

**Act I audit (Fenn's first contact).** The operator, Meridian, requires sign-off before any code runs on station hardware. Fenn makes four claims; the player builds the picture that settles each one.
- "Three arrows always reach more points than two." False: build u, v and u + v.
- "If you can reach a point, there is only one way to reach it." False: with a wasted arrow, show two firings that land on the same crate.
- "Two arrows in different directions reach every point on a flat deck." True: Fenn picks three targets, including one far away, and the player hits all three.
- "An arrow of length zero can be part of an independent set." False: show the go-nowhere firing.

**Cue.** When you see "is any of this redundant", think "can they fire together and go nowhere".
**Real use.** Collinear features in regression; choosing the smallest set of directions that describes data.

---

### ACT II · HULL LIGHT (measuring space)

The exterior cameras are dead. The only view of the hull is a lidar point cloud. Batteries are at 31%. Each chapter adds one layer to the hull's appearance, from scattered points to a lit, clickable surface.

#### Chapter 4 · How much does one arrow point along another? *(N05 · solar wings)*

**World problem.** The solar wings must face the sun. The only feedback is a power meter.

**Signature mechanic.** **Shadow bench.** Rotate one arrow. A perpendicular drop from its tip to the other arrow's line shows its shadow. The shadow's length is a yellow bar.

**Puzzles.**
1. Sun direction s = (0.6, 0.8). The panel faces n = (1, 0) and the meter reads 60%. Prediction: which heading gives 100%? Win: turn the panel to (0.6, 0.8).
2. Make the power exactly 0. Win: n = (−0.8, 0.6) or (0.8, −0.6).
3. Shadow of v = (4, 3) on the line of u = (1, 0) is 4. Now use u = (2, 0): multiplying matching coordinates and adding gives 8, twice the shadow. Win: fix it by making the direction arrow one unit long.
4. Docking arm a = (1, 2, 2), port axis b = (2, 1, −2). Are they at right angles? Win: answer yes (2 + 2 − 4 = 0) and give the length of a (3).
5. Overclock: angle between (1, 1, 0) and (1, 0, 1). Win: 60°.

**Aha.** Multiplying matching coordinates and adding gives the length of one arrow's shadow times the length of the other. Zero means they meet at a right angle.

**Named.** After puzzle 3: **dot product**, **length** (norm), **unit vector**. After puzzle 2 is revisited: **orthogonal**. The shadow is named **projection onto a line**.

**Build and install.** `dot`, `norm` (calls `dot`), `normalize`, `angle`, `shadow(v, u)`. Installed: the wings track the sun and the battery bar rises. Then each hull point's brightness becomes `dot(facing, light)`, and the point cloud shows light and dark sides for the first time.

**Proof.** Handover:
- K1 "Zero means the arrows are at right angles." → Dev reports full power at 90°.
- K2 "Make the direction one unit long first, or the shadow comes out scaled." → Dev's power reading comes out doubled.

**Cue.** When you see "how much along", "angle", or "facing", think dot product.
**Real use.** Every neuron computes a dot product of weights and inputs. Cosine similarity between embeddings. Lambert shading in graphics.

#### Chapter 5 · Which way is straight out of this surface? *(N06 · the hull mesh)*

**World problem.** The lidar points are joined into 18,000 triangles. To light a triangle you need the arrow pointing straight out of it. Half the hull renders black.

**Signature mechanic.** **Triangle bench.** Pick two edges of a triangle. Build an arrow one coordinate at a time while two meters show its dot product with each edge. The parallelogram of the two edges is shaded and its area shown.

**Puzzles.**
1. Triangle A = (0, 0, 0), B = (2, 0, 0), C = (0, 3, 0). Edges (2, 0, 0) and (0, 3, 0). Win: an arrow at right angles to both whose length equals the parallelogram's area: (0, 0, 6). The triangle's area is 3.
2. Prediction: "What changes if you take the edge AC first?" Win: build (0, 0, −6).
3. **The inside-out hull.** 9,000 triangles have their straight-out arrow pointing into the station. Win: fix the edge order so every arrow points away from the centre (check: `dot` with the centre-to-triangle arrow is positive). The whole hull lights up.
4. Hull patch with edges (1, 2, 0) and (0, 1, 3). The arrow is (6, −3, 1); the parallelogram's area is √46 ≈ 6.78 m², so the triangle is 3.39 m². Win: order patch sheet within 0.01 m².
5. Overclock: edges (1, 2, 3) and (2, 4, 6) give (0, 0, 0). Win: flag the triangle as flat (zero area) and filter all flat triangles out of the mesh.

**Aha.** One arrow carries two facts: its direction is straight out of the surface, and its length is the area.

**Named.** After puzzle 2: **cross product** and the **right-hand rule**. The formula is derived on the Bench from "dot with both edges is zero", then the length is fixed to the area.

**Build and install.** `cross`, `normal(tri)`, `area(tri)`. The swarm checks `dot(cross(a, b), a) == 0` and the area for 200 random triangles. Installed: the hull is lit correctly by the player's normals and `dot`.

**Proof.** Handover:
- K1 "The cross product is at right angles to both edges." → Dev uses one edge as the normal.
- K2 "Swapping the order flips it." → half Dev's patches light from inside.
- K3 "Its length is the parallelogram's area; halve it for the triangle." → Dev orders twice the sheet.

**Cue.** When you see "perpendicular to both" or "area in 3D", think cross product.
**Real use.** Surface normals for lighting and collision in every 3D engine; torque.

#### Chapter 6 · How much space do three arrows enclose? *(N07 · cargo pods and docking clamps)*

**World problem.** Fuel is stored in slanted cargo pods. And the rescue shuttle can latch only if the four docking clamps lie on one plane.

**Signature mechanic.** **Volume bench.** Three edge arrows draw a slanted box. Drag the third arrow and watch base area × height update.

**Puzzles.**
1. Pod edges a = (2, 0, 0), b = (0, 3, 0), c = (1, 1, 4). Win: volume 24 (base 6 × height 4). Prediction: "If the top slides sideways, does the volume change?" Then c = (3, −2, 4): still 24.
2. Clamps at P = (0, 0, 0), Q = (1, 2, 3), R = (2, 1, 0), S = (3, 3, 3). Win: certify that they lie on one plane. The three arrows from P enclose zero volume.
3. Clamp S is bent to (3, 3, 4). Win: slide it along z until the volume is 0 (z = 3, within 0.001).
4. Swap two edges of the pod. Win: explain the −24. Same box, arrows taken the other way round.
5. Overclock: a sensor housing shaped like a tetrahedron on the same three edges. Win: 24 / 6 = 4.

**Aha.** Zero volume means the three arrows have been squashed into one plane. This is the first **flatness picture**, and it returns in Chapters 8, 13, 14, 15, 16, 18 and 25.

**Named.** After puzzle 2: **scalar triple product** and **coplanar**.

**Build and install.** `triple(a, b, c)` (calls `dot` and `cross`), `coplanar(p, q, r, s)`. Installed as **back-face culling**: the sign tells the renderer which triangles face away from the camera, and it skips them. A frame-time counter drops from 14 ms to 8 ms.

**Proof.** Handover:
- K1 "Volume is base area times height." → Dev multiplies the three lengths and gets the slanted pod wrong.
- K2 "Zero volume means the arrows lie in one plane." → Dev rejects good clamps.
- K3 "The sign only says which way round the arrows go." → Dev reports a negative fuel volume.

**Cue.** When you see "do these four points lie on one plane", think scalar triple product.
**Real use.** Back-face culling; orientation tests in computational geometry (convex hulls, mesh repair).

#### Chapter 7 · How do I describe a flat surface or a straight path with one equation? *(N08 · picking and debris)*

**World problem.** The player needs to click on the hull to inspect damage. A click is a ray from the camera; where does it hit? And a debris cloud is drifting near the wing. How far away is it?

**Signature mechanic.** **Ray bench.** A laser leaves the camera. Slide t along it and watch the point move. The plane glows where they meet.

**Puzzles.**
1. Hull panel through (1, 0, 0) with straight-out arrow n = (2, 1, 2). Win: write its equation, 2x + y + 2z = 2, by placing three points on it and seeing that each arrow from (1, 0, 0) has zero dot product with n.
2. Laser p(t) = (1, 1, 0) + t(1, 0, 1). Where does it hit 2x + y + 2z = 11? Win: stop the slider at t = 2, the point (3, 1, 2).
3. Debris at (3, 4, 5); panel 2x + y + 2z = 2. Distance |6 + 4 + 10 − 2| / 3 = 6 m. The safety margin is 5 m. Win: decide "safe" and draw the perpendicular drop.
4. Panels 2x + y + 2z = 2 and x − y = 0 meet in a seam. Win: lay the weld line along n₁ × n₂ = (2, 2, −3).
5. Overclock: a ray whose direction is at right angles to n. Win: show that it never hits (or lies in the plane) and make `ray_plane` return `None`.

**Aha.** A plane is every point whose arrow from one known point is at right angles to n. The plane's equation is a dot product.

**Named.** After puzzle 1: **normal vector** and **equation of a plane**. After puzzle 2: **parametric equation of a line**.

**Build and install.** `plane_from_points(p, q, r)` (calls `cross`, `dot`), `ray_plane(origin, direction, plane)`, `dist_to_plane`. Installed: clicking anywhere on the hull now places a yellow hit marker, computed by the player's `ray_plane`. The player clicks module C and sees the breach. Dev is sealed in the Spindle behind it.

**Proof.** Handover:
- K1 "Put the line's x, y, z into the plane equation and solve for t." → Dev tests random t values.
- K2 "If the direction is at right angles to n, there is no single hit." → Dev divides by zero.

**Act II audit.**
- "If two arrows have dot product zero, one of them has a zero coordinate." False: (1, 2, 2) and (2, 1, −2).
- "a × b = b × a." False: show the flip.
- "If a × b = 0, then a or b is the zero vector." False: (1, 2, 3) and (2, 4, 6).
- "Any three points fix exactly one plane." False: three points on one line lie on infinitely many planes, and `plane_from_points` gets a zero normal from the cross product.

**Cue.** When you see "where does this path hit that surface", substitute the line into the plane equation.
**Real use.** Ray casting for mouse picking, physics and ray tracing. In machine learning, the distance from a point to a separating plane (the margin in support vector machines).

---

### ACT III · FIX (solving)

Lantern does not know where it is. The rescue shuttle needs exact coordinates. Fenn's first message arrives with a 40-second light delay: "Rescue requires a position fix. Do not modify licensed software." The crew cannot use licensed software that no longer exists.

#### Chapter 8 · Where do these planes all meet? *(N09 · the position fix)*

**World problem.** Three relay satellites each report a range. Subtracting one range equation from another leaves flat equations: planes. Lantern is where all of them meet.

**Signature mechanic.** **Plane bench.** Each equation is a glowing translucent sheet with drag handles. Where they meet glows yellow. A **column view** toggle redraws the same numbers as a reach puzzle from Chapter 2: which mix of the columns lands on the right-hand side?

**Puzzles.**
1. Warm-up in 2D: x + y = 5, x − y = 1. Win: find (3, 2) in the row view, then in the column view: 3·(1, 1) + 2·(1, −1) = (5, 1).
2. x + y + z = 6, x − y + z = 2, 2x + y − z = 1. Win: place Lantern's marker at (1, 2, 3).
3. Faulty relay: x + y + z = 6, x + y + z = 4, x − y = 0. Two sheets are parallel and never meet. Win: identify the faulty relay.
4. Two relays agree too much: x + y + z = 6, 2x + 2y + 2z = 12, x − y = 0. The answers form a line. Win: show two different positions that satisfy all three, and request a fourth relay.
5. Prediction: "Can three planes meet in exactly two points?" (Answered properly in the Act III audit.)

**Aha.** The set of answers is a point, a line, a plane, or nothing. Never exactly two points, because the midpoint of two answers is also an answer. The row view and the column view ask the same question.

**Named.** After puzzle 2: **system of linear equations**, **solution**, **solution set**. After puzzle 3: **consistent** and **inconsistent**.

**Build and install.** `check(A, b, x)` returns how far off each equation is. Architect level writes it twice, once as a dot product per row and once as a combination of columns, and the swarm shows they agree. Installed: the crew can now verify a guessed position, but cannot yet find one.

**Proof.** Handover:
- K1 "Each equation is a plane, and the answer is where all of them meet." → Dev uses two relays and ignores the third.
- K2 "Same numbers, column view: which mix of the columns makes the right-hand side." → Dev cannot do puzzle 1's second half.

**Cue.** When you see several conditions that must all hold at once, think system of equations.
**Real use.** GPS trilateration; the equations behind linear regression; circuit analysis.

#### Chapter 9 · How do I untangle the equations without changing the answer? *(N10 · the power grid)*

**World problem.** Three power junctions with unknown currents. Maren needs the currents to route power to the medical bay.

**Signature mechanic.** **Row deck.** The augmented matrix appears as three glowing bars. Drag one row onto another to add a multiple of it (a dial sets the multiple). Drag to swap. Twist to scale. Above the deck, the 3D view shows the planes swinging while the yellow meeting point stays exactly where it is.

**Puzzles.**
1. [1 2 | 5 ; 3 4 | 6]. Win in at most 2 operations: R2 − 3R1 gives [0 −2 | −9], so y = 4.5 and x = −4.
2. x + 2y + z = 8, 2x + y + z = 7, x + y + 2z = 9. Par: a staircase in 3 operations. Win: (1, 2, 3).
3. Zero in the corner: [0 1 | 2 ; 1 1 | 3]. Win: swap first, then solve: (1, 2).
4. [1 2 | 3 ; 2 4 | k]. R2 − 2R1 gives [0 0 | k − 6]. Win: find the one value of k that gives infinitely many solutions (k = 6), and show that every other k leaves a row saying 0 = something non-zero.
5. Architect: [ε 1 | 1 ; 1 1 | 2] with ε = 10⁻²⁰. Without a swap, floating point returns x = 0, but the true answer is very close to (1, 1). Win: make `solve` survive by swapping the largest entry into the pivot position (partial pivoting).

**Aha.** A row operation tilts the planes but never moves the point where they meet. The goal is a staircase you can read from the bottom row up.

**Named.** As the row deck first appears: **augmented matrix**. After puzzle 1: **row operation**, **pivot**. After puzzle 2: **row echelon form** and **back substitution**.

**Build and install.** `swap_rows`, `scale_row`, `add_multiple`, `row_echelon(M)`, `back_sub`. The swarm runs 300 random systems; each one's planes swing into a staircase. Installed: currents found; the medical bay lights come up.

**Proof.** Handover:
- K1 "A row operation is done to the whole row, including the right-hand side." → Dev changes the left side only and the planes' meeting point jumps.
- K2 "Clear everything below each pivot, one column at a time." → Dev clears in a random order and undoes his own work.
- K3 "Read the answers from the bottom row up." → Dev starts at the top and gets stuck.

**Cue.** When you see a system bigger than 2 × 2, think augmented matrix and row echelon form.
**Real use.** Gaussian elimination is inside every linear solver. `np.linalg.solve` runs the same steps with partial pivoting, in compiled code.

#### Chapter 10 · What does the answer look like when there are infinitely many? *(N11 · coolant and the fourth relay)*

**World problem.** The radiator coolant must be re-blended from three tanks, and there are many ways to do it. Then the fourth relay comes into range and Lantern finally gets a single position.

**Signature mechanic.** **Free slider.** The row deck continues upward, clearing above each pivot. When a column has no pivot, a slider labelled t appears. Dragging it moves a yellow point along the line of answers while every equation stays satisfied.

**Puzzles.**
1. x + 2y − z = 3, 2x + 4y + z = 9. Reduced row echelon form: [1 2 0 | 4 ; 0 0 1 | 1]. Answers: (4, 0, 1) + t(−2, 1, 0). Win: drag t and find the answer with x = 0 (t = 2, the point (0, 2, 1)).
2. Coolant: tanks A, B, C hold 20%, 50% and 80% glycol. Make 10 L at 50%: a + b + c = 10, 0.2a + 0.5b + 0.8c = 5. Answers: (c, 10 − 2c, c). Win: tank B is leaking, so use none of it: (5, 0, 5).
3. A row reads [0 0 0 | 5]. Win: declare "no solution" and point to the row that says 0 = 5.
4. **The refactor.** The game puts Chapter 2's brute-force `reach()` next to your new `solve()`. Win: swap it in. The swarm reruns: 40,401 tries per target become about a dozen operations, and the target that needed a = 13.7 now passes.
5. Overclock: solve the same left side with right-hand side zero. Win: show that its answers are the free directions from puzzle 1, and that every answer to puzzle 1 is one answer plus one of these.

**Aha.** A column without a pivot is a direction you can slide along and stay an answer. One answer plus those slides gives every answer.

**Named.** After puzzle 1: **reduced row echelon form**, **basic variable**, **free variable**, **parametric form**. After puzzle 5: **homogeneous system**.

**Build and install.** `rref(M)` and `solve(A, b)`, which returns `{"kind": "none" | "one" | "many", "point": ..., "directions": [...]}`. The library graph now shows `solve → rref → row operations`. Installed: with four relays, `solve` returns one point. Lantern transmits its position.

**Proof.** Handover:
- K1 "A row like 0 = 5 means no solution." → Dev reports nonsense coordinates.
- K2 "Each free column gives a direction you can slide along." → Dev reports a single blend as the only one.

**Act III audit.**
- "More unknowns than equations always means infinitely many solutions." False: x + y + z = 1 and x + y + z = 2.
- "A system can have exactly two solutions." False: build two answers, then show their midpoint is a third.
- "Multiplying a row by a negative number changes the answer." False: show the planes and the unmoved point.
- "If the right-hand column has a pivot, there is no solution." True: show the 0 = 5 row it creates.

**Cue.** When you see "all solutions" or "describe the set", think reduced row echelon form and free variables.
**Real use.** Redundant robot arms, feasibility in linear programming, constraint solvers.

**Act III ending.** Fenn: "Position received. Rescue is under review." Dev, still sealed in the Spindle, finds the core's deletion log. The library was not damaged by the storm. It was deleted by a signed command, at the storm's peak.

---

### ACT IV · FIRST LIGHT (moving space)

The cameras work but their feeds are garbled, because the projection pipeline was part of the deleted core. The shuttle will need a camera view and a docking guide. This act ends with the game's biggest moment: the player's own renderer draws the world.

#### Chapter 11 · Where do the grid lines go? *(N12, N13 · the docking camera)*

**World problem.** The docking camera feed is rotated and slanted. Straighten it by saying where the grid moves.

**Signature mechanic.** **Grid bench** (the game's signature tool). Grab the tips of the grey arrows e₁ and e₂ and drag them. Where e₁ lands becomes column 1 (green) and where e₂ lands becomes column 2 (red). The whole grid follows, and any point the player drops shows its landing spot in yellow.

**Puzzles.**
1. The feed is turned a quarter turn anticlockwise. Win: drag e₁ to (0, −1) and e₂ to (1, 0), and the feed stands upright. Matrix [[0, 1], [−1, 0]].
2. Make the square docking marker become the parallelogram with corners (0, 0), (2, 1), (3, 3), (1, 2). Win: columns (2, 1) and (1, 2).
3. Suri: "Can you shift the whole picture 3 to the right?" Win: answer no. Moving e₁ and e₂ never moves the origin, and grid lines stay straight, parallel and evenly spaced.
4. Columns (2, 1) and (−1, 1). Prediction: where does (3, 2) land? Win: three green columns tip to tail plus two red columns: (4, 5).
5. Same matrix. Which point lands on (1, 4)? Win: (5/3, 7/3). The Bench says: this is the question `solve` answers.

**Aha.** Once you know where e₁ and e₂ land, every other point's landing spot is fixed: x times column 1 plus y times column 2.

**Named.** After puzzle 3: **linear transformation**. After puzzle 2 is replayed: **matrix**, written as its columns. After puzzle 4: **matrix–vector product**. The row view (dot each row with x) is shown next to the column view, giving the same numbers.

**Build and install.** `matvec(A, x)`. The column version calls `lincomb`. Architect also writes the row version, which calls `dot`; the swarm checks that both agree. Installed: the docking overlay and the holographic station model (2,400 points) now move under the player's matrices every frame.

**Proof.** Handover:
- K1 "The columns are where e₁ and e₂ land." → Dev reads the matrix by rows and his feed comes out mirrored across the diagonal.
- K2 "Every other point is that mix of the columns." → Dev only moves the four corners and the feed tears.

**Cue.** When you see a matrix times a vector, think: mix the columns using the vector's numbers.
**Real use.** Every vertex in every 3D game. A layer of a neural network computes W x.

#### Chapter 12 · What single move does two moves in a row? *(N14 · the camera rig)*

**World problem.** The docking camera rig pans and then tilts. The feed must be corrected for both, and the full chain runs model → world → camera.

**Signature mechanic.** **Chain bench.** Stack moves as cards. The grid animates through each move in turn. "Fuse" produces the single matrix for the whole stack.

**Puzzles.**
1. R turns a quarter turn anticlockwise: [[0, −1], [1, 0]]. S stretches x by 2: [[2, 0], [0, 1]]. Turn first, then stretch: SR = [[0, −2], [1, 0]]. The other order: RS = [[0, −1], [2, 0]], which sends e₁ to (0, 2) instead of (0, 1). Win: build both and say which one matches the feed.
2. A is the shear [[1, 1], [0, 1]]; B swaps x and y: [[0, 1], [1, 0]]. Win: build AB by tracking each column of B through A: AB = [[1, 1], [1, 0]].
3. 3D rig: a model stretched to twice its length along x, then turned 30° about the vertical axis. Win: fuse the two cards in the right order and match the reference view (the wrong order stretches it along the wrong direction).
4. Moving a matrix across a dot product. A = [[1, 2], [0, 1]], x = (1, 1), y = (2, 3). Ax · y = (3, 1) · (2, 3) = 9. Aᵀy = (2, 7) and x · (2, 7) = 9. Win: build Aᵀ by flipping rows into columns and show both sides equal 9.
5. Overclock: show (AB)ᵀ = BᵀAᵀ with the matrices from puzzle 2.

**Aha.** The right-hand matrix moves the grid first. Turning and then stretching is a different move from stretching and then turning.

**Named.** After puzzle 1: **matrix product** and **composition**. After puzzle 4: **transpose**.

**Build and install.** `matmul(A, B)`, built by calling the player's own `matvec` on each column of B. `transpose`. Par: a 3 × 3 product in 27 multiplications. Installed: the camera rig chain now runs on the player's `matmul`.

**Proof.** Handover:
- K1 "The right-hand matrix acts first." → Dev fuses in reading order and the feed turns the wrong way.
- K2 "Column j of AB is A applied to column j of B." → Dev multiplies matching entries and the grid tears.

**Cue.** When you see "do this, then that", think matrix product, with the first move on the right.
**Real use.** Transform hierarchies in game engines. In a neural network, two layers with nothing between them fuse into a single matrix, which is why networks need a bend between layers (the Finale).

#### Chapter 13 · How do I undo a move? *(N15 · the shuttle's point of view)*

**World problem.** The rescue shuttle will see Lantern through its own camera. To steer toward the port it must undo the camera's placement.

**Signature mechanic.** **Undo bench.** The grid arrives already moved. Drag landing spots until it is square again.

**Puzzles.**
1. A = [[2, 1], [1, 1]]. Win: drag until the grid is square again; the undo is B = [[1, −1], [−1, 2]] and BA = I.
2. Row reduce [A | I] until the left side is I. Win: the right side is the undo. 3 × 3: A = [[1, 0, 2], [0, 1, 0], [0, 0, 1]] gives [[1, 0, −2], [0, 1, 0], [0, 0, 1]].
3. Undo a chain: turn, then shear. Win: undo the shear first, then the turn.
4. A = [[1, 2], [2, 4]]. The grid collapses onto a line. Win: find two points that land on the same spot, (0, 0) and (2, −1), and declare "no undo".
5. Architect: a camera turn's undo by flipping rows into columns (a preview of Chapter 22).

**Aha.** An undo exists only if no two points land on the same spot. Once the grid is flattened, the information is gone.

**Named.** After puzzle 1: **identity matrix** and **inverse**. After puzzle 4: **invertible** and **singular**.

**Build and install.** `identity(n)`, `inverse(A)` (the player's `rref` on [A | I]; returns `None` when a pivot is missing), `view_matrix(camera)`. Installed: the free-look camera uses the player's view matrix.

**Proof.** Handover:
- K1 "To undo a chain, undo the last move first." → Dev undoes in the original order and the feed stays slanted.
- K2 "If the grid is flattened, there is no undo." → Dev's inverse returns huge numbers and the camera jumps.

**Cue.** When you see "go back", "undo", or "from the camera's point of view", think inverse.
**Real use.** View matrices in every renderer. In practice solvers factor a matrix instead of inverting it, which the Architect NumPy card explains.

#### Chapter 14 · What happens to the area? *(N16 · damage estimates, then First Light)*

**World problem.** Damage areas measured through the camera come out wrong, because the camera's transform scales area. And the renderer must know when a model's transform mirrors it, or that model renders inside out.

**Signature mechanic.** **Area bench.** A unit square (later a cube) rides along with the grid. Its signed area is a live number. Flatten it, flip it.

**Puzzles.**
1. [[3, 0], [0, 2]]. Win: the unit square becomes a 3 × 2 rectangle, area 6.
2. Shear [[1, 1], [0, 1]]. Prediction: does the area change? Win: 1. The square slides; it does not grow.
3. General [[a, b], [c, d]]. Win: take away the parts of the parallelogram's bounding box that lie outside it (two rectangles and four triangles) until ad − bc remains.
4. [[0, 1], [1, 0]] gives −1. The grid is mirrored. Win: apply it to the cargo pod model and watch it render inside out (Chapter 5's bug, back again), then fix the renderer to flip triangle order when the sign is negative.
5. [[2, k], [4, 6]]. Win: find the k that flattens the grid: 12 − 4k = 0, so k = 3.

**Architect extra.** Compute a 10 × 10 determinant both ways. Cofactor expansion makes about 6.2 million multiplications. Elimination makes about 340. Win: run both and compare times.

**Aha.** One number says how much every area is scaled. Zero means space is flattened. Negative means mirrored. In 3D it is the scalar triple product of the columns from Chapter 6.

**Named.** After puzzle 2: **determinant**. The formula ad − bc arrives after puzzle 3, built from the picture.

**Build and install.** `det(A)` by elimination: multiply the pivots and flip the sign for each swap (calls `row_echelon`). `det2` and `det3` by formula, for checking by hand. A last small pipeline puzzle introduces the extra coordinate that lets a shift be written as a matrix (in 2D, a shift becomes a shear of 3D space), and states plainly that perspective's final step divides by depth, which no matrix does.

**FIRST LIGHT.** See Section 8. The screen goes black. Maren says "Run it." The player's pipeline draws the station.

**Act IV audit.**
- "AB = BA." False: Chapter 12's pair.
- "det(A + B) = det A + det B." False: A = B = I in 2D gives 4, not 2.
- "A matrix with no zero entries always has an undo." False: [[1, 2], [2, 4]].
- "If det A = 0, then Ax = b has no solution." False: pick b on the flattened line and show infinitely many.

**Cue.** When you see "area", "volume", "flattened" or "can it be undone", think determinant.
**Real use.** Mirrored transforms in graphics; checking for singular systems; the volume factor in normalising flows (generative models).

**Act IV ending.** With First Light the crew sees the station whole for the first time. The docking ring is gone, sheared off, and Lantern is slowly tumbling.

---

### ACT V · THE ARM (spaces inside spaces)

Dev is trapped in the Spindle behind a buckled bulkhead. The external manipulator arm has to reach through a gap without touching loose debris. The tumble can wait a few hours. Dev cannot.

#### Chapter 15 · What can this move reach, and what does it flatten to the origin? *(N17 · the arm's motors)*

**World problem.** The arm has three joint motors. For small motions, each motor pushes the gripper along one arrow on the bulkhead panel: A = [[1, 0, 1], [0, 1, 1]] (two outputs, three motors).

**Signature mechanic.** **Motor dials and still mode.** Three dials drive the motors. In still mode the Bench highlights every motor command that leaves the gripper exactly where it is, while the elbow swings.

**Puzzles.**
1. Win: find a motor command that swings the elbow clear of a pipe while the gripper keeps hold of the handle: (1, 1, −1).
2. Win: show that the gripper can move in every direction on the panel (the columns reach the whole plane).
3. Damaged arm: A = [[1, 2, 3], [2, 4, 6]]. The gripper only slides along the line through (1, 2). Win: name a target it cannot reach, such as (1, 0), and find two different still-commands, (−2, 1, 0) and (−3, 0, 1).
4. Suri suggests limiting the arm to "commands with all three numbers positive". Win: show this set is not a flat set through the origin (scale a command by −1 and it leaves the set).
5. Bug hunt (Engineer and up): the player's first `col_space` returns columns of the reduced row echelon form. For A = [[1, 2], [2, 4]] it reports the direction (1, 0), but the gripper actually slides along (1, 2). Win: use A's original columns at the pivot positions.

**Aha.** A matrix comes with two flat sets through the origin: everything it can reach, and everything it sends to the origin. Adding anything from the second set to a motor command changes nothing at the gripper.

**Named.** After puzzle 4: **subspace**. After puzzle 2: **column space**. After puzzle 1: **null space**.

**Build and install.** `null_space(A)` (from `rref`'s free directions, Chapter 10), `col_space(A)` (original pivot columns). Refactor: Chapter 3's brute-force `find_zero_combo` is replaced by `null_space`. Installed: the arm planner adds still-motions to dodge debris while the gripper stays on target.

**Proof.** Handover:
- K1 "A target is reachable exactly when it is in the column space." → Dev tries to reach (1, 0) with the damaged arm.
- K2 "A still-motion can be added to any command without moving the gripper." → Dev stops the arm when debris comes near the elbow.
- K3 "Take the columns from the original matrix, not the reduced one." → Dev's planner aims along the wrong line.

**Cue.** When you see "which outputs are possible", think column space. When you see "which inputs do nothing", think null space.
**Real use.** Null-space motion control on redundant robot arms. In machine learning, input directions a model ignores entirely.

#### Chapter 16 · How many directions survive? *(N18 · sensor bandwidth, and the title)*

**World problem.** Lantern's sensor head has five channels but they measure only three independent things. The link home is thin. Send only what is needed.

**Signature mechanic.** **Survivor count.** Input arrows pass through the transformation. Those that point in a new direction stay lit; those that flatten into directions already covered go dark. A tally shows survivors and flattened.

**Puzzles.**
1. A = [[1, 0, 0, 2, 1], [0, 1, 0, 1, 1], [0, 0, 1, 0, 3]]. Prediction first. Win: 3 directions survive, 2 flatten, and 3 + 2 = 5.
2. Five more matrices, mixed sizes. Win: predict both counts before computing, and see that they always add up to the number of columns.
3. Give two arrows that reach every point of the plane x + y + z = 0 with nothing wasted, such as (1, −1, 0) and (1, 0, −1). Win: then give a different pair that also works, such as (0, 1, −1) and (2, −1, −1). The arrows are not unique. How many you need is.
4. Describe every point of the station's 3D space with arrows of your choice. Try four, then two, then three. Win: show that four always waste one, two always miss points, and three independent arrows reach everything with nothing wasted.
5. **The flatness constellation** (first full assembly). For [[1, 2], [2, 4]], link the stars: determinant 0 · columns dependent · (2, −1) in the null space · one direction survives · no undo · not every target reachable. Win: each link is shown with a picture on the Bench.

**Aha.** The number of directions that survive, plus the number that flatten, is always the number of input directions. A set of arrows that reaches everything with nothing wasted always has the same size.

**Named.** After puzzle 4: **basis** and **dimension**. After puzzle 1: **rank** and **nullity**. After puzzle 2: **rank–nullity theorem**. Then the title drop: a recorded note from Ilse, the library's original author, plays (Section 7).

**Build and install.** `rank(A)` (counts pivots, calls `row_echelon`), `basis_for_span(vs)`. Installed: the sensor head sends three numbers instead of five. The uplink budget gains 40%.

**Proof.** Handover:
- K1 "A basis reaches everything with nothing wasted." → Dev keeps all five channels.
- K2 "Rank plus nullity equals the number of columns." → Dev cannot say how many channels to drop without testing each.

**Cue.** When you see "how many independent", think rank. When you see "how many free", think nullity.
**Real use.** Low-rank adapters (LoRA) fine-tune large models by learning updates with small rank. Redundant features. Recommendation systems fill in missing ratings by assuming low rank.

#### Chapter 17 · Same point, different grid: what are its numbers now? *(N19 · Dev's helmet camera)*

**World problem.** Dev guides the arm from his helmet camera: "Two forward, one left." His frame is tilted 45° from the station's. The arm's wrist has its own frame again.

**Signature mechanic.** **Dual grid.** The station grid (grey) and Dev's grid (cyan) overlap. Any point shows its numbers in both.

**Puzzles.**
1. Dev's arrows are b₁ = (1, 1), b₂ = (−1, 1). Win: the point Dev calls [2, 1] is (1, 3) on the station grid.
2. Station point (4, 2). Win: Dev calls it [3, −1]. (This is `solve`.)
3. Dev: "Stretch along my forward by 2." In his grid that is D = [[2, 0], [0, 1]]. Win: build the same move on the station grid as three chain cards (convert to Dev's numbers, stretch, convert back) with the first move on the right: P D P⁻¹ = [[1.5, 0.5], [0.5, 1.5]].
4. Win: show that [[2, 0], [0, 1]] and [[1.5, 0.5], [0.5, 1.5]] do the same move in different grids. Each stretches one direction by 2 and leaves another direction fixed.
5. Overclock: in 3D, place the wrist's frame and move a bolt from wrist numbers to station numbers.

**Aha.** A point's coordinates are the weights you need on the grid's arrows to reach it. Change the grid and the numbers change; the point does not move.

**Named.** After puzzle 1: **coordinates relative to a basis**. After puzzle 3: **change-of-basis matrix**. After puzzle 4: **similar matrices**.

**Build and install.** `to_coords(B, v)` (calls `solve`), `from_coords(B, c)` (calls `matvec`), `in_basis(A, P)`. Installed: everything mounted on something else (the drone's camera, the arm's wrist, Dev's helmet camera) is placed by the player's change of basis. The arm reaches through the gap and pulls Dev out.

**Proof.** Handover:
- K1 "Coordinates are the weights on the grid's arrows." → Dev reads his numbers as station numbers and the arm swings wide.
- K2 "Convert in, move, convert out, with the first step on the right." → Dev builds P⁻¹DP and the stretch goes along the wrong direction.

**Act V audit.**
- "A matrix and its reduced row echelon form have the same column space." False: [[1, 2], [2, 4]].
- "Any set of arrows that reaches every point is a basis." False: (1, 0), (0, 1), (1, 1).
- "Similar matrices have the same entries." False: puzzle 4's pair.
- "If rank A equals the number of columns, Ax = b never has more than one solution." True: show the null space is only the origin.

**Cue.** When you see "in its own frame" or "from another point of view", think change of basis.
**Real use.** Local space and world space in every game engine. The hidden layers of a network re-describe data in new coordinates.

**Act V ending.** Dev is out. Among the things he carried from the Spindle is the core's licence module. Its log shows the deletion command came from Meridian, and it was signed by Tobias Fenn.

---

### ACT VI · SPIN (directions that keep their line)

Losing the docking ring left Lantern tumbling. Stars wheel past every window. The algae culture is unstable and CO₂ is building up in the aft modules.

#### Chapter 18 · Which arrows stay on their own line? *(N20 · the tumble)*

**World problem.** To stop the tumble, Lantern must be spun about an axis it can hold without wobbling.

**Signature mechanic.** **Probe sweep.** Drag a green probe arrow around a circle; its landing arrow is drawn in yellow. When the two lie on one line, the Bench marks the heading. A **λ dial** shows the grid of A − λI, which flattens exactly at the right values of λ.

**Puzzles.**
1. A = [[2, 1], [1, 2]]. Win: lock both headings that stay on their own line and give their stretch factors: (1, 1) stretched by 3 and (1, −1) stretched by 1.
2. A quarter turn [[0, −1], [1, 0]]. Win: declare "no heading stays on its line".
3. Shear [[1, 1], [0, 1]]. Win: find the only line, the x-axis, with stretch factor 1.
4. λ dial for A = [[2, 1], [1, 2]]. The grid of A − λI flattens at λ = 1 and λ = 3; the graph of (2 − λ)² − 1 crosses zero at the same values. Win: stop the dial at both.
5. **The Flip.** Lantern's inertia matrix in the station frame is I = [[4, −2, 0], [−2, 4, 0], [0, 0, 9]] (units of 10⁵ kg·m²). Win: find its three axes, (1, 1, 0) with 2, (1, −1, 0) with 6, and (0, 0, 1) with 9, then choose a spin axis and hold it for ten simulated minutes. Spinning about the middle axis, (1, −1, 0), flips the station end over end every few minutes. This is real rigid-body physics (Section 8).

**Aha.** Most arrows change direction when the grid moves. A few only stretch, shrink or flip. To find them, find the λ that makes A − λI flatten a direction onto the origin, which is when its determinant is zero.

**Named.** After puzzle 1: **eigenvector** and **eigenvalue**. After puzzle 4: **characteristic equation** and **eigenspace**.

**Build and install.** `eig2(A)` (from trace and determinant with the quadratic formula). `power_iteration(A, x0, steps)`: apply `matvec`, `normalize`, repeat. On the Bench the yellow arrow swings toward the dominant direction step by step. Installed: the attitude controller uses the player's axes. The stars stop wheeling.

**Proof.** Handover:
- K1 "An eigenvector stays on its own line." → Dev picks the heading where the probe changed least.
- K2 "The eigenvalues are where det(A − λI) = 0, because that is when A − λI flattens a direction." → Dev tries values of λ at random.
- K3 "Do not row reduce first; it changes the eigenvalues." → Dev row reduces and gets the wrong spin rates.

**Cue.** When you see "directions that do not turn", "stable axis" or "the same step repeated", think eigenvectors.
**Real use.** Principal axes of rotating bodies; PageRank; exploding and vanishing gradients in recurrent networks; spectral clustering.

#### Chapter 19 · What happens if I repeat this move a thousand times? *(N21 · the algae culture)*

**World problem.** Suri's culture has two strains that feed each other. Each cycle, the counts update by the same matrix. Forecast far ahead to choose when to vent.

**Signature mechanic.** **Repeat bench.** Apply the matrix again and again with a step counter. Toggle the eigenvector grid: drawn on that grid, every step only stretches along the grid lines.

**Puzzles.**
1. A = [[3, 1], [0, 2]], x = (1, 1). Win: write x on the eigenvector grid, x = 2·(1, 0) − 1·(1, −1), then answer A¹⁰x = 2·3¹⁰·(1, 0) − 2¹⁰·(1, −1) = (117074, 1024) with one power per direction instead of ten multiplications.
2. Culture: A = [[1, 1], [0.25, 1]], eigenvalues 1.5 along (2, 1) and 0.5 along (2, −1). Start at (4, 0). Win: forecast cycle 10 as about (115.3, 57.7), and predict that the ratio settles at 2 : 1 from almost any start.
3. Fibonacci: [[1, 1], [1, 0]]⁵⁰ contains F₅₀ = 12,586,269,025. Par: compute it with repeated squaring in at most 10 matrix products.
4. Try to diagonalise the shear [[1, 1], [0, 1]]. Win: show that only one eigenvector line exists, so P has no inverse, and declare "not diagonalisable".
5. Overclock: start the culture exactly on (2, −1). Win: predict that it stays on that line and halves each cycle.

**Aha.** On the eigenvector grid the move only stretches. Repeating it repeats the stretch. The largest eigenvalue decides the long run.

**Named.** After puzzle 1: **diagonalisation**, **diagonalisable**, and A = PDP⁻¹, introduced as "convert in, stretch, convert out" from Chapter 17.

**Build and install.** `diagonalize(A)` (2 × 2, from `eig2`), `mat_pow(A, k)` (repeated squaring with `matmul`). Installed: the culture forecast runs on the player's code. Suri vents at cycle 7 and saves the culture.

**Proof.** Handover:
- K1 "Convert to the eigenvector grid, stretch each part, convert back." → Dev raises each entry of A to the 10th power.
- K2 "The P⁻¹P pairs in the middle cancel, so Aᵏ = PDᵏP⁻¹." → Dev multiplies 50 times.
- K3 "Not every matrix has enough eigenvectors." → Dev's forecast for the shear divides by zero.

**Cue.** When you see a matrix to a large power or "long-run behaviour", think diagonalisation.
**Real use.** Fibonacci in O(log n) steps. Counting walks in a graph. Stability of recurrent networks and population models.

#### Chapter 20 · Where does everything settle? *(N22 · air and relays)*

**World problem.** CO₂ drifts between modules every minute. And the relay network that will carry the uplink needs repair: which relay first?

**Signature mechanic.** **Flow bench.** Each module is a bar. Each step, fixed fractions move along the arrows between modules. Watch the bars settle. Then the same bench shows a network graph.

**Puzzles.**
1. Each minute 20% of module A's CO₂ drifts to B and 10% of B's drifts to A: P = [[0.8, 0.1], [0.2, 0.9]]. Prediction: the final split. Win: 1/3 in A and 2/3 in B, the eigenvector with eigenvalue 1. Place the scrubber in B.
2. Start with all CO₂ in A, then all in B. Win: show the same final split, and that the gap shrinks by 0.7 each minute (the other eigenvalue).
3. P = [[0, 1], [1, 0]]. Win: show the bars swap forever, with eigenvalue −1.
4. Relays A → B, A → C, B → C, C → A, D → C, with a 15% chance each step of jumping to any relay. Win: rank the relays by long-run traffic: C (0.394), A (0.373), B (0.196), D (0.038). Repair C first.
5. Architect: par for power iteration on the relay network: 13 steps to three-decimal accuracy.

**Aha.** Repeating the same mixing step settles on the eigenvector with eigenvalue 1, and the starting point stops mattering.

**Named.** After puzzle 1: **Markov chain**, **stochastic matrix**, **state vector**, **steady state**. The row-vector convention many CS texts use is shown once.

**Build and install.** `steady_state(P)`, which calls the player's `power_iteration`. Installed: scrubbers are placed and CO₂ falls; relay C is repaired.

**Proof.** Handover:
- K1 "The steady state is the eigenvector with eigenvalue 1, scaled to add up to 1." → Dev reports an eigenvector with negative shares.
- K2 "Where you start does not matter, unless the chain swaps or splits." → Dev reruns from every start.

**Act VI audit.**
- "Every matrix has a real eigenvector." False: the quarter turn.
- "Every matrix can be diagonalised." False: the shear.
- "Diagonalisable means invertible." False: [[0, 0], [0, 1]].
- "The zero vector is an eigenvector of every matrix." False by definition: show why including it would make every λ an eigenvalue.

**Cue.** When you see "long-run share", "where does it settle" or "rank pages by their links", think steady state of a Markov chain.
**Real use.** PageRank. Character-level language models (the student's own Showpiece B is a far bigger relative of this). Reinforcement learning's state transitions.

**Act VI ending.** Fenn confirms the plan: Lantern will be deorbited in nine days, and the crew should evacuate on the shuttle. Maren refuses. In the recovered fragments of the old library the player has been finding comments signed "IV". The last one reads: "If anyone is reading this, look in /archive/aurel_deep. Look at it properly."

---

### ACT VII · DRIFT (closest points)

The orbit is decaying. The high-gain antenna is jammed. And something the player may have noticed for several chapters is getting worse: the world has started to lean.

#### Chapter 21 · What is the closest point I can reach? *(N23 · the jammed antenna)*

**World problem.** The antenna's gimbal is jammed and can only point within one plane. The relay is off that plane. Point at the closest direction.

**Signature mechanic.** **Closest bench.** Drag a candidate point within the plane. An error arrow runs from the candidate to the target with its length shown. It snaps yellow when it is at right angles to the plane.

**Puzzles.**
1. Plane spanned by (1, 0, 0) and (0, 1, 0); target (3, 4, 5). Win: (3, 4, 0), with error (0, 0, 5).
2. Plane spanned by a₁ = (1, 1, 0) and a₂ = (0, 1, 1); target b = (1, 2, 3). Win: p = (1/3, 8/3, 7/3), with error (2/3, −2/3, 2/3), which has zero dot product with both a₁ and a₂.
3. Prediction: "Is the shortest error arrow always at right angles to the plane?" Win: drag to five other candidates and show each error is longer.
4. Win: turn "at right angles to both columns" into Aᵀ(b − Ax̂) = 0, then into AᵀAx̂ = Aᵀb.
5. Overclock: build P = A(AᵀA)⁻¹Aᵀ and show that projecting twice gives the same point as projecting once.

**Aha.** The closest point is where the error arrow is at right angles to everything you can reach.

**Named.** After puzzle 2: **orthogonal projection**. After puzzle 4: **orthogonal complement** (every arrow at right angles to the plane).

**Build and install.** `project(A, b)` (calls `transpose`, `matmul`, `solve`). Installed: the antenna points at the best direction and signal strength doubles.

**Proof.** Handover:
- K1 "Drop a perpendicular." → Dev rounds each coordinate toward the plane separately.
- K2 "At right angles to the plane means at right angles to each column, so Aᵀ times the error is zero." → Dev only checks one column.

**Cue.** When you see "closest", "nearest" or "best approximation", think projection.
**Real use.** The heart of least squares and PCA; nearest-neighbour search over embeddings.

#### Chapter 22 · How do I build a square grid from a skewed one? *(N24 · the drift)*

**World problem.** **The Drift.** Since First Light, the camera's turn has been updated every frame by multiplying in increments from the damaged gyro, and each increment is very slightly off. After tens of thousands of frames, the camera's columns are no longer at right angles or one unit long. The station leans. The ice moon looks like an egg. This has been happening on screen, slowly, since Act IV.

**Signature mechanic.** **Square-up bench.** Take the arrows one at a time. From each, subtract its shadow on every arrow already squared (Chapter 4's shadow), then make it one unit long.

**Puzzles.**
1. u₁ = (3, 4), u₂ = (2, 1). q₁ = (0.6, 0.8). The shadow of u₂ on q₁ is 2, so u₂ − 2q₁ = (0.8, −0.6), already one unit long. Win: a square grid.
2. v₁ = (1, 1, 0), v₂ = (1, 0, 1), v₃ = (0, 1, 1). Win: three unit arrows at right angles (every dot product below 10⁻⁹).
3. Put the three arrows in a matrix Q. Win: show QᵀQ = I, then use Qᵀ as Q's undo (Chapter 13) with no row reduction.
4. The drifted camera matrix: column lengths 1.03, 0.98 and 1.01, with one pair at 88.6°. Win: re-square it every frame. The station stops leaning and settles upright.
5. Architect: nearly parallel arrows (1, 10⁻⁸, 0) and (1, 0, 10⁻⁸). Win: compare classical and modified Gram–Schmidt and measure how far each result is from a right angle.

**Aha.** Subtract each arrow's shadow on the ones already done, and what is left is at right angles to them. Lengths and angles survive a matrix with unit, perpendicular columns, and its transpose undoes it.

**Named.** After puzzle 2: **orthonormal** and **Gram–Schmidt process**. After puzzle 3: **orthogonal matrix** and **QR factorisation**.

**Build and install.** `gram_schmidt(vs)` (calls `dot`, `scale`, `sub`, `normalize`), `qr(A)`, `reorthonormalize(R)`. Installed: the renderer's camera is re-squared every frame.

**Proof.** Handover:
- K1 "Take away the shadow on every earlier arrow, not only the first." → Dev's third arrow leans.
- K2 "Then make it one unit long." → Dev's grid is square but stretched.
- K3 "For an orthogonal matrix, the transpose is the undo." → Dev row reduces a camera matrix every frame and the frame rate drops.

**Cue.** When you see "perpendicular basis" or "a rotation that drifts", think Gram–Schmidt.
**Real use.** Re-squaring rotation matrices in games, drones and robots. QR inside least-squares solvers. Orthogonal weight initialisation in deep networks.

#### Chapter 23 · No exact answer exists. What is the best one? *(N25 · the orbit)*

**World problem.** Six noisy radar readings of Lantern's altitude. Forecast when the station drops below 380 km, the point where a reboost is no longer possible.

**Signature mechanic.** **Fit bench.** Drag a line through data points. Vertical error bars and their squares update live. For three points, a second view shows **data space** in 3D: the readings are one arrow, the reachable fits are a plane, and the best fit is the closest point (Chapter 21).

**Puzzles.**
1. Points (0, 1), (1, 2), (2, 2). Win: drag the best line, then see it in data space: b = (1, 2, 2) dropped onto the plane spanned by (1, 1, 1) and (0, 1, 2). Fit y = 7/6 + t/2; errors (−1/6, 1/3, −1/6), at right angles to both columns.
2. Points (0, 1), (1, 2), (2, 2), (3, 4). Win: y = 0.9 + 0.9t, within 0.001 of the smallest possible squared error.
3. Orbit: (0, 412.0), (1, 410.9), (2, 410.1), (3, 408.8), (4, 408.1), (5, 406.9) km at hours 0 to 5. Win: fit h ≈ 411.98 − 1.006t and report the 380 km crossing at about hour 31.8 (within 0.5).
4. A degree-5 curve passes through all six readings exactly. Win: show it predicts −316 km at hour 10, choose the line, and say why.
5. Architect: solve the same fit through `qr` instead of AᵀA and compare accuracy on nearly dependent columns.

**Aha.** When no mix of the columns hits b, take the closest point you can reach. The fit is a projection.

**Named.** After puzzle 1: **least squares**, **residual**. After puzzle 2: **normal equations**.

**Build and install.** `least_squares(A, b)` (calls `project`, or `qr` at Architect). Installed: the reboost burn is planned from the player's fit. Lantern climbs. A deorbit is now a decision someone has to make, not an accident.

**Proof.** Handover:
- K1 "The best fit makes the residual at right angles to every column." → Dev minimises the largest single error instead.
- K2 "A curve through every point is not the best forecast." → Dev picks the degree-5 curve.

**Act VII audit.**
- "A curve through every data point is the best fit." False: puzzle 4.
- "Gram–Schmidt changes the plane the arrows span." False: show the span before and after.
- "Projecting twice moves the point further." False: P² = P.
- "The residual is at right angles to every column." True: show it in data space.

**Cue.** When you see "more equations than unknowns" or "fit a line", think least squares.
**Real use.** Linear regression; calibration; the last layer of many models is a least-squares problem.

**Act VII ending.** Fenn: "If you will not leave, I cannot protect you." Then, after a long delay, a second message: he has opened Ilse's archive himself.

---

### ACT VIII · SIGNAL (the shape of data)

Ilse's archive holds 2,000 ice-penetrating radar soundings across 12 frequency channels. It looks like noise. Relay C will point at Lantern for 19 minutes, at a few kilobytes per minute.

#### Chapter 24 · Which moves only stretch along perpendicular axes? *(N26 · noise and the latch)*

**World problem.** Two of the radar channels plotted against each other form a tilted ellipse of noise. To separate signal from noise you need its axes. And the replacement docking latch has an energy bowl: is the shuttle stable in it?

**Signature mechanic.** **Ellipse bench.** A matrix moves the unit circle to an ellipse. Its axes and the probe sweep from Chapter 18 are drawn together.

**Puzzles.**
1. S = [[2, 1], [1, 2]]: axes along (1, 1) and (1, −1), stretched by 3 and 1, at right angles. Then [[2, 1], [0, 1]]: eigenvector lines (1, 0) and (1, −1), not at right angles. Win: test four matrices and state the rule (equal across the diagonal gives perpendicular axes).
2. The latch's energy xᵀSx = 2x² + 2xy + 2y². Win: find the steepest direction, (1, 1) with curvature 3, and the shallowest, (1, −1) with curvature 1. Positive in every direction: a bowl, so the shuttle is stable.
3. S = [[1, 2], [2, 1]] has eigenvalues 3 and −1: a saddle. Win: find the escape direction, (1, −1).
4. Win: rebuild S from its axes as 3·q₁q₁ᵀ + 1·q₂q₂ᵀ, a sum of two single-direction pieces.
5. Architect: find all axes of a 4 × 4 symmetric matrix with power iteration plus removal of each found piece (deflation). It works because the axes are at right angles.

**Aha.** A matrix that is equal across its diagonal only stretches along perpendicular axes. On a grid turned to those axes, it is diagonal.

**Named.** After puzzle 1: **symmetric matrix** and **spectral theorem**. After puzzle 2: **quadratic form** and **positive definite**.

**Build and install.** `outer(u, v)`, `sym_eigen(S)` (calls `power_iteration`, `outer`). Installed: the latch check and the noise axes.

**Proof.** Handover:
- K1 "Symmetric means perpendicular axes." → Dev assumes perpendicular axes for a non-symmetric matrix.
- K2 "All eigenvalues positive means a bowl; mixed signs mean a saddle." → Dev certifies the saddle latch.

**Cue.** When you see a symmetric matrix, a covariance matrix, or "energy", think perpendicular eigenvectors.
**Real use.** Covariance matrices. The Hessian, which describes the curvature of a loss surface in optimisation.

#### Chapter 25 · What does any matrix do to a circle? *(N27 · the uplink budget)*

**World problem.** Ilse's 256 × 256 radar map is 65,536 numbers. The uplink can carry about 12,000.

**Signature mechanic.** **Circle bench, then layer stack.** Any matrix moves the unit circle to an ellipse: turn, stretch along perpendicular axes, turn. Then an image is shown as a stack of single-direction layers, and a k slider adds them one at a time.

**Puzzles.**
1. A = [[3, 0], [4, 5]]. Win: find the input directions that land on the ellipse's axes, (1, 1)/√2 and (1, −1)/√2, with stretches 3√5 ≈ 6.708 and √5 ≈ 2.236. Check: 6.708 × 2.236 = 15 = det A.
2. Win: show AᵀA = [[25, 20], [20, 25]] is symmetric, and that its eigenvalues 45 and 5 are the squared stretches (Chapter 24).
3. Win: keep only the first layer of A and measure the error (the second stretch, √5).
4. Each layer of the map costs 256 + 256 + 1 = 513 numbers, so 12,000 numbers allow k ≤ 23. Win: pick the smallest k that keeps the ridge features visible (relative error under 8%) and fits the budget.
5. The crew's comms sigils are circles moved by a 2 × 2 matrix (Section 6). Win: read off each crew member's two stretches.

**Architect extra.** The ratio of largest to smallest stretch (condition number), and the pseudoinverse as another route to Chapter 23's fit.

**Aha.** Every matrix turns, stretches along perpendicular axes, and turns again. The biggest stretches carry most of the picture. Drop the small ones and little is lost.

**Named.** After puzzle 1: **singular value decomposition**, **singular values**, **left and right singular vectors**. After puzzle 4: **low-rank approximation**.

**Build and install.** `svd(A)` (calls `sym_eigen` on AᵀA, then `matvec` and `normalize`), `low_rank(A, k)` (calls `outer`). Installed: the vent map fits the uplink.

**Proof.** Handover:
- K1 "Turn, stretch, turn." → Dev reads the stretches off A's diagonal.
- K2 "The stretches are the square roots of the eigenvalues of AᵀA." → Dev uses the eigenvalues of A itself.
- K3 "To compress, keep the biggest stretches." → Dev keeps the first 23 rows of the image.

**Cue.** When you see "compress", "approximate with fewer numbers" or "what does this matrix do", think SVD.
**Real use.** Image and model compression; LoRA; recommendation systems; latent semantic analysis of text.

#### Chapter 26 · Which directions in my data matter? *(N28 · Ilse's archive)*

**World problem.** The archive's 2,000 soundings in 12 channels. Scientists on Earth will need a summary they can read in one picture.

**Signature mechanic.** **Spread bench.** Turn a line through the centre of a data cloud. Every point's shadow on the line is drawn, along with a spread meter and an error meter for the perpendicular drops. Then a bar chart of spread per direction (a scree plot).

**Puzzles.**
1. A 200-point 2D cloud. Win: turn the line to the direction of greatest spread, within 2° of the top eigenvector of the covariance matrix. The error meter is at its smallest at the same angle.
2. Win: find why the first direction points at the cloud's centre instead of along its spread (the data was not centred), and fix it by subtracting the mean.
3. Twelve channels. Win: choose the smallest k that keeps at least 90% of the spread (k = 3 for Ilse's data).
4. **The Rings.** Project the soundings onto the second and third directions. Win: a ring of tight clusters appears, at the sites of hydrothermal vents under the ice (Section 8).
5. Architect: compute the same directions through `svd` of the centred data and compare with `sym_eigen` of the covariance.

**Aha.** The covariance matrix is symmetric, so its axes are perpendicular, and they are the directions of most spread. Keep the top few.

**Named.** After puzzle 1: **covariance matrix** and **principal components**. After puzzle 3: **explained variance** and **principal component analysis**.

**Build and install.** `covariance(X)` (calls `transpose`, `matmul`), `pca(X, k)` (calls `sym_eigen`). Installed: the archive summary.

**Proof.** Handover:
- K1 "Centre the data first." → Dev's first direction points at the mean.
- K2 "The top directions are the covariance matrix's eigenvectors with the largest eigenvalues." → Dev keeps the channels with the biggest raw numbers.

**Act VIII audit.**
- "PCA finds the directions that best separate two groups." False: build two groups split along a direction with little spread.
- "Singular values can be negative." False: they are stretches, which are lengths.
- "Dropping small singular values always loses what matters." False here: show the ridges survive at k = 20.
- "For a symmetric matrix with positive eigenvalues, the singular values are the eigenvalues." True: show both on the Ellipse bench.

**Cue.** When you see "too many features", "main directions of variation" or "show high-dimensional data in 2D", think PCA.
**Real use.** The student's own digits demo already uses PCA for its map. Visualising embeddings, denoising, preprocessing.

---

### FINALE · UPLINK: Can a stack of moves separate what a single move can't?

**World problem.** The vents must be found across the whole moon, 40,000 soundings, before relay C turns away. In PCA coordinates the vent soundings form a tight blob at the centre and ordinary ice forms a ring around it. One straight cut cannot separate a blob from a ring around it.

**Signature mechanic.** **Layer bench.** A matrix W moves the points (the Grid bench again). Then every negative coordinate is set to zero: the plane creases along the axes. Then a second step adds the coordinates and compares the sum with a threshold.

**Puzzles.**
1. Win: try any single matrix and one straight cut, and show it fails. A matrix keeps the origin fixed and lines straight, so the ring stays around the blob.
2. Fold: W = [[1, 0], [−1, 0], [0, 1], [0, −1]] (four outputs), then set negatives to zero. The four outputs add up to |x| + |y|. Win: a threshold of 1.7 separates every point. Blob points (radius at most 1) give at most 1.42. Ring points (radius 2 to 3) give at least 2.
3. Win: run the player's layer, built from their `matvec`, on all 40,000 soundings. The detected sites light up across the moon's globe.

**Named.** After puzzle 2: **layer**, **weights**, **bias**, **ReLU** (the step that sets negatives to zero).

**Build and install.** `relu(v)`, `dense(W, b, x)` (calls `matvec`, `add`).

**The transmission.** The player assembles the package: the map compressed with their `low_rank` at k = 20, the PCA summary, the detected sites, and `basis.py` itself with every docstring they wrote. It goes out through relay C. The ending follows in Section 7.

**Proof.** The final explain-back, **Down to the arrows** (Section 4.4).

---

## 4. The explain-back system

### 4.1 Principles
- **An explanation is judged by what it makes happen, not by keywords.** The core mechanic gives the explanation to someone who acts on it, and the player watches the result.
- **Four layers, from small to large:** the docstring (every function), the handover (every chapter), the audit (every act), and Down to the arrows (the finale).
- **Never blocks.** Each layer earns a star or a constellation link. Each has Show me, which plays a model version, and Skip.
- **Matched to the curriculum.** Each chapter's handover key ideas (K1–K3) are the curriculum node's explain-back sentences, split into parts. Each Dev failure is one of that node's listed misconceptions.

### 4.2 The handover (teach Dev)
Dev is a hardware technician, not a maths person, and he is literal by trade: "I follow the checklist. That's how nobody dies out here." At the end of each chapter, Dev has to do the chapter's job himself while the player is busy elsewhere. The player writes him a **handover card**.

**The card has three slots, in house order:**
1. **What you see.** The player records a Bench replay of up to 10 seconds: they choose the example and the moment that shows the idea.
2. **Why it works.** One to three sentences. Intern and Engineer build them from **phrase tiles**: subject, relation and object fragments (about 40 per chapter) that combine into hundreds of sentences, true and false. Architect types free text, and the game maps it to key ideas with a pattern list; if the match is unsure, the player confirms which key ideas the sentence covers.
3. **What to do.** Ordered steps from action tiles ("take the right-hand matrix first", "clear below the pivot", "subtract the shadow on each earlier arrow").

**Dev then runs the card on three new cases**, chosen so that each missing or wrong key idea produces a different visible failure. Dev's behaviour is a rule engine: the correct procedure, with each key idea the card leaves out replaced by its misconception.

**Example (Chapter 12, composition).** A player's card says: "To do two moves, multiply their matrices. Each column of the answer is the first matrix applied to a column of the second." It never says which move goes first. Dev fuses a turn and a stretch in reading order. On the Bench the camera feed turns the wrong way. Dev: "I did what the card says. It doesn't say which one goes first." The player adds the tile "the right-hand matrix acts first", resends, and Dev passes all three cases.

**Why this works as teaching.** The player debugs an explanation the way they debug code: run it, watch it fail on a case, find the missing line. Explaining precisely becomes a skill the game trains, not a box it ticks.

### 4.3 Docstrings in your own words
- After a function passes its swarm, the editor opens a docstring with the prompt: "What question does this function answer, and why does the code work? Write it the way you'd tell Dev." A side note suggests saying it out loud first (rubber-duck debugging).
- The text is free. Nothing is graded. The player then reveals **Ilse's original note** for the same function, in her recorded voice, plus a checklist of the 2–3 key ideas. The player ticks which ideas their own text covers and may edit it.
- Docstrings ship inside the exported `basis.py`. By the end, the student has a library that explains itself in their words.
- At Architect, a docstring that covers the key ideas (self-ticked) is part of the chapter's third star.

### 4.4 Down to the arrows (the final explain-back)
- The player picks any top-level function: `svd`, `pca`, `least_squares` or `dense`. The game walks down its call graph: `svd → sym_eigen → power_iteration → matvec → lincomb → scale, add`.
- At each node, the player gives one sentence (their docstring, edited for the chain) and picks the Bench moment that shows it. The walk ends at the arrows from Chapter 1.
- The result plays back as **your lecture**: the camera flies down the library graph; each node's Bench replay plays with the player's own sentence as its subtitle. The student watches themselves explain SVD from arrows upward.
- The lecture exports as a self-contained HTML page and a Markdown outline: exam revision written by the student.
- Stretch goal: Ilse reads the player's lecture aloud using in-browser Kokoro (kokoro-js). If that proves too heavy, subtitles and music only.

### 4.5 The audit (counterexample duels)
- At the end of each act, Fenn sends four confident claims about the player's code. Some are false. Each is drawn from the curriculum's misconception lists.
- **False claim:** the player builds a counterexample on the Bench. A predicate checks it. Fenn: "Noted. That one's wrong."
- **True claim:** the player builds a demonstration and chooses or writes the reason.
- Architect adds harder claims: "If A² = 0 then A = 0" (false: [[0, 1], [0, 0]]); "AᵀA is always invertible" (false: dependent columns); "a 3 × 3 real matrix always has a real eigenvalue" (true: show why the characteristic polynomial must cross zero).
- The audits carry the story. Fenn is the antagonist the player argues with long before they learn what he did.

### 4.6 The flatness constellation
- The dome above the ops room is a star map. Each star is one face of the same fact about a square matrix (curriculum thread T3): determinant 0 · the grid is flattened · columns dependent · columns do not span · a column without a pivot · reduced row echelon form is not I · non-zero null space · rank below n · Ax = b is not always solvable with exactly one answer · no inverse · 0 is an eigenvalue · smallest singular value is 0 · (in 3D) scalar triple product of the columns is 0.
- Stars light as chapters earn them (3, 6, 8–10, 13–16, 18, 25). Linking two stars requires showing both on one shared example on the Bench.
- When all thirteen are linked, the student can answer the question every linear algebra exam asks in some form: "Why are all these the same statement?" They answer it with one picture: space being flattened.
- Fainter constellations trace other threads: "a matrix is where e₁ and e₂ land" (T1), "closest point means drop a perpendicular" (T7), "choose the grid that makes the move easy" (T9).

### 4.7 How this adds up to university-level understanding
- **Exam skills:** Engineer difficulty requires the by-hand work of each curriculum node (row reduction, determinants, eigenvalues of 2 × 2 and 3 × 3, diagonalisation, Gram–Schmidt, least squares by normal equations).
- **Recognition:** maintenance tickets give unlabelled, interleaved practice and build the student's own list of cues.
- **Explanation:** every concept has been explained four ways: to Dev (precise), in a docstring (own words), against Fenn (edge cases), and in the lecture (connected to everything below it).
- **Transfer:** NumPy cards and the exported Colab notebook connect each function to the tool used in the Master of AI.

---

## 5. Difficulty levels

Three levels plus optional Overclock puzzles. The level can be changed at any time, per chapter, and nothing is locked at any level.

| | **Intern** | **Engineer** | **Architect** |
|---|---|---|---|
| **Who it is for** | First pass; learning Python too | Exam preparation | Want the full CS depth |
| **Code mode** | Assemble (drag lines into order, up to 2 decoy lines) | Fill (2–5 blanks in a written function) | Write (empty body) |
| **Numbers** | Small integers, mostly 2D | Fractions, 3D, 3 × 3 systems | Floating point, n × n, near-singular cases |
| **By hand** | Drag answers on the Bench | Type intermediate numbers (row operations, determinants, eigenvalues) | As Engineer, plus derivation steps (fill in where a formula comes from) |
| **Test swarm** | 20 typical cases | 100 cases including zero vectors, parallel arrows, singular matrices | 300 cases including ill-conditioned matrices, tolerances and timing |
| **Par scores** | Hidden | Shown | Shown, with Ilse's numbers to beat (multiplications, lines, iterations) |
| **Handover** | 2 key ideas, tiles | 3 key ideas, tiles | Free text plus steps |
| **Docstring** | Optional | Optional | Part of the third star |
| **Audit** | 2 claims per act | 4 claims | 4 claims plus 2 harder ones |
| **Tickets** | Same chapter's topics | Mixed topics, exam style | Mixed, with messy numbers and no hints |
| **Hints** | Dev offers one after 2 failed runs | On request | On request (always available; the star notes "no hints") |

**Overclock puzzles** (any level, optional): the curriculum's stretch items, such as LU factorisation, Cramer's rule, complex eigenvalues as turn-and-scale, a matrix that cannot be diagonalised (Jordan form named only), condition numbers, the pseudoinverse, and abstract vector spaces (differentiation of polynomials as a matrix).

**Stars per chapter:** Solved (the Bench puzzles), Built (the function passes its swarm), Explained (handover passed; at Architect also the docstring). Stars and pars show progress. They never block anything.

---

## 6. Visual direction, audio direction, UI and feel

### 6.1 Visual direction: Blueprint to Real
The look is the progress bar. The game starts in a stark, beautiful minimal style and earns its full cinematic look through the player's code. Both ends are designed to look good.

| Stage | The World looks like | Because the player wrote |
|---|---|---|
| Prologue | Glowing points on black. A soft CRT console. | `plot`, lists |
| Act I | Cyan blueprint linework: deck plan, arrows, dust trails | `add`, `scale`, `lincomb` |
| Act II | The hull as a lit surface with light and dark sides, still orthographic | `dot`, `cross`, `triple`, `ray_plane` |
| Act III | The orbit as a wire globe with Lantern placed on it | `solve` |
| Act IV, **First Light** | Full perspective, PBR materials, bloom, the ice moon and the gas giant | `matvec` through `det` |
| Acts V–VIII | Cinematic interiors, depth of field, volumetric light, large data visualisations | Everything after |

**Art rules.**
- **Maths owns green, red and yellow.** Green is the input vector (or column 1), red is the second vector or weights (or column 2), yellow is the result. The world never uses these three colours. The world's palette is deep navy, ice cyan, white and gas-giant amber. Alarms are amber, not red.
- **Light carries information.** Maths objects are emissive and glow under bloom. World objects are lit, not glowing, so the maths always reads first.
- **Motion tells the truth.** Every animation shows the actual maths. A composition animates each move in turn, right-hand move first. A single matrix animates along (1 − t)I + tA and says so. No decorative tween that would mislead.

**Three.js techniques.**
- **Grid bench shader:** a full-screen fragment shader that draws the moved grid exactly for any 2 × 2 or 3 × 3 matrix. Each pixel is mapped back through the inverse, and lines are drawn where the result is near a whole number, anti-aliased with screen-space derivatives. Infinite, crisp, cheap. A flattened grid is drawn as its image line or plane.
- **Arrows:** instanced cylinders and cones, emissive, with label sprites rendered by CSS2D and KaTeX. Tip-to-tail ghosts for linear combinations.
- **Planes:** double-sided translucent sheets with a fresnel edge; intersection lines computed exactly and drawn as bright seams.
- **Point clouds:** instanced points (up to 40,000 soundings) with size attenuation.
- **Hologram shader** for anything still running on crew versions: fresnel rim, scanlines, edges from barycentric coordinates.
- **Aurel (ice moon):** procedural shader with layered noise, a crack network from cellular noise, a subsurface tint and specular glints, plus a thin atmosphere rim. **Corvan (gas giant):** banded flow noise, storm vortices, a soft terminator.
- **Post-processing:** bloom, ACES tone mapping, SMAA, vignette, light film grain. Chromatic aberration only on comms glitches.
- **Cinematics:** spline cameras and a depth-of-field pass for the act cards and signature moments. Letterboxing during story beats, which are always skippable.
- **Budget:** 60 fps at 1080p on an integrated laptop GPU; under 300 draw calls; initial download under 40 MB, with audio streamed.

**Blender assets (bpy, procedural, exported to glTF with meshopt compression).**
- **Lantern Station** as a modular kit: habitat cylinders with ribbing (array and bevel), truss (array along a curve), solar wings, radiators, a lathed antenna dish, the docking ring and its clamps, the Spindle, cargo pods.
- **The manipulator arm** with three joints as separate nodes, so the player's code drives the joint angles directly.
- **The drone** (hexagonal body with four thrusters, then three), relay satellites, the rescue shuttle.
- **Interiors:** the ops room (console desks, screens as surfaces that show live UI render targets), the algae bay (amber grow lights, tubes), the Spindle corridor.
- **Crew helmets:** five distinct silhouettes with reflective visors and suit decals, for portraits.
- AO and curvature baked to vertex colours or small textures, trim-sheet materials, two levels of detail.
- **Cycles stills on the 4-core CPU:** title key art, eight act cards, and the final constellation shot (about 10–20 minutes each at 1080p with denoising).

**Portraits without drawn art.**
- A lit 3D helmet (visor dark, reflections live) inside a comms frame.
- A **voice sigil**: a ring of points moved by a 2 × 2 matrix specific to each character, with the stretch pulsing with the live voice level from a WebAudio analyser. Maren's is close to a circle. Dev's is sheared. Suri's is a wide, gentle ellipse. Ilse's is a circle that slowly turns. Fenn's is a thin ellipse, nearly flat. In Chapter 25 the player reads each sigil's two stretches. After Fenn's choice in the finale, his sigil opens.
- A typographic plate: name, role, location, heart rate, comms delay.

**Typography.** Space Grotesk for UI, JetBrains Mono for code, KaTeX for maths, all bundled locally (as on the student's existing site).

### 6.2 Audio direction

**Voice cast (Kokoro, pre-generated).**

| Character | Kokoro voice | Speed | Processing | Delivery |
|---|---|---|---|---|
| Maren Holt, commander | `bf_emma` | 0.92 | Small-room reverb | Low, measured, short sentences, dry |
| Devon "Dev" Okoro, systems technician | `am_puck` (alternative `am_michael`) | 1.05 | Helmet comms band-pass, breath noise in the Spindle | Quick, wry, literal |
| Suri Anand, biologist and drone pilot | `af_heart` | 1.00 | Clean | Warm, curious, asks the "can we" questions |
| Ilse Varga, the library's original author | `bf_alice` | 0.90 | Recorded-note EQ and light tape hiss; clean in the finale, when she speaks live | Careful, precise, unhurried |
| Tobias Fenn, Meridian operations director | Blend of `am_eric` (70%) and `am_onyx` (30%) | 0.95 | Narrowband long-distance comms, a visible 40-second delay counter | Smooth, polite, tired |
| LANTERN, station status voice | `bm_daniel` | 1.00 | Flat, slightly metallic | Reads numbers and states only. Never opinions. |

- **Pipeline:** dialogue lives in YAML with an id per line → a pronunciation lexicon (eigen as "EYE-gun", λ as "lambda", e₁ as "e one", Aᵀ as "A transpose", Gram–Schmidt, RREF read as "reduced row echelon form") → Kokoro → loudness normalised → Opus/MP3. Each line is hashed, so only changed lines are regenerated. About 1,600 lines, roughly two and a half hours of audio; about 30–40 minutes of generation on the 4-core CPU.
- Subtitles are always available and on by default. The game works with audio off.
- The script passes the same wording linter as the site: no exclamation marks, no banned words, no personified maths objects.

**Adaptive procedural music (WebAudio).**
- **Layers by act.** Act I is a single low drone and sparse plucks. Each act adds a layer. First Light is the first time the full arrangement plays.
- **The library motif.** Each installed function adds one note to an evolving ostinato. By the finale the theme has about sixty notes, one for each function the player wrote.
- **States:** Explore (on the Bench), Build (in the editor: a soft low pulse), Run (the swarm: each passing case adds a soft note, each failing case a low detuned tone, so a bug is audible before it is read), Resolve (a cadence on a win).
- **Engine:** oscillators, filtered noise and a generated-impulse convolution reverb, scheduled with a look-ahead clock. A different mode per act.

**Procedural SFX.** Key clicks; an arrow snap whose pitch follows the arrow's length; a grid-morph sweep whose filter follows the determinant (it narrows as the grid flattens); thruster rumble; hull creaks during the tumble; comms static; a clean chime when a function is installed.

### 6.3 UI and feel

```
+--------------------------------------------------------------------------------+
| [comms: helmet + sigil + subtitles]                 [objective · Show me · Skip]|
+------------+-----------------------------------------------+-------------------+
| Chapters   |                                               |  Console          |
| (all open) |        The Bench / The World                  |  (Python editor)  |
| Library    |   (toggle with Tab, or picture-in-picture)    |                   |
| Tickets    |                                               |  formula (KaTeX)  |
| Codex      |                                               |  next to picture  |
+------------+-----------------------------------------------+-------------------+
| Trace log · Test swarm summary · step debugger controls                         |
+--------------------------------------------------------------------------------+
```

- **Keys:** Tab switches Bench and World. Ctrl+Enter runs. F10 steps one line. F9 toggles Bug mirror. L shows the honesty overlay. H asks for a hint. Esc opens the chapter list.
- **The step debugger is the visualiser.** Stepping through `matvec` highlights each line and animates the matching arrow on the Bench.
- **Formulas appear only after a concept is named,** next to the picture they describe, coloured to match.
- **Feel:** arrows snap to whole numbers on Intern and Engineer (hold Shift for free movement). Win checks are live, with a soft pulse and chime, never a pop-up. Fail states show the case, never a red banner.
- **Saving:** local storage wrapped in try/catch, plus export and import of a save file. If storage is blocked, the game says so and still works.
- **Accessibility:** the green/red pair is hard for many colour-blind players, so v and w always also differ in shape (solid arrow with a round tip for v, dashed arrow with a diamond tip for w, thicker arrow for the result) and carry letter labels. An alternative palette swaps green and red for teal and orange. Reduced-motion mode. Every control works from the keyboard. Text scales to 150%.

---

## 7. Story

### 7.1 Setting
**Lantern** is a small survey station in orbit around **Aurel**, an ice moon of the gas giant **Corvan**. It is run by **Meridian Survey Systems** under a contract that is about to end. Every piece of Lantern's software that does maths runs on one sealed, licensed library, the **core**. Nobody aboard has ever seen inside it.

### 7.2 Characters

| Character | Who they are | What they want | What they feel | Arc |
|---|---|---|---|---|
| **The player ("Patch")** | The newest crew member, a computer science graduate on a placement. Never voiced; addressed by role, then by the nickname Dev gives them. | To be useful. | Out of their depth, then in it. | From "I can code" to "I can explain why this code works". |
| **Maren Holt** | Commander, fifties, twenty years in survey work. | Get everyone home. | Guilt: she argued to keep Lantern open past the contract, so the crew is here because of her. | From holding on to the station, to choosing the truth over the station. |
| **Devon "Dev" Okoro** | Systems technician, thirties, sealed in the Spindle for Acts II to V. | To get out, and to stop being scared of the dark. | Fear, covered with jokes. | Learns the maths through the player's handover cards. In the finale, he teaches a step to the relief crew. |
| **Suri Anand** | Biologist and drone pilot, twenties. | Keep the algae culture (the station's food and oxygen backup) alive. | Homesick. Her sister's video message has been waiting since the storm; the display could not show it until the player's matrices could scale it (Chapter 11). | The one who asks the questions that start chapters. She is the first to read Ilse's data as a scientist. |
| **Ilse Varga** | Wrote Lantern's original library, called basis, eight years ago. She recorded her code reviews as audio notes attached to each function. Meridian compiled and sealed her code, licensed it back, and let her go. | That someone would read it properly. | Regret that she did not fight for her finding. | Recorded voice for 26 chapters. Speaks live, for the first time, at the end. |
| **Tobias Fenn** | Meridian's operations director, on Earth, 40 seconds away by light. Once an engineer. | To close Lantern's account without anyone getting hurt. | Tired. Increasingly ashamed. | The auditor the player argues with all game. Signed the deletion. In the finale, gives the crew the relay window and forwards the uplink himself. |

### 7.3 Stakes
- **Lives:** heat, air, orbit and food, each fixed by a chapter's function.
- **Truth:** a scientific finding Meridian buried.
- **Ownership:** a station that ran for years on code nobody aboard understood, and stopped the day that code was taken away. The theme in one line: **understanding is what makes something repairable.**

### 7.4 Twists, in order
1. **End of Act III:** the core was not damaged by the storm. It was deleted by a signed remote command at the storm's peak.
2. **End of Act V:** the command came from Meridian, and Fenn signed it. Meridian plans to deorbit Lantern because closing it is cheaper than resupplying it.
3. **End of Act VI:** the comments signed "IV" in the old library's fragments belong to Ilse Varga, who wrote the original. Her last comment points to an archive.
4. **Chapter 26:** the archive holds evidence of hydrothermal vents under Aurel's ice. A confirmed finding would make Aurel a protected site and void Meridian's pending mining lease on it. That is why the library was sealed, Ilse was let go, and Lantern was scheduled to burn.
5. **Finale:** Fenn chooses. "Relay C will point at you for nineteen minutes, starting at 04:10. I didn't tell you that."

### 7.5 Ending
- The uplink completes at 18 minutes 41 seconds of 19. The package: the compressed vent map, the PCA summary, the detected sites, and `basis.py` with the player's docstrings.
- Fenn's last message: "I sent it to the Survey Authority's open archive myself. I signed the deletion. I'm signing this too." His sigil opens from a thin line into an ellipse.
- Ilse's first live message: "That's my library. No. It's yours. You wrote every line again, and you know why each one is there. That's the only way anyone owns a library."
- The Survey Authority freezes the lease pending study. Lantern stays in orbit. A relief ship arrives, and the player guides it in on a docking display running their own `view_matrix` and `ray_plane`. Dev talks the relief engineer through the latch check from a handover card the player wrote in Chapter 24.
- Final shot: the library graph rises as a constellation over Aurel, one star per function the player wrote. The credits list each function with the first line of the player's docstring.
- Maren, last line: "Write it so the next person can read it."
- After the credits: export `basis.py`, the Colab notebook that runs it, and "your lecture".

### 7.6 Tone and sample lines
Characters are people with feelings; maths objects never are. No exclamation marks. Story beats are short and skippable, and every chapter opens with the station's problem in literal terms.

- DEV (Chapter 1): "Heater core's in. Suri says the culture will hold. I'm calling you Patch."
- SURI (Chapter 2): "Two nozzles left. Can it still get to the crates up the shaft, or do I go up there myself?"
- FENN (Act I audit): "Meridian signs off on any code that touches station hardware. I have four statements about yours. Some are wrong. Show me which, and show me why. Pictures are fine."
- ILSE (recorded, Chapter 11): "Each column says where one unit arrow lands. Once you know that, every other point's landing spot is fixed."
- ILSE (recorded, Chapter 16): "I called this library basis. A basis is a set of arrows that reaches every point in a space with nothing wasted. Every function in here is built from a few arrows like that. If you're hearing this, you've typed the word for weeks. Now you know what it means."
- MAREN (First Light): "Run it."
- SURI (First Light, quietly): "Is that us."
- DEV: "That's us. That's the ring. Or where the ring was."

---

## 8. Why this will be remembered: three signature moments

### 8.1 First Light (end of Act IV)
- The screen goes black. A checklist scrolls: `dot ✓  normalize ✓  cross ✓  normal ✓  triple ✓  ray_plane ✓  matvec ✓  matmul ✓  identity ✓  row_echelon ✓  rref ✓  inverse ✓  view_matrix ✓  det ✓`. Maren: "Run it."
- The first frame draws as points, the Prologue's look. Then lines. Then lit faces. Then perspective arrives and the camera pulls back: Lantern hangs over the cracked white face of Aurel, with Corvan's bands filling the sky behind. The full score plays for the first time.
- An overlay: **"Every pixel of the station passed through 14 functions you wrote."** It lists them. The player takes the free camera.
- Then the crew sees what the sealed displays never showed: the docking ring is gone, and the station is tumbling.
- Why people will talk about it: the best-looking moment in the game is a result, not a cutscene. It is the player's own renderer.

### 8.2 The Flip (Chapter 18)
- The player finds the three axes of Lantern's inertia matrix and chooses one to spin about. Two axes hold steady. The middle one, the axis with eigenvalue 6, holds for a few minutes and then the whole station flips end over end, with Corvan wheeling behind it, and flips back again, and again.
- This is real physics (the intermediate axis theorem), simulated with Euler's equations from the player's own matrix. It is the same effect astronauts filmed with a spinning wing nut on the ISS.
- Why people will talk about it: it looks impossible, it is true, and the game gives you the one-line reason: the middle eigenvalue.

### 8.3 The Rings, and the Uplink (Chapter 26 into the Finale)
- Ilse's archive appears as a 12-dimensional fog of 2,000 points, slowly turning through projection after projection. The player computes the principal components with their own `pca`. The view settles onto the second and third directions, and a ring of tight clusters comes out of the noise: the vent sites.
- Ilse, recorded eight years ago: "I saw it once. Then they took the library away and I couldn't see it again."
- Then the nineteen-minute uplink: the player's layer marks sites across the whole moon, their `low_rank` compresses the map under budget, and the package leaves with their library in it.
- Why people will talk about it: the climax of the story is a PCA plot, and it lands, because the player built every step that made it visible.

### Honourable mentions
- **The Drift.** From First Light onward, the world leans a little more each chapter. In Chapter 22 the game reveals it was the player's own camera drifting the whole time, and Gram–Schmidt puts the world upright.
- **The inside-out hull.** Half the station renders black until the player gets the order of a cross product right. Chapter 14 brings the same bug back through a negative determinant.
- **The refactor.** The brute-force search from Chapter 2 is replaced by `solve` in Chapter 10 and the failing case passes in front of you.
- **Your lecture.** The student watches their own explanation of SVD, built down to the arrows from Chapter 1.

---

## 9. Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Scope.** 26 chapters, each with Bench puzzles, a coding task, a swarm, a handover, plus audits, tickets and story. | Content written by parallel agents can drift in quality and style. | One data-driven chapter format (Appendix A). Shared Bench components (arrow, grid, plane, row deck, probe sweep, fit, cloud), so most chapters are configuration plus text. Build a vertical slice first: Prologue, Act I and a reduced First Light, then the rest. Story beats are short and modular. |
| **Python friction** for a student new to Python. | The game could become a Python course with maths attached. | Prologue primer; Assemble and Fill modes; a small language subset; plain-word errors tied to the picture; every chapter's Show me also plays the code being written. |
| **Code becomes formula typing,** which is rote learning in another form. | This is the failure the user most wants to avoid. | The code always comes last, after the picture and the by-hand work. The formula is uncovered from the player's own trace ("numbers become names") rather than given. The swarm shows failures as pictures. The handover tests understanding beyond the code. |
| **Free-text explanations cannot be graded reliably** offline. | A fake grade would teach the wrong thing. | The handover is graded by consequences (Dev's run). Free text is self-assessed against Ilse's note and a key-idea checklist, and never blocks. Architect text uses a pattern match only to suggest which key ideas the player covered; the player confirms. |
| **Wording rules drift** in dialogue, tiles, error messages and voice scripts. | Banned words, analogies or personified maths objects would break the house style the student relies on. | Extend the site's existing wording check (`npm run check:wording`) to dialogue YAML, tile text, error strings and docstring prompts. Add "kernel" and machine metaphors to the list. A voice guide per character. Maths objects never take verbs of wanting or liking. |
| **Terms before they are earned.** The title is BASIS; grey crew-version nodes could show names like `svd` early. | House rule 4. | `basis` is a filename until Chapter 16, which pays it off on screen. Crew-version nodes show their chapter's question ("What does any matrix do to a circle?") until that chapter has been opened. An earned-terms linter checks every string against each chapter's declared terms. |
| **Player code breaks the game** or runs too slowly. | A wrong `matmul` could make the world unplayable. | The World always runs the last passing version. Bug mirror shows a failing version in a sandboxed copy. Instruction budgets stop infinite loops. If a passing version is too slow for per-frame use, the engine uses it at a lower update rate and the honesty overlay says so. |
| **Gating creep.** A story order with stars and pars can slide into locks. | Brief 2b: nothing locked. | All chapters open from the start; crew versions fill any missing function; Show me and Skip on every challenge; a test fails the build if any route requires completing a puzzle. |
| **Colour-blind players** cannot tell green from red. | The house colours are a classic confusion pair. | Shape and dash cues, letter labels, and an alternative palette (Section 6.3). |
| **Voice production.** Mispronounced terms, many regenerations. | Mispronounced maths terms undermine trust. | Pronunciation lexicon, per-line hashing, a listening pass on every new term, and subtitles as the source of truth. |
| **Wrong numbers.** | One wrong number in a puzzle or a line of text breaks trust in the whole game. | Every number shown in text is bound to a computed value, as on the student's site (DECISIONS 20). Unit tests recompute every puzzle answer. |
| **Story crowds out maths.** | The brief asks for the story to frame the work, not replace it. | Story beats are skippable and under 90 seconds. Each chapter's puzzles were designed before its story (Appendix B lists them), and the world problem is always stated in literal terms. |
| **No GPU for asset production.** | Cycles rendering on a 4-core CPU is slow. | The real-time look comes from shaders. Cycles is used only for about ten stills. Models are low-to-mid poly with baked AO. |
| **"Your code runs the world" overclaims.** | If the claim is not true, the student will notice. | The honesty overlay labels every system as yours, crew version, or engine (Section 3.2). |

---

## Appendix A. Engine and testability

**Chapter definition (TypeScript data, one file per chapter).**

```ts
interface ChapterDef {
  id: string;                 // "ch11"
  node: string[];             // ["N12", "N13"]
  heading: string;            // plain question
  world: WorldBeat;           // incident text, voice line ids, world state changes
  bench: BenchSpec[];         // which Bench components, with initial state
  puzzles: PuzzleDef[];       // setup, win(state) => boolean, solve(): Action[], showMe script, prediction
  termsEarned: TermDef[];     // term, the puzzle after which it is named, one-sentence definition
  build: FunctionTask[];      // signature, assemble tiles, fill template, reference source, test generator, edge cases, par
  install: InstallSpec;       // which engine hook the function replaces
  handover: { keys: KeyIdea[]; tiles: Tile[]; cases: Case[] };  // each KeyIdea names its misconception behaviour
  audit?: Claim[];            // act-end chapters only
  cue: string;
  realUse: string;
}
```

**Debug API (window.__basis).** `goto(ch, puzzle)`, `state()`, `solve(puzzleId)`, `showMe(puzzleId)`, `setCode(fn, source)`, `runSwarm(fn)`, `install(fn)`, `handover(chId, card)`, `audit(actId, claimId, benchState)`, `tickets.next()`, `exportLibrary()`.

**Headless test plan (Playwright and unit tests).**
- Every puzzle at every difficulty: `solve()` reaches a state where `win()` is true; `showMe()` reaches the same.
- Every reference function passes its swarm; every listed decoy line or misconception version fails at least one case.
- Every handover: the full card passes; removing each key idea fails on the case it is meant to fail on, and only that case.
- Every audit claim: the reference counterexample or demonstration satisfies the predicate.
- Language conformance: reference programs and a corpus of student-style programs give the same results in CPython (at build time) and in the in-game compiler. The exported `basis.py` imports and passes its tests in CPython.
- Wording linter and earned-terms linter on all player-facing strings, including voice scripts.
- Performance: frame time with the player's `matvec` on 2,400 points and with the 18,000-triangle lighting pass, at 1080p.
- No-gating test: every chapter, puzzle and function task is reachable from a fresh save.
- Screenshots of every chapter at 1440 and 390 pixels wide, with no console errors and no sideways page scroll.

## Appendix B. Numbers checked in NumPy

| Where | Claim | Checked value |
|---|---|---|
| Ch 2 | (1, 2) + 2·(3, 1) = (7, 4) | yes |
| Ch 5 | (1, 2, 0) × (0, 1, 3) = (6, −3, 1), length √46 | 6.782 |
| Ch 6 | (2, 0, 0) · ((0, 3, 0) × (1, 1, 4)) = 24, also with c = (3, −2, 4) | 24, 24 |
| Ch 6 | Clamps P, Q, R, S coplanar | det = 0 |
| Ch 7 | (2, 1, 2) × (1, −1, 0) = (2, 2, −3) | yes |
| Ch 9 | Without a swap, ε = 10⁻²⁰ gives x = 0; true answer (1, 1) | x = 0.0 |
| Ch 14 | 10 × 10 cofactor expansion ≈ 6.2 million multiplications; elimination ≈ 340 | 6,235,300; 330 + 9 |
| Ch 17 | P·diag(2, 1)·P⁻¹ = [[1.5, 0.5], [0.5, 1.5]] | yes |
| Ch 18 | Eigenvalues of [[4, −2, 0], [−2, 4, 0], [0, 0, 9]] are 2, 6, 9 | yes |
| Ch 19 | [[3, 1], [0, 2]]¹⁰·(1, 1) = (117074, 1024) | yes |
| Ch 19 | [[1, 1], [0.25, 1]]¹⁰·(4, 0) ≈ (115.33, 57.66) | yes |
| Ch 19 | F₅₀ = 12,586,269,025 | yes |
| Ch 20 | Steady state of [[0.8, 0.1], [0.2, 0.9]] is (1/3, 2/3); other eigenvalue 0.7 | yes |
| Ch 20 | Relay ranks C 0.394, A 0.373, B 0.196, D 0.038; 13 iterations to 10⁻³ | yes |
| Ch 21 | Projection of (1, 2, 3) onto span{(1, 1, 0), (0, 1, 1)} = (1/3, 8/3, 7/3) | yes |
| Ch 23 | Fits y = 7/6 + t/2 and y = 0.9 + 0.9t | yes |
| Ch 23 | Orbit line 411.98 − 1.006t, crosses 380 km at t ≈ 31.8 h; degree-5 curve gives −316 km at t = 10 | yes |
| Ch 25 | Singular values of [[3, 0], [4, 5]] are 3√5 and √5 | 6.708, 2.236 |
| Finale | Blob (radius ≤ 1) gives \|x\| + \|y\| ≤ 1.42; ring (radius 2 to 3) gives ≥ 2 | by inequality |
