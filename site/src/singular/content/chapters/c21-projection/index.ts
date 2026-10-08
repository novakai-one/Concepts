// Chapter 21: "What is the closest point we can reach?" (GDD §6.10, N23): orthogonal projection onto a
// subspace. DROP: from a target, drop a perpendicular onto a line or a plane; its foot glows. The hatch
// from day one: two thrusters reach the plane z = x + y, and the nearest point of it is 1.155 from the
// stern hatch, inside the 1.2 tether.
import type { Beat, ChapterDef } from '../../../game/types';
import { p1, p2, p3, p4 } from './puzzles';
import { p5, p6, p7, p8 } from './puzzles2';
import { compare, doubtShadows, doubtTwice, doubtUp, law, sayit } from './briefing';
import { buildProject } from './build';
import { close } from './scenes';
import { hatchShot, holotableShot } from './stage';
import { S } from './script';

const IN_SHORT_ANSWER = 'The point where the leftover arrow is at a right angle to everything we can reach.';
const IN_SHORT = `What is the closest point we can reach?\n\n${IN_SHORT_ANSWER}`;

const NAME_PROJECTION: Beat = {
  kind: 'name', id: 'name-projection', entry: {
    id: 'orthogonal-projection', term: 'orthogonal projection', question: 'What is the nearest point of a plane?', nodes: ['N23'], visual: hatchShot,
    saw: 'The *Lantern* could only move on the plane $z = x + y$. Parked at $(1/3, 1/3, 2/3)$, the tether to the hatch was 1.155 long and stood straight out of the plane, at a right angle to both thruster arrows. Every other parking spot needed more tether.',
    means: 'The nearest point of a plane is where the leftover arrow is at a right angle to the whole plane. From any other point of the plane, the leftover is the long side of a right triangle, so it is longer.',
    name: 'The nearest point $\\mathbf p$ of a subspace $W$ to $\\mathbf b$ is the **orthogonal projection** of $\\mathbf b$ onto $W$. The leftover $\\mathbf b - \\mathbf p$ is perpendicular to every vector in $W$.',
    formula: '\\|\\mathbf b - \\mathbf q\\|^2 = \\|\\cy{\\mathbf b - \\mathbf p}\\|^2 + \\|\\mathbf p - \\mathbf q\\|^2 \\quad\\text{for every } \\mathbf q \\text{ in } W',
    why: '$\\mathbf p - \\mathbf q$ lies in $W$, so it is at a right angle to $\\mathbf b - \\mathbf p$: Pythagoras. The right side is smallest when $\\mathbf q = \\mathbf p$.',
    cue: 'When you see **“closest”**, **“best approximation”** or **“component along”**, think **drop a perpendicular**.',
    use: 'A camera that renders a CAD model without perspective drops every point straight onto the screen plane: an orthogonal projection.',
  },
};

const NAME_BASIS: Beat = {
  kind: 'name', id: 'name-orthogonal-basis', entry: {
    id: 'orthogonal-basis', term: 'orthogonal basis', question: 'When do the shadows add up to the nearest point?', nodes: ['N23'],
    saw: 'With $\\mathbf u_1 = (1, 1, 0)$ and $\\mathbf u_2 = (0, 0, 1)$, at a right angle, the shadows of $(3, 1, 2)$ were $(2, 2, 0)$ and $(0, 0, 2)$. They added to the nearest point $(2, 2, 2)$; the leftover $(1, -1, 0)$ read 0 against both.',
    means: 'When the arrows that span the plane are at right angles to each other, each shadow takes care of its own direction and the shadows do not overlap. The nearest point is the sum of the shadows.',
    name: 'A set of vectors that are perpendicular in pairs is an **orthogonal set**. An orthogonal set that is a basis of $W$ is an **orthogonal basis**.',
    formula: '\\mathbf p = \\frac{\\mathbf b\\cdot\\cg{\\mathbf u_1}}{\\cg{\\mathbf u_1}\\cdot\\cg{\\mathbf u_1}}\\cg{\\mathbf u_1} + \\frac{\\mathbf b\\cdot\\cr{\\mathbf u_2}}{\\cr{\\mathbf u_2}\\cdot\\cr{\\mathbf u_2}}\\cr{\\mathbf u_2} = \\frac42\\cg{\\begin{bmatrix}1\\\\1\\\\0\\end{bmatrix}} + \\frac21\\cr{\\begin{bmatrix}0\\\\0\\\\1\\end{bmatrix}} = \\cy{\\begin{bmatrix}2\\\\2\\\\2\\end{bmatrix}}',
    why: 'Write $\\mathbf p = c_1\\mathbf u_1 + c_2\\mathbf u_2$ and ask the leftover to read 0 against $\\mathbf u_1$. The term $c_2\\,\\mathbf u_2\\cdot\\mathbf u_1$ is 0, so $c_1 = \\frac{\\mathbf b\\cdot\\mathbf u_1}{\\mathbf u_1\\cdot\\mathbf u_1}$. With a skewed basis that term stays, and the shadows overlap.',
    cue: 'When the basis arrows are **at right angles**, think **add the shadows**.',
    use: 'Audio and image codecs split a signal into perpendicular patterns; each pattern’s amount is one dot product.',
  },
};

