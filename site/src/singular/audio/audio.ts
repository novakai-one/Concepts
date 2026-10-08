// Sound: one AudioContext, three buses (music, sfx, voice), a shared reverb, and ducking
// (music dips while someone is speaking). Everything is synthesised except the voice lines.
export type Bus = 'music' | 'sfx' | 'voice';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  buses!: Record<Bus, GainNode>;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  delay!: DelayNode;
  delaySend!: GainNode;
  analyser!: AnalyserNode;
  private duckGain!: GainNode;
  private vols: Record<Bus | 'master', number> = { master: 0.8, music: 0.55, sfx: 0.7, voice: 1 };
  private readyCbs: (() => void)[] = [];
  muted = false;

  /** Create the context. Must run inside a user gesture (browsers block audio before one). */
  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.connect(comp).connect(ctx.destination);
    this.duckGain = ctx.createGain();
    this.duckGain.connect(this.master);
    this.buses = { music: ctx.createGain(), sfx: ctx.createGain(), voice: ctx.createGain() };
    this.buses.music.connect(this.duckGain);
    this.buses.sfx.connect(this.master);
    this.buses.voice.connect(this.master);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.buses.voice.connect(this.analyser);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx, 3.4, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(this.reverb).connect(this.master);

    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.375;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    this.delay.connect(lp).connect(fb).connect(this.delay);
    this.delaySend = ctx.createGain();
    this.delaySend.connect(this.delay);
    lp.connect(this.buses.music);

    this.applyVolumes();
    for (const f of this.readyCbs) f();
    this.readyCbs = [];
  }

  onReady(f: () => void): void { if (this.ctx) f(); else this.readyCbs.push(f); }

  setVolume(which: Bus | 'master', v: number): void {
    this.vols[which] = v;
    this.applyVolumes();
  }
  getVolume(which: Bus | 'master'): number { return this.vols[which]; }

  setMuted(m: boolean): void { this.muted = m; this.applyVolumes(); }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vols.master, t, 0.05);
    (['music', 'sfx', 'voice'] as Bus[]).forEach((b) => this.buses[b].gain.setTargetAtTime(this.vols[b], t, 0.05));
  }

  /** Lower the music while a voice line plays. */
  duck(on: boolean): void {
    if (!this.ctx) return;
    this.duckGain.gain.setTargetAtTime(on ? 0.42 : 1, this.ctx.currentTime, on ? 0.08 : 0.6);
  }

  get now(): number { return this.ctx ? this.ctx.currentTime : 0; }

  /** Current loudness of the voice bus (0..1), for the speaking portrait. */
  voiceLevel(): number {
    if (!this.ctx) return 0;
    const buf = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buf);
    let s = 0;
    for (const x of buf) { const d = (x - 128) / 128; s += d * d; }
    return Math.min(1, Math.sqrt(s / buf.length) * 4);
  }
}

/** Synthetic stereo reverb tail: decaying noise. */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 200 ? i / 200 : 1);
    }
  }
  return buf;
}

export const audio = new AudioEngine();

export const midiHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
