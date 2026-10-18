"""The trigger: one Runner behind two doors.

    /api/say   a person typed on the stage      → handlers.wake(…) with budget.mark_attended()
    /api/wake  the clock (or the venue) posted   → the same handler, marked unattended

That is the source lab's `monstertix/server.py` collapsed into this process:
the handler is the vendored `monstertix/handlers.py`, untouched; what this file
adds is where the services live and what gets written down afterwards.

The agent package is re-imported from disk on every run, so a saved edit lands
on the next reply without a restart. Sessions, artifacts and the workbench all
point at the same two URIs (`SESSION_URI`, `ARTIFACT_URI`) — a run made here is
a session in adk web, and the other way round.
"""
from __future__ import annotations

import asyncio
import importlib
import logging
import re
import sys
import time
from pathlib import Path
from typing import Any

from google.adk.cli.utils.service_factory import (
    create_artifact_service_from_options,
    create_session_service_from_options,
)
from google.adk.runners import Runner

from lab import env, events, state, venue_mount

log = logging.getLogger("lab.runner")
ROOT = Path(__file__).resolve().parents[1]
AGENTS_DIR = ROOT / "agent"                 # adk web lists this folder; it holds `concert/`
APP = "concert"                              # the folder, the App's name, the session app_name
USER = "user"                                # adk web addresses every session as user `user`; so do we, so they show
SESSION_URI = f"sqlite+aiosqlite:///{ROOT / 'lab.db'}"
ARTIFACT_URI = f"file://{ROOT / 'artifacts'}"

if str(AGENTS_DIR) not in sys.path:
    sys.path.insert(0, str(AGENTS_DIR))

_sessions = None
_artifacts = None
_busy = asyncio.Lock()


def sessions():
    global _sessions
    if _sessions is None:
        _sessions = create_session_service_from_options(base_dir=AGENTS_DIR, session_service_uri=SESSION_URI)
    return _sessions


def artifacts():
    global _artifacts
    if _artifacts is None:
        _artifacts = create_artifact_service_from_options(base_dir=AGENTS_DIR, artifact_service_uri=ARTIFACT_URI)
    return _artifacts


def forget_modules() -> None:
    """Drop every `concert*` module so the next import reads the files as they are now."""
    for n in [m for m in sys.modules if m == APP or m.startswith(APP + ".")]:
        sys.modules.pop(n, None)


def fresh():
    """`concert.agent` as it is on disk right now — a clean re-import of the whole package."""
    forget_modules()
    return importlib.import_module(f"{APP}.agent")


def tool_names(agent) -> list[str]:
    return [getattr(t, "name", getattr(t, "__name__", type(t).__name__)) for t in (getattr(agent, "tools", None) or [])]


_CALLED = re.compile(r"\[server\]\s+called\s+(\S+)")
_SAID = re.compile(r"\[server\]\s+said\s+(.*)")


