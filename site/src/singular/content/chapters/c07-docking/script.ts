// Chapter 7: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Approach plotted to the ark\'s bow. Debris streams cross it.' },
    { who: 'lantern', text: 'Each piece moves in a straight line at a steady speed.' },
    { who: 'wren', text: 'Straight lines I can fly around. I need to know where they\'ll be, and when.' },
    { who: 'bram', text: 'And where our own line meets that hangar door. Hit the frame and we stay out here.' },
    { who: 'lantern', text: 'The hangar door is the triangle from the hull survey: corners (1, 0, 0), (0, 2, 0) and (0, 0, 3).', say: 'The hangar door is the triangle from the hull survey. Corners one, zero, zero. Zero, two, zero. And zero, zero, three.' },
    { who: 'wren', text: 'Then let\'s find our way in.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Our path: one across and one up, every minute. A debris piece starts four across and drifts one back, one up, every minute.' },
    { who: 'wren', text: 'Our paths cross. Do we?' },
  ],
  p1Win: [{ who: 'wren', text: 'Same crossing, different minute. We never share it.' }],
  p2Intro: [
    { who: 'lantern', text: 'Next stream. Our path runs along one, zero, zero. The debris runs along zero, one, zero, through zero, one, two.' },
    { who: 'bram', text: 'They\'re not parallel. Show me where they meet.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'No meeting point. The closest the two paths come is 2, straight up.' },
    { who: 'bram', text: 'Not parallel, and they still miss. I\'ll remember that.' },
  ],
  p3Intro: [{ who: 'bram', text: 'Before we fly at that door, I want it written down. One equation that every point of it obeys.' }],
  p3Win: [{ who: 'lantern', text: 'Hangar door plane: 6x + 3y + 2z = 6. Every point of the door obeys it.', say: 'Hangar door plane: six x plus three y plus two z equals six. Every point of the door obeys it.' }],
  p4Intro: [{ who: 'wren', text: 'I want the middle of that door. From where we sit, straight in.' }],
  p4Win: [{ who: 'lantern', text: 'Path along (1, 2, 3). It meets the door at t = 1/3: the centre.', say: 'Path along one, two, three. It meets the door at t equals one third. The centre.' }],
  p5Intro: [{ who: 'lantern', text: 'Holding point (3, 3, 3). Two clearances needed: to the door\'s plane, and to the approach path.', say: 'Holding point three, three, three. Two clearances needed: to the door\'s plane, and to the approach path.' }],
  p5Win: [{ who: 'wren', text: 'Almost four to the door, almost two to the path. Room to breathe.' }],
  p6Intro: [{ who: 'bram', text: 'The door\'s plate meets the hull plate along a weld seam. I want that seam, and the angle between the plates.' }],
  p6Win: [{ who: 'bram', text: 'Seventy-two degrees. The seam is the one line in both plates.' }],
  p7Win: [{ who: 'lantern', text: 'n · d = 0. The path runs alongside the door\'s plane: no single hit.', say: 'n dot d is zero. The path runs alongside the door\'s plane. No single hit.' }],
  briefing: [{ who: 'bram', text: 'Before anyone flies us through that door, brief me.' }],
  install: [{ who: 'lantern', text: 'Door picking installed. Point at the door, and I find where your line of sight meets its plane.' }],
  installMine: [{ who: 'lantern', text: 'Running on your ray_plane.', say: 'Running on your ray plane.' }],
  installBackup: [{ who: 'lantern', text: 'Running on my backup routines.' }],
  installHit: [{ who: 'lantern', text: 'Docking marker set on the hangar door.' }],
  installMiss: [{ who: 'lantern', text: 'That line of sight meets the door\'s plane outside the door. Marker set at the centre instead.' }],
  spIntro: [
    { who: 'lantern', text: 'Docking sequence. Four steps: roll, lay the path, check the debris, burn.' },
    { who: 'wren', text: 'All yours, Nav. Bring us in.' },
  ],
  spWin: [
    { who: 'wren', text: 'Contact. We\'re in.' },
    { who: 'lantern', text: 'Docked. Hangar door sealed behind us.' },
  ],
  review: [{ who: 'bram', text: 'Before we go any further in, four claims. Some of them are wrong.' }],
  close: [
    { who: 'lantern', text: 'The ark is dark. No power in any section.' },
    { who: 'lantern', text: 'One log on the hangar terminal. Dr Ilse Varga.' },
    { who: 'ilselog', text: 'Power is down in all three sections. Start with the power equations.' },
    { who: 'lantern', text: 'Recorded two years, eleven months ago.' },
    { who: 'wren', text: 'Then that\'s where we start.' },
  ],
};
