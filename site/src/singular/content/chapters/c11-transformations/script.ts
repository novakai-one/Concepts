// Chapter 11: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Holding station under the Anchor. The spire tips are readable from here.' },
    { who: 'wren', text: 'The ark drifts through here every few hours. I want to know where a pulse puts it before it does.' },
    { who: 'bram', text: 'Then we learn to read a pulse. Not every buoy. Start with two.' },
    { who: 'lantern', text: 'Routine pulse due. Tagging two buoys: one step along each grid arrow.' },
  ],
  afterPulse: [
    { who: 'lantern', text: 'Pulse complete. The first tagged buoy is at (1, 1). The second is at (−2, −1).', say: 'Pulse complete. The first tagged buoy is at one, one. The second is at minus two, minus one.' },
    { who: 'wren', text: 'Two buoys out of four thousand. Is that enough?' },
    { who: 'bram', text: 'Find out. Nav, the buoy that sat at (3, 2). Call where it went.', say: 'Find out. Nav, the buoy that sat at three, two. Call where it went.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Confirmed. The buoy from (3, 2) is at (−1, 1). Three of the first landing step, two of the second.', say: 'Confirmed. The buoy from three, two is at minus one, one. Three of the first landing step, two of the second.' },
    { who: 'wren', text: 'Two buoys, and you called a third. Keep going.' },
  ],
  build: [
    { who: 'bram', text: 'If two landing spots fix every buoy, we can write a pulse down ourselves. Build me one.' },
    { who: 'lantern', text: 'Test pattern on the bench. Send (1, 1) to (3, 3). Keep (1, −1) where it is.', say: 'Test pattern on the bench. Send one, one to three, three. Keep one, minus one where it is.' },
  ],
  p2Win: [
    { who: 'lantern', text: '(1, 1) lands on (3, 3). (1, −1) stays where it was. Columns (2, 1) and (1, 2).', say: 'One, one lands on three, three. One, minus one stays where it was. Columns two, one and one, two.' },
    { who: 'bram', text: 'Four numbers, and that is the whole move. Keep that one. I have a feeling we will see it again.' },
  ],
  why: [
    { who: 'bram', text: 'I do not bolt things on because they worked twice. Show me why two arrows are enough.' },
    { who: 'bram', text: 'And show me a move the bench cannot make. I want to know where it stops.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Recorded. The bench cannot move the origin and cannot bend a grid line. Every move it makes keeps both.' },
    { who: 'bram', text: 'Good. Then I know what I am trusting.' },
  ],
  caseLinear: [
    { who: 'lantern', text: 'Case board. Why did everything move except the point under the Anchor?' },
    { who: 'lantern', text: 'Answer. Each pulse is a linear transformation. The origin is no steps along either grid arrow, so it lands on the origin.' },
    { who: 'bram', text: 'So the light under the Anchor sits at the one point no pulse can touch.' },
    { who: 'wren', text: 'Then whoever lit it knew that.' },
  ],
  spires: [
    { who: 'lantern', text: 'Spire tips read. First tip (0, 1, 0). Second tip (−1, 0, 0). Third tip (0, 0, 0.8).', say: 'Spire tips read. First tip zero, one, zero. Second tip minus one, zero, zero. Third tip zero, zero, zero point eight.' },
    { who: 'lantern', text: 'The third spire is bent. In the distress call its tip was at height 1.', say: 'The third spire is bent. In the distress call its tip was at height one.' },
    { who: 'bram', text: 'Ilse set those spires. If the tips are where the grid arrows land, the pulse is written right there on the Anchor.' },
    { who: 'wren', text: 'Then read it. Where does the bow end up after the next pulse?' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Spire forecast for the bow: (0, 1, 0). Measured: (1, 1, 0). The forecast misses by one step.', say: 'Spire forecast for the bow: zero, one, zero. Measured: one, one, zero. The forecast misses by one step.' },
    { who: 'lantern', text: 'Volume forecast from the spires: times 0.8. Measured: times 0.8. That one matches.', say: 'Volume forecast from the spires: times zero point eight. Measured: times zero point eight. That one matches.' },
    { who: 'bram', text: 'Right volume, wrong place. Something about those spires is off.' },
  ],
  clue: [
    { who: 'wren', text: 'Pin it. We are not done with that.' },
    { who: 'lantern', text: 'Question added to the case board: why did the prediction from the spires miss when the volume prediction matched?' },
    { who: 'lantern', text: 'Replaying the last four routine pulses on the lattice.' },
  ],
  fourth: [
    { who: 'lantern', text: 'Every fourth pulse the ground layer returns to where it started. Heights do not.' },
    { who: 'wren', text: 'Four pulses and the floor comes home. Remember that.' },
    { who: 'lantern', text: 'Question added: why does every fourth pulse bring the ground layer home?' },
  ],
  sensor: [
    { who: 'lantern', text: 'The hull sensor takes a position with three numbers and reports two. Its rule is two rows of three numbers.' },
    { who: 'bram', text: 'Work it both ways, Nav. Down the columns, then across the rows. I want the same answer twice.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Both ways agree: (7, −1). The beacon at (1, 1, 1) lands on (2, 2, 1), the three columns added.', say: 'Both ways agree: seven, minus one. The beacon at one, one, one lands on two, two, one, the three columns added.' },
  ],
  nine: [
    { who: 'wren', text: 'Nav. Ilse\'s nine numbers. Which way round did she mean them?' },
    { who: 'lantern', text: 'Distress call, replayed. First spire: 0, 1, 0. Second: −1, 0, 0. Third: 0, 0, 1.', say: 'Distress call, replayed. First spire: zero, one, zero. Second: minus one, zero, zero. Third: zero, zero, one.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Read as columns, the nine numbers turn the grid the same way round as the pulse. Read as rows, the other way.' },
    { who: 'lantern', text: 'The same way round is not the same pulse. The measured pulse also leans the grid.' },
    { who: 'bram', text: 'She wrote down the turn she wanted. The Anchor did something close to it. Close is not the same.' },
  ],
  kinds: [
    { who: 'bram', text: 'Optional, Nav. LANTERN keeps a list of standard moves. Build three of them from their descriptions.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'Turn, flip and flatten. Each one built from two columns.' },
  ],
  brief: [
    { who: 'bram', text: 'Before LANTERN forecasts anything with this, you brief me. Holotable.' },
  ],
  install: [
    { who: 'lantern', text: 'Pulse forecast online. Computing a landing spot for every buoy in view.' },
  ],
  installMine: [
    { who: 'lantern', text: 'Forecast from your matvec: 2,025 buoys in one call. Ghosts placed.', say: 'Forecast from your mat-vec: two thousand and twenty-five buoys in one call. Ghosts placed.' },
  ],
  installCrew: [
    { who: 'lantern', text: 'Forecast from my backup matvec: 2,025 buoys. Yours replaces it once it passes its tests.', say: 'Forecast from my backup mat-vec: two thousand and twenty-five buoys. Yours replaces it once it passes its tests.' },
  ],
  installMismatch: [
    { who: 'lantern', text: 'Your matvec disagreed with my backup on some buoys. Forecast from the backup for this pulse.', say: 'Your mat-vec disagreed with my backup on some buoys. Forecast from the backup for this pulse.' },
  ],
  landed: [
    { who: 'lantern', text: 'Pulse complete. Every buoy landed on its ghost.' },
    { who: 'wren', text: 'So now we see the ark\'s next stop before it gets there.' },
    { who: 'bram', text: 'One pulse ahead, yes. But the ark does not sit still after a pulse. Its stabiliser turns it.' },
    { who: 'lantern', text: 'Confirmed. Each routine pulse is followed by the ark\'s stabiliser turn. Two moves in a row.' },
    { who: 'wren', text: 'Then that is the next question. What do two moves in a row do?' },
  ],
};
