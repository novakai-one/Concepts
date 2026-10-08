// Chapter 14: every voiced line. Plain data. (Numbers here are checked against truth.ts and logic.ts
// in tests/singular/game-c14.test.ts.)
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Routine pulse. Hull volume before it: one hundred percent of the last reading.' },
    { who: 'lantern', text: 'Pulse complete. Hull volume: times 0.8. Fifth pulse in a row at times 0.8.', say: 'Pulse complete. Hull volume: times zero point eight. Fifth pulse in a row at times zero point eight.' },
    { who: 'lantern', text: 'Voice on the stern channel.' },
    { who: 'teo', text: 'This is Teo Okafor. I am in the stern, with Dr Varga\'s struts. Is someone out there?' },
    { who: 'wren', text: 'Teo. It\'s Wren. We\'re here.' },
    { who: 'teo', text: 'Wren. You came.' },
    { who: 'bram', text: 'Every pulse the stern gets smaller around him. Nav, find out what a pulse does to a volume.' },
  ],
  p1Intro: [
    { who: 'bram', text: 'Start in 2-D. A cargo hold on the floor plan: shape it from two columns.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'The hold kept its area, 6, while its shape changed. Every square of the grid kept area 1.', say: 'The hold kept its area, six, while its shape changed. Every square of the grid kept area one.' },
  ],
  spireVolume: [
    { who: 'lantern', text: 'Applying the same test to the full pulse. Unit cube under the spire numbers: volume 0.8.', say: 'Applying the same test to the full pulse. Unit cube under the spire numbers: volume zero point eight.' },
    { who: 'lantern', text: 'Unit cube under the measured pulse: volume 0.8. The spires predicted the volume exactly and the position wrongly.', say: 'Unit cube under the measured pulse: volume zero point eight. The spires predicted the volume exactly and the position wrongly.' },
    { who: 'wren', text: 'Right about how much, wrong about where.' },
    { who: 'bram', text: 'Keep that on the board. One number the spires never get wrong.' },
  ],
  p2Intro: [
    { who: 'bram', text: 'Where does the area come from? I want to see it with my own eyes, not take LANTERN\'s word.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Box 12, minus 3, minus 2, minus 2. Area 5: three times two, minus one times one.', say: 'Box twelve, minus three, minus two, minus two. Area five: three times two, minus one times one.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Times 2 then times 3 is times 6. Doubling every number of a 2 × 2 move made the area 4 times larger. The swap turned the tile over: area minus 1.', say: 'Times two then times three is times six. Doubling every number of a two by two move made the area four times larger. The swap turned the tile over: area minus one.' },
  ],
  p4Intro: [
    { who: 'bram', text: 'Three by three by hand. You will do this in your sleep before we are done.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Eight, along any row. The four by four: minus one, from two single entries.', say: 'Eight, along any row. The four by four: minus one, from two single entries.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'Faster method for big matrices: row reduce to a triangle, keep track of the signs, multiply the pivots.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Determinant 3. Shield generator flat at k = 4.', say: 'Determinant three. Shield generator flat at k equals four.' },
  ],
  p7Intro: [
    { who: 'bram', text: 'Optional, Nav. LANTERN says areas can solve equations. Show me how.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'x equals 2, y equals 1, each from a ratio of two areas. This is Cramer\'s rule.' },
  ],
  brief: [
    { who: 'bram', text: 'Brief me before the next pulse. Holotable.' },
  ],
  reviewIntro: [
    { who: 'bram', text: 'Four claims about this week\'s moves. Some of them are mine and wrong. Sort them before LANTERN forecasts anything.' },
  ],
  strike: [
    { who: 'lantern', text: 'Debris strike on the Anchor. All three spires knocked.' },
    { who: 'lantern', text: 'New spire tips: (1, 0, 1), (0, 1, 2), and the third swinging into line with the second, now at (0, 1, 2.004).', say: 'New spire tips: one, zero, one. Zero, one, two. And the third swinging into line with the second, now at zero, one, two point zero zero four.' },
    { who: 'bram', text: 'Two spires pointing the same way. I do not like that.' },
    { who: 'wren', text: 'Teo, where are you?' },
    { who: 'teo', text: 'Stern, frame six. Bracing.' },
    { who: 'wren', text: 'Nav. Forecast the next pulse.' },
  ],
  forecast: [
    { who: 'lantern', text: 'Forecast: the next pulse multiplies every volume by zero point zero zero, to two decimal places.' },
  ],
  noUndo: [
    { who: 'lantern', text: 'On the two-decimal reading, column 3 has no pivot. There is no undo to prepare.' },
  ],
  braces: [
    { who: 'teo', text: 'Tell me where to put the braces.' },
  ],
  bracesDone: [
    { who: 'lantern', text: 'Every arrangement loses the same fraction of its volume. Bracing cannot change it.' },
  ],
  sealed: [
    { who: 'lantern', text: 'Mid-section bulkhead sealed. The bow and the mid-section are outside the stern\'s volume.' },
    { who: 'bram', text: 'We save what we can.' },
  ],
  collapse: [
    { who: 'teo', text: 'Struts are holding. I can see the hatch from here.' },
    { who: 'wren', text: 'Teo. The hatch.' },
    { who: 'teo', text: 'Going.' },
  ],
  after: [
    { who: 'lantern', text: 'Pulse complete. The stern is flat, to two decimal places.' },
    { who: 'lantern', text: 'The third spire is jammed. The Anchor is quiet.' },
    { who: 'wren', text: 'Teo.' },
    { who: 'lantern', text: 'Stern channel: static.' },
  ],
};
