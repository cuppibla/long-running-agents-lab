"""Is this machine ready, and which stubs are torn?

Run it now, and again any time you want the answer to "where am I?" — every
line is read from your files and the lab's receipts, never a checklist.

    uv run python scripts/preflight.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from lab import env  # noqa: E402  — settles Vertex-vs-key before anything else

TICK, BOX = "\033[32m✓\033[0m", "\033[90m▢\033[0m"
DIM, OFF = "\033[90m", "\033[0m"


def model_check() -> str:
    """One real call to the lab's model, the way the agent makes it."""
    from google import genai
    from google.genai import types

    client = genai.Client()
    r = client.models.generate_content(
        model=os.environ.get("ADK_MODEL", "gemini-2.5-flash"), contents="Reply with exactly: the presale is open.",
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=0), temperature=0.0))
    return (r.text or "").strip()


def why(mode: str) -> str:
    where = os.environ.get("GOOGLE_CLOUD_LOCATION", "")
    if mode == "vertex":
        return ("If it says 403 PERMISSION_DENIED, the credentials on this machine are not on the project.\n"
                "    In Cloud Shell this does not happen. On a laptop: gcloud auth application-default login,\n"
                "    then gcloud auth application-default set-quota-project YOUR_PROJECT_ID.\n"
                f"    If it says the model was not found, try GOOGLE_CLOUD_LOCATION=global (now: {where or 'unset'}).")
    return "Check GOOGLE_API_KEY in .env — https://aistudio.google.com/apikey"


def chapters(p: dict) -> list[str]:
    code, lit = p["code"], p["lit"]
    rows = [
        (1, "I", "the clock", "", "say the plan · 🐓 wake it at 3am"),
        (2, "II", "where a fact lives", "recall is in" if code.get("recall") else "no recall yet", "delete one “# ” in agent/concert/agent.py · 🐓 again"),
        (3, "III", "the kill", "queue tools in" if code.get("queue") else "no queue tool yet", "phase 2"),
        (4, "IV", "old news", "fence armed" if code.get("fence") else "no fence yet", "phase 2"),
        (5, "V", "the graph", "root is the graph" if code.get("graph") else "root is the agent", "phase 3"),
        (6, "VI", "the budget", "agree_budget first" if code.get("budget") else "default budget", "phase 3"),
        (7, "VII", "breakfast", "", "six stubs"),
    ]
    return [f"  {r:<4}{TICK if lit.get(str(n)) else BOX} {name:<20}{DIM}· {how:<22}{note}{OFF}"
            for n, r, name, how, note in rows]


def main() -> int:
    print()
    mode = env.MODE
    if not mode:
        print("  ✗ Not configured. Point gcloud at a project:")
        print("        gcloud config set project YOUR_PROJECT_ID")
        print("    — or put a GOOGLE_API_KEY in .env. See .env.example.")
        return 1
    where = os.environ.get("GOOGLE_CLOUD_PROJECT", "?") if mode == "vertex" else "an API key"
    print(f"  talking to Gemini through {DIM}{mode} · {where}{OFF}")

    try:
        heard = model_check()
        print(f"  the model answers {DIM}· {os.environ.get('ADK_MODEL')} · it said: {heard[:48]}{OFF}")
    except Exception as exc:                                   # noqa: BLE001
        print(f"  ✗ the model did not answer: {type(exc).__name__}: {exc}"[:240])
        print("    " + why(mode))
        return 1

    built = (ROOT / "site" / "out" / "index.html").exists()
    print(f"  the page {DIM}· " + ("built" if built else "not built yet — bash lab.sh builds it once") + OFF)
    print(f"  the venue {DIM}· runs inside the lab's process on 127.0.0.1:{env.VENUE_PORT} (chosen per boot){OFF}")

    from lab import progress
    p = progress.read()
    print("\n  the stubs:\n")
    for line in chapters(p):
        print(line)
    print(f"\n  {DIM}a stub tears when something real proves it — a session the clock made, an order at the venue —"
          f" not when the code reads right.{OFF}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
