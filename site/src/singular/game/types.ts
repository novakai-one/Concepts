// The contract every chapter is written against.
//
// A chapter is a list of beats played in order:
//   scene     — voiced dialogue on the comm channel (with optional visuals running alongside)
//   cinematic — a scripted visual sequence (camera moves, the grid moving, ships)
//   puzzle    — a challenge with a goal, a win condition, hints, Show me and Skip
//   name      — the naming moment: what you saw → what it means → its name → the formula
//   explain   — explain-back: the player explains the idea in their own words / picks the reasoning
//   build     — the builder thread: the player writes a function the game then runs
// Nothing is ever locked: every beat can be skipped, every puzzle has Show me.
import type { Stage, V3 } from '../core/stage';
import type { UI } from '../ui/ui';
import type { DragManager } from '../core/drag';
import type { Backdrop } from '../gfx/background';
import type { Dialogue, DialogueOpts } from '../ui/dialogue';
import type { Line } from '../content/lines';
import type { Difficulty, Settings } from '../core/save';
import type { Readout } from '../ui/widgets';
import type { Object3D } from 'three';
import type { Grid2D, GridOpts } from '../gfx/grid';

export type { Line, Difficulty, V3 };

export interface Game {
  stage: Stage;
  ui: UI;
  drag: DragManager;
  bg: Backdrop;
  dialogue: Dialogue;
  settings: Settings;
  /** Play dialogue lines; resolves with the chosen option id if the last line had choices. */
  say(lines: Line[], o?: DialogueOpts): Promise<string | undefined>;
  toast(text: string, kicker?: string): void;
  /** Background music mood: 'title' | 'explore' | 'puzzle' | 'tension' | 'triumph' | 'void'. */
  mood(name: string): void;
  /** True when running under the test harness (animations fast, no audio). */
  headless: boolean;
}

// ---------------------------------------------------------------- puzzles

export interface Prediction {
  prompt: string;                          // markdown
  choices: { id: string; text: string }[];
  answer?: string;                         // id of the right choice (omit for open predictions)
  reveal: string;                          // markdown shown after the guess (or after Show me)
}

/** Handed to a puzzle's setup(). Everything added through it is cleaned up automatically. */
export interface PuzzleCtx {
  g: Game;
  difficulty: Difficulty;
  /** Grid snapping step for dragged points: 1 on cadet, 0.5 on navigator, null (free) on commander, unless the puzzle overrides. */
  snap(): number | null;
  /** Call when the win condition is met. Safe to call more than once. */
  win(): void;
  /** Count one move (for the par score). */
  move(n?: number): void;
  moves(): number;
  /** Tick off subgoal i (0-based) in the objective card. */
  subgoal(i: number, done?: boolean): void;
  /** Replace the objective text (markdown). */
  setGoal(md: string): void;
  /** Add objects to the 3-D world (removed on dispose). */
  add(...objs: (Object3D | { object: Object3D })[]): void;
  /** The standard 2-D grid for this puzzle (created on first call, cleaned up automatically). */
  grid(o?: GridOpts): Grid2D;
  /** A readout card on the right of the screen. */
  readout(title?: string): Readout;
  /** A container for widgets (bottom-left glass card). */
  dock(): HTMLElement;
  /** Run fn when the puzzle is torn down. */
  onDispose(fn: () => void): void;
  /** Per-frame callback, removed on dispose. */
  tick(fn: (dt: number, t: number) => void): void;
  /** Short line from a crew member during play (non-blocking, no voice if not generated). */
  bark(who: string, text: string): void;
  /** True once the puzzle has been won (by the player or Show me). */
  readonly won: boolean;
}

export interface PuzzleRuntime {
  /** Animate the solution on screen (sets the controls to the answer). Must end with the win condition met. */
  showMe(): Promise<void>;
  /** Optional instant solve for tests; defaults to showMe() at high speed. */
  solve?(): void | Promise<void>;
  /** Optional: perform a known-wrong attempt (a misconception). Tests assert it does NOT win. */
  wrong?(): void | Promise<void>;
  /** Optional extra cleanup. */
  dispose?(): void;
  /**
   * Optional: hints that follow the puzzle's own stage (multi-round puzzles). When present, the Hint
   * button asks this instead of reading `def.hints`. Returns the hint (markdown) and how many are left
   * for the current stage, or null when there is nothing to add. The puzzle records the help itself.
   */
  hint?(): { text: string; left: number } | null;
  /**
   * Optional: Show me for one stage only. When present, Show me runs this instead of `showMe()` and does
   * not end the puzzle; the puzzle demonstrates the current stage, records it as assisted and carries on.
   * Counts as a hint for the stars.
   */
  showStep?(): Promise<void>;
}

