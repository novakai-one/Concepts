// Chapter 12: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Routine pulse. Then the ark’s stabiliser fires: a quarter turn of the hull about the point under the Anchor.' },
    { who: 'wren', text: 'Two moves, every time. I want one forecast, not two.' },
    { who: 'bram', text: 'And I want to know if the order matters. If the stabiliser fired first, would the ark end up somewhere else?' },
    { who: 'lantern', text: 'Unknown. I have one matrix for each move. I have no rule for two in a row.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'One matrix, columns (0, 1) and (−1, 1). It does the shear and then the turn in one step.', say: 'One matrix, columns zero, one and minus one, one. It does the shear and then the turn in one step.' },
    { who: 'wren', text: 'One forecast. That is what I wanted.' },
  ],
  order: [
    { who: 'bram', text: 'Now swap them. Turn first, then shear. Same two moves.' },
    { who: 'wren', text: 'Same two moves should mean the same place. Right?' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Different landing spots. The order of the two moves matters.' },
    { who: 'lantern', text: 'Two flips over the same line put every point back where it started.' },
    { who: 'bram', text: 'So some moves cancel each other out. I will remember that.' },
  ],
  sensor: [
    { who: 'lantern', text: 'The bow sensor now feeds a second sensor. Two rules in a row: two rows of three, after three rows of two.' },
    { who: 'bram', text: 'Work out the single rule by hand, Nav. Every entry.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Single rule found: columns (5, 2) and (2, 13). Each column is A, the second sensor’s rule, applied to a column of B, the bow sensor’s.', say: 'Single rule found: columns five, two and two, thirteen. Each column is A, the second sensor’s rule, applied to a column of B, the bow sensor’s.' },
  ],
  across: [
    { who: 'bram', text: 'LANTERN checks every reading with dot products. Sometimes a move sits inside one.' },
    { who: 'bram', text: 'Can we shift the move onto the other arrow and keep the same number? I want a matrix that does it.' },
  ],
  p4Win: [
    { who: 'bram', text: 'Rows turned into columns, and the move crosses over. Two hundred pairs, not one miss.' },
    { who: 'lantern', text: 'And for two moves in a row, the crossed-over matrices come in the other order.' },
  ],
  zero: [
    { who: 'wren', text: 'Bram. Can two moves in a row crush everything into the middle, when neither does it alone?' },
    { who: 'bram', text: 'Find me two, Nav.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Every point is at the origin. Neither move alone sends everything there.' },
    { who: 'wren', text: 'Zero out of two moves that are not zero. Noted.' },
  ],
  layers: [
    { who: 'lantern', text: 'Forecast chain: a stretch, then the pulse’s lean, then the stabiliser turn. Three moves. I want one matrix.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Three moves, one matrix. And no single matrix lifts the ring off the blob. The middle stays put and lines stay straight.' },
    { who: 'bram', text: 'So anything that sorts those two would have to bend space. Keep that in mind.' },
  ],
  group: [
    { who: 'bram', text: 'Optional, Nav. Three moves on the rail. Does it matter which two you fuse first?' },
  ],
  p7Win: [
    { who: 'lantern', text: 'Same grid both ways. Fuse the left pair or the right pair first: one matrix.' },
  ],
  brief: [
    { who: 'bram', text: 'Brief me, Nav. Then LANTERN gets one matrix per forecast.' },
  ],
  install: [
    { who: 'lantern', text: 'Fused forecast online for the hull. Pulse, then stabiliser, as one matrix.' },
  ],
  installMine: [
    { who: 'lantern', text: 'Fused with your matmul. Ghosts placed.' },
  ],
  installCrew: [
    { who: 'lantern', text: 'Fused with my backup matmul. Ghosts placed. Yours can replace it when it passes its tests.' },
  ],
  installMismatch: [
    { who: 'lantern', text: 'Your matmul disagreed with my backup. Using the backup for this forecast.' },
  ],
  landed: [
    { who: 'lantern', text: 'Pulse, then stabiliser. Every hull point landed on the fused forecast.' },
    { who: 'bram', text: 'Good. Now the bad news. Three years of pulses have left the bow frames leaning.' },
    { who: 'wren', text: 'Then we straighten them. Can a move be undone?' },
    { who: 'bram', text: 'That is the next question.' },
  ],
};
