// Dialogue line data. Plain data only (no DOM, no three) so the voice generator can import it in Node.
//
// A line is [who, text] or { who, text, say?, choices? }.
//   text: what is shown (may hold **bold** and $maths$).
//   say:  what is spoken, when the text holds maths that should be read a particular way.
// The voice file for a line is voice/<voiceId>.mp3, where voiceId hashes who + spoken words,
// so editing a line automatically asks for a new recording.

export interface Choice { id: string; text: string }
export interface LineObj { who: string; text: string; say?: string; choices?: Choice[] }
export type Line = [string, string] | LineObj;

export function normLine(l: Line): LineObj {
  return Array.isArray(l) ? { who: l[0], text: l[1] } : l;
}

/** FNV-1a 32-bit hash, base-36. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function voiceId(l: Line): string {
  const o = normLine(l);
  return `${o.who}-${hash(`${o.who}|${spoken(o)}`)}`;
}

const SYMBOLS: [RegExp, string][] = [
  [/\\hat\{?\\imath\}?/g, 'i hat'], [/\\hat\{?\\jmath\}?/g, 'j hat'], [/\\hat\{?k\}?/g, 'k hat'],
  [/\\mathbf\{([a-zA-Z])\}/g, '$1'], [/\\vec\{?([a-zA-Z])\}?/g, '$1'], [/\\boldsymbol\{([a-zA-Z])\}/g, '$1'],
  [/\\lambda/g, 'lambda'], [/\\theta/g, 'theta'], [/\\sigma/g, 'sigma'], [/\\Sigma/g, 'sigma'], [/\\pi/g, 'pi'],
  [/\\cdot/g, ' dot '], [/\\times/g, ' cross '], [/\\neq/g, ' is not '], [/\\ne\b/g, ' is not '], [/\\approx/g, ' is about '],
  [/\\le\b|\\leq/g, ' is at most '], [/\\ge\b|\\geq/g, ' is at least '], [/\\to/g, ' to '], [/\\in\b/g, ' in '],
  [/\\det/g, 'det '], [/\\operatorname\{([a-z]+)\}/g, '$1 '], [/\\text\{([^}]*)\}/g, '$1'], [/\\mathrm\{([^}]*)\}/g, '$1'],
  [/\^\{-1\}|\^-1/g, ' inverse'], [/\^\{T\}|\^T/g, ' transpose'], [/\^2/g, ' squared'], [/\^3/g, ' cubed'], [/\^\{?(\w+)\}?/g, ' to the $1'],
  [/_\{?(\w+)\}?/g, ' $1'], [/\\sqrt\{([^}]*)\}/g, 'root $1'], [/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 over $2'], [/\\tfrac\{([^}]*)\}\{([^}]*)\}/g, '$1 over $2'],
  [/\\[a-zA-Z]+/g, ' '], [/[{}]/g, ''], [/=/g, ' equals '], [/\+/g, ' plus '], [/(?<=\s|^)-(?=\s*\w)/g, ' minus '],
];

/** Best-effort spoken form of a line (used for TTS when there is no `say`). */
export function spoken(l: LineObj): string {
  if (l.say) return l.say;
  let s = l.text.replace(/\$([^$]+)\$/g, (_, m: string) => {
    let t = m;
    for (const [re, rep] of SYMBOLS) t = t.replace(re, rep);
    return t.replace(/\s+/g, ' ').trim();
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\{[grybpt]\|([^{}]+)\}/g, '$1');
  s = s.replace(/→/g, ' to ').replace(/×/g, ' by ').replace(/−/g, ' minus ').replace(/…/g, '...');
  return s.replace(/\s+/g, ' ').trim();
}
