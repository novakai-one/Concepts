// Frame-driven animation. Every animation is a promise, so scenes read as scripts:
//   await animate(800, (t) => arrow.set(lerp(a, b, t)));
//   await wait(300);
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t: number) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  smooth: (t: number) => t * t * (3 - 2 * t),
};

interface Job { start: number; dur: number; fn: (t: number) => void; ease: Ease; resolve: () => void; cancelled: boolean }

const jobs = new Set<Job>();
let now = 0;
/** Global speed multiplier (tests set this high; "reduce motion" sets durations near zero). */
let speed = 1;

export function setAnimSpeed(s: number): void { speed = s; }
export function animSpeed(): number { return speed; }

/** Called once per frame by the stage. */
export function stepTweens(timeMs: number): void {
  now = timeMs;
  for (const j of [...jobs]) {
    if (j.cancelled) { jobs.delete(j); j.resolve(); continue; }
    if (j.start < 0) j.start = now;
    const raw = j.dur <= 0 ? 1 : Math.min(1, ((now - j.start) * speed) / j.dur);
    j.fn(j.ease(raw));
    if (raw >= 1) { jobs.delete(j); j.resolve(); }
  }
}

export interface Handle extends Promise<void> { cancel(): void }

/** Run fn(t) for t from 0 to 1 over `ms` milliseconds. */
export function animate(ms: number, fn: (t: number) => void, e: Ease = ease.inOut): Handle {
  let job!: Job;
  const p = new Promise<void>((resolve) => {
    job = { start: -1, dur: ms, fn, ease: e, resolve, cancelled: false };
    jobs.add(job);
  }) as Handle;
  p.cancel = () => { job.cancelled = true; };
  return p;
}

export function wait(ms: number): Promise<void> {
  return animate(ms, () => {}, ease.linear);
}

export function cancelAllTweens(): void {
  for (const j of jobs) j.cancelled = true;
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Exponential smoothing toward a target, frame-rate independent. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
