// Chapter 9: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  cold: [
    { who: 'lantern', text: 'Power board, deck seven. Three generators, three meters. All dark.' },
    { who: 'bram', text: 'Each meter reads a mix of all three generators. That is why nobody aboard could read it.' },
    { who: 'lantern', text: 'Meter one reads 8: generator one, plus twice generator two, plus generator three.', say: 'Meter one reads eight: generator one, plus twice generator two, plus generator three.' },
    { who: 'lantern', text: 'Meter two reads 24: twice the first, five times the second, four times the third. Meter three reads 19: the first, three times the second, four times the third.', say: 'Meter two reads twenty-four: twice the first, five times the second, four times the third. Meter three reads nineteen: the first, three times the second, four times the third.' },
    { who: 'wren', text: 'Three tangled equations. Can we untangle them without breaking the answer?' },
    { who: 'bram', text: 'We can change the equations as much as we like. We cannot change where their planes meet.' },
  ],
  board: [
    { who: 'lantern', text: 'Meters loaded onto the board. One row per meter: its three numbers, a bar, then the reading.' },
    { who: 'bram', text: 'Drag a whole row onto another to subtract a multiple of it. Keep an eye on the yellow light.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Staircase made in three steps. The yellow light did not move.' },
    { who: 'bram', text: 'The planes turned. The point stayed put. That is the whole trick.' },
  ],
  climb: [
    { who: 'bram', text: 'Now read it. Bottom row first.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Generators one, two and three: 1, 2 and 3 units. Each meter matches its reading.', say: 'Generators one, two and three: one, two and three units. Each meter matches its reading.' },
    { who: 'wren', text: 'Bottom up, one unknown at a time. I can fly that.' },
  ],
  zero: [
    { who: 'lantern', text: 'Second board: the deck six relays. Its first row starts with 0.', say: 'Second board: the deck six relays. Its first row starts with zero.' },
    { who: 'bram', text: 'You cannot clear a column with a zero. Do something about it.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Relays at (1, 2, 1). On all three planes.', say: 'Relays at one, two, one. On all three planes.' },
    { who: 'bram', text: 'Swap first. Same answer, easier numbers.' },
  ],
  sandbox: [
    { who: 'bram', text: 'I want to see what breaks it. LANTERN, give Nav a copy of a board we can wreck.' },
    { who: 'lantern', text: 'Sandbox copy loaded. Two lines, meeting at (1, 2). Nothing here touches the ship.', say: 'Sandbox copy loaded. Two lines, meeting at one, two. Nothing here touches the ship.' },
  ],
  p4Win: [
    { who: 'bram', text: 'Three ways to wreck it, one way to keep it. Now I know which moves I trust.' },
  ],
  gain: [
    { who: 'lantern', text: 'A relay with an adjustable gain, k. Its second equation changes with k.' },
    { who: 'wren', text: 'So for some settings it works, and for some it does not?' },
    { who: 'bram', text: 'Find out which. All three cases.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'k not 4: one point. k equal to 4 and right side 6: the same line twice. k equal to 4 and any other right side: parallel lines, no point.', say: 'k not four: one point. k equal to four and right side six: the same line twice. k equal to four and any other right side: parallel lines, no point.' },
  ],
  hand: [
    { who: 'bram', text: 'Same power board as before. LANTERN, arithmetic off. Nav does the numbers.' },
    { who: 'lantern', text: 'Arithmetic off. I will only check what you type.' },
  ],
  p6Win: [
    { who: 'bram', text: 'By hand, and the light never moved. I trust it now.' },
  ],
  p6Whole: [
    { who: 'bram', text: 'And not one fraction on the board. Tidy.' },
  ],
  brief: [
    { who: 'bram', text: 'Holotable. Before this goes in the manual, I want to hear why it works.' },
  ],
  proc: [
    { who: 'lantern', text: 'Write me a procedure, Nav. I will run exactly what you write, on the deck six relays. Their first row starts with 0.', say: 'Write me a procedure, Nav. I will run exactly what you write, on the deck six relays. Their first row starts with zero.' },
  ],
  closeYours: [
    { who: 'lantern', text: 'Routing power with your row_echelon and back_sub.', say: 'Routing power with your row echelon and back sub functions.' },
  ],
  closeBackup: [
    { who: 'lantern', text: 'Routing power with my backup routines.' },
  ],
  close: [
    { who: 'lantern', text: 'Generators one, two and three: 1, 2 and 3 units. Power on deck seven.', say: 'Generators one, two and three: one, two and three units. Power on deck seven.' },
    { who: 'wren', text: 'And the pod bay?' },
    { who: 'lantern', text: 'The conduits to the pod bay branch. Their meters do not pin the flows down to one answer.' },
    { who: 'lantern', text: 'One more log in the board\'s memory. Recorded one year, ten months ago.' },
    { who: 'ilselog', text: 'The stern struts are failing faster than I can brace them. I cannot do this alone. I need help.' },
    { who: 'bram', text: 'Alone, with twelve thousand people asleep around her.' },
    { who: 'wren', text: 'Pod bay, Nav. Let us get the power through.' },
  ],
};
