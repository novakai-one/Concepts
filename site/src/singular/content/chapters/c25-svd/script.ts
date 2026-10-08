// Chapter 25: every voiced line. Plain data; numbers come from logic.ts / truth.ts.
import type { Line } from '../../lines';
import { CONDITION, P1_SIGMA, P3_T2, P5_K, READINGS, RAW_ERROR, SPIRE_LENGTHS, SV2, SV6, TEAR, TEO_WORDS, fmtD, storage } from './logic.ts';

const sp = (x: string) => x.replace('.', ' point ');

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Braces holding. The fitted Collapse pulse is on the holotable.' },
    { who: 'bram', text: 'Before we undo anything, I want to see what it does. All of it, in one picture.' },
    { who: 'wren', text: 'And Teo. His knocks come through. His voice does not.' },
    { who: 'lantern', text: 'His channel is too thin for speech. A voice is too many numbers per second.' },
    { who: 'ilse', text: 'Then we send fewer numbers. The right ones.' },
  ],
  p1Intro: [
    { who: 'lantern', text: 'A test move first. A circle of buoys one unit out, and the move A: 3, 0; 4, 5.', say: 'A test move first. A circle of buoys one unit out, and the move A: three, zero. Four, five.' },
    { who: 'bram', text: 'It turns the circle into an oval. Find the two arrows that land on its long and short axes.' },
  ],
  p1Win: [
    { who: 'lantern', text: `In: (1, 1)/√2 and (1, −1)/√2, at a right angle. Out: still at a right angle, ${fmtD(P1_SIGMA[0])} and ${fmtD(P1_SIGMA[1])} long. Their product is 15, the size of det A.`, say: `In: one, one, over root two, and one, minus one, over root two, at a right angle. Out: still at a right angle, ${sp(fmtD(P1_SIGMA[0]))} and ${sp(fmtD(P1_SIGMA[1]))} long. Their product is fifteen, the size of det A.` },
    { who: 'wren', text: 'Two arrows in, two arrows out. Still square to each other.' },
  ],
  p2Intro: [
    { who: 'bram', text: 'Why those two? If every move does this, I want the reason.' },
    { who: 'lantern', text: 'Build AᵀA. It is symmetric.', say: 'Build A transpose A. It is symmetric.' },
  ],
  p2Win: [
    { who: 'lantern', text: 'AᵀA has eigenvalues 45 and 5: the squares of the two lengths. Its eigenvectors are perpendicular, and A keeps them perpendicular.', say: 'A transpose A has eigenvalues forty-five and five: the squares of the two lengths. Its eigenvectors are perpendicular, and A keeps them perpendicular.' },
    { who: 'bram', text: 'Symmetric, so right angles. The braces taught us that.' },
  ],
  p3Intro: [
    { who: 'lantern', text: 'Any move as three moves: a turn, a stretch along the axes, a turn. Put the three on the rail.' },
  ],
  p3Win: [
    { who: 'lantern', text: `Turn by −45°. Stretch by ${fmtD(P1_SIGMA[0])} and ${fmtD(P1_SIGMA[1])}. Turn by ${fmtD(P3_T2)}°. The circle lands on the oval exactly.`, say: `Turn by minus forty-five degrees. Stretch by ${sp(fmtD(P1_SIGMA[0]))} and ${sp(fmtD(P1_SIGMA[1]))}. Turn by ${sp(fmtD(P3_T2))} degrees. The circle lands on the oval exactly.` },
    { who: 'wren', text: 'Turn, stretch, turn. Even for that lopsided one.' },
  ],
  p4Intro: [
    { who: 'lantern', text: 'A move from the flat plane into space: three rows, two columns. 1, 1; 0, 1; 1, 0.', say: 'A move from the flat plane into space: three rows, two columns. One, one. Zero, one. One, zero.' },
    { who: 'bram', text: 'Square or not, the same three moves. By hand, Nav.' },
  ],
  p4Win: [
    { who: 'lantern', text: 'Stretches √3 and 1. In: (1, 1)/√2 and (1, −1)/√2. Out: (2, 1, 1)/√6 and (0, −1, 1)/√2.', say: 'Stretches root three and one. In: one, one, over root two, and one, minus one, over root two. Out: two, one, one, over root six, and zero, minus one, one, over root two.' },
  ],
  p5Intro: [
    { who: 'lantern', text: 'Teo’s channel. One second of his voice is 64 frequencies by 32 time slices. The channel carries 800 numbers a second.', say: 'Teo’s channel. One second of his voice is sixty-four frequencies by thirty-two time slices. The channel carries eight hundred numbers a second.' },
    { who: 'ilse', text: 'Send it in layers. Each layer is one column of numbers times one row. The biggest first.' },
    { who: 'wren', text: 'Get me his voice.' },
  ],
  p5Win: [
    { who: 'teo', text: TEO_WORDS },
    { who: 'wren', text: 'It is me. Hold on, Teo. We are right outside.' },
    { who: 'lantern', text: `Eight layers: ${storage(P5_K)} numbers a second. The voice fits in the channel.`, say: `Eight layers: ${storage(P5_K)} numbers a second. The voice fits in the channel.` },
  ],
  p6Intro: [
    { who: 'lantern', text: `The fitted Collapse pulse, as three moves. Stretches: ${SV2.join(', ')}.`, say: `The fitted Collapse pulse, as three moves. Stretches: ${SV2.map(sp).join(', ')}.` },
    { who: 'vell', text: 'Zero is zero. A flat stern is a flat stern.' },
  ],
  p6Win: [
    { who: 'lantern', text: `To six decimals: ${SV6.join(', ')}. The stern is one seven-hundred-and-fiftieth of its old thickness.`, say: `To six decimals: three point zero zero two six seven, one point zero, and zero point zero zero one three three three. The stern is one seven-hundred-and-fiftieth of its old thickness.` },
    { who: 'bram', text: 'Thin. Not gone.' },
  ],
  thin: [
    { who: 'vell', text: 'Six decimals.' },
    { who: 'vell', text: 'Then I was wrong about one number.' },
    { who: 'wren', text: 'Teo, can you hear me? You are thin. You are not gone.' },
  ],
  p7Intro: [
    { who: 'lantern', text: 'Optional. A move that flattens the plane onto a line: 1, 1; 1, 1. No input lands on (2, 0). Find the shortest input that lands closest.', say: 'Optional. A move that flattens the plane onto a line: one, one, one, one. No input lands on two, zero. Find the shortest input that lands closest.' },
  ],
  p7Win: [
    { who: 'lantern', text: '(0.5, 0.5): the shortest of all the closest answers. V Σ⁺ Uᵀ finds it: flip each stretch that is not zero, and leave the zeros at zero.', say: 'Zero point five, zero point five: the shortest of all the closest answers. V sigma plus U transpose finds it: flip each stretch that is not zero, and leave the zeros at zero.' },
  ],
  briefing: [
    { who: 'bram', text: 'Holotable. Every move keeps two arrows at right angles. Tell me why, before we bet the stern on it.' },
  ],
  svdRerun: [
    { who: 'lantern', text: `Show more decimals, rerun with your svd: ${SV6.join(', ')}. Still thin, not flat.`, say: 'Show more decimals, rerun with your S V D: three point zero zero two six seven, one point zero, and zero point zero zero one three three three. Still thin, not flat.' },
  ],
  teoAsk: [
    { who: 'lantern', text: 'Teo’s channel, rebuilt from eight layers.' },
  ],
  teoMine: [{ who: 'lantern', text: 'Rebuilt with your low_rank.', say: 'Rebuilt with your low rank.' }],
  teoMineBoth: [{ who: 'lantern', text: 'Rebuilt with your low_rank, running on your svd.', say: 'Rebuilt with your low rank, running on your S V D.' }],
  teoBackup: [{ who: 'lantern', text: 'Rebuilt with my backup routine.' }],
  teoAsk2: [
    { who: 'wren', text: 'He is asking you, Nav. Keep it short. He has to hold still for it.' },
  ],
  teoSent: [
    { who: 'teo', text: `${READINGS}. I can count that high. Holding still. Tell me when it is over.`, say: 'Six hundred and twenty-five. I can count that high. Holding still. Tell me when it is over.' },
    { who: 'wren', text: 'We will. Every one of them.' },
  ],
  sp1Intro: [
    { who: 'bram', text: 'First the honest test. Build the undo from the readings we have and fire it at a cluster of test buoys.' },
    { who: 'lantern', text: 'Every reading carries noise of 0.01.', say: 'Every reading carries noise of zero point zero one.' },
  ],
  sp1Win: [
    { who: 'lantern', text: `The cluster landed ${fmtD(RAW_ERROR, 1)} off, along the thin line: noise of 0.01, multiplied by 750.`, say: 'The cluster landed seven point five off, along the thin line: noise of zero point zero one, multiplied by seven hundred and fifty.' },
    { who: 'bram', text: 'Do that to the stern and it tears in two.' },
  ],
  sp2Intro: [
    { who: 'vell', text: 'Then undo the two-decimal model instead. It is clean. There is no noise in it.' },
  ],
  sp2Win: [
    { who: 'lantern', text: 'The two-decimal model has no inverse. Rank 2. Two points a step apart along (1, 1, −1) land on one spot, and nothing can tell them apart.', say: 'The two-decimal model has no inverse. Rank two. Two points a step apart along one, one, minus one, land on one spot, and nothing can tell them apart.' },
    { who: 'ilse', text: 'Exactly zero is gone, by anyone. Tiny is still there, under noise.' },
  ],
  sp3Intro: [
    { who: 'lantern', text: `Averaging N readings divides the noise by the square root of N. The frame tears if any point lands more than ${fmtD(TEAR, 1)} off.`, say: 'Averaging N readings divides the noise by the square root of N. The frame tears if any point lands more than zero point three off.' },
    { who: 'wren', text: 'And Teo has to hold still through every one of them.' },
  ],
  sp3Win: [
    // no numbers here: any N from 625 to 700 wins, and the on-screen message gives the player's own error
    { who: 'lantern', text: 'Enough readings. The error is inside the tear limit. The drones are counting.' },
    { who: 'wren', text: 'One knock. He is holding.' },
  ],
  sp4Intro: [
    { who: 'bram', text: 'Two braces swung aside to let the drones in for the readings. The hinge one stayed put. Turn the other two back until nothing twists.' },
  ],
  sp4Win: [
    { who: 'lantern', text: 'Mixed stress near zero. The braces lie along the principal axes of the Collapse pulse.' },
  ],
  sp5Intro: [
    { who: 'ilse', text: 'The stern was flattened before my quarter turn. Today the Collapse reads R C R⁻¹, and the spires read the Anchor’s grid.', say: 'The stern was flattened before my quarter turn. Today the Collapse reads R C R inverse, and the spires read the Anchor’s grid.' },
    { who: 'ilse', text: 'Write the undo for today, then turn it into the Anchor’s numbers. I did that the wrong way once.' },
  ],
  sp5Win: [
    { who: 'lantern', text: `Settings: P⁻¹ R C⁻¹ R⁻¹ P. Two spires reach out ${Math.round(SPIRE_LENGTHS[0])} and ${Math.round(SPIRE_LENGTHS[2])}. The third stays at length 1.`, say: `Settings: P inverse, R, C inverse, R inverse, P. Two spires reach out ${Math.round(SPIRE_LENGTHS[0])} and ${Math.round(SPIRE_LENGTHS[2])}. The third stays at length one.` },
    { who: 'ilse', text: 'Right numbers. Right grid. This time.' },
  ],
  sp7Intro: [
    { who: 'lantern', text: 'Optional. The undo could fire as two gentler pulses instead of one.' },
  ],
  sp7Win: [
    { who: 'lantern', text: 'Each pulse takes the square root of the stretch: at most 27.4. Multiplied together they give 750, the full undo.', say: 'Each pulse takes the square root of the stretch: at most twenty-seven point four. Multiplied together they give seven hundred and fifty, the full undo.' },
    { who: 'bram', text: 'Good to know. The spires are already set.' },
  ],
  sp6Intro: [
    { who: 'lantern', text: `Readings averaged. Braces on the principal axes. Settings in the Anchor’s grid. Condition number ${Math.round(CONDITION)}, and the readings are clean enough for it.` },
    { who: 'wren', text: 'Teo. Hold on to something.' },
    { who: 'bram', text: 'Commit when you are ready, Nav.' },
  ],
  sp6Win: [
    { who: 'lantern', text: 'Hull error inside the tear limit.' },
  ],
  after: [
    { who: 'lantern', text: 'Stern volume restored. Pressure holding in every frame.' },
    { who: 'teo', text: 'Wren? Why is everyone so loud?' },
    { who: 'wren', text: 'Because we are all saying your name.' },
    { who: 'bram', text: 'Thin. Not gone. I am etching that one.' },
  ],
  crack: [
    { who: 'lantern', text: 'Warning. The Anchor’s core is cracked. The 750-times pulse was too much for it.', say: 'Warning. The Anchor’s core is cracked. The seven-hundred-and-fifty-times pulse was too much for it.' },
    { who: 'vell', text: 'Its record. Three years of everything it has seen.' },
    { who: 'ilse', text: 'It will not last the hour.' },
  ],
};
