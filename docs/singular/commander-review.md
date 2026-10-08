# Commander, story skipped: review of every chapter

Review only: nothing here has been applied. Each finding was found by an agent playing every puzzle on Commander with no scenes before it (screenshots and goal text), then checked by a second agent that dropped style preferences and any fix that would give answers away.

Chapter 18 is not listed: it was reworked first and is the reference.

| Chapter | Confirmed | Blockers | Majors | Minors |
|---|---|---|---|---|
| c00 | 8 | 0 | 4 | 4 |
| c01 | 10 | 0 | 5 | 5 |
| c02 | 9 | 0 | 8 | 1 |
| c03 | 10 | 1 | 8 | 1 |
| c04 | 8 | 0 | 4 | 4 |
| c05 | 9 | 1 | 6 | 2 |
| c06 | 8 | 0 | 6 | 2 |
| c07 | 10 | 2 | 6 | 2 |
| c08 | 8 | 0 | 5 | 3 |
| c09 | 10 | 1 | 7 | 2 |
| c10 | 9 | 2 | 7 | 0 |
| c11 | 9 | 1 | 6 | 2 |
| c12 | 7 | 1 | 4 | 2 |
| c13 | 8 | 0 | 5 | 3 |
| c14 | 9 | 1 | 5 | 3 |
| c15 | 10 | 0 | 8 | 2 |
| c16 | 10 | 2 | 5 | 3 |
| c17 | 10 | 1 | 8 | 1 |
| c19 | 10 | 1 | 7 | 2 |
| c20 | 9 | 1 | 8 | 0 |
| c21 | 9 | 1 | 7 | 1 |
| c22 | 10 | 0 | 7 | 3 |
| c23 | 9 | 2 | 5 | 2 |
| c24 | 10 | 1 | 7 | 2 |
| c25 | 10 | 2 | 3 | 5 |
| c26 | 10 | 2 | 5 | 3 |
| c27 | 9 | 1 | 6 | 2 |
| **All** | **248** | **24** | **162** | **62** |

## c00

### c00-1 · c00-p1 · major

**Problem.** On Commander the player is told to drag the arrow 'onto the beacon'. The beacon is drawn as a ring about 0.3 squares wide, but a hit only counts within 0.05 of its centre, which is about 4 pixels. Commander has no snapping, there is no readout of where the arrow tip is, and a miss gives only a miss sound before the ship flies back. A player who puts the tip inside the ring, presses Fire and watches the ship stop inside the ring still gets 'miss', with no reason. Par is 1, so that one honest-looking miss costs two stars. They also never get the typed input that Commander promises.

**Proposed fix.** On Commander, give BurnChain an opt-in typed mode, ideally in kit/flight.ts so c01 can reuse it later. Add one VectorInput per free burn to the dock, with rows labelled across and up. The boxes start at (1, 0) to match the drawn arrow. Typing calls chain.setBurn so the arrow is drawn exactly as typed, and dragging, if left on, writes back into the boxes. Typing does not count a move; only Fire does. Keep the exact hit test for typed input. Commander goal: 'The ship flies along the **green** arrow: so many squares across, so many up. Type the arrow that ends on the beacon, then **Fire**.' Don't show the beacon's coordinates. Reword hint 2 to 'Put the arrow tip on the centre of the ring, where the grid lines cross.' The miss message is optional; the ship's stopping point is already visible. If drag stays on any level without snapping, make the hit test match the picture: near(end, [3,2,0], 0.25), the ring's inner disc.

### c00-2 · c00-p2 · major

**Problem.** A story-skipper doesn't know what the faint rings are, what 'the pulse' is, or that the reference buoys used to be a straight white line and an evenly spaced cyan row. The only text that explains the rings is the optional prediction card, and even that covers only the white rings. That card has its own Skip button, which this player presses. It also disappears on the first drag, on Scan, or once a choice is picked. After that the goal's 'Call it first' points at nothing, and the title 'Are they still in a line?' has no 'they'. The player can follow the steps (Scan, ruler, step) without knowing what question the steps answer.

**Proposed fix.** Use the auditor's self-contained goal, trimmed: 'A **pulse** just moved every buoy (dot) at once. The faint rings mark where the reference buoys were before it: three **white** in a straight line, four **cyan** evenly spaced in a row. Did the move keep them that way? (Predict first if you like.) Press **Scan** to light where those buoys are now. Lay the **ruler** through the three white buoys (drag its two ends; they snap to buoys). Then drag the **step** arrow's tip from the first cyan buoy to the next: its faint copies test the other gaps.' New title: 'Are the reference buoys still in a line? Still evenly spaced?' Reword the subgoals as actions, not results: 'Ruler laid through the white buoys' and 'Step laid from the first cyan buoy to the next'. The maths is unchanged, and nothing about how to place the ruler or the step is given away.

### c00-3 · c00-p3 · major

**Problem.** The screen is a tangle of thin lines between bright dots, a few dim dots at the corners and a glow in the middle, and the goal explains none of it. 'Exactly where it was' and 'before / after' do not say before or after what (a skipper never saw the pulse). What the lines mean ('each thin line joins a buoy to where it was') is only in hint 1. Lines are drawn only for buoys within 3.2 squares of the centre, so most buoys on screen have no line, and 'the one with no line' is not unique. The pulse maps grid points onto grid points, so both ends of every line sit on bright buoys and nothing shows which end is 'was' and which is 'now'. The dim old-position dots show only in the corners, where they look like the grid fading out.

**Proposed fix.** Goal: 'A **pulse** moved every buoy (dot) at once. **Show before** plays the move backwards so you can watch; **Show after** plays it forwards again. Each thin line joins a buoy's spot before the pulse to its spot after (lines are drawn only for buoys that started near the middle). Click the one buoy that is exactly where it was.' Leave out the dim-dot sentence. Drawing the 3.2 patch as a faint circle, and fading or arrowheading the lines, are optional. They are not needed to understand or solve the puzzle, FatSegments has no per-vertex colour, and the circle would centre on the answer.

### c00-4 · c00-p3 · major

**Problem.** Show me waits 300 ms, lights the centre buoy and wins. The 'Shown' card under it is empty. The only explanation is LANTERN's win lines, which this player skips. They see the middle dot turn cyan and learn nothing about why it is the one, the same complaint they had about Chapter 18's Show me.

**Proposed fix.** Show me plays Show before, then Show after, once, using the existing toggle; it should end in the 'after' state. To do that, factor the click handler into pick(i). Show me then picks one buoy near the middle (orange highlight, orange line from its old spot), lights the centre buoy, and ends on one line of why. Suggested line: 'Every other buoy travels along its line. The middle buoy's spot before and its spot after are the same point, so it has no line: the pulse leaves the middle point where it is.' Avoid '(0, 0)', since this screen has no axes. To show the line, either add an optional `why?: string` to PuzzleDef and render it in runner.winCard after the prediction block, which also fixes the empty Shown card everywhere, or, smaller and c00-only, call p.setGoal(why) at the end of showMe, since the objective card stays up through the win card. c18 used its own message area for this.

### c00-5 · c00-p1 · minor

**Problem.** Show me slides the arrow to the beacon and fires. The 'Shown' card is empty, and there is no try and no reason, so it shows the answer without the reasoning (count across, count up, the ship flies along the arrow).

**Proposed fix.** Show me first fires (2, 3), which misses because across and up are swapped. Then it moves to (3, 2) and fires. On Commander with typed input (c00-1), it fills the boxes at each step so the input matches the picture. End on a why line, through the same mechanism as c00-4: 'The beacon is 3 squares across and 2 up from the ship. The ship flies exactly along the arrow, so the arrow must be (3, 2); (2, 3) lands somewhere else.'

### c00-6 · c00-p2 · minor

**Problem.** Before Scan, the ruler's two end handles are the brightest white things on screen, so they look like the 'white buoys' the goal talks about, while the real white buoys are still unlit. One handle also sits exactly on the first cyan ring and hides it, so the player sees only three of the four cyan old spots.

**Proposed fix.** Start the ruler's ends on plain buoys away from every ring, for example (-8, 0) and (-6, 3). I checked: both are buoy positions, both sit clear of the goal card, and the extended line misses every white and cyan ring and every scanned white and cyan buoy. Both ends still have to move, so the minimum stays at 3 moves. Pass label: 'ruler' to one end's Dot (Dot already supports labels), to match the 'step' label. Leave out the hollow grab rings; that is extra work for little gain.

### c00-7 · c00-p2 · minor

**Problem.** Par is the bare minimum. Both ruler ends and the step arrow each count a move when dropped, so 3 moves is the least possible, and par is 3. One test placement or one snap to the wrong buoy costs the second and third stars, so checking your work is punished.

**Proposed fix.** Set `par: 5, // 3 drags minimum; testing and re-snapping must not cost stars`.

### c00-8 · c00-p3 · minor

**Problem.** A wrong click shows 'It started at (x, y)', but this screen has no axes and no labelled origin. The origin is only set after the win, so the player cannot find that point. The orange line is the part that helps, and the text does not mention it.

**Proposed fix.** Change the wrong-click bark to: 'That buoy moved: the orange line runs from where it was to the buoy you clicked.' Change the third-miss bark to: 'In the middle, by the faint light: look for the buoy with no line.'

## c01

### c01-1 · c01-p6 · major

**Problem.** On Commander the goal ends "Set the tether." There is nothing on screen called a tether and nothing to set. What the player gets is an "ORDER THE STEPS" panel that the goal never mentions. Nothing says the task is: put the three tiles in order, press Check order, then type the working, with only the final length checked. The 3-D view has no floor or grid either, so "the right triangle on the floor" has to be guessed from a few dashed lines.

**Proposed fix.** Use the C18 pattern: in the Commander branch call p.setGoal: "How long is the arrow **(2, 3, 6)**? The tether must be exactly that long. Two right triangles get you there: one lying flat on the floor (the dashed lines and the yellow diagonal), then one standing up (the yellow diagonal, the dashed upright and the green arrow). First click the three steps into **Your order** and press **Check order**. Then work them through and type the length. Only the length is checked." In the Navigator branch, use the same text without the ordering sentence AND without 'Only the length is checked', because Navigator checks every step. Cadet keeps its current goal, since it really has a tether slider.

### c01-2 · c01-p4 · major

**Problem.** The tether answer only works as a 2-decimal number, and the screen never says so. If the player types the exact answer, √34 or sqrt(34), nothing happens at all: no tick, no message, no move. It looks broken. If they type 5.8 (√34 to one place), they get "Not this. Check your working above.", which suggests the burn they already got right is wrong. Separately, on Commander both prompts print the working: "Burn Q − P = (6 − 1, 1 − 4)" and "Tether length: √(5² + (−3)²)". This is the difficulty where the player is meant to work these out (the GDD says Commander types "exact √34"), and the burn prompt is word for word Hint 1.

**Proposed fix.** (1) In parseNum, accept √n, sqrt(n) and k√n. Whitespace is already stripped, so handle 'sqrtn' too. This change is shared, so it also fixes the silent failure in p5's distance box. When a cell cannot be read, StepWorksheet (and the p5 box) should show a message with neutral examples that are not this puzzle's answer: "Can't read that. Type a number such as 2.5, 3/4 or √5." (2) In the tether row, state the accepted format up front through the Step `suffix`: "(2 decimal places, or exact)". Give a value within 0.05 of the answer but outside the tolerance its own message: "Close. Give it to two decimal places, or exactly." Do not name √34. (3) On Commander only, use the prompts "Burn $Q - P$" and "Tether length: the straight-line distance from P to Q" (no ‖·‖ yet). Navigator keeps the expanded prompts.

### c01-3 · c01-p2 · major

**Problem.** This also applies to c01-p5. The player can work out the burn, (−1, 3) here or (−3, −4) in p5, but there is nowhere to type it. The only control is dragging the green tip, which does not snap on Commander, and the win needs the ship within 0.05 of a grid step (about 5 pixels). Par is one Fire in p2 and two moves in p5, so firing at (−0.97, 3.06) misses and costs the stars for a sum they got right. Readout values like "(−0.97, 3.02)" also make them wonder whether the answer is meant to be a whole number. In p2 the beacon's position (3, 2) is not on screen (it is only in Hint 1), so it has to be counted off an unnumbered grid.

**Proposed fix.** As the auditor proposes. On Commander, add a VectorInput 'your burn' to the dock above Fire, starting at (0, 1) in p2 and (−1, 0) in p5 so it matches the drawn arrow. Typing calls chain.setBurn(0, v). A drag writes the value back with vin.set(v, false) from BurnChain onChange, but only while the cells are not focused. Commander p2 goal through p.setGoal: "The grey arrow is the autopilot's burn, already flown: the ship is at its tip. Type (or drag) the green burn so the ship ends on the beacon at (3, 2), then **Fire**." Keep the tolerance and par as they are.

### c01-4 · c01-p1 · major

**Problem.** This also applies to c01-p4 and c01-p5. After Show me, the card at the top says "SHOWN" and nothing else. The pieces jump to the answer with no failed try first and no reason. p1: the sliders go to 2 and 3 and it fires. p4: 5, −3 and √34 are filled in and the markers jump into place. p5: the burn becomes (−3, −4) and 5 is typed. The only explanations are the win lines this player skips ("Two of one, three of the other…", "Docked at Q…", "Home in one. And five steps out…"), so they learn the answer but not why it is right.

**Proposed fix.** Add an optional `why?: string` (markdown) to PuzzleDef. No name clash: CodexEntry's `why` is a different type. Render it in winCard when the outcome is 'shown', after the reveal if there is one. p1: Show me first plays the wrong try (3 of A and 2 of B, which ends at (8, 7)), and it must also update sa, sb, a and b so the sliders and readout match. Then it plays 2 and 3. Use the auditor's why lines for p1, p4 and p5 as written. p5: first fire (3, 4), the sign mistake, then (−3, −4). Sliding the p4 markers along the route is optional polish.

### c01-5 · c01-p6 · major

**Problem.** If Show me is pressed before the steps are ordered, the ORDER THE STEPS panel stays as it was, with Your order still empty. A different worksheet appears below it, "Tether length: √(2² + 3² + 6²)", filled in with 7, and the Shown card is blank. So Show me never shows the order, never shows 13 or 49, and uses a one-line formula that skips the floor-then-up method the goal asks for. The screen ends looking half-finished. The only reason given is Bram's "Seven. Floor first, then up.", which this player skips.

**Proposed fix.** Hoist `tiles` and the onSubmit handler into a named submit(order) so Show me can reuse them. On Commander, Show me calls tiles.set(['root','floor','up']) and submit, which triggers the existing 'Start on the floor' bark. Then it calls tiles.set(['floor','up','root']) and submit, which removes the tiles and builds the 3-step worksheet, and then ws.showMe fills 13, 49 and 7. If the order was already done, it just runs ws.showMe. Pulsing the diagonal and the upright is optional. Set the why (through c01-4's field) to the auditor's line: "Floor: the yellow diagonal has length² 2² + 3² = 13. Standing up: that diagonal and the height 6 are the two short sides, so length² = 13 + 6² = 49, and the length is 7. Same as √(2² + 3² + 6²)."

### c01-7 · c01-p6 · minor

**Problem.** The step tiles already sit in the right order (floor, up, root), so "Order the steps" is solved by clicking them top to bottom. After that the prompts print "2² + 3²", "13 + 6²" and "√49", and the picture labels the floor diagonal √13. On Commander the only checked value is the 7 in "√49". For a player who wants to think, the derivation has been done for them.

**Proposed fix.** In TileOrder, after the hash sort, if the tray order of o.tiles equals the given (solution) order, rotate the tray by one. This is a small kit change and covers every chapter that uses TileOrder. Do not rely on the order the tiles are passed in. On Commander only, label the yellow arrow 'floor diagonal' instead of √13, and use the prompts "Floor diagonal squared", "Whole length squared" and "Length", with no arithmetic. Navigator keeps the worked prompts.

### c01-8 · c01-p5 · minor

**Problem.** The three strikes' numbers are said only in the scene this player skips. On screen they are three unlabelled grey arrows. Strikes 2 and 3 form a thin wedge between (−1, 6), (2, 5) and (3, 4), so it is hard to tell which arrow is which or read their parts. The readout lists only "your burn". p2 does list its grey burn ("autopilot (4, −1)"), so the two puzzles disagree.

**Proposed fix.** Add grey readout rows 'strike 1 (2, 5)', 'strike 2 (−3, 1)' and 'strike 3 (4, −2)' in colour #9aa7bd, as p2 does for the autopilot. Do not add the ship's position or the total.

### c01-9 · c01-p3 · minor

**Problem.** The goal gives all three jobs at once, sweep and drag included, before either buoy is reached. The draggable beacon C marker starts under the Predict card (its pad is cut off by the card's bottom edge). Par 3 is exactly two Fires plus one drop. So a single test Fire, for example k = 1.5 to check whether C is reachable (the very question the puzzle is about), loses the par star. So does dropping C before the sweep, which the game rejects but still counts as a move.

**Proposed fix.** Staged goal. Start: "Thruster two only pushes along **(2, 1)**: the burn is k(2, 1). Set the amount k, then **Fire**. Reach both buoys from the start." Once both buoys are reached, call p.setGoal("Now sweep k from −4 to 4 to draw every point the thruster can reach. Then drag beacon C's marker onto the **out of reach** pad."). Set P3_PAR to 5. Move p.move() below the sweep check so a rejected 'sweep first' drop is free. Leave the view and the card as they are.

### c01-10 · c01-p4 · minor

**Problem.** Before the player does anything, two glowing dots labelled "halfway" and "quarter" sit at (1, 1) and (2, 0.5), off the route. They look like the game showing where halfway is, not like markers waiting to be moved. The goal says "drop markers halfway and a quarter of the way" but not that these dots are the markers, or which end the quarter is measured from. Every drag counts a move and par 5 is the exact minimum, so adjusting a marker once costs the star.

**Proposed fix.** Goal: "The ship is at **P = (1, 4)**; the dock is at **Q = (6, 1)**. Type the burn $Q - P$, then the tether length (the straight-line distance from P to Q). **Fire** unlocks when both are right. Then drag the two yellow markers onto the route: one halfway from P to Q, one a quarter of the way from P." Park both markers together in an empty corner, labelled 'halfway marker' and '¼ marker'. Set P4_PAR to 7, which is simpler than counting only drops that land on the line.

### c01-6 · c01-p3 · minor

**Problem.** This also applies to c01-p2. In both puzzles the Shown card explains the prediction, not why the answer is right. p3: the card says the thruster reaches "nothing off" its line but never says why beacon C at (3, 2) is off it. In the Show me picture the swept line glows straight through the "beacon C" label, so by eye the beacon looks reachable. The player is simply told to file it as out of reach. p2: the card explains that the order of the two burns does not matter, but never why the green burn is (−1, 3).

**Proposed fix.** Use c01-4's `why` field. p3: "(3, 2) would need k = 1.5 to go 3 across, but then up is 1.5, not 2. No single amount gives both." p2: "The autopilot left you at (4, −1). The beacon is at (3, 2): 3 − 4 = −1 across, 2 − (−1) = 3 up." Move beacon C's label above its pad with padC.label?.object.position.set(0, 0.64, 0) so the swept line no longer crosses it.

## c02

### c02-1 · c02-p4 · major

**Problem.** On Commander the 'by hand' panel has already done the substitution, and its last row prints the answer. Only that last row is checked, and its answer is (4, 7): the beacon, which is already in the title. Typing 4 and 7 ticks 'Find the weights by hand', and LANTERN then states the weights. A player who came to think is handed a = 1, b = 2 twice. The kicker 'ONLY THE ANSWER IS CHECKED' is also confusing, because the thing checked is the beacon, not the weights.

**Proposed fix.** Commander only; Cadet and Navigator stay as they are. Replace the four steps with ONE vector row, 'Weights (a, b) =', answer [1, 2]. A single row is checked as a whole. Drop the solved substitution prompt and the 'Check: 1[..] + 2[..]' row. Add mistakes that say where a wrong pair lands without giving the right one, e.g. [[-1, 6], 'That lands at (4, 17), not (4, 7). Check the sign when 12 moves across.']. Kicker: 'By hand · type the weights'. Commander goal: 'Find the weights a and b with a(2, 1) + b(1, 3) = (4, 7): one equation for across, one for up. Solve them by hand, type (a, b) in the sheet, then set the dials and Fire.' On Commander the onDone bark becomes 'Weights checked. Set the dials and Fire.'

### c02-2 · c02-p6 · major

**Problem.** The goal says to slide R and watch its dials, but on Commander sliding R completes nothing. What is actually checked is the tile panel 'Why is R reachable? Order the steps'. After that, a 'The last line: Dials of R at t = 2' box appears, and neither it nor t = 2 is mentioned in any goal. The purpose is also missing. The title asks 'Why is the glow flat', but this stage shows no glow and a top-down view where everything looks flat. Nothing on screen says that 'flat' means 'the whole line through any two reachable points is reachable'. That link exists only in Bram's skipped line. Meanwhile the readout note repeats the final tile word for word.

**Proposed fix.** Commander goal: 'Why is the glow flat? Flat means: if two points are reachable, so is every point on the straight line through them. P (dials 1, 0) and Q (dials 0, 1) are reachable. R = P + t(Q − P) runs along their line: drag R to see it. Put the proof that R is reachable for every t in order (one tile is a decoy).' When lastLine() opens, call p.setGoal('Last line: type the dials (a, b) that reach R at t = 2, past Q.'). That way the second step appears only once the first is done. On Commander, skip r.note(...). Give Navigator the same first three sentences in place of 'slide R'. The subgoal text can stay.

### c02-3 · c02-p1 · major

**Problem.** On Commander the yellow dot pattern that fills the screen at the start is never named, so it looks like a background texture. The Commander goal replaces the default goal and loses its first sentence, the one that says what the glow is. 'Reach' (any a·v + b·w) is defined only in the skipped holotable line and the In-short card. The readout's 'the whole deck' uses a story word for the plane. This is the same gap as the Chapter 18 complaint 'What does the yellow have to do with my green'. p5 repeats it: 'Turn both dials and watch the glow', with nothing saying the glow is every point a·v + b·w has visited.

**Proposed fix.** Use the auditor's p1 Commander goal: 'The yellow glow marks every point you can reach as a·v + b·w, for any numbers a and b. With w = (2, 1) it covers the whole plane. First, by hand: type the value of k that puts w = (2, k) on the line of v = (1, 2). w moves there; watch the glow collapse to that line. Then drag the beacon to a point no a·v + b·w can reach.' Readout row (:98): label 'the glow (every a v + b w) covers', values 'the whole plane' / 'one line'. p5 goal: 'Thruster three now pushes along w = (−4, −2). Turn both dials: the glow marks every point a·v + b·w the yellow tip has visited. Then drag the beacon to a point this pair cannot reach.'

### c02-4 · c02-p7 · major

**Problem.** One colour is shown in two scales and two orders. The goal uses 0 to 1 ('warm (1, 0.5, 0)'). The readout uses a hidden ×3 scale: 'g (0, 3, 0)', 'tip lands at (3/2, 3/2, 3/2)', and in part 2 'h (3, 3/2, 0)' for the lamp the goal calls (1, 0.5, 0). The Mix miss line gives amber in red, green, blue order, but the dials run green, red, blue. A player who types the numbers in dial order (g = 1, r = 0.6, b = 0.2) misses. Amber's numbers appear nowhere before the first miss. On Commander the tolerance is 0.025 per channel, so matching the swatch by eye is guessing, not linear algebra. The readout equation also colours warm and cool green and red, while their arrows are orange and blue.

**Proposed fix.** Add an optional print scale to DialRig (e.g. o.unit, default 1) that divides the arrow, tip and landing vectors in updateReadout. p7 passes unit: SC. The drawing is unchanged, and the readout then shows g (0, 1, 0), tip lands at (0.5, 0.5, 0.5), warm (1, 0.5, 0). Name the channels wherever numbers appear. Part 1 goal: 'Set the dials so your mix lands on amber = (red 1, green 0.6, blue 0.2), then press Mix.' The miss bark already gives this after one try. Miss bark: 'Your mix is red x, green y, blue z. Amber is red 1, green 0.6, blue 0.2.' Optional: reorder the dials to r, g, b so they match the x, y, z axes and the probe sliders. If you do, pass explicit colors, and in updateReadout colour each term with o.colors (\color{#hex}) when given rather than MACRO[i]. The same change fixes part 2's green and red brackets around the orange and blue lamps, if that readout survives c02-5.

### c02-5 · c02-p7 · major

**Problem.** In part 2 the player controls only the probe, through three sliders that show no numbers. The readout shows a two-lamp mix instead ('dials a = 0.5, b = 0.5, tip lands at (3/2, 3/2, 3/2)'), and the stage draws a ½h + ½c chain, but the player cannot change either one. So the numbers on screen are not linked to what the player controls, and on Commander they drag instead of typing. The rule they need to find (in every warm and cool mix, green is the average of red and blue) cannot be reasoned out without the probe's numbers.

**Proposed fix.** Fill the empty span with the live probe value on every difficulty. Replace rig2's readout and its static chain with a readout of warm (1, 0.5, 0), cool (0, 0.5, 1) and probe (r, g, b) in colour units. For example, give rig2 readoutTitle: null and preview 'never', and keep its glow. Do not show the probe's distance to the plane. Typed probe boxes on Commander are optional. If you add them, clamp them to [0, 1] and use a step of 0.05: the minimum off-plane distance is then 0.0204, still ≥ P7_OFF = 0.02. Without the clamp, an out-of-cube probe falls through to the wrong bark, 'Off the plane, but only just'.

### c02-6 · c02-p2 · major

**Problem.** After Show me on p2, p4, p6 and p7, the result card reads only 'SHOWN' with nothing under it. The dials jump to the answer and fire, so the player sees that the answer works but not why. In p6 on Commander, Show me drops the tiles into the right order and removes the panel 0.7 s later, too fast to read. Whatever explanation exists is in the onWin scene lines (p2Win 'Two of one, one of the other', p6Win, p7Win), and this player skips those.

**Proposed fix.** Add an optional `shown` field (markdown) to PuzzleDef and print it in winCard when the outcome is 'shown'. Do not render the card when there is nothing to print. This is an additive change to the runner, so other chapters are unaffected until they set the field. p2: fire (1, 1) first (lands at (3, 4), gap shown), then (2, 1). Why: 'Across 2a + b = 5 and up a + 3b = 5 give a = 2, b = 1.' p4: 'a(2, 1) + b(1, 3) = (2a + b, a + 3b). Across: b = 4 − 2a; up: a + 3(4 − 2a) = 7, so a = 1, b = 2.' p6: keep the ordered tiles on screen for about 3 s. Why: 'R = (1 − t)v + t·w: its dials are plain numbers for every t, so the whole line through two reachable points is reachable; that is why the glow is flat. After the unlock every reachable point is (a, b, a + b), so (1, 1, 0) sits 2 below the plane.' p7: probe (1, 1, 1) first (a mix: 1 warm + 1 cool), then (0, 1, 0). Why: 'Every warm and cool mix is (a, (a + b)/2, b): green is the average of red and blue. Pure green (0, 1, 0) breaks that.'

### c02-8 · c02-p3 · major

**Problem.** Every dial edit (typed box or slider release) and every Fire counts as a move. p3 starts at dials (1, 1) and needs (−1, 2): change a, change b, Fire is 3 moves, over par 2. So even a perfect first-try Commander solve cannot earn the second or third star. The only way under par is dragging the yellow tip, which is invisible on Commander. In p2 (par 2: change a, then Fire), a single test Fire costs a star, although testing a landing is how this puzzle is meant to be explored.

**Proposed fix.** Follow Chapter 18 ('par: 8 // testing … must not cost stars') and raise par in c02 only: p2 to 4 (edit, test Fire, edit, Fire) and p3 to 5 (edit a, edit b, test Fire, edit, Fire). In DialRig's typed commit, call p.move() only when the value differs from this.dials[i], so Enter followed by blur counts once. That is a bug fix and safe for c03 too. Leave the move policy unchanged otherwise.

### c02-7 · c02-p3 · major

**Problem.** At the start, the optional Predict box sits exactly on top of the beacon at (0, 5). The player sees two arrows and a ship but not the target until they answer or skip the prediction.

**Proposed fix.** In p3 only, change the view to center [0.6, 4.3], height 12 (75 px per unit at 900 px). The beacon centre lands at y ≈ 398, with the ring clear below the card. The start lands at about (675, 772). The backward first leg's end (−2, −1) lands at about (525, 847): on screen, and right of the dock (x < 383). Leave the general 'Predict box avoids the target' runner change for later.

### c02-9 · c02-p1 · minor

**Problem.** The goal asks the player to type k 'First, by hand', but on Commander the tip of w can be dragged before anything is typed. Dragging it to (2, 4) collapses the glow, and LANTERN announces the answer, so the hand step becomes 'read the bark, type 4'. The goal's 'Then drag the tip of w to it' is also redundant, because typing k already moves w there.

**Proposed fix.** On Commander, call w.setEnabled(false) at setup. In go(), move w to (2, x) for EVERY parsed k, right or wrong (void w.moveTo([2, clamp(x, −3, 8), 0], 400)), so the glow shows the typed value honestly. Keep typedOk and the subgoal tick only for x = 4, and re-enable the handle after that if you want free play. The goal wording 'w moves there; watch the glow collapse' is already folded into c02-3's goal. Typing k does not count a move, so par 2 (one beacon drag) still holds.

## c03

### c03-1 · c03-p5 · blocker

**Problem.** On Commander there is a hidden first task, and its instructions are covered up. The goal only says to land on the white tip and Fire. But the game won't finish until the player puts a set of proof steps in order, and only after that does the "Write the loop" box appear. The tile panel is taller than the screen, so its title, its "Steps" and "Your order" labels, and the first tile all sit behind the goal card. What the player actually sees is a column of loose statements, an empty area to the right, and a "Check order" button. If they do what the goal says (set the dials, Fire), the loop closes, the ship flies home and the first subgoal ticks. Then nothing happens and nothing explains why. The goal also never says what a "loop" is or what "LANTERN closes the loop" means.

**Proposed fix.** 1) Commander setGoal that names the three steps but stays compact, so the goal card does not grow into the dock. For example: 'Bram picked four arrows; a₄ is white. A **loop** is a firing, dials not all zero, that ends back at the start. **1.** Put the proof of why four arrows always loop in order: click steps into *Your order* (one step does not belong), then **Check order**. **2.** Set $c_1, c_2, c_3$ so the yellow tip lands on the white tip, and **Fire**. **3.** Type the loop’s four dials.' 2) Subgoals come from the PuzzleDef and are shared by every difficulty (hud.setObjective). If a third subgoal is added, word it so it fits every difficulty ('Say why there is always a loop'), ticked at setup on Cadet and by the choice on Navigator. Otherwise leave the subgoals as they are. 3) Standard 5: on Commander, hide the dial rows and Fire until Check order passes. TileOrder already takes a `mount` option, so the tiles can go in their own container; or add a small show/hide to DialRig. Re-take the screenshot to confirm that the top of the dock clears the goal card. Only add a per-puzzle max-height with overflow-y:auto if it still overlaps. Do not change .dock globally.

### c03-2 · c03-p2 · major

**Problem.** A player who skipped the story doesn't know which plane the title means, what the big yellow band is, or why there is a SIGNAL beacon in the scene. The goal never mentions the band or the signal. That is the same complaint as Chapter 18's "what does the yellow have to do with my green". The reason this puzzle exists (the ship is stuck on a plane, the signal is off it, and the spare was bolted on to lift the ship off but failed) is only said in the skipped cold open. Also, at the start the tip of the spare's arrow and its "spare" label are hidden behind the PREDICT FIRST panel. That tip is the very point the player has to land on.

**Proposed fix.** Use the proposed goal, but name the thrusters the way the readout does (the readout lists them as v and w, not 'thruster two/three'). For example: 'Thrusters two ($\cg{\mathbf v} = (1, 0, 1)$) and three ($\cr{\mathbf w} = (0, 1, 1)$) reach only one flat plane through the start: the **yellow glow**. The **signal** is off that plane. The **spare** (blue) pushes along $(1, 2, 3)$. It was bolted on to lift the ship off the plane, but the ship stayed on it. Find out why: using only thrusters two and three, land on the **tip of the spare’s arrow**. **Fire**.' Give the spare's Arrow labelAt: 'mid' (the smallest change) so its label is not under the predict card.

### c03-3 · c03-p1 · major

**Problem.** The player does exactly what the goal says: they work out 2, 3, −1, set the dials and Fire. The loop closes, a success chime plays and the second subgoal ticks, but the puzzle doesn't end and nothing says why. To win they also have to type the dials into the last line of the BY HAND box. Neither the goal nor the subgoal "Find the dials" says so.

**Proposed fix.** Use the proposed goal: name the last line of the By hand box. Subgoal 0: 'Write the loop dials in the By hand box'. Add the one-line bark when there is a loop but !flags[0]. Drop the alternative of letting a fired loop count as finding the dials. It removes the by-hand part instead of explaining it.

### c03-4 · c03-p1 · major

**Problem.** The star targets (par) in c03-p1, c03-p3 and c03-sp are lower than the fewest moves a perfect solve needs. So even a flawless solve shows ★☆☆, which wrongly tells a good player they played badly. The third star also requires being within par, so it can never be earned in these three puzzles. In c03-p2 and c03-p4, par equals the bare minimum, so a single test costs a star. That breaks standard 7 (exploring is not punished).

**Proposed fix.** Set par to the largest minimum over the three difficulties, plus room to test. p1 needs par 10, not the proposed 8: the Navigator minimum is already 8. Then p3 8, sp 8, p2 4, p4 2. Add a test that recomputes these minimums and asserts the par, like 'par: reachable on every difficulty' in tests/singular/game-c10.test.ts and game-c17.test.ts. Do not change how DialRig counts moves. It is shared with c02 and other chapters, and their pars would shift.

### c03-5 · c03-p3 · major

**Problem.** Show me picks Mount C and sets the dials to 1, 1, −1. The only explanation on screen says that "B and C both lift the ship off it", so the player can't tell why C is right and B isn't. This is the same complaint as Chapter 18's "it found the answer, so I'm unsure why it was right". The real reason is fuel: B needs 4 units, C needs 3. Separately, the goal never says what a "mount" is in maths terms (the vector on its button is the direction the spare will push).

**Proposed fix.** As proposed. showMe: choose(1), moveDials([-1,-1,2]), Fire (the existing near-miss bark gives fuel 4), then choose(2), moveDials([1,1,-1]), Fire. choose() waits for !rig.busy, which is false once fire() resolves. Extend the reveal with the fuel comparison for B and C. In the goal, add one clause saying that the arrow on each mount button is the direction the spare pushes from that mount.

### c03-6 · c03-p5 · major

**Problem.** Show me doesn't teach the reasoning. The correct proof order appears for 0.6 seconds and then disappears. The dials then jump to the answer with no hint of how they were found, and the SHOWN card is empty. The one thing worth learning here, why four arrows in 3-D always loop, is gone before the player can read it. Also, the result vector at the end of the readout equation is cut off at the panel edge.

**Proposed fix.** In showMe, leave the filled Your order up for about 3-4 s before going on (this is easier once the dials are hidden until the order is checked, per c03-1). Show the line 'Solve $c_1\mathbf a_1 + c_2\mathbf a_2 + c_3\mathbf a_3 = \mathbf a_4$: one equation per coordinate, three unknowns' before moving the dials. End with a lasting line in rig.readout?.note(...), not a bark: barks are 5.2 s toasts at bottom:84px, where the win dialogue opens. Fix the maths in the closing line so it covers both cases: 'If the first three already loop, give a₄ dial 0. If not, they are independent, so they reach a₄’s tip, and dial −1 on a₄ closes the loop. Either way, four arrows in 3-D always loop.'

### c03-7 · c03-p4 · major

**Problem.** Show me just unbolts (1, 1, 0) and stops. The SHOWN card is empty, so the player doesn't find out why that one could go, or that (1, 0, 0) and (0, 1, 0) could too while (0, 0, 1) can't. Separately, par is 1, so a player who tests the up-arrow first to see what happens loses a star.

**Proposed fix.** As proposed: showMe calls toggle(3) (the existing floor-plane bark plays), waits about 1.5 s, then calls toggle(2). Par 2. Put the closing line in the readout's note (r.note), not a bark, so it stays visible after the win dialogue. Write it on any win, not only after Show me.

### c03-8 · c03-p6 · major

**Problem.** The point of this puzzle, that on a flat deck any two arrows pointing different ways already reach every point, so a third always loops, appears only in the closing dialogue, which this player skips. On screen they only ever see dials. The goal also gives an impossible target ("Make it fail") and doesn't say the puzzle simply ends after three tries, so it isn't clear what counts as done.

**Proposed fix.** Goal: '…Make it fail if you can. After three tries the puzzle ends.' After the third try, on both play and Show me, append the reason to the dock's msg line (or rig.readout?.note), not a bark. Word it so it is true for any placement, including parallel or zero arrows: 'Three tries, three loops. If two arrows point different ways, they reach every point of the deck, including the third tip. If they don’t, those two already loop on their own. Either way there is always a loop.'

### c03-9 · c03-sp · major

**Problem.** Show me unbolts s and sets the dials to 4, −1, 1.5, but the SHOWN card is empty, so the player doesn't learn why s was the one to drop or where those dials came from. A player who jumps straight to this set piece also isn't told what "fuel" means, because only p3's goal defines it. Show me's choice also implies that dropping s is the only answer. In fact dropping v or w also works, using less fuel (4.5).

**Proposed fix.** Goal: add 'Fuel is the sum of the dial sizes, $|a| + |b| + |c| + |d|$.' showMe: toggle(2) to unbolt u (the existing toggle bark says 'Those three lie in one plane'), wait, toggle(2) again to bolt it back, then toggle(3), move the dials to 4, −1, 1.5 and Fire. There is no need to fire with zero dials. Put the proposed closing line ('s = 2v − w … keep u and drop one of v, w, s … without s: (a, b, a + b + 2c) = (4, −1, 6), so 4, −1, 1.5') in rig.readout?.note, not a bark. Optionally reword hint 1 so it does not suggest the spare is the only one that can go.

### c03-10 · c03-p1 · minor

**Problem.** On Commander the BY HAND box prints the whole method before the player has started thinking: fire w backwards, then read off c1 and c2 one coordinate at a time. These are hints 1 to 3, shown on screen for free. On Commander those rows aren't even checked, so they do nothing except give the answer away. That breaks standard 8 (Commander stays hard) for a player who wants to work it out.

**Proposed fix.** When d === 'commander', pass only the final step ('The loop dials $(c_1, c_2, c_3)$ =', with the existing mistake for (2, 3, 1)). The method stays in the hints. This also makes the dock shorter. The Commander par does not change, because only the final row counted a move on Commander anyway.

## c04

### c04-1 · c04-p1 · major

**Problem.** The goal never says what a 'reading' is. It says '(1, 0) reads 2', '(0, 1) reads 4' and 'Watch the reading', but nothing on screen says the reading measures how far an arrow points along s. Nothing says what the two yellow strips on the red line or the two grey arrows are. The only definition is in the cold open, which this player skips. At the start, the red s, green d, two grey pieces, two short yellow strips, two dashed drops, a right-angle mark and the labels '1 × 2' and '1 × 4' are all packed into about one grid square at the bottom of the view. The '1 × 2' label sits on the x-axis beside the grey piece, not on its yellow strip. This is the same confusion the player reported in Chapter 18 ('what does the yellow have to do with my green').

**Proposed fix.** Keep it as a major. Give p1 a new goal that says what a reading is, in plain words first: 'The **reading** of an arrow against the signal $\mathbf s = (2, 4)$ (red) measures how far the arrow points along $\mathbf s$: the length of its **shadow** on the line of $\mathbf s$ (yellow), times the length of $\mathbf s$. The grid arrow $(1, 0)$ reads **2** and $(0, 1)$ reads **4**. With the sliders, build the green dish arrow $\mathbf d = (3, 1)$ from **3** of $(1, 0)$ and **1** of $(0, 1)$ (the two grey pieces). Watch how its reading is made from theirs.' The 'times the length of s' part is needed: a smart player who measures the shadow of (1, 0) gets 0.45, and without it would not see why it reads 2. In draw() (puzzles.ts:102-103), move each 'a × 2' and 'b × 4' label next to its own yellow strip. The best spot is on the other side of s's line, at a small offset along −sn (about 0.25). The strips sit on the +sn side and the grey pieces and d are nearly always there too, so that side is empty. With today's 0.5 offset along +sn, the '1 × 2' label at the start lands at (0.55, −0.02), on the x-axis beside the grey (1, 0). Leave the prediction, the hidden-helper level and the snap step as they are.

### c04-3 · c04-p4 · major

**Problem.** Show me sets the dial to 60 and presses Turn. It makes no wrong try and gives no reason. The 'Shown' card at the top is empty, because p4 has no prediction and the card only prints a prediction's reveal. On Commander, h·s and the lengths are hidden on purpose. So the player watches the ship turn 60° with no way to learn why it is 60, which is exactly the Chapter 18 complaint ('I'm unsure why they were the right answer').

