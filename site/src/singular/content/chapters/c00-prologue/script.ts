// Prologue: every voiced line. Plain data. The story is optional: no line carries an instruction.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  call: [
    { who: 'ilselog', text: 'This is Dr Ilse Varga, on the colony ark *Meridian*. These nine numbers should move us clear.' },
    { who: 'ilselog', text: 'Twelve thousand people are asleep on this ship. If anyone can hear this, please come.' },
  ],
  grid: [
    { who: 'lantern', text: 'A grid on the plane. If the plane moves, the grid moves with it.' },
  ],
  hook: [
    { who: 'wren', text: 'The *Meridian* is still out there. Let’s go and find it.' },
  ],
};
