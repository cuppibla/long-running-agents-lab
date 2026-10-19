"""The trigger: one Runner behind two doors.

    /api/say   a person typed on the stage      → handlers.wake(…) with budget.mark_attended()
    /api/wake  the clock (or the venue) posted   → the same handler, marked unattended

From chapter V on, the clock's door has one more thing to decide: if the stage's
conversation is parked on an `adk_request_input` (the graph waiting at
check_front), the clock's sentence is the ANSWER to that interrupt and goes into
the stage's session — not into a fresh wake-… session. `handlers.pending_interrupt`
is the test; `state.STATE["stage"]` says which session is the stage's.

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
import contextlib
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
#: the graph's nodes narrate themselves with print(): "  [open]        3am. Nobody is awake. Budget: …"
_NODE = re.compile(r"^\s{2}\[([a-z_]+)\]\s+(.*)$")
_POSITION = re.compile(r"#([\d,]+)")


class _Tee:
    """stdout during one run: every line still goes to the real stdout, and the
    graph's `[node] …` lines are also handed to `on_node`. The run holds `_busy`,
    so nothing else of ours prints meanwhile."""

    def __init__(self, real, on_node):
        self.real, self.on_node, self._buf = real, on_node, ""

    def write(self, data: str) -> int:
        self.real.write(data)
        self._buf += data
        while "\n" in self._buf:
            line, self._buf = self._buf.split("\n", 1)
            m = _NODE.match(line)
            if m:
                self.on_node(m.group(1), m.group(2).strip())
        return len(data)

    def flush(self) -> None:
        self.real.flush()

    def __getattr__(self, name):
        return getattr(self.real, name)


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

        # The clock's door with no session named: is the stage's conversation parked on a
        # question? Then this sentence answers it (chapter V: the clock answers check_front;
        # chapter VI: the same, with the budget already agreed in that session).
        answered: str | None = None
        if not session_id and not attended and kind == "Workflow":
            stage_sid = (state.STATE.get("stage") or {}).get("session_id")
            if stage_sid and await handlers.pending_interrupt(sessions(), APP, USER, stage_sid):
                session_id = stage_sid
        if session_id:
            answered = await handlers.pending_interrupt(sessions(), APP, USER, session_id)
        before_db = await session_calls(session_id) if session_id else {"events": 0}
        n0 = before_db.get("events") or 0

        t0 = time.time()
        before = _orders()
        ep = events.start_episode(source, who=who, attended=attended, agent=kind)
        events.emit("run_asked", who=who if attended else "the clock", text=message, source=source, attended=attended,
                    session_id=session_id, answers=answered)
        if answered:
            events.emit("interrupt_answered", id=answered, session_id=session_id, source=source,
                        by="the clock" if not attended else who)
        called: list[str] = []
        nodes: list[dict] = []

        def _node(name: str, text: str) -> None:
            nodes.append({"node": name, "text": text[:240]})
            events.emit("node_line", node=name, text=text[:240], source=source)

        def _log(line: str) -> None:
            m = _CALLED.search(line)
            if m:
                name = m.group(1)
                called.append(name)
                if name != "set_model_response":            # the picker's output_schema pseudo-tool is not a call worth a line
                    events.emit("tool_called", name=name, source=source)
                return
            m = _SAID.search(line)
            if m:
                events.emit("run_said", text=m.group(1)[:300], source=source)
                return
            if line.strip():
                events.emit("runner_line", text=line.strip()[:200], source=source)

        try:
            with contextlib.redirect_stdout(_Tee(sys.stdout, _node)):
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
        db = await session_calls(sid, since=n0)             # lab.db is the receipt; the log is a hint
        turn = db.get("turn") or {}
        calls = [c for c in (db.get("calls") or []) if c not in NOT_TOOLS] or [c for c in called if c not in NOT_TOOLS]
        turn_tools = [c for c in called if c not in NOT_TOOLS]                   # this run only; `tools` is the whole session
        orders_new = [o for o in _orders() if o["id"] not in {b["id"] for b in before}]
        reply = out["said"][-1] if out["said"] else ""
        this_turn = (db.get("invocations") or 1) - 1
        for r in db.get("responses") or []:
            if r.get("tool") != "purchase" or (r.get("turn") != this_turn and r.get("invocation") not in (turn.get("invocations") or [])):
                continue
            if r.get("by") == "fence":
                events.emit("fence_refused", reason=r.get("reason"), actual=r.get("actually_available"), believed=r.get("believed_available"), source=source)
            elif r.get("status") == 409:
                events.emit("venue_409", error=r.get("error"), section=r.get("section"), source=source)
        if out["awaiting_input"] and turn.get("interrupts"):
            events.emit("run_parked", id=turn["interrupts"][-1], text=reply[:200], session_id=sid, source=source)
        events.emit("run_replied", who="the agent", text=reply[:400], tools=calls, awaiting=out["awaiting_input"],
                    session_id=sid, source=source, orders=[_short_order(o) for o in orders_new], answered=answered,
                    nodes=turn.get("nodes") or [])
        events.emit("episode_done")
        from lab import progress  # noqa: PLC0415 — progress imports this module
        m = _POSITION.search(" ".join(n["text"] for n in nodes if n["node"] == "check_front") or reply)
        row = state.push("wakes", {
            "source": source, "attended": attended, "who": who, "session_id": sid, "message": message,
            "said": [s[:400] for s in out["said"]], "reply": reply[:400], "awaiting": out["awaiting_input"],
            "tools": calls, "calls": len(calls), "turn_tools": turn_tools, "tools_in_file": tools_in_file, "kind": kind,
            "orders_new": [_short_order(o) for o in orders_new], "boot_id": state.BOOT_ID,
            "elapsed": round(time.time() - t0, 1), "code": progress.code_facts(),
            "db": {k: db.get(k) for k in ("events", "interrupts", "compactions", "invocations", "state", "responses", "interrupt_ids", "temp_keys")},
            "tickets": _tickets(),
            # chapters V and VI: what THIS run answered, asked and walked
            "answered": answered, "turn_interrupts": turn.get("interrupts") or [], "turn_nodes": turn.get("nodes") or [],
            "nodes": nodes, "position": int(m.group(1).replace(",", "")) if m else None,
            "artifacts": _artifact_files(sid), "memory_facts": progress.memory_facts(),
        })
        if attended:
            state.set_("stage", {"session_id": sid, "ts": row["ts"]})
        return {"ok": True, "episode": ep, **out, **{k: row[k] for k in ("tools", "calls", "turn_tools", "orders_new", "boot_id", "reply", "tools_in_file", "kind", "elapsed", "awaiting", "db", "tickets", "answered", "turn_interrupts", "turn_nodes", "nodes", "position", "artifacts", "memory_facts")}}


def _artifact_files(session_id: str) -> list[str]:
    """Seat maps get_seatmap saved for this session — files on disk, never in the prompt."""
    base = ROOT / "artifacts"
    if not base.exists():
        return []
    return sorted({p.name for p in base.rglob("*") if session_id in str(p) and "seatmap" in p.name and p.is_file()}
                  | {p.parent.name for p in base.rglob("*") if session_id in str(p) and "seatmap" in p.parent.name and p.is_file()})[:6]


def _tickets() -> int:
    """How many queue tickets the venue holds right now — chapter III wants exactly one."""
    try:
        return len(venue_mount.state().get("queue", []))
    except Exception:                                              # noqa: BLE001
        return -1


def _orders() -> list[dict]:
    try:
        return venue_mount.module().rows("SELECT o.*, e.weekday, e.city FROM orders o LEFT JOIN events e ON e.id = o.event_id ORDER BY created_at")
    except Exception:                                              # noqa: BLE001
        return []


def _short_order(o: dict) -> dict:
    return {k: o.get(k) for k in ("id", "event_id", "section", "seats", "unit_price", "total", "weekday", "city", "created_at")}


def _node_of(ev) -> str | None:
    """The graph node an event came from — the last segment of node_info.path
    ("concert_nightly@1/check_front@2" → "check_front"). None for a plain agent."""
    info = getattr(ev, "node_info", None)
    path = getattr(info, "path", "") or ""
    if "/" not in path:
        return None
    return path.rsplit("/", 1)[1].split("@", 1)[0] or None


async def session_calls(session_id: str, since: int = 0) -> dict:
    """What lab.db holds for one session: function calls by name, interrupts (asked and
    answered, by id), compactions, the graph nodes that ran — and the same for the slice
    of events from index `since` on (`turn`: this run). Read through the session
    service, not raw SQL."""
    svc = sessions()
    s = await svc.get_session(app_name=APP, user_id=USER, session_id=session_id)
    if s is None:
        return {"exists": False, "events": 0}
    calls, interrupts, compactions, responses = [], 0, 0, []
    invocations: list[str] = []
    asked: list[dict] = []                 # every adk_request_input, in order: {id, answered}
    turn = {"tools": [], "interrupts": [], "answered": [], "nodes": [], "invocations": []}
    for i, ev in enumerate(s.events or []):
        if ev.invocation_id and ev.invocation_id not in invocations:
            invocations.append(ev.invocation_id)
        in_turn = i >= since
        if in_turn and ev.invocation_id and ev.invocation_id[:12] not in turn["invocations"]:
            turn["invocations"].append(ev.invocation_id[:12])
        node = _node_of(ev)
        if in_turn and node and node not in turn["nodes"]:
            turn["nodes"].append(node)
        for part in (ev.content.parts if ev.content else []) or []:
            fc = getattr(part, "function_call", None)
            if fc:
                if fc.name == "adk_request_input":
                    interrupts += 1
                    asked.append({"id": fc.id, "answered": False, "node": node})
                    if in_turn:
                        turn["interrupts"].append(fc.id)
                elif fc.name not in NOT_TOOLS:
                    calls.append(fc.name)
                    if in_turn:
                        turn["tools"].append(fc.name)
            fr = getattr(part, "function_response", None)
            if fr and fr.name == "adk_request_input":
                for a in asked:
                    if a["id"] == fr.id:
                        a["answered"] = True
                if in_turn:
                    turn["answered"].append(fr.id)
            if fr and fr.name in RECEIPT_TOOLS:
                responses.append(_receipt(fr.name, fr.response, ev.invocation_id, invocations.index(ev.invocation_id) if ev.invocation_id in invocations else None))
        if ev.actions and getattr(ev.actions, "compaction", None):
            compactions += 1
    # `state` is what lab.db holds for the session after this run, every key as saved —
    # `temp_keys` lists the temp: ones among them, which is always none: the session service
    # strips temp: from the event before the write (chapter II's third chip reads that fact)
    return {"exists": True, "calls": calls, "interrupts": interrupts, "compactions": compactions,
            "events": len(s.events or []), "invocations": len(invocations), "responses": responses,
            "interrupt_ids": asked[-12:], "turn": turn,
            "state": dict(s.state or {}), "temp_keys": [k for k in (s.state or {}) if k.startswith("temp:")]}


#: the tool responses a receipt keeps — what the venue (or fence.py) handed the model
RECEIPT_TOOLS = ("join_queue", "check_queue", "purchase")
#: function calls that are ADK's own, not the agent's tools: the interrupt, and the
#: output_schema pseudo-tool the picker node answers through
NOT_TOOLS = ("adk_request_input", "set_model_response")


def _receipt(name: str, response, invocation_id: str | None, turn: int | None) -> dict:
    """One tool response, reduced to the fields the chapters read. purchase: who
    answered — the venue (an order, or a 409) or fence.py (reason stale_plan /
    price_moved, which never reached the venue)."""
    r = response if isinstance(response, dict) else {}
    if "result" in r and isinstance(r["result"], dict) and len(r) == 1:
        r = r["result"]
    out: dict[str, Any] = {"tool": name, "invocation": (invocation_id or "")[:12], "turn": turn}
    if name in ("join_queue", "check_queue"):
        out |= {k: r.get(k) for k in ("ticket", "position", "ready", "status", "error", "message") if k in r}
    else:
        out |= {k: r.get(k) for k in ("error", "status", "reason", "believed_available", "actually_available", "message", "id", "event_id", "section", "seats", "total", "duplicate") if k in r}
        out["by"] = "fence" if r.get("reason") in ("stale_plan", "price_moved") else ("venue" if r else "?")
    return out


async def list_sessions() -> list[dict]:
    svc = sessions()
    try:
        listed = await svc.list_sessions(app_name=APP, user_id=USER)
    except Exception:                                              # noqa: BLE001
        return []
    return [{"id": s.id, "update_time": getattr(s, "last_update_time", None)} for s in listed.sessions]
