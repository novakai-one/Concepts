// Chapter 26: every voiced line. Plain data; numbers come from logic.ts / truth.ts.
import type { Line } from '../../lines';
import { P3_EIG, P3_SHARE, P4_SHARE, REC_D, REC_N, fmtD, keptShare } from './logic.ts';

const pct = (x: number, d = 1) => `${fmtD(100 * x, d)}%`;
const sayPct = (x: number) => `${fmtD(100 * x, 1).replace('.', ' point ')} percent`;

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'The Anchor’s core is failing. Estimated time to dark: fifty minutes.' },
    { who: 'vell', text: `Its record is in there. ${REC_N.toLocaleString('en-GB')} entries, ${REC_D} numbers each. Three years of everything the Fold has done.`, say: 'Its record is in there. Ten thousand entries, twelve numbers each. Three years of everything the Fold has done.' },
    { who: 'lantern', text: 'At this range the core’s link carries two numbers per entry before it fails.' },
    { who: 'wren', text: 'Two out of twelve.' },
    { who: 'ilse', text: 'Then we choose the two that keep the most. Not two of the twelve. Two new ones.' },
  ],
  p1Intro: [
    { who: 'ilse', text: 'Practice first. A cloud of readings, and a line through it. The shadows of the readings on the line keep some of the cloud. Make them keep the most.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Spread of the shadows and the distances to the line always add to the same total. The line of most spread is the line of least distance.' },
    { who: 'ilse', text: 'And a plane keeps two numbers per reading. The same idea, one more direction.' },
  ],
  p2Intro: [
    { who: 'lantern', text: 'A cloud far from the origin. Lines through the origin only.' },
    { who: 'bram', text: 'That line is pointing at the cloud, not along it. Something is wrong with where it starts.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Pivot at the mean. The line of most spread now runs along the cloud.' },
    { who: 'ilse', text: 'Always take the mean away first. Otherwise the biggest thing you measure is where the cloud is.' },
  ],
  p3Intro: [
    { who: 'ilse', text: 'Why does the best line fall where it does? Measure the spread along every direction and look for the pattern.' },
  ],
  p3Win: [
    { who: 'lantern', text: `The spread along a unit arrow is wᵀCw. Its largest value, ${fmtD(P3_EIG.values[0])}, is the largest eigenvalue of C, at its eigenvector: ${pct(P3_SHARE, 0)} of the total.`, say: `The spread along a unit arrow is w transpose C w. Its largest value, ${fmtD(P3_EIG.values[0]).replace('.', ' point ')}, is the largest eigenvalue of C, at its eigenvector: ${Math.round(100 * P3_SHARE)} percent of the total.` },
    { who: 'bram', text: 'A symmetric matrix again. The braces all over.' },
  ],
  p4Intro: [
    { who: 'lantern', text: 'Four readings, by hand: (6, 6), (2, 4), (5, 7), (3, 3).', say: 'Four readings, by hand: six, six. Two, four. Five, seven. Three, three.' },
  ],
  p4Win: [
    { who: 'lantern', text: `Mean (4, 5). First direction (1, 1)/√2, keeping ${pct(P4_SHARE, 0)}. The four readings become ±3/√2.`, say: `Mean four, five. First direction one, one, over root two, keeping ${Math.round(100 * P4_SHARE)} percent. The four readings become plus or minus three over root two.` },
  ],
  p5Intro: [
    { who: 'lantern', text: 'The record’s singular values, after taking the mean away: twelve of them.' },
    { who: 'vell', text: 'How many do I need to keep most of it?' },
  ],
  p5Win: [
    { who: 'lantern', text: `Two components keep ${pct(keptShare(2))} of the squared total. Three would keep ${pct(keptShare(3))}.`, say: `Two components keep ${sayPct(keptShare(2))} of the squared total. Three would keep ${sayPct(keptShare(3))}.` },
    { who: 'ilse', text: 'The third is larger than everything after it.' },
    { who: 'wren', text: 'And the link carries two.' },
  ],
  p6Intro: [
    { who: 'lantern', text: 'Lay out the transmission. Two channels, one component each.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Components one and two. Every entry becomes two numbers. The entries lie on a spiral, with one path marked through it.' },
    { who: 'vell', text: 'Star positions. That is a route.' },
    { who: 'lantern', text: 'The third component is not in the layout. Nobody at the other end can rebuild it.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. Two kinds of debris, side by side. The first component does not tell them apart.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'Along the second component the two kinds separate. The first component is the direction of most spread. The labels of the two kinds play no part in it.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Before that transmission goes out under my ship’s name, brief me.' },
  ],
  sendIntro: [
    { who: 'lantern', text: 'Transmission start. Projecting the record onto two components.' },
  ],
  sendMine: [{ who: 'lantern', text: 'Projected with your pca.', say: 'Projected with your P C A.' }],
  sendBackup: [{ who: 'lantern', text: 'Projected with my backup routine.' }],
  sendOut: [
    { who: 'lantern', text: `${REC_N.toLocaleString('en-GB')} entries sent, two numbers each. The core has gone dark.`, say: 'Ten thousand entries sent, two numbers each. The core has gone dark.' },
    { who: 'vell', text: 'Received. All of it that could be sent.' },
  ],
  reviewIntro: [
    { who: 'ilse', text: 'Before I touch those spires again, I want to know my numbers are understood. Four claims. Judge each one.' },
  ],
  close: [
    { who: 'teo', text: 'Can I come over now? I have been in this stern long enough.' },
    { who: 'wren', text: 'Soon. Ilse has one more thing to do.' },
    { who: 'ilse', text: 'The core is dark. The spires are not.' },
  ],
};
