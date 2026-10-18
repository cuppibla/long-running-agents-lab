"""What the lab remembers between requests — and across restarts.

Nothing here is a checklist the page ticks. These are the receipts of things
that actually ran: every wake (who woke it, which tools ran, what the venue
sold during it, what the file said at the time), every reply on the stage,
every boot of the process. `progress.read()` turns them, together with a look
at your files, into which chapter is lit. Kept in runs/state.json and
runs/boots.json.

BOOT_ID is one id per process. It changes when the lab restarts — 💀 KILL THE
PROCESS is a chapter, so the page shows it.
"""
from __future__ import annotations

import json
import os
import threading
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
FILE = RUNS / "state.json"
BOOTS = RUNS / "boots.json"
_lock = threading.Lock()

BOOT_ID = uuid.uuid4().hex[:8]
BOOT_AT = time.time()

STATE: dict = {
    "wakes": [],          # newest last: every run of the agent — source stage|clock, session_id, tools, calls, orders_new, code, boot_id
    "stage": {},          # the stage's current session id, so the clock can answer a parked run (chapter V)
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
        tmp = FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(STATE, indent=1))
        tmp.replace(FILE)


def push(key: str, row: dict, keep: int = 60) -> dict:
    row = {"ts": round(time.time(), 1), **row}
    STATE.setdefault(key, []).append(row)
    del STATE[key][:-keep]
    save()
    return row


def set_(key: str, value) -> None:
    STATE[key] = value
    save()


def boots() -> list[dict]:
    if not BOOTS.exists():
        return []
    try:
        return json.loads(BOOTS.read_text())
    except json.JSONDecodeError:
        return []


def record_boot() -> None:
    """Append this process to runs/boots.json — chapter III counts them."""
    RUNS.mkdir(exist_ok=True)
    rows = boots()
    rows.append({"boot_id": BOOT_ID, "t": round(BOOT_AT, 1), "pid": os.getpid()})
    BOOTS.write_text(json.dumps(rows[-40:], indent=1))


load()