**Proposed fix.** Keep it as a major. Rework p4's Show me: set the dial to 45 and press Turn so the player sees one miss, then set 60 and press Turn, then call r.note('Why 60°: $\mathbf h\cdot\mathbf s = 1\cdot1 + 1\cdot0 + 0\cdot1 = 1$ and $\|\mathbf h\| = \|\mathbf s\| = \sqrt2$, so $\cos\theta = \frac{1}{\sqrt2\,\sqrt2} = \frac12$ and $\theta = 60°$.'). If c04-5 removes the number from the miss on Commander, the 45° try will say 'short of the spine', which is still a useful demonstration. The note is written only inside showMe, so the Commander readout stays bare while the player solves. Leave the cross-chapter `shown` field on PuzzleDef and winCard out of this chapter's fix: it changes the runner for every chapter, and the user asked to hold off on other chapters. Each puzzle's own readout note, as Chapter 18 does it with h1.say / msg(reason), is enough here.

### c04-4 · c04-p6 · major

**Problem.** On Commander the player types the shadow tip (4, 2) in the worksheet, then has to drag the marker onto it with no snapping. A drop counts only if the gap reads within 0.05 against u. That means |t − 2| ≤ 0.01, so x must be between 3.98 and 4.02, about ±2 px at this zoom. Every missed drop costs a move (par 7) and triggers a bark. Arrow-key nudges exist, but nothing on screen says so, and each nudge also counts as a move after 650 ms. The player can't type where the mark goes even though they just typed the answer. The drop check is also five times stricter than the win check.

**Proposed fix.** Keep it as a major, with two corrections. (1) On Commander, add a typed 'your mark = (__, __)' row under the worksheet; pressing Enter places the knob. Draw the mark exactly where it was typed. If that point is not on the line through u (|2y − x| > 0.05), say 'That point is not on the line through u' and do not tick the subgoal. Do not project the point onto the line silently: that would break 'what is typed is what is drawn'. The gap check also needs this guard, because a point such as v itself gives a gap of (0, 0), which reads 0. If the point is on the line, run the same gap check as onEnd. Dragging stays for Cadet and Navigator, and stays available on Commander. (2) Loosen the onEnd gate to match p6Won. p6Won accepts each coordinate within 0.05 of (4, 2), which means |t − 2| ≤ 0.025, which means |reading| ≤ 0.125. Today's gate is |reading| ≤ 0.05, that is |t − 2| ≤ 0.01: 2.5 times stricter, not five times as the audit says. The tip still has to be worked out by hand in the worksheet, so Commander stays hard.

### c04-2 · c04-p3 · major

**Problem.** On Commander, putting the tiles in order opens an extra step the goal never mentions: 'So the angle between (3, 1) and (1, 2) is __ degrees'. Subgoal 2 ('Show where the match comes from') only ticks once that angle is typed. Subgoal 1 makes the player drag v or w, with no snapping on Commander. So by the time the question appears, the picture, the θ arc and both readouts show some other pair, such as (2.73, 1.41). The question is about arrows that are no longer on screen. The player can't check their working against the readout and may think the current pair is meant. Tile 1 also calls the yellow side 'the gap', while the picture labels it 'v − w'.

**Proposed fix.** Downgrade to minor and keep it, with a smaller fix. In openLast() (Commander), animate v and w back to (3, 1) and (1, 2) and disable both handles. That way the picture and both readouts show the pair the last line asks about. Today's showMe moves only v back (puzzles.ts:356), so w can also be left wherever the player dropped it. Keep the angle row hidden and the θ arc without a value. Subgoals are one static list shared by all difficulties, so do not change their text. Instead, on Commander, call p.setGoal at setup and end the goal with: '...Then, below, put the steps in order and use them to find the angle between $(3, 1)$ and $(1, 2)$.' In tile t1, change 'the gap's length squared' to 'the length squared of the yellow side $\mathbf v - \mathbf w$'.

### c04-5 · c04-p4 · minor

**Problem.** 'Set the turn and press Turn. It must land within 1°' never says in plain words what turns (the green heading h) or what it has to line up with (pointing along the spine s). 'I want us parallel to her spine' is only in the skipped intro. Separately, on Commander a miss reports the exact degrees still to go, in the bark and on the orange arc. So one blind test at 30° hands over the answer, which goes against 'compute by hand'.

**Proposed fix.** Change the goal: 'Turn the Lantern so its heading $\mathbf h = (1, 1, 0)$ (green) points along the ark\'s spine $\mathbf s = (1, 0, 1)$ (red). Type how many degrees to turn $\mathbf h$ toward $\mathbf s$, then press **Turn** or Enter. It must end within **1°** of $\mathbf s$.' On Commander, a miss should say only 'Short of the spine' or 'Past the spine', and the orange arc should be drawn with no number. Today the bark says 'The spine is 30° further' and the arc is labelled with the degrees left, so one blind test plus addition gives 60. On par: def.par is shared by every difficulty. If you raise it to 2 so that one test is free (standard 7), the miss must not show a number on Navigator either, or Navigator becomes a test-and-read. Otherwise leave par at 1. Cadet keeps its 60° label and numbered feedback.

### c04-6 · c04-p5 · minor

**Problem.** 'Fix the meter, then lock the ark's beacon' doesn't say what is wrong with the meter or what a fixed meter looks like. It also doesn't say that the beacon is the signal pointing the same way as t: the story of one quiet beacon among loud echoes is only in the skipped cold open. The readout's 'meter = t · x' uses an x that appears nowhere else on screen.

**Proposed fix.** New goal: 'Three signals **a**, **b**, **c** (white). The ark\'s beacon is the one pointing the **same way** as the ark\'s pattern $\mathbf t = (3, 4)$ (red), however loud (long) it is. LANTERN locks only on a meter reading of **1.00**. Right now the meter is $\mathbf t\cdot\mathbf x$, where $\mathbf x$ is a signal. Use the **÷** buttons until a signal pointing exactly along $\mathbf t$ reads **1.00**, then lock the beacon.' Drop the audit's 'so long signals read high': that is hint 1's job, and the gauges (c = 80) already show it. In sync(), make the readout equation say 'meter = t·x  (x = the signal)'. Do not say which ÷ buttons to press.

### c04-7 · c04-p3, c04-p5, c04-p7 · minor

**Problem.** These three puzzles have no prediction, so after Show me the top card reads 'SHOWN' and nothing else. p5: Show me turns on both ÷ buttons and locks a, but the reason (dividing by both lengths leaves cos θ, so only the signal along t reads 1.00, even though c is loudest) appears only in hint 2 and in LANTERN's win line, which is skipped. p7: the arrow just glides to (3, −1, 2), and the reason it works is only in the hints. p3: the last line fills in 45 with no working.

**Proposed fix.** Add one reason line at the end of Show me, as a readout note, for p3 and p5. p3: first animate both v and w back to (3, 1) and (1, 2), because showMe resets only v today. Then r.note('$\cos\theta = \dfrac{5}{\sqrt{10}\,\sqrt5} = \dfrac{1}{\sqrt2}$, so $\theta = 45°$.'). p5: r.note('Dividing $\mathbf t\cdot\mathbf x$ by both lengths leaves $\cos\theta$. $\mathbf a = 2\mathbf t$ points exactly along $\mathbf t$, so it reads 1.00; $\mathbf c$ is loudest but about 37° off (0.80).'). For p7 the audit's fix does not work. dh.moveTo fires onCommit, which starts the shake; the shake calls r.note itself, and r.note replaces the note rather than adding to it, so a note written in showMe is overwritten by 'Bram shakes it…' and then by 'Survived…'. If p7 gets a line at all, have showMe go to (3, 0, 0) first, where p7Won is false and only the e1 gauge matches, then to (3, −1, 2). Put the sentence 'Each reading along a grid arrow is one part of x' at the front of the shake's final note when the puzzle was shown. The p7 readout already shows x = (3, −1, 2) beside readings 3, −1, 2, so p7 has the lowest priority of the three.

### c04-8 · c04-p7 · minor

**Problem.** Right after the player places x, two new unlabelled arrows sweep through six positions, and one of them is the same green as the player's own x. The readout then asks 'Bram shakes it: is |v·w| ever more than ‖v‖‖w‖?'. Nothing says these are new arrows v and w, that this is a check with nothing for the player to do, or who Bram is. A player who skips the story sees a second green arrow appear and can't tell which one is theirs.

**Proposed fix.** Label caseA '$\mathbf v$' and caseB '$\mathbf w$'. Draw caseA in a colour that is not x's green, for example C.orange or the neutral '#c3cde0'. Dim x (dh.arrow.setOpacity about 0.35) while the shake runs. Start the first note with 'Bonus check (nothing to do): six random pairs $\mathbf v$, $\mathbf w$. Is $|\mathbf v\cdot\mathbf w|$ ever more than $\|\mathbf v\|\|\mathbf w\|$?' and drop 'Bram shakes it'.

## c05

### c05-p7-1 · c05-p7 · blocker

**Problem.** The goal says "Drag D", but D is not on screen at the start. It sits under the SIGNED AREA readout panel, blurred by the glass, and the panel probably blocks the pointer as well. The player sees a yellow line running into the corner and nothing they can grab. Commander has no box for typing D, unlike p1, so dragging is the only way in. The yellow handle arrow also runs from A to D, which is against the travel direction D to A. Par 2 counts every drag release as a move.

**Proposed fix.** As the auditor proposes: start with `let D: V3 = [6.5, 2, 0]`, and make the `wrong()` reset match. Pass `from: Cc` to the VectorHandle. The tip is still the absolute D, and `limit` still clamps world coordinates, so `D = t` keeps working; the yellow arrow is then the leg C→D, in the direction of travel. On Commander, add `VectorInput({ dim: 2, values: [6.5, 2] })` and a Set button in p.dock() that calls `dh.set([x, y, 0]); p.move();` and then the same win check. Keep the boxes in sync from onChange, as p1 does. Change the goal to say 'Drag $D$ or type it'. Raise par to 4.

### c05-p4-1 · c05-p4 · major

**Problem.** The title asks which way the door faces, and the goal asks for the normal and the area. On Commander only the last line, the door's area, is checked. Typing 3.5 wins with the normal row empty or with the flipped normal (-6, -3, -2). So the "which way" half of the task never counts. The kicker "only the answer is checked" is unclear because the goal names two answers.

**Proposed fix.** Add `check?: boolean` to Step. In check(), change the early return to `this.mode === 'commander' && !last && !s.check`. On Commander, complete only when the last row and every `check` row are right, whichever is entered last; also set row.done = false on a wrong answer. Set `check: true` on p4's `(Q - P)×(R - P)` row only. When the worksheet has check rows, set the Commander kicker to 'By hand · the normal and the area are checked'.

### c05-p3-1 · c05-p3 · major

**Problem.** Three problems. (1) The goal asks for the vector the 2 × 2 pattern gives, and its length. On Commander only the last line is checked, and that line already prints the arithmetic (5·10 − 2²), so typing 46 wins without touching the pattern. (2) The checked number is the squared length, and nothing says it belongs to n. (3) The yellow arrow labelled n, at (12/5, −6/5, 2/5), cannot be moved by the player and ignores what they type, so the player has no link between their numbers and the picture. It also looks like it might be the answer, and it gives away the direction.

**Proposed fix.** Use the same `check` flag as c05-p4-1: set `check: true` on the pattern row. On navigator and commander, hide the static nA arrow and leave out the n, length-squared and reading rows until finish(); keep the line and the two equation rows. Rename the last prompt to 'length squared of $\mathbf n$: $\|\mathbf a\|^2\|\mathbf b\|^2 - (\mathbf a\cdot\mathbf b)^2 =$', and drop '= 5·10 − 2²' on Commander (navigator can keep it). Goal: '...Find the one the 2 × 2 pattern gives, and its squared length.' Optional and larger: once rows 1 and 2 are typed, draw n = (n1, n2, 1) from the typed numbers and drive the readings from it. That needs a new per-row input hook in StepWorksheet, so it is not required for this fix.

### c05-p2-1 · c05-p2 · major

