"""What the lab remembers between requests — and across restarts.

Nothing here is a checklist the page ticks. These are the receipts of things
that actually ran: exams (with their score and whether the edit was in when
they ran), replies made on the stage. `progress.read()` turns them, together
with a look at your files, into which chapter is lit. Kept in runs/state.json.

BOOT_ID is one id per process. It changes when the lab restarts; the page
shows it so a restart is visible.
"""
from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
FILE = RUNS / "state.json"
_lock = threading.Lock()

BOOT_ID = uuid.uuid4().hex[:8]

STATE: dict = {
    "exams": [],                      # newest last: {ts, score, of, edit, tools, model, cases}
    "says": [],                       # newest last: {ts, who, text, reply, tools}
}


def load() -> None:
    RUNS.mkdir(exist_ok=True)
    if FILE.exists():
        try:
            STATE.update(json.loads(FILE.read_text()))
        except json.JSONDecodeError:
            pass


def save() -> None:
    with _lock:
        RUNS.mkdir(exist_ok=True)
        FILE.write_text(json.dumps(STATE, indent=1))


def push(key: str, row: dict, keep: int = 40) -> dict:
    row = {"ts": round(time.time(), 1), **row}
    STATE[key].append(row)
    del STATE[key][:-keep]
    save()
    return row


def set_(key: str, value) -> None:
    STATE[key] = value
    save()


load()
