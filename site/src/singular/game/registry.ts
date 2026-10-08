// Every chapter in content/chapters/<id>/index.ts is picked up automatically (default export).
import type { ActDef, ChapterDef } from './types';
import { registerBuild } from './build';
import { ACTS } from '../content/acts';
import { SANDBOX } from '../content/sandbox';
import { TOPICS } from '../content/topics';

const mods = import.meta.glob<{ default: ChapterDef }>('../content/chapters/*/index.ts', { eager: true });

const ALL: ChapterDef[] = Object.values(mods)
  .map((m) => m.default)
  .filter(Boolean)
  .sort((a, b) => a.act - b.act || a.num - b.num);

/** Story chapters in order. */
export const CHAPTERS: ChapterDef[] = ALL.filter((c) => !c.dev);
/** Developer test chapters (kit showcases). */
export const DEV_CHAPTERS: ChapterDef[] = [...ALL.filter((c) => c.dev), SANDBOX];

for (const ch of CHAPTERS) for (const b of ch.beats) if (b.kind === 'build') registerBuild(b.build, true);
for (const ch of DEV_CHAPTERS) for (const b of ch.beats) if (b.kind === 'build') registerBuild(b.build);

export function chapter(id: string): ChapterDef | undefined { return ALL.find((c) => c.id === id) ?? (id === SANDBOX.id ? SANDBOX : undefined); }
export function act(n: number): ActDef | undefined { return ACTS.find((a) => a.num === n); }
export function nextChapter(id: string): ChapterDef | undefined {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return i >= 0 ? CHAPTERS[i + 1] : undefined;
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
/** "Act IV" (or "" for the Prologue, Epilogue and dev chapters). */
export function actLabel(n: number): string { return ROMAN[n] ? `Act ${ROMAN[n]}` : ''; }
/** "Prologue", "Epilogue" or "Chapter 7". */
export function chapterName(ch: ChapterDef): string {
  return ch.id === SANDBOX.id ? 'Free play' : ch.num === 0 && ch.act === 0 ? 'Prologue' : ch.act === 10 ? 'Epilogue' : ch.dev ? `Test ${ch.num}` : `Chapter ${ch.num}`;
}
/** The textbook name of the chapter's topic: "Matrix multiplication". */
export function chapterTopic(ch: ChapterDef): string { return TOPICS[ch.id]?.name ?? ''; }
/** "Chapter 12 · Matrix multiplication", for menu buttons. */
export function chapterLabel(ch: ChapterDef): string {
  const t = chapterTopic(ch);
  return t ? `${chapterName(ch)} · ${t}` : chapterName(ch);
}
/** Everything a search on the chapter map can match: topic, other names, named terms, story title. */
export function chapterSearchText(ch: ChapterDef): string {
  const terms = ch.beats.flatMap((b) => (b.kind === 'name' ? [b.entry.term] : []));
  return [chapterTopic(ch), TOPICS[ch.id]?.also ?? '', ...terms, ch.title].join(' ');
}
/** HUD kicker: "Act II · Chapter 5", or "Prologue". */
export function chapterKicker(ch: ChapterDef): string {
  const a = actLabel(ch.act);
  return a && ch.act !== 10 ? `${a} · ${chapterName(ch)}` : chapterName(ch);
}
export { ACTS };
