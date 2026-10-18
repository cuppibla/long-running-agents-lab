#!/usr/bin/env bash
# Shoot the page in every chapter state, for the codelab and the README.
# Drives a RUNNING lab through its own API (the same routes the page uses),
# then photographs each state with headless Chrome in capture mode (?still=1,
# which reads the log once instead of holding the event stream open).
#
#   bash scripts/capture.sh [out_dir]        default: runs/shots
#   LAB_URL=http://127.0.0.1:3900 bash scripts/capture.sh
#
# Chrome's own --timeout ends each shot; no shell `timeout` is needed (macOS
# has none by default). Leaves agent/agent.py as shipped at the end.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-runs/shots}"; mkdir -p "$OUT"
URL="${LAB_URL:-http://127.0.0.1:3600}"
CH="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PY=.venv/bin/python
# A throwaway profile: without it, headless Chrome hands the URL to an already
# running Chrome and exits without writing the screenshot.
PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/lab-shots.XXXXXX")"; trap 'rm -rf "$PROFILE"' EXIT

shoot() { if "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$PROFILE" --window-size=1440,1100 \
    --virtual-time-budget=9000 --timeout=12000 --screenshot="$OUT/$1.png" "$URL$2" >/dev/null 2>&1 && [ -s "$OUT/$1.png" ]; then echo "  shot $1"; else echo "  FAILED $1"; fi; }
walk() { $PY scripts/walk.py --base "$URL" --only "$1" >/dev/null 2>&1 || true; }

echo "cover + chapter I"
shoot cover "/"
shoot ch1 "/lab/?ch=1&still=1"

echo "chapter II"
shoot ch2-before "/lab/?ch=2&still=1"
walk 2
shoot ch2-after "/lab/?ch=2&still=1"
shoot console "/lab/?ch=2&still=1&console=1"

echo "chapter III"
shoot ch3 "/lab/?ch=3&still=1"
shoot ch3-check "/lab/?ch=3&still=1&check=1"

echo "restore"
$PY scripts/walk.py --base "$URL" --only 3 --restore >/dev/null 2>&1 || true
ls -la "$OUT" | awk 'NR>1{print $5, $9}'
