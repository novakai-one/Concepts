// Chapter 5: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Beacon lock holding. The ark is tumbling about a tilted axis. One turn every four minutes.' },
    { who: 'wren', text: 'I can\'t dock with a ship that turns under me. We have to turn with her, about the same axis.' },
    { who: 'lantern', text: 'Hull render incomplete. Half the hull triangles list their corners in the wrong order. They render dark.' },
    { who: 'bram', text: 'So we are flying blind at a spinning ship. Lovely.' },
    { who: 'wren', text: 'Nav. Find me the axis. Then fix the lights.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Test panel on the holotable. Two edges: two, zero, zero and one, three, zero. Raise an arrow straight out of it.' },
  ],
  p1Win: [{ who: 'lantern', text: 'Both readings zero. Length six: the area of the panel.' }],
  p2Intro: [
    { who: 'wren', text: 'There are two ways to spin about that line. One of them throws us away from her.' },
  ],
  p2Win: [
    { who: 'wren', text: 'Heading on target. Same spin as the ark.' },
    { who: 'lantern', text: 'Curl the fingers of a right hand from the heading to the target. The thumb points along the axis.' },
  ],
  p3Intro: [
    { who: 'bram', text: 'Three numbers came out of that panel. I want to know where they come from before I bolt anything to them.' },
  ],
  p3Win: [{ who: 'lantern', text: 'Six, minus three, one. At a right angle to both edges. Squared length forty-six.' }],
  p4Intro: [
    { who: 'lantern', text: 'The ark\'s hangar door is a triangle with corners P, Q and R. The repair crew needs its normal vector and its area.' },
  ],
  p4Win: [{ who: 'bram', text: 'Normal six, three, two. Three and a half square steps of door. That goes on the patch order.' }],
  p5Intro: [
    { who: 'lantern', text: 'Holotable model of her hull: eighteen thousand triangles. Nine thousand list their corners in the wrong order.' },
    { who: 'wren', text: 'So half of her renders dark. Fix the rule, Nav.' },
  ],
  p5Win: [{ who: 'lantern', text: 'Every triangle faces out. Hull model complete.' }],
  p6Intro: [
    { who: 'bram', text: 'Two struts on the stern frame have bent into line. Watch the panel between them.' },
  ],
  p6Win: [{ who: 'bram', text: 'No area, no arrow. Nothing sticks out of a panel that is not there.' }],
  p7Win: [{ who: 'lantern', text: 'Left at every waypoint. The route goes round without folding back.' }],
  briefing: [
    { who: 'bram', text: 'Before your normals light that ark, brief me.' },
  ],
  install: [
    { who: 'lantern', text: 'Hull lighting installed. Every hull triangle gets its normal from its corners, then faces out.' },
  ],
  installMine: [{ who: 'lantern', text: 'Lit by your normal. It agrees with mine on every triangle I checked.' }],
  installBackup: [{ who: 'lantern', text: 'Running on my backup routines.' }],
  lit: [
    { who: 'wren', text: 'There she is. Every frame of her.' },
    { who: 'lantern', text: 'Matching the ark\'s tumble. Approach possible.' },
    { who: 'bram', text: 'Look at the stern frames. Some of those boxes look thin.' },
    { who: 'wren', text: 'Then let\'s go and look.' },
  ],
};
