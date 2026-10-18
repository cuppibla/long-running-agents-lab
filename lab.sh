#!/usr/bin/env bash
# Open the lab: ONE process on ONE port. Ctrl+C closes it.
#
#   bash lab.sh              → http://localhost:3490
#   PORT=3499 bash lab.sh    → somewhere else
#
# The page (site/) is a Next.js app exported to static files once, here, and
# served by the same Python process that runs the agent, the clock's door, the
# venue, the editor and the workbench. One origin, one port — in Cloud Shell too.
# It refuses to start unconfigured: no .env, no .venv, or no model path.
#
# 💀 KILL THE PROCESS (chapter III) ends the process on purpose: what survives a
# restart is the lesson. The loop at the bottom brings it back the way a
# deployment would. To stop the lab, stop THIS script (Ctrl+C), not uvicorn.
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-3490}"
NAME="${LAB_NAME:-Long-Running Agents}"

if [ ! -f .env ]; then
  echo "No .env yet. Run:  ./setup_codelab.sh   (or: cp .env.example .env)"
  exit 1
fi
if [ ! -x .venv/bin/python ]; then
  echo "No .venv yet. Run:  ./setup_codelab.sh   (or: uv sync)"
  exit 1
fi
if ! .venv/bin/python -c "import sys; sys.path.insert(0,'.'); from lab import env; sys.exit(0 if env.MODE else 1)" 2>/dev/null; then
  echo "Not configured yet. Point gcloud at a project:"
  echo "    gcloud config set project YOUR_PROJECT_ID"
  echo "or put a GOOGLE_API_KEY in .env. See .env.example."
  exit 1
fi

needs_build=0
if [ ! -f site/out/index.html ]; then
  needs_build=1
elif [ -n "$(find site/app site/components site/lib site/public site/package.json -newer site/out/index.html -print -quit 2>/dev/null)" ]; then
  needs_build=1
fi
if [ "$needs_build" = 1 ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found. The page (site/) is a Next.js app and needs Node 20+: https://nodejs.org/en/download"
    exit 1
  fi
  if [ ! -x site/node_modules/.bin/next ]; then
    echo "  installing the page's packages (site/) — about a minute, once…"
    (cd site && if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi)
  fi
  echo "  building the page (site/) — about a minute…"
  (cd site && npm run build >/dev/null)
fi

echo
echo "  ${NAME}      → http://localhost:${PORT}"
echo "  the workbench           → http://localhost:${PORT}/workbench/dev-ui/?app=concert"
echo "  the venue's panel       → http://localhost:${PORT}/venue/panel"
echo

cleanup() { pkill -P $$ 2>/dev/null || true; }
trap cleanup EXIT INT TERM

# keep open: 💀 exits the process with code 3; a second later the lab is back
# with a new boot id, reading lab.db from disk. Any other exit is a crash and is
# retried the same way, so a broken save never leaves the page dead.
export LAB_PORT="$PORT"
while true; do
  .venv/bin/uvicorn lab.service:app --host 0.0.0.0 --port "$PORT" --log-level warning || true
  sleep 1
done
