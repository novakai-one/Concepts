// Chapter 23: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  drift: [{ who: 'lantern', text: 'New watch. Drift fix running.' }],
  driftMine: [{ who: 'lantern', text: 'On your Gram–Schmidt. Frame square. Horizon level.' }],
  driftBackup: [{ who: 'lantern', text: 'On my backup routine. Frame square. Horizon level.' }],
  open: [
    { who: 'ilse', text: 'To undo the Collapse we need the pulse itself, far past two decimals.' },
    { who: 'lantern', text: 'The drones logged twenty positions around the stern: where each one was before the pulse, and where it was after.' },
    { who: 'lantern', text: 'Every reading carries noise. No matrix fits all twenty exactly.' },
    { who: 'wren', text: 'So the readings disagree. Which one do we believe?' },
    { who: 'bram', text: 'None of them. All of them. We find the answer that is wrong by the least.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Practice first. Four readings of one drone’s drift: 1, 2, 2 and 4, at hours 0 to 3. Each leftover is drawn as a square.' },
    { who: 'bram', text: 'Make the squares as small as they go. All of them together.' },
  ],
  p1Win: [{ who: 'lantern', text: 'Total square area 0.7: the smallest there is. The line passes through none of the four readings.', say: 'Total square area zero point seven: the smallest there is. The line passes through none of the four readings.' }],
  p2Intro: [
    { who: 'ilse', text: 'Now look at the same thing a second way. Three readings make one arrow with three numbers. Every line the board allows makes another.' },
  ],
  p2Win: [{ who: 'ilse', text: 'The best line is the nearest point. The leftover stands at a right angle to everything a line can make.' }],
  p3Intro: [
    { who: 'bram', text: 'Five readings. By hand, every number. Then I trust the machine.' },
  ],
  p3Win: [{ who: 'lantern', text: 'Line $y = 1.4 + 0.8t$. Total square area 3.6.', say: 'Line y equals one point four plus zero point eight t. Total square area three point six.' }],
  p4Intro: [
    { who: 'lantern', text: 'The stern sheet is drifting back toward its anchor point. Six hourly readings of its distance: 412.0 down to 406.9 metres.', say: 'The stern sheet is drifting back toward its anchor point. Six hourly readings of its distance: four hundred and twelve down to four hundred and six point nine metres.' },
    { who: 'wren', text: 'When does it get inside 380? That’s where the tether rig can reach it.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Forecast with the best line: hour 31.8.', say: 'Forecast with the best line: hour thirty one point eight.' },
    { who: 'lantern', text: 'The curve through all six readings forecasts minus 316 metres at hour ten.', say: 'The curve through all six readings forecasts minus three hundred and sixteen metres at hour ten.' },
    { who: 'bram', text: 'Fits every reading and gets the future wrong. I’ve worked with people like that.' },
  ],
  spIntro: [
    { who: 'ilse', text: 'Now the real fit. Twenty before-and-after pairs. Each row of the pulse is its own best-fit problem.' },
    { who: 'lantern', text: 'Before positions in one matrix. After positions, one coordinate at a time, as the readings.' },
  ],
  spWin: [
    { who: 'lantern', text: 'Fitted pulse. Third column: 1, 1, 2.004. The two-decimal model said 2.00.', say: 'Fitted pulse. Third column: one, one, two point zero zero four. The two-decimal model said two point zero zero.' },
    { who: 'ilse', text: 'Four thousandths. That is the whole difference between flat and thin.' },
  ],
  p6Intro: [
    { who: 'lantern', text: 'Plotting what the fit leaves over. Sixty numbers, in the order they were recorded.' },
    { who: 'bram', text: 'Noise should look like noise. Mark anything that doesn’t.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Between samples 17 and 43 the leftover is not random. Groups of three short, three long, three short. Played as sound, they are taps on a—', say: 'Between samples seventeen and forty three the leftover is not random. Groups of three short, three long, three short. Played as sound, they are taps on a' },
    { who: 'wren', text: 'That’s him. That’s how we used to knock on the bunk wall.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. A curved fit, three unknowns, and two ways to solve it.' },
  ],
  p7Win: [{ who: 'lantern', text: 'The normal equations kept six digits. QR kept fourteen.' }],
  briefing: [
    { who: 'bram', text: 'Before that fit goes anywhere near the Anchor, brief me.' },
  ],
  reviewIntro: [
    { who: 'ilse', text: 'Four claims, Navigator, before we touch the stern. Some of them I believed once. Answer each one with something built.' },
  ],
  install: [{ who: 'lantern', text: 'Collapse fit installed. Refitting all twenty readings, and the new ones from the last hour.' }],
  installMine: [{ who: 'lantern', text: 'Running on your least squares routine.' }],
  installBackup: [{ who: 'lantern', text: 'Running on my backup routine.' }],
  residual: [
    { who: 'lantern', text: 'Third column 1, 1, 2.004. The pattern is in the leftover again. It repeats every ninety seconds.', say: 'Third column one, one, two point zero zero four. The pattern is in the leftover again. It repeats every ninety seconds.' },
    { who: 'wren', text: 'Ninety seconds. That’s our message. He’s answering it.' },
    { who: 'ilse', text: 'He is inside the sheet. Alive.' },
    { who: 'bram', text: 'Then we unfold that stern. And we don’t tear anything doing it.' },
  ],
};
