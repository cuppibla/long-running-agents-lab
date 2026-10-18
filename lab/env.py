"""Settle how the lab talks to Gemini — and where the venue is — once, for every process.

Two ways to reach Gemini, in this order:

  1. Vertex AI (the default): your Google Cloud project + the credentials you
     already have. In Cloud Shell the project is whatever `gcloud config set
     project` named; `.env` can also name it.
  2. An API key, if you would rather not use a project. Put `GOOGLE_API_KEY=…`
     in `.env`.

`.env` is read OVER the shell (`override=True`), the way ADK's own loader does,
so the file is what counts. A key wins only when Vertex was not asked for.

The venue (venue/app.py, the source lab's fake ticket seller) runs INSIDE this
process on a loopback port of its own, so `VENUE_URL` is decided here too and
never comes from `.env`. The agent's tools call it with a blocking HTTP client,
and ADK runs those tools on the event loop — a venue mounted on the same loop
would wait for itself. A second loop in a thread is the honest in-process shape.
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
ADC = Path.home() / ".config" / "gcloud" / "application_default_credentials.json"
RUNS = ROOT / "runs"

#: the one sentence the clock sends, all lab long
WAKE_MESSAGE = "The presale just opened. Get us tickets to the Amsterdam show."

#: "vertex", "key", or "" (nothing set). Read it for messages, not logic.
MODE = ""


def _argv_port() -> int | None:
    """uvicorn's `--port N` (or `--port=N`), when this process was started by lab.sh."""
    for i, a in enumerate(sys.argv):
        if a == "--port" and i + 1 < len(sys.argv) and sys.argv[i + 1].isdigit():
            return int(sys.argv[i + 1])
        if a.startswith("--port=") and a[7:].isdigit():
            return int(a[7:])
    return None


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


#: the port the page is served on (lab.sh exports LAB_PORT; uvicorn's --port is the fallback)
PORT = int(os.environ.get("LAB_PORT") or _argv_port() or 3490)
#: the venue's own loopback port, inside this process (fixed per process, chosen free)
VENUE_PORT = int(os.environ.get("LAB_VENUE_PORT") or _free_port())
VENUE_URL = f"http://127.0.0.1:{VENUE_PORT}"


def _gcloud_project() -> str:
    for var in ("GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_QUOTA_PROJECT", "GCP_PROJECT"):
        if os.environ.get(var):
            return os.environ[var]
    try:
        out = subprocess.run(["gcloud", "config", "get-value", "project"],
                             capture_output=True, text=True, timeout=8).stdout.strip()
        return "" if out in ("", "(unset)") else out
    except (OSError, subprocess.SubprocessError):
        return ""


def _world() -> None:
    """The source lab's own variables, pinned to this repo: the venue, the memory file,
    the model. These are facts about the process, so .env never overrides them."""
    os.environ["VENUE_URL"] = VENUE_URL
    os.environ["VENUE_DB"] = str(RUNS / "venue.db")
    os.environ["AGENT_URL"] = f"http://127.0.0.1:{PORT}/api/wake"        # the venue's DROP THE PRESALE target
    os.environ["TRIGGER_URL"] = f"http://127.0.0.1:{PORT}/api"            # clock.py posts to {TRIGGER_URL}/wake
    os.environ["MEMORY_DIR"] = str(ROOT / "memory")
    os.environ["MEMORY_USER"] = "userx"
    os.environ["LAB_VENUE_PORT"] = str(VENUE_PORT)
    os.environ["LAB_PORT"] = str(PORT)
    os.environ.setdefault("ADK_MODEL", "gemini-2.5-flash")
    os.environ.pop("UNATTENDED", None)       # attended is the default; /api/wake marks itself unattended per request


def settle() -> str:
    """Load .env, pick a mode, export exactly the variables it needs."""
    global MODE
    load_dotenv(ENV_FILE, override=True)
    _world()
    if os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = os.environ.pop("GEMINI_API_KEY")
    key = os.environ.get("GOOGLE_API_KEY", "").strip()
    has_key = key not in ("", "YOUR_GOOGLE_API_KEY_HERE")
    wants_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").upper() in ("1", "TRUE", "YES")

    if has_key and not wants_vertex:
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "FALSE"
        MODE = "key"
        return MODE

    project = _gcloud_project()
    if wants_vertex or (ADC.exists() and project):
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "TRUE"
        if project:
            os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project)
        # gemini-2.5-flash is served from `global`, which draws on capacity across regions.
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
        os.environ.pop("GOOGLE_API_KEY", None)        # never send both
        MODE = "vertex"
        return MODE

    MODE = "key" if has_key else ""
    return MODE


MODE = settle()


def read_env_line(key: str) -> str:
    """One `KEY=value` line of .env, or ''. Read from the file, not the process."""
    if not ENV_FILE.exists():
        return ""
    for line in ENV_FILE.read_text().splitlines():
        s = line.strip()
        if s.startswith(f"{key}="):
            return s.split("=", 1)[1].strip().strip('"').strip("'")
    return ""