export interface PuzzleDef {
  /** Opt this puzzle into the calm layout without changing the rest of its chapter. */
  calm?: boolean;
  id: string;
  /** Plain question heading, e.g. "Which points can these two thrusters reach?" */
  title: string;
  /** Objective (markdown), shown in the HUD. */
  goal: string;
  subgoals?: string[];
  predict?: Prediction;
  /** Escalating hints (markdown). The last one should all but give it away. */
  hints: string[];
  /** Moves for the second star (omit if moves do not matter). */
  par?: number;
  /** 2-D (straight-down view) or 3-D (orbit). Default '2d'. */
  view?: '2d' | '3d';
  /** Line(s) said when the puzzle is won, before Continue. */
  onWin?: Line[];
  /**
   * How the puzzle is framed. 'challenge' (default). 'doubt': a crew member makes a claim that is
   * wrong, and the goal is to build a counterexample (explain-back by construction). 'sortie':
   * unlabelled practice (the method is not named). 'mastery': optional harder variant.
   */
  style?: 'challenge' | 'doubt' | 'sortie' | 'mastery';
  /** For 'doubt': who makes the claim (cast id) and the claim itself (shown in the objective card). */
  claim?: { who: string; text: string };
  setup(p: PuzzleCtx): PuzzleRuntime | Promise<PuzzleRuntime>;
}

// ---------------------------------------------------------------- naming moment

export interface CodexEntry {
  id: string;
  /** The term being named, e.g. "span". */
  term: string;
  /** Plain-question heading. */
  question: string;
  /** What you saw (markdown, literal: arrows, points, grid). */
  saw: string;
  /** What it means (markdown). */
  means: string;
  /** The name, defined in one plain sentence tied to the picture (markdown). */
  name: string;
  /** The formula, colour-coded (TeX, display). Optional. */
  formula?: string;
  /** Where the formula comes from (markdown, 1–3 lines). */
  why?: string;
  /** "When you see ___ in a problem, think ___." */
  cue?: string;
  /** One real use in CS / AI. */
  use?: string;
  /** Curriculum node ids this covers (N01…N28). */
  nodes?: string[];
  /** Optional little scene to run behind the card. */
  visual?: (g: Game) => Promise<void> | void;
}

// ---------------------------------------------------------------- explain-back

export interface ExplainStep {
  /** The question (markdown). */
  ask: string;
  /** Options: each is a line of reasoning. Wrong ones carry the counter-argument shown when picked. */
  options: { id: string; text: string; right: boolean; why: string }[];
  /** Optional picture to show while answering (draws into the world; cleaned up after). */
  visual?: (g: Game) => Promise<void> | void;
}

export interface ExplainDef {
  id: string;
  /** Who is asking (cast id) and the framing line. */
  who: string;
  intro: string;
  /** A chain of steps that build the full explanation. */
  steps: ExplainStep[];
  /** The model answer assembled from the right options (markdown), shown at the end. */
  summary: string;
  /** Prompt for the free-text "in your own words" box (saved to the logbook). */
  ownWords?: string;
}


// ---------------------------------------------------------------- the Briefing (GDD §4)
// Order in a chapter: sayit → doubt × 2–3 (true and false mixed) → law → (procedure) → compare.
// Nothing here is graded as free text; everything is checked by consequence.

/** A chapter card: the chapter's In short box, a Why-it-matters card, or an act-end NumPy card. */
export interface CardDef {
  kind: 'inshort' | 'why' | 'numpy' | 'catchup';
  title: string;
  /** Markdown. For 'inshort': the question and a one-sentence literal answer, no unearned term. */
  body: string;
  /** For 'why': "When you see ___, think ___." */
  cue?: string;
  /** For 'numpy': a short Python snippet shown as code. */
  code?: string;
  /** Optional little visual behind the card. */
  visual?: (g: Game) => Promise<void> | void;
}

/** Say it: Bram asks the chapter's check question; the player writes their Field Manual page first. */
export interface SayItDef {
  id: string;                 // usually the chapter id
  who: string;                // who asks (cast id), usually 'bram'
  ask: string;                // the curriculum node's check question
  /** "Help me start" sentence frames (blanks as ___); off by default, opened only on request. */
  frames?: { see?: string; means?: string; called?: string; cue?: string };
  /** Words for the Help-me-start word bank (objects from the player's own scene). */
  wordBank?: string[];
}

/**
 * Bram's Doubt: a claim the player answers by construction.
 * Challenge it = build a counterexample (a case where the claim fails).
 * Back it = build a demonstration; then the Shake randomises the scene's free quantities and re-checks.
 */
