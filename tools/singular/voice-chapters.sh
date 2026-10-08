#!/usr/bin/env bash
# Voice some chapters end to end: export every line from the running dev server, keep the given chapters,
# record the missing lines with Kokoro, and rebuild those chapters' banks (other banks are kept).
#   tools/singular/voice-chapters.sh <kokoro-model-dir> <python> c02 c03 ...
set -euo pipefail
MODEL="$1"; PY="$2"; shift 2
TMP="$(mktemp -d)"
node tests/singular/browser/game-lines.mjs "$TMP/all.json" > /dev/null
"$PY" - "$TMP/all.json" "$TMP/sel.json" "$@" <<'PYEOF'
import json, sys
src, dst, *chs = sys.argv[1:]
lines = [l for l in json.load(open(src)) if l.get('chapter') in chs]
json.dump(lines, open(dst, 'w'))
print(f'{len(lines)} lines in {", ".join(chs)}')
PYEOF
nice -n 15 "$PY" tools/singular/voices.py "$TMP/sel.json" --model "$MODEL"
"$PY" tools/singular/pack_voices.py "$TMP/sel.json"
rm -rf "$TMP"
