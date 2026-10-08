// Chapter 16: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'The cutter’s scanner is sweeping the stern.' },
    { who: 'vell', text: 'My people will log what is left of your ark before anyone touches the Anchor. Your navigator may watch.' },
    { who: 'lantern', text: 'Scanner report, two-decimal model. Three directions went into the pulse. Two came out.' },
    { who: 'wren', text: 'And the third?' },
    { who: 'lantern', text: 'Flattened.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Vell’s scanner lists four strut directions in the stern sheet: (1, 0, 1), (0, 1, 1), (1, 1, 2) and (2, 1, 3).', say: 'Vell’s scanner lists four strut directions in the stern sheet: one, zero, one; zero, one, one; one, one, two; and two, one, three.' },
    { who: 'bram', text: 'Four arrows for one flat sheet. Keep the fewest that still cover it, Nav. I don’t pay for spares.' },
  ],
  p1Win: [
    { who: 'lantern', text: 'Two arrows, not on one line, reach the whole sheet. Any two of the four will do.' },
    { who: 'bram', text: 'Two. Every way you pick them, two.' },
  ],
  p2Intro: [
    { who: 'lantern', text: 'The cutter’s survey scanner: three readings from four inputs. Its matrix is on the row board.' },
    { who: 'vell', text: 'Count what my scanner keeps, Navigator. Then count what it throws away.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'Two pivot columns: two directions kept. Two free columns: two directions flattened. Two plus two is four columns.' },
  ],
  p3Intro: [
    { who: 'vell', text: 'My scanner reduced that matrix and took its pivot columns. There is your plane.' },
    { who: 'bram', text: 'Then why does every column he gave it stick out of the thing?' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Every column of the scanner matrix lies on the plane through (1, 2, 3) and (0, 1, 1): the plane $z = x + y$.', say: 'Every column of the scanner matrix lies on the plane through one, two, three, and zero, one, one: the plane z equals x plus y.' },
    { who: 'bram', text: 'Same sheet as the stern. His scanner drew the wrong one.' },
  ],
  p4Intro: [
    { who: 'vell', text: 'I want a new scanner built to order. Three readings. My technicians have a list of specifications.' },
    { who: 'lantern', text: 'Checking each order against the counter before anything is built.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'One order built. Two orders refused: kept plus flattened must be the number of columns, and three rows keep at most three.' },
    { who: 'vell', text: 'Noted. I will tell my technicians.' },
  ],
  p5Intro: [
    { who: 'bram', text: 'Mid-section struts are bending under the strain. LANTERN logs each bend as a curve.' },
    { who: 'lantern', text: 'Each bend profile is $a + bt + ct^2$ along the strut. I store three numbers: $(a, b, c)$.', say: 'Each bend profile is a plus b t plus c t squared along the strut. I store three numbers: a, b, c.' },
    { who: 'bram', text: 'I want the rate of bend. Same three numbers, Nav. Make it a matrix.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'The rate-of-bend rule is a matrix. It flattens the constant profiles to zero: a strut bent the same amount everywhere has no rate of bend.' },
  ],
  p6Intro: [
    { who: 'bram', text: 'Two plus two made four. Two plus one made three. I want to know it always works before I lean on it.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Six matrices. Every column was a pivot column or a free column, never both, never neither.' },
  ],
  p7Intro: [
    { who: 'bram', text: 'Our two thrusters cover one plane. Remember the third mount, Nav? Show me where it has to point.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'Three arrows, none on the plane of the other two: they reach every point.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Vell keeps quoting numbers at us. I want ours straight first.' },
  ],
  installMine: [{ who: 'lantern', text: 'Survey scanner running on your rank routine.' }],
  installBackup: [{ who: 'lantern', text: 'Survey scanner running on my backup routine.' }],
  install: [
    { who: 'lantern', text: 'Survey of the stern, two-decimal model: three directions in, two kept, one flattened.' },
  ],
  spIntro: [
    { who: 'vell', text: 'Before we go any further, a review. Your navigator, my scanner, the same numbers.' },
    { who: 'vell', text: 'Here is a second matrix: the one my people use on debris. Three readings from three inputs. Show me where everything goes.' },
  ],
  sp1Win: [
    { who: 'lantern', text: 'In the inputs: the plane through the rows, and the null space, the line at right angles to it. In the outputs: the column space and the line at right angles to it.' },
    { who: 'lantern', text: 'Two kept directions on each side.' },
  ],
  sp2Intro: [
    { who: 'vell', text: 'Now your own pulse. The two-decimal model. Tell me everything that is wrong with it.' },
  ],
  sp2Win: [
    { who: 'lantern', text: 'Eleven statements about the two-decimal model. Each one checked by a construction. They are one fact.' },
  ],
  reviewIntro: [
    { who: 'vell', text: 'Four claims, Navigator. Answer each one the way your engineer likes: with something built.' },
  ],
  low: [
    { who: 'vell', text: 'You can’t run a flattened ark backwards. Your own maths says so.' },
    { who: 'vell', text: 'We start on the Anchor at the next quiet hour.' },
  ],
  lowAirlock: [
    { who: 'bram', text: 'Wren.' },
    { who: 'wren', text: 'Don’t. Not yet.' },
  ],
  log: [
    { who: 'lantern', text: 'A log file has surfaced in the ark’s buffer. Dr Varga.' },
    { who: 'ilselog', text: 'The third spire is bending again. If it reaches the second, I cannot stop what the next pulse does.' },
    { who: 'lantern', text: 'Recorded nine days ago.' },
    { who: 'wren', text: 'Nine days.' },
  ],
};
