"""Long things run as subprocesses, their output streamed to the page.

    wake    python -m monstertix.clock --in 10 --message "…"    (🐓 WAKE IT AT 3AM)
    seed    python -m seed.session + the memory file              (rebuild the two-days-ago session)
    replay  python -m lab.replay                                  (▶ a longer conversation: the source lab's
                                                                   eight step-5 sentences into one fresh session)

One job of each kind at a time. A line a subprocess prints as `@@event {…}` is
appended to the event log; the clock prints `[clock] …` lines, which
`TRANSLATE["wake"]` turns into events; every other line is the job's log.

The wake job does not touch the agent. It is the source lab's clock.py, verbatim:
a sleep and a POST to /api/wake, which is where the agent runs. The receipt of
that run is written by lab/runner.py, not here. The replay job is the same shape
through the other door: eight POSTs to /api/say, one session, receipts per turn.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import sys
import time
from collections import deque
from pathlib import Path

from lab import env, events, state

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
    translate = TRANSLATE.get(job.kind)
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
            if translate:
                translate(job, line)
        job.rc = await job.proc.wait()
    except Exception as exc:                                       # noqa: BLE001
        job.log.append(f"[lab] {type(exc).__name__}: {exc}")
        job.rc = -1
    job.ended = time.time()
    try:
        FINISHERS[job.kind](job)
    except Exception as exc:                                       # noqa: BLE001
        job.log.append(f"[lab] could not finish: {type(exc).__name__}: {exc}")
    job.state = "done" if job.rc == 0 else "error"
    if job.episode is not None:
        events.emit("job_done", job=job.kind, rc=job.rc)


async def stop(kind: str) -> bool:
    j = JOBS.get(kind)
    if j and j.proc and j.state == "running":
        j.proc.terminate()
        return True
    return False


# ── wake: the clock ──────────────────────────────────────────────────────────
def _wake(**opts) -> Job:
    delay = float(opts.get("in", 10))
    message = str(opts.get("message") or env.WAKE_MESSAGE)
    job = Job("wake", [PY, "-m", "monstertix.clock", "--in", f"{delay:g}", "--message", message],
              meta={"in": delay, "message": message, "boot_id": state.BOOT_ID})
    job.episode = events.start_episode("clock", **{"in": delay})
    return job


def _translate_clock(job: Job, line: str) -> None:
    s = line.strip()
    if s.startswith("[clock] first fire"):
        events.emit("clock_armed", text=s[8:], **{"in": job.meta["in"]})
    elif s.startswith("[clock] firing"):
        events.emit("clock_fired", text=s[8:])
    elif s.startswith("[clock] done"):
        events.emit("clock_done", text=s[8:])
    elif s.startswith("[clock] nothing listening") or s.startswith("[clock] trigger returned"):
        events.emit("error", message=s[8:])


def _finish_wake(job: Job) -> None:
    wakes = [w for w in state.STATE.get("wakes", []) if w.get("source") == "clock" and w.get("ts", 0) >= job.started]
    job.summary = {"fired": any("firing" in l for l in job.log), "runs": len(wakes),
                   "tools": wakes[-1]["tools"] if wakes else [], "orders": wakes[-1]["orders_new"] if wakes else []}


# ── seed: the two-days-ago session and the memory file ──────────────────────
def _seed(**_) -> Job:
    job = Job("seed", [PY, "-m", "seed.session"],
              extra_env={"SEED_DB_URL": f"sqlite+aiosqlite:///{ROOT / 'lab.db'}", "SEED_USER_ID": "user"},
              meta={"session": "two-days-ago"})
    job.episode = events.start_episode("seed")
    return job


def _finish_seed(job: Job) -> None:
    """The source's `use-solution.sh` copies seed/memory/default.md over
    memory/userx.md so every run starts from the same four facts. So does this."""
    src, dst = ROOT / "seed" / "memory" / "default.md", ROOT / "memory" / "userx.md"
    dst.parent.mkdir(exist_ok=True)
    shutil.copyfile(src, dst)
    job.summary = {"session": "two-days-ago", "memory": "memory/userx.md ← seed/memory/default.md"}
    events.emit("seeded", session="two-days-ago", memory="memory/userx.md")


# ── replay: the longer conversation (chapter II) ─────────────────────────────
def _replay(**_) -> Job:
    from lab import replay                                         # noqa: PLC0415 — the sentence list, nothing else
    job = Job("replay", [PY, "-m", "lab.replay"], meta={"turns": len(replay.SENTENCES), "turn": 0, "text": "", "who": replay.WHO})
    job.episode = events.start_episode("replay", turns=len(replay.SENTENCES))
    return job


_TURN = re.compile(r"^\[replay\] (\d+)/(\d+) → (.*)$")


def _translate_replay(job: Job, line: str) -> None:
    m = _TURN.match(line.strip())
    if m:
        job.meta["turn"], job.meta["text"] = int(m.group(1)), m.group(3).strip("'\"")[:80]
        events.emit("replay_turn", n=int(m.group(1)), of=int(m.group(2)), text=job.meta["text"])
    elif line.strip().startswith("[replay] nothing listening") or "— stopping" in line:
        events.emit("error", message=line.strip()[9:])


def _finish_replay(job: Job) -> None:
    """The summary is the receipt lab/progress.py computes for this session: turns,
    compactions, budget_plan overwritten, the order."""
    from lab import progress                                       # noqa: PLC0415 — progress imports jobs' siblings
    rows = [w for w in state.STATE.get("wakes", []) if w.get("who") == job.meta.get("who") and w.get("ts", 0) >= job.started]
    r = progress.replay_receipt(rows).get("after") or {}
    job.summary = {k: r.get(k) for k in ("session_id", "turns", "compactions", "compaction_at", "overwritten", "order", "lit")}


BUILDERS = {"wake": _wake, "seed": _seed, "replay": _replay}
FINISHERS = {"wake": _finish_wake, "seed": _finish_seed, "replay": _finish_replay}
TRANSLATE = {"wake": _translate_clock, "replay": _translate_replay}


def views() -> dict:
    return {k: j.view() for k, j in JOBS.items()}
