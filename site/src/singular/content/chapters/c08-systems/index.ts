// Chapter 8: "Where do the three planes meet?" (N09) → system of linear equations, solution,
// consistent / inconsistent, solution set, row picture, column picture.
// Act III opens inside the dark ark: three fan-beam planes locate Teo's pod.
import type { ChapterDef, Game } from '../../../game/types';
import { p1, p2, p3, p4, p5, drawTwin, twinCfg } from './puzzles';
import { sayit, doubtUnknowns, doubtColumns, law, compare } from './briefing';
import { buildCheck } from './build';
import { coldOpen, closing, scanScene } from './cine';
import { worldHost } from './planes';
import { PICTURES } from './logic';
import { bridgeShot } from '../../common/shots';
import { S } from './script';
import './act3.css';

const pods = scanScene('pods');

const IN_SHORT = 'Where do several flat conditions all hold at once?\n\nWhere their planes meet: **at one point, along a line, or nowhere** (or in a whole plane, if they are all the same plane). Never at exactly two points.';

/**
 * The warm-up's twin view behind the row picture / column picture card, with numbers whose rows and
 * columns differ (the warm-up's read the same both ways), frozen at the solution (3, 1).
 */
async function twinReplay(g: Game): Promise<void> {
  g.stage.clearWorld();
  const host = worldHost(g);
  drawTwin(host, PICTURES.answer, twinCfg(PICTURES.rows));
  await g.stage.view2D({ center: [5.6, 0.2], height: 22, ms: 600 });
}

