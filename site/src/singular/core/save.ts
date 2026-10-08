// Saved state (localStorage, every access in try/catch; the game works without it).
export type Difficulty = 'cadet' | 'navigator' | 'commander';
export type CodeHelp = 'off' | 'assemble' | 'fill' | 'write';

export interface Settings {
  difficulty: Difficulty;
  master: number; music: number; sfx: number; voice: number;
  voiceOn: boolean;
  autoAdvance: boolean;
  textSpeed: number;
  reduceMotion: boolean;
  quality: 'high' | 'low';
  /** How much help the builder thread gives (independent of maths depth). */
  codeHelp: CodeHelp;
  /** Live result preview while dragging (null = follow difficulty). */
  preview: boolean | null;
  /** Interface text size: 1, 1.25 or 1.5 (GDD §7 accessibility). */
  textScale: number;
  /** Opaque panels and brighter secondary text. */
  highContrast: boolean;
}

/** A Field Manual page: the player's own words, then the key ideas they ticked after comparing. */
export interface ManualPage { see: string; means: string; called: string; cue: string; ticks: boolean[]; at: number; first?: Omit<ManualPage, 'first' | 'ticks'> }

export interface ChapterSave {
  done: string[];                     // beat ids completed
  stars: Record<string, number>;      // puzzle id → 0..3
  shown: string[];                    // puzzles solved with Show me
}

export interface SaveData {
  v: 1;
  settings: Settings;
  last: { chapter: string; beat: number } | null;
  chapters: Record<string, ChapterSave>;
  codex: Record<string, { at: number; note?: string }>;
  explains: Record<string, { picked?: string[]; text?: string; at: number }>;
  code: Record<string, string>;       // builder thread: the player's own functions
  flags: Record<string, unknown>;
  manual: Record<string, ManualPage>;
  laws: Record<string, { filled: Record<string, string>; survived: boolean; proven: boolean; at: number }>;
  doubts: Record<string, { stance: 'challenge' | 'back'; right: boolean; at: number }>;
}

const KEY = 'la-game-v1';

export const DEFAULT_SETTINGS: Settings = {
  difficulty: 'navigator', master: 0.8, music: 0.5, sfx: 0.7, voice: 1, voiceOn: true,
  autoAdvance: false, textSpeed: 1, reduceMotion: false, quality: 'high', codeHelp: 'fill', preview: null, textScale: 1, highContrast: false,
};

function fresh(): SaveData {
  return { v: 1, settings: { ...DEFAULT_SETTINGS }, last: null, chapters: {}, codex: {}, explains: {}, code: {}, flags: { 'c18-layout-2': true }, manual: {}, laws: {}, doubts: {} };
}

let data: SaveData = fresh();
let storageOk = true;

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as SaveData;
      if (j && j.v === 1) data = { ...fresh(), ...j, settings: { ...DEFAULT_SETTINGS, ...j.settings } };
    }
  } catch { storageOk = false; }
  // Chapter 18 gained three beats after its name card (beat 4): a save resting past that point in the older
  // layout resumes at the same content, not three beats early. Every save loaded from now on is in the new layout.
  if (data.last?.chapter === 'c18' && data.last.beat >= 5 && !data.flags['c18-layout-2']) data.last = { ...data.last, beat: data.last.beat + 3 };
  data.flags['c18-layout-2'] = true;
  return data;
}

export function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { storageOk = false; }
}

export function saveOk(): boolean { return storageOk; }
export function S(): SaveData { return data; }

export function chapterSave(id: string): ChapterSave {
  return (data.chapters[id] ??= { done: [], stars: {}, shown: [] });
}

export function resetSave(): void {
  const keep = data.settings;
  data = fresh();
  data.settings = keep;
  save();
}

export function exportSave(): string { return JSON.stringify(data, null, 2); }
