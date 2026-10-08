// Chapter 4: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Twelve beacon signals on the ark\'s bearing. One is the *Meridian*\'s. Eleven are echoes off the debris.' },
    { who: 'wren', text: 'Her beacon\'s in there somewhere. Without it we can\'t read her. Which one, LANTERN?' },
    { who: 'lantern', text: 'Unknown. The dish reading rises as the dish lines up with a signal. Loud echoes read high too.' },
    { who: 'bram', text: 'So the loudest light is not the answer. That would have been too easy.' },
    { who: 'wren', text: 'Nav, it\'s your dish. Find her beacon.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Dish calibration. Test signal: two across, four up. Grid arrow one reads two. Grid arrow two reads four.' },
  ],
  p1Win: [{ who: 'lantern', text: 'Reading ten. Three times the first reading, plus one times the second.' }],
  p2Intro: [
    { who: 'wren', text: 'Can the dish point somewhere and hear nothing at all? I want to know where the blind spot is.' },
  ],
  p2Win: [
    { who: 'wren', text: 'Dead quiet. Did we lose the signal?' },
    { who: 'lantern', text: 'Signal strength unchanged. The dish arrow is at a right angle to it.' },
  ],
  p3Intro: [
    { who: 'bram', text: 'Two numbers on that panel that always agree. I want to know why before I trust either one.' },
  ],
  p3Win: [{ who: 'lantern', text: 'Both readouts agree for every pair. The dot product is the two lengths times the cosine of the angle.' }],
  p4Intro: [
    { who: 'lantern', text: 'The ark is in view. Its spine runs along one, zero, one. Our heading is one, one, zero.' },
    { who: 'wren', text: 'I want us parallel to her spine before we close in. How far do I turn?' },
  ],
  p4Win: [{ who: 'wren', text: 'Spine dead ahead. One turn, no correction. Nice.' }],
  p5Intro: [
    { who: 'lantern', text: 'Test bench. Three signals and the ark\'s pattern, three, four. A lock needs a reading of exactly one: the same direction.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Candidate a locked. Same direction as the pattern. The loud one, c, points about thirty-seven degrees away.', say: 'Candidate A, locked. Same direction as the pattern. The loud one, C, points about thirty-seven degrees away.' },
  ],
  p6Intro: [
    { who: 'bram', text: 'Before I trust the dish with the real thing, I want one shadow worked out by hand. Every number.' },
  ],
  p6Win: [{ who: 'bram', text: 'Square at the foot. A shadow that lands where you said it would.' }],
  p7Win: [{ who: 'bram', text: 'Six shakes held, and the cosine says why. A shadow is never longer than its arrow.' }],
  briefing: [
    { who: 'bram', text: 'The beacon matcher goes in tonight. Brief me first.' },
  ],
  install: [
    { who: 'lantern', text: 'Beacon matcher installed. Two hundred signatures on the ark\'s bearing now, logged since the first sweep. Ranking each one by its angle to the ark\'s pattern.' },
  ],
  installMine: [{ who: 'lantern', text: 'Running on your dot product.' }],
  installBackup: [{ who: 'lantern', text: 'Running on my backup routines.' }],
  lock: [
    { who: 'lantern', text: 'Top match: one point zero zero. Beacon locked. It is the *Meridian*\'s.' },
    { who: 'wren', text: 'Got her. Keep the dish on it.' },
    { who: 'bram', text: 'Her beacon was one of the quietest on the list. We would never have picked it by volume.' },
    { who: 'lantern', text: 'The ark is tumbling. A docking approach must match the tumble.' },
    { who: 'wren', text: 'Then we spin with her. Next problem.' },
  ],
};
