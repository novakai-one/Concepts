// Chapter 22: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Attitude frame check. Up arrow 1.03 long. Forward arrow 0.98. Side arrow 1.01.', say: 'Attitude frame check. Up arrow one point zero three long. Forward arrow zero point nine eight. Side arrow one point zero one.' },
    { who: 'lantern', text: 'Up and forward are 88.6 degrees apart. They should be 90. The holotable horizon leans 1.4 degrees.', say: 'Up and forward are eighty eight point six degrees apart. They should be ninety. The holotable horizon leans one point four degrees.' },
    { who: 'bram', text: 'Since the Collapse it has crept a little every day. Rounding, every time it multiplies in a turn from that damaged gyro.' },
    { who: 'wren', text: 'And the star looks like an egg. I thought it was my eyes.' },
    { who: 'ilse', text: 'There is a second reason to fix it. To set the Anchor precisely, LANTERN needs a square frame built from the Anchor’s own arms. They are skewed.' },
    { who: 'bram', text: 'Then we learn to square things up. Arrows first, the ship after.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Two skewed arrows on the holotable: (3, 4) and (2, 1). Build two arrows from them that are one unit long and at a right angle.', say: 'Two skewed arrows on the holotable: three, four and two, one. Build two arrows from them that are one unit long and at a right angle.' },
  ],
  p1Win: [{ who: 'lantern', text: 'Square pair: (0.6, 0.8) and (0.8, −0.6). The second was already one unit long.', say: 'Square pair: zero point six, zero point eight and zero point eight, minus zero point six. The second was already one unit long.' }],
  p2Intro: [
    { who: 'bram', text: 'Two is easy. Three arrows, every shadow by hand. I want to see the third one come out square.' },
  ],
  p2Win: [{ who: 'bram', text: 'Three arrows, every pair at a right angle, every one a unit long. That I can bolt on.' }],
  p3Intro: [
    { who: 'ilse', text: 'An old record of mine, written in a square grid. Its arrows are (3/5, 4/5) and (−4/5, 3/5). One point in it is (5, 5) in yours.', say: 'An old record of mine, written in a square grid. Its arrows are three fifths, four fifths and minus four fifths, three fifths. One point in it is five, five in yours.' },
    { who: 'ilse', text: 'In a skewed grid you would solve a system to read it. Here you should not need to.' },
  ],
  p3Win: [{ who: 'ilse', text: 'Seven and minus one. One dot product each. That is why I keep my records square.' }],
  p4Intro: [
    { who: 'wren', text: 'Six moves on the holotable. Which ones can I fly through without bending anything?' },
  ],
  p4Win: [{ who: 'lantern', text: 'Three safe moves: the turn, the flip and the swap. Each keeps every length and every angle.' }],
  p5Intro: [
    { who: 'lantern', text: 'The attitude frame on the holotable. The star tracker checks the up arrow every hour. Up is the one to trust.' },
    { who: 'bram', text: 'Square it, Nav. I want a level horizon and a round star.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Frame re-squared. Horizon lean 0 degrees. The star is round.' },
    { who: 'wren', text: 'Huh. I didn’t know how much it bothered me until it stopped.' },
  ],
  p6Intro: [
    { who: 'lantern', text: 'The square arrows can be written back into the skewed ones. One matrix of square arrows, one matrix of amounts.' },
  ],
  p6Win: [{ who: 'lantern', text: 'Checked: the square arrows times the amounts give back the skewed arrows exactly.' }],
  p7Intro: [
    { who: 'bram', text: 'One more, for the record. Three arrows that all point almost the same way. Square them two ways and see which one holds.' },
  ],
  p7Win: [{ who: 'bram', text: 'Same steps on paper. Different answers in the machine. That’s the kind of thing that gets people killed.' }],
  briefing: [
    { who: 'bram', text: 'Before that routine runs every morning on my ship, brief me.' },
  ],
  install: [
    { who: 'lantern', text: 'Drift fix installed. It re-squares my attitude frame at the start of every watch.' },
  ],
  installMine: [{ who: 'lantern', text: 'Running on your Gram–Schmidt.' }],
  installBackup: [{ who: 'lantern', text: 'Running on my backup routine.' }],
  installAfter: [
    { who: 'lantern', text: 'The Anchor’s arms, squared up in order: (1, 0, 0), (0, 1, 0), (0, 0, 1). Our own grid.', say: 'The Anchor’s arms, squared up in order: one, zero, zero; zero, one, zero; zero, zero, one. Our own grid.' },
    { who: 'ilse', text: 'Of course. Its second arm leans along the first. Take that lean away and nothing is left to disagree about.' },
  ],
  teoAsk: [
    { who: 'lantern', text: 'The stern channel buffer holds one more message from Teo. Recorded the hour before the Collapse.' },
    { who: 'wren', text: 'Play it.' },
  ],
  teoSent: [
    { who: 'lantern', text: 'Message sent into the stern channel. Repeating every ninety seconds. No reply.' },
    { who: 'wren', text: 'Keep it repeating. He’s stubborn. He’ll be listening.' },
  ],
};
