"""Pack per-line voice mp3s into one audio bank per chapter (fewer files to host).

Input:  lines.json from `node tests/singular/browser/game-lines.mjs` (each line has id and chapter) and
        voice-cache/<id>.mp3 (from voices.py).
Output: site/public/singular/voice/<bank>.mp3 and site/public/singular/voice/manifest.json:
        { "banks": { "<bank>": { "<id>": [start_s, dur_s], ... } } }
A line used by several chapters goes in the first chapter's bank. Banks of chapters not in lines.json are kept.
Usage: python tools/singular/pack_voices.py lines.json
"""
import json, os, subprocess, sys, tempfile
import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VOICE = os.path.join(ROOT, 'site', 'public', 'game', 'voice')
LINES = os.path.join(ROOT, 'voice-cache')
GAP = 0.25  # seconds of silence between lines (keeps neighbours out of each other's window)
SR = 24000

def decode(path):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t:
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), t.name], check=True)
        a, sr = sf.read(t.name, dtype='float32')
        os.unlink(t.name)
    return a

def main():
    lines = json.load(open(sys.argv[1]))
    banks = {}
    seen = set()
    for l in lines:
        if l['id'] in seen: continue
        seen.add(l['id'])
        f = os.path.join(LINES, l['id'] + '.mp3')
        if not os.path.exists(f): continue
        banks.setdefault(l.get('chapter', 'misc'), []).append(l['id'])
    # banks not in this run are kept (pack one chapter without dropping the others)
    mpath = os.path.join(VOICE, 'manifest.json')
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {'banks': {}}
    for bank, ids in banks.items():
        parts, index, t = [], {}, 0.0
        for i in ids:
            a = decode(os.path.join(LINES, i + '.mp3'))
            parts.append(np.zeros(int(SR * GAP), dtype=np.float32))
            t += GAP
            index[i] = [round(t, 4), round(len(a) / SR, 4)]
            parts.append(a)
            t += len(a) / SR
        parts.append(np.zeros(int(SR * GAP), dtype=np.float32))
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            sf.write(tmp.name, np.concatenate(parts), SR)
            out = os.path.join(VOICE, f'{bank}.mp3')
            # constant bit rate keeps seeking exact
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-ar', str(SR), '-b:a', '56k', out], check=True)
            os.unlink(tmp.name)
        manifest['banks'][bank] = index
        print(f'{bank}: {len(ids)} lines, {t:.0f} s, {os.path.getsize(out) / 1e6:.1f} MB', flush=True)
    json.dump(manifest, open(os.path.join(VOICE, 'manifest.json'), 'w'))

if __name__ == '__main__':
    main()
