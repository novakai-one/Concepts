"""Generate the game's voice lines with Kokoro TTS (kokoro-onnx).

Input:  a JSON list of lines [{ "id", "who", "spoken", "voice", "speed" }]
        (written by `node tests/singular/browser/game-lines.mjs`, which reads every line from the running game).
Output: voice-cache/<id>.mp3 for each line (pack_voices.py then builds the banks).

Lines that already have an mp3 are skipped, so editing one line only re-records that line.
Usage:
  python tools/singular/voices.py lines.json --model DIR [--only who] [--limit N]
Needs: kokoro-onnx, soundfile, numpy, and ffmpeg on the PATH.
"""
import argparse, json, os, re, subprocess, sys, tempfile, time
import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'voice-cache')  # per-line recordings (not published; packed into banks)

# Phoneme fixes applied after espeak's phonemiser (pattern on phonemes → replacement).
PHONEME_FIXES = [
    (r'ˈaɪdʒən', 'ˈaɪɡən'),   # eigen- : "eye-gen", not "eye-jen"
    (r'aɪdʒən', 'aɪɡən'),
]
# Text fixes applied before phonemising (word → how to say it).
TEXT_FIXES = [
    (r'\bRREF\b', 'R R E F'), (r'\bREF\b', 'R E F'), (r'\bSVD\b', 'S V D'), (r'\bPCA\b', 'P C A'),
    (r'\bQR\b', 'Q R'), (r'\bLU\b', 'L U'), (r'\bAI\b', 'A I'), (r'\b2-D\b', 'two D'), (r'\b3-D\b', 'three D'),
    (r'\b2D\b', 'two D'), (r'\b3D\b', 'three D'), (r'\bdet\b', 'det'), (r'×', ' by '), (r'≈', ' about '),
    (r'\bvs\.?\b', 'versus'), (r'—', ', '), (r'–', ' to '),
]

def lang_for(voice):
    return 'en-gb' if voice.startswith('b') else 'en-us'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('--model', required=True, help='folder with kokoro-v1.0.onnx and voices-v1.0.bin')
    ap.add_argument('--only', default=None)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--extra-fixes', default=None, help='JSON file: {"text": [[re, rep]], "phonemes": [[re, rep]]}')
    a = ap.parse_args()
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))
    text_fixes = list(TEXT_FIXES)
    ph_fixes = list(PHONEME_FIXES)
    if a.extra_fixes:
        ex = json.load(open(a.extra_fixes))
        text_fixes += [tuple(x) for x in ex.get('text', [])]
        ph_fixes += [tuple(x) for x in ex.get('phonemes', [])]
    lines = json.load(open(a.lines))
    os.makedirs(OUT, exist_ok=True)
    todo = [l for l in lines if not os.path.exists(os.path.join(OUT, l['id'] + '.mp3')) and (not a.only or l['who'] == a.only)]
    if a.limit: todo = todo[:a.limit]
    print(f'{len(lines)} lines, {len(todo)} to record', flush=True)
    t0 = time.time()
    for i, l in enumerate(todo):
        text = l['spoken']
        for pat, rep in text_fixes: text = re.sub(pat, rep, text)
        voice = l['voice']
        lang = lang_for(voice)
        ph = k.tokenizer.phonemize(text, lang)
        for pat, rep in ph_fixes: ph = re.sub(pat, rep, ph)
        # long lines: kokoro handles ~500 phonemes per pass; split on sentence ends if needed
        chunks = split_phonemes(ph, 480)
        audio = []
        sr = 24000
        for c in chunks:
            s, sr = k.create(c, voice=voice, speed=float(l.get('speed', 1.0)), lang=lang, is_phonemes=True)
            audio.append(s)
            audio.append(np.zeros(int(sr * 0.12), dtype=np.float32))
        samples = np.concatenate(audio[:-1]) if len(audio) > 1 else audio[0]
        samples = trim(samples, sr)
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            sf.write(tmp.name, samples, sr)
            out = os.path.join(OUT, l['id'] + '.mp3')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af', 'highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7',
                            '-ac', '1', '-ar', '24000', '-b:a', '56k', out], check=True)
            os.unlink(tmp.name)
        if (i + 1) % 10 == 0 or i + 1 == len(todo):
            el = time.time() - t0
            print(f'  {i + 1}/{len(todo)}  ({el:.0f}s, {el / (i + 1):.1f}s per line)', flush=True)
    print('done; now run tools/singular/pack_voices.py to build the chapter banks', flush=True)

def split_phonemes(ph, n):
    if len(ph) <= n: return [ph]
    parts, cur = [], ''
    for seg in re.split(r'(?<=[.!?;])\s+', ph):
        if len(cur) + len(seg) + 1 > n and cur:
            parts.append(cur); cur = seg
        else:
            cur = (cur + ' ' + seg).strip()
    if cur: parts.append(cur)
    out = []
    for p in parts:
        while len(p) > n:
            cut = p.rfind(' ', 0, n)
            cut = cut if cut > 0 else n
            out.append(p[:cut]); p = p[cut:].strip()
        out.append(p)
    return out

def trim(s, sr, thresh=0.004):
    idx = np.where(np.abs(s) > thresh)[0]
    if not len(idx): return s
    a = max(0, idx[0] - int(sr * 0.04)); b = min(len(s), idx[-1] + int(sr * 0.12))
    return s[a:b]

if __name__ == '__main__':
    main()
