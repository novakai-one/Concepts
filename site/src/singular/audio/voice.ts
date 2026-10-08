// Voice lines (pre-generated with Kokoro TTS), packed into one audio bank per chapter:
//   voice/manifest.json  { "banks": { "<bank>": { "<lineId>": [start_s, dur_s] } } }
//   voice/<bank>.mp3
// If a line has no audio (or audio is off) it still plays as text, timed by its length.
import { audio } from './audio';

interface Slot { bank: string; start: number; dur: number }
const where = new Map<string, Slot>();
const banks = new Map<string, Promise<AudioBuffer | null>>();
let manifestLoad: Promise<void> | null = null;
let base = './voice/';
let current: AudioBufferSourceNode | null = null;
let enabled = true;

export function setVoiceBase(url: string): void { base = url.endsWith('/') ? url : `${url}/`; }
export function setVoiceEnabled(on: boolean): void { enabled = on; if (!on) stopVoice(); }
export function voiceEnabled(): boolean { return enabled; }

export function loadVoiceManifest(): Promise<void> {
  if (manifestLoad) return manifestLoad;
  manifestLoad = fetch(`${base}manifest.json`)
    .then((r) => (r.ok ? r.json() : { banks: {} }))
    .then((j: { banks?: Record<string, Record<string, [number, number]>> }) => {
      for (const [bank, idx] of Object.entries(j.banks ?? {})) {
        for (const [id, [start, dur]] of Object.entries(idx)) where.set(id, { bank, start, dur });
      }
    })
    .catch(() => {});
  return manifestLoad;
}

export function hasVoice(id: string): boolean { return where.has(id); }

function loadBank(bank: string): Promise<AudioBuffer | null> {
  let p = banks.get(bank);
  if (!p) {
    p = fetch(`${base}${bank}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b && audio.ctx ? audio.ctx.decodeAudioData(b) : null))
      .catch(() => null);
    banks.set(bank, p);
    // a failed decode (e.g. no AudioContext yet) should be retried later
    void p.then((buf) => { if (!buf) banks.delete(bank); });
  }
  return p;
}

/** Start fetching the banks that hold these lines. */
export function preloadVoices(ids: string[]): void {
  if (!audio.ctx) return;
  const need = new Set(ids.map((id) => where.get(id)?.bank).filter(Boolean) as string[]);
  need.forEach((b) => { void loadBank(b); });
}

/** Estimated reading time for a line with no audio. */
export function readingMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1600, words * 330 + 600);
}

/**
 * Play a line. Resolves when it finishes (or is stopped). Calls onStart with the duration in ms
 * (0 if there is no audio, so the caller can time the text itself).
 */
export async function playVoice(id: string, onStart?: (durationMs: number) => void, rate = 1): Promise<number> {
  stopVoice();
  const slot = where.get(id);
  if (!enabled || !audio.ctx || !slot) { onStart?.(0); return 0; }
  const buf = await loadBank(slot.bank);
  if (!buf) { onStart?.(0); return 0; }
  const src = audio.ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  src.connect(audio.buses.voice);
  current = src;
  audio.duck(true);
  const ms = (slot.dur / rate) * 1000;
  onStart?.(ms);
  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
    src.start(0, slot.start, slot.dur + 0.05);
  });
  if (current === src) { current = null; audio.duck(false); }
  return ms;
}

export function stopVoice(): void {
  if (current) {
    try { current.stop(); } catch { /* not started */ }
    current = null;
  }
  audio.duck(false);
}

export function isSpeaking(): boolean { return current !== null; }
