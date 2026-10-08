// Chapter 3: every voiced line (the end of Act I only; the chapter itself has no dialogue). Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  reveal: [
    { who: 'lantern', text: 'Contact. Colony ark *Meridian*. One point two kilometres. Three sections. No running lights.', say: 'Contact. Colony ark Meridian. One point two kilometres. Three sections. No running lights.' },
    { who: 'wren', text: 'There you are.' },
    { who: 'bram', text: 'Look at the frames along the hull. Every one leans the same way.' },
    { who: 'lantern', text: 'Every box frame of the hull leans by the same amount, in the same direction. The ark has been sheared.' },
    { who: 'wren', text: 'Hold on, Teo. We’re coming.' },
  ],
};
