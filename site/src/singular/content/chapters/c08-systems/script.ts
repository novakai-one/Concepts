// Chapter 8: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  cold: [
    { who: 'lantern', text: 'Inside the *Meridian*. No power. No light. Switching to scan view.' },
    { who: 'wren', text: 'Twelve thousand pods in here. Which one is his?' },
    { who: 'lantern', text: 'One pod is sending a weak ping. Tag: Okafor, T. Pod status light: amber. Meaning not on file.' },
    { who: 'wren', text: 'Amber. Fine. Where is it?' },
    { who: 'lantern', text: 'Three fan-beam sensors heard the ping. Each one sweeps a flat beam through the hull. Each logged where its beam was when the ping arrived.' },
    { who: 'bram', text: 'So each sensor gives us one flat slice of the ship. The pod is somewhere on that slice.' },
    { who: 'wren', text: 'And on the other two slices. Nav, find the place all three agree on.' },
  ],
  warmup: [
    { who: 'bram', text: 'Before we hunt in three dimensions, a flat warm-up on the holotable. Two equations, two unknowns.' },
    { who: 'lantern', text: 'Left: each equation drawn as a line. Right: the same numbers read down the columns, as two arrows mixed to reach a target. Moving one picture moves the other.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'The point (3, 2) is on both lines. And 3 of the green arrow plus 2 of the red arrow reaches (5, 1).', say: 'The point three, two is on both lines. And three of the green arrow plus two of the red arrow reaches five, one.' },
    { who: 'bram', text: 'Same two numbers in both pictures. Hold on to that.' },
  ],
  pod: [
    { who: 'lantern', text: 'Fan-beam planes loaded. Plane one: $x + y + z = 6$. Plane two: $2y + 5z = -4$. Plane three: $2x + 5y - z = 27$.', say: 'Fan-beam planes loaded. Plane one: x plus y plus z equals six. Plane two: two y plus five z equals minus four. Plane three: two x plus five y minus z equals twenty-seven.' },
    { who: 'wren', text: 'Put the marker where all three meet, Nav. That is where he is.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Marker at (5, 3, −2). On all three planes. That is deck five, pod bay three.', say: 'Marker at five, three, minus two. On all three planes. That is deck five, pod bay three.' },
    { who: 'wren', text: 'That is him. Hang on, Teo.' },
  ],
  two: [
    { who: 'lantern', text: 'The backup sensors report three more planes. A cross-check.' },
    { who: 'wren', text: 'I have been playing with those. Exactly two spots sit on all three planes. Exactly two.' },
    { who: 'bram', text: 'Exactly two. Nav, show her what two spots bring with them.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Every point on the line through the two markers is on all three planes. Between them and beyond them.' },
    { who: 'wren', text: 'So not two. A whole line of places.' },
    { who: 'bram', text: 'Two never come alone. They bring the line through them.' },
  ],
  prism: [
    { who: 'lantern', text: 'Backup sensor three recalibrated. Its last number moves from 4 to 5.', say: 'Backup sensor three recalibrated. Its last number moves from four to five.' },
    { who: 'bram', text: 'One number. Watch what it does to where they meet.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Looking along the three lines where pairs of planes meet. They run side by side and never touch. No point is on all three planes.' },
    { who: 'bram', text: 'A tube with three flat walls. Nothing is on all three walls at once.' },
  ],
  replay: [
    { who: 'bram', text: 'Back to the flat warm-up for a moment. Two pictures, one question. They need names.' },
  ],
  tanks: [
    { who: 'lantern', text: 'Three ballast tanks under the pod bay: A, B and C. Their gauges are dark. The logbook gives three rules.' },
    { who: 'lantern', text: 'Together they hold 13 tonnes. Tank B holds 1 tonne more than tank A. Tank C holds 2 tonnes more than tank B.', say: 'Together they hold thirteen tonnes. Tank B holds one tonne more than tank A. Tank C holds two tonnes more than tank B.' },
    { who: 'wren', text: 'Turn the words into planes, Nav. If they meet, we know what is in the tanks.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'The planes meet at (3, 4, 6). Tank A: 3 tonnes. Tank B: 4. Tank C: 6. Total: 13.', say: 'The planes meet at three, four, six. Tank A: three tonnes. Tank B: four. Tank C: six. Total: thirteen.' },
    { who: 'bram', text: 'Words to equations, equations to planes. And the columns tell the same story.' },
  ],
  brief: [
    { who: 'bram', text: 'Holotable, Nav. Before I trust a marker on three planes, I want it in your words.' },
  ],
  close: [
    { who: 'lantern', text: 'Checking the pod position. Each equation at (5, 3, −2) is off by 0, 0 and 0. Confirmed: deck five, pod bay three.', say: 'Checking the pod position. Each equation at five, three, minus two is off by zero, zero and zero. Confirmed: deck five, pod bay three.' },
    { who: 'wren', text: 'Then let us go.' },
    { who: 'lantern', text: 'Pod bay three has no power. Its door will not open.' },
    { who: 'bram', text: 'Ilse\'s log said to start with the power equations. Where is the power board?' },
    { who: 'lantern', text: 'Deck seven. Two decks up.' },
    { who: 'wren', text: 'Then we climb.' },
  ],
  closeYours: [
    { who: 'lantern', text: 'Running your check function on the pod position.' },
  ],
  closeBackup: [
    { who: 'lantern', text: 'Running my backup check routine on the pod position.' },
  ],
};
