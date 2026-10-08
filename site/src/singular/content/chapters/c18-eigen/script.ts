// Chapter 18: every voiced line. Short and optional: no line carries something the player needs to play
// (docs/singular/ch18-plain-style.md). Story numbers are formatted from logic.ts, never typed.
import type { Line } from '../../lines';
import { CUTTER, P5_VALUES, P6_LINES, fmtN, sayV, spell } from './logic.ts';
import { tcol } from './traj-text.ts';
import { GAME1_DIALOGUE } from './game1-copy.ts';

const col = (v: number[]) => `$${tcol(v)}$`;

export const S: Record<string, Line[]> = {
  open: [
    { who: 'vell', text: 'I will apply one matrix to the whole debris field. Fifty times. Everything gathers onto one line, and my cutter tows it home.' },
    { who: 'bram', text: 'A matrix turns most vectors. We need the few it doesn’t.' },
  ],
  p1Intro: GAME1_DIALOGUE.intro,
  p1Win: GAME1_DIALOGUE.win,
  p2Intro: [
    { who: 'bram', text: 'A new matrix: a shear. Check the whole circle before you answer.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'A shear keeps one line, not two.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'Searching by hand is slow. There is a faster way to find λ.', say: 'Searching by hand is slow. There is a faster way to find lambda.' },
  ],
  p3Win: [
    { who: 'bram', text: 'Flattening, used as a tool. I can live with that.' },
  ],
  coda: [
    { who: 'lantern', text: 'The same test on the two-decimal model from the Collapse.' },
    { who: 'lantern', text: 'At λ = 0 it is flat already. So 0 is an eigenvalue: some vector goes to zero.', say: 'At lambda equals zero it is flat already. So zero is an eigenvalue: some vector goes to zero.' },
  ],
  p4Intro: [
    { who: 'wren', text: 'Now the ground-layer matrix, T. Which lines does it keep?' },
  ],
  p4Win: [
    { who: 'bram', text: 'Four of them bring everything home. Not luck. Arithmetic.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'A 3 × 3 matrix. By hand this time.', say: 'A three by three matrix. By hand this time.' },
  ],
  p5Win: [
    { who: 'wren', text: `λ = ${fmtN(P5_VALUES[2])}. That line gets flipped every time.`, say: `Lambda is ${spell(P5_VALUES[2])}. That line gets flipped every time.` },
  ],
  p6Intro: [
    { who: 'vell', text: 'Here is my matrix, V. Check it yourself.' },
  ],
  p6Win: [
    { who: 'vell', text: 'As I said. Everything ends on the first line.' },
    { who: 'bram', text: 'Everything. Remember he said that.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. Does row reducing a matrix keep its eigenvalues?' },
  ],
  p7Win: [
    { who: 'lantern', text: 'No. Row operations change the matrix, so they change its eigenvalues.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Plain words, before anyone trusts Vell’s lines.' },
  ],
  finderIntro: [
    { who: 'lantern', text: `Line finder on Vell’s matrix V, starting from his cutter at ${col(CUTTER)}. Sixty steps, each rescaled to length one.`, say: `Line finder on Vell's matrix V, starting from his cutter at ${sayV(CUTTER)}. Sixty steps, each rescaled to length one.` },
  ],
  finderMine: [{ who: 'lantern', text: `Computed with your power_iteration. The vector settles on the line through ${col(P6_LINES[0][0])}.`, say: 'Computed with your power iteration. The vector settles on the line through one, one, one.' }],
  finderBackup: [{ who: 'lantern', text: `Computed with my backup routine. The vector settles on the line through ${col(P6_LINES[0][0])}.`, say: 'Computed with my backup routine. The vector settles on the line through one, one, one.' }],
  close: [
    { who: 'lantern', text: `Vell’s cutter is at ${col(CUTTER)}. That is inside the field his matrix gathers.`, say: `Vell's cutter is at ${sayV(CUTTER)}. That is inside the field his matrix gathers.` },
    { who: 'wren', text: 'His own ship is in the field.' },
    { who: 'ilse', text: 'He is not wrong about the line. Ask him what else lands on it.' },
    { who: 'bram', text: 'Then the next question is where everything ends up. Fifty steps from now.' },
  ],
};