const NAME_COMPLEMENT: Beat = {
  kind: 'name', id: 'name-complement', entry: {
    id: 'orthogonal-complement', term: 'orthogonal complement', question: 'Which arrows stand straight out of a plane?', nodes: ['N23'],
    saw: 'For the plane of $\\mathbf a_1 = (1, 1, 0)$ and $\\mathbf a_2 = (0, 1, 1)$, the leftover $(2/3, -2/3, 2/3)$ read 0 against both columns. So does every multiple of $(1, -1, 1)$, and nothing else.',
    means: 'The arrows perpendicular to every arrow of a subspace form a subspace of their own. Every point splits into a part in $W$ and a part in it, and the two parts are at right angles.',
    name: 'The **orthogonal complement** $W^\\perp$ is the set of vectors perpendicular to every vector in $W$. When $W$ is the column space of $A$, $W^\\perp$ is the null space of $A^{\\mathsf T}$.',
    formula: '\\mathbf b = \\cy{\\mathbf p} + (\\mathbf b - \\mathbf p), \\quad \\mathbf p \\in W,\\ \\mathbf b - \\mathbf p \\in W^\\perp \\qquad A^{\\mathsf T}(\\mathbf b - A\\hat{\\mathbf x}) = \\mathbf 0',
    why: 'Reading 0 against every column of $A$ is $A^{\\mathsf T}\\mathbf e = \\mathbf 0$, one zero per column. Rearranged for the leftover of the nearest point: $A^{\\mathsf T}A\\hat{\\mathbf x} = A^{\\mathsf T}\\mathbf b$.',
    cue: 'When you see **“perpendicular to every vector in $W$”**, think **null space of $A^{\\mathsf T}$**.',
    use: 'To remove one direction (say, a bias) from word embeddings, project every word onto the orthogonal complement of that direction.',
  },
};

const NAME_MATRIX: Beat = {
  kind: 'name', id: 'name-projection-matrix', entry: {
    id: 'orthogonal-projection-matrix', term: 'orthogonal projection matrix', question: 'What does dropping twice do?', nodes: ['N23'],
    saw: '$P = \\frac15\\begin{bmatrix} 1 & 2 \\\\ 2 & 4 \\end{bmatrix}$ dropped every buoy onto the line through $(1, 2)$. Applied again, nothing moved. Every arrow along $(2, -1)$ landed on the origin.',
    means: 'A point that is already on the line is its own nearest point, so a second drop changes nothing. The perpendicular direction is flattened, so $P$ has no inverse.',
    name: 'When the columns of $A$ are independent (a basis of $W$), the **orthogonal projection matrix** onto $W$ is $P = A(A^{\\mathsf T}A)^{-1}A^{\\mathsf T}$. It satisfies $P^2 = P$ and $P^{\\mathsf T} = P$. Its null space is the orthogonal complement. With a wasted column, $A^{\\mathsf T}A$ has no inverse: drop that column first; $P$ is the same.',
    formula: 'P = A(A^{\\mathsf T}A)^{-1}A^{\\mathsf T}, \\qquad P^2 = P, \\qquad P^{\\mathsf T} = P, \\qquad \\det P = 0 \\ \\text{(unless } W \\text{ is everything)}',
    why: 'With independent columns, $A^{\\mathsf T}A$ is invertible and $P\\mathbf b = A\\hat{\\mathbf x}$ with $\\hat{\\mathbf x} = (A^{\\mathsf T}A)^{-1}A^{\\mathsf T}\\mathbf b$. Then $P^2 = A(A^{\\mathsf T}A)^{-1}(A^{\\mathsf T}A)(A^{\\mathsf T}A)^{-1}A^{\\mathsf T} = P$.',
    cue: 'When a matrix satisfies **$P^2 = P$ and $P^{\\mathsf T} = P$**, think **it drops points perpendicularly onto its column space**.',
    use: 'In statistics, a linear regression’s fitted values are $P\\mathbf y$ with $P = X(X^{\\mathsf T}X)^{-1}X^{\\mathsf T}$, the “hat matrix”: a matrix of exactly this kind.',
  },
};