/** One Field Manual page in the Broadcast chain (GDD §4.8). */
export interface BroadcastPage {
  id: string;
  /** The idea's name, e.g. "Determinant". */
  term: string;
  /** The chapter whose Field Manual page this is (its Say it id). */
  chapter: string;
  /** Pages that must come before this one. */
  needs: string[];
  /** Ilse's model sentence for "this needs <that>, because …", keyed by the earlier page's id (Help me start). */
  because?: Record<string, string>;
}

export interface BroadcastDef {
  id: string;
  pages: BroadcastPage[];
  /** "Down to the arrows": a library path from the top function down, e.g. ['svd', 'sym_eigen', …, 'add']. */
  down?: string[];
}

/** The act Review (GDD §4.6): four claims by one speaker, at least one true and one false, in mixed order. */
export interface ReviewDef {
  id: string;
  /** Bram (Acts I–IV), Vell (V–VII), Ilse (VIII–IX). Overrides each claim's `who`. */
  who: string;
  /** e.g. "Act I Review". */
  title: string;
  claims: DoubtDef[];
}

export interface DoubtDef {
  id: string;
  who: string;                // cast id making the claim
  claim: string;              // the claim, in the speaker's words (earned terms only)
  isTrue: boolean;
  /** One literal line on why it holds (true) or what breaks it (false). Shown after the verdict. */
  reason: string;
  /** Goal text shown while building (markdown); defaults to a generic line. */
  goal?: string;
  view?: '2d' | '3d';
  /** Build the holotable scene with the usual puzzle context. */
  setup(p: PuzzleCtx): DoubtScene | Promise<DoubtScene>;
}

export interface DoubtScene {
  /** Does the claim hold for the scene as it is now? */
  holds(): boolean;
  /** The current case in literal words, for messages: "v = (2, 1), w = (−4, −2)". */
  describe(): string;
  /** Optional: animate the consequence of the current construction (fly both orders, apply the move) before each verdict. */
  play?(): Promise<void>;
  /** The Shake: set the free quantities to a random case (edge >= 0: the edge-th curated edge case). May animate. */
  randomize(rng: () => number, edge?: number): void | Promise<void>;
  /** How many curated edge cases randomize() knows (navigator uses 1, commander all). */
  edgeCases?: number;
  /** Show me: set up a construction for the given stance (the right stance for this claim). */
  showMe(stance: 'challenge' | 'back'): Promise<void>;
  dispose?(): void;
}

/** One slot of a Law frame. */
export interface LawSlot { options: { id: string; text: string }[] }

/**
 * A Law: a templated statement the player fills from earned words; the Proving Ground then fires
 * 500 cases at it. The first case that breaks it freezes on screen. A Law that survives becomes
 * Proven only after the reason step.
 */
export interface LawDef<Case = unknown> {
  id: string;
  /** Text pieces and slots in order: ['$\\mathbf v \\cdot \\mathbf w$ is ', { slot: 'sign' }, ' exactly when ', { slot: 'angle' }]. */
  frame: (string | { slot: string })[];
  slots: Record<string, LawSlot>;
  /** The intended filling (Show me). */
  answer: Record<string, string>;
  /** Slots shown on cadet (others are pre-filled with the answer). */
  cadetSlots?: string[];
  /** A random case. */
  gen(rng: () => number): Case;
  /** Curated edge cases (zero vector, parallel arrows, ...). */
  edgeCases: Case[];
  /** Does the statement, filled as given, hold for this case? */
  holds(filled: Record<string, string>, c: Case): boolean;
  /** The case in literal words: "w is the zero vector". */
  describe(c: Case): string;
  /** Draw a case on the holotable (used for the flicker and the counterexample freeze). */
  draw?(g: Game, c: Case): void;
  /** The reason step (cadet: pick the card; navigator/commander: the same cards, then the full line is shown). */
  reason: { ask: string; options: { id: string; text: string; right: boolean; why: string }[] };
}

/** Compare: Ilse's model page appears beside the player's own page, with a key-idea checklist. */
export interface CompareDef {
  id: string;                 // matches the SayIt id
  /** Ilse's notebook page (maths register, markdown). */
  page: string;
  formula?: string;           // TeX
  keyIdeas: string[];         // 2–3 literal "Did you say …?" items
}

/** A step tile of a Procedure. */
export interface Tile { id: string; text: string; py?: string }

/**
 * A Procedure: the player orders step tiles; LANTERN runs them literally on a new case. A missing
 * or misplaced key step is replaced by its misconception, which fails visibly.
 */
export interface ProcedureDef {
  id: string;
  title: string;
  brief: string;
  tiles: Tile[];
  decoys?: Tile[];            // misconception tiles (commander)
  reference: string[];        // tile ids in a correct order
  /** Run the tiles on the test case, animating in the world. Resolve with the outcome. */
  run(g: Game, tileIds: string[]): Promise<{ ok: boolean; message: string }>;
}

