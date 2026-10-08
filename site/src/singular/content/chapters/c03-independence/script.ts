// Chapter 3: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'bram', text: 'Spare thruster bolted on the outer mount. It should lift us off this plane.' },
    { who: 'lantern', text: 'Spare thruster pushes one across, two up, three high.' },
    { who: 'wren', text: 'Firing all three.' },
    { who: 'lantern', text: 'Ship position: still on the plane. The spare added no new direction.' },
    { who: 'bram', text: 'Then that mount is wasted. I want to know why before I move it.' },
  ],
  holo: [
    { who: 'bram', text: 'A test first. Three arrows on the holotable. Fire all three and bring the ship back where it started.' },
    { who: 'wren', text: 'Back where it started. On purpose. All right.' },
  ],
  p1Win: [{ who: 'bram', text: 'Fired all three and went nowhere. So one of them is only the other two, added up.' }],
  p2: [
    { who: 'lantern', text: 'Thrusters two and three, plus the spare on the outer mount. The signal is still out of reach.' },
    { who: 'bram', text: 'Show me the spare is doing a job the other two already do.' },
  ],
  p2Win: [{ who: 'lantern', text: 'One of thruster two plus two of thruster three lands on the spare’s tip. The spare reaches nothing new.' }],
  p3: [
    { who: 'bram', text: 'Three places I can bolt it. Pick one. Fuel is short, so no more than three units of dial in total.' },
  ],
  p3Win: [
    { who: 'wren', text: 'We’re off the plane. We’re actually off the plane.' },
    { who: 'lantern', text: 'On the signal. Fuel used: three units.' },
  ],
  p4: [{ who: 'bram', text: 'We are carrying more thrusters than we can power. Four on the rack. One has to go, and we lose nothing.' }],
  p4Win: [{ who: 'bram', text: 'Unbolted and nothing lost. The other three still push every way there is.' }],
  p5: [{ who: 'bram', text: 'I’ll pick four arrows myself. Any four. I bet you a beer you cannot always close the loop.' }],
  p5Win: [{ who: 'bram', text: 'Fine. I owe you a beer. Four arrows in this space always come back to the start.' }],
  p6: [{ who: 'lantern', text: 'Optional. Three arrows on the flat holotable. Try to place them so that only the all-zero firing brings the ship back.' }],
  p6Win: [{ who: 'lantern', text: 'Three tries, three loops. On a flat deck, two arrows that point different ways already reach every point. A third is always wasted.' }],
  lift: [
    { who: 'bram', text: 'Last job before the ark. Four thrusters on the rack and power for three.' },
    { who: 'lantern', text: 'Approach point for the *Meridian*: four across, minus one up, six high. Fuel for six and a half units.', say: 'Approach point for the Meridian: four across, minus one up, six high. Fuel for six and a half units.' },
    { who: 'wren', text: 'Pick three, set the dials, and I’ll take us out of this plane for good.' },
  ],
  liftWin: [{ who: 'wren', text: 'Climbing. We’re climbing.' }],
  review: [{ who: 'bram', text: 'Before we go: four things I believe about arrows. Tell me which ones are wrong. Prove it.' }],
  reveal: [
    { who: 'lantern', text: 'Contact. Colony ark *Meridian*. One point two kilometres. Three sections. No running lights.', say: 'Contact. Colony ark Meridian. One point two kilometres. Three sections. No running lights.' },
    { who: 'wren', text: 'There you are.' },
    { who: 'bram', text: 'Look at the frames along the hull. Every one leans the same way.' },
    { who: 'lantern', text: 'Every box frame of the hull leans by the same amount, in the same direction. The ark has been sheared.' },
    { who: 'wren', text: 'Hold on, Teo. We’re coming.' },
  ],
};
