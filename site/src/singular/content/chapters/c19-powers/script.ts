// Chapter 19: every voiced line. Plain data; story numbers are formatted from logic.ts / truth.ts, never typed.
import type { Line } from '../../lines';
import { F50, P1_FORECAST, P1_START, P3_RESULT, P5_RATIO, fmtV, powProducts } from './logic.ts';
import { sayV, spell } from '../c18-eigen/logic.ts';

const big = (x: number) => x.toLocaleString('en-GB');

export const S: Record<string, Line[]> = {
  open: [
    { who: 'vell', text: 'Fifty pulses, Navigator. My people will run the forecast one pulse at a time, and they will be finished by morning.' },
    { who: 'bram', text: 'Fifty multiplications, and every one of them a place to slip.' },
    { who: 'wren', text: 'We know the lines it keeps now. Doesn’t that tell us where everything goes?' },
    { who: 'lantern', text: 'Testing on a slice of a slower pulse. One debris cloud, pulse by pulse.' },
  ],
  p1Intro: [
    { who: 'lantern', text: `The debris piece marked yellow starts at ${fmtV(P1_START)}. The cloud thins with every pulse.`, say: `The debris piece marked yellow starts at ${sayV(P1_START)}. The cloud thins with every pulse.` },
    { who: 'wren', text: 'Before it runs fifty times, Nav: where does that piece end up?' },
  ],
  p1Win: [
    { who: 'lantern', text: `Fifty pulses run. The piece is at ${fmtV(P1_FORECAST)}, on your marker.`, say: `Fifty pulses run. The piece is at ${sayV(P1_FORECAST)}, on your marker.` },
    { who: 'wren', text: 'Called it before the pulses did.' },
  ],
  p2Intro: [
    { who: 'bram', text: 'Show me why that works for fifty, not only for one.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Fifty pulses, written as three moves: into the grid of lines that hold, stretch fifty times, back out.' },
    { who: 'bram', text: 'Everything in the middle cancels. Fine. I believe it now.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'By hand: a pulse with stretches three and two, and ten repeats of it.' },
    { who: 'bram', text: 'Ten repeats without ten multiplications. Show your working.' },
  ],
  p3Win: [
    { who: 'lantern', text: `Ten repeats send (1, 1) to ${fmtV(P3_RESULT)}. One power of three, one power of two.`, say: 'Ten repeats send one, one, to one hundred and seventeen thousand and seventy-four, one thousand and twenty-four. One power of three, one power of two.' },
  ],
  p4Intro: [
    { who: 'wren', text: 'Does every pulse have a grid of its own lines?' },
    { who: 'lantern', text: 'Testing the shear from the line hunt. It keeps one line.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Rejected. Both columns lie on one line, so the grid is flat and has no way back. The shear has too few lines that hold.' },
    { who: 'bram', text: 'So the trick has a condition. Pin it where I can see it.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'Two inspection sites on the ark. Each step, fixed shares of the crew move between them. Everyone starts at site A.' },
    { who: 'wren', text: 'Where does everyone end up, and how fast?' },
  ],
  p5Win: [
    { who: 'lantern', text: `Two thirds at site A, one third at site B. The gap shrinks to ${spell(P5_RATIO)} of itself every step.`, say: `Two thirds at site A, one third at site B. The gap shrinks to ${spell(P5_RATIO)} of itself every step.` },
  ],
  p6Intro: [
    { who: 'lantern', text: 'Optional. A puzzle from the ship’s archive: rabbits, pairs, and the fiftieth month.' },
  ],
  p6Win: [
    { who: 'lantern', text: `The fiftieth number is ${big(F50)}. Neighbours settle at a ratio of 1.618, the larger stretch.`, say: 'The fiftieth number is twelve billion, five hundred and eighty-six million, two hundred and sixty-nine thousand and twenty-five. Neighbours settle at a ratio of one point six one eight, the larger stretch.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. You’re about to argue with Vell using this. Make sure it holds.' },
  ],
  forecastIntro: [
    { who: 'lantern', text: 'Vell’s fifty-pulse forecast. One matrix, his pulse to the fiftieth power, then every debris piece at once.' },
  ],
  forecastMine: [{ who: 'lantern', text: `Computed with your mat_pow: ${spell(powProducts(50))} multiplications instead of forty-nine.`, say: `Computed with your mat pow: ${spell(powProducts(50))} multiplications instead of forty-nine.` }],
  forecastBackup: [{ who: 'lantern', text: 'Computed with my backup routine: forty-nine multiplications, one after another.' }],
  forecastOut: [
    { who: 'lantern', text: 'Forecast: after fifty pulses, every debris piece lies on the line through (1, 1, 1).' },
    { who: 'vell', text: 'Then my plan holds. One line, one tow.' },
    { who: 'bram', text: 'Everything in the field lands on that line?' },
    { who: 'vell', text: 'Everything. My cutter will be well clear by then.' },
    { who: 'wren', text: 'Will it.' },
  ],
  teoAsk: [
    { who: 'lantern', text: 'The stern channel buffer has one more message from before the Collapse.' },
    { who: 'wren', text: 'Play it.' },
  ],
  teoSent: [
    { who: 'lantern', text: 'Message sent into the stern channel. Repeating every ninety seconds. No reply.' },
    { who: 'wren', text: 'Bottom row first. He used to do his homework the other way round.' },
  ],
};
