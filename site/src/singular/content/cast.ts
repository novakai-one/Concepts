// The cast. Speaker colours avoid the maths colours (green / red / yellow / blue arrows) so a
// speaker is never mistaken for a vector. Voices are Kokoro voice ids; speed is the delivery rate.
import type { CastMember } from '../ui/portrait';

export const CAST: Record<string, CastMember> = {
  narrator: { name: '', role: '', color: '#b6c3dc', voice: 'bm_fable', sigil: '' },
  lantern: { name: 'LANTERN', role: 'Ship computer', color: '#59e1ff', voice: 'bf_isabella', sigil: 'L', style: 'dots' },
  wren: { name: 'Wren Okafor', role: 'Pilot', color: '#ff9ecb', voice: 'af_heart', sigil: 'W', speed: 1.04 },
  bram: { name: 'Bram Haldane', role: 'Engineer', color: '#d9a76a', voice: 'bm_george', sigil: 'B', speed: 0.94 },
  ilse: { name: 'Dr Ilse Varga', role: 'Science officer · Meridian', color: '#aab8ff', voice: 'bf_emma', sigil: 'I', speed: 0.95 },
  ilselog: { name: 'Dr Ilse Varga', role: 'Recorded log · Meridian', color: '#aab8ff', voice: 'bf_emma', sigil: 'I', speed: 0.95, style: 'static', noise: 0.35 },
  teo: { name: 'Teo Okafor', role: 'Sleeper · Meridian', color: '#9fefe6', voice: 'am_puck', sigil: 'T', speed: 1.04, style: 'static', noise: 0.6 },
  vell: { name: 'Marcus Vell', role: 'Director · Survey Authority', color: '#c4cad8', voice: 'am_onyx', sigil: 'V', speed: 0.92 },
  you: { name: 'You', role: 'Navigator', color: '#59e1ff', voice: 'af_heart', sigil: 'N' },
};

export function castMember(id: string): CastMember {
  return CAST[id] ?? { name: id, role: '', color: '#59e1ff', voice: 'af_heart', sigil: id.slice(0, 1).toUpperCase() };
}
