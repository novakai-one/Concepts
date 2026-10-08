// Prologue: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  call: [
    { who: 'ilselog', text: 'This is Dr Ilse Varga, science officer of the colony ark *Meridian*.' },
    { who: 'ilselog', text: 'The Anchor moves everything around it. I have learned to set it.' },
    { who: 'ilselog', text: 'Nine numbers. They should turn us out of the debris.' },
    { who: 'ilselog', text: 'First spire: zero, one, zero. Second: minus one, zero, zero. Third: zero, zero, one.' },
    { who: 'ilselog', text: 'Twelve thousand people are asleep on this ship. If anyone can hear this, please come.' },
  ],
  arrive: [
    { who: 'lantern', text: 'Transit complete. Distress call received three years and four days ago. Source: the colony ark *Meridian*.' },
    { who: 'wren', text: 'Three years late, and we are still the only ship that came.' },
    { who: 'bram', text: 'Then we had better be the ship that works. Nav, you with us?' },
    { who: 'wren', text: 'Our new navigator. First day, strangest place I have ever flown. Welcome aboard.' },
    { who: 'lantern', text: 'Ahead: the Anchor. Forty kilometres. No ark visible.' },
    { who: 'wren', text: 'Seed the lattice, Nav. I want to see what this space is doing before I fly into it.' },
  ],
  seed: [
    { who: 'lantern', text: 'Light buoys seeded. One every hundred metres, on a square grid.' },
    { who: 'bram', text: 'Now space has marks on it. If anything moves the space, it moves the buoys, and we see it.' },
    { who: 'lantern', text: 'Reference buoys marked. Three in a white line. Four in a cyan row, evenly spaced.' },
    { who: 'wren', text: 'Nearest beacon is three across, two up. Drag where you want us. I fly the arrow.' },
  ],
  burnWin: [{ who: 'wren', text: 'On the beacon. One burn. I like you already.' }],
  pulse: [
    { who: 'lantern', text: 'Pulse detected. Brace.' },
  ],
  after: [
    { who: 'wren', text: 'Everyone in one piece? Nav?' },
    { who: 'lantern', text: 'Thrusters three and four are dark. The buoys have moved.' },
    { who: 'bram', text: 'All of them, all at once. Nav, check the reference buoys before we touch anything. I want to know what that pulse did.' },
  ],
  lineWin: [
    { who: 'lantern', text: 'The three white buoys are still on one straight line. The four cyan buoys are still evenly spaced: one step fits every gap.' },
  ],
  stillWin: [
    { who: 'lantern', text: 'One point did not move: the point under the Anchor. There is a light there.' },
    { who: 'lantern', text: 'Setting the origin of our grid at that point.' },
  ],
  close: [
    { who: 'lantern', text: 'Pulse summary. Every buoy moved except one. Straight lines of buoys are still straight. Even spacing is still even. One point did not move: the point under the Anchor.' },
    { who: 'bram', text: 'Straight stays straight. Even stays even. One point stays put. That is not a random shove.' },
    { who: 'wren', text: 'So it follows a rule.' },
    { who: 'bram', text: 'A rule we can learn. Learn it, and we can fly through it. Maybe even undo it.' },
    { who: 'lantern', text: 'Three questions added to the case board.' },
    { who: 'wren', text: 'Two thrusters gone, an ark we cannot see, and a rule we do not know. Nav, get us to the next beacon.' },
  ],
};
