"""Long things run as subprocesses, their output streamed to the page.

    exam      python scripts/exam.py          (chapter II)

One job of each kind at a time. A line a subprocess prints as `@@event {…}`
is appended to the event log; every other line is its log. When a job ends,
its summary is written to state (exams) — that is what lights a chapter.

CHANGE ME (the chapters): add a builder + finisher per job kind, and list
them in BUILDERS / FINISHERS. Table for N's kitchen/jobs.py has seven kinds
(exam · optimize · loop · deploy · traffic · pipe · harvest) to copy from.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from collections import deque
from pathlib import Path

from lab import env, events, progress, state

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
PY = sys.executable

JOBS: dict[str, "Job"] = {}


class Job:
    def __init__(self, kind: str, argv: list[str], extra_env: dict | None = None, meta: dict | None = None):
        self.kind, self.argv = kind, argv
        self.extra_env = extra_env or {}
        self.meta = meta or {}
        self.state = "idle"
        self.rc: int | None = None
        self.started = self.ended = 0.0
        self.log: deque[str] = deque(maxlen=600)
        self.summary: dict = {}
        self.episode: int | None = None
        self.proc: asyncio.subprocess.Process | None = None

    def view(self) -> dict:
        return {"kind": self.kind, "state": self.state, "rc": self.rc, "started": self.started, "ended": self.ended,
                "elapsed": round((self.ended or time.time()) - self.started, 1) if self.started else 0,
                "log": list(self.log)[-80:], "summary": self.summary, "meta": self.meta, "episode": self.episode}


def running(kind: str) -> bool:
    j = JOBS.get(kind)
    return bool(j and j.state == "running")


async def start(kind: str, **opts) -> Job:
    if running(kind):
        raise RuntimeError(f"a {kind} job is already running")
    env.settle()
    builder = BUILDERS[kind]
    job = builder(**opts)
    JOBS[kind] = job
    job.state, job.started = "running", time.time()
    asyncio.get_event_loop().create_task(_run(job))
    return job


async def _run(job: Job) -> None:
    penv = dict(os.environ, PYTHONUNBUFFERED="1", PYTHONPATH=str(ROOT), **job.extra_env)
    try:
        job.proc = await asyncio.create_subprocess_exec(
            *job.argv, cwd=str(ROOT), env=penv,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
        assert job.proc.stdout is not None
        while True:
            raw = await job.proc.stdout.readline()
            if not raw:
                break
            line = raw.decode("utf-8", "replace").rstrip("\n")
            if line.startswith("@@event "):
                try:
                    ev = json.loads(line[8:])
                    events.emit(ev.pop("type"), **ev)
                except (json.JSONDecodeError, KeyError):
                    job.log.append(line)
                continue
            job.log.append(line)
        job.rc = await job.proc.wait()
    except Exception as exc:                                       # noqa: BLE001
        job.log.append(f"[lab] {type(exc).__name__}: {exc}")
        job.rc = -1
    job.ended = time.time()
    try:
        FINISHERS[job.kind](job)
    except Exception as exc:                                       # noqa: BLE001
        job.log.append(f"[lab] could not read the result: {type(exc).__name__}: {exc}")
    job.state = "done" if job.rc == 0 else "error"
    if job.episode is not None:
        events.emit("episode_done", job=job.kind, rc=job.rc)


async def stop(kind: str) -> bool:
    j = JOBS.get(kind)
    if j and j.proc and j.state == "running":
        j.proc.terminate()
        return True
    return False


# ── exam ─────────────────────────────────────────────────────────────────────
def _exam(**_) -> Job:
    stamp = time.strftime("%Y%m%d-%H%M%S")
    receipt = RUNS / "exam" / f"{stamp}.json"
    receipt.parent.mkdir(parents=True, exist_ok=True)
    job = Job("exam", [PY, "scripts/exam.py"],
              extra_env={"LAB_RECEIPT": str(receipt)},
              meta={"receipt": str(receipt.relative_to(ROOT)), "edit": progress.edit_in_file()})
    job.episode = events.start_episode("exam", edit=job.meta["edit"])
    return job


def _finish_exam(job: Job) -> None:
    """scripts/exam.py wrote one JSON receipt; the facts about the code that
    ran (edit in or not, which tools) are inside it, so a lamp earned under
    one state of the file stays earned when the file changes back."""
    rp = ROOT / job.meta["receipt"]
    if not rp.exists():
        job.summary = {"note": "no receipt — the exam did not finish"}
        return
    r = json.loads(rp.read_text())
    job.summary = {k: r.get(k) for k in ("score", "of", "edit", "tools", "model")} | {"receipt": job.meta["receipt"]}
    if job.rc == 0 and r.get("of"):
        state.push("exams", job.summary | {"cases": r.get("cases", [])})


BUILDERS = {"exam": _exam}
FINISHERS = {"exam": _finish_exam}


def views() -> dict:
    return {k: j.view() for k, j in JOBS.items()}
