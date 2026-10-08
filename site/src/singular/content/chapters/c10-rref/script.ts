// Chapter 10: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  cold: [
    { who: 'lantern', text: 'Pod bay conduits, deck five. Three junction meters, three pipes between the junctions.' },
    { who: 'wren', text: 'Three meters, three pipes. One answer, like last time?' },
    { who: 'bram', text: 'Look at the board before you promise anything.' },
    { who: 'lantern', text: 'Pipe one minus pipe two reads 2. Pipe two minus pipe three reads 1. Pipe one minus pipe three reads 3.', say: 'Pipe one minus pipe two reads two. Pipe two minus pipe three reads one. Pipe one minus pipe three reads three.' },
    { who: 'bram', text: 'The third meter is the first two added together. It tells us nothing new.' },
    { who: 'wren', text: 'So the power can go more than one way. Good or bad?' },
  ],
  finish: [
    { who: 'bram', text: 'First, the deck seven board. A staircase is good. We can make it better.' },
    { who: 'lantern', text: 'Board loaded: the staircase from the power board.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Each row now names one unknown. x is 1, y is 2, z is 3. No climbing needed.', say: 'Each row now names one unknown. x is one, y is two, z is three. No climbing needed.' },
    { who: 'bram', text: 'That is as clean as a board gets.' },
  ],
  line: [
    { who: 'lantern', text: 'Pod bay conduits loaded. Pipes $x_1$, $x_2$ and $x_3$.', say: 'Pod bay conduits loaded. Pipes x one, x two and x three.' },
    { who: 'wren', text: 'Reduce it, Nav. Then tell me how to route the power.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Every pipe carries between 0 and 5 units.', say: 'Every pipe carries between zero and five units.' },
    { who: 'wren', text: 'So any setting of the dial in that range works. I can route that.' },
  ],
  p2Least: [
    { who: 'bram', text: 'Zero on the dial gives the least total load: 4 units. If we have to pick one, pick that.', say: 'Zero on the dial gives the least total load: four units. If we have to pick one, pick that.' },
  ],
  liar: [
    { who: 'lantern', text: 'Meter three now reads 4.', say: 'Meter three now reads four.' },
    { who: 'bram', text: 'Then one of the meters is lying. The board will say so.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'With the meters agreeing, the bottom row reads 0 = 0 again. A whole line of routings.', say: 'With the meters agreeing, the bottom row reads zero equals zero again. A whole line of routings.' },
    { who: 'bram', text: 'Zero equals one was not an arithmetic slip. It was a meter that could not be right.' },
  ],
  plane: [
    { who: 'lantern', text: 'A junction with a single meter: $x + 2y - z = 4$.', say: 'A junction with a single meter: x plus two y minus z equals four.' },
    { who: 'wren', text: 'One rule, three unknowns. How much room is that?' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Two dials, one plane. All three marked points reached.' },
  ],
  km: [
    { who: 'lantern', text: 'The pod bay\'s last junction has two dials, k and m.' },
    { who: 'bram', text: 'Same question as the gain on deck six. Three cases.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'k not 5: one point. k equal to 5 and m equal to 3: a whole line. k equal to 5 and m not 3: nothing.', say: 'k not five: one point. k equal to five and m equal to three: a whole line. k equal to five and m not three: nothing.' },
  ],
  shift: [
    { who: 'bram', text: 'Try this. Set every meter on the pod bay conduits to 0, and solve again.', say: 'Try this. Set every meter on the pod bay conduits to zero, and solve again.' },
    { who: 'lantern', text: 'Meters at zero: the answers form a line through the origin.' },
    { who: 'wren', text: 'That looks like the same line, moved.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'One arrow moves the zero-meter line onto the real one. Any point of the real line works as that arrow.' },
    { who: 'bram', text: 'One answer, plus everything that answers zero.' },
  ],
  brief: [
    { who: 'bram', text: 'Holotable, Nav. Last one before the pod bay.' },
  ],
  sp: [
    { who: 'lantern', text: 'Pod bay three. One meter on its feed is damaged: it reads m.' },
    { who: 'wren', text: 'Fix the meter, route the power, get the fuse to the door. Then we see him.' },
    { who: 'bram', text: 'Everything since we lost the thrusters, all at once.' },
  ],
  spMeter: [{ who: 'lantern', text: 'Meter set. The three planes share a line again.' }],
  spFlows: [{ who: 'lantern', text: 'Flows inside every fuse rating. The drone is loaded with the spare fuse.' }],
  spWin: [
    { who: 'lantern', text: 'Fuse seated. Power to pod bay three in ninety seconds.' },
    { who: 'wren', text: 'Teo. We are coming.' },
  ],
  review: [
    { who: 'bram', text: 'Ninety seconds. Four claims while we wait. Some are right.' },
  ],
  closeYours: [{ who: 'lantern', text: 'Routing the pod bay with your solve.' }],
  closeBackup: [{ who: 'lantern', text: 'Routing the pod bay with my backup solver.' }],
  close: [
    { who: 'lantern', text: 'Power to pod bay three.' },
    { who: 'wren', text: 'Pod three-one-seven. Teo. Teo, it is me.' },
    { who: 'lantern', text: 'Pod opening.' },
    { who: 'wren', text: 'It is empty.' },
    { who: 'lantern', text: 'A note inside the lid. Handwritten. It reads: woken by Dr Varga. Gone to the stern to brace the struts. Signed, T.' },
    { who: 'bram', text: 'The amber light. Woken early. That is what it meant.' },
    { who: 'lantern', text: 'A newer log in the pod\'s memory. Recorded fourteen months ago.' },
    { who: 'ilselog', text: 'Teo is helping me with the stern. He is quick, and he is frightened, and he jokes about it. If the struts hold, we will both come back here.' },
    { who: 'wren', text: 'Fourteen months. He was alive fourteen months ago, in the stern.' },
    { who: 'lantern', text: 'Question added to the case board: where is Teo?' },
  ],
};