**Problem.** Nothing on screen says which way a spin about an arrow turns, so choosing the order is a coin flip, not reasoning. The rule (anticlockwise seen from the arrow's tip, or the right-hand rule) appears only in hint 2 and in the win dialogue, which this player skips. A wrong guess takes 4 moves against par 2, so it costs a star. "Raised arrow" and "Lantern" are not explained for someone who jumps in here: the maths meaning of "raise" is given only in p1.

**Proposed fix.** Use the auditor's goal text: what the Lantern is, what the raised arrow is (right angle to both edges, as long as the area), that the order picks its side, that a spin turns anticlockwise seen from its tip, and 'Spin 72°'. Remove the vectors from the predict prompt and from all three choice texts ('Green then red' / 'Red then green' / 'Either one'), for every difficulty; cadet and navigator already see the raised arrow in the readout once they pick an order. Set par to 4. The prediction still gates the third star, so guessing is not rewarded.

### c05-p5-1 · c05-p5 · major

**Problem.** The white spikes are never explained. Every spike visible at the start is white and points out, so the picture never shows a normal facing the wrong way. The code makes inward normals amber, but they start at a triangle and point into the closed hull, so the opaque mesh hides all of them. The player cannot see what wrong corner order does to a normal, only blue patches that look like paint.

**Proposed fix.** Better than turning depthTest off, which would also draw the far-side white spikes over the hull: draw each inward normal so that it ENDS at its triangle. The tail goes at c − 1.1·n̂ (outside the hull, because n̂ points in) and the tip at c. In showSamples: `sampleArrows[k].set(out ? c : c − 1.1n̂, out ? c + 1.1n̂ : c)`, with the amber colour. The arrow still points along the true normal and stays visible, with no depth tricks. Add to the goal: 'The spikes are sample normals: **white** points out of the hull, **amber** points in, toward the centre.' Do not say that dark patches mean inward normals: on the side away from the light, bake() lights the flipped triangles.

### c05-p1-2 · c05-p1 · major

**Problem.** Show me gives answers with no reasoning in p1, p4, p5 and p7. Each ends on a "SHOWN" card with nothing under it. The only explanation is the win dialogue, which this player presses Esc on. In p1 the arrow just slides to (0,0,2) and then to (0,0,6) in silence, so the player never learns why 6 (base 2 × height 3). In p7, D jumps to (1,4) with no reason given.

**Proposed fix.** Either add an optional `shown?: string` to PuzzleDef and render it in winCard when the outcome is 'shown' and there is no predict, or, as in Chapter 18, set the why line with r.note or a bark at the end of each showMe. Neither needs anything else. Use the auditor's lines for p1, p4 and p5. In p1, remove `warnedLen = true` from showMe so the stop at (0,0,2) gives the existing near-miss bark. p7: first move D to (6.5, 5) and bark 'Right at C: −2.5'; check: C = D₂ − 3D₁ + 12 = −2.5. Then move to (1, 4). Line: 'The turn at A is 4·D₂, at C it is D₂ − 3D₁ + 12, at D it is 5D₂ − 3D₁: D must sit above AB, left of the line through B and C, and above the line from A to C. (1, 4) gives 16, 12, 13, 17.'

### c05-p4-2 · c05-p4 · major

**Problem.** Even after a correct answer, the player never sees which way the door faces. The camera looks almost straight down the normal, so the arrow draws as a glowing blob at the triangle's centre. The win note says the normal "points out of the ark", but no ark is drawn, so "out" means nothing to this player.

**Proposed fix.** Use `view3D({ target: [0.9, 0.9, 1.2], distance: 13, azimuth: -40, elevation: 20 })`. For a less foreshortened door, azimuth −20 and elevation 25 puts the normal about 44° off the line of sight with an arrow about 175 px long. Check either one with a screenshot. Change the note to 'Order checked: (6, 3, 2) points away from the origin, the ark's side of the door, so it faces out.'

### c05-p1-1 · c05-p1 · minor

**Problem.** "Reads 0 against" is Chapter 4's story word for the dot product, and this goal never says so. A player who jumps in sees "reading of n against v: 2" and has to work out from the numbers that it means n·v.

**Proposed fix.** Goal: '...**Raise** the yellow arrow $\mathbf n$ so its **reading** against each edge (the dot product $\mathbf n\cdot\mathbf v$, $\mathbf n\cdot\mathbf w$) is **0**, and it is **as long as the panel\'s area**. Drag its tip (hold **Shift** to drag up or down) or type it.'

### c05-p6-1 · c05-p6 · minor

**Problem.** Panels hide parts of the picture. In p6 the optional prediction panel covers the tip and label of v, one of the two struts the goal names. In p2, after Show me, the Shown card cuts off the raised arrow's "v then w" label, which is the label that ties the order to the axis.

**Proposed fix.** p6: raise the camera target instead: `view3D({ target: [1.0, 1.8, 4.4], distance: 28, azimuth: -28, elevation: 12 })`. By projection, v's tip is at about (856,360), below the card, and the ¼-size v×w tip at about (593,808), clear of the slider dock. Confirm with a screenshot. No change to p2.

## c06

### c06-1 · c06-p4 · major

**Problem.** When the puzzle opens, the biggest thing on screen is an orange box from the origin labelled with −1, and a readout row reading "LANTERN, from the origin: −1: not flat?". Nothing on screen says this is a wrong measurement, or who LANTERN is (the ship's computer). Only the skipped scene says the origin is not one of the clamps. So a story-skipper sees a −1 and "not flat?" before doing anything and can't tell whether it is a hint, the answer to check, or a mistake. "Measure from P" doesn't say what to measure. The readout row stays up for the whole puzzle. Also, the worksheet title replaces the usual Commander label, so nothing warns that the first four rows are not checked.

**Proposed fix.** Use the auditor's goal text and readout relabel ('ship computer, from the origin (not a clamp)' with value '−1 (wrong starting point)'), but make the worksheet titles depend on difficulty. Navigator checks every row, so the auditor's fixed title 'Measure from P · only the answer is checked' would be wrong there. Use `'Measure from P · ' + (d === 'commander' ? 'only the answer is checked' : d === 'navigator' ? 'each step is checked' : 'LANTERN computes, you choose')`, and do the same for ws2 ('After the strike · …'). Do not say what value means flat. Also fix a Commander leak the audit missed: ws2's last prompt, 'The tetrahedron PQRS (exactly; fractions like 2/6 are fine)', uses the unreduced answer (box 2 / 6) as its example. Change it to something neutral, e.g. '(exactly; a fraction such as 3/4 is fine)'.

### c06-2 · c06-p3 · major

**Problem.** On Commander the third worksheet row gives away the first two rows. Its prompt prints the finished dot product "(a×b)·(1,1,k) = 2 − 4 + 2k", so a×b = (2, −4, 2) can be read straight off it, and the current volume (k = 1) is 2 − 4 + 2 = 0. Only that row is checked, so the whole "by hand" puzzle becomes solving 2k − 2 = 6. This player wants to think and is handed the cross product.

**Proposed fix.** On Commander, change the row 3 prompt (puzzles.ts:368) to 'With the brace, $\mathbf c = (1, 1, k)$. For the box to hold 6, $k =$'. Keep the mistake messages for −2 and 3, and leave hint 2 as it is (it gives the expression on request). Navigator can keep '= 2 − 4 + 2k'. Note that the audit's reason for that is wrong: every row is shown from the start, so row 1 has not been checked by the time row 3 is visible. Navigator is the easier difficulty, though, so keeping it there is acceptable.

### c06-3 · c06-p2 · major

**Problem.** After Show me in p2, p4, p6 and p7, the result card is an empty box with only the heading SHOWN. The puzzle just finishes: the answer appears, but not why it is right. This is the same complaint the player made about Chapter 18. In p2 the false tile ("The height is the length of the third strut, ‖u‖") is left in the tray, still lit, with no word on why it is wrong. In p4 nothing explains the 1/6 that turns the box's 2 into 1/3. In p7 nothing explains why turning the order round never changes the number.

**Proposed fix.** Narrow the finding to p2, p4 and p7 (see why). Either: (a) end each showMe with one line of reason, as Chapter 18 did with msg(...) after its search, using a persistent element rather than a bark, which disappears after 5.2 s; or (b) add the optional `shownWhy` field to PuzzleDef and have winCard render it when outcome is 'shown'. Option (b) also fixes the empty 'SHOWN' card for every puzzle without a predict in every chapter, but it changes the shared runner, so agree it first; the user asked to hold off on non-Chapter-18 fixes until 'done' is agreed. Texts: use the auditor's p4 and p7 lines. The p2 line must depend on difficulty: on Cadet, Show me moves u to (1, 1, 5) (puzzles.ts:273), so the box holds 6 × 5 = 30, not 24. Use the auditor's p2 text on Navigator and Commander, and for Cadet say 'height 5 → 30'. The p2 text must also name the decoy: 'Left out: ‖u‖ = √18 ≈ 4.24 is the strut's length, not its height, because u leans.'

### c06-4 · c06-p7 · major

**Problem.** If the player does exactly what the goal says, they lose stars. "Set any three struts" means three drags, and every drag counts as a move. With Shake that is 4 moves against a par of 2, so the most they can earn is 1 star, and any extra comparing costs more. The goal also doesn't say how to set a strut (drag the ringed tips; Shift-drag to change height), and "let Bram shake them" uses a character this player never met. The readout shows the three products but not the struts that produce them, so a Commander player can't check one by hand.

**Proposed fix.** Pass countMoves:false to the three VectorHandles (puzzles.ts:698-700). Testing is then free and par 2 still means that the Shake press is what counts. This is better than raising par. New goal: 'Does it matter which strut goes first? Drag any tip to change a strut (Shift-drag to raise or lower it). Compare the three turns of the order … and the swap. Then press **Shake**: it tries several random sets of struts.' The auditor's 'ten' is true only on Commander (n is 2, 5 or 10 by difficulty, :702), so say 'several' or interpolate n. Adding readout rows for u, v and w with their coordinates is worthwhile (standard 3: it shows the inputs behind the products, and no answer is revealed because the products are already shown). Treat it as optional.

### c06-5 · c06-p1 · major

**Problem.** Par is 4, which is exactly Pulse plus three accepted drags. Any test drag costs a star: watching the volume while sliding and letting go in the wrong place, a spot too close to an earlier one, or the Shift-drag that hint 2 tells them to try. The lesson here (only the height matters) is found by testing positions, and on Commander, with no snapping, wasted drags are very likely.

**Proposed fix.** Raise par to 8, with the same comment as Chapter 18: 'testing positions is how this is solved: exploring must not cost stars'. Prefer this over counting only accepted spots: it is the smaller change and matches the standard. A related problem the audit missed: a horizontal drag stays exactly on the current height (drag.ts setPlane, plane z = p.z). Once a Shift-drag moves the tip off height 4, Commander has no snapping and a ±0.01 tolerance, and keyboard PageUp/PageDown step 0.1 from the current arbitrary value. Returning to 4.00 is therefore practically impossible, so every later spot is rejected until the player presses Reset. At minimum, when a spot is rejected for its height on Commander, the bark should add that **Reset** puts the tip back at height 4. Do not make the puzzle snap the height.

### c06-6 · c06-p2 · major

**Problem.** On Commander the goal says "Build its volume from base area × height". The screen shows something else: a tile sorter, a readout with four '?' rows, and later a typed last line that only appears once the order is right. The goal doesn't say the job is to order the tiles, that one tile is false and must be left out, or that a number will be asked for. The four '?' rows look like blanks to fill in, but there is nowhere to type them; they only fill in when the puzzle is won.

**Proposed fix.** Commander goal: 'The leaned box: v = (2, 0, 0), w = (1, 3, 0), u = (1, 1, 4). Why does it hold base area × height, and why is that u·(v×w)? Put the true steps in order (leave out any that are false) and press **Check the order**. Then type how much the box holds.' Do not say 'one tile is false': saying how many decoys there are goes beyond the Chapter 18 standard, and including the decoy already gets a clear message and costs one move within par 6. For the readout, the smallest fix is the title 'Base × height · filled in when you finish', which also helps Navigator, whose rows likewise stay '?' until the win. Hiding the rows until the win on Commander is also acceptable.

### c06-7 · c06-p6 · minor

**Problem.** The goal and its second step say "split the box", but there is nothing that splits it. The split happens by itself once the typed answer is right, so the player looks for a Split control first. "The box" is never identified (it is the yellow box on the same three struts). After the split, "the corner piece at the node" uses a story word; in maths terms it is the piece at the origin, where the three struts start.

**Proposed fix.** Use the auditor's goal. Rename the subgoals to 'Its volume, by hand' and 'Fill the housing'. After the split, change 'the corner piece at the node' to 'the corner piece at the origin, where the three struts start' in both the setGoal at :632 and the wrong-piece bark at :646. Do not mention 'six' before the answer is in.

### c06-8 · c06-p3 · minor

**Problem.** The goal says "Read its volume", but on Commander there is nothing to read. The readout shows only c = (1, 1, 1) and no box is drawn, so the player looks for a number that isn't there. Typing a brace k also does nothing unless it is correct. The blue c stays at (1, 1, 1), so the goal's "set the brace k" never shows the k that was typed. That breaks the rule that what is typed is what is drawn.

**Proposed fix.** Fix the wording only. Goal: '… Work out its volume by hand. Then find the brace k, the third number of c = (1, 1, k), that makes the box hold 6.' Also change the predict prompt 'Before LANTERN draws the box' to 'Before the box is drawn', since LANTERN is a story name. Drop the part that animates c to a wrong k: brace() (:334-355) barks 'Volume X…' for a wrong k, and that would give Commander a second data point, enough to solve the linear relation without computing. It also calls p.move() a second time on top of the worksheet's move, and it needs a new code path. A wrong k already gets the row's 'Not this' or mistake message, so a typed value never produces a false drawing.

<details><summary>Dropped by the checker</summary>

- c06-9: Par 1 is deliberate and the readout already supports it. The readout shows 'rule: along, across, up' next to 'logged as: across, along, up' (puzzles.ts:537-538), so a player who thinks can read off Swap 1 ↔ 2 with no test. The predict asks what a swap will do; it does not tell the player to try a random swap. Par 3 would give full stars to any sequence of the three buttons that does not backtrack, since at most 2 transpositions are ever needed after a wrong first swap, which removes the thinking that Commander should reward. Not plainly better.

</details>

## c07

### c07-1 · c07-p2 · blocker

**Problem.** On Commander the goal tells the player to slide the two beads until the link is at a right angle to both. They do that: the right-angle marks appear on both beads, the link reads (0, 0, 2) with length 2, and nothing happens. There is no tick and no win, because the bead win test is switched off on Commander. The real task is the 'The gap from the formula' worksheet in the lower left, and the goal never mentions it. The worksheet uses p1, p2, d1 and d2, which are never matched to the two paths. The title asks 'where do they meet?', but nothing on screen says the answer is 'they don't, find the gap'.

**Proposed fix.** On Commander, call p.setGoal: 'Our path: through p₁ = (0, 0, 0) along d₁ = (1, 0, 0) (green). The debris: through p₂ = (0, 1, 2) along d₂ = (0, 1, 0) (red). **Slide the beads** to find the shortest link between the paths (at a right angle to both). If its length is 0, the paths meet. Then **work out that length from the formula** in the panel.' Leave out the auditor's 'but they never meet': that is the conclusion the title asks the player to reach. Add the subgoals ['Find the shortest link', 'Work out the gap from the formula']. On Commander, check() ticks subgoal 0 and only then creates the StepWorksheet, the same gating as c18 p3. showMe and solve must create the sheet before they call ws.solve(). Keep the 'reads against' rows hidden on Commander.

### c07-2 · c07-p4 · blocker

**Problem.** The goal asks for a path from the origin that meets the door 'at its centre', and Commander types d by hand. The door's corners are only tagged P, Q and R, with no coordinates. The goal does not give the plane either. A player who skipped the scenes cannot work out the centre. All they can do is nudge d until the yellow dot looks like it sits in the white ring. Then the first wrong Fly gives away the centre outright, '(1/3, 2/3, 1)'. Taken together, the givens are hidden and then the answer is handed over.

**Proposed fix.** In DoorWall (parts.ts:49), tag the corners with their coordinates: 'P (1, 0, 0)', 'Q (0, 2, 0)', 'R (0, 0, 3)'. This one change also supplies the givens for p3, p5, p7 and the set piece. Add to the p4 goal: 'The door is the triangle P, Q, R (corners labelled); its centre is the white ring.' On Commander only, end the miss bark at '…, not at the centre.' and leave out the coordinates. The readout already shows where the path meets the plane, which is all the feedback the player needs.

### c07-3 · c07-p3 · major

**Problem.** On Commander the 'order the steps' tile panel is open from the first frame, before any point has been clicked. It covers the door's normal arrow n and its '(6, 3, 2)' label, which is the thing the goal says to test against. Only a white stub sticking out of P is visible. The goal never says that 'write the door's equation' means ordering five derivation cards (one a decoy) and then filling in d. Once the last-line sheet opens, the dock grows up under the goal card, so its own title is cut off. The new sheet's title shows raw LaTeX.

**Proposed fix.** A smaller fix than the auditor's is enough. (1) Create the TileOrder only after subgoal 0, when three points have been tested. n is then visible during the clicking, which is when it matters, so no camera or anchor change is needed. (2) On Commander, append to the goal (or setGoal when subgoal 0 ticks): 'Then put the steps that turn n·(X − P) = 0 into an equation in order (one card does not belong), and finish the last line.' (3) Once the order is accepted, hide tiles.el, the same way p5 folds finished sheets, so the dock never reaches the goal card. (4) Change the title to plain text: 'The last line: 6x + 3y + 2z = d'.

### c07-4 · c07-p7 · major

**Problem.** The goal says 'LANTERN solves n·(p + td) = 6 for t', but neither n nor the door's plane appears anywhere on screen. A player who jumped in can only probe directions and watch the n·d row, which is guessing, not thinking. 'LANTERN' is a story name (the ship's computer) and is never explained.

**Proposed fix.** New goal: 'The door's plane is 6x + 3y + 2z = 6, with normal n = (6, 3, 2). From p = (2, 2, 2), type a direction d so the path p + t d has **no single hit** on the plane. The ship's computer finds the hit by solving n·(p + t d) = 6 for t (see Hit test).' Add normalArrow(p, v3(DOOR_CENTRE), v3(DOOR_N), 1.2, '$\mathbf n = (6, 3, 2)$') as in p6. Add no hint about n·d = 0.

### c07-5 · c07-sp · major

**Problem.** In Step 4 (One burn), Commander has to set three thruster dials so that one burn carries the ship to the path start. Neither the ship's position, the path start, nor the needed displacement is shown as numbers. The readout only gives a distance ('ends this far from the path start'), so the player can only hill-climb with sliders. They cannot solve a(1,0,1) + b(0,1,1) + c(0,0,2) = target by hand, which is the whole point of the step.

**Proposed fix.** When stage 4 opens, add the readout rows 'Lantern at (10/3, 8/3, 5/3)' and 'path start (7/3, 5/3, 5/3)'. Extend the dock note: '…takes the Lantern to the path start (the green ring): the burn must equal path start − Lantern.' Do not show the difference or the dial values.

### c07-6 · c07-sp · major

**Problem.** In Step 1 (Roll), Commander types an axis at a right angle to the door edges Q − P and R − P. The edges are drawn as green and red arrows with no numbers, and the corners have no coordinates, so the player cannot compute the cross product. The readout's 'axis reads against Q − P' is game slang for a dot product and is never written as one here. The goal also says 'the door's normal' without giving it.

**Proposed fix.** The corner-coordinate tags from c07-2 already supply the givens. Also change the note at setpiece.ts:103 to '…both door edges, Q − P = (−1, 2, 0) and R − P = (−1, 0, 3).' This is a plain subtraction, not the cross product. Rename the readout rows at setpiece.ts:78–79 to 'axis · (Q − P)' and 'axis · (R − P)', and use the same wording in the miss bark at line 87. Do not show (6, 3, 2).

### c07-7 · c07-p5 · major

**Problem.** The letter Q means two different things on one screen. The door corner (0, 2, 0) is tagged 'Q' in the picture. The by-hand worksheet calls the holding point Q: 'Q = (3, 3, 3)', 'Q × d'. P in the same sheet is the tagged corner P. So a player reasonably reads Q as the tagged corner Q, and the sheet's formulas become nonsense until they spot the redefinition.

**Proposed fix.** Rename the holding point to H throughout p5: 'n·(H − P) for H = (3, 3, 3), P = (1, 0, 0)', 'H × d', '‖H × d‖²', the mistake texts on lines 510 and 523, and hint 443. Label the dot 'holding point H' (line 455).

### c07-8 · c07-p2 · major

**Problem.** From p2 to the set piece, Show me only produces the answer. The 'Shown' card that follows is an empty box. The one-line reasons exist only as win dialogue, which this player skips. For example: 'No meeting point. The closest the two paths come is 2, straight up.', 'n·d = 0. The path runs alongside the door's plane', and 'Path along (1, 2, 3). It meets the door at t = 1/3'. None of these Show me runs makes a wrong try first: p2 on Commander fills the worksheet instantly, and p7 jumps straight to (1, −2, 0).

**Proposed fix.** Use the c18 pattern: Show me makes one miss, then the answer, then one line of why, shown on screen inside the puzzle (a dock message or a readout row), not in dialogue. p7: try d = (1, 0, 0) first ('n·d = 6: one hit'), then (1, −2, 0), ending with 'n·d = 0 makes t = (6 − 22)/0 impossible: the path runs alongside the plane.' p4: Fly the starting (1, 1, 1) once (it misses), then aim, ending with 'The centre is (P + Q + R)/3 = (1/3, 2/3, 1); any d along it works.' p2 on Commander: glide the beads to the right-angle link, then fill the sheet with ws.showMe(), ending with 'The link (−t, 1 + s, 2) is at a right angle to both only at t = 0, s = −1. What is left, (0, 0, 2), lies along d₁ × d₂: no meeting point, gap 2.' p3 on Commander: tiles.set, then lw.showMe instead of solve(). For the set piece, give each stage a short reason. An optional PuzzleDef `shown` line rendered in winCard is a reasonable alternative, but it changes the runner for every chapter, so agree it as part of the standard before using it.

### c07-9 · c07-p1 · minor

**Problem.** 'Pass the crossing clear of the debris' never says how clear. The 0.5 threshold appears only in a bark after a failed Play. A player who picks 1.25× (which does reach the crossing at a different minute) fails with 'closest pass 0.44' and only then learns the rule.

**Proposed fix.** Goal: '…Then change our **speed** so that, at our closest, we are at least 0.5 from the debris.' Subgoal 1: 'Pass the crossing at least 0.5 from the debris'. A readout row is optional; the goal text is enough.

### c07-10 · c07-p5 · minor

**Problem.** On Commander the player is told 'When a drop snaps straight, work out its length by hand'. But the readout and the label on the drop already show the snapped length to two decimals (3.86, 1.96) before the sheet is filled in. The by-hand step is reduced to turning 3.86 into 27/7, which hands this player the answer they wanted to work out.

**Proposed fix.** On Commander only: once a drop has snapped and its sheet is open but not done, set that row to 'straight: work out its length' and blank the drop's label (l1 or l2). Restore the exact value (27/7 ≈ 3.86, √(27/7) ≈ 1.96) once typed[i]. While the drop is not snapped, keep the live length as drag feedback.

## c08

### c08-1 · c08-p1 · major

**Problem.** The right-hand panel is the point of this puzzle (the column picture), but nothing on screen says what it is. The player sees two lines on the left and, on the right, a green arrow to (1, 1), a red arrow to (1, −1) and a ring at (5, 1). Nothing says these are the same two equations read downwards. On Commander they solve x + y = 5, x − y = 1 by hand, type (3, 2) and win, and the right panel looks like decoration. It is the same complaint as Ch 18's "what does the yellow have to do with my green": why does typing (1, 0) on the left give a green arrow to (1, 1)?

**Proposed fix.** Put the explanation in the base goal, for every difficulty, because a story-skipping Navigator has the same gap: 'Two equations: **x + y = 5** (blue line) and **x − y = 1** (violet line). **Left:** find the one point (x, y) on both lines. **Right:** the same numbers read down the columns. Green **a₁ = (1, 1)** is the numbers in front of x, red **a₂ = (1, −1)** the numbers in front of y, and the ring **(5, 1)** the right sides. Your point is also a mix, x of green plus y of red, worked out under the panel. Done when the point is on both lines and the tip is on the ring.' On Commander only, call p.setGoal with the same text, replacing the drag sentence with 'Type a point and press **Place**.' Raise par from 2 to 5. Skip the extra arrow-label text: drawTwin is shared with the twin card and the Doubt Shake, and the goal is enough. While in this code, keep the 'Point (x, y)' boxes matching the drawn point. Dragging still works on Commander, but the drag handlers never call inp.set, so after a drag the boxes show a stale value.

### c08-2 · c08-p1 · major

**Problem.** Show me slides the point straight from (1, 0) to (3, 2), and the result card reads "SHOWN" with nothing under it. The only explanation of why (3, 2) is right is the win dialogue, which this player skips with Esc. They get the answer and no reason, the same as Ch 18's "I clicked Show me ... I'm unsure why they were the right answer". The same empty Shown card appears after Show me in p3 and p5.

**Proposed fix.** Use a note inside the puzzle, not a new engine field. Ch 18 kept its reason in the puzzle's own panel (h1.say), and the stage, dock and readouts stay on screen through the win card and the dialogue, so a local note is enough and touches no other chapter. Show me: slide along the violet line to (2, 1) and pause on a note: 'On x − y = 1, but 2 + 1 = 3, not 5. The tip (3, 1) falls short of the ring.' Then go on to (3, 2). End with a note that stays on screen, in a p.readout or in the dock: '(3, 2): 3 + 2 = 5 and 3 − 2 = 1, so it is on both lines. Read down instead: 3·(1, 1) + 2·(1, −1) = (5, 1). Same two sums, so the same two numbers answer both pictures.' On Commander, call inp.set at each stop so the boxes match the drawn point. Leave the PuzzleDef `shown` field as a possible later cross-chapter change; it is not needed for this fix.

### c08-3 · c08-p3 · major

**Problem.** After C has been slid, the dock on Commander is replaced by two columns of tiles and a "last line" box, but the goal still ends at "slide C along the line through them". The panel's only instruction, "Put the reasons in order", sits under the goal card. Nothing tells the player that one tile is a decoy, that they must press Check order, or that they must also type the last line. A correct order shows "That is the argument.", but the puzzle does not finish until the last line is typed as well.

**Proposed fix.** In startWhy(), call p.setGoal for the new phase. Commander: '**Now say why, in numbers.** Click the true reasons into order (not every tile belongs) and press **Check order**. **Then** fill in the last line below. You need both to finish.' Navigator: 'Now say why, in numbers: fill in the three checked steps below.' Use 'not every tile belongs' rather than 'one tile is wrong', so the player still has to find the decoy. Fix the overlap only in this chapter, not with a global .dock max-height that would change every chapter's dock. In startWhy, add a c08 class to the dock, as .dock.c09-procdock and .worksheet.c08-tanks already do. Give it max-height: calc(100vh - 300px) and overflow-y: auto, or make the tile tray more compact, so the heading clears the goal card. This adds no hint to the argument itself.

### c08-4 · c08-p4 · major

**Problem.** The goal asks the player to "look straight down the three white lines", but nothing says what the white lines are, and at the start there is only one (all three planes share it). What counts as "straight down" appears only in a hint, and turning the camera gives no feedback on how close the view is. Because the view is in perspective, the lines become short streaks, not neat dots. The player turns the camera blindly until they open a hint or press Show me.

**Proposed fix.** Stage the goal. At the start: 'A white line marks where two of the planes cross. Plane 3 is **2x + z = 4**. Press **+** to make it **2x + z = 5**.' Once b3 is 5, call p.setGoal: 'Now drag on empty space to turn the view until you look straight along the white lines: each one shrinks to a dot and the planes show edge-on. Hold that view to finish.' Leave out 'split into three' so the prediction keeps its point. Once b3 is 5, add a readout row 'angle between your view and the white lines: N°' using viewAngle(cam, P4.dir), shown in the result colour at 9° or less.

### c08-5 · c08-p5 · major

**Problem.** The hard idea in this puzzle is turning "B holds 1 more than A" into −x + y = 1, where the sign flips. Show me just fills in −1, 1, 0 and 0, −1, 1 with ticks, then shows an empty Shown card. A player who wrote 1, −1, 0 sees the right numbers but not why. The tonnes (3, 4, 6) are only in a toast that disappears after 5 seconds and in the skipped win dialogue. A label on the planes stays on screen, but nothing says that point is the answer to the tanks.

**Proposed fix.** Keep the explanation in this puzzle, without the engine field. The 'The logbook rules' readout stays on screen through the win card and its note can be replaced. In showMe, as rows 2 and 3 fill, call r.note again with the rules plus their translations: 'Rule 2 · B holds 1 more than A: y = x + 1, so −x + y = 1' and 'Rule 3 · C holds 2 more than B: z = y + 2, so −y + z = 2'. At the end add: 'Down the columns: a₁ = (1, −1, 0), a₂ = (1, 1, −1), a₃ = (1, 0, 1). Side by side they give back the rows. The planes meet at (3, 4, 6): tank A holds 3 t, B 4 t, C 6 t.'

### c08-6 · c08-p3 · minor

**Problem.** When the player types a point for A or B, the only feedback is "✓ all 3" or nothing. A point on two of the three planes looks the same as one on none, so the player cannot tell which equation failed. Every typed test is a move, and par leaves one spare move, so checking a guess costs a star. Show me drops A and B onto (1, 0, 2) and (2, 1, 0) with no working shown.

**Proposed fix.** Use the smallest version. In placed() during the place phase, call glowPlanes(planes, P3.rows, lastPlacedMarker.pos, tol) so the planes and their labels light (the ✓ on the equation labels) for the marker just placed. Leave out the full 'off by' readout. Raise P3_PAR to 8, and update the par comment and unit test in tests/singular/game-c08.test.ts. In Show me, before moving the markers, put a note in the Markers readout: 'Pick x = 1. x − y = 1 gives y = 0; 2x + z = 4 gives z = 2; check 1 + 0 + 2 = 3. Pick x = 2 the same way: (2, 1, 0).'

### c08-7 · c08-p4 · minor

**Problem.** Show me's explanation is only a picture ("plane 3 slides off the shared line ... a tube"), and the final view shows the tube as a tiny triangle about 50 px across. A CS student is never shown the one-line reason in numbers why changing 4 to 5 leaves no solution.

**Proposed fix.** Add to predict.reveal: 'In numbers: add planes 1 and 2. (x + y + z) + (x − y) = 2x + z, and 3 + 1 = 4. So every point on both has 2x + z = 4, and plane 3 now asks for 5. No point can do both.'

### c08-8 · c08-p5 · minor

**Problem.** The title asks "What is in the ballast tanks?", but the goal never asks the player for the tonnes and there is nowhere to type them. A player who solves the 3×3 system by hand looks for an answer box. Then the game shows (3, 4, 6) as soon as the three rows are typed, and nothing says that point is what is in the tanks.

**Proposed fix.** Add one sentence to the goal: 'Where the three planes meet is the answer: x, y, z tonnes in A, B, C. Done when the side-by-side grid is right.' Leave out the optional Commander 'Tonnes in A, B, C' step: it changes the puzzle's design and its tests, and this pass does not need it.

## c09

### c09-1 · c09-p5 · blocker

**Problem.** The player is told to 'Type row 2 − 2 × row 1' and to 'drag k', but rows 1 and 2 are never shown and k is never defined. The screen shows two lines labelled 'x + 2y = 3' and '2x + 3y = 6', where k has already been replaced by 3, and a worksheet that asks for 'k − 2(2) = k −'. The player cannot tell where k sits in the system, which line is row 1, or what the 'right side' dial changes. The title ('For which gain k does it work?') uses the story word 'gain', and only the skipped scene explains it.

**Proposed fix.** State the system on screen from the start. Put it in the readout, which before typing holds only a note: 'Row 1 (green): x + 2y = 3' and 'Row 2 (red): 2x + k·y = c   (now k = 3, c = 6)', with k and c updating as the dials move. A dock matrix would also work but makes the dock taller. Goal: 'The green line is x + 2y = 3. The red line is 2x + k·y = c, where k (the gain) and the right side c are numbers you will set. First type the new row 2 = row 2 − 2 × row 1, keeping k as a letter. Then dials for k and c appear: find a setting for each case (the lines meet at one point, are the same line, or never meet).' On Commander only, take the arithmetic out of the prompts: 'New row 2, first number =', 'second number = k −', 'right side ='. Keep the current prompts on Navigator and Cadet.

### c09-2 · c09-p1 · major

**Problem.** A player who skipped the scenes sees 'the power board' (a grid of numbers with a bar), three planes and a yellow light, and nothing on screen says how they connect. That is the Chapter 18 complaint again ('what does the yellow have to do with my green'). The goal never says that each row is one equation and that its plane is drawn in the same colour, or that the yellow light is the point where all three planes meet. Only the optional prediction mentions the light's meaning, and that box disappears once answered or skipped. The title 'Can we untangle the meters?' uses 'meters' without explaining it. The goal says 'subtract a multiple', but the panel under the board says 'add a multiple'.

**Proposed fix.** Keep the goal short and put the definitions in the persistent readout note. Goal: 'Each row of the board is one equation: the numbers in front of x, y, z, a bar, then the right side. Its plane has the same colour. Turn the board into a staircase: zeros under the first number of row 1, then a zero under the first number of row 2. Drag a row onto another row to add a multiple of it (a negative multiple subtracts).' Readout note (stepsReadout): 'The yellow light is where all three planes meet: the solution. Each step turns one plane about it; the light does not move.' Use 'add' in both places.

### c09-3 · c09-p2 · major

**Problem.** The puzzle is titled 'What does each generator give?' and the readout shows lamps G1, G2 and G3. Nothing on screen says that G1, G2 and G3 are the unknowns x, y and z. That link is made only in the skipped cold open. The player solves for z, y and x and has to guess which lamp each value lights.

**Proposed fix.** In genLamps, label the lamps `G${i + 1} = ${'xyz'[i]}` ('G1 = x', 'G2 = y', 'G3 = z'). Optionally add to the goal: 'x, y and z are the outputs of generators 1, 2 and 3.'

### c09-4 · c09-p2 · major

**Problem.** On Commander, all three worksheet prompts are visible from the start, and they give away the answers before the player works them out. Row 2's prompt says 'With z = 3', and row 1's prompt says 'With y = 2, z = 3, x ='. The player can copy y = 2 without solving row 2, so solving from the bottom up comes down to one subtraction. Later steps should not appear, let alone their answers, before the earlier ones are done.

**Proposed fix.** On Commander only, drop the earlier unknowns' values from the prompts: 'Row 3 reads z = 3. z =', 'Row 2 reads y + 2z = 8. y =', 'Row 1 reads x + 2y + z = 8. x ='. If a pointer is wanted, add 'use your z' or 'use your y and z', never the numbers. Also make the Commander mistake messages for row 1 carry no numbers (e.g. 'Move 2y and z across: subtract them'), since the current ones print y = 2 and z = 3. Keep the current prompts on Navigator and Cadet.

### c09-5 · c09-p6 · major

**Problem.** On Commander, reaching the staircase does nothing. The puzzle is won only by pressing a 'Staircase done' button that the goal never mentions, so a player who has typed a correct staircase waits for a reaction that never comes. The goal also uses terms it does not define for a player who jumped straight in: 'staircase' is defined only in p1's goal, and 'with LANTERN's arithmetic off' is story phrasing for 'nothing is computed for you'.

**Proposed fix.** Commander goal: 'Same board as puzzle 1, but nothing is computed for you. Pick a row operation, type the whole new row (right side included) and press Apply: the planes are redrawn from exactly what you typed. When the board is a staircase (zeros below the first number of each row), press Staircase done to have it checked.' Navigator can keep the shorter wording without the button.

### c09-6 · c09-p6 · major

**Problem.** The by-hand puzzle opens with its first step already set up: 'Row 2 → itself + −2 × row 1'. On Commander this tells the player how to compute the first step, which goes against 'Commander stays hard'. The same happens on the drag boards in p1 and p3: dropping a row opens a box that pre-fills the multiplier that clears the column and announces 'With this k, R2 gets 0 in the x column.' A Commander player who wants to work out the multiplier never has to.

**Proposed fix.** In HandBoard, start kIn empty on Commander (`value: p.difficulty === 'commander' ? '' : '-2'`). Leave the row pickers as they are: they must show some value, and an invalid default such as row 1 / row 1 would only add a confusing 'Pick two different rows' error. Apply with an empty k already says 'Pick two different rows and a number that is not 0.' Show me and wrong() use fill(), so they are unaffected.

### c09-7 · c09-p3, c09-p5, c09-p6 · major

**Problem.** Par counts clicks that are not row operations, so a perfect run loses stars. Exploring with a dial costs stars too. In p3 the readout shows 'Steps so far 3 / Fewest needed 3', but the final Place click is a 4th move against a par of 3, so the best possible score is 1 star. In p6 on Commander, three correct Applies plus the required 'Staircase done' press make 4 moves against a par of 3. Pressing Apply with an empty cell also costs a move. In p5, every tick of a dial counts as a move (par 6): sweeping the k dial once across 0 to 8, which is the natural way to explore, takes about 16 moves.

**Proposed fix.** p3: set `par: P3.par + 1` (the one required Place; placeInput is shared with c08, so leave it alone). The readout's 'Fewest needed 3' counts row ops only and stays right. p6: in HandBoard.apply, call p.move() only after the incomplete-cells check passes. In finish(), call p.move() only in the two failure branches, so a correct Staircase done is free while failed checks still cost (it acts as a checker on Commander). p5: remove p.move() from both Slider onInput handlers and add `sk.el.addEventListener('change', () => p.move())`, and the same for sc. The change event bubbles from the private range input, so Slider needs no edit. That makes it one move per drag or key press. While here, raise p4 par to 12 or count the Navigator 'why' steps once.

### c09-8 · c09-p2, c09-p3, c09-p4, c09-p5, c09-p6 · major

**Problem.** After Show me, five of the six puzzles show a 'SHOWN' card with nothing in it. The animation plays the answer with no line saying why it is right. In p5 the only explanation of the three cases is the closing dialogue, which this player skips. That is the same experience as 'it found two purple lines so I'm unsure why they were the right answer'. In p3 and p6, Show me never makes a try first; it plays the textbook steps straight away.

**Proposed fix.** Add an optional `shown?: string` to PuzzleDef and render it in winCard when the outcome is 'shown' and there is no predict reveal. That also fixes the empty card. Alternatively, follow Chapter 18 and put the line in an on-screen message (r.note or msg) at the end of showMe. Lines: p2: 'Each row has one new unknown once the ones below are known: z = 3, then y = 8 − 2(3) = 2, then x = 8 − 2(2) − 3 = 1.' p3 (no composer try): 'Row 1 has 0 under x, so no multiple of it can clear the x column: swap first. The staircase's bottom row −3/2 z = −3/2 gives z = 1, then y = 2, x = 1.' p5 (Show me already tries three settings, so only the why is missing): 'Row 2 − 2 × row 1 reads (k − 4)y = c − 6. If k ≠ 4, divide: one point. If k = 4 it reads 0 = c − 6: true everywhere when c = 6 (same line), never otherwise (no point).' p6: 'Each multiplier is −(entry to clear) ÷ (first number of the row you add): −2, −1, −1.' p4: 'Forbidden moves change which points solve the system; adding k × row 1 is undone by adding −k × row 1, so no point is gained or lost.' p4 is optional, since its Commander Show me already lays out the ordered reasons.

### c09-9 · c09-p4 · minor

**Problem.** Once the 'Say why' step opens, the dock grows tall and its top slides under the goal card. The sandbox matrix, which shows the new row 2 the reasons talk about, is hidden. The Commander 'last line' then asks about undoing 'R2 → R2 + 3R1', even when the player applied a different k (Show me applied k = 2, and the screen shows 5x + y = 7). The player sees a question about a move they did not make.

**Proposed fix.** Show the sandbox matrix in a readout, p.readout('Sandbox matrix'), for the whole puzzle and take it out of the dock in both the initial dock and startWhy. That frees roughly 100px, about what the overlap needs. If it still overlaps at short viewports, give the dock a max-height with scroll. On Commander, build the last line from kk: `To undo $R_2 \to R_2 + ${kw}R_1$, add this many times $R_1$:` with answer −kk. For the no-k-applied case, mirror the Navigator 'With k = 2 …' wording.

### c09-10 · c09-p3 · minor

**Problem.** A player who jumps straight to p3 is told to 'make the staircase' and 'climb back'. Neither term is defined in this goal: 'staircase' is defined only in p1's goal, and 'climb back' comes from p2 and the skipped 'climb' scene. The 'Place' button next to the point boxes suggests a point will be drawn among the planes, but nothing appears. It only checks the typed point.

**Proposed fix.** Goal: 'Row 1 starts with 0, so it cannot clear the x column. Swap rows first, then make a staircase (zeros below the first number of each row). Then solve from the bottom row up and type the point (x, y, z) where all three planes meet.' The button rename ('Place' → 'Check point') is optional and needs a label parameter on the shared c08 placeInput. Do not draw a marker at the typed point: that only adds work, and hideSolutionLabel already keeps the answer hidden as intended.

<details><summary>Dropped by the checker</summary>

- c09-6 (p1/p3 part): Dropped. Removing RowOpsBoard's auto-filled multiplier and its 'gets 0' note on Commander in p1/p3 is a redesign of difficulty, not a clarity defect. In p1/p3 the lesson is the staircase shape and that the solution does not move; working out multipliers by hand is p6's job, which is fixed above. p1's own hint relies on 'The board fills in −2'. The change would also add a difficulty branch to a shared kit used by 14 boards. Standard 8 limits what fixes may give away; it does not ask for existing scaffolds to be removed outside the by-hand puzzle.

</details>

## c10

### c10-1 · c10-p6 · blocker

**Problem.** On Commander the player has to place the green arrow p so the moved line passes within 0.01 of the yellow line. There is no snapping and no box to type into; the goal says "Drag". The arrow drags on the flat plane through its tip. At this camera (FOV 32, distance 20, elevation 22) one screen pixel is about 0.013 to 0.03 world units, so 0.01 is less than a pixel. The player can see the gap shrink in the readout but cannot close it with a mouse. Arrow keys do nudge by 0.1 (and PageUp/PageDown change height), which would reach (3, 1, 0) exactly, but nothing on screen mentions them.

**Proposed fix.** Commander only: replace the drag with a typed tip in the c18 LineHunt style. Use a VectorInput with 3 boxes prefilled 1, −1, 0 and a **Move** button. Draw the arrow exactly at the typed point with handle.set(). Turn the drag off on Commander as c18 does (draggable: !typed) so the boxes and the arrow cannot disagree. Count one move per Move. Commander goal: "Type a tip for the green arrow **p** and press **Move**. The green dashed line (the white line shifted by p) moves with it. Make it land on the yellow line (gap 0)." Keep tol at 0.01. Standard 7 (exploring is not punished): PAR.p6 = 4 against a Commander minimum of 3 leaves room for only one test tip, so raise the Commander par so that 3 or 4 test tips stay within par, and update the p6Min par test in tests/singular/game-c10.test.ts. The arrow-key dock line on the other difficulties is optional, since their snap makes the drag easy.

### c10-2 · c10-p5 · blocker

**Problem.** Nothing on screen says where k and m are in the system. The planes are drawn with the current numbers already put in, so the third plane reads x + 3y + 6z = 3. A player who skipped the scene cannot tell whether k is the 6 and m is the right-hand 3, or the 3 on y. Then the goal asks them to reduce that system by hand and type "k − _" and "m − _". They cannot reduce rows they have never seen written out, and they cannot tell what the k and m dials will change.

**Proposed fix.** Goal: "The three planes are $x + y + z = 1$, $x + 2y + 3z = 2$ and $x + 3y + kz = m$ (blue; now k = 6, m = 3). Reduce by hand and type the reduced last row. Then dials for $k$ and $m$ appear: find **all three** cases (one point, a whole line, nothing)." Add a readout row 'third plane: x + 3y + kz = m, now k = 6, m = 3' that updates with the dials. Leave the reduced-row numbers hidden as they are now. A custom 'x + 3y + kz = m' label on the blue plane would need a PlaneSet change. It is optional once the goal and readout carry the system.

### c10-3 · c10-p6 · major

**Problem.** The puzzle never shows which equations the two lines solve. "Meter" and "pod bay flows" are story words, and p6 has no board and no equation anywhere on screen. A player who jumps in here sees a yellow line of "answers of the pod bay flows" and a white line of "answers with every meter at 0" and has to guess what system and what meters these are. On Commander the last step then asks for row 2's value at p + 4h, and the right-hand side it depends on is not on screen.

**Proposed fix.** Say what the two lines are in maths terms, briefly. Goal: "**Yellow**: every solution of $x_1 - x_2 = 2$, $x_2 - x_3 = 1$, $x_1 - x_3 = 3$. **White** (through the origin): every solution with all three right sides 0 (\"every meter at 0\"). Move the green arrow **p** so the green dashed line (the white line shifted by p) lands on the yellow line." If the goal gets too long, put the two systems in a short readout block instead ('Yellow: … = 2, 1, 3' and 'White: … = 0, 0, 0') and keep the goal to the yellow/white definitions.

### c10-4 · c10-p6 · major

**Problem.** There are two white dashed lines on screen that look almost the same: the zero line through the origin and its copy shifted by the arrow. Only one has a label. The goal talks about "the white line" in the singular and then "the white line, moved by the arrow", so the player cannot tell which line is which or which one they are moving.

**Proposed fix.** Draw `moved` dashed in the arrow's green (C.v). Keep its switch to C.result on success. Give it a Label that follows the tip, e.g. 'white line shifted by p'. Use 'green dashed line' in the goal text (shared with c10-1 and c10-3).

### c10-5 · c10-p4 · major

**Problem.** The marked points A, B and C have no coordinates, and the puzzle has no readout at all. Nothing shows where the dials s and t put the point either. The player cannot work out which dial values reach A, B or C. They can only move sliders and watch dots in a 3-D view, which is guesswork rather than thinking. The goal also says "turn the two dials", but no dials are on screen until all three typed lines are right, and nothing says they will appear.

**Proposed fix.** Label the targets 'A (2, 1, 0)', 'B (6, 0, 2)', 'C (0, 1, −2)'. In startDials(), add a readout 'Your point' with rows 's, t' and 'p + s d₁ + t d₂' showing the current numeric point. Goal: "…as a point plus two directions. Then two dials appear: turn them to land on **A, B and C**." Working out s and t for each point stays with the player.

### c10-6 · c10-sp · major

**Problem.** In job 3 every number disappears. The flow readout is removed, and the door's corners and "door centre" carry no coordinates. "Centre" does not say which centre of a triangle is meant, and "burn" (the direction a u + b w) is never defined. On Commander the path has to meet the centre within 0.01, so the player can only match an orange dot to a white dot by eye. Nothing links the weights a and b to where the path hits the door.

**Proposed fix.** Goal job 3: "3. The drone at the origin flies in a straight line along $a\,\mathbf u + b\,\mathbf w$. Choose a and b so that line passes through the door's centre (the average of its three corners)." Label the corners (1, 0, 0), (0, 2, 0), (0, 0, 3). When the drone phase starts, add a readout 'Drone' with numeric rows 'a u + b w = (…)' (the current numbers, not the symbolic (a, b, a + b)) and 'path meets the door at (…)' or 'never'. Do not show the centre's coordinates.

### c10-7 · c10-p3 · major

**Problem.** Nothing on screen says that a "meter" is the right-hand side of an equation. "Meter three now reads 4" refers to an earlier value of 3 that a story-skipper never saw. The player cannot find the link by trying either, because the meter buttons refuse to work until the board is reduced. The set piece has the same gap, made worse: the third plane reads x + 3y + 5z = 5 while m = 5, so either 5 could be m.

**Proposed fix.** p3 goal: "Each **meter** is the right-hand side of one equation (the board's last column). Meter three now reads 4 (it read 3 before). Reduce the board until a row says something impossible. Then change **one meter** so a solution exists." Do not say which meter should change or to what value. Title the readout 'Meters (right-hand sides)'. Set piece, job 1: "The damaged meter m is the right side of the third equation, $x + 3y + 5z = m$. Set m so the planes share points."

### c10-8 · c10-p4 · major

**Problem.** Every single slider step counts as a move, so on Commander even perfect play misses par and loses stars. In p4 (step 0.5) the shortest tour (0,0)→(0,2)→(1,0)→(1,−2) costs 14 moves against par 7. In the set piece (meter step 1, t step 0.05, a step 0.125), the minimum is 2 + 6 + 4 = 12 against par 6. This affects p4 and c10-sp. The unit test assumes one move per dial change, but the code calls p.move() on every input event.

**Proposed fix.** Apply p2's `counted` pattern (count on the first input, then reset the flag on pointerdown, keydown and change) to the sliders in p4 (s, t), p5 (k, m) and the set piece (m, t, a, b). In the set piece the existing onRelease 'change' listener can share the reset. Show me's explicit p.move() calls stay. Add a check that dragging one Commander slider end to end counts one move.

### c10-9 · c10-p5 · major

**Problem.** Show me sets the answer and stops. The "SHOWN" card is empty, and no line says why the answer is right. This is the complaint the player made about Chapter 18. On p5 the rule for the three cases is said only in the win scene line, which this player skips. The same empty card ends Show me on p1, p2, p4 and the set piece; only p3, which has a predict reveal, explains itself.

**Proposed fix.** One mechanism instead of a different one in each puzzle: add an optional `shown?: string` (markdown) to PuzzleDef and render it in winCard when the outcome is 'shown' (in the box that is empty today). Fill it for p1, p2, p4, p5 and the set piece with the audit's reason lines. For p4, also let Show me make one wrong try first (e.g. go to (1, 1), which misses A) before the real dials, as c18 p1 shows misses. Leave p3 (it has the predict reveal) and p6 (the shown tiles state the argument) as they are.

<details><summary>Dropped by the checker</summary>

- c10-10: Minor, and the fix would make Commander easier. The Commander worksheet appears only after the board is reduced, it is titled, and its prompts ('With x₃ = t: x₁ = _ + t') say exactly what to type, so the player is not left wondering what to do. The mismatch with the subgoal wording is cosmetic. The proposed goal ('Column 3 has no pivot, so x₃ is free') would name the free column from the start, before the player has reduced anything, which hands over a result Commander should earn. Relabelling a subgoal on one difficulty would also need a new HUD API, since there is only setGoal and no setSubgoals.

</details>

## c11

### c11-1 · c11-p5 · blocker

**Problem.** On Commander, the only way to place the yellow 'A x' arrow is to drag it. There is no box to type it in, it does not snap, and it has to land within 0.01 of (7, −1). Here one screen pixel is about 0.012 units, so the drag has to hit one exact pixel. A player who has correctly worked out (7, −1) by hand drops the arrow there and gets told 'That is (6.98, −1.01). Work out both entries first.' That message says their maths is wrong when only the pixel was off. The arrow also starts at (2, 2) already labelled 'A x', so before anything is worked out the picture claims A x = (2, 2). Arrow-key nudging exists in drag.ts, but nothing on screen mentions it.

**Proposed fix.** In p5 (puzzles.ts:632), give the `res` handle `snap: p.snap() ?? 0.1`. The same puzzle's 3-D `land` handle (:665) and p4's forecast arrows (:511) already do this. (7, −1) is a multiple of 0.1, so a drag can land on it and tol stays 0.01. Start the arrow at (1, 1) with label '?' and relabel it '$A\mathbf x = (7, -1)$' once it is accepted. Change the miss line so it stops blaming the maths: `The yellow arrow is at ${fmtV(t)}. That is not A x yet.` For the Commander typing path, add an `A\mathbf x =` VectorInput to the dock, like p1's marker box and the 3-D stage's `landing =` box. It starts at [1, 1], onChange draws the arrow and onSubmit runs the same `near(…, P5_AX, tol)` check. An alternative that avoids typing the same answer twice: on Commander, the worksheet's last row (the only row Commander checks) is already a typed A x, so its onDone could glide the arrow there and tick 'Place A x'. Either way, nothing about how to compute it is given away.

### c11-2 · c11-p1 · major

**Problem.** The player has to predict where (3, 2) lands from just two landing spots. That only works if the pulse moved the whole grid and kept grid lines straight, parallel and evenly spaced, with the origin fixed. That fact was shown only in the cold-open cinematic, which this player skipped, and on Commander the moved-grid ghost is hidden. 'The first grid arrow' is also never said to be (1, 0): the two grey arrows have no labels. A player who wants to reason has no basis for an answer being fixed at all. The reason only appears in the reveal, after the fact. This is the same complaint the player made about chapter 18: 'unsure why they were the right answer'.

**Proposed fix.** Rewrite the p1 goal in plain words first. 'The pulse moved the whole grid: grid lines stayed straight, parallel and evenly spaced, and the origin (0, 0) stayed put. The grey grid arrows are $\mathbf e_1 = (1, 0)$ and $\mathbf e_2 = (0, 1)$. The pulse sent $\mathbf e_1$ to **(1, 1)** (green) and $\mathbf e_2$ to **(−2, −1)** (red). Where did the buoy from **(3, 2)** land? Type it in the marker box (or drag the yellow marker), then **Replay the pulse** to check.' Label the two grey arrows at :77 '$\mathbf e_1$' and '$\mathbf e_2$', the same labels Bench2 gives them in p2. Keep the moved-grid ghost hidden on Commander (:67). That is a deliberate helper and would show the answer.

### c11-3 · c11-p3 · major

**Problem.** The white point x starts at (2, 2), which points the same way as the green T(e₁) = (1, 1) arrow. The green arrow is hidden under the white one, and the labels 'T(e₁)' and 'x₂e₂' pile up on it. The first instruction, 'Drag x off both axes', gives nothing to do, because x is already off both axes. Nothing on screen says what T is, or what the green and red arrows are, so 'watch its two parts' has no reference point.

**Proposed fix.** Start `xh` at (2, 0) (:249), so 'drag x off both axes' is a real first step and nothing covers the green T(e₁) arrow. Pulsing on an axis already triggers Bram's 'Pick a point off both axes' bark, which is an on-screen toast, and par 10 absorbs the test. New goal: '$T$ is the pulse: green $T(\mathbf e_1) = (1, 1)$ and red $T(\mathbf e_2) = (-2, -1)$ are where it sends the grid arrows $\mathbf e_1 = (1, 0)$ and $\mathbf e_2 = (0, 1)$. Drag the white point $\mathbf x$ off both axes; its grey parts are $x_1\mathbf e_1$ and $x_2\mathbf e_2$. **Pulse** it and watch where each part goes.'

### c11-4 · c11-p6 · major

**Problem.** The goal says to type 'nine numbers' into each reading, but each reading is a 2×2 box that holds four. Which four, and why, is left to the story phrase 'the ground layer'. The readout note says the dashed arc is how the pulse turned the grid 'in the cold open', which this player never saw. That arc is the target ('the same way round as the pulse'), so what it shows needs to be stated in plain words.

**Proposed fix.** New p6 goal: 'Ilse wrote nine numbers, three per spire (readout). Read them two ways: each spire as a **column** of C, or as a **row** of R. Only the flat x-y grid is turned here, so each box takes the first two numbers of the first two spires. The third spire, (0, 0, 1), only keeps height. **Turn the grid** with each, then **Load** the one that turns $\mathbf e_1$ the same way round as the pulse.' Replace the readout note (:751) with: 'Dashed white arc: the pulse sends $\mathbf e_1 = (1, 0)$ to $(1, 1)$, a counterclockwise turn.'

### c11-5 · c11-p2 · major

**Problem.** In five puzzles, Show me jumps straight to the answer and explains nothing. The 'Shown' card at the top is an empty box. The reason is only in the win dialogue, which this player skips. They see the columns become (2, 1) and (1, 2), or the spires go in as columns, with no idea why that is right. This affects p2, p4, p6, p7 and the build stages of p3; p1 (via its reveal) and p5 (its worksheet fills in) are fine.

**Proposed fix.** At the end of Show me, put one line of why on screen where it stays. The simplest way that also fills the currently empty 'SHOWN' card: add an optional `shown` markdown string to PuzzleDef and render it in runner.ts winCard when outcome === 'shown'. A puzzle-local panel message, as Chapter 18 does with h1.say or msg, is the per-chapter alternative; p2 and p7 have no readout, so they would need one. Do not use p.bark, which disappears after 5 s. For p2, run the existing misconception first: Pulse with [[3, 1], [3, −1]], so (1, 1) visibly lands on (4, 2), then glide to the answer. The auditor's reason lines are mathematically correct (checked against P2_ANSWER, SHEAR, R2, S_now, T3, READ_COLS/READ_ROWS and P7_TARGETS) and can be used as written.

### c11-6 · c11-p1 · major

**Problem.** Most Commander goals start with 'Drag…'. On Commander, drags do not snap and must be within 0.01, so a dragged answer is almost never accepted. The player only gets a near miss such as '(1, 1) landed on (3.02, 2.97)'. Worse, every drag counts as a move. p1's par is 1, so doing what the goal says (drag the marker, then Replay) costs 2 moves. A correct first answer then earns only 1 star.

**Proposed fix.** Narrow the fix. (1) Pass `countMoves: false` to p1's marker VectorHandle (:82). Replay is the test and it already counts a move (:100), and the marker has a matching typed box. (2) On Commander, lead the goals with typing: p1 'Type where it landed in the marker box (or drag the marker)'; p2, p3 build and p7 'Type the matrix (or drag the column tips)'; p4 'Type the columns (or drag the tips)'. Drop the blanket `countMoves: false` on the Bench2 and Bench3 column handles. p2's par of 2 already counts two drags: a correct second drag auto-commits through onCommit, so that change is unnecessary and would shift par on every difficulty.

### c11-7 · c11-p3 · major

**Problem.** 'The bench' is a story word that is never translated into maths. It drives the last two stages of p3: 'Pin what the bench cannot do' and 'what the bench can never do'. The point is that no matrix can move the origin or bend a grid line, and calling it 'the bench' hides that the claim covers every matrix. The same unexplained word appears in p5 ('The 3-D bench'), p7 ('Build it on the bench') and p4 ('Build the spire numbers on the bench'). In p4 it is also never said what the spire numbers are supposed to be.

**Proposed fix.** Apply it to p3, where the word hides the lesson. Subgoal: 'Pin what no matrix can do'. Slide goal: 'Orange: **everything slides 3 to the right**. No 2×2 matrix makes this grid. Drag the **evidence pin** to the place that shows why.' Warp goal: 'Orange: **the curved warp**. Its origin stays put. Drag the **evidence pin** onto something no matrix can do to a grid.' Also change the slide bark 'Every move on the bench' to 'Every matrix'. In p4, say what the spire numbers are: 'The three tips in the readout are a guess at where the pulse sends $\mathbf e_1, \mathbf e_2, \mathbf e_3$. Type them as the columns of $A$.' Later stages: 'the measured pulse (readout): its landing spots are the columns.' This replaces 'LANTERN measured…'. p5 and p7 are optional: p5's readout already shows the bench as a matrix, and p7's dock shows 'A ='.

### c11-8 · c11-p5 · minor

**Problem.** In the 3-D stage, the tip-to-tail copies of the columns from the flat stage are still on screen: three green arrows, a red one and a large blue one running off the bottom right. They cross the new matrix's a₁ label and look like part of the 3-D task.

**Proposed fix.** In p5, keep the promise from `tipToTail` (:644), for example `chainP = tipToTail(...).then((a) => (chain = a))`. In enterSpace, `await chainP` (if set) before hiding, then `await fadeOut(chain, fast ? 0 : 300)` so the arrows are disposed, not just set to opacity 0. That makes the result independent of timing.

### c11-9 · c11-p3 · minor

**Problem.** The build stage tells the player to 'match the dashed grid', but the target grid is a faint solid white grid. On screen there is also the live blue grid, so a player looking for dashes cannot tell which grid is the target.

**Proposed fix.** Pass `dashed: true` to the p3 target FlatGrid at :341. FlatGrid already supports it through FatSegments' dashSize and gapSize. Do the same for p7's ghost at :835, whose 'dashed grid' wording appears only on Cadet and Navigator. If the dashes at opacity 0.22 are too faint, change the words instead: 'match the faint white grid (its column tips are ringed)'.

## c12

### c12-1 · c12-p4 · blocker

**Problem.** In the second step on Commander, the player has to type the matrix that moves AB across a dot product. The answer depends on the entries of A, but A's matrix never appears on screen. The goal only calls it 'the quarter turn A', and a player arriving out of order cannot tell which way it turns (clockwise gives a different answer). The wording 'type its mover for the quarter turn A' is also hard to parse: 'mover' is never defined, and 'its' could mean A or AB. Meanwhile the old M input (faded) and the stage-1 dot-product rows stay on screen, so it looks as if M still needs editing.

**Proposed fix.** In enterTwice (on every difficulty is fine; on Commander at least):
(1) Show A next to B: `r.eq(`A = ${texMat(CARDS.turn.M)}\quad B = ${texMat(P4_B)}`)`. Readout.eq() replaces its content, so `r.eq('A = …')` on its own, as the audit wrote it, would wipe B off the screen.
(2) Use the audit's Commander goal: it gives A's matrix, defines 'mover' as the matrix that moves a matrix to the other side of a dot product, says B's mover is in the readout, then asks the player to put the steps in order and type the mover of AB.
(3) Replace `input.el.style.opacity = '0.6'` with `input.el.hidden = true`.
(4) Call `r.hideRow('l'); r.hideRow('r')`. hideRow exists, and later upd() calls rewrite the rows without un-hiding them.
None of this says 'transpose' or gives away the order.

### c12-2 · c12-p4 · major

**Problem.** At the start, M is the identity and the readout already shows both sides equal (2 and 2), with the right side in the 'match' colour. The task is 'make the two sides equal for every x and y', so the first thing the player sees says the starting matrix already works. The picture misleads before the player has done anything.

**Proposed fix.** Start y at [1, 0, 0] in both places: the VectorHandle at line 298 and the reset in enterTwice at line 357, which becomes `x.set([2,1,0]); y.set([1,0,0])`. Checked: M = I gives 4 vs 2; the slip M = B gives 4 vs 2; only Bᵀ = [[1,0],[2,1]] gives 4 = 4. Nothing about the method is revealed.

### c12-3 · c12-p1 · major

**Problem.** On Commander, Show me only types (0, −1; 1, 1) and presses Fuse. It never plays the rail, so the player never sees (1, 0) and (0, 1) go through the shear and then the turn. The only explanation of why those are the columns is LANTERN's win line, which this player skips. The 'SHOWN' card at the top is empty. It is the same complaint as in Chapter 18: 'it found the answer so I'm unsure why it was right.'

**Proposed fix.** In solveAll (Show me path), on every difficulty:
(a) Optionally show the common slip first: `bench.set(P1_AB); await fuseIt(fast)`. Its existing bark explains the swapped order, and on Commander it does not replay the rail.
(b) Then play the rail directly, not through playIt (playIt still refuses on Commander): `busy = true; await runRail(fast); busy = false;`. runRail itself does not take `busy`.
(c) Then `bench.to(P1_BA)` and fuseIt.
(d) Leave a persistent line, not a bark (the win dialogue covers barks). p1 has no readout, so use `p.readout('Why these columns').note(...)`: 'Column 1 is where (1, 0) ends up: the shear leaves it at (1, 0), the turn takes it to (0, 1). Column 2: (0, 1) → shear → (1, 1) → turn → (−1, 1).' The maths is checked against SHEAR and R2.

### c12-4 · c12-p2, c12-p4, c12-p5, c12-p6, c12-p7 · major

**Problem.** Every other Show me in the chapter also gives the answer with no reason. It puts the right cards or matrix in place, plays them, and the puzzle ends. The 'why' is said only in the win dialogue (skipped) and in hints the player did not open. The empty 'SHOWN' box at the top of each after-Show-me screen highlights that nothing was explained.

**Proposed fix.** End each showMe with a persistent line: `p.readout(<title>).note(md)` (Readout.note exists). p2, p5 and p7 have no readout yet; p4 can use its existing `r`.
- p2: use the audit's line (checked).
- p4: before typing M, show the informative pair x = (0, 1), y = (1, 0). With M = I the left side is 2 and the right side is 0. Then note: 'With x = e₂, y = e₁ the left side is B's entry (row 1, col 2) and the right side is M's entry (row 2, col 1), so they must match. Every entry of M is B's entry from the mirrored place.' For the second step, use the audit's line: 'A is outside, so it crosses first and lands next to y; B's mover lands on its left: M_B M_A.'
- p5: play the existing wrong() pair (px, px) first, then use the audit's line (checked: PY·PX = 0).
- p6, stage 1: 'e₁: stretch → (2, 0), shear → (2, 0), turn → (0, 2). e₂: stretch → (0, 1), shear → (1, 1), turn → (−1, 1).'
- p6, ring: 'Every matrix keeps the origin (a blob point) fixed and sends opposite ring points p, −p to opposite points, so the origin stays halfway between them. No straight cut can have it on the other side.'
- p7: use the audit's line '(CB)A = C(BA)', which matches P7_CARDS (A = shear, B = turn, C = stretch).

### c12-5 · c12-p6 · major

**Problem.** In the second step (the ring and the blob), green and red dots with dashed trails from the earlier rail play are still on screen. They mark where e₁ and e₂ went in step 1 and have nothing to do with the ring. Two of the green dots sit exactly on ring points, (2, 0) and (0, 2), and green and red are also the colours of the column arrows a₁ and a₂. The player cannot tell what these dots are or whether they are targets.

**Proposed fix.** In enterRing, next to `ghost.show(false)`, add `tracer.reset(); tracer.show(false);`. reset() disposes the dots and clears the trails; show(false) hides the arrows and labels that reset() turns back on.

### c12-7 · c12-p6 · minor

**Problem.** On Commander the first step gives the answer away. The goal says to play the rail first. Playing it traces e₁ to (0, 2) and e₂ to (−1, 1), and those dots stay on screen while the player types, so the task becomes copying two dots into the boxes. Puzzle 1 deliberately blocks Play on Commander until the player has Fused, so the two puzzles also behave differently.

**Proposed fix.** Mirror p1. On Commander, setGoal: 'The rail holds three moves; the right-hand one acts first. Build the **one** matrix that does all three and **Fuse**. Then **Play the rail** to compare.' Track `committed` in fuseIt. In playIt, add `if (p.difficulty === 'commander' && !committed) { sfx.miss(); p.bark('lantern', 'Commander: enter your single matrix and Fuse first. Then play the rail to compare.'); return; }` before p.move(), so it costs no move. Show me must bypass the gate: solveAll currently calls `playIt()`, so give it an internal play without the check. Optionally match p1 with `draggable: p.difficulty === 'cadet'`.

### c12-8 · c12-p4 · minor

**Problem.** The goal uses a story name and a story verb, 'let Bram shake 200 pairs', and the second subgoal reads 'Survive Bram's 200 pairs'. A player who skipped the scenes does not know who Bram is or what shaking does: random testing that stops at the first pair that fails.

**Proposed fix.** Goal: '…Drag $\mathbf x$ and $\mathbf y$ to test it. Then press **Shake 200 pairs**: it tests your $M$ on 200 random pairs and stops at the first pair where the two sides differ.' Subgoal 2: 'Pass the 200-pair test'.

<details><summary>Dropped by the checker</summary>

- c12-6: Already handled on screen. Bench2's input uses colourCols: the column-1 entries are green and the column-2 entries red, matching the labelled arrows a₁ (green) and a₂ (red), which move live as the player types (c12-02-commander-start.png). The link between the input and the arrows is visible. The proposed sentence also adds 'where (1, 0) lands', which is the method (follow e₁ and e₂ through the moves) that the Commander goal deliberately leaves out; the Navigator goal states it. That edges toward giving away HOW, against standard 8.
- c12-9: Speculative, and the fix is bigger than the problem. The goal names the dock button by its exact label, 'Reset the rail', which sits beside Play (c12-17-commander-start.png). The HUD Reset is the global restart used on every puzzle. Pressing it by mistake costs only a redo of one grouping: after it, a single Play prompts 'Now group them the other way', so the player is not stuck or misled. Auto-restoring cards and rewriting the flow of an optional puzzle is not a small, plainly better change.

</details>

## c13

### c13-1 · c13-p4 · major

**Problem.** On Commander, getting the left half to I is not enough. The subgoal stays open and the 'Run the same moves on [A | B]' button never appears until the player also types A⁻¹ into a separate box. The goal never mentions that step. The box's heading shows as raw LaTeX, and the only explanation is a bark that disappears after 5.2 seconds. So the player finishes what the goal asked, nothing happens, and they have to decode '$A^{-1}$' to work out why.

**Proposed fix.** Keep the typed step and say it up front. On Commander only, call p.setGoal('Row reduce **[A | I]** until the left half is the identity. Each row operation is a move of the grid: watch it act on the box. Then **type $A^{-1}$** in the box below (LANTERN checks only that $A$ times it is $I$). Then run the same moves on **[A | B]**.'). Make the worksheet title plain text: 'Type A⁻¹ (LANTERN checks only that A times it is I)'. A kit-level fix that renders StepWorksheet titles with inline() would also fix the same bug in c07 (puzzles.ts:309), but it touches other chapters, so hold it until the cross-chapter standard is agreed. Subgoal text is static: setGoal cannot change it per difficulty and the HUD has no setSubgoals. So either leave subgoal 1 as it is, since the goal now carries the step, or reword the static text so it works on every difficulty. Do not plan on a Commander-only subgoal unless a HUD API is added.

### c13-2 · c13-p2 · major

**Problem.** This is the same 'what does the yellow have to do with my green' confusion reported in Chapter 18. The goal never mentions yellow. The screen has two identical yellow dots, two green rings and two red rings. The targets e₁ and e₂ are rings in the same green and red as the draggable tips, with tiny grey labels. The readout prints the landing spot in green text even though it is drawn as a yellow dot. The dock says the yellow dot is where the move sends the point 'back', but before the puzzle is solved it is not back anywhere.

**Proposed fix.** Goal: 'The move $A$ sends $(1, 0)$ to $(2, 1)$ and $(0, 1)$ to $(1, 1)$. **Green** and **red** are two points you choose (drag the tips or type them). Each **yellow dot**, joined to its point by a dashed line, is where $A$ sends that point. Move green until its yellow dot sits on the ring $\mathbf e_1 = (1, 0)$, and red until its yellow dot sits on the ring $\mathbf e_2 = (0, 1)$. Those two points are the undo\'s columns.' Readout: Readout has only one eq() slot, so use rows instead of two eq lines. For each point, add a row labelled e.g. 'green (0, −1): $A$ sends it to' with value '(−1, −1)' coloured C.result (yellow), replacing the green or red 'lands at' rows. Pad labels: 'target $\mathbf e_1 = (1, 0)$' and 'target $\mathbf e_2 = (0, 1)$'. Dock line: 'Each point is where the undo sends a grid arrow: drag the tips or type the columns. Each yellow dot is where the move $A$ sends that point.'

### c13-3 · c13-p6 · major

**Problem.** When the player presses Declare, the matrix they need for computing by hand disappears, and debris from the first phase stays on screen. The probe goal and readout never show A again. The frame stays where the player's failed undo put it, on a different line from the one A lands points on. The orange gap lines and the 'nose at … built at (3, 0)' label stay. The faded green and red Ue₁/Ue₂ arrows also stay next to the new green and red start dots. As a result, 'the green and red points' and 'the move lands them' point to the wrong things.

**Proposed fix.** In toProbe: add r2.row('A', 'the move $A$', `$${texM(P6_A)}$`) as r2's first row. Undo any fired shot: UndoBench.backToDamage already hides gap and gapLabel and puts the frame and grid back on A's line, so make it public (or wrap it as clearShot()) and await it in toProbe. Disable Declare while a Fire is in flight, or await it, so a late showGap cannot reappear. Set bench.c1.arrow and bench.c2.arrow to opacity 0 (Arrow.setOpacity(0) hides the group and the label), not 0.25. Probe goal: 'The move $A$ puts every point on the yellow line. **Green** and **red** are two start points (drag or type them). Each yellow dot is where $A$ lands one. Put two **different** points where $A$ lands them **on the same spot**.' Optionally colour the r2 landing values C.result to match the yellow dots.

### c13-5 · c13-p4 · major

**Problem.** Even a perfect solve cannot reach par, so every player gets at most 1 star and is told they did badly. Trying a row operation can never help. Replaying the moves on [A | B] counts every replayed operation as a new move, on top of the replay itself, and Commander adds one more move for the typed check.

**Proposed fix.** Give AugBoard.play an option to skip counting, e.g. play(ops, ms, { count: false }), passed through to apply so it skips p.move(). Use it in replay() and keep replay's single p.move(). Set par to 10: 5 operations, the replay, Commander's typed check, and 3 spare for trying an operation and undoing it. The minimum is 7 on Commander and 6 elsewhere.

### c13-4 · c13-p2 · major

**Problem.** Show me gives the answer but not the reason. On p2, p4, p6 and p7 the result card reads 'SHOWN' with nothing under it. The reason (why those points are the columns, why [A | I] writes down A⁻¹, why two points on one spot proves there is no undo, why keeping the multipliers pays) exists only in LANTERN's win lines, which this player skips. p7's own title question, 'What if LANTERN kept the multipliers?' ('Show me why that is worth the memory'), is answered only in that dialogue. p2's Show me also jumps straight to the answer without trying anything first.

**Proposed fix.** Show the why line in the puzzle, as Chapter 18 does (h1.say(reason) at the end of showMe, plus a win message). Put it in the readout with r.note(...) when the puzzle is won, both by the player and by Show me, because this player also skips the win dialogue. A runner-wide PuzzleDef.why rendered in winCard touches every chapter: propose it only once the cross-chapter standard is agreed. Lines: p2: 'Why: $A$ sends $(1, -1)$ to $(1, 0)$ and $(-1, 2)$ to $(0, 1)$. The undo must send each grid arrow back to the point that landed on it, so those points are its columns: $AU = I$.' p4: use a generic count, because Show me continues from the player's own ops and may take more than 5: 'Why: each row operation is a matrix $E$. Yours made $E_k\cdots E_1A = I$, so $E_k\cdots E_1 = A^{-1}$. The right half started as $I$, so the same operations wrote $E_k\cdots E_1 I = A^{-1}$ there; on $[A \mid B]$ they write $A^{-1}B = X$.' p6: 'Why no undo exists: $(2, 0)$ and $(0, 1)$ both land on $(2, 4)$. An undo would have to send $(2, 4)$ back to both, and a move sends each point to one place.' p7: 'Why keep them: $LU = A$. For each new $\mathbf b$, solve $L\mathbf y = \mathbf b$ downwards, then $U\mathbf x = \mathbf y$ upwards: two substitutions, no new elimination.' p2's showMe: first move green to (1, 0) and red to (0, 1). Pause about 900 ms with the yellow dots at (2, 1) and (1, 1), off the rings. Then move to P2_TO_E1 and P2_TO_E2 and play.

### c13-6 · c13-p6 · minor

**Problem.** At the start there is no frame on screen, only a pale yellow line through the origin and the dashed ghost. Nothing says that the line is the flattened frame, or that every point now lies on it. The first subgoal says 'Try an undo, or declare that none exists', but firing an undo does not tick it; only Declare does. A player who tests a few undos sees the subgoal stay open and may keep firing.

**Proposed fix.** Goal: 'The move $A$ flattened this frame: every point of it now lies on the **yellow line**; the dashed ghost is where it was built. Try an undo; if you think none exists, press **Declare: no undo exists**. Then prove it: put **two different points** where $A$ lands them **on the same spot**.' Subgoal 1: 'Press Declare once you think no undo exists'. The par of 4 still leaves room for this on Commander: typing U and the points costs no moves, so 2 Fires plus Declare is 3.

### c13-7 · c13-p4 · minor

**Problem.** The goal and the second subgoal mention B and 'Solve A X = B', but B is never shown before the replay overwrites the board. After the replay the right block is still headed 'B' while it holds X. The green, red and blue arrows in the 3-D view are never named, so the player cannot connect them to the matrix.

**Proposed fix.** When the replay button appears, add the readout row r.row('B', 'the new right side $B$', `$${texM(P4_B)}$`) with the note 'The same moves turn [A | B] into [I | X], where A X = B.' After board.play finishes in replay(), relabel the right block 'X', e.g. board.set(leftOf(m,3), rightOf(m,3), 'X'), which only resets history, or expose paintHead. Add to the readout note: 'Green, red, blue: the left half\'s three columns, the edges of the box.'

### c13-9 · c13-p5 · minor

**Problem.** Show me on p5 places the right order and fires it without first showing what goes wrong, so the answer to 'in which order' is asserted, not demonstrated. p3's Show me is the same: it sets T⁻¹ directly. Its reveal, '(1, 1) back to (1, 0)', explains neither of the two columns the player has to build.

**Proposed fix.** p5 showMe: place(P5_WRONG); await doFire(); await wait(1200); place(P5_REF); await wait(400); await doFire(). place→afterChange already resets the landed frame. p3: the key part is the why. Extend predict.reveal (it already appears on the Shown and Solved card) to: 'The inverse sends every landing spot back to where it came from: $(1, 1)$ back to $(1, 0)$. To build it, find what $T$ sends to the grid arrows: $T(-1, -1) = (1, 0)$ and $T(2, 1) = (0, 1)$, so $(-1, -1)$ and $(2, 1)$ are the columns of $T^{-1}$.' Optionally, start p3's showMe with one wrong Fire (the wrong() matrix [[1, 2], [1, 1]]); the bark then shows where (1, 0) and (0, 1) went.

<details><summary>Dropped by the checker</summary>

- c13-8: The predict card is optional and short-lived: one click on Skip or on a choice removes it, and a player who skips dialogue is likely to skip it straight away. While it is open, its prompt says in words everything the question needs ('turned a quarter turn anticlockwise'; 'the pulse sent (1, 0) to (1, 1)'), so nothing the task needs is hidden. After it closes the whole frame is visible. The camera numbers are worked out only for p1. For p3 and p5 the finding says only 'apply the same kind of change', so it is not a small, checked fix, and moving those views risks new overlaps with the larger docks.

</details>

## c14

### c14-1 · c14-p1 · blocker

**Problem.** On Commander there is no way to type the two columns, and dragging does not snap, yet the tile has to read exactly 6 (within 0.01). At this zoom one screen pixel of red's height changes the area by about 0.03, which is wider than the whole ±0.01 window. So the player drags, sees 'area 5.987' or '6.02', LANTERN says 'Area 6.02. The hold needs 6.', and they drag again. Every release counts as a move against par 3. The goal says 'exactly 6' and nothing on screen offers a way to be exact. This is the 'what I type is not what I get' complaint from Chapter 18, turned the other way round.

**Proposed fix.** Keep the auditor's fix, with two clarifications. (1) On Commander, p1 and the p3 flip step become typed only: two VectorInputs in the dock, 'green $\mathbf a_1 =$' starting at [1, 0] and 'red $\mathbf a_2 =$' starting at [0, 1], so the inputs match the drawn identity tile. Add a 'Set columns' button that moves both handles to exactly the typed values (handles[j].set(...), then commit()) and counts one move. Turn handle dragging off on Commander with setEnabled(false), so a drag cannot bring back off-grid values and the arrow keys cannot add their 0.1 step to an off-grid start. (2) Commander goal for p1: 'The white tile is the hold: one grid square after your two columns move it. Its sides are your columns, green and red. **Type** the two columns so the hold has area **exactly 6**, then press **Set**.' Give the p3 flip step the same treatment ('Type two columns that turn the tile over and keep its size: area −1, then press Set'). Raise p1 par to 5: one Set plus the stabiliser is 2 moves, so 3 test Sets cost nothing. Do not put base-times-height help in the goal or the readout. Navigator and Cadet keep their snapped drag.

### c14-2 · c14-p2 · major

**Problem.** On Commander the goal describes the wrong task. It says to drag the six pieces out, but dragging never finishes the puzzle. What actually counts is the 'Order the steps' panel followed by a typed last line, and the goal never mentions either. A player who drags all six pieces out gets the first subgoal ticked and then nothing happens. A player who uses only the panel wins without dragging at all. Show me never touches the panel either: after it runs, 'YOUR ORDER' is still empty, so the one thing Commander asks for is never demonstrated.

**Proposed fix.** Change the goal per difficulty with p.setGoal; Navigator has the same mismatch, because dragging never sets typedDone there either. Commander: 'The columns $(3, 1)$ and $(1, 2)$ make a parallelogram inside a $4 \times 3$ box; the six coloured corner pieces fill the rest. **Put the steps in order** (bottom left) that take the box's area down to the parallelogram's, then **type the area that is left**. You can drag pieces out of the box to see a step.' Navigator: the same, with 'work through the steps (bottom left)' in place of the ordering. PuzzleDef.subgoals is static and there is no per-difficulty API, so make the two subgoals wording that is true on every difficulty (for example 'Take every corner piece out of the box', 'Read what is left: $ad - bc$') rather than Commander-only lines. Show me on Commander: hoist the TileOrder and its submit handler, call tiles.set(['box', 'tri-a', 'tri-b', 'rects']), pause, run the submit handler, then ws.showMe(300) for the last line so the pieces fly out. Drop the bare `typedDone = true` branch.

### c14-3 · c14-p2 · major

**Problem.** The answer to the puzzle's own question is cut off. The title asks 'Where does ad − bc come from?', and the readout equation ends '... = 3·2 − 1·1 =' with 'ad − bc' clipped at the panel edge. The pieces that fly out (on Show me, or after the typed steps) land in a tray partly under the readout panel, on top of each other, so the player cannot see the removed areas lined up next to the sum.

**Proposed fix.** (a) Split the equation into two r.eq lines, or add a readout row: '$12 - 3 - 2 - 2 = 5$', then '$= \cg{3}\cdot\cr{2} - \cr{1}\cdot\cg{1} = ad - bc$'. (b) Re-lay out the tray. The auditor's coordinates do not work: the ½ac triangles are 3 × 1, not 1 × 2. Centred at x = 5.3 and 6.7 on the same row, they overlap each other, and at y = 1.3 the left one reaches back to x = 3.3, inside the box. Better: put each pair together as its rectangle, two ½ac triangles into a 3 × 1 block (ac = 3), two ½bd into a 1 × 2 block (bd = 2), and the two bc squares into a 2 × 1 block (2bc = 2). The tray then reads 3, 2, 2 beside '12 − 3 − 2 − 2'. Place the blocks right of the box, below the readout's bottom edge (about world y 1.8 at 1440 × 900 once the equation is on two lines) and above the dock. Or zoom view2D out a little when the pieces leave, so the tray fits on a 4:3 window too. Check screenshots at 1440 × 900 and a narrower window so that no piece sits under a panel.

### c14-4 · c14-p6 · major

**Problem.** The Collapse is described almost entirely in story words that the skipped scenes were supposed to explain: 'the next pulse', 'spire readings', 'undo it in advance', 'the two-decimal reading', 'Brace the stern', 'Teo is at the node', 'Seal the mid-section bulkhead'. A player jumping in does not know that a pulse is a 3-D linear move applied to the whole ship. They do not know why the spire matrix predicts its volume factor, that 'undo' means the inverse, or why they are suddenly told to reduce a rounded matrix. Step 2 never says what counts as done: the board's only visible target is the 'Left half is the identity' chip, which cannot be reached. The step then ends without warning 0.9 s after a zero row appears. At the start, spire 2 (red) has no visible label because spire 3's label sits on the same tip.

**Proposed fix.** Step 1 goal: 'A **pulse** is a 3-D linear move of the whole ship; the last five multiplied every volume by 0.8. The spire tips (readout, as columns) form a matrix with the same volume factor as the next pulse. **Forecast** that factor: work out the determinant of the readings.' Keep the words 'the determinant of the readings': they say what to compute, not how. The auditor's version dropped them, which makes the task less clear. Step 2 goal: '**Undo it in advance** means build the inverse. The ship stores the readings only to two decimals (readout), and there columns 2 and 3 are equal. Row reduce $[S \mid I]$ towards $[I \mid S^{-1}]$. You are done when the left half is $I$, or when a row shows it never can be.' Keep the board and its zero row on screen with a 'Continue' button; do not call setTimeout(toBrace, 900). Step 3 goal: '**Brace the stern**: three braces from Teo's position (the origin) make a box (white). Amber is that box after the forecast pulse. Make **three different** boxes (Shift-drag for height) and compare their volumes before and after (readout).' Fix the spire 2 label, which sits on spire 3's tip: offset one label or use 'spires 2 and 3'.

### c14-5 · c14-p7 · major

**Problem.** This repeats the Chapter 18 complaint ('what does the yellow have to do with my green'). When the puzzle is solved, a green parallelogram appears with no label and no readout row saying what it is: the tile with columns x and e₂, of area x₁, which A turns into the yellow one. Before that, the only picture is a thin yellow sliver with a faint 'area 2' label that is hard to read over the glow. That label is also the answer to the first box the player is asked to work out by hand. The goal is all symbols ('e₂', 'A₁(b)'), with no plain sentence first saying what is being solved.

**Proposed fix.** Plain-words-first goal: 'Find the two numbers $x_1, x_2$ with $x_1(2, 1) + x_2(1, 1) = (5, 3)$, that is $A\mathbf x = \mathbf b$, using only areas. Yellow is the parallelogram on $\mathbf b$ and $\mathbf a_2$ (red). It is what $A$ makes of a hidden tile with columns $\mathbf x$ and $\mathbf e_2 = (0, 1)$, whose area is $x_1$. Fill in the boxes below.' On Commander, label yellow 'area ?' until the puzzle is solved, not just until the first box is typed. StepWorksheet does not check intermediate boxes on Commander (steps.ts:102-106), so revealing the area after the first box would print the answer next to whatever was typed. When solved, label the green tile 'columns $\mathbf x$, $\mathbf e_2$: area $x_1 = 2$' and add readout rows 'green: area $x_1$' and 'yellow = $A$ × green: area $\det A \cdot x_1$'. Leave 'area scales by det A' in the hints.

### c14-6 · c14-p1 (also p2, p4, p5, p6, p7) · major

**Problem.** After Show me, the SHOWN card is empty in six of the seven puzzles. The only explanation is LANTERN's win line, a dialogue that this player skips with Esc. Show me sets the answer and moves on, with no attempt shown first and no on-screen line saying why that answer is right. This is the same Chapter 18 complaint: 'I clicked Show me and it found two purple lines so I'm unsure why they were the right answer.' In p3 the card shows only the prediction reveal (times 6). Why k = 2 gives area 4, and why the swap reads −1, appear only in dialogue.

**Proposed fix.** Use the Chapter 18 pattern rather than a runner change: end each showMe with an on-screen line in the puzzle's own readout (r.note(...) or r.eq(...)), which stays visible after the win, as the shown screenshots confirm. That leaves runner.ts and PuzzleDef alone, so no other chapter changes while the user holds the other chapters. p1: one try first, handles to (2, 0) and (0, 2), so LANTERN barks 'Area 4', then (3, 0) and (1, 2). Use the auditor's lines; their maths is verified. p1: 'Green (3, 0) is a base of 3; red (1, 2) rises 2 above it: 3 × 2 = 6. The stabiliser has 2·1 − 1·1 = 1, so it keeps every area.' p2: 'Box (a+b)(c+d) minus ac, bd and 2bc leaves ad − bc: 12 − 3 − 2 − 2 = 5.' p3: 'Areas multiply: 2 × 3. Scaling every entry by k multiplies area by k·k, so k = 2. Swapping the columns turns the tile over: −1.' p4: 'Row 1: 2·5 − 1·2 + 0 = 8. N: row 2, then the middle column, each have one non-zero entry, leaving 1·2 − 3·1 = −1.' p5: 'One swap (−1) × diagonal 1 · 2 · (−3/2) = 3. Shield: 2·6 − 3k = 0 at k = 4.' p6: 'det = 1 · (1·2.004 − 1·2) = 0.004. At two decimals, columns 2 and 3 are equal: no pivot, no inverse. Every box is multiplied by det.' p7: 'A multiplies every area by det A = 1, so x₁ = 2 / 1.' Add a 'try' only where it fits (p1, the p3 flip); the worksheet puzzles need just the why line.

### c14-7 · c14-p6 · minor

**Problem.** On Commander the forecast is already printed before the player computes anything. The worksheet prompt contains the answer ('Forecast: det = 1 × 0.004'). The first prompt has already picked the row, the sign and the minor ('1·2.004 − 1·2'), and the readout note repeats 0.004. The panel is titled 'Forecast · by hand', but nothing is left to do by hand. This player wants to think, and the chapter's climax computation is handed to them.

**Proposed fix.** On Commander, the forecast sheet becomes one checked box. Title: 'Forecast · by hand · only the answer is checked'. Prompt: '$\det$ of the spire readings $=$', with tol 0.0005. Keep the mistake [0, 'That is the two-decimal reading, 2.00. Use the third decimal: 2.004.']. Change the Commander note to 'Spire 3 is almost on top of spire 2: their box is nearly flat.' Navigator and Cadet keep the guided two-line sheet.

### c14-8 · c14-p4 · minor

**Problem.** The second subgoal asks the player to find rows and columns with one non-zero entry, but on Commander the goal, the readout note and the prompt find them for the player. They name row 2 and then the middle column, highlight row 2, and print the final 2 × 2. All that is left is 1·2 − 3·1. The 4 × 4 part teaches nothing to this player.

**Proposed fix.** On Commander: goal 'The $4 \times 4$ $N$ (readout). Find $\det N$ by hand. Expand along any rows or columns you like; only the answer is checked.' Use one box, '$\det N =$' (answer −1). Show N without the highlighted row and with no note. Keep the static subgoal 'using rows and columns with one non-zero entry' as the only nudge. Navigator keeps the guided prompts.

### c14-9 · c14-p5 · minor

**Problem.** In the shield step on Commander, nothing is left to work out. The readout gives the formula ('Its area factor is 2·6 − 3k'). The control is a slider, and the tile shows its area live. The puzzle wins the moment the slider reaches k = 4. The player can sweep until the grid collapses without solving anything, although the title asks 'which k flattens the shield?'. The start goal also uses 'the shield generator' without saying it is a matrix; that is only revealed after step 1.

**Proposed fix.** On Commander, swap the slider for a typed '$k =$' box with a **Check** button. Each Check counts one move, draws the grid and tile at the typed k (what is typed is drawn), and wins when p5ShieldOk. Commander's sheet costs one move (only its last line is checked), so par 6 leaves room for several tries. Commander note: 'Find the k that collapses the grid onto a line: area 0.' Drop '2·6 − 3k'. Start goal: '…Then find the $k$ that makes the shield generator, a $2 \times 2$ matrix with one unknown entry $k$ shown after step 1, flatten the plane.' Navigator keeps the slider.

## c15

### c15-1 · c15-p2 · major

**Problem.** The picture gives the wrong answer to the question the puzzle asks. The goal says "One ping is off the landing plane". On screen the beacon (1, 2, 3), which is on the plane, floats well above the top edge of the yellow plane, while (1, 1, 1), which is off it, sits inside the plane's outline. A player who trusts the picture picks (1, 2, 3) as the echo. Puzzle 4 has the same problem: (1, 2, 3) and the shared landing (3, 1, 4) are both drawn off the plane, and (3, 1, 4) is even outside the landings room.

**Proposed fix.** Rather than making the patches huge (size 9 or 11 would sweep down to z ≈ −3.7 and fill the screen), give Sheet an optional `center` point that lies on the plane. Pass room.w(center) to patch.setSpan in Sheet.set instead of room.w([0,0,0]). Use it only for fixed sheets, never p1's tilting one. Centre the landing sheets in p2, p3 and p4 on (1, 1, 2), which is on z = x + y. With size 6, every beacon, the shared landing (3, 1, 4), the origin, the start landing (2, 1, 3) and the gap-arrow tip (1, 1, 2) then lie inside the patch, with (3, 1, 4) at 2.45 from the centre. Optionally give p4's landings room extent 4 so (3, 1, 4) sits inside its axes. If there is a label on the sheet, make it 'landing plane: every landing is on it' without the equation (see c15-6).

### c15-2 · c15-p3 · major

**Problem.** "The two-decimal model" (and "the pulse") is never shown on screen as the matrix it is. In p1, p3 (first stage) and p4 the player is asked to find inputs by hand, but nothing on screen says what does the moving. In p3 the readout shows start and landing with no link between them. The subgoal "Reduce [C₂ | 0]" names C₂ before the screen ever says what C₂ is. In p1 the screen has only a point cloud and a count, so on Commander the only method is guessing normals. The columns appear only in a hint, the p1 prediction reveal and a win line this player skips.

**Proposed fix.** p1 goal: 'Two thousand test buoys started in a ball around the origin and went through the two-decimal model: the matrix $C_2$ with columns $(1, 0, 1)$, $(0, 1, 1)$, $(1, 1, 2)$. A buoy that starts at $\mathbf x$ lands at $C_2\mathbf x$. Tilt the **plane** with its normal $\mathbf n$ until **every** landed buoy is on it.' p3 goal: 'The two-decimal model is the matrix $C_2$ with columns $(1, 0, 1)$, $(0, 1, 1)$, $(1, 1, 2)$. The green probe in the **starts** room is a start $\mathbf x$; it lands at $C_2\mathbf x$ in the **landings** room. Find a start other than the origin that lands on the origin. Then read the same starts from the **row board**.' In p3's draw(), add the c18-style line r.eq(`C_2\mathbf x = ${texSmall(C2)}[x] = [landing]`) next to the existing start and 'lands at' rows. Leave p4 to c15-3 so the two fixes do not overlap. Use one shared string for 'C₂ with columns …' so every puzzle words it the same way.

### c15-3 · c15-p4 · major

**Problem.** In step 3 ("three different starts that all land on (1, 2, 3)") the player types starts but cannot see where any of them lands. The readout shows only a count. The landing dots in the right room have no labels, and the target itself is drawn off the plane (see c15-1). The matrix is not on screen either. A player working by hand has nothing to calculate with, and a player experimenting gets only "0 of 3".

**Proposed fix.** In drawStarts, add one readout row per start: r.row('l'+i, `start ${i+1} lands at`, fmtV(land(starts[i])), ok[i] ? C.result : undefined). Keep the 'k of 3' row. Step-1 goal: 'The pulse is the two-decimal model $C_2$: a start $\mathbf x$ lands at $x_1(1, 0, 1) + x_2(0, 1, 1) + x_3(1, 1, 2)$. Fire it at the two plates.' Step-3 goal (puzzles.ts:619): 'Place **three different starts** that all land on $(1, 2, 3)$: type each one and press **Enter**, or drag the green probes (Shift for height).' Once c15-1 is fixed, the target is drawn on the plane.

### c15-4 · c15-p3 · major

**Problem.** Show me gives the answer but never the reason, which is the same complaint the player made about Chapter 18 ("it found two purple lines so I'm unsure why"). On p3, p5, p6 and p7 the "Shown" card is empty. On p1, p2 and p4 the card shows the prediction reveal, which explains the prediction rather than the answer just demonstrated. The explanations that do exist are in the win scene lines, which this player skips.

**Proposed fix.** Use the auditor's lines and tries. Put the why line somewhere that persists. Do NOT use p.bark: barks are dialogue this player skips, and the win scene replaces them straight away. Either follow c18 (a dock message or r.note set at the end of showMe), or, better, add an optional PuzzleDef.shownWhy that winCard renders under the 'Shown' kicker when outcome === 'shown'. The second fills the empty card in the one place the player is already looking. Keep the tries short: one visible miss with its readout, then the answer. For example, p3 moves the probe to (1, 0, 0) and the readout shows 'lands at (1, 0, 1)', then to (1, 1, -1). p1 types (0, 0, 1) and the count shows 58 of 2000, then (1, 1, -1). p6 types (1, 0, 0) and the gripper moves (1, 0), then (1, 1, -1).

### c15-5 · c15-p5 · major

**Problem.** The player is asked to break "impostors", but the screen never says what a genuine "landing set" is, so the rule they are testing against is never stated. Stage 2 then reads as a contradiction: it calls the violet line a "landing set" in the same sentence that says its arrows are starts, not landings. A careful student will stop and ask how a set of starts can be a set of landings.

**Proposed fix.** Stage-1 goal: 'A real landing set (a set that could be every landing of some matrix) holds the origin and keeps every **sum** and every **stretch** of its arrows inside it. Three of these five candidates are **impostors**. Pick a candidate (the test arrows $\mathbf u$ and $\mathbf v$ stay on it as you drag them) and press **Add** ($\mathbf u + \mathbf v$) or **Stretch** ($k\mathbf u$). An impostor lets the result land outside.' Stage-2 goal: 'The violet line is not made of landings. It is the starts that $C_2$ sends to the origin, and it passed the same test.' On Commander, follow with: 'First put in order why sums and stretches of such starts also land on the origin.' Then: 'Then check that $(1, 1, -1)$ is one of them: dot each **row** of $C_2$ with $(1, 1, -1)$. Getting 0 for every row means the line is at right angles to every row.' Subgoal 2: 'Show the line along (1, 1, −1) is at right angles to every row of C₂'.

### c15-6 · c15-p2 · major

**Problem.** The goal uses five story words (pulse, beacon, ping, test buoy, landing plane) and never says what a landing is in maths terms. On Commander the column chain is not drawn, so the only clue is the slider labels. The last step, "show how far it sits below the plane, straight up", does not say which control to use or what counts as done. Meanwhile the readout row "plane above (1, 1): height 2" gives away the one number that step asks for. On Commander the result of each Land also reverts to "?" after 1.6 s even though the amounts have not changed, so the player loses the result of their own test.

**Proposed fix.** Goal: 'The pulse is the two-decimal model $C_2$: amounts $(x_1, x_2, x_3)$ land at $x_1(1, 0, 1) + x_2(0, 1, 1) + x_3(1, 1, 2)$. Every possible landing lies on the yellow **landing plane**. Four beacons are pinging: set the amounts and press **Land** to put a test buoy on each beacon that some amounts can reach. One beacon is off the plane: slide **straight up from (1, 1, 1)** until the dashed arrow's tip touches the plane.' Delete the 1.6 s setTimeout at puzzles.ts:268. On Commander, drop readout row 'g' and the 'The plane is at height 2 there' part of the miss bark; keep 'the gap arrow has not met the plane'. Do not put the equation z = x + y in the goal, the readout or a sheet label.

### c15-7 · c15-p1 · major

**Problem.** A typed answer only counts when the player presses Enter, and nothing on screen says so: there is no Check button and no instruction. In p1, typing (1, 1, −1) turns the readout to "2000 of 2000" in yellow, and then nothing happens. The same applies to the typed probe in p3 and the typed starts in p4. On Commander, typing is the main way to answer.

**Proposed fix.** Add a button next to each typed input that runs the same handler as Enter: p1 'Set plane' (p.move(); check()), p3 'Place probe', p4 'Check starts'. This matches p7's 'Check commands' and c18's 'Test this arrow'. Mention Enter in the dock text too. p1: 'Type a normal $\mathbf n$ and press **Enter** (or drag its tip). The plane goes through the origin, at right angles to $\mathbf n$.' p3: 'Type a start and press **Enter**, or drag the green probe (Shift-drag for height).' No change for p6.

### c15-8 · c15-p6 · major

**Problem.** The task is to find c with Ac = 0, but A (what each motor does to the gripper) is not stated anywhere on screen. The readout says "gripper moves by Ac" without defining A, while the next puzzle states its motor directions in the goal. The goal also says "the elbow is jammed on a pipe", but no part is labelled elbow. In the picture the orange ring sits on the middle (red) segment, and the joint above it is not touching the ring, so the player cannot see which part has to move clear.

**Proposed fix.** Goal: 'Three telescoping motors push the gripper along $(1, 0)$, $(0, 1)$ and $(1, 1)$, so a command $\mathbf c$ moves it by $A\mathbf c = c_1(1, 0) + c_2(0, 1) + c_3(1, 1)$ per unit of run. The arm is jammed against the coolant pipe (orange ring). Type a command that keeps the gripper on the handle, then drag **run** until no part of the arm touches the ring.' No 'press Enter' is needed here, because the run slider runs the check. Rename readout row 'e' from 'elbow' to 'arm and pipe', with values 'touching' and 'clear'. Change subgoal 2 to 'Run it until the arm is clear of the pipe', and the bark at puzzles2.ts:322 to 'The arm is … from clear.'

### c15-9 · c15-p5 · minor

**Problem.** The puzzle asks the player to find which three of five sets are impostors, and testing the sets is how they find out. But every drag of a test arrow and every Add or Stretch press costs a move, against a par of 9. A player who checks the two real sets as well (a sum and a stretch each, which is the honest way to tell them apart) goes over par and loses stars for exploring.

**Proposed fix.** Remove the `onEnd: () => p.move()` from both probes. Better, pass countMoves: false as well, so that only Add and Stretch presses, the tile Check and the worksheet submit count. Raise par to about 12, with a c18-style comment: `par: 12, // testing all five sets is how this is solved: exploring must not cost stars`.

### c15-10 · c15-p4 · minor

**Problem.** Before the player presses Fire, a white arrow labelled "d" already sits beside plate A, belonging to step 2, which they have not reached. They see an unexplained arrow on screen. When step 2 opens on Commander, it can only be done by dragging: the tip snaps onto plate B when close, and the readout works out "difference B − A" for them. Nothing is typed, and nothing is left for them to work out.

**Proposed fix.** Hide the difference arrow until fire() finishes: set diffHandle.arrow.object.visible = false after construction, and true next to diffHandle.setEnabled(true) in fire(). Make the same visibility change in showMe, solve and wrong, which already call fire() first. No typed d input.

## c16

### c16-sp2-1 · c16-sp2 · blocker

**Problem.** The puzzle asks for weights, a point no start reaches, the reduced form's bottom row, the rank, the triple product and the determinant of C2, but C2's entries are never on screen. The arrows are labelled only a1, a2, a3, with no coordinates, and the 3-D view has no snapping. A player who skipped the scenes, or came here from another chapter, has nothing to compute with. The goal and star text also use 'start', 'landing' and 'the pulse' without saying what they are in maths terms.

**Proposed fix.** At the top of the Constellation readout (above the sky), add one compact line: "C₂ = [[1, 0, 1], [0, 1, 1], [1, 1, 2]] · columns a₁ = (1, 0, 1), a₂ = (0, 1, 1), a₃ = (1, 1, 2) · a start x lands on C₂x". This is C2 from truth.ts (fromCols of COLS), and the columns are what the arrows show. Change the goal to: "Eleven statements about the two-decimal model C₂ (its entries are in the readout). The pulse, or firing, applies C₂ to every point: a start x lands on C₂x. Light each star with one construction on C₂." Putting coordinates on the arrow labels as well is optional, because the readout line already links a₁, a₂ and a₃ to numbers. Show no reduced form, rank or determinant. Every star still has to be computed by hand.

### c16-p5-1 · c16-p5 · blocker

**Problem.** On Commander the four stacked worksheets make the dock taller than the window. Its top runs off the screen: the first prompt, "Where does 1 land?", is printed over the chapter title. The goal card sits on top of the "Where does t land?" row and its input boxes, and the sheet title that says which answers are checked cannot be seen. The player sees a broken screen and cannot read or reach the first steps.

**Proposed fix.** On Commander, mount the sheets one at a time: create sheet k+1 (into the same stack) only when sheet k's onDone fires, and keep `pending`/finish() as they are. Then the dock never holds more than sheet 1, which has 4 rows. Sheet 1 alone is still about 600px tall, close to the goal card's bottom edge at y≈255. So also give the three 'where does 1 / t / t² land' answers as 1×3 rows: pass answer: [P5_LANDS[i]] as a 1×3 matrix, which needs no kit change because the prompt already says 'as (a, b, c)'. If a height cap is still needed, put max-height and overflow-y:auto on this puzzle's .ws-stack only, not on the global .dock rule in screens.css, which every dock in the game uses. Check at 1440×900 that the dock's top edge sits below the goal card and that every input can be reached.

### c16-p2-1 · c16-p2 · major

**Problem.** This is the first puzzle that uses 'kept' and 'flattened', and the goal never says what they are. It also asks for "the two arrows that land on the origin", but the arrows drawn are the four 3-entry columns, none of which lands on the origin. A player who skipped the scenes cannot tell that the answer is two 4-entry inputs x with Ax = 0. The second problem is that on Commander only the last row of the worksheet is checked, and the win is computed from constants. The kept and flattened counts the title asks for, and the first arrow, are never verified, so typing 3 kept, 1 flattened still wins.

**Proposed fix.** (1) Goal: "A is the scanner: 4 inputs (x₁ … x₄), 3 readings. Reduce [A | 0]. A pivot column **keeps** a direction; a column without a pivot is free and **flattens** one. Count each, then write the two inputs x (four numbers each) that A sends to the origin." (2) On Commander, make each of the four steps its own sheet. Mount sheet k+1 only after sheet k is right, so the 'Free x₂ = 1, x₄ = 0' prompts do not show which columns are free before the counts have been typed. Fill the counter, tick the subgoal and win only when all four sheets are done. (3) On Commander, pass showSolution: false to the RowOpsBoard, as c09 and c10 do. Otherwise, once the matrix is reduced, the board prints 'Free variables: x₂ and x₄ … Then x₁ = …' (rowops.ts:383), and that hands over both counts and both arrows. Add no hints.

### c16-sp1-1 · c16-sp1 · major

**Problem.** The goal sends the player to the "Inputs (left)" room, but most of that room is behind the dock and the goal card. The row labels peek out from under the panels. After the null space is placed, its violet line on the left cannot be seen at all, and the row plane is mostly hidden. The dock also never says how to 'place the plane through its rows': nothing tells the player to click two row chips, or two column chips for the outputs. Only hint 1 says so.

**Proposed fix.** Add a one-line instruction above each chip row in the dock: "Pick two rows: the plane goes through both." and "Pick two columns: the plane goes through both." (the p3 wording). Then reposition the scene so the inputs room sits in the open area to the right of the dock and below the goal card. For example, bring the room origins closer together (about −2.8 and +3.6) and shift the twinView target left, rather than only moving the target, which would push the outputs room under the readout. The VectorInputs could also be laid out as rows to shorten the dock. Check at 1440×900 that the row plane, the white normal and the violet null-space line in the inputs room are all visible after Show me.

### c16-p6-1 · c16-p6 · major

**Problem.** The thing the player controls, the a1 · a2 · … slots in the readout, looks like a static label. Nothing on screen says to click those slots to tag each column. The dock shows only the matrix, "Check tags" and "Shake". The readout formula also renders with stray semicolons ("A = […] ; → ;"), which wrap the reduced form onto a second line that starts with ";" and make the 'matrix → reduced form' link hard to read.

**Proposed fix.** (1) In puzzles2.ts:186 change `\;\\to\;` to `\\;\\to\\;`. In an untagged template literal, `\;` evaluates to a bare ';', so KaTeX currently receives ';\to;'. (2) When the counter is clickable, put the instruction right under the slots with counter.setNote('Click a slot to cycle: kept, flattened, empty. Then press Check tags.'), so it sits next to the slots in the readout rather than in the dock across the screen. Giving .slot.click a visible button border at rest is optional.

### c16-p4-1 · c16-p4 · major

**Problem.** After the build step the player is told to "place the bar that shows why". Nothing says what a 'bar' is or which filling counts as right. Many fillings are real scanners, and the game rejects some of them with "That bar fits, but it does not show where the order breaks." The rule it actually checks is hidden: the bar must show the real scanner that comes closest to the order. For order 3 only 3 kept + 2 flattened passes, and a valid 2 kept + 3 flattened is refused.

**Proposed fix.** Replace the setGoal text at puzzles.ts:329 with: "The counter refuses two orders. For each, fill its bar (click a slot: kept, flattened, empty) with the real scanner of that shape that comes **closest** to the order, then press **Place the bar**." In the start goal at :271, change 'place the bar that shows why' to 'fill each refused order's bar with the closest real scanner'. Change the refusal message at :319, 'That bar fits, but it does not show where the order breaks.', to 'That is a real scanner, but not the closest one to this order.' Leave out the auditor's '3 rows keep at most 3' clause: the counter already prints 'at most 3 kept (3 rows)', and it is part of the reason the player is meant to show.

### c16-p7-1 · c16-p7 · major

**Problem.** Show me jumps the blue arrow straight to (0, 0, 1). It tries nothing first and puts no reason on screen. The SHOWN card is empty, and the only explanation is the win dialogue, which this player skips. This is the same 'it found the answer, but I don't know why it's right' gap the player reported in Chapter 18. The SHOWN card is also blank for every puzzle without a prediction (p2, p4, p5, p6, p7, sp1, sp2), so an empty box titled SHOWN appears on seven of nine puzzles.

**Proposed fix.** In p7 only, rewrite showMe as: hnd.moveTo([2, 1, 3]) and pause, with the readout showing volume 0 and 'one plane only' and r.note('(2, 1, 3) is still on the plane z = x + y: the box stays flat.'). Then hnd.moveTo([0, 0, 1]), then r.note('(0, 0, 1) is off the plane z = x + y (1 ≠ 0 + 0), so the box has volume 1, not 0: the three arrows reach every point.'). This is the same pattern as c18 p1, where h1.say shows the reason in the puzzle's own UI. Do not add an engine-level `shown` field. Do not write SHOWN-card lines for p2, p4, p5, p6, sp1 or sp2 in this pass.

### c16-p5-2 · c16-p5 · minor

**Problem.** The third subgoal, "Check a new set of three profiles", and the last step ask for a determinant without saying what is being checked. The player cannot tell that the question is whether 1 + t, t + t², 1 + t² reach every profile, that is, form a basis. Also, on Commander the readout promises a dashed curve that is not drawn until after the win.

**Proposed fix.** Subgoal 3: "Do 1 + t, t + t², 1 + t² reach every profile?" Step 7 prompt: "Do 1 + t, t + t², 1 + t² reach every profile (a basis)? The determinant of their columns:". The starting readout note at puzzles2.ts:76 becomes "p(t) = 5 − 3t + 2t²; its rate of bend is drawn dashed once you have it." This is wrong on every difficulty, not only Commander, because plot.draw(P5_PROFILE, P5_RATE) runs only in finish().

### c16-p3-1 · c16-p3 · minor

**Problem.** The puzzle starts on the trap pair (r1, r3), and par is 2, exactly the clicks needed to reach a1 + a3. Trying even one other pair, which is the natural way to test the trap, costs the second star. The white dashed lines are what show 'sticking out', but only hint 1 says what they are.

**Proposed fix.** Raise par from 2 to 6 (puzzles.ts:201), with a comment like Chapter 18's: 'testing pairs is how the trap is seen: exploring must not cost stars'. Extending the goal with '(white dashes: how far each one is off the plane)' is optional and harmless. The same exact-minimum par appears in p1 (par 2, unbolting) and p7 (par 2, where each drag commit is a p.move()). Flag both for the same decision when the other puzzles are fixed.

### c16-p7-2 · c16-p7 · minor

**Problem.** On Commander this is the one puzzle in the chapter where a 3-D handle with no snapping is the only input. There is no typed field. The obvious move, lifting the arrow straight up off the plane, needs Shift, and only hint 2 mentions Shift. The yellow shape around the arrows is never named on screen beyond the readout row "volume of their box".

**Proposed fix.** Add to the goal, as c04, c05 and c07 already do: "Drag its tip (hold **Shift** to move it up or down), or type it. The yellow box is built on the three arrows." On Commander, add a VectorInput 'blue arrow =' with a Set button that calls hnd.set(v) and check(). VectorHandle clamps to limit 3, so reject entries outside ±3 with a message, or the drawn arrow will not match what was typed (standard 4).

<details><summary>Dropped by the checker</summary>

- c16-p7-1 (empty SHOWN card / engine `shown` field part): The SHOWN card is the runner's status card for a puzzle solved by Show me (runner.ts:397). Without a prediction it is empty, which looks odd but leaves no maths unexplained. The other puzzles' Show me runs already explain as they go: p4's bars print 'Refused: 3 kept leaves 1 flattened…', p6 prints 'k kept + f flattened = n columns. Arrows to the origin…', sp1's readout prints the cross-product normals, and sp2 marks each star. Adding a `shown` field to the shared engine changes every chapter, while the Chapter 18 standard puts the reason in the puzzle's own UI. The user also asked to hold off on fixes outside Chapter 18 until 'done' is agreed. If the empty card should go, that is a cross-chapter runner decision, perhaps hiding the card when it has no content.

</details>

## c17

### c17-1 · c17-sp · blocker

**Problem.** The set piece asks for the spire numbers S written in the Anchor's grid, so that the Anchor's move PSP⁻¹ is a quarter turn. On Commander the player works S out by hand in 3-D, and that needs P. P is not on screen: no b1/b2/b3 arrows, no P in the readout, no card. The only place the player heard the arms was the opening scene, which they skipped. The third arm (0, 0, 1) appears only in hint 1. A player who jumps straight here cannot do the sum.

**Proposed fix.** As proposed. Draw b1, b2 and b3 from the origin exactly as p7 does (puzzles2.ts:495-497, colours C.v, C.w, C.u, labelled). Add a first readout row: 'the Anchor's arms as columns, P = [1 1 0; 0 1 0; 0 0 1]'. Do not show P⁻¹, S or PSP⁻¹ before Check. Write one combined goal with c17-2, not two separate edits. The goal says that P, the Anchor's arms as columns, is in the readout.

### c17-2 · c17-sp · major

**Problem.** The player cannot tell what done means or what the controls do. The goal says "at least 2 from the stream" but never says where the stream is; only a scene line gives it. "A true quarter turn" does not say which way, yet only PSP⁻¹ = R ((1,0,0)→(0,1,0)) passes. A clockwise quarter turn also clears the stream by exactly 2, but it fails Check setting. A box labelled "foot y = −1" shows from the start, and nothing explains what a foot is. Typing in that box draws nothing until Forecast is pressed. All five controls are live at once.

**Proposed fix.** Merge with c17-1 into one goal: 'The ark is at (3, 1, 0), inside the debris stream, the line x = 3 on the ground. Find S, written in the Anchor's grid, so that the Anchor's move PSP⁻¹ is the quarter turn R loaded now: it sends (1, 0, 0) to (0, 1, 0) and keeps heights. P, the Anchor's arms as columns, is in the readout. Check it, measure its volume, Forecast, then mark the point of the stream closest to the forecast (type its y). If the ark is at least 2 clear, fire once.' Keep the foot y box hidden until Forecast. Placement after Forecast already draws at the typed value. Show Measure volume and Forecast only once Check setting passes. Make reset() (on any S edit) hide them again along with the foot box.

### c17-3 · c17-p4 · major

**Problem.** The target, "the dashed yellow plate", is nearly invisible. T squeezes the L-shaped plate into a thin wedge running from the origin towards (−2, −1). It is drawn in yellow dashes that match the copper Anchor grid in colour and dash, so it reads as two more grid lines. The gray "spire forecast" ring and gray dashed L are mentioned nowhere. "Measured pulse" and "Ilse's spire numbers R" are story words. That R is a quarter turn is said only in the optional prediction card, which Skip removes. The "measured" tag also covers the b2 label.

**Proposed fix.** Take the goal rewrite with one change. Do not print '(1, 1)' in the goal. The optional prediction card asks exactly where the bow goes, so say 'the bow lands in the yellow ring' instead. Proposed goal: 'Ilse's spire numbers R = [0 −1; 1 0] are a quarter turn, and the Anchor reads them in its own grid. Put three cards on the rail (into the Anchor's grid, R, back to ours) and Replay. You are done when your rail makes the measured pulse T, the move that really happened (in the readout): the plate lands on the yellow plate and the bow in the yellow ring. Gray: where R would send them if read in our grid.' Draw the measured plate as a low-opacity yellow fill (Parallelogram/Outline2D fill) instead of copper-like dashes. Move the 'measured' tag so it no longer covers b2.

### c17-4 · c17-p3 · major

**Problem.** The worksheet is written in P_B, b1, b2 and P_C, but this puzzle hides the Anchor's arms and never says what b1, b2, P_B or P_C are. A player arriving out of order meets "P_B [2;1] = 2b1 + 1b2" with no b1 or b2 on screen. P_C, the matrix with Vell's c1 and c2 as columns, is also never named. Separately, row 2's label prints row 1's answer from the start.

**Proposed fix.** Draw b1 and b2 here: drop arms: false, or draw them at 0.35 opacity through bench.dim(true) so they don't fight Vell's grid. Add to the goal: 'The Anchor's arms are b1 = (1, 0) and b2 = (1, 1), the columns of P_B. Vell's c1 and c2 are the columns of P_C.' Change row 2's prompt to 'Vell's numbers: solve P_C c = (your answer above)'. Otherwise, render (3, 1) only once row 1 is correct. The simpler static prompt is preferred.

### c17-5 · c17-p5 · major

**Problem.** Show me does not teach in six of the eight puzzles (p2, p3, p5, p6, p7, sp). It ends with a "SHOWN" card that is empty: the runner fills that card only from a prediction's reveal, and these puzzles have no prediction. Show me also never tries anything first. It just enters the answer. The clearest case is p5: it types S = [−1 −2; 1 1] and replays. The plate lands, but the player never sees why that S is right, which is the whole idea of the puzzle.

**Proposed fix.** Do it per puzzle, the way c18 p1 does: at the end of showMe, if not headless, write the why line into the puzzle's dock message (msg/say). Do not add a runner-level `shown` field yet. That changes every chapter's win card and should wait until the user agrees what done looks like. Add a real try first only where it teaches. p5: replay the loaded R first ('the bow leans to (1, 1)'), wait, then type S and replay, then the why line. sp: run Check setting once on the loaded R (its miss message already explains the lean), then the answer. Use the audit's why lines for p2, p3, p5, p7 and sp. p6 is covered by c17-7.

### c17-6 · c17-p2 · major

**Problem.** On Commander, the first Check hands over the answer. Check walks the Anchor's path for the listed (2, −1), not for the player's marker, draws a gap line from the marker to the answer, and names the answer in the message. Pressing Check once with the untouched marker shows (1, −1). Typing that and checking again stays within par 2, so a player can earn three stars without converting anything by hand. p1 does not do this: there, a wrong walk draws the player's own numbers.

**Proposed fix.** On a wrong Check, walk the marker's own Anchor numbers, path.walk(anchorOf(at)), so the path ends on the marker. Do not draw the gap line to P2_SHIP: hide it, or show it only on Show me. The 'marker, Anchor's numbers' row already fills after a Check (line 175), so no readout change is needed. Message: 'Your marker is the Anchor's (a, b). The record says (2, −1).' The same-as-listed case can keep its 'Anchor's numbers placed in our grid' explanation, without naming (1, −1). Change the bark, which also gives away (1, −1), the same way. Keep walking (2, −1) on a win and in Show me.

### c17-7 · c17-p6 · major

**Problem.** On Commander, the 'why' step is an "Order the reason" tile puzzle, then one typed line. Show me skips the tiles. It measures and marks the five rows, then creates the last line and fills it. The tile panel stays on screen with "YOUR ORDER" empty while the subgoal is ticked. The one thing this Show me should teach, the order of the argument, is never shown.

**Proposed fix.** Hoist `let tiles: TileOrder | null` to setup scope. In showMe, after the marks: if tiles exists, call tiles.set(['product']), wait, tiles.set(['product','inverse']), wait, tiles.set(P6_ORDER), then call the same submit path as onSubmit. That removes the tiles and builds the last line. Then await ws.showMe(300). End with the dock or readout line: 'Why: the outer two determinants are 1/det P and det P, so they cancel.' Do the same in solve() so the tests cover that path.

### c17-8 · c17-p6 · major

**Problem.** Everything in this puzzle is about R, T and the Anchor's P, but the one typed line asks for det(P_C⁻¹ T P_C). P_C is Vell's grid from puzzle 3, and it is not named, drawn or given here. A player who arrives out of order does not know what P_C is. If they type a wrong answer, the error message ("the ½ and the 2 cancel") refers to numbers they never saw.

**Proposed fix.** Name the matrix in the prompt without giving its determinant: 'In a third grid, Vell's, P_C = [1 −1; 1 1]: det(P_C⁻¹ T P_C) = det P_C⁻¹ · det T · det P_C'. Put the same matrix in steps[0]'s prompt for Navigator. Keep P_C rather than switching to P: det P = 1 would hide the cancellation.

### c17-9 · c17-p7 · major

**Problem.** The goal is written only in story words: "The spire bench forecast the bow at (0,1,0) and missed … watch the recorded pulse." It never says in maths terms that the spire-bench forecast means the spire numbers applied directly in our grid, or that the recorded pulse is the move that really happened. Nothing explains the "spire numbers now" card with its 4/5: a quarter turn on the ground with heights × 4/5, written in the Anchor's grid. There is no readout at all, so nothing links the cards to where the bow lands, and the goal never says what counts as done.

**Proposed fix.** Use the proposed goal: 'The spire numbers S (the card: a quarter turn on the ground, heights × 4/5) are written in the Anchor's grid. Applied straight in our grid they forecast the bow (1, 0, 0) at (0, 1, 0), the gray dot, and missed. Build the move the Anchor really makes on the rail (into its grid, S, back to ours), Forecast, then the recorded pulse plays. You are done when the bow lands on your forecast.' Add a readout 'bow starts at (1, 0, 0) / your rail makes ? / forecast ?', filled only after Forecast, never live, so Commander stays hard.

### c17-10 · c17-p5 · minor

**Problem.** On Commander, two readout rows ("the move in our grid, PSP⁻¹" and "bow lands at") stay "?" even after Replay and after the win, so they look like blanks the player is meant to fill. In p4 the same rows fill after a replay. Also, the S box starts as [0 −1; 1 0] and nothing says this is Ilse's original setting from the last puzzle, the one that leaned the grid.

**Proposed fix.** Change line 193 to `d === 'cadet' || replayed` (fill after each Replay, as p4 does; never live on Commander). Starting message on Navigator and Commander: 'S starts as Ilse's original setting R, the one that leaned our grid. Type your own S in the Anchor's numbers, then Replay.'

## c19

### c19-1 · c19-p1 · blocker

**Problem.** On Commander this player is never told what a pulse does. The goal says "Press the pulse a few times if you like", but all three pulse buttons are greyed out and the dock says "Commit the forecast first: the pulses unlock once it is placed." The pulse's matrix is not shown anywhere. Its lines and stretches appear only in the optional "Predict first" card, and this player presses Skip on it (the card also hides itself on the first move). So they are asked to forecast fifty pulses of a move they cannot see or try. The lock also leaks: placing any forecast unlocks the pulses, and the forecast can then be moved again before Run to fifty, so "commit" means nothing. Pressing the pulse "a few times", as the goal invites, also uses up par 3. And before anything is placed, a cyan marker labelled "forecast" already sits at (4, -1) while the readout says "your forecast: not placed".

**Proposed fix.** (1) Add a readout row on every difficulty, as the briefing already does: r.row('V', 'the pulse $V$ (each pulse moves every dot $\mathbf x$ to $V\mathbf x$)', `$${texSmall(V2)}$`). (2) On Commander, call p.setGoal with a goal that does not invite pulsing: "Each pulse moves every point x to Vx (V is in the readout). The yellow piece starts at (3, 1). On Commander you forecast before you see a pulse: type where the piece is after fifty pulses and press Place forecast. Then run the fifty pulses to check." Do not state the lines or stretches. (3) Par: keep 3, and in run() skip p.move() while !marker. Pulses before a forecast exist only on Cadet and Navigator, so exploring becomes free there, and Commander's pulse-then-move path still costs the par star. Do not raise par globally. (4) Optional and cheap: on Commander, ignore placeMarker while 0 < k < 50, with the message "Forecast locked; Reset to change it". Par already charges for the Reset route. (5) Tag the unplaced marker "forecast (not placed)" until placeMarker runs. (6) predict.prompt hands over both lines and both stretches on every difficulty, which contradicts "finding them from V is the work". Give V in that prompt instead of the stretches.

### c19-2 · c19-p3 · major

**Problem.** The blue grid behind the puzzle is the plane after one application of A: horizontal lines at y = ±2 and slanted lines along (1, 2), with a bright slanted axis. Nothing on screen says so. The goal asks the player to "put (1, 1) in the grid of lines that hold", and the most visible grid on screen is this slanted one, which is not that grid; the lines that hold are the two violet dashed lines. This is the same "a move stretched the grid" confusion the player reported in chapter 18: a grid they did not ask for, with no explanation.

**Proposed fix.** Smallest fix: delete grid.set(P3_A) (keep hideLandingLine) so the background is the plain square grid, like c18's quietGrid. Better, and it pairs with c19-3: when sheet 1 is solved, add eigenGrid(p, P3_P) (the LineGrid already used in p1 and p2). Then the green 2·p1 and pink -1·p2 path visibly steps along "the grid of lines that hold" the goal names: (2, 0) + (-1)(1, -1) = (1, 1). Fall back to labelling the moved grid ("the plane after one A") only if it has to stay.

### c19-3 · c19-p3 · major

**Problem.** On Commander the board gives away the first by-hand sheet. From the first frame, the two lines are labelled with their eigenvalue and direction, so writing P and D "by hand" is just copying from the board. A player who wants to think finds that part already done. The chapter 18 standard hides the λ label on Commander until the player has found it.

**Proposed fix.** On Commander, create the two InfLines and tags hidden and show them in onDone of sheet 1 (b >= 3), as confirmation, together with the eigenGrid from c19-2. Keep them from the start on Cadet and Navigator. Hiding only the tags is not enough: the lines alone give away the columns of P.

### c19-4 · c19-p4 · major

**Problem.** Two things on the board are never explained, and one of them suggests the wrong answer. (1) The background grid is sheared, and its bright sheared axis runs along (1, 1), straight through the starting tip of p1. So p1 looks as if it lies on a line, yet the readout says "p1 kept? no: sent to (2, 1)". (2) A shaded yellow parallelogram sits between p1 and p2 with no label. It is the area det P, and it turns orange when det P = 0, but nothing connects it to the "det P 1" in the readout. This is the chapter 18 complaint again: "What does the yellow have to do with my green."

**Proposed fix.** Remove grid.set(P4_SHEAR) (plain grid). Add a readout row 'the shear $S$' = $\left[\begin{smallmatrix}1&1\\0&1\end{smallmatrix}\right]$ (each point slides sideways by its height). Tag the parallelogram "area = det P" with a ptag at its centre, updated in paint(). Optional, and cheap given the readout already prints S·p: draw a faint arrow from the origin to S·p1 and S·p2, so "kept?" can be seen as well as read. This gives nothing away; the readout already prints both images.

### c19-5 · c19-p4 · major

**Problem.** The goal leans on a story word and never says what result to expect. "If the rail rejects it": nothing on this screen is called a rail (the word only means something in p2's factor strip and in the story). The player isn't told that Build P checks for an inverse, or that a rejection is the answer they are after. The title asks a yes/no question, but nothing says that pinning the evidence is how they answer it.

**Proposed fix.** Goal: "Can the shear S = [[1, 1], [0, 1]] be written as PDP^{-1}, with the columns of P on lines S keeps? Drag p1 and p2 onto lines S keeps (the readout says whether each is kept) and press Build P. Build P checks whether P has an inverse, which PDP^{-1} needs. If it is rejected, pin that result to the case board: it is your answer." Subgoals: "Both columns on lines the shear keeps", "Build P and read det P", "Pin the answer". Also change the start message "Each must stay on its own line under the shear" to "A column is kept when the shear sends it along its own line". Do this together with c19-4's matrix row.

### c19-6 · c19-p4 · major

**Problem.** Show me never shows why it worked. It drags both columns onto the axis, then calls build() and doPin() in the same frame. The reason ("Rejected. Both columns lie on one line: det P = 0, so P^-1 does not exist") is overwritten at once by "Pinned. The quarter turn fails too...", which is about a different matrix. The win dialogue then covers the dock, and the Shown card is empty. It makes no attempt first, so the player sees the columns jump onto the axis with no reasoning.

**Proposed fix.** Show me: move p1 to (1, 0), leave p2 at its start (0, 1) (or put it at (1, 1)), call build(). The existing message "p2 is turned by the shear: it lands at (1, 1)" shows the miss. Wait about 1.5 s, move p2 to (2, 0), build(), and wait about 2 s on "Rejected...". Then doPin() with a message that keeps the reason: "Pinned: the shear keeps only one line, so both columns of P lie on it; det P = 0 and there is no P^{-1}. (A quarter turn fails too: it keeps no real line.)" Skip the waits when headless. Drop the engine Shown-card change from this finding (see c19-8): the dock line is where chapter 18 puts the why.

### c19-7 · c19-p5 · major

**Problem.** The orange arrow is unlabelled, and it is not the gap the readout reports. It is drawn from the true long-run point (2/3, 1/3) to the current shares. The readout's "gap to your forecast" is measured from the player's own forecast. With a wrong forecast the readout gap does not shrink by a fixed factor, while the orange arrow does, so "measure how the gap shrinks" has two different answers on screen. On Commander, where the Step button is locked until a forecast is typed ("committed blind"), the orange arrow's tail already sits on the answer from the first frame. The white line is also unlabelled except for its endpoints, so the player isn't told it means the shares add to 1. The "Each step, the gap is multiplied by" box shows before any step has run.

**Proposed fix.** (1) Create gapA hidden. Once share is set, draw it from the forecast [share, 1 - share] to the shares dot, with a "gap" tag, so it matches the readout. (2) On Commander, hide l1 and its "stretch 1 · (2, 1)" tag until a forecast is placed, then show them as a check, as chapter 18 does with the λ label. (3) Goal, in plain words: "...Everyone starts at A. The white line is every split with A + B = 1. The line with stretch 1 is the shares one step leaves unchanged: forecast the share at A where the crew settles. Then step; the gap is the distance from the shares now to your forecast. By what factor does it shrink each step?" This defines the term without saying how to solve Mq = q. (4) Tag the white segment "A + B = 1". (5) Simpler than the audit's gating: show the ratio row once k >= 3 (the existing "Run three steps first" check already guards it). Make the ratio error message list the readout's gaps, so both agree.

### c19-8 · c19-p6 · major

**Problem.** Show me presses the buttons and teaches nothing. Seven presses play at 450 ms each with no commentary. The closing line gives F50 and the 1.618 ratio but never says why those presses work: 50 = 32 + 16 + 2. The Shown card after Show me is an empty box. The engine fills it only from predict.reveal, so p3 and p4 also end on an empty "SHOWN" card.

**Proposed fix.** Narrate in the dock as Show me plays: before the loop, msg("50 = 32 + 16 + 2: write 50 in powers of two."). After each op, write a line from the state, e.g. "Square: B = M^2. 2 is in 50: take it, R = M^2.", "Square ×3: B = M^16. 16 is in 50: take it, R = M^18.", "Square: B = M^32. Take it: R = M^50." Use about 900 ms per op. Make the final win message (which overwrites the dock) carry the reason: "R = M^50: F50 = 12,586,269,025. Five squarings reach M^32; takes of M^2, M^16 and M^32 add to 50 (the first take into R = I is free): 7 products instead of 49. The ratio of neighbours has settled at the larger stretch, 1.618." No engine change.

### c19-9 · c19-p3 · minor

**Problem.** The last part of the goal assumes this player came straight from chapter 18 and describes the wrong task. "Then the same for last chapter's 3 × 3" means nothing to someone who jumped in out of order. It also suggests diagonalising a 3×3 by hand and pushing a vector through it ten times. The actual third sheet gives the stretches (2, 5, -5) and asks only for the diagonal of D^4.

**Proposed fix.** Goal ending: "...for A^{10}(1, 1). Then a 3 × 3 with stretches 2, 5 and −5: what is A^4 in its own grid (D^4)?" Subgoal 3: "The 3 × 3: D^4".

### c19-10 · c19-p2 · minor

**Problem.** The symbols and controls don't line up. The goal calls the pulse V ("V = PDP^-1"), but the Commander tiles and the panel title call it A. The title is raw caret text that the uppercase style turns into "WHY A^K = P D^K P⁻¹". The third subgoal, "Play PD^50P^-1 on the cloud", has no Play control: it runs by itself once the other two are done, and the player is never told that "the cloud" is the scatter of dots.

**Proposed fix.** Title in plain text: "Why fifty pulses are three moves: put the steps in order". Do not use TeX, which this component does not render. In P2_TILES and P2_DECOYS replace A with V; no tests reference the tile text. Subgoal 3: "Watch PD^{50}P^{-1} move the dots (it plays once both steps are done)". Add to the goal: "The dots are a debris cloud; each pulse moves every dot by V."

## c20

### c20-1 · c20-p5 · blocker

**Problem.** On Commander the settled counts are hidden, so the player has to work out by hand where the drones settle for a given Stern stay share. That needs the whole matrix, but only the Stern's own column is described. The Bow's shares (80/10/10) and the Mid's (20/70/10) are not on screen anywhere in this puzzle: no From buttons, no arrows, no matrix. A story-skipper arriving out of order has never seen them, and one coming from puzzle 1 has to remember six numbers. That leaves blind trial commits as the only route, and those cost stars (see c20-2).

**Proposed fix.** In paint(), add a readout row on every difficulty showing the live matrix with the current s filled in as numbers, e.g. P = [[0.8, 0.2, 0.2], [0.1, 0.7, 0.2], [0.1, 0.1, 0.6]] at 60% (use texSmall(designP(pct/100))). Add one goal sentence: 'P (readout) moves the drones each hour: the Bow and Mid columns stay as they are; only the Stern column changes with the slider.' Keep the settled counts hidden on Commander. Reword hint 1 so it works on every difficulty, e.g. 'The settled arrangement solves (P − I)q = 0 with the three counts adding to 300. Find the share where its Stern entry reaches 100.'

### c20-2 · c20-p5 · major

**Problem.** On Commander the bars start at Bow 0, Mid 0, Stern 0 while the board shows all 300 drones at the Bow. That reads as 'nothing settles anywhere'. After a commit the bars keep the old run's numbers when the slider moves, so a stale result sits next to a new share. The tick on the Stern bar is the 100-drone target, but it has no label. Par is also 4, and both a slider drag ('change') and a commit count as moves, so committing a share to test it is the only feedback Commander gives and it costs stars after two tries.

**Proposed fix.** (a) Delete slider.el.addEventListener('change', () => p.move()) so that only commits count. Keep par at 4: one verifying commit at 79 plus the answer stays within par, while blind bisection over 50–95 does not, which keeps Commander hard. (b) On Commander, show '?' on the bars until the first commit. After a commit, keep its numbers but title them with the share they came from, e.g. a row 'last commit: 79% → Stern 96.8 after 40 hours', so the bars never look like they belong to the share the slider shows now. (c) Add a readout row 'need at the Stern: at least 100' next to the tick. This avoids changing the shared Bars class in c18 parts.ts.

### c20-3 · c20-sp · major

**Problem.** Step 2 asks for **c**, the cutter's coordinates in the grid of the three lines; the answer is c = (2, 1, 1). Step 3's input is labelled V⁵⁰c, but the game expects V⁵⁰(4, 2, 0) = (2, 2, 2). A Commander player who computes exactly what the label says gets V⁵⁰(2, 1, 1) ≈ (1.33, 1.33, 1.33), or (2, 0, 0) in line coordinates, and is told they are wrong.

**Proposed fix.** Relabel the step-3 input 'V^{50}(4, 2, 0) =' and keep c only for step 2. Change the step-3 dock title to 'Forecast: V⁵⁰(4, 2, 0), the cutter after fifty pulses, in ordinary (x, y, z) coordinates'. Optionally end the miss message with '… then add the parts back up in ordinary coordinates'.

### c20-4 · c20-sp · major

**Problem.** The set piece opens on a 3D field of dots and debris models with no axes and no labels. Nothing says which object is the cutter at (4, 2, 0), what the dots are, or where the origin is. The message says "Test the candidate lines through the Anchor", and the goal leans on story words: Vell's "pulse", "the forecast he cannot argue with", "lines that hold". None of them is given in maths terms. A story-skipper does not know that a pulse means applying V to every point, that the Anchor is the origin, or that a 'line that holds' is a line through the origin that V only stretches (an eigenvector line).

**Proposed fix.** Keep the goal short and give the definitions: 'V (readout) is Vell's pulse: one pulse moves every point p to Vp; fifty pulses apply V⁵⁰. The Anchor at the centre is the origin; his cutter is at (4, 2, 0). Goal: where the cutter is after fifty pulses.' Put each step's meaning in its dock title, which only appears when that step is reached, instead of one long goal: step 1 'Lines that hold: lines through the origin that V only stretches (test the candidates)'; step 2 'Write (4, 2, 0) = c₁(line 1) + c₂(line 2) + c₃(line 3): c = (c₁, c₂, c₃)'. Add ptag 'Anchor (origin)' at [0, 0, 0] and a cutter tag 'cutter (4, 2, 0)'. The cutter moves in checkF through f.cutterAt, so keep that Label and call label.at(SP_AFTER) there, so the tag never stays at the old position. Change the opening message to 'Test which candidate lines through the origin (the Anchor) V only stretches.'

### c20-5 · c20-p1 · major

**Problem.** While the player fills in the matrix, the optional prediction card covers the top compartment. The 'Stern' name, the top of its box and its 'stay %' tag (shown on From Stern) all sit under the card. Pressing From Bow sends a 10% arrow up into the card toward an unlabelled box. The card only goes away on Run one hour or Skip, so the player has to read the Stern column's shares while they are partly hidden.

**Proposed fix.** In p1, call p.move(0) in each From button handler and in the MatrixInput onChange. move(0) fires onFirstMove, which hides an unanswered prediction, without counting a move. Leave the view and p3 as they are.

### c20-6 · c20-p2 · major

**Problem.** The goal never says what P or q is in this puzzle. P (the hourly share matrix) appears nowhere on screen, and q₁, q₂, q₃ are never tied to Bow, Mid, Stern. So a player who comes in out of order sees a row board of mystery numbers. The goal also says "then run 40 hours", but there is no Run button: the hours start by themselves once q is typed. On Commander the row board is not actually required (typing the right q wins) even though the goal and the first subgoal say to reduce it, and that subgoal can stay empty at the win. Show me also declares the win before the forty hours land. In c20-06-commander-shown.png the bars read 182.4/65.1/52.5 under LANTERN's line "Settled: (150, 90, 60). Forty hours from the Bow land on it", with "Forty hours land on it" still unticked.

**Proposed fix.** Goal: 'P (readout) moves the drones each hour. The settled arrangement q = (Bow, Mid, Stern) is the one an hour leaves unchanged: Pq = q, so (P − I)q = 0. Reduce 10(P − I)q = 0 (same answers, whole numbers), then type q scaled to 300 drones. The board then runs 40 hours from all at the Bow to check it.' Add a readout row with P. On Commander, keep the row board optional, since paper is allowed, but reword subgoal 1 to 'Reduce (on the board or on paper)' and tick it when q is accepted. In showMe, add `if (running) await running;` after ws.showMe(400), as solve() already does.

### c20-7 · c20-p3 · major

**Problem.** A glowing yellow point labelled (150, 90, 60) sits in the triangle from the start, and nothing says what it is. A player who skipped puzzle 2 or the story does not know it is the settled arrangement (Pq = q). The goal also never says what moves the drones for 40 hours (the same hourly shares, P). The player is pressing buttons with no idea why the paths bend toward that point, the same 'what does the yellow have to do with my arrow' confusion as Chapter 18. 'Bram' shaking in random starts is also only a story name.

**Proposed fix.** Tag the point 'steady: Pq = q (150, 90, 60)'. Goal: 'Each point of the triangle is a split of the 300 drones (corners: all in one section). Every hour the drones move by P (readout). The yellow point is the steady arrangement: one more hour leaves it unchanged (Pq = q). Run 40 hours from all at the Bow, all at the Stern and an even split, and see where each path ends; then try random starts.' Add P to the readout. Replace 'let Bram shake in' with 'try'.

### c20-8 · c20-p4 · major

**Problem.** The screen shows a white arrow labelled 1 inside a purple 3D lattice, and nothing says what the lattice is (all of space after P − λI is applied) or how the arrow, which is moved by Pᵀ, relates to it. When the lattice flattens at λ = 1 the arrow sticks out of the sheet, and the player is left asking what one has to do with the other. The title's "every such matrix" is never defined on screen (a matrix with entries ≥ 0 whose columns each add to 1). All three steps, including the tile-ordering panel with its five tiles, are shown at once before step 1 is done, so the screen is crowded with the answer's building blocks.

**Proposed fix.** Goal: 'P is the drones' hourly matrix: no negative entries, and each column adds to 1. Why must every such matrix have eigenvalue 1? 1. Send the all-ones arrow 1 (white) through Pᵀ and see where it lands (yellow). 2. The purple grid is space after P − λI: turn the λ dial until it goes flat (det(P − λI) = 0) at λ = 1, and lock it. 3. Put the reason in order.' Tag the white arrow '1 = (1, 1, 1)', the yellow result 'Pᵀ1' once applyT runs, and the lattice 'space after P − λI'. Create the TileOrder (and the navigator worksheet) only once done[0] && done[1], e.g. from tick(). Make sure derive() in showMe and solve() runs after it is created; both already lock before deriving.

### c20-9 · c20-p5 · major

**Problem.** Show me gives the answer without the reasoning in the puzzles where the player has to compute. p5 on Commander slides from 60% to 80% while the readout says "hidden until you commit", then commits 80. The player never sees why 79 fails and 80 works. p1 fills in the right matrix and runs it, but never shows the tempting wrong version (shares along rows) or says why each section's shares go in a column. p2 plays the row operations but never says why the answer is scaled by 60. p6 never says why a stay share makes the swap settle. In p2, p4, p5, p6 and p7 the 'SHOWN' card at the top comes up empty, because the runner only fills it with a prediction reveal.

**Proposed fix.** p5: commit 79 (the existing miss message reads 'At 79% the Stern settles 96.8 drones: fewer than 100'), then commit 80, then msg 'Why: with Stern stay share s the Stern settles at 300/(11 − 10s), which is at least 100 exactly when s ≥ 0.8.' p1: fill in P1_ROWS and run it (the existing message reports 360 drones and a Bow column adding to 1.2), then fill in DRONES and run it, then msg 'P(300, 0, 0) is 300 × column 1, so column j must list where section j's drones go.' p2: after the run, msg 'Pq = q is (P − I)q = 0; q₃ is free; q = q₃(2.5, 1.5, 1) adds to 5q₃, so q₃ = 60.' p6: end with 'The swap's eigenvalues are 1 and −1: the −1 part flips every hour and never shrinks. With 10% staying they are 1 and −0.8, so that part dies away.' Leave runner.winCard alone here.

## c21

### c21-1 · c21-p4 (also c21-p7) · blocker

**Problem.** On Commander, p4 and p7 can only be solved by dragging, and the tolerance is smaller than a pixel. In p4 the player can work out the true nearest point (2, 3, 0) and the overlap (2.5, 0, 0) in their head, but they have to drag a yellow point across a 3D floor seen at an angle and stop it within 0.01. In p7 they know x = (2, −1) but have to drag the green tip to within about 1 px of the line through it. There are no input boxes. Arrow-key nudging exists, but nothing on screen mentions it. So this player knows the answer and still cannot enter it, and every missed drag counts against par.

**Proposed fix.** As the audit says, with these corrections. p4 on Commander: (1) typedRow 'Type the floor point nearest b:' (dim 3). If v[2] ≠ 0, say 'That point is off the floor.' and do not move anything. Otherwise call dp.set(dp.weightsOf(v)) and update the 'your point / its distance to b' rows. Tick subgoal 0 only when the point equals (2, 3, 0) within 1e-6. (2) Only after step 1 is done, show 'Type the point of k₁'s line nearest the tip of the shadow on k₂:' (dim 3). If it is on k₁'s line, call ov.set(v[0]) so the probe and its dashed line are drawn there. Tick subgoal 1 at (2.5, 0, 0). Off the line, say 'Not on k₁'s line.' Word the def-level subgoals so they fit both dragging and typing, because subgoals are shared across difficulties: 'Find the floor point nearest b' and 'Find where the tip of the shadow on k₂ drops onto k₁'s line'. p7 on Commander: add an 'x =' typedRow with a Test button. It calls x.set(v3(v)), which draws x at its true length and updates the yellow P x arrow and the readout. Use a typed win check of |x| > 1e-9 and |P x| ≤ 1e-6, not p7NullOk: its |x| > 0.4 threshold would reject a correct small answer such as (0.2, −0.1). Raise par so testing is free (p4 about 5, p7 about 6). The player still works out every number.

### c21-2 · c21-p3 · major

**Problem.** The goal and the screen describe different tasks. The goal says 'find the point … from the two shadows', but there are no shadows on screen, the 'TWO SHADOWS' readout is empty, and the main panel is a tile-ordering proof that the goal never mentions. A yellow ring sits on the plane and can be dragged, but on Commander it does nothing: parking it exactly on (2, 2, 2) gives no response, so the player concludes they are wrong. 'Shadow' is also never defined in maths terms for someone who skipped the scenes.

**Proposed fix.** The audit's text is right in substance, but two parts need changing. (a) Subgoals are static on PuzzleDef and would also show to cadet, so put the steps in the goal text instead, numbered as C18 does: Commander p.setGoal: 'The plane is spanned by u₁ = (1, 1, 0) and u₂ = (0, 0, 1), which are at a right angle. The **shadow** of b on an arrow u is the point of u's line nearest b. **1.** Put the five steps in order: they show why, for arrows at a right angle, the nearest point of the plane is the two shadows added. **2.** Then type the point of the plane nearest b = (3, 1, 2).' (b) The tile text must be Commander-only. Navigator gets its own setGoal: 'Fill the sheet down to the nearest point.' with the same shadow definition. On non-cadet difficulties, hide and disable dp.knob until finish(). Give the empty readout one placeholder row.

### c21-3 · c21-p5 · major

**Problem.** The goal asks for the nearest point, but on Commander the sheet checks only its last row, and the last row is the leftover b − p. A player who types the correct nearest point (1/3, 8/3, 7/3) and presses Enter gets no tick and no message. Nothing on screen says that 'the answer' in 'only the answer is checked' means the leftover row.

**Proposed fix.** On Commander, pass the steps without the leftover row, so 'nearest point p = Ax̂' is the last and checked row. finish() already prints the weights, p, and leftover · a₁ = leftover · a₂ = 0 in the readout. This changes one line (filter steps by p.difficulty) and makes the player compute nothing extra.

### c21-4 · c21-p4 · major

**Problem.** The second step can't be followed from the screen. 'Overlap' is never defined in maths terms. The two yellow shadow arrows are not labelled 'first' or 'second'. What the player actually drags is an orange ring next to the origin, sitting on k₁'s arrow, and no text mentions it. Both probes are live from the start. After the win, the orange 'overlap' bar is drawn 2 long while the readout says the overlap is (2.5, 0, 0).

**Proposed fix.** Tag the shadows 'shadow on k₁ (2, 0, 0)' and 'shadow on k₂ (2.5, 2.5, 0)'. Define shadow in the goal, since a player who jumps in here has not seen p3: 'The **shadow** of b on an arrow is the point of that arrow's line nearest b.' Do not call both things 'the orange point'. Refer to the sum by its existing tag ('the point tagged *sum of the shadows*'). Tag the second probe 'overlap probe', or give it a colour other than orange, and refer to it by that name. Hide and disable the probe until subgoal 1 is done. Define the overlap as 'the point of k₁'s line nearest the tip of the shadow on k₂: how far that shadow also pushes along k₁'. Use 'nearest b', not 'the beacon'. Draw overlapBar from 0 to P4_OVERLAP[0] = 2.5. Keep the subgoal wording neutral between dragging and typing (see c21-1).

### c21-5 · c21-p8 · major

**Problem.** A player who opens p8 directly sees a green arrow, a yellow arrow with a dashed right-angle drop between them, and two short pale arrows. None are labelled and the goal mentions none of them. This is the Chapter 18 complaint again: 'what does the yellow have to do with my green'. The goal also uses A without defining it; A is only defined in p5's goal. After dropping, several buoys land outside the drawn plane patch, so they look as if they missed the plane.

**Proposed fix.** Set showProjection: false. Also set pr.vArrow.object.visible = false, because showProjection: false still leaves the green b arrow drawn, as p5 shows. Tag a₁ and a₂ as p5 does. Goal: 'A is the 3 × 2 matrix whose columns are a₁ = (1, 1, 0) and a₂ = (0, 1, 1); the blue plane is everything A can reach. Build P = A(AᵀA)⁻¹Aᵀ on the sheet, then press **Drop with P** twice on the 70 blue buoys.' Set size: 8, which covers every dropped buoy (10 would also work).

### c21-6 · c21-p1 (also c21-p2, c21-p6) · major

**Problem.** On Commander, typed input is not drawn. In p1 the boxes start at p = (0, 0) while the probe sits at (−0.75, −1.5). A wrong typed point only prints 'Not this point.': the probe does not move, and the distance and leftover · a rows do not show the typed point, so a wrong guess teaches nothing. After Show me, the boxes still read (0, 0) while the probe is at (1, 2). p2 and p6 behave the same way; p6 even calls a vector 'this point'. Show me goes straight to the answer without trying anything first.

**Proposed fix.** As the audit says: add onTry(v) to typedRow. p1: if v is a multiple of a, call dl.set(v·a / a·a) and show(t); otherwise say 'Not on the line through a = (1, 2): p must be a multiple of it.' p2: if the point is on the plane, call dp.set(dp.weightsOf(v)), ship.at and show; keep the existing off-plane message. p6: show keepA at the typed vector and reuse remove()'s message ('Kept (…). It still reads N against the hum'), instead of 'Not this point.' Keep the boxes in sync with the probe: set them at setup, in onEnd after a drag, and in Show me. p1 Show me: type (0.5, 1) (distance 2.5, leftover · a = 2.5), then (1, 2) (leftover · a = 0), and add the one-line why to the note. The arithmetic is correct: (3, 1) − (0.5, 1) = (2.5, 0), and (2.5, 0)·(1, 2) = 2.5.

### c21-7 · c21-p3 · major

**Problem.** Show me hides the reasoning it is meant to show. On Commander, the puzzle is to put the proof steps in order. Show me sets the correct order and removes the tile panel in the same instant, so the player never sees the order, only the filled-in last line. The 'SHOWN' card is empty. p5 and p8 also show an empty 'SHOWN' card.

**Proposed fix.** Fix only what belongs to c21. In p3 showMe: tiles.set the correct order (step by step at about 400 ms each, or all at once), wait about 1.5 s with the ordered list visible, then disable or collapse the tiles instead of removing them, and mount 'The last line' below. Extend p3's finish note to give the reason: 'u₂·u₁ = 0 removes the cross term, so each weight is that arrow's own shadow: c₁ = 4/2, c₂ = 2/1, p = (2, 2, 2).' The numbers are correct. Raise the empty Shown card as a separate runner issue (either hide it when there is no predict, or add a PuzzleDef field). Do not fix it inside c21.

### c21-8 · c21-p7 · major

**Problem.** After Show me, an unlabelled purple line appears and green jumps to (2, −1). Nothing says why that arrow is sent to the origin, which is the same as the Chapter 18 complaint 'it found two purple lines so I'm unsure why they were the right answer'. Show me never tries a wrong arrow. The blue dots are called 'buoys' only in the optional prediction. The goal says 'Apply it' without saying what it is applied to, or that the dashed yellow line is the line through (1, 2).

**Proposed fix.** As the audit says. On Commander, use the typed row from c21-1. Show me tries x = (1, 1) first: P x = (0.6, 1.2), not the origin, which is correct. Then it tries (2, −1), with the note '(2, −1) is at a right angle to (1, 2): 2·1 + (−1)·2 = 0, so its drop onto the line is the origin. The purple line is every such arrow.' Tag the purple line 'P sends these to 0'. The rewritten goal is good: 'drops every point onto its nearest point on the dashed yellow line' is equally clear and avoids 'straight'.

### c21-9 · c21-p1 · minor

**Problem.** The one readout row that links the probe to the answer is 'leftover · a', and neither 'leftover' nor the dashed white line from the probe to b is named anywhere on screen. A player who skipped the story has to guess that the leftover is b − p. In p3 the readout does say 'leftover b − p'.

**Proposed fix.** As the audit says: label the row 'leftover b − p (dashed) · a' and add one sentence to the goal: 'The dashed line is the leftover b − p, from your point to b.'

<details><summary>Dropped by the checker</summary>

- c21-10: The geometry claim is wrong. For p5's camera (azimuth 30, elevation 20) the view direction is about (0.81, 0.47, 0.34). Its dot product with the unit normal (1, −1, 1)/√3 is about 0.40, so the normal is about 67° from the line of sight and lies mostly across the screen, not towards the viewer. Projected to the screen, the leftover (2/3, −2/3, 2/3) is about 1.06 of its 1.15 length. In screenshot c21-13 shown, the dashed leftover between b and p is plainly visible across the screen. b looks as if it is on the patch only because its tip projects inside the patch outline, which is ordinary 3D depth ambiguity. The view orbits, and the puzzle is done by hand on the sheet. Turning the plane closer to edge-on would hide the plane the puzzle is about. This is a style preference, and the stated reason is incorrect.

</details>

## c22

### c22-1 · c22-p1 · major

**Problem.** On Commander the start picture contradicts the input boxes. The boxes read q1 = (0, 0) and q2 = (0, 0), but the readout says q1 is (3, 4) with length 5.00. That readout row actually describes the green arrow, which is labelled b1 on the canvas. A drag knob sits on b1's tip even though Commander is a typing mode, and the goal never mentions it. Typed arrows are never drawn: a wrong q1 or q2 just gives a message and the picture stays the same. After Show me, q1 and q2 appear on the canvas but the boxes still read 0, 0. The player can't tell whether q1 is given as (3, 4), whether to drag or type, or what their typed numbers look like.

**Proposed fix.** On Commander, call sk.knob.setEnabled(false) straight after stretchKnob() (or hide sk.knob.object), so there is no ring and no drag. Until q1 exists, label the readout row by what it is: 'b₁ (3, 4)', not 'q₁'. On every Check, draw the typed q1 and q2 as faint arrows at their typed values, and show the typed coordinates in the readout ('your q₁ (a, b)', 'your q₂ (c, d)'). The dashed unit circle and the right-angle mark make the visual link, so add no computed length or dot-product rows: Commander stays hard. In showMe and solve on Commander, fill q1In and q2In with (3/5, 4/5) and (4/5, −3/5) so the boxes match the final picture. When subtract() and scaleSecond() run from the Commander Check, do not call p.move(), so par 3 leaves room for two test Checks.

### c22-2 · c22-p1 · major

**Problem.** The goal defines done only as 'one unit long and at a right angle'. The answer q2 = (−0.8, 0.6) meets that exactly, yet it is rejected with a false message. The message says it is 'not one unit long' when it is. This student checks their own working, so they will distrust the game rather than look for the sign convention, which is stated nowhere.

**Proposed fix.** Leave the goal alone. In check(), split the last branch. If |b| ≈ 1 and b · q1 ≈ 0 but b ≠ P1_Q2, say 'One unit long and at a right angle to q₁, but not the one built from b₂: q₂ is what is left of b₂ after subtracting its shadow on q₁, then scaled.' This points back to the procedure without saying 'negate it'. Otherwise say 'At a right angle to q₁, but not one unit long.'

### c22-3 · c22-p6 · major

**Problem.** Show me fills R as 1.41, 0.71, 0 and 1.22, which is two decimals. The goal asks for three places, and the check rejects anything further than 0.002 from the exact value. If the player copies Show me's answer back in, it is marked wrong. Show me is supposed to be the trustworthy answer.

**Proposed fix.** In StepWorksheet.fill, when nice() would fall back to decimals, use the fewest decimal places (at least 2) that put the rounded value within the step's tol. For p6 that is 3 places: 1.414, 0.707, 0, 1.225. This shared-kit change only alters fills that currently fail their own check. Optionally, add 'entry (i, j) is qᵢ · aⱼ' to the existing p6 finish note, which already says why R is upper triangular.

### c22-4 · c22-p3 · major

**Problem.** Half of this puzzle on Commander is ordering the four steps of why one dot product each is enough. Show me deletes the tile panel and fills in only the final numbers, so the player never sees the reasoning in order. It shows the answer, not the why, which is the part the puzzle exists to teach.

**Proposed fix.** In showMe on Commander, build the order in the panel one tile at a time with tiles.set(['write']), then ['write', 'dot'], and so on, about 400 ms apart. Pause on the full order, then remove the panel and fill the last line. Add one note to finish: 'Dotting with q₁ leaves c₁ alone, because q₁ · q₁ = 1 and q₂ · q₁ = 0; likewise c₂.'

### c22-5 · c22-p3 · major

**Problem.** On Commander there is a yellow knob at the origin and a readout row 'knob in her numbers (0, 0)'. The goal never says what the knob is or whether moving it counts, and dragging it onto x does nothing on Commander. Because it snaps to the crossings of her grid, dragging it onto x shows (7, −1): the answer is read off the screen without any working. Separately, the tile panel covers q2 and its label at the start. The goal lists q2, but the player can barely find it.

**Proposed fix.** Build the knob and probe only on Cadet. On other difficulties, show the readout rows 'x in our grid (5, 5)' and 'x in her numbers ?', and fill in (7, −1) on the win. Add 'her grid (the copper lines)' to the goal. Reframe the view so q2 and its label clear the dock. The audit's center [0.4, 2.0] with height 11.5 puts x at about (1080, 215) px, against the readout's left edge at 1090. Something like center [1.0, 2.2] with height 12 puts the origin at about (645, 615) px, q2's tip at about (585, 570) and x at about (1020, 240). Re-shoot to confirm.

### c22-6 · c22-p5 · major

**Problem.** Everything this puzzle depends on is said only in the skipped scene or the optional prediction. The goal never says which arrow is trusted: 'The star tracker checks the up arrow… Up is the one to trust.' It never says what the three drawn objects are: the cyan line is the horizon, drawn along forward; the dashed line is true level; the yellow ring is a round star drawn through up and forward. So 'the horizon must stand level and the star round' has no visible reference. On Commander the lean readout says 'hidden until you commit', but nothing on screen is called commit. At the start the prediction panel also covers the star.

**Proposed fix.** Add the facts, not the order, to the goal: 'Up points exactly straight up (the star tracker checks it). The cyan horizon is drawn along forward; the dashed line is true level. The yellow ring is a round star drawn in the up–forward plane. Square the frame (subtract shadows on finished arrows, scale to length 1) so the horizon lies on the dashed level and the star is round.' Do not write 'trust up' or 'up first': the player should infer the order from 'the first arrow only gets scaled'. Change the hidden text to 'shown once all three are length 1', and add a 'level' label on the dashed line.

### c22-7 · c22-p2 · major

**Problem.** On Commander the worksheet prompts give away the player's own answers. The prompt for step 2 is 'v₂ = x₂ − ½v₁', which shows that step 1 is ½. The prompt for step 5 is 'v₃ = x₃ − ½v₁ − ⅓v₂', which shows that steps 3 and 4 are ½ and ⅓. The player wants to compute these and is handed them instead. Typing a step changes nothing on screen: the arrows stay still and the readout stays empty until the very end. Show me only fills in the boxes and gives no line of why.

**Proposed fix.** Have the prompts point back to earlier rows instead of printing values: 'v₂ = x₂ − (step 1)·v₁' and 'v₃ = x₃ − (step 3)·v₁ − (step 4)·v₂'. Add to the goal: 'vᵢ is what is left of xᵢ before scaling.' Add one line of why to the finish readout, e.g. 'v₂ · v₁ = 0: removing the shadow leaves only the part at a right angle.' Lower priority: drawing each typed v₂ or v₃ needs a per-step callback in StepWorksheet. That is a shared-kit change, so do it only if the c18 standard settles on it.

### c22-8 · c22-p4 · minor

**Problem.** On Commander the readout still says 'move: click a card' after a card has been applied, so it looks as though the click did not register. The goal asks the player to compare against 'the dashed unit circle', but at the start that circle lies exactly under the solid yellow ring and can't be seen. Par is 9, exactly 6 cards plus 3 pins, so applying any card a second time to look again costs a star. On Commander, looking again is the only tool the player has. Show me never says why the shear, the squash and the 1.41 move fail.

**Proposed fix.** On Commander, set r.row('n', 'applied', '$' + m.tex + '$') in apply(); do not use m.note, which carries the verdict. Raise par to 12. Draw the dashed ghost circle above the ring (higher z or render order) so the circle the goal names is visible. In showMe only, call readouts(m) on every difficulty, so the column lengths and angle teach why the shear, the squash and the 1.41 move fail. That reuses existing rows instead of adding new reason strings.

### c22-9 · c22-p6 · minor

**Problem.** The goal is symbols only: 'Find R = QᵀA'. The player computes the dot products without knowing what R is. The skipped scene line 'One matrix of square arrows, one matrix of amounts' is what links R to the title question. That link, A = QR, appears only in the readout after the win.

**Proposed fix.** Put this first in the goal: 'Each skewed arrow is rebuilt from the square ones: aⱼ = r₁ⱼq₁ + r₂ⱼq₂. The amounts form R, so A = QR (Q, with columns q₁ and q₂, is in the readout).' Then: 'Find R = QᵀA by hand, to three decimal places.'

### c22-10 · c22-p7 · minor

**Problem.** Par is 3, which equals the bare minimum: run classical, run modified, pick. Each run redraws the same two arrows, so after both runs only the last result is visible. Comparing the two pictures, or a pick pressed too early ('Run both versions first.'), costs a star. On Commander the readout also colours 45.0° orange and 90.0° green, and the subgoal says 'Pick the version whose last two arrows are at a right angle'. Together they hand over the pick with no thinking left.

**Proposed fix.** Raise par to 5. When modified runs, leave the classical q2 and q3 as faint ghosts so both pictures can be compared without re-running. Drop the neutral-colour change and the reason quiz: one is not needed, and the other is a redesign beyond this pass. The pick message already gives the why.

## c23

### c23-1 · c23-p2 · blocker

**Problem.** On Commander the goal that explains the picture is thrown away. The player sees a green arrow b, a blue plane, two labelled arrows, a yellow dot and a dashed segment, but nothing says that b is the three readings (1, 2, 4), that each point of the plane is a line's three predictions, or that the dashed segment is the leftover. The story line that set this up ("Three readings make one arrow with three numbers. Every line the board allows makes another") is skipped. The last line then asks for x̂ from AᵀAx̂ = Aᵀb, but b's numbers appear nowhere on screen. The only way to get them is to read dot heights off the small board.

**Proposed fix.** Do not replace the explanation; add the task after it. Keep p2.goal as a shared first part, add one sentence to it, and have each difficulty's setGoal append only its own task sentence. Shared part: "Data space. The readings 1, 2, 4 (at t = 0, 1, 2) are one arrow b = (1, 2, 4), the arrow labelled b. Every line y = c0 + c1 t is one point of the blue plane, c0(1, 1, 1) + c1(0, 1, 2): its three predictions. The yellow point is your line (the small board draws it). The dashed segment from it to b is the leftover (readings minus predictions); its squared length is the line's total square area." Commander task: "Find the point of the plane nearest b. Then order the steps from that right angle to the formula, and solve its last line for x̂ = (c0, c1)." Use 'the arrow labelled b', not '(green)': the (1, 1, 1) arrow is green too (C.v in drop.ts:188). Never state AᵀA, Aᵀb or x̂. Word the action to match c23-2: 'type' if that fix lands, otherwise 'drag'.

### c23-2 · c23-p2 · blocker

**Problem.** The first instruction cannot be done on Commander. 'Drag the yellow point … to see the right angle' only counts within 0.01 units of the foot, with no snap. On this camera that is about one screen pixel. The right-angle marks, the 'There is the right angle' bark and the green zeros in the readout effectively never appear. Every drag also counts toward a par of 4. The tile panel is open from the start, so the player cannot tell whether the drag is required or how close is close enough.

**Proposed fix.** On Commander, disable the probe knob and add a two-cell input '(c0, c1)' with a Test button. Test calls dp.set([c0, c1]) and show(), so the yellow point is drawn exactly at c0(1,1,1) + c1(0,1,2) and the readout shows both leftover dot products. Keep tol 0.01 and no snapping: a typed foot shows the right-angle marks and the bark through the existing code. Tests do not count moves; par 4 stays for tile check plus last line. Mount the tile tray only after the first Test, not after the foot is found, so the last line does not become a re-type of an answer already typed. An optional test log like Chapter 18's is fine but not needed. Fall-back if typing is too big a change: keep the drag but pass countMoves: false through DropPlane, and say in the goal that the drag is for exploring and the win is the steps and the last line.

### c23-3 · c23-p5 · major

**Problem.** Commander has a hidden rule. After A and b are set, 'normal equations' is the selected method. Pressing 'Fit row 1' is refused with "Commander: solve through QR…" and the refusal costs a move. The rule is stated nowhere before the player breaks it. Its reason also gives away the question puzzle 7 asks next ('Does the way you solve a fit change the answer?'). On this data the normal equations give the same 2.004, so the refusal is arbitrary from the player's side.

**Proposed fix.** Delete the Commander refusal at puzzles2.ts:80 and the Commander-only 'solve by' row at line 104; ref() setting method = 'qr' can stay. If a method choice must stay on Commander, start with neither selected, accept both, put the requirement in the goal, and move p.move() below the guard so a refused press is free.

### c23-4 · c23-p5 · major

**Problem.** A story-skipper is not told in maths terms what 'the pulse' is. Hint 1 is the only place that says it is a 3 × 3 matrix C with after ≈ C·before. The goal writes 'X c = …' but never defines X or c, while the panel and subgoal say 'A =' and 'b ='. The goal also gives away the b choice that subgoal 1 asks the player to make. A large blue plane fills the scene with no explanation. Two puzzles earlier, a blue plane meant the column space; here it is the story's stern sheet. The readback needs three decimals, but that is only said after a wrong answer.

**Proposed fix.** Goal: "The Collapse pulse is a 3 × 3 matrix C: each drone's after-position (yellow) is C times its before-position (white), plus a little noise, so no C fits all twenty exactly. Fit C one row at a time by least squares: choose what goes in A and what goes in b, fit the three rows, then type C e₃ (where (0, 0, 1) lands) to three decimals. The blue sheet is the stern: the pulse squeezes the after-positions almost onto it." Remove 'X c = (coordinate i of the after-positions)' and use A and b, as the panel does. Do not add 'twenty equations, three unknowns' or the before/after assignment; those belong to the hints.

### c23-5 · c23-p3 · major

**Problem.** The goal says 'Find the line', but on Commander the only box checked is the last one, the total square area. A player who works out c0 = 1.4 and c1 = 0.8 and types them sees nothing happen. The header 'ONLY THE ANSWER IS CHECKED' reads as if the line is the answer. The typed line is also never drawn. Instead a flat yellow line at y = 3 with leftover stems sits on screen from the start; it is not in the readout and cannot be dragged.

**Proposed fix.** Goal: append "Fill in each box; only the last one, the total square area of your line, is checked." Do not draw the y = 3 placeholder before the answer: show only the five dots, and draw the line and squares at finish, as now. Optional: when the (c0, c1) row is entered, draw that typed line with its stems and no area number. This needs a per-step callback in StepWorksheet. Keep the area as the checked value; do not switch the check to (c0, c1).

### c23-6 · c23-p2 · major

**Problem.** Show me gives the answer without the reasoning, and the 'Shown' card is empty. On p2 Commander, Show me deletes the 'order the steps' tray and fills x̂ = (5/6, 3/2), so the player never sees the derivation the puzzle was about. On p1 and p4 the line just glides to the best fit, with no try first and no line of why. On p2, p3, p4, p5 and p7, which have no prediction, the card at the top reads 'SHOWN' with nothing under it and looks broken.

**Proposed fix.** p2 on Commander: Show me places the four tiles one at a time (tiles.set on growing prefixes of REF, about 400 ms apart), then calls last() and fills x̂. Extend the existing finish() note with 'AᵀA = [3 3; 3 5], Aᵀb = (7, 10)'. p1: Show me first sets the line through (0, 1) and (3, 4) (area 1.0 shown), then glides to the best line, then r.note('Why: at the best line the leftovers add to 0, and leftover × t adds to 0. Nudge either handle and the total grows.'). p4: after the marker, r.note('The best line falls 1.006 m an hour from 411.98 m, so it reaches 380 m at 31.98 / 1.006 ≈ 31.8 h.'). Keep the why inside the puzzle's readout or dock, as Chapter 18 does; do not add a PuzzleDef 'shown' field or change winCard.

### c23-7 · c23-p1 · major

**Problem.** Exploring costs stars on the drag puzzles. Every handle drag counts as a move, and on Commander there is no snap and no 'above the smallest by' row. p1 needs both handles within about 5 to 8 px of the best line with a par of 4. p4 needs three drags at minimum, with par 4, and its optional 'Try the curve through every reading' button also counts as a move. p2's exploratory drags (finding c23-2) also count against par 4. Chapter 18 raised the same kind of par from 4 to 8 for this reason.

**Proposed fix.** p1: par 8. p4: par 8, and change the curve button to () => showCurve() with no p.move(). p2: covered by c23-2 (typed tests or probe drags do not count). Leave every Commander tolerance and snap as it is.

### c23-8 · c23-p1 · minor

**Problem.** On Commander the player cannot tell what counts as done. 'As small as it goes' fires at 1% above the minimum, but Commander hides both the minimum and the % row. A player sitting at 0.712 does not know whether to keep nudging. The goal never says what a 'leftover' is (the vertical gap from a reading to the line), what the green and red squares mean, or what the axes are. The values 1, 2, 2, 4 and 'hours 0 to 3' are only in the skipped intro.

**Proposed fix.** Goal: "Four readings (white dots): 1, 2, 2 and 4 at hours 0 to 3. The yellow line is your guess; drag its two handles. A reading's leftover is the vertical gap from its dot to the line, drawn as a square on that gap (green: the reading is above the line; red: below). Make the total area of the squares as small as it can go. The puzzle ends by itself once you are within 1% of the smallest possible." Do not state 0.7 or the best line.

### c23-10 · c23-p7 · minor

**Problem.** The goal says 'fit', 'solve' and 'pick the more accurate', but on Commander every step is a button that does the work, and the readout then prints each method's error in orange or green. The judgement the puzzle asks for is handed over before the player makes it. The 'More accurate:' row is clickable before anything has been solved, and an early click costs a move. The 'five readings' are not listed and the grid has no numbers. This player wants to think, not be handed the answer.

**Proposed fix.** In pick(), move p.move() below the 'Solve both ways first' guard, or render the 'More accurate' row only after both solves. Leave the error rows, the colours and the button flow as they are.

<details><summary>Dropped by the checker</summary>

- c23-9: Mostly style or cosmetic. The screen already labels the axis in metres ('410 m', '400 m', '390 m'), the hours, and the dashed '380 m: inside the rig's reach' line; the readout says 'line's drift there … m', and the dots visibly fall toward the line. 'Pass' does not imply a direction, and 'drift' is plain English, not an undefined story term. The suggested title, the layout moves (shifting the tags, lowering the view centre) and the overlap of the handle ring with the '410 m' tag are cosmetic. The curve button needs no explanation: 'Try the curve through every reading' says what it does, and the win shows the curve anyway. Its move cost is the only substantive part, and c23-7 already covers it.

</details>

## c24

### c24-1 · c24-p3 · blocker

**Problem.** On Commander the puzzle opens with no surface, only a yellow ring floating in space, and the goal says "Drag the yellow probe to a start and Release it". Pressing Release does nothing and shows no message. That is because the player must first pick a shape with the chips under "Your call", and the goal never says so. The optional Predict card shows the same three choices (bowl / saddle / upside-down bowl) at the same time, so a player who answers it thinks they have committed. Even after committing, the goal never says what the probe does: it rolls downhill on the height z = xᵀSx. It never says what "leave the panel" means: roll off the edge of the drawn surface. That was said only in the skipped line "Drop a probe on its energy surface. Downhill is where the panel gives way." The target line (1, −1) is not drawn on Commander, so the player cannot see what they are aiming at.

**Proposed fix.** 1. Commander setGoal: '**Panel three**: the surface is the height $z = \mathbf x^{\mathsf T}S\mathbf x$ for $S$ in the readout. First **commit** to its shape with the buttons under *Your call*; the surface appears after that. Then drag the yellow probe to a start on the floor and **Release** it: it rolls downhill. Done when it rolls off the edge of the surface along the line $(1, -1)$.'
2. In release(), replace the silent return: `if (!classified) { msg.say('First commit to a shape under Your call.', 'bad'); sfx.miss(); return; }`.
3. After the commit, draw a faint dashed floor line through ±RIM·(1, −1)/√2, labelled (1, −1). It is the stated target and does not reveal the shape, which is already committed by then.
4. Keep the surface hidden and the eigenvalues and shape at '?' until the commit.
5. Optional, only if the runner gets a per-difficulty switch: drop the Predict on Commander for p3, since the commit is the prediction. Step 2 already removes the trap of answering Predict and then pressing Release.

### c24-2 · c24-p1 · major

**Problem.** On Commander the goal says "Turn the green test arrow round", but nothing can be turned: the player types an arrow. The readout shows only S. The numbers that link green to yellow (S x worked out) are missing, which is the exact Chapter 18 complaint ("What does the yellow have to do with my green"). The dashed line through green is never mentioned. The goal says "stress" but the lock row says "stretch λ". Every panel message calls the matrix A while the screen calls it S. "Bram shakes it" is story with no maths meaning.

**Proposed fix.** 1. Commander setGoal. Note that typed mode has no Lock button: Test locks a line on a hit. Goal: 'The panel’s matrix $S$ (readout) moves every arrow. **Type an arrow** $\mathbf x$ (green) and press **Test**: yellow is $S\mathbf x$, worked out in the readout. A **brace line** is a line where yellow lands on the dashed line through green, so $S\mathbf x$ is a number times $\mathbf x$; that number is the line’s **stress**. A hit locks the line; then type its stress. There are two. After that, five random symmetric matrices are tested, and you put the reason in order.'
2. Export c18's huntReadout, or move it to parts.ts, with a matrix-name parameter. Use it here for the rows green x, yellow Sx, the r.eq product and the green-yellow angle. Keep the ratio row off on Commander, as in c18. Call its paint from onChange. Hide those rows when the shake starts.
3. Add LineHunt options `name` (default 'A') and `valueWord` (default 'stretch'). Use them at parts.ts:161, 185, 198 and 223, and pass name 'S' and valueWord 'stress' here. Chapters 18 to 20 are unchanged.

### c24-3 · c24-p1 · major

**Problem.** Show me types (1, 1) and (1, −1) straight away, fills in 4 and 2, and the two brace lines appear as lavender lines. This is the same as the reported "it found two purple lines so I'm unsure why they were the right answer", which Chapter 18 fixed. No miss is shown, and no line says why those two arrows work. The Shown card only repeats the Predict answer about the right angle.

**Proposed fix.** In showMe, on Commander only (guard like c18, because test() slides a typed arrow): `await hunt.test([1, 0]); await wait(900); await hunt.test([0, 1]); await wait(900); await hunt.showMe();`. Then `r.note('Why these two: $S(a, b) = (3a + b,\ a + 3b)$. For it to be λ times $(a, b)$, subtract the two parts: $2(a - b) = \lambda(a - b)$. So either $a = b$ (λ = 4), or λ = 2 and $b = -a$.')`. A readout note survives the shake and the tiles, so no flag is needed to hold the shake back.

### c24-4 · c24-p1 · major

**Problem.** After the shake, Commander gets tiles to put in order, written with A, v, w, λ and μ. None of these is defined on screen. Nothing says v and w are the two brace-line arrows or that λ and μ are their stresses; λ = 4 and μ = 2 appear only after ordering, in the last-line prompt. Worse, the last matrix the player saw was labelled "Chapter 18’s λ-dial matrix" [4 1; 2 3]. That matrix is not symmetric, yet the tiles say "because Aᵀ = A". A player who jumped in out of order also doesn't know what the "λ-dial" was. At this stage the dock grows so tall that its top slides under the goal card, and the dock's own checklist (a copy of the goal's three subgoals) is half hidden.

**Proposed fix.** 1. Rewrite P1_TILES and P1_DECOYS with S instead of A, and the :157 miss message too ('Start from $S\mathbf v = \lambda\mathbf v$, and move $S$ across the dot…').
2. Put one line above the TileOrder: 'v and w are the two brace-line arrows you locked: $S\mathbf v = \lambda\mathbf v$ with λ = 4, and $S\mathbf w = \mu\mathbf w$ with μ = 2. Put the steps in order to show $\mathbf v\cdot\mathbf w = 0$.'
3. Relabel the shake's last readout row and message 'Chapter 18’s matrix (not symmetric)', and drop 'λ-dial'.
4. Remove the dock checklist (ck) from p1. The goal card already ticks the same three subgoals, and removing it (about 70px) brings the dock top below the goal card.

### c24-5 · c24-p4 · major

**Problem.** On Commander only the last box is checked. Its answer is 1, the row-1, column-2 entry of S, which is printed in the readout. Typing 1 there wins the puzzle with no eigenvalues, eigenvectors or Gram–Schmidt, so the goal's "Orthogonally diagonalise … by hand" is not what counts as done. The other prompts and the picture also give answers away. Step 5 names (1, 1, 1) and (1, 1, −2), the answers to step 2 and the direction of step 4. The opening picture already draws and labels (1, 1, 1). All six steps show at once. Nothing says what the pale plane and the green, red and white arrows are, and the red label "(1, −1, 0)" is half under the worksheet.

**Proposed fix.** 1. Make the last (checked) step '$\mathbf q_3$: your leftover arrow scaled to length 1 (two decimals)'. Use the exact answer [1/√6, 1/√6, −2/√6] with tol 0.006, so 0.41 and −0.82 pass. The start (1, 0, −1) already fixes the sign.
2. Drop the entry check from the worksheet. The finale already notes QDQᵀ = S. Reword the goal's last clause to '…(Gram–Schmidt); the check $S = \sum\lambda_i\mathbf q_i\mathbf q_i^{\mathsf T}$ is shown at the end', and update hint 3 to match.
3. Reword step 5: 'Lengths of your eigenvector for 4, of (1, −1, 0), and of your leftover arrow (two decimals)'.
4. On Commander, hide the green (1, 1, 1) arrow until the finale, and make the plane tag read only 'x + y + z = 0'.
5. Add to the goal: 'Pale plane: x + y + z = 0. White: your start (1, 0, −1). Red: (1, −1, 0), the first arrow in the plane.'
6. Move the camera target so the red label clears the worksheet.

### c24-6 · c24-p5 · major

**Problem.** The readout says "E = xᵀSx", but S appears nowhere on screen once the optional Predict card is skipped. The matrix was given only in the skipped line "Panel two again". A player arriving out of order cannot tell what surface this is, and cannot link the 3 and 1 they find to anything. "The probe" is also ambiguous: there is a bright yellow ball on the surface and a small green knob at the tip of x on the floor, and only the green one can be dragged.

**Proposed fix.** 1. Add `r.row('S', '$S$', `$${texM(P5_S)}$`)` once, before paint, on every difficulty. Keep the eigenvalue row hidden on Commander.
2. Goal: 'The surface is the height $E = \mathbf x^{\mathsf T}S\mathbf x$ for the matrix $S$ in the readout. Drag the tip of the green arrow $\mathbf x$ round the inner dashed circle (radius 1) on the floor. The yellow dot rides on the surface above it, and the yellow curve is the surface above the whole circle. **Lock** the $\mathbf x$ where $E$ is highest, and the one where it is lowest.' Say 'inner' because the rim is a second dashed circle. Say 'and' because the code does not enforce an order.

### c24-7 · c24-p6 · major

**Problem.** The goal never says, in maths terms, which axes can hold. The only link from the inertia matrix in the readout to the spin is in the skipped scene: "Symmetric. So she has three axes at right angles. Pick one to spin about." So this player guesses directions and waits about 12 s per try. "Hold the axis" has no number: the 2.5° limit is never stated, and the "spin axis has moved" row only appears during a spin. Show me spins (0, 0, 1), but the Shown card talks about the wing axis (1, −1, 0) flipping, which the demo never shows, and nothing says why (0, 0, 1) holds.

**Proposed fix.** 1. Goal: 'Her inertia matrix (readout) is symmetric, so she has three axes at right angles: its eigenvectors. Type a spin axis and press **Spin**. A docking drone nudges her. She holds if her spin axis moves at most 2.5° in ten minutes.'
2. Show the 'spin axis has moved' row (0°, limit 2.5°) from setup, before the first spin.
3. Show me: spin (1, −1, 0) first (the Flip), then (0, 0, 1). Finish with msg: 'Inertia × (0, 0, 1) = (0, 0, 9): an eigenvector with the largest moment, 9, so it holds. (1, −1, 0) is an eigenvector too, but its moment, 6, is the middle one.' Optionally shorten play() during Show me so the demo is not 24 s or more.

### c24-8 · c24-p2, c24-p4, c24-p7 · major

**Problem.** These three puzzles have no Predict, so after Show me the card reads only "SHOWN" with nothing under it, and the demo itself gives no reason. p2 slides straight to 45° and types [2 1; 1 2] and 3, 1, with only "No mixed term: E = 3u² + 1v²". Nothing says why 45° works or why the eigenvalues are the new coefficients. p4 fills six boxes with no working. p7 sets (a, b, c) to (−2, 0, −1), then (1, 1, 1), then types (1, −1, 0), with no word on why the first two work. The player sees answers but not the reasoning.

**Proposed fix.** 1. Add an optional `shown?: string` to PuzzleDef. winCard renders it when outcome is 'shown' (after any predict reveal) and never renders a header-only card.
2. p2 showMe: goTo(30), pause (mixed term 1.00), then goTo(45). shown: 'The 2xy splits in half: $S = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$. Its eigenvectors (1, 1) and (1, −1) lie at 45°. In that grid $E = 3u^2 + v^2$, and 3 and 1 are its eigenvalues.'
3. p4 shown: 'Every row of S adds to 4, so S(1, 1, 1) = 4(1, 1, 1). The trace, 6, leaves 2 for the other two; S − I is all ones, so every arrow with x + y + z = 0 has eigenvalue 1, twice. Gram–Schmidt picks a perpendicular pair inside that plane.'
4. p7 shown: 'a = −2, b = 0, c = −1: eigenvalues −2 and −1, both negative. a = b = c = 1: ac − b² = 0, so one eigenvalue is 0 and the other is 2, a trough. The block’s smallest eigenvalue is 1, on the plane x + y + z = 0.'

### c24-9 · c24-p1, c24-p3, c24-p5 · minor

**Problem.** Testing costs the par star in three puzzles.
- p1: the Commander minimum is exactly par 6 (2 Tests, 2 stress entries, 1 tile check, 1 last line). One test arrow that misses loses a star, although testing arrows is the task.
- p3: following the goal on Commander (commit, drag, Release, worksheet answer, Release) takes 5 moves against par 4, because every knob drag counts.
- p5: every time the player lets go of the knob after a drag counts as a move, and par 4 is just 2 drags + 2 locks. Dragging the probe round the circle, which the goal asks for, costs the star. So does any fine adjustment needed to land within 1° with no snapping.

**Proposed fix.** 1. p1: par 12, with a comment that testing arrows is how this is solved. That gives Navigator's minimum of 11 one spare and leaves Commander's minimum of 6 room for exploratory tests.
2. p3: knob `countMoves: false` and par 5. Commander's minimum is then commit + Release + last answer + Release = 4, with room for one failed release.
3. p5: knob `countMoves: false`. Only Locks count, so par 4 allows two wrong locks.

### c24-10 · c24-p7 · minor

**Problem.** On Commander the readout shows the eigenvalues and the shape name live. The player can find the upside-down bowl and the trough just by moving sliders until the "shape" row shows the target word, with no thinking; p3 hides these same rows on Commander. The red and green lines on the surface (S's eigenvector directions) are never named. For the third part nothing is drawn: no sphere, and the typed arrow does not appear. The goal says "where the stress block is lowest" without saying the number is xᵀSx with x scaled to length 1; that only appears in the message after a Test.

**Proposed fix.** 1. Rewrite the third part of the goal: 'Then, for the 3 × 3 block $B = \left[\begin{smallmatrix} 2 & 1 & 1 \\ 1 & 2 & 1 \\ 1 & 1 & 2 \end{smallmatrix}\right]$, type an arrow $\mathbf x$ (it is scaled to length 1) where $\mathbf x^{\mathsf T}B\mathbf x$ is smallest.' Use B in the Test messages too.
2. Add to the goal: 'The red and green lines on the surface are the directions of $S$’s eigenvectors.'
3. Leave the eigenvalue and shape rows as they are.

## c25

### c25-1 · c25-sp5 · blocker

**Problem.** The player gets six cards with nothing on them but symbols (P, P⁻¹, R, R⁻¹, C⁻¹, C). Nothing on screen says what P or R is, or which way P converts. Without knowing whether P turns Anchor numbers into ship numbers or the other way round, they can't work out whether the rail is P⁻¹…P or P…P⁻¹. They can only try both. R is 'Ilse's quarter turn', and that is said only in the skipped scene line. Show me puts five cards down and passes the test with no word on why that order.

**Proposed fix.** Put each card's meaning on the card itself, under its symbol: 'P · Anchor → ship numbers', 'P⁻¹ · ship → Anchor numbers', 'R · quarter turn', 'R⁻¹ · turn back', 'C · the Collapse', 'C⁻¹ · undoes the Collapse'. The palette already wraps (.a9-palette is flex-wrap), so wider cards fit. A one-line key under the palette is an equally small alternative. New goal: 'The Collapse $C$ squashed the stern, then the stern was given a quarter turn $R$, so today the Collapse reads $RCR^{-1}$ in ship numbers. The spires take a point in **Anchor numbers** and give one back in Anchor numbers. Put cards on the rail (the right-hand card acts first) so the settings **undo today’s Collapse**, then **Test**.' Follow chapter 18's pattern: at the end of showMe, after test(), say in the puzzle's own message line: 'Read it right to left: $P$ turns Anchor numbers into ship numbers, $RC^{-1}R^{-1}$ undoes $RCR^{-1}$ there, and $P^{-1}$ turns the answer back into Anchor numbers.'

### c25-2 · c25-p3 · blocker

**Problem.** On Commander the player can work out −45° and 71.57° by hand and still fail, because the two turns are mouse sliders that cannot be set to those values. The last-turn slider covers 360° on a track about 208 px wide, so one pixel is about 1.7°. Commander needs both angles within about 0.3°. Only 0.01° arrow-key presses get there, and nothing says so. The 'Your three moves' readout also stays at the identity and 'largest miss 4.00' while they move the sliders and type the stretches; it only updates on Play. The goal says 'the circle must land on the dashed oval', but no circle is drawn until Play. 'The right-hand one acts first' refers to a rail laid out top to bottom.

**Proposed fix.** On Commander, replace the two angle Sliders with typed number boxes, like the Σ VectorInput: '$V^{\mathsf T}$: first turn, degrees' and '$U$: last turn, degrees'. Play then uses exactly what was typed. Do not repaint the readout live. When any input changes, blank the $U\Sigma V^{\mathsf T}$ and 'largest miss' rows (show '— press Play') so they never show numbers that no longer match the boxes; Play fills them, as it does now. Create the dashed unit circle at setup (UnitCircleImage with the identity, at stage 0, or a plain dashed circle) and tag it 'the circle'. Change the goal's '(the right-hand one acts first)' to '$V^{\mathsf T}$ acts first, then $\Sigma$, then $U$'. At the end of showMe, after the win, say in the message line: '−45° turns $\mathbf v_1 = (1, 1)/\sqrt2$ onto the first axis; the stretches are $|A\mathbf v_1| = 6.71$ and $|A\mathbf v_2| = 2.24$; $\arctan 3 = 71.57°$ turns the first axis onto $A\mathbf v_1$’s direction $(1, 3)$.' The maths checks: rotating (1,−1)/√2 by −45° gives (0,−1), and U·Σ·(0,−1) is 2.24·(3,−1)/√10 = A(1,−1)/√2. Optionally raise par from 2 to 3, so a hand calculator who plays twice to check is not punished.

### c25-3 · c25-sp3 · major

**Problem.** The picture contradicts the goal. At the right answer (N = 625, error exactly 0.3) about eight dots still sit outside the orange 'tear limit' lines, yet all the dots turn blue and the puzzle is won. At N = 700 dots are still outside. On Commander the error number is deliberately hidden, so the picture is the only feedback, and it says the stern tears at every N the player is allowed. The dots themselves are never named.

**Proposed fix.** In paint, normalise the scatter: x = (g / max|g|) · e · SC, keeping the ±4.8 clamp. The outermost dot then sits exactly on the line at N = 625 and inside for every N ≥ 625. PointCloud.set(points, colors) accepts per-point colours, so colour each dot by its own |x| ≤ TEAR·SC (blue inside, orange outside) rather than by e. Change the bottom tag to 'each dot: where one test point lands after the undo (error × 6)'. Keep the error row hidden on Commander.

### c25-4 · c25-p5 · major

**Problem.** Part A says 'the test move' and 'the first layer of A' but never says what A is. 'The test move' was named only in the skipped p1 intro. The puzzle just before (p4) set A to a 3 × 2 matrix, so a player going in order reads this A as that one, and the flat 2-D circle on screen doesn't fit. 'Layer' in plain words ('one column of numbers times one row') is also only in the skipped p5 intro. The long yellow segment across the screen is unlabelled. p2 has a smaller version of the same gap: its last line asks for $A(1, 1)\cdot A(1, -1)$ with no A anywhere on screen.

**Proposed fix.** p5 goal: '**First, the test move** $A = \begin{bmatrix} 3 & 0 \\ 4 & 5 \end{bmatrix}$ from puzzle 1. A **layer** is one column times one row, $\sigma\mathbf u\mathbf v^{\mathsf T}$. Keep only the first layer, $A_1 = \sigma_1\mathbf u_1\mathbf v_1^{\mathsf T}$. The yellow arrow is what it misses, $(A - A_1)\mathbf x$. Turn $\mathbf x$ round the circle and **lock** where that miss is longest.' Add a ptag on the yellow segment: 'every miss $(A - A_1)\mathbf x$ lands on this line'. p2: start the goal with '$A = \begin{bmatrix} 3 & 0 \\ 4 & 5 \end{bmatrix}$, as in puzzle 1.'

### c25-5 · c25-sp7, c25-sp4, c25-p6 (and every c25 puzzle without a prediction) · major

**Problem.** After Show me, a 'SHOWN' card opens at the top of the screen with nothing in it on every puzzle that has no prediction. The one line of why is in the win dialogue, which this player skips. In sp7 the slider stops at 0.5 with 'Both pulses stretch by 27.4: the square root of 750', but not why equal is best. In sp4 it slides to 35.2° and says 'Mixed stress 0.000: small enough that each brace only pushes or pulls', but not why that angle. In p6 it types 1/750 without saying the thickness is the smallest stretch. This is the 'it found the answer but I don't know why it's right' complaint again.

**Proposed fix.** Chapter-local, as in chapter 18: after the win in each showMe, set the puzzle's message line to the reason. sp7: 'The two stretches multiply to 750, so the larger one is smallest when they are equal: $\sqrt{750} \approx 27.4$.' sp4: 'Mixed stress is zero only when the braces lie along eigenvectors of the symmetric $C$, its principal axes: $\mathbf q_1 \approx (1, 1, 2)/\sqrt6$, 35.2° from upright.' p6: 'A ball 1 thick comes out $\sigma_3$ thick: the smallest stretch is the new thickness, $1/750$.' For p3 and sp5, see c25-2 and c25-1. Separately, and only after agreement since it touches every chapter: hide the win card's body when there is no prediction (or add an optional `shown` field).

### c25-6 · c25-sp4 · minor

**Problem.** The goal says 'one brace sits on the stern’s hinge' but not which of the three coloured lines that is; it is the red one, which never moves. The readout's 'mixed stress $\mathbf q_1^{\mathsf T}C\,\mathbf q_3$' names q₁, q₃ and C, and none of them is labelled or given. The win window is just two slider stops. At 35.1° the readout shows 0.007 in orange with 'Keep turning', which looks like 'no mixed stress' to anyone reading it. The slider is 90° over about 125 px (0.7°/px), so landing on 35.2 or 35.3 by mouse is luck.

**Proposed fix.** Goal: 'The **red** brace sits on the stern’s hinge, $(1, -1, 0)$. Turn the green ($\mathbf q_1$) and blue ($\mathbf q_3$) braces about it until the mixed stress $\mathbf q_1^{\mathsf T}C\,\mathbf q_3$ (how much the Collapse pulse $C$ twists one brace into the other) turns green.' Tag the brace ends q₁, q₂ (hinge), q₃. To give a number instead, change sp4Won to |mixedStress| < 0.005 on Commander and say 'below 0.005' in the goal, so the text and the check agree. On Commander, add a typed degrees box next to the slider, as in c25-2.

### c25-7 · c25-p6 · minor

**Problem.** The goal moves from 'a ball of buoys' to 'the stern’s thickness' without saying they are linked. A story-skipper isn't told the stern went through this same pulse, so the thickness to give is how thick the squeezed ball (old thickness 1) has become. Also, the stretch table's column heads show capital 'Σ₁ Σ₂ Σ₃' because the CSS uppercases the header. In this chapter Σ is the whole stretch matrix, so the heads read as the wrong symbol (the 3-D tags correctly say σ1, σ2, σ3).

**Proposed fix.** Goal: 'The fitted Collapse pulse (a 3 × 3 matrix) squeezed the stern exactly as it squeezes this ball of buoys into a sheet. Press **Show more decimals**. Then give the stern’s thickness now, if it used to be 1.' Do not change `.a9-table .h` globally, because c24 shares it. Give the σ header spans an extra class, e.g. `h('span', { class: 'h sym' }, 'σ₁')`, with `.a9-table .h.sym { text-transform: none; }`.

### c25-8 · c25-p4 · minor

**Problem.** Before any work is done, the picture draws and labels v₁ and v₂ at their answer directions, (1, 1)/√2 and (1, −1)/√2. That gives away the V step and the eigenvectors on Commander, while σ₁u₁ and σ₂u₂ are correctly hidden until the end. The worksheet panel also covers the left half of the 3-D picture, including part of the lifted yellow curve, and that curve is not labelled as the image of the circle.

**Proposed fix.** Hide v₁ and v₂ at setup. In finale(), make them visible and grow them together with u₁ and u₂ (one Promise.all). Move the camera so the picture clears the worksheet: shift the view3D target about 1 unit toward the right of the screen, or raise the distance from 8.2 to about 9.5, so the whole circle, its image and 'the flat circle' tag are visible. Add a ptag on the yellow curve: 'where $A$ sends the circle'.

### c25-9 · c25-sp2 · minor

**Problem.** Two set-piece nouns are never given in maths terms. 'The two-decimal model $C_2$' (sp2) is never defined: it is the pulse with its stretches rounded to 3, 1 and exactly 0. 'The undo' (sp1) is the inverse $C^{-1}$, but only sp7 implies that. The player also presses 'Bring it back with $V\Sigma^+U^{\mathsf T}$' without being told what Σ⁺ does. In plain words that is only in hint 2 and in the skipped p7 win line.

**Proposed fix.** sp2 goal: '$C_2$ is the pulse with every entry rounded to two decimals (no noise). Its stretches are 3, 1 and **exactly 0**. Try to **undo** it. Then bring the lattice back with $V\Sigma^+U^{\mathsf T}$, which undoes each stretch that is not zero and leaves the zero at zero, and find **two different points** that come back as one.' sp1 goal: begin 'The undo, $C^{-1}$, is built from readings with noise of 0.01.'

### c25-10 · c25-sp7 · minor

**Problem.** The middle strip ('after the first pulse') is drawn on a linear thickness scale. At the right answer (t = 0.5, both pulses ×27.4) it still sits almost on top of 'the stern today' line, so the picture shows the first pulse doing nearly nothing and the second doing all the work. That is the opposite of 'both equally gentle'. 'So that neither pulse stretches more than it must' doesn't say exactly what counts as done.

**Proposed fix.** Goal: 'Split the undo into two pulses: $C^{-t}$, then $C^{-(1-t)}$. They stretch the thin line by $750^t$ and $750^{1-t}$. Choose $t$ to make the **larger** of the two stretches as small as possible.' Leave the strip linear.

<details><summary>Dropped by the checker</summary>

- c25-10 (log-scale strip part): The middle strip is drawn to true thickness (27.4/750 of the way up) and labelled; the log view already exists in the dock bars. Changing it is a style choice and would make a picture labelled 'thickness' non-physical. Only the goal-wording part of c25-10 is kept.
- c25-5 (engine `shown` field part): Not needed for c25. Chapter 18 ends showMe with a chapter-local message (`if (!p.g.headless) msg(reason, 'good')`), which meets standard 6 without touching runner.ts. The empty SHOWN card affects every chapter, chapter 18 included, and should be raised separately for agreement, not fixed as part of c25.
- c25-2 (live repaint of the product): On Commander, repainting UΣVᵀ on every input next to A becomes a live matching aid: the player could tune the angles against A's entries instead of working out arctan 3. That breaks standard 8. It is replaced by blanking the stale rows until Play, as in kept item c25-2.

</details>

## c26

### c26-1 · c26-p2 · blocker

**Problem.** The goal says the target is the spot "where the line runs along the cloud". But the line already runs along the cloud anywhere inside it. For example, with the pivot at (3.0, 2.3) the line visibly lies along the cloud and nothing happens. On Commander the puzzle only wins when the pivot is within 0.06 units (about 6 px) of the cloud's mean. The goal never names that point, and Commander does not draw it. All the player gets is "Closer." or "Further from the middle of the cloud." after each drop, and with par 2 every drop costs a move. So they can't tell what counts as done, and the only way to find it is a hot/cold search that loses stars.

**Proposed fix.** Name the target in the goal: 'The white pivot is the point the line of most spread is measured from. With the pivot at the origin, the line points **at** the cloud. Drag the pivot to the **middle of the cloud, its mean reading** (the average of all 160 readings), and watch the line.' Loosen Commander's tolerance to what the eye can judge with nothing drawn, about 0.15 to 0.2 (it is 0.06 now; Navigator is 0.12 with a 0.05 snap). The mean dot already appears only on the win, so leave that as is. Raise par from 2 to 4. Do NOT rename the readout to 'spread about the pivot'. That total is lowest exactly at the mean, so it becomes a precise hot/cold helper on Commander, and it would also break the 15.44 to 1.60 explanation in c26-5.

### c26-2 · c26-p3 · blocker

**Problem.** On Commander the first subgoal only ticks when w is within 1° of the best direction, but nothing on screen can show a 1° difference. The readout wᵀCw shows 5.56 (its maximum) anywhere within about 2.3° of the best direction, 'of the total' shows 79% across that whole range, and there is no angle row. So a player parks w where the readout shows the largest possible value, lets go, and gets no tick and no clue why. Each extra drag costs a move: par 4 has to cover the drags, the order check and the last line. Separately, the goal never says what the yellow arrow labelled Cw is. It is also drawn at 0.42 of its true length, so at the answer it looks about 2.3 times as long as w instead of 5.56 times.

**Proposed fix.** Make the readout able to show what the check needs, without adding a helper. On Commander, show wᵀCw to three decimals: 5.562 or 5.561 appears only within about 0.6°, inside the 1° check. Or else loosen Commander to the width the two-decimal 5.56 actually shows (about 2.2°). Do NOT add the suggested 'angle between w and Cw' row coloured within tolerance. Cw lying along w is the insight this puzzle asks the player to discover and then explain, and Commander hides helper readouts on purpose. Add one sentence to the goal: 'Yellow is $C\mathbf w$, drawn at 0.42 of its true length.' (Or draw it at true length if it fits.) Raise par to 6.

### c26-4 · c26-p4 · major

**Problem.** The last step, "Each reading's coordinate along it", has more than one reasonable reading. 'It' is the direction the player just typed as (1, 1), and projecting the centred readings onto (1, 1) gives 3, −3, 3, −3. Projecting the raw readings onto the unit vector gives 8.49, 4.24, 8.49, 4.24. The check wants the centred readings dotted with the unit vector (1, 1)/√2, which gives ±2.12. Both other readings are rejected with no message. The goal only says "and project", so the player can't tell which projection counts as done.

**Proposed fix.** Last prompt: 'Each **centred** reading’s coordinate along the **unit** first direction, in the order given (two decimals)'. Add mistakes: [[3, −3, 3, −3], 'That is along (1, 1), whose length is √2. Use the unit direction.'] and [[8.49, 4.24, 8.49, 4.24], 'Use the centred readings.']. Both fall within the 0.01 mistake tolerance (8.4853 and 4.2426). The goal ending becomes '…the share of the total spread it keeps, and each centred reading’s coordinate along it.'

### c26-5 · c26-p2 · major

**Problem.** Puzzle 1 taught 'make the spread as large as it can be'. Here the yellow readout 'spread along the line' falls from 15.44 at the origin to 1.60 at the right answer, and nothing on screen says why the smaller number is right. Show me just slides the pivot to the mean. The Shown card is empty, and the final message, "At the mean, the line runs along the cloud: centre first, then look for spread", says what happened, not why. The reason (measured from a far-away point, most of that number is just the cloud's distance from the point) is only in hint 1 and in the codex card after the puzzle, so a story-skipper never sees it.

**Proposed fix.** Put one line of why into the normal win message, since a skipper who solves it never sees Show me: 'At the mean, the line runs along the cloud. About the origin, most of the 15.44 was just the cloud’s distance from the origin; about the mean that part is zero, and the 1.60 left is the cloud’s own shape: centre first.' Show me: move to (1.5, 1.0) and say 'Still points at the cloud', move to (2.6, 2.6) and say 'Closer: the line has turned', then go to the mean and show the same line of why. The predict card is optional; skip it.

### c26-6 · c26-p6 · major

**Problem.** The goal is written almost entirely in story words: link, entry, channel, the record, the other end. What the record is (10,000 entries of 12 numbers each), and why only two numbers per entry can go out, is said only in the cold-open dialogue this player skips. They don't know that an 'entry' is one row of 12 numbers, that a 'channel' carries one number per entry, that 'component' means a principal component, or what 'share of the record kept' measures. Puzzle 5 has the same gap: "the record's twelve singular values".

**Proposed fix.** p6 goal: 'The record is a data set: 10,000 entries of 12 numbers each. The link can send only **two numbers per entry**. Each channel sends one principal component: every entry’s coordinate along it. Choose two components; the picture is the record plotted on them, as the receiver will see it. Lock the pair that keeps the largest share of the record’s spread.' (The last sentence only restates the subgoal.) p5, first sentence: 'The bars are the twelve singular values of the record (10,000 entries of 12 numbers each), after the mean is taken away.'

### c26-7 · c26-p6 · major

**Problem.** Before any component is chosen, the stage shows a large round cloud of 10,000 dots, while the readout says 'components in the channels: none' and neither axis is labelled. That cloud is actually the record plotted on components 11 and 12, the two smallest. The starting picture does not match the controls, and the player has no way to know what the ball is. It looks like 'the record' itself.

**Proposed fix.** When chosen.length === 0, put every dot at the origin (or hide the cloud) and set the readout to 'components in the channels: none, choose two'. Show me's first try, pick([10, 11]), then shows the ball honestly, since the axis tags and share are filled in once components are chosen.

### c26-3 · c26-p4 · major

**Problem.** The sheet asks for "The centred readings, one per column", which is a 2×4 grid, and then for "The covariance matrix (1/(n−1)) XcᵀXc" in a 2×2 box. If Xc is the 2×4 grid the player just typed, XcᵀXc is 4×4. A CS student who follows the formula literally gets a 4×4 matrix and has to guess that the formula assumes the other layout (readings as rows, which is how the rest of the chapter defines Xc). The goal also never says n = 4.

**Proposed fix.** Relabel step 2: 'The centred readings, one per column (this grid is $X_c^{\mathsf T}$)'. Or switch it to one reading per row (answer: P4_CENTRED, a 4×2 grid that is $X_c$). Leave the rest as it is; n = 4 is already clear from the four readings listed.

### c26-8 · c26-p5 · minor

**Problem.** On Commander the share readout and the meter are hidden on purpose. Because of that, Show me's 'try' at k = 1 shows only a yellow bar, with no number and no verdict. It then jumps to 2 and says "2 components keep 96.4%: the fewest that reach 95%." The player never sees why 1 fails or where 96.4% comes from. Also, every chip click counts as a move against par 2, so looking at 1, 2 and 3 before committing costs a star.

**Proposed fix.** Show me: at k = 1, say '1 component: 81 / 134.9 = 60.0%, not yet 95%.'; at k = 2, say '(81 + 49) / 134.9 = 96.4%: 2 is the fewest.', then keep(). This working appears only after Show me; normal Commander play still hides the share. Remove p.move() from the chip click so only 'Keep these' counts as a move.

### c26-9 · c26-p3 · minor

**Problem.** Once the order is right, the dock (a copy of the checklist, the message line, the tile panel, then the last-line sheet) grows until its top slides under the objective card. The message "Right. Now the last line." ends up hidden behind it. The dock's checklist repeats the one already ticking in the objective card, which only adds height. While the tile panel is open it also covers the left third of the cloud.

**Proposed fix.** In p1 and p3, drop ck.el from the dock; the objective card already ticks the subgoals. In p3, append the message after the reasoning box (p.dock().append(box, msg.el)) so new messages appear next to the input, at the bottom.

### c26-10 · c26-p1 · minor

**Problem.** From the first frame the objective card lists "The plane of most spread through the pancake", but there is no plane and no pancake on screen until the line is solved, so the player can't tell what it refers to. In the plane stage every slider release counts as a move, and par 4 has to cover both the line and the plane. Tuning turn and tilt a few times each, which is how the plane is found, costs a star.

**Proposed fix.** Raise par to about 7. Reword subgoal 2 so it makes sense before stage B: 'Then: the plane of most spread through a flat 3-D cloud'. Change both the subgoals array and the dock checklist text, or drop the dock checklist as in c26-9.

## c27

### c27-1 · c27-p1 · blocker

**Problem.** On Commander the player types the nine numbers. The arrows move and the readout turns gold and says "the identity: nothing moves", but neither subgoal ticks and the puzzle is not won. Typing only redraws the picture. The setting is checked only on a drag release or on Enter, and nothing on screen mentions Enter or offers a Check button. The goal tells the player to "check that no point moves", and the readout already seems to confirm that, so the player is left looking at a solved-looking screen that never completes.

**Proposed fix.** Add a 'Check setting' button to the p1 dock. It runs the same commit path as Enter: count one move, then onCommit(mv.get()). The cleanest way is an optional submitLabel on MatrixView3 that renders the button next to the input and shares onSubmit, so other typed 3×3 views can reuse it. On Commander (or on every difficulty), say it in the goal: 'Type the nine numbers, then press **Check** (or Enter).' Do not auto-commit on each keystroke. Apply this together with the c27-7 fix so that each Check counts as one move.

### c27-4 · c27-p1 · major

**Problem.** The goal never says what a "spire" or the "bench" is in maths terms, and one object has three names on screen: "first spire" in the goal, "spire 1" in the readout, and Ae₁ on the arrow, with column 1 of "A =" in the input. The readout then says "the move in our grid, PMP⁻¹", but M and P are never defined on screen (the input is labelled A). "Our grid" versus "the spire numbers as written" depends on Chapter 17's Anchor grid, which an out-of-order player has not seen. The bench also starts at (0,1,0), (−1,0,0), (0,0,1) with no word on what that setting is. The second subgoal, "Check what the setting does in our grid", is not something the player can do: it ticks by itself at the same moment as the first.

**Proposed fix.** Goal, in plain words first: 'The bench's three **spires** are the three **columns** of the matrix A below, the places where the axis arrows Ae₁, Ae₂, Ae₃ land. It starts at the old setting, a quarter turn. Ilse's new setting: first spire (1, 0, 0), second (0, 1, 0), third (0, 0, 1). **Blue lattice**: A read as written. **Gold lattice**: what A really does in our ship's grid, PAP⁻¹, where P is the Anchor's grid. Done when neither lattice moves.' In the readout, rename the row to 'the move in our grid, $PAP^{-1}$' and add a row 'P, the Anchor's grid: columns (1, 0, 0), (1, 1, 0), (0, 0, 1)' (this matches truth.ts P). Replace subgoal 2 with something the player can see, such as 'The gold lattice (our grid) sits still too', or merge the two subgoals into one and drop p.subgoal(1). Keep Ilse's numbers in the goal (see c27-9).

### c27-2 · c27-p2 · major

**Problem.** The puzzle never says what machine the stars pass through. "Score", "four outputs" and "cut level" are undefined, and so is what "Clip negatives" clips. At the start no cut is drawn at all, yet every ring star is red and the readout says 110 are "on the wrong side". Wrong side of what? Moving the cut-level slider changes nothing, because every star scores 0. The pipeline (four outputs x, −x, y, −y, clipped, added into a score, compared with the cut) only appears in the hints, the skipped win line and the naming card that comes after the puzzle. The player can press the buttons in order, but cannot tell what the score is or why the clip matters.

**Proposed fix.** Use a trimmed goal, and avoid the word 'layer', which the n-layer card names afterwards: 'Each star is a point (x, y). **Blue**: the cluster, which belongs inside. **Orange**: the ring, which belongs outside. A star turns **red** when it is on the wrong side. Each star gives four outputs x, −x, y, −y, added up into a **score**. A star is inside when its score is at most the **cut level** (the gold diamond, once drawn). First press **Try one move and a straight cut**: no single matrix and straight line can sort them. Then **Clip negatives** (negative outputs become 0 before adding) and set the cut level so no star is red.' Relabel readout row 's' as 'score = sum of the four outputs' and keep its values ('always 0' / '|x| + |y|'). Do not add the auditor's 'x − x + y − y = 0' note. The four outputs and 'always 0' are already on screen, and working out why the sum is 0 is the player's job (hint 1 and the relu build docPrompt ask exactly that).

### c27-3 · c27-p2 · major

**Problem.** Show me teaches nothing. It runs the four failing tries at 20 ms each, so they are invisible, and skips the explanation the Try button gives. It then jumps to clip on with cut 1.7. The "Shown" card at the top is empty, because p2 has no predict reveal. Nothing says why 1.7 works, which is the same complaint the player made about Chapter 18 ("it found two purple lines so I'm unsure why they were the right answer").

**Proposed fix.** In showMe, call runTries(false) when not headless, then put the Try explanation into the readout note: 'Four moves tried, each with its best straight cut; the best still left N of 180 stars on the wrong side. A matrix keeps the cluster inside the ring, and one straight line cannot fence in a middle.' Use the note rather than a bark, because the onWin dialogue covers barks. Then turn the clip on and step the cut with short pauses: 1.2 (12 cluster stars red), 2.8 (15 ring stars red), 1.7 (none red). End by writing one line to the readout note, which stays visible on the Shown screen: 'Clipped, the score is |x| + |y|. Cluster stars lie within about 1 of the centre, so they score at most √2 ≈ 1.4. Ring stars lie at least 2 away, so they score at least 2. Any cut between works.' Keep solve() on the fast path for tests. Do not add a predict to p2 just to fill the card.

### c27-5 · c27-p1 · major

**Problem.** The puzzle's real point, that the identity reads the same in every grid (P I P⁻¹ = P P⁻¹ = I), reaches this player nowhere. It is said only in a bark that lasts 5.2 s and sits under the win dialogue, and in the win dialogue itself, which they skip. After a win or Show me, the card explains only the columns idea, so the second subgoal and the gold lattice go unexplained.

**Proposed fix.** Extend p1 predict.reveal, which both the Solved and the Shown card display: '… nothing moves. In our grid the move is PAP⁻¹, and with A = I that is PP⁻¹ = I: the identity is the same in every grid.' The readout change to row 'g' ('PIP⁻¹ = PP⁻¹ = I: nothing moves in any grid') is optional and should only show once A is the identity. Remove the now-redundant win bark, or keep it, since it is harmless.

### c27-7 · c27-p1 · major

**Problem.** Typing is punished compared with dragging. Each Enter counts as two moves against a par of 3, so a Commander player who checks the first column with Enter and then the second has used 4 moves and loses two stars. Dragging the same two spires costs 2. Every partial commit also triggers a "wrong" bark about "buoys", which are not on screen in this puzzle (it shows lattices), even when the player is halfway through a correct setting.

**Proposed fix.** Delete the p.move() at puzzles.ts:58 only. Do not touch MatrixView3's onSubmit or VectorHandle, whose counting is correct and shared by other chapters. Each drag, Enter or Check then counts once: two drags make 2 moves, and typing plus one Check makes 1. Par 3 then allows a test, and raising it to 4 is optional. Reword the bark to what is on screen without restating the answer: 'The lattices still move: not every spire matches Ilse's numbers yet.'

### c27-6 · c27-p2 · major

**Problem.** Every control is live from the start, but the order is enforced only behind the scenes. The cut slider does nothing until the clip is on, because every star scores 0 and the count stays at 110. A player who clicks Clip negatives and sets the cut first sees "stars on the wrong side 0" in green, yet nothing ticks and the puzzle is not won until they go back and press Try. The success-coloured 0 contradicts the unchanged checklist.

**Proposed fix.** Disable Clip negatives until runTries has finished (enable it where tried = true is set). Show the cut control only while the clip is on: append it hidden and toggle it in upd(). Keep the `tried` gate. showMe and wrong() set state directly, so they still work, but make showMe reveal the cut control too.

### c27-8 · c27-p2 · minor

**Problem.** The "Try one move and a straight cut" button lets the player choose nothing: it plays four fixed moves, and the matrices are never shown, only stars swirling. Afterwards the readout says "best move and straight cut 61 wrong" without saying out of how many stars, or which moves were tried. A CS student cannot check the claim or form their own view of why a move cannot help.

**Proposed fix.** In showTry, set a readout row 'move tried' to the 2×2 matrix in TeX (row values accept $tex$). Change the counts to '${cut.wrong} of 180 wrong' and, in row 'b', '${best} of 180 wrong'. Leave out the optional 'Try my move' input.

### c27-10 · c27-p2 · minor

**Problem.** On Commander the cut level is a slider with a live wrong-side count, so the player can drag until the count reads 0 without ever working out the |x| + |y| bound. This is the only part of the puzzle that asks for a number, and Commander is the difficulty where numbers are typed and worked out by hand.

**Proposed fix.** On Commander, replace the slider with a one-number typed input labelled 'cut level' (VectorInput dim 1, or the numIn pattern from Ch18) plus a Set button. Each applied value costs one move and repaints the red stars, the diamond and the wrong count only on apply. Raise par from 4 to 5 or 6 so a couple of test values are free. On the other difficulties, keep the slider but pass format: (v) => v.toFixed(1).

<details><summary>Dropped by the checker</summary>

- c27-9: This is a puzzle-design preference, not a clarity defect. The epilogue p1 is framed as checking Ilse's stated numbers ('Navigator, check my numbers before I lock them'). The inShort card just before it already names the identity, and hints[2] gives it too. Hiding the numbers on Commander would turn a check into guessing a trivial answer, and it conflicts with c27-4's goal, which keeps the numbers. Its proposed Commander-only predict would also need the runner to support a predict per difficulty (def.predict is static), so the fix is not small. The one valid part, that the in-every-grid point never reaches the player, is covered by c27-4 (P and PAP⁻¹ on screen) and c27-5 (the explanation on the card).

</details>
