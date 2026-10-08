// Chapter 6: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Tumble matched. Holding station two hundred metres off the ark\'s hull.' },
    { who: 'lantern', text: 'The hull is a frame of boxes. Each box is held open by three struts from one node.' },
    { who: 'bram', text: 'Every pulse leans those boxes over. A box that leans still holds air. A box that folds flat holds nothing.' },
    { who: 'wren', text: 'Twelve thousand people sleep inside that frame. Is it still holding?' },
    { who: 'lantern', text: 'Unknown. I can read strut directions. My routine for turning three struts into one volume was lost in the first pulse.' },
    { who: 'bram', text: 'Then we rebuild it on the bench. Nav, start with one box.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Test box on the holotable. Struts: two along, three across, four up, at right angles.' },
    { who: 'lantern', text: 'A pulse is due. It will lean the box over.' },
  ],
  p1Win: [{ who: 'bram', text: 'Leaned three ways, and it held twenty-four every time. The top never left its deck.' }],
  p2Intro: [{ who: 'bram', text: 'Twenty-four, every time. I don\'t trust a number until I know where it comes from.' }],
  p2Win: [{ who: 'lantern', text: 'Base area six. Height four. Volume twenty-four. The length of the raised arrow cancels.' }],
  p3Intro: [
    { who: 'lantern', text: 'One node in Section C, the aft cargo truss. Struts: two, one, zero. Zero, one, two. One, one, one.', say: 'One node in Section C, the aft cargo truss. Struts: two, one, zero. Zero, one, two. One, one, one.' },
    { who: 'wren', text: 'Is that one holding?' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Brace set. The node holds six.' },
    { who: 'bram', text: 'It was flat. The third strut lay in the plane of the other two. Now it stands up.' },
  ],
  p4Intro: [
    { who: 'wren', text: 'Docking clamps on the outer frame. Four of them. They only latch if all four sit on one plane.' },
    { who: 'lantern', text: 'I measured from the origin. Minus one. Not flat.' },
    { who: 'bram', text: 'The origin isn\'t one of the clamps, LANTERN.' },
  ],
  p4Win: [{ who: 'lantern', text: 'Clamps latched. After the strike, the tetrahedron P Q R S holds one third.' }],
  p5Intro: [
    { who: 'lantern', text: 'Node seven logs minus twenty-four. Every other node logs a positive number.' },
    { who: 'bram', text: 'Negative space? That box looks fine from here.' },
  ],
  p5Win: [{ who: 'lantern', text: 'Node seven logs plus twenty-four. Its struts were logged across, along, up. The rule is along, across, up.' }],
  p6Intro: [{ who: 'bram', text: 'The sensor housing is the corner of a box: a tetrahedron on three struts. Work it out by hand.' }],
  p6Win: [{ who: 'bram', text: 'Four. One sixth of the box, and I watched it split.' }],
  p7Win: [{ who: 'bram', text: 'Shook it every way I could. Turning the order round never changed the number.' }],
  briefing: [{ who: 'bram', text: 'The strut scan runs on all five thousand nodes tonight. Brief me before I trust it.' }],
  install: [{ who: 'lantern', text: 'Strut scan installed. Five thousand hull nodes, three struts each.' }],
  installMine: [{ who: 'lantern', text: 'Running on your triple.' }],
  installBackup: [{ who: 'lantern', text: 'Running on my backup routines.' }],
  scan: [
    { who: 'lantern', text: 'Scan complete. 646 boxes flat. Every one of them is in Section C.', say: 'Scan complete. Six hundred and forty-six boxes flat. Every one of them is in Section C.' },
    { who: 'bram', text: 'Not one box. All of Section C. It holds nothing.' },
    { who: 'wren', text: 'Is anyone in there?' },
    { who: 'lantern', text: 'Section C carries cargo pods. No sleepers.' },
    { who: 'bram', text: 'Then we seal it, and the rest of her holds. For now.' },
    { who: 'wren', text: 'Good. Then we go in. Nav, find me the door.' },
  ],
};