async def run(message: str, *, session_id: str | None, attended: bool, source: str, who: str = "you") -> dict[str, Any]:
    """One run of the agent, through the vendored handler. Returns the handler's
    dict plus what this lab measured about the run (tools, orders, boot)."""
    message = (message or "").strip() or env.WAKE_MESSAGE
    if _busy.locked():
        raise RuntimeError("a run is already in progress")
    async with _busy:
        env.settle()
        mod = fresh()
        budget = sys.modules[f"{APP}.budget"]
        memory = sys.modules[f"{APP}.memory"]
        handlers = importlib.import_module("monstertix.handlers")
        # Is a person on the other end of THIS request? A ContextVar, scoped to
        # this task: the stage says yes, the clock's door says no, adk web (its
        # own requests) keeps the default, which is yes.
        budget.mark_attended(attended)

        root = mod.root_agent
        kind = type(root).__name__
        tools_in_file = tool_names(root) if kind != "Workflow" else []
        runner = Runner(app=mod.app, session_service=sessions(), artifact_service=artifacts(),
                        memory_service=memory.memory_service)

        t0 = time.time()
        before = _orders()
        ep = events.start_episode(source, who=who, attended=attended, agent=kind)
        events.emit("run_asked", who=who if attended else "the clock", text=message, source=source, attended=attended)
        called: list[str] = []

        def _log(line: str) -> None:
            m = _CALLED.search(line)
            if m:
                name = m.group(1)
                called.append(name)
                events.emit("tool_called", name=name, source=source)
                return
            m = _SAID.search(line)
            if m:
                events.emit("run_said", text=m.group(1)[:300], source=source)
                return
            if line.strip():
                events.emit("runner_line", text=line.strip()[:200], source=source)

        try:
            out = await handlers.wake(runner, sessions(), APP, USER, message=message,
                                      session_id=session_id, log=_log)
        except Exception as exc:                                   # noqa: BLE001
            log.warning("run failed: %s", exc)
            events.emit("error", message=f"{type(exc).__name__}: {exc}"[:300], source=source)
            events.emit("episode_done")
            return {"ok": False, "error": str(exc)[:300], "episode": ep, "session_id": session_id}
        finally:
            try:
                await runner.close()
            except Exception:                                      # noqa: BLE001
                pass

        sid = out["session_id"]
        db = await session_calls(sid)                       # lab.db is the receipt; the log is a hint
        calls = [c for c in (db.get("calls") or []) if c != "adk_request_input"] or [c for c in called if c != "adk_request_input"]
        orders_new = [o for o in _orders() if o["id"] not in {b["id"] for b in before}]
        reply = out["said"][-1] if out["said"] else ""
        events.emit("run_replied", who="the agent", text=reply[:400], tools=calls, awaiting=out["awaiting_input"],
                    session_id=sid, source=source, orders=[_short_order(o) for o in orders_new])
        events.emit("episode_done")
        from lab import progress  # noqa: PLC0415 — progress imports this module
        row = state.push("wakes", {
            "source": source, "attended": attended, "who": who, "session_id": sid, "message": message,
            "said": [s[:400] for s in out["said"]], "reply": reply[:400], "awaiting": out["awaiting_input"],
            "tools": calls, "calls": len(calls), "tools_in_file": tools_in_file, "kind": kind,
            "orders_new": [_short_order(o) for o in orders_new], "boot_id": state.BOOT_ID,
            "elapsed": round(time.time() - t0, 1), "code": progress.code_facts(),
            "db": {k: db.get(k) for k in ("events", "interrupts", "compactions", "state")},
            "artifacts": _artifact_files(sid), "memory_facts": progress.memory_facts(),
        })
        if attended:
            state.set_("stage", {"session_id": sid, "ts": row["ts"]})
        return {"ok": True, "episode": ep, **out, **{k: row[k] for k in ("tools", "calls", "orders_new", "boot_id", "reply", "tools_in_file", "kind", "elapsed", "awaiting", "db")}}


def _artifact_files(session_id: str) -> list[str]:
    """Seat maps get_seatmap saved for this session — files on disk, never in the prompt."""
    base = ROOT / "artifacts"
    if not base.exists():
        return []
    return sorted({p.name for p in base.rglob("*") if session_id in str(p) and "seatmap" in p.name and p.is_file()}
                  | {p.parent.name for p in base.rglob("*") if session_id in str(p) and "seatmap" in p.parent.name and p.is_file()})[:6]


def _orders() -> list[dict]:
    try:
        return venue_mount.module().rows("SELECT o.*, e.weekday, e.city FROM orders o LEFT JOIN events e ON e.id = o.event_id ORDER BY created_at")
    except Exception:                                              # noqa: BLE001
        return []


def _short_order(o: dict) -> dict:
    return {k: o.get(k) for k in ("id", "event_id", "section", "seats", "unit_price", "total", "weekday", "city", "created_at")}


async def session_calls(session_id: str) -> dict:
    """What lab.db holds for one session: function calls by name, interrupts, compactions.
    Read through the session service, not raw SQL."""
    svc = sessions()
    s = await svc.get_session(app_name=APP, user_id=USER, session_id=session_id)
    if s is None:
        return {"exists": False}
    calls, interrupts, compactions = [], 0, 0
    for ev in s.events or []:
        for part in (ev.content.parts if ev.content else []) or []:
            fc = getattr(part, "function_call", None)
            if fc:
                if fc.name == "adk_request_input":
                    interrupts += 1
                else:
                    calls.append(fc.name)
        if ev.actions and getattr(ev.actions, "compaction", None):
            compactions += 1
    return {"exists": True, "calls": calls, "interrupts": interrupts, "compactions": compactions,
            "events": len(s.events or []), "state": {k: v for k, v in (s.state or {}).items() if not k.startswith("temp:")}}


async def list_sessions() -> list[dict]:
    svc = sessions()
    try:
        listed = await svc.list_sessions(app_name=APP, user_id=USER)
    except Exception:                                              # noqa: BLE001
        return []
    return [{"id": s.id, "update_time": getattr(s, "last_update_time", None)} for s in listed.sessions]
