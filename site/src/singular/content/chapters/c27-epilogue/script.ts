// Epilogue: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'All twelve thousand sleepers stable. The Anchor is dark. Its spires still answer.' },
    { who: 'ilse', text: 'One setting left. Three spires, nine numbers. This time I want them to do nothing at all.' },
    { who: 'wren', text: 'Nothing? After all of this?' },
    { who: 'ilse', text: 'Nothing is the hardest thing to set. Navigator, check my numbers before I lock them.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Every buoy is exactly where it was. The setting is the identity.' },
    { who: 'ilse', text: 'And it reads the same in my grid, in yours, in any grid at all. Locking it.' },
  ],
  lock: [
    { who: 'lantern', text: 'Final pulse in three. Two. One.' },
  ],
  still: [
    { who: 'bram', text: 'Nothing moved.' },
    { who: 'wren', text: 'Nothing moved. I have never been so glad to see nothing.' },
  ],
  broadcastIntro: [
    { who: 'ilse', text: 'Before they wake, someone should explain how this place works. In words they can check.' },
    { who: 'bram', text: 'Not formulas. Reasons. The way you explained them to me.' },
    { who: 'lantern', text: 'Recording. Your Field Manual pages are on the table.' },
  ],
  questionsIntro: [
    { who: 'ilse', text: 'Six questions I could not answer three years ago. Build me each answer.' },
  ],
  questionsOut: [
    { who: 'ilse', text: 'Six answers, each one built from nothing. That is how I wanted it written down.' },
  ],
  layerIntro: [
    { who: 'vell', text: 'One more thing before I take the record home. Its stars come in two kinds: a tight cluster, and a ring around it.' },
    { who: 'vell', text: 'No single matrix and one straight cut can sort them. I tried. Can you do better with a few more steps?' },
  ],
  layerWin: [
    { who: 'lantern', text: 'Four outputs, negatives set to zero, added up. A cut at that level sorts every star.' },
    { who: 'vell', text: 'A move, a clip, a sum. Stack enough of those and you can sort almost anything.' },
  ],
  ending: [
    { who: 'lantern', text: 'Wake cycle started on every deck.' },
    { who: 'vell', text: 'Two numbers per entry. It will have to be enough.' },
    { who: 'wren', text: 'Take us home, Nav.' },
    { who: 'bram', text: 'Every point stays where it is.' },
  ],
  postCredits: [
    { who: 'ilse', text: 'The third component. Spread one point five. This one is not noise either.' },
  ],
};