const ch: ChapterDef = {
  id: 'c08',
  act: 3,
  num: 8,
  title: 'Where do the three planes meet?',
  subtitle: 'Systems of linear equations',
  nodes: ['N09'],
  palette: 'gold',
  music: 'explore',
  inShort: IN_SHORT,
  prereqs: ['c02', 'c07'],
  catchup: 'An equation like $x + y + z = 6$ is a flat plane: every point on it makes the equation true. A point that makes several equations true at once sits on all of their planes.\n\nStory so far: the crew has docked inside the colony ark *Meridian*. It is dark. Teo\'s sleeper pod is somewhere inside.',
  script: S,
  beats: [
    { kind: 'cinematic', id: 'cold', run: coldOpen },
    { kind: 'card', id: 'inshort', card: { kind: 'inshort', visual: pods, title: 'Where do the three planes meet?', body: IN_SHORT } },
    { kind: 'scene', id: 'warmup', lines: S.warmup, setup: pods },
    { kind: 'puzzle', id: 'p1', puzzle: p1 },
    { kind: 'scene', id: 'pod', lines: S.pod, setup: pods },
    { kind: 'puzzle', id: 'p2', puzzle: p2 },
    {
      kind: 'name', id: 'name-system', entry: {
        id: 'system', term: 'system of linear equations', question: 'What do we call equations that must all hold at once?', nodes: ['N09'], visual: pods,
        saw: 'Each sensor gave one equation, and each equation drew one plane. The pod\'s point made all three equations true at once: it sat on all three planes.',
        means: 'Three conditions that must hold together are one problem, not three. A point answers it only if it is on every plane.',
        name: 'A **system of linear equations** is a set of equations, each of the form $a_1x + a_2y + a_3z = b$, that must all hold at once. A **solution** is a point that makes every equation true: a point on every plane.',
        formula: '\\begin{aligned} x + y + z &= 6 \\\\ 2y + 5z &= -4 \\\\ 2x + 5y - z &= 27 \\end{aligned} \\qquad \\cy{(x, y, z) = (5, 3, -2)}',
        why: 'Each equation fixes one plane. A solution has to make each equation true, so it has to lie on each plane.',
        cue: 'When several conditions must **all** hold, think **planes meeting**.',
        use: 'A game engine finds where a ray meets a wall by solving a small system like this one, millions of times a second.',
      },
    },
    { kind: 'scene', id: 'two', lines: S.two, setup: pods },
    { kind: 'puzzle', id: 'p3', puzzle: p3 },
    { kind: 'scene', id: 'prism', lines: S.prism, setup: pods },
    { kind: 'puzzle', id: 'p4', puzzle: p4 },
    {
      kind: 'name', id: 'name-consistent', entry: {
        id: 'consistent', term: 'consistent', question: 'How many solutions can a system have?', nodes: ['N09'], visual: pods,
        saw: 'Three planes met at one point (the pod). The backup planes shared a whole line. Moving one number made the three planes form a tube with no point on all three.',
        means: 'A system has one solution, a whole line (or plane) of them, or none. Two solutions always bring the line through them, so never exactly two.',
        name: 'A system with at least one solution is **consistent**. A system with no solution is **inconsistent**. The **solution set** is the set of all its solutions: a point, a line, a plane, or nothing.',
        formula: '\\begin{aligned} x + y + z &= 3 \\\\ x - y &= 1 \\\\ 2x + z &= \\cy{4} \\end{aligned} \\;\\Rightarrow\\; \\text{a line} \\qquad \\begin{aligned} x + y + z &= 3 \\\\ x - y &= 1 \\\\ 2x + z &= \\cy{5} \\end{aligned} \\;\\Rightarrow\\; \\text{no solution}',
        why: 'If $p$ and $q$ are on a flat plane, every point $p + t(q - p)$ is on it too. That holds for every plane at once.',
        cue: 'When you find two solutions, think **a whole line of them**.',
        use: 'A solver must report "no solution" as an answer, not an error: an inconsistent system is a real result, like two sensors that disagree.',
      },
    },
    { kind: 'scene', id: 'replay', lines: S.replay, setup: pods },
    {
      kind: 'name', id: 'name-pictures', entry: {
        id: 'row-picture', term: 'row picture', question: 'Why did the warm-up show the same equations twice?', nodes: ['N09'],
        saw: 'On the left, each equation was a line and (3, 2) sat on both. On the right, 3 of the green arrow plus 2 of the red arrow reached (5, 1). Moving one picture moved the other.',
        means: 'Read across a row and you get one line or plane. Read down a column and you get one arrow. The warm-up\'s numbers read the same both ways. These do not: in $x + 2y = 5$, $x - y = 2$, row 1 reads (1, 2) across, while column 1 reads (1, 1) down. Both readings still ask for the same numbers, (3, 1).',
        name: 'The **row picture** draws each equation as a line or plane and looks for where they all meet. The **column picture** reads the numbers in front of each unknown as an arrow and asks which weights on the arrows reach the right side.',
        formula: '\\begin{aligned} x + 2y &= 5 \\\\ x - y &= 2 \\end{aligned} \\quad\\Longleftrightarrow\\quad 3\\cg{\\begin{bmatrix}1\\\\1\\end{bmatrix}} + 1\\cr{\\begin{bmatrix}2\\\\-1\\end{bmatrix}} = \\cy{\\begin{bmatrix}5\\\\2\\end{bmatrix}}',
        why: 'Row by row, $3 \\cdot 1 + 1 \\cdot 2 = 5$ and $3 \\cdot 1 + 1 \\cdot (-1) = 2$: the same sums, read the other way.',
        cue: 'When you see “which mix of these arrows makes that one?”, think **the column picture of a system**.',
        use: 'A linear model asks the column question: which weights on the feature columns reach the target values?',
        visual: twinReplay,
      },
    },
    { kind: 'scene', id: 'tanks', lines: S.tanks, setup: pods },
    { kind: 'puzzle', id: 'p5', puzzle: p5 },
    { kind: 'scene', id: 'brief', lines: S.brief, setup: bridgeShot },
    { kind: 'sayit', id: 'sayit', sayit },
    { kind: 'doubt', id: 'd-unknowns', doubt: doubtUnknowns },
    { kind: 'doubt', id: 'd-columns', doubt: doubtColumns },
    { kind: 'law', id: 'law', law },
    { kind: 'compare', id: 'compare', compare },
    {
      kind: 'card', id: 'why', card: {
        kind: 'why', visual: pods, title: 'Why it matters',
        body: 'Every game engine asks where things meet: a ray and a wall, a click and the floor, two moving boxes. Each question is a small system of linear equations, solved thousands of times a frame.\n\nThe test is the one you used on the pod: put the point into each equation and see **how far off** each one is. LANTERN now checks the pod position that way.',
        cue: 'When several conditions must all hold, think **planes meeting**.',
      },
    },
    { kind: 'build', id: 'build-check', build: buildCheck },
    { kind: 'cinematic', id: 'close', run: closing },
  ],
};

export default ch;
