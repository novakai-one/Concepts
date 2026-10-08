// Chapter 20: every voiced line. Plain data; story numbers are formatted from logic.ts / truth.ts, never typed.
import type { Line } from '../../lines';
import { DRONES_STEADY, VELL_CUTTER } from '../../truth.ts';
import { NEED, P1_HOUR1, P5_BEST, P5_STEADY, PR_ORDER, SP_AFTER, TOTAL, fmtV } from './logic.ts';
import { sayV } from '../c18-eigen/logic.ts';

const round = (v: readonly number[]) => v.map((x) => Math.round(x));

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: `The ark carries ${TOTAL} maintenance drones. Every hour, fixed shares of them move between the Bow, Mid and Stern sections.`, say: 'The ark carries three hundred maintenance drones. Every hour, fixed shares of them move between the Bow, Mid and Stern sections.' },
    { who: 'bram', text: `To brace the stern for the unfold, we need at least ${NEED} of them working there. Not for an hour. For good.`, say: 'To brace the stern for the unfold, we need at least one hundred of them working there. Not for an hour. For good.' },
    { who: 'vell', text: 'My crew is counting on the same drones, Navigator. For the tow.' },
    { who: 'wren', text: 'Then let’s see where they actually go.' },
  ],
  p1Intro: [
    { who: 'lantern', text: `All ${TOTAL} drones are at the Bow. I have the shares each section sends out every hour.`, say: 'All three hundred drones are at the Bow. I have the shares each section sends out every hour.' },
    { who: 'bram', text: 'Write the shares down so the board can run an hour. Then tell me the second.' },
  ],
  p1Win: [
    { who: 'lantern', text: `One hour: ${fmtV(round(P1_HOUR1))}. Every drone accounted for.`, say: `One hour: ${sayV(round(P1_HOUR1))}. Every drone accounted for.` },
  ],
  p2Intro: [
    { who: 'wren', text: 'Fine. Where do they end up if we leave them alone?' },
    { who: 'lantern', text: 'The arrangement one more hour leaves unchanged. On the row board.' },
  ],
  p2Win: [
    { who: 'lantern', text: `Settled: ${fmtV(DRONES_STEADY)}. Forty hours from the Bow land on it.`, say: `Settled: ${sayV(DRONES_STEADY)}. Forty hours from the Bow land on it.` },
    { who: 'bram', text: `Sixty at the stern. We need ${NEED}.`, say: 'Sixty at the stern. We need one hundred.' },
  ],
  p3Intro: [
    { who: 'vell', text: 'Start them all at the stern, then. Problem solved.' },
    { who: 'lantern', text: 'Testing three starts.' },
  ],
  p3Win: [
    { who: 'lantern', text: `All three starts end at ${fmtV(DRONES_STEADY)}. The start does not matter.`, say: `All three starts end at ${sayV(DRONES_STEADY)}. The start does not matter.` },
    { who: 'vell', text: 'Hm.' },
  ],
  p4Intro: [
    { who: 'bram', text: 'Every chain we’ve tried has a steady state. Is that luck, or is it built in?' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Built in. Columns that add to one keep the all-ones arrow fixed under the transpose, so one is always an eigenvalue.', say: 'Built in. Columns that add to one keep the all-ones arrow fixed under the transpose, so one is always an eigenvalue.' },
  ],
  p5Intro: [
    { who: 'bram', text: 'We can’t change where they start. We can change the rules. I can reprogram how long drones stay at the stern.' },
    { who: 'lantern', text: 'Only the Stern’s stay share changes. Drones that leave the Stern split evenly between Bow and Mid.' },
  ],
  p5Win: [
    { who: 'lantern', text: `Stay share ${P5_BEST} percent. The drones settle at ${fmtV(round(P5_STEADY))}: ${NEED} at the stern.`, say: `Stay share ${P5_BEST} percent. The drones settle at ${sayV(round(P5_STEADY))}. One hundred at the stern.` },
    { who: 'bram', text: 'Eighty. I’ll set it.' },
  ],
  p6Intro: [
    { who: 'wren', text: 'Does every rule settle like that?' },
    { who: 'lantern', text: 'Testing two cargo bays that trade all their drones every hour.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'The swap never settles: the drones change bay every hour, forever. With some drones staying, the bays settle at fifty and fifty.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. The ark’s four reading terminals link to each other. Where does a reader who follows links settle?' },
  ],
  p7Win: [
    { who: 'lantern', text: `Ranked by where readers settle: ${PR_ORDER.join(', ')}.`, say: `Ranked by where readers settle: ${PR_ORDER.join(', ')}.` },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Then we go and have a word with Vell.' },
  ],
  allocIntro: [
    { who: 'lantern', text: `Drone allocation with the new stern rule: stay share ${P5_BEST} percent.`, say: `Drone allocation with the new stern rule: stay share ${P5_BEST} percent.` },
  ],
  allocMine: [{ who: 'lantern', text: 'Computed with your steady_state: one hundred and twenty-five, seventy-five, one hundred.', say: 'Computed with your steady state routine: one hundred and twenty-five, seventy-five, one hundred.' }],
  allocBackup: [{ who: 'lantern', text: 'Computed with my backup routine: one hundred and twenty-five, seventy-five, one hundred.' }],
  spIntro: [
    { who: 'vell', text: 'You have your drones. My setting goes into the Anchor in an hour.' },
    { who: 'wren', text: 'Before it does, Nav has a forecast for you. All fifty pulses.' },
    { who: 'vell', text: 'I have seen forecasts. Show me.' },
  ],
  spWin: [
    { who: 'lantern', text: `Forecast: Vell’s cutter, now at ${fmtV(VELL_CUTTER)}, ends at ${fmtV(round(SP_AFTER))}, on the line it gathers everything onto. Its volume is multiplied by 0.1 every pulse: ten to the minus fifty after fifty.`, say: `Forecast: Vell's cutter, now at ${sayV(VELL_CUTTER)}, ends at ${sayV(round(SP_AFTER))}, on the line it gathers everything onto. Its volume is multiplied by zero point one every pulse. Ten to the minus fifty, after fifty.` },
  ],
  standDown: [
    { who: 'vell', text: 'My cutter is in the field.' },
    { who: 'bram', text: 'Your cutter, your drones and your crew. All on one line, flatter than our stern.' },
    { who: 'vell', text: 'I was told the ark was lost. I did not check the number.' },
    { who: 'vell', text: 'The setting is withdrawn. My drones are yours. Route them to the stern.' },
  ],
  reviewIntro: [
    { who: 'vell', text: 'I would like to understand what nearly happened. Four claims. Show me which ones hold.' },
  ],
  close: [
    { who: 'lantern', text: 'Vell’s drones are rerouting to the stern under the new rule.' },
    { who: 'lantern', text: 'A pod has left the Anchor’s core. It is docking with us.' },
    { who: 'ilse', text: 'Permission to come aboard. I have been at the origin a long time.' },
    { who: 'wren', text: 'Come in, Dr Varga.' },
    { who: 'ilse', text: 'Ilse. I am older than my logs, I know. Show me the stern.' },
    { who: 'bram', text: 'Thin as a sheet. We’ll need better numbers than two decimals.' },
    { who: 'ilse', text: 'Then we measure it properly.' },
  ],
};
