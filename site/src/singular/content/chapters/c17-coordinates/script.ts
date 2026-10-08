// Chapter 17: every voiced line. Plain data, except that story numbers are formatted from logic.ts
// (which reads truth.ts), so no number in a line is typed by hand (GDD §2.7).
import type { Line } from '../../lines';
import {
  ARK, ARK_AFTER, ARK_CLEAR, ARM_ANGLE, B2_LEN, BOW3_REAL, BOW_REAL, CLEARANCE, P1_ANCHOR, P1_SHIP, P2_ANCHOR, P2_SHIP, P3_ANCHOR,
  P3_SHIP, P3_VELL, PC, fmtV,
} from './logic.ts';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** A number read aloud: "minus one", "one point four one". */
export function spell(x: number): string {
  const neg = x < 0 ? 'minus ' : '';
  const a = Math.abs(x);
  if (Number.isInteger(a) && a <= 10) return neg + WORDS[a];
  const [i, d] = a.toFixed(2).replace(/0+$/, '').split('.');
  return `${neg}${WORDS[Number(i)] ?? i} point ${d.split('').map((c) => WORDS[Number(c)]).join(' ')}`;
}
const sayV = (v: readonly number[]) => v.map(spell).join(', ');
const col = (j: number) => [PC[0][j], PC[1][j]];
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const S: Record<string, Line[]> = {
  open: [
    { who: 'bram', text: 'Vell’s people want the Anchor’s record. Before anyone cuts into it, I’m putting a tape on its arms.' },
    { who: 'lantern', text: 'I have always drawn the Anchor’s two ground arms like our own grid arrows: one step long, square to each other. I never measured them.' },
    { who: 'bram', text: 'First arm. One step, straight along our first grid arrow.' },
    { who: 'bram', text: 'Second arm. One step across and one step up.' },
    { who: 'lantern', text: `Second arm: ${B2_LEN.toFixed(2)} steps long. Angle between the arms: ${Math.round(ARM_ANGLE)} degrees. The Anchor’s grid is not square.`, say: `Second arm: ${spell(Number(B2_LEN.toFixed(2)))} steps long. Angle between the arms: forty-five degrees. The Anchor’s grid is not square.` },
    { who: 'wren', text: 'So the Anchor counts on a slanted grid.' },
    { who: 'bram', text: 'And Ilse wrote her nine numbers for it. Question is whether she knew.' },
  ],
  p1Intro: [
    { who: 'lantern', text: `The Anchor’s grid is drawn in copper over ours. One buoy is marked: ${fmtV(P1_SHIP)} in our numbers.`, say: `The Anchor’s grid is drawn in copper over ours. One buoy is marked: ${sayV(P1_SHIP)} in our numbers.` },
    { who: 'bram', text: 'The Anchor counts in its own arms. How many of each arm gets you to that buoy, Nav?' },
  ],
  p1Win: [
    { who: 'lantern', text: `${cap(spell(P1_ANCHOR[0]))} of the first arm and ${spell(P1_ANCHOR[1])} of the second reach the buoy. In the Anchor’s numbers it is ${fmtV(P1_ANCHOR)}. The buoy did not move.`, say: `${cap(spell(P1_ANCHOR[0]))} of the first arm and ${spell(P1_ANCHOR[1])} of the second reach the buoy. In the Anchor’s numbers it is ${sayV(P1_ANCHOR)}. The buoy did not move.` },
    { who: 'wren', text: 'Same buoy, two sets of numbers.' },
  ],
  p2Intro: [
    { who: 'lantern', text: `The Anchor’s record lists a debris piece at ${fmtV(P2_ANCHOR)}, in the Anchor’s numbers.`, say: `The Anchor’s record lists a debris piece at ${sayV(P2_ANCHOR)}, in the Anchor’s numbers.` },
    { who: 'wren', text: 'Where is that in ours? Put a marker on it, Nav. I don’t fly into things I can’t place.' },
  ],
  p2Win: [
    { who: 'lantern', text: `Two of the first arm, then minus one of the second: ${fmtV(P2_SHIP)} in our numbers. Marker placed.`, say: `Two of the first arm, then minus one of the second: ${sayV(P2_SHIP)} in our numbers. Marker placed.` },
  ],
  p3Intro: [
    { who: 'vell', text: `My cutter keeps its own grid, Navigator. Two arrows: ${fmtV(col(0))} and ${fmtV(col(1))}. Square, at least.`, say: `My cutter keeps its own grid, Navigator. Two arrows: ${sayV(col(0))}, and ${sayV(col(1))}. Square, at least.` },
    { who: 'vell', text: `My people need that piece at Anchor ${fmtV(P3_ANCHOR)} in my numbers. And one matrix, so they never have to ask again.`, say: `My people need that piece at Anchor ${sayV(P3_ANCHOR)} in my numbers. And one matrix, so they never have to ask again.` },
  ],
  p3Win: [
    { who: 'lantern', text: `Anchor ${fmtV(P3_ANCHOR)} is ${fmtV(P3_SHIP)} in our numbers and ${fmtV(P3_VELL)} in the cutter’s. One matrix now converts every Anchor reading into the cutter’s numbers.`, say: `Anchor ${sayV(P3_ANCHOR)} is ${sayV(P3_SHIP)} in our numbers, and ${sayV(P3_VELL)} in the cutter’s. One matrix now converts every Anchor reading into the cutter’s numbers.` },
    { who: 'vell', text: 'Noted. My people will use it.' },
  ],
  p4Intro: [
    { who: 'bram', text: 'Here’s what has bothered me since the spire bench. Ilse wrote a quarter turn. The pulse leans everything instead.' },
    { who: 'bram', text: 'What if the Anchor reads her numbers in its own grid? Replay it, Nav. Into the Anchor’s grid, her numbers, back to ours.' },
  ],
  p4Win: [
    { who: 'lantern', text: `The replay matches the measured pulse exactly. The bow goes to ${fmtV(BOW_REAL)}.`, say: `The replay matches the measured pulse exactly. The bow goes to ${sayV(BOW_REAL)}.` },
    { who: 'bram', text: 'Right numbers. Wrong grid.' },
  ],
  p5Intro: [
    { who: 'wren', text: 'Then what should she have entered? She wanted the ark turned cleanly, in our grid.' },
    { who: 'lantern', text: 'The Anchor reads any setting in its own grid. Find the spire numbers that turn our grid a clean quarter turn.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Setting found. Read in the Anchor’s grid, these numbers turn our grid a clean quarter turn.' },
    { who: 'bram', text: 'Four numbers. She was one conversion away.' },
  ],
  p6Intro: [
    { who: 'bram', text: 'One thing still nags me. The spire numbers got the volume right when they got the position wrong.' },
    { who: 'lantern', text: 'Measuring both descriptions side by side: the spire numbers in the Anchor’s grid, the measured pulse in ours.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Area scale, the sum down the diagonal and the fourth pulse match. The entries and the landing spots do not.' },
    { who: 'bram', text: 'The volume scale comes out the same in any grid. That’s why the volume forecast held.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. The bow forecast from the spire bench missed by a full step. Running it again, translated in and back.' },
  ],
  p7Win: [
    { who: 'lantern', text: `Forecast ${fmtV(BOW3_REAL)}. The recorded pulse put the bow at ${fmtV(BOW3_REAL)}. No gap.`, say: `Forecast ${sayV(BOW3_REAL)}. The recorded pulse put the bow at ${sayV(BOW3_REAL)}. No gap.` },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Before anyone touches those spires, I want it in plain words.' },
  ],
  reveal: [
    { who: 'lantern', text: 'A log file has surfaced in the ark’s buffer. Dr Varga.' },
    { who: 'ilselog', text: 'The spires are jammed. The third one will not move. I am still trying.' },
    { who: 'lantern', text: 'Recorded two days ago.' },
    { who: 'wren', text: 'Two days.' },
    { who: 'lantern', text: 'A second signal on the same channel. Not a recording. Source: the origin.' },
  ],
  live: [
    { who: 'ilse', text: 'I wrote the right numbers. I did not know whose grid would read them.' },
    { who: 'wren', text: 'Dr Varga?' },
    { who: 'ilse', text: 'Three years in the core, under the Anchor. It is the one place a pulse cannot move.' },
    { who: 'ilse', text: 'The lamp is mine.' },
    { who: 'bram', text: 'You’ve been sitting at the origin the whole time.' },
    { who: 'ilse', text: 'Waiting for someone who could read the grid. You read it.' },
  ],
  spIntro: [
    { who: 'ilse', text: 'The spires have been jammed since the last pulse. From in here, I cannot free them.' },
    { who: 'bram', text: 'From out here, I can. Give me ten minutes.' },
    { who: 'lantern', text: `Spires free. The ark’s centre is at ${fmtV(ARK)}. The debris stream runs along the line $x = 3$ on the ground layer. Clearance needed: ${CLEARANCE} steps.`, say: `Spires free. The ark’s centre is at ${sayV(ARK)}. The debris stream runs along the line x equals three on the ground layer. Clearance needed: ${spell(CLEARANCE)} steps.` },
    { who: 'ilse', text: 'Set them right this time. A true quarter turn, written in the Anchor’s own grid. Fire it once.' },
    { who: 'wren', text: 'One pulse, unlocked. Swing her out, Nav.' },
  ],
  spWin: [
    { who: 'lantern', text: `Setting fired once. The ark is at ${fmtV(ARK_AFTER)}, ${spell(ARK_CLEAR)} steps from the stream.`, say: `Setting fired once. The ark is at ${sayV(ARK_AFTER)}, ${spell(ARK_CLEAR)} steps from the stream.` },
  ],
  translatorMine: [{ who: 'lantern', text: 'Spire translator: setting checked with your in_grid. A quarter turn in our grid, written in the Anchor’s.', say: 'Spire translator: setting checked with your in-grid routine. A quarter turn in our grid, written in the Anchor’s.' }],
  translatorBackup: [{ who: 'lantern', text: 'Spire translator: setting checked with my backup routine. A quarter turn in our grid, written in the Anchor’s.' }],
  clear: [
    { who: 'wren', text: 'Three years in that stream. She’s out.' },
    { who: 'ilse', text: 'Thank you. All of you.' },
  ],
  reviewIntro: [
    { who: 'ilse', text: 'I learned all of this alone, and I still wrote it in the wrong grid. Four claims, Navigator. Answer each one with something built.' },
  ],
  close: [
    { who: 'wren', text: 'Dr Varga. You woke my brother.' },
    { who: 'ilse', text: 'I did. He went to the stern to brace the struts. I have not heard him since the last pulse.' },
    { who: 'wren', text: 'Neither have we.' },
    { who: 'lantern', text: 'There is one undelivered message in the stern channel. It was queued before the Collapse.' },
    { who: 'wren', text: 'Play it.' },
  ],
  teoSent: [
    { who: 'lantern', text: 'Your reply is in the stern channel. It repeats every ninety seconds.' },
    { who: 'ilse', text: 'I told him the Anchor counts on its own grid. He listened.' },
    { who: 'wren', text: 'He always does. Eventually.' },
    { who: 'ilse', text: 'Leave the spires unlocked. Nothing fires again until someone chooses it.' },
    { who: 'bram', text: 'Then we choose carefully.' },
  ],
};
