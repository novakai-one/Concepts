// One colour language for the whole game (matches the student's site):
// green = first input vector (v, and where î lands), red = second vector (w, where ĵ lands),
// blue = third (where k̂ lands), yellow = the result. Everything else is quiet.
import { Color } from 'three';

export const C = {
  bg: '#04050b',
  v: '#3ddc84',       // green: v, î, first column
  w: '#ff5c6c',       // red: w, ĵ, second column
  u: '#4da3ff',       // blue: third vector, k̂, third column
  result: '#ffd166',  // yellow: the result
  grid: '#3a7bd5',
  gridFaint: '#1c3350',
  axis: '#8fb8e8',
  accent: '#59e1ff',  // UI cyan
  violet: '#b388ff',  // null space / collapse
  orange: '#ff9f43',  // warning / hazard
  white: '#e8f1ff',
  muted: '#7d8aa5',
  good: '#3ddc84',
  bad: '#ff5c6c',
} as const;

export type ColorKey = keyof typeof C;

/** A THREE colour, optionally pushed above 1.0 so bloom picks it up. */
export function hdr(c: string, intensity = 1): Color {
  return new Color(c).multiplyScalar(intensity);
}

export function css(c: ColorKey | string): string {
  return (C as Record<string, string>)[c] ?? c;
}

/** Per-act palettes for the nebula background and grid tint. */
export interface ActPalette { nebulaA: string; nebulaB: string; nebulaC: string; grid: string; star: string }
export const ACT_PALETTES: Record<string, ActPalette> = {
  default: { nebulaA: '#0b1a3a', nebulaB: '#2a0f3d', nebulaC: '#0a3a4a', grid: '#3a7bd5', star: '#cfe3ff' },
  teal: { nebulaA: '#04262e', nebulaB: '#0d3b4f', nebulaC: '#173a2a', grid: '#2fb6c9', star: '#d8fff8' },
  ember: { nebulaA: '#2a0c0c', nebulaB: '#3b1a05', nebulaC: '#1a0a2e', grid: '#e0844a', star: '#ffe6cc' },
  violet: { nebulaA: '#160a33', nebulaB: '#33104a', nebulaC: '#0a1a40', grid: '#9b7bff', star: '#efe2ff' },
  gold: { nebulaA: '#1f1a05', nebulaB: '#2e1f08', nebulaC: '#062a2a', grid: '#d9b44a', star: '#fff6d8' },
  copper: { nebulaA: '#1e1008', nebulaB: '#2b1410', nebulaC: '#0c1e26', grid: '#d08a5a', star: '#ffe9d6' },
  void: { nebulaA: '#05060c', nebulaB: '#0f0a1c', nebulaC: '#081420', grid: '#6c7cff', star: '#c8d0ff' },
};
