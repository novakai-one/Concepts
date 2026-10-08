// Chapter 15: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Stern section. Flat, to two decimal places. Mid-section bulkhead holding.' },
    { who: 'lantern', text: 'Lattice re-seeded around the stern. Two thousand test buoys, in a ball around the point that never moves.' },
    { who: 'lantern', text: 'Firing them through the two-decimal model of the Collapse pulse.' },
    { who: 'lantern', text: 'Every buoy landed on one plane. None landed off it.' },
    { who: 'bram', text: 'Same as the stern. Whatever went in came out flat.' },
    { who: 'lantern', text: 'A pile of debris sits at the point that never moves.' },
    { who: 'wren', text: 'And Teo’s channel?' },
    { who: 'lantern', text: 'Open. Static. No words.' },
    { who: 'wren', text: 'Then it stays open.' },
  ],
  p1Intro: [
    { who: 'bram', text: 'Before anyone touches that stern, I want the shape of what is left. Nav, find the plane those buoys are sitting on.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Every landed buoy is on the plane $z = x + y$. Two thousand of two thousand.', say: 'Every landed buoy is on the plane z equals x plus y. Two thousand of two thousand.' },
    { who: 'wren', text: 'That’s our thruster plane. From the first day.' },
    { who: 'lantern', text: 'Columns one and two of the two-decimal model are the two thruster directions, (1, 0, 1) and (0, 1, 1). Column three is their sum.', say: 'Columns one and two of the two-decimal model are the two thruster directions: one, zero, one, and zero, one, one. Column three is their sum.' },
  ],
  p2Intro: [
    { who: 'lantern', text: 'Four marker beacons from the stern hull are pinging. Anything the pulse moved now sits on the landing plane.' },
    { who: 'wren', text: 'So a ping off that plane is an echo. Nav, land a test buoy on every real one.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Three beacons are landings. The ping at (1, 1, 1) is an echo: it sits 1 below the plane, and no start lands there.', say: 'Three beacons are landings. The ping at one, one, one is an echo. It sits one below the plane, and no start lands there.' },
    { who: 'bram', text: 'Good. We stop chasing ghosts.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'The debris pile at the origin: forty-one pieces. Before the pulse they were spread along one straight line.' },
    { who: 'bram', text: 'A whole line of wreckage, all in one spot. Nav, show me which starts end up there.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Every start on the line through (1, 1, −1) lands on the origin. The row board reads the same line: $x = -z$, $y = -z$.', say: 'Every start on the line through one, one, minus one lands on the origin. The row board reads the same line: x equals minus z, y equals minus z.' },
  ],
  nulLine: [
    { who: 'lantern', text: 'The two-decimal model has a null space: the line through (1, 1, −1). Every piece that started on it landed on the origin.', say: 'The two-decimal model has a null space: the line through one, one, minus one. Every piece that started on it landed on the origin.' },
  ],
  p4Intro: [
    { who: 'lantern', text: 'Two pieces of hull plating. One started at (2, 0, 1), the other at (3, 1, 0). They are now touching.', say: 'Two pieces of hull plating. One started at two, zero, one. The other at three, one, zero. They are now touching.' },
    { who: 'wren', text: 'Two different places, one landing. Show me how.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Both landed on (3, 1, 4). Their starts differ by (1, 1, −1), an arrow on the violet line.', say: 'Both landed on three, one, four. Their starts differ by one, one, minus one: an arrow on the violet line.' },
    { who: 'lantern', text: 'Every start on the line through (1, 2, 0) along (1, 1, −1) lands on (1, 2, 3).', say: 'Every start on the line through one, two, zero, along one, one, minus one, lands on one, two, three.' },
  ],
  p5Intro: [
    { who: 'bram', text: 'A plane of landings. A violet line. Both run through the point that never moves.' },
    { who: 'bram', text: 'Before I trust a shape like that, I want to know what makes one. Here are five candidates. Break the fakes.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Three impostors broken. Each row of the two-decimal model reads 0 against (1, 1, −1): the violet line is at right angles to every row.', say: 'Three impostors broken. Each row of the two-decimal model reads zero against one, one, minus one. The violet line is at right angles to every row.' },
  ],
  p6Intro: [
    { who: 'bram', text: 'The salvage arm has the stern hatch handle. Its elbow is jammed against a coolant pipe.' },
    { who: 'bram', text: 'Three telescoping motors. Move any one and the gripper slips. Nav, find a command that moves the arm and not the hand.' },
  ],
  p6Win: [
    { who: 'bram', text: 'Elbow’s clear and the hand never moved. That is a tidy command.' },
  ],
  p7Intro: [
    { who: 'bram', text: 'The spare arm took a hit in the Collapse. All three of its motors push along one line now.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'The spare arm reaches one line. Two different motor commands keep its gripper still.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable, Nav. Brief me before I let anyone near that stern.' },
  ],
  teoAsk: [
    { who: 'wren', text: 'LANTERN. Can we send into the stern channel?' },
    { who: 'lantern', text: 'The channel is open. One short message fits. Nothing has come back on it.' },
    { who: 'lantern', text: 'The buffer still holds his last message, recorded one minute before the Collapse. His node was (2, 1, 1). Three struts run from it.', say: 'The buffer still holds his last message, recorded one minute before the Collapse. His node was two, one, one. Three struts run from it.' },
    { who: 'wren', text: 'Then we answer it. Write it so he can follow it word for word.' },
  ],
  teoSent: [
    { who: 'lantern', text: 'Message sent into the stern channel. Repeating every ninety seconds. No reply.' },
    { who: 'wren', text: 'Keep it repeating.' },
  ],
  close: [
    { who: 'lantern', text: 'Debris sorter running. Forty-one pieces at the origin. All forty-one started on the line through (1, 1, −1).', say: 'Debris sorter running. Forty-one pieces at the origin. All forty-one started on the line through one, one, minus one.' },
  ],
  closeMine: [{ who: 'lantern', text: 'The sorter is running on your null space routine.' }],
  closeBackup: [{ who: 'lantern', text: 'The sorter is running on my backup routine.' }],
  vell: [
    { who: 'lantern', text: 'Contact. A Survey Authority cutter, closing from the Anchor side.' },
    { who: 'vell', text: 'This is Director Marcus Vell, Survey Authority. *Lantern*, hold your position.' },
    { who: 'vell', text: 'I’m sorry about your brother. Anything flattened is gone. We’re here for the Anchor.' },
    { who: 'lantern', text: 'Stern channel: static.' },
  ],
};
