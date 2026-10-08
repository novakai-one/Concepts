// Chapter 13: every voiced line. Plain data. (Numbers here are checked against truth.ts and logic.ts
// in tests/singular/game-c13.test.ts.)
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Bow frame survey complete. Every frame in the bow is out of square.' },
    { who: 'bram', text: 'One pulse did this. The frames move with the space they sit in, and the last pulse leaned every one of them.' },
    { who: 'wren', text: 'Can anything push them back now?' },
    { who: 'bram', text: 'The bow has frame jacks. Give them one move and they push every joint along it. We need the move that undoes the damage.' },
    { who: 'lantern', text: 'Practice frame on the bench. Same plan as the bow. It took one quarter turn.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Every joint is back where it was built. The undo was a quarter turn the other way.' },
    { who: 'wren', text: 'Turn it back. That one I could have guessed.' },
  ],
  p2Intro: [
    { who: 'lantern', text: 'Second practice frame. Its move sent (1, 0) to (2, 1) and (0, 1) to (1, 1).', say: 'Second practice frame. Its move sent one, zero to two, one, and zero, one to one, one.' },
    { who: 'bram', text: 'No turn you can name by eye. Find the undo another way.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'The move sends (1, −1) to (1, 0) and (−1, 2) to (0, 1). Those two points are the columns of the undo.', say: 'The move sends one, minus one to one, zero, and minus one, two to zero, one. Those two points are the columns of the undo.' },
    { who: 'bram', text: 'So you find where each grid arrow came from, and send it back there.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'The bow frames. The damage is the routine pulse on the ground layer: (1, 0) to (1, 1), (0, 1) to (−2, −1).', say: 'The bow frames. The damage is the routine pulse on the ground layer: one, zero to one, one, and zero, one to minus two, minus one.' },
    { who: 'wren', text: 'The pulse we have watched all week.' },
    { who: 'bram', text: 'Then undo it. The jacks are standing by.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Bow frames square. The undo has columns (−1, −1) and (2, 1).', say: 'Bow frames square. The undo has columns minus one, minus one, and two, one.' },
  ],
  three: [
    { who: 'lantern', text: 'That is also three more routine pulses. Replaying them on the old damage.' },
    { who: 'lantern', text: 'One. Two. Three. The ground layer is back where it was built.' },
    { who: 'bram', text: 'So if we had waited three pulses, the bow would have squared itself.' },
    { who: 'lantern', text: 'The ground layer, yes. Heights shrink with every pulse. They do not come back.' },
  ],
  p4Intro: [
    { who: 'bram', text: 'The corner joints moved in three dimensions. I want a method LANTERN can run on any of them, not a good guess.' },
    { who: 'lantern', text: 'Corner joint: (1, 0, 0) went to (1, 0, 1), (0, 1, 0) to (1, 1, 0), (0, 0, 1) to (0, 1, 1).', say: 'Corner joint: one, zero, zero went to one, zero, one. Zero, one, zero went to one, one, zero. Zero, zero, one went to zero, one, one.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Left half: the identity. Right half: the undo. Checked: the joint\'s move times the undo is the identity.' },
    { who: 'bram', text: 'The same moves, done to both halves. That I can follow.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'One bow frame took two moves: a quarter turn, then a shear.' },
    { who: 'wren', text: 'Then undo both.' },
    { who: 'bram', text: 'In which order?' },
  ],
  p5Win: [
    { who: 'lantern', text: 'The shear went on last, so it comes off first. Then the turn.' },
    { who: 'bram', text: 'Last on, first off.' },
  ],
  p6Intro: [
    { who: 'lantern', text: 'Last frame. Its move sent (1, 0) to (1, 2) and (0, 1) to (2, 4).', say: 'Last frame. Its move sent one, zero to one, two, and zero, one to two, four.' },
    { who: 'bram', text: 'Both grid arrows on one line.' },
    { who: 'wren', text: 'Undo it anyway.' },
  ],
  p6Win: [
    { who: 'lantern', text: '(2, 0) and (0, 1) both landed on (2, 4). One move cannot send one spot back to two places.', say: 'Two, zero and zero, one both landed on two, four. One move cannot send one spot back to two places.' },
    { who: 'bram', text: 'Then nothing undoes it. That frame we rebuild by hand.' },
  ],
  p7Intro: [
    { who: 'bram', text: 'Optional, Nav. LANTERN keeps the multipliers from every elimination. Show me why that is worth the memory.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'Stored: L holds the multipliers, U is the row echelon form, and L times U is A again. This is the LU factorisation.' },
    { who: 'lantern', text: 'With L and U stored, each new right-hand side takes two quick substitutions: down through L, then back up through U. No new elimination.' },
    { who: 'bram', text: 'Eliminate once, reuse it every time. Worth the memory.' },
  ],
  brief: [
    { who: 'bram', text: 'Before the jacks touch another frame, you brief me. Holotable.' },
  ],
  install: [
    { who: 'lantern', text: 'Undo planner online. Computing the undo for the bow frames.' },
  ],
  installMine: [
    { who: 'lantern', text: 'Planned with your inverse. Jacks engaged.' },
  ],
  installCrew: [
    { who: 'lantern', text: 'Planned with my backup inverse. Yours can replace it when it passes its tests. Jacks engaged.' },
  ],
  close: [
    { who: 'lantern', text: 'Bow frames square. Every joint is within a millimetre of where it was built.' },
    { who: 'wren', text: 'One section fixed.' },
    { who: 'lantern', text: 'Hull volume after the last routine pulse: times 0.8. One fifth of the hull\'s volume, gone in one pulse.', say: 'Hull volume after the last routine pulse: times zero point eight. One fifth of the hull\'s volume, gone in one pulse.' },
    { who: 'bram', text: 'The frames are square, and the ark is still getting smaller.' },
    { who: 'wren', text: 'Then that is the next question.' },
  ],
};