/**
 * Teach Teo (GDD §4.4): a callback message to Teo in the stern. Step tiles plus up to 40 words of free text
 * (never graded). Teo follows the tiles literally in `run`; the message is his reply (he braces the right strut,
 * or the wrong one and asks a sharper question).
 */
export interface TeoDef extends ProcedureDef {
  /** Teo's question, voiced first, e.g. "Are my struts still holding volume?" */
  ask: string;
}

// ---------------------------------------------------------------- builder thread

export interface BuildTest { name: string; args: unknown[]; expect: unknown; tol?: number }

export interface BuildDef {
  id: string;
  /** Code help 'fill': the function with 2–5 blanks written as ___ (defaults to `starter`). */
  fill?: string;
  /** Code help 'write': the signature and docstring only (defaults to the first lines of `solution` up to the docstring). */
  signature?: string;
  /** Code help 'assemble' (Parsons): the solution's lines in order, plus up to two decoy lines (misconceptions). */
  assemble?: { lines: string[]; decoys?: string[] };
  /**
   * The test swarm: random cases whose expected answer comes from the crew version (TypeScript).
   * n by difficulty: 20 / 100 / 300.
   */
  swarm?: { gen: (rng: () => number, difficulty: Difficulty) => unknown[]; crew: (...args: unknown[]) => unknown; tol?: number };
  /** After passing: the docstring prompt and Ilse's original note for the routine. */
  docPrompt?: string;
  ilseNote?: string;
  /** Language of starter/solution (default 'python': real Python 3 in the browser, lists not NumPy). */
  lang?: 'python' | 'js';
  /** Function name the player writes, e.g. "dot". Stored in the player's library. */
  fn: string;
  title: string;
  /** What the function must do (markdown). */
  brief: string;
  /** Starting code. */
  starter: string;
  /** A working solution (shown on Show me). */
  solution: string;
  tests: BuildTest[];
  /** Earlier library functions this one may call (they are injected by name). */
  uses?: string[];
  /** What the game does with it afterwards (markdown, one line). */
  payoff?: string;
}

// ---------------------------------------------------------------- chapters

export type Beat =
  | { kind: 'scene'; id: string; lines: Line[]; setup?: (g: Game) => void | Promise<void>; onLine?: DialogueOpts['onLine']; view?: '2d' | '3d' }
  | { kind: 'cinematic'; id: string; run: (g: Game) => Promise<void> }
  | { kind: 'puzzle'; id: string; puzzle: PuzzleDef }
  | { kind: 'name'; id: string; entry: CodexEntry }
  | { kind: 'explain'; id: string; explain: ExplainDef }
  | { kind: 'build'; id: string; build: BuildDef }
  | { kind: 'card'; id: string; card: CardDef }
  | { kind: 'sayit'; id: string; sayit: SayItDef }
  | { kind: 'doubt'; id: string; doubt: DoubtDef }
  | { kind: 'review'; id: string; review: ReviewDef }
  | { kind: 'broadcast'; id: string; broadcast: BroadcastDef }
  | { kind: 'teo'; id: string; teo: TeoDef }
  | { kind: 'law'; id: string; law: LawDef<any> }
  | { kind: 'compare'; id: string; compare: CompareDef }
  | { kind: 'procedure'; id: string; procedure: ProcedureDef };

export interface ChapterDef {
  id: string;            // "c01"
  act: number;           // 1-based
  num: number;           // chapter number shown to the player
  title: string;         // plain question
  subtitle?: string;     // the topic, plain words
  nodes: string[];       // curriculum nodes covered
  palette?: string;      // backdrop palette name (theme.ts)
  /** Developer test chapter: hidden from the map and the story order (open with ?chapter=<id>). */
  dev?: boolean;
  /** The In short box (also shown by the opening `card` beat). */
  inShort?: string;
  /** Chapters whose ideas this one assumes (for the catch-up card on out-of-order play). */
  prereqs?: string[];
  /** One-picture re-teach shown when prerequisites are not done (literal words, never "recall that"). */
  catchup?: string;
  music?: string;        // default mood
  /** Calm screen: the title fades, the menu and extra buttons fold away, the goal card is one line. */
  calm?: boolean;
  beats: Beat[];
  /**
   * Any other voiced lines this chapter plays from code (cinematics, puzzle reactions).
   * Declare them here so the voice generator records them: g.say(ch.script.reaction).
   */
  script?: Record<string, Line[]>;
}

export interface ActDef { num: number; title: string; subtitle: string; palette: string }
