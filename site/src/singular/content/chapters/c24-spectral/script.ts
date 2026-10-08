// Chapter 24: every voiced line. Plain data; numbers come from logic.ts / truth.ts.
import type { Line } from '../../lines';
import { fmtD, fmtN, fmtV, sayV, P1_LINES, P4_VALUES, VELL_LINES, BRACES } from './logic.ts';

const sv = BRACES.values.map((x) => fmtD(x, 2));

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Fit complete. The Collapse pulse is known to three decimals. The stern is still a sheet.' },
    { who: 'wren', text: 'And Teo is still inside it. Knocking.' },
    { who: 'bram', text: 'Then nobody touches that hull until it is braced. Pull a flat frame open the wrong way and it tears.' },
    { who: 'wren', text: 'Braced where?' },
    { who: 'bram', text: 'Along the lines where the stress only pushes or pulls. No twisting along them. Find me those lines, Nav.' },
    { who: 'lantern', text: 'Stress readings are coming in from the stern panels. Every panel’s matrix is symmetric.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'Panel one. Its stress matrix: 3, 1; 1, 3.', say: 'Panel one. Its stress matrix: three, one. One, three.' },
    { who: 'bram', text: 'Turn a test arrow round. Where the stress pushes straight along the arrow, that is a brace line.' },
  ],
  p1Win: [
    { who: 'lantern', text: `Two brace lines. Along ${fmtV(P1_LINES[0].dir)} the stress is ${fmtN(P1_LINES[0].value)}. Along ${fmtV(P1_LINES[1].dir)} it is ${fmtN(P1_LINES[1].value)}. They meet at a right angle.`, say: `Two brace lines. Along ${sayV(P1_LINES[0].dir)}, the stress is four. Along ${sayV(P1_LINES[1].dir)}, it is two. They meet at a right angle.` },
    { who: 'bram', text: 'Five shakes, five right angles. And now the reason. That I can bolt on.' },
  ],
  p2Intro: [
    { who: 'lantern', text: 'Panel two. Its strain energy at each point is E = 2x² + 2xy + 2y².', say: 'Panel two. Its strain energy at each point is E equals two x squared, plus two x y, plus two y squared.' },
    { who: 'bram', text: 'That xy term mixes the two directions. Turn the survey grid until it goes away.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'The mixed term is zero at 45 degrees. In the turned grid, E = 3u² + v².', say: 'The mixed term is zero at forty-five degrees. In the turned grid, E equals three u squared, plus v squared.' },
    { who: 'wren', text: 'Same panel. Simpler numbers.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'Panel three is damaged. Its matrix: 1, 2; 2, 1. Every entry is positive.', say: 'Panel three is damaged. Its matrix: one, two. Two, one. Every entry is positive.' },
    { who: 'bram', text: 'Drop a probe on its energy surface. Downhill is where the panel gives way.' },
  ],
  p3Win: [
    { who: 'lantern', text: 'Panel three is a saddle: the probe left along (1, −1). Panel four is a bowl: the probe rests at its lowest point.', say: 'Panel three is a saddle: the probe left along one, minus one. Panel four is a bowl: the probe rests at its lowest point.' },
    { who: 'bram', text: 'Every entry positive, and still a saddle. The signs that count are the eigenvalues.' },
  ],
  p4Intro: [
    { who: 'lantern', text: 'A stress block in three dimensions: 2, 1, 1; 1, 2, 1; 1, 1, 2. One of its eigenvalues appears twice.', say: 'A stress block in three dimensions. Two, one, one. One, two, one. One, one, two. One of its eigenvalues appears twice.' },
    { who: 'bram', text: 'Twice means a whole plane of directions to choose from. I still want three braces at right angles. By hand, Nav.' },
  ],
  p4Win: [
    { who: 'lantern', text: `Eigenvalues ${P4_VALUES.map(fmtN).join(', ')}. Braces along (1, 1, 1), (1, −1, 0) and (1, 1, −2), at right angles. Adding the three pieces gives back the block.`, say: 'Eigenvalues four, one, one. Braces along one, one, one; one, minus one, zero; and one, one, minus two, at right angles. Adding the three pieces gives back the block.' },
    { who: 'bram', text: 'The plane gave us a choice. Gram–Schmidt made it a good one.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'Panel two again. A probe on a circle one unit out. Find where on the circle the energy is highest, and where it is lowest.' },
    { who: 'wren', text: 'Walk it round. I will watch the numbers.' },
  ],
  p5Win: [
    { who: 'lantern', text: 'Highest: 3, at (1, 1)/√2. Lowest: 1, at (1, −1)/√2. The two eigenvalues, at their eigenvectors.', say: 'Highest: three, at one, one, over root two. Lowest: one, at one, minus one, over root two. The two eigenvalues, at their eigenvectors.' },
    { who: 'bram', text: 'So the extremes sit on the brace lines. Good.' },
  ],
  p6Intro: [
    { who: 'wren', text: 'Now the spin. A drone docks every few minutes, and every dock shoves us off station.' },
    { who: 'lantern', text: 'The Lantern’s inertia matrix, in hundred-thousands of kilogram square metres: 4, −2, 0; −2, 4, 0; 0, 0, 9.', say: 'The Lantern’s inertia matrix, in hundred-thousands of kilogram square metres: four, minus two, zero. Minus two, four, zero. Zero, zero, nine.' },
    { who: 'bram', text: 'Symmetric. So she has three axes at right angles. Pick one to spin about, Nav, and hold it ten minutes.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Ten minutes. The spin axis held.' },
    { who: 'wren', text: 'Steady. I can dock drones on that.' },
  ],
  p6Flip: [
    { who: 'bram', text: 'The middle axis. Everyone tries the middle one once.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. Three more surfaces: an upside-down bowl, a trough, and the stress block’s lowest point on a sphere.' },
  ],
  p7Win: [
    { who: 'lantern', text: 'Upside-down bowl: both eigenvalues negative. Trough: one eigenvalue zero, a whole line of lowest points. On the sphere the block’s lowest value is 1, all round the circle x + y + z = 0.', say: 'Upside-down bowl: both eigenvalues negative. Trough: one eigenvalue zero, a whole line of lowest points. On the sphere, the block’s lowest value is one, all round the circle x plus y plus z equals zero.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Before a single brace goes on that stern, I want this in your words.' },
  ],
  bracesIntro: [
    { who: 'lantern', text: 'Brace planner. The stern’s stress matrix is the Collapse pulse itself, as the fit reads it. It is symmetric.' },
  ],
  bracesMine: [{ who: 'lantern', text: 'Computed with your sym_eigen. Three brace lines, at right angles.', say: 'Computed with your sym eigen. Three brace lines, at right angles.' }],
  bracesBackup: [{ who: 'lantern', text: 'Computed with my backup routine. Three brace lines, at right angles.' }],
  bracesOut: [
    { who: 'lantern', text: `Stretches along them: ${sv.join(', ')}. To two decimal places.`, say: `Stretches along them: ${sv.map((x) => x.replace('.', ' point ')).join(', ')}. To two decimal places.` },
    { who: 'vell', text: 'Three lines at right angles. My pulse had those too.' },
    { who: 'lantern', text: `Director Vell’s pulse is symmetric. Its lines ${VELL_LINES.map(fmtV).join(', ')} are at right angles.`, say: `Director Vell’s pulse is symmetric. Its lines ${VELL_LINES.map(sayV).join('; ')}, are at right angles.` },
    { who: 'bram', text: 'Braces are on. Now tell me what that zero really is.' },
    { who: 'wren', text: 'He is knocking again. Three short, three long, three short.' },
  ],
};
