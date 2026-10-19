#!/usr/bin/env bash
# Shoot the page in every chapter state, for the codelab and the README.
# Drives a RUNNING lab through its own API (the same routes the page uses),
# then photographs each state with headless Chrome in capture mode (?still=1,
# which reads the log once instead of holding the event stream open).
#
#   bash scripts/capture.sh [out_dir]        default: runs/shots
#   LAB_URL=http://127.0.0.1:3499 bash scripts/capture.sh
#
# Chrome's own --timeout ends each shot; no shell `timeout` is needed (macOS
# has none by default). Leaves the repo as shipped at the end (walk --restore).
# Chapters I–VI in both states, the cover, the console, the breakfast message.
# The receipts file (runs/state.json) is moved aside first so the "as shipped"
# shots show an untorn page, and put back at the end.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-runs/shots}"; mkdir -p "$OUT"
URL="${LAB_URL:-http://127.0.0.1:3490}"
CH="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PY=.venv/bin/python
PROFILE="$(mktemp -d "${TMPDIR:-/tmp}/lra-shots.XXXXXX")"; trap 'rm -rf "$PROFILE"' EXIT

shoot() { if "$CH" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$PROFILE" --window-size=1440,1250 \
    --virtual-time-budget=9000 --timeout=12000 --screenshot="$OUT/$1.png" "$URL$2" >/dev/null 2>&1 && [ -s "$OUT/$1.png" ]; then echo "  shot $1"; else echo "  FAILED $1"; fi; }
walk() { $PY scripts/walk.py --base "$URL" --only "$1" >/dev/null 2>&1 || true; }

reboot() {  # 💀 through the API; lab.sh brings the lab back and it reads runs/state.json at boot.
  # The kill handler saves the receipts on its way out, so a file swap ($1 → $2) happens
  # right AFTER the request returns and BEFORE the next boot loads it.
  local b0; b0=$(curl -s "$URL/api/health" | $PY -c 'import sys,json;print(json.load(sys.stdin)["boot_id"])')
  curl -s -X POST "$URL/api/kill" >/dev/null || true
  sleep 0.3
  if [ -n "${1:-}" ] && [ -f "$1" ]; then mv "$1" "$2"; fi
  for _ in $(seq 1 60); do sleep 0.7; b=$(curl -s --max-time 2 "$URL/api/health" 2>/dev/null | $PY -c 'import sys,json;print(json.load(sys.stdin)["boot_id"])' 2>/dev/null || true); [ -n "$b" ] && [ "$b" != "$b0" ] && return 0; done
  echo "the lab did not come back"; return 1
}

echo "as shipped (receipts aside)"
$PY scripts/walk.py --base "$URL" --restore >/dev/null 2>&1 || true
reboot runs/state.json runs/state.before-capture.json
shoot cover "/?as=Annie"
for n in 1 2 3 4 5 6; do shoot "ch$n-before" "/lab/?ch=$n&still=1&as=Annie"; done

echo "chapter I"
walk 1
shoot ch1-after "/lab/?ch=1&still=1&as=Annie"
shoot console "/lab/?ch=1&still=1&console=1&as=Annie"

echo "chapter II"
walk 2
shoot ch2-after "/lab/?ch=2&still=1&as=Annie"

echo "chapter III"
walk 3
shoot ch3-after "/lab/?ch=3&still=1&as=Annie"

echo "chapter IV"
walk 4
shoot ch4-after "/lab/?ch=4&still=1&as=Annie"
shoot console-4 "/lab/?ch=4&still=1&console=1&as=Annie"

echo "chapter V"
walk 5
shoot ch5-after "/lab/?ch=5&still=1&as=Annie"
shoot console-5 "/lab/?ch=5&still=1&console=1&as=Annie"

echo "chapter VI"
walk 6
shoot ch6-after "/lab/?ch=6&still=1&as=Annie"
shoot console-6 "/lab/?ch=6&still=1&console=1&as=Annie"
shoot breakfast "/lab/?ch=7&still=1&as=Annie"

echo "restore"
$PY scripts/walk.py --base "$URL" --restore >/dev/null 2>&1 || true
if [ -f runs/state.before-capture.json ]; then reboot runs/state.before-capture.json runs/state.json; fi
ls -la "$OUT" | awk 'NR>1{print $5, $9}'
