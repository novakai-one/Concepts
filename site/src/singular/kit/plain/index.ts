// Plain maths kit: Chapter 18's look and feel without the matrix, for the Prologue and Act I.
// Proof and example: content/chapters/c94-plain-kit. Words: docs/singular/ch18-plain-style.md.
export { PlaneView, VecArrow, COLORS, COPPER, type Kind, type FrameOpts } from './view';
export { addTipToTail, scale, combine, length, type MoveOpts } from './moves';
export {
  plainDock, helpButton, NumCell, VecField, eqRow, hideHint, freshObjective, sg, focusSoon,
  type PlainDock, type MsgKind, type EqRow,
} from './dock';
export { runDrill, eqRound, type Round, type RoundCtx, type RoundRun, type DrillOpts, type DrillText, type EqRoundSpec } from './drill';
export {
  parseEntry, clean, cleanV, same, isZero, add, mul, lin, norm, onLineOf, multipleOf, independent, solve2, fmtN,
  rng, pickInt, fresh, outcomeOf, record, records, hinter, OUTCOME_NAMES,
  type Vec, type Attempt, type Outcome,
} from './logic';
export { tn, tnp, tnb, tv, tname, tmul, tlin, tsum, tnorm, tpyth, tlen, wrongVec, UNREAD, UNREAD_M } from './tex';
