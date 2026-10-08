// Chapter 21: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Third thruster released to the drone crews. Two thrusters remain, along (1, 0, 1) and (0, 1, 1).', say: 'Third thruster released to the drone crews. Two thrusters remain, along one, zero, one and zero, one, one.' },
    { who: 'bram', text: 'The drones needed it more than we do. Two thrusters still reach a whole plane.' },
    { who: 'lantern', text: 'The plane $z = x + y$. The same plane they reached on the first day.', say: 'The plane z equals x plus y. The same plane they reached on the first day.' },
    { who: 'wren', text: 'And the stern hatch is one across and one up from us. The same arrow as the ark’s signal that day.' },
    { who: 'lantern', text: 'The hatch is off the plane. The tether is 1.2 long.', say: 'The hatch is off the plane. The tether is one point two long.' },
    { who: 'wren', text: 'So we still can’t reach it. How close can we get?' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Practice run on the holotable. A line through the arrow (1, 2), and a point at (3, 1). Find the point of the line nearest to it.', say: 'Practice run on the holotable. A line through the arrow one, two, and a point at three, one. Find the point of the line nearest to it.' },
  ],
  p1Win: [{ who: 'lantern', text: 'Nearest point (1, 2). The leftover arrow (2, −1) reads 0 against the line.', say: 'Nearest point one, two. The leftover arrow two, minus one reads zero against the line.' }],
  p2Intro: [
    { who: 'wren', text: 'Now the real thing. Park us on that plane, as near the hatch as it goes.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Parked. Tether paid out: 1.155. It reaches.', say: 'Parked. Tether paid out: one point one five five. It reaches.' },
    { who: 'wren', text: 'The point we couldn’t reach on day one. Now we know how close we can get.' },
  ],
  p3Intro: [
    { who: 'bram', text: 'There is a quicker way to find that point, LANTERN says. I want to see it before I believe it.' },
    { who: 'lantern', text: 'A beacon at (3, 1, 2). A plane spanned by (1, 1, 0) and (0, 0, 1). Those two arrows are at a right angle.', say: 'A beacon at three, one, two. A plane spanned by one, one, zero and zero, zero, one. Those two arrows are at a right angle.' },
  ],
  p3Win: [{ who: 'bram', text: 'Two shadows, added. And the leftover stands square to both. All right.' }],
  p4Intro: [
    { who: 'lantern', text: 'Second test. The floor, spanned by (1, 0, 0) and (1, 1, 0). A beacon at (2, 3, 4). Adding the two shadows.', say: 'Second test. The floor, spanned by one, zero, zero and one, one, zero. A beacon at two, three, four. Adding the two shadows.' },
    { who: 'lantern', text: 'The sum lands at (4.5, 2.5, 0). The leftover is not at a right angle to the floor.', say: 'The sum lands at four point five, two point five, zero. The leftover is not at a right angle to the floor.' },
    { who: 'bram', text: 'There it is. The quick way failed. Show me why.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'True closest point (2, 3, 0). Both shadows push along the first arrow, 2 and 2.5 more, so they overlap and do not add up to the nearest point. With arrows at a right angle the overlap is 0.', say: 'True closest point two, three, zero. Both shadows push along the first arrow, two and two point five more, so they overlap and do not add up to the nearest point. With arrows at a right angle the overlap is zero.' },
    { who: 'lantern', text: 'Taking the overlap off still misses: (2, 2.5, 0).', say: 'Taking the overlap off still misses: two, two point five, zero.' },
    { who: 'bram', text: 'So the quick way needs arrows at right angles. Good. Now I know when not to use it.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'The hard case. A plane spanned by (1, 1, 0) and (0, 1, 1): not at a right angle. A point at (1, 2, 3).', say: 'The hard case. A plane spanned by one, one, zero and zero, one, one: not at a right angle. A point at one, two, three.' },
    { who: 'bram', text: 'No shortcut, then. Every number by hand.' },
  ],
  p5Win: [{ who: 'lantern', text: 'Closest point (1/3, 8/3, 7/3). The leftover reads 0 against both arrows.', say: 'Closest point one third, eight thirds, seven thirds. The leftover reads zero against both arrows.' }],
  p6Intro: [
    { who: 'wren', text: 'Teo’s channel is still open. Still hissing.' },
    { who: 'lantern', text: 'Most of the hiss is the Anchor’s hum. It always points one way: (0.6, 0.8). The channel reading is (4, 3).', say: 'Most of the hiss is the Anchor’s hum. It always points one way: zero point six, zero point eight. The channel reading is four, three.' },
    { who: 'wren', text: 'Then take the hum out. I want to hear what’s under it.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Hum removed. Kept: (1.12, −0.84). The static dropped one step.', say: 'Hum removed. Kept: one point one two, minus zero point eight four. The static dropped one step.' },
    { who: 'wren', text: 'Still nothing. But quieter.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'One matrix for that move: it drops every point onto the line through (1, 2). Apply it, then apply it again.', say: 'One matrix for that move: it drops every point onto the line through one, two. Apply it, then apply it again.' },
  ],
  p7Win: [{ who: 'lantern', text: 'Second application: no buoy moved. Every arrow along (2, −1) went to the origin.', say: 'Second application: no buoy moved. Every arrow along two, minus one went to the origin.' }],
  p8Intro: [
    { who: 'lantern', text: 'Optional. Write one matrix that drops every point straight onto the plane of the hard case.' },
  ],
  p8Win: [{ who: 'lantern', text: 'Matrix checked. Applied twice, it equals itself. Flipped across its diagonal, it equals itself.' }],
  briefing: [
    { who: 'bram', text: 'Before that tether takes anyone’s weight, brief me. Holotable.' },
  ],
  close: [
    { who: 'lantern', text: 'Tether planner installed. Finding the closest point of our plane to the hatch.' },
  ],
  closeMine: [{ who: 'lantern', text: 'Running on your project routine.' }],
  closeBackup: [{ who: 'lantern', text: 'Running on my backup routine.' }],
  closeAfter: [
    { who: 'lantern', text: 'Tether attached to the stern hatch. 1.155 of 1.2 paid out.', say: 'Tether attached to the stern hatch. One point one five five of one point two paid out.' },
    { who: 'wren', text: 'We’re on the stern. Day one, it was out of reach.' },
    { who: 'bram', text: 'Out of reach. Never out of range.' },
    { who: 'lantern', text: 'One more report. My attitude frame has drifted since the Collapse. The holotable horizon leans 1.4 degrees.', say: 'One more report. My attitude frame has drifted since the Collapse. The holotable horizon leans one point four degrees.' },
    { who: 'bram', text: 'Then we square it up next. A tug that can’t tell up from sideways doesn’t set anything.' },
  ],
};