const WHY = 'Language models store each word as a long arrow of numbers. Some directions in that space carry a pattern nobody wants, such as a bias. To remove it, keep only the part of every word arrow that is perpendicular to that direction: **project onto its orthogonal complement**. That is what you did to Teo’s channel in *How do we take the hum out of Teo’s channel?*\n\nThe tether planner you install next finds the nearest point of our plane to the hatch with your own `project`.';

const ch: ChapterDef = {
  id: 'c21',
  act: 8,
  num: 21,
  title: 'What is the closest point we can reach?',
  subtitle: 'Dropping a perpendicular onto a plane',
  nodes: ['N23'],
  palette: 'default',
  music: 'explore',
  script: S,
  inShort: IN_SHORT,
  prereqs: ['c04', 'c15', 'c12'],
  catchup: 'The **shadow** of $\\mathbf b$ on the line through $\\mathbf u$ is $\\frac{\\mathbf b\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\mathbf u$; what is left over reads 0 against $\\mathbf u$. The **column space** of $A$ is every mix of its columns. Story so far: Vell has stood down, Ilse is aboard, and the stern is still flat.',
  beats: [
    { kind: 'scene', id: 'open', lines: S.open, setup: hatchShot },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', title: 'What is the closest point we can reach?', body: IN_SHORT_ANSWER } },
    { kind: 'scene', id: 'p1-intro', lines: S.p1Intro, setup: holotableShot },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'p2-intro', lines: S.p2Intro, setup: hatchShot },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    NAME_PROJECTION,
    { kind: 'scene', id: 'p3-intro', lines: S.p3Intro, setup: holotableShot },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    NAME_BASIS,
    { kind: 'scene', id: 'p4-intro', lines: S.p4Intro, setup: holotableShot },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    { kind: 'scene', id: 'p5-intro', lines: S.p5Intro, setup: holotableShot },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    NAME_COMPLEMENT,
    { kind: 'scene', id: 'p6-intro', lines: S.p6Intro, setup: hatchShot },
    { kind: 'puzzle', id: 'p6', puzzle: p6 },
    { kind: 'scene', id: 'p7-intro', lines: S.p7Intro, setup: holotableShot },
    { kind: 'puzzle', id: 'p7', puzzle: p7 },
    NAME_MATRIX,
    { kind: 'scene', id: 'p8-intro', lines: S.p8Intro, setup: holotableShot },
    { kind: 'puzzle', id: 'p8', puzzle: p8 },
    { kind: 'scene', id: 'brief-intro', lines: S.briefing, setup: holotableShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-up', doubt: doubtUp },
    { kind: 'doubt', id: 'd-twice', doubt: doubtTwice },
    { kind: 'doubt', id: 'd-shadows', doubt: doubtShadows },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    { kind: 'card', id: 'why', card: { kind: 'why', title: 'Why it matters', body: WHY, cue: 'When you see **“closest”**, **“best approximation”** or **“component along”**, think **drop a perpendicular**.' } },
    { kind: 'build', id: 'build-project', build: buildProject },
    { kind: 'cinematic', id: 'close', run: close },
  ],
};

export default ch;
