"""Talk to the agent from the page — one real call, through ADK's Runner.

The agent is re-imported from disk on every call, so a saved edit lands on
the next reply without a restart. Sessions go to the same lab.db the
workbench uses, under a different user id: a reply made here shows up in
adk web as a session, and does not count as a workbench call.
"""
from __future__ import annotations

import asyncio
import importlib
import logging
import sys
from pathlib import Path

from google.adk.runners import Runner
from google.adk.sessions.sqlite_session_service import SqliteSessionService
from google.genai import types

from lab import env, events, state

log = logging.getLogger("lab.say")
ROOT = Path(__file__).resolve().parents[1]
DB = str(ROOT / "lab.db")
APP = "agent"
USER = "stage"                      # the page's replies; the workbench's are "user"

_sessions: SqliteSessionService | None = None
_busy = asyncio.Lock()


def sessions() -> SqliteSessionService:
    global _sessions
    if _sessions is None:
        _sessions = SqliteSessionService(DB)
    return _sessions


def fresh_agent():
    """`agent.agent` as it is on disk right now — a clean re-import."""
    for n in ("agent.agent", "agent"):
        sys.modules.pop(n, None)
    return importlib.import_module("agent.agent")


async def say(text: str, who: str = "you") -> dict:
    text = (text or "").strip()
    if not text:
        raise ValueError("say what?")
    async with _busy:
        env.settle()
        mod = fresh_agent()
        tools_in_file = [getattr(t, "__name__", type(t).__name__) for t in (mod.root_agent.tools or [])]
        runner = Runner(agent=mod.root_agent, app_name=APP, session_service=sessions())
        session = await sessions().create_session(app_name=APP, user_id=USER)
        ep = events.start_episode("say", who=who)
        events.emit("say_asked", who=who, text=text)
        reply, called = "", []
        try:
            async for ev in runner.run_async(
                    user_id=USER, session_id=session.id,
                    new_message=types.Content(role="user", parts=[types.Part(text=text)])):
                for fc in ev.get_function_calls() or []:
                    called.append(fc.name)
                if ev.content and ev.content.parts and ev.author != "user":
                    t = "".join(p.text or "" for p in ev.content.parts if getattr(p, "text", None))
                    if t:
                        reply = t
        except Exception as exc:                                   # noqa: BLE001
            log.warning("say failed: %s", exc)
            events.emit("error", message=f"{type(exc).__name__}: {exc}"[:300])
            events.emit("episode_done")
            return {"ok": False, "error": str(exc)[:300], "episode": ep}
        finally:
            try:
                await runner.close()
            except Exception:                                      # noqa: BLE001
                pass
        events.emit("say_replied", who="greeter", text=reply, tools=called, tools_in_file=tools_in_file)
        events.emit("episode_done")
        row = state.push("says", {"who": who, "text": text, "reply": reply, "tools": called,
                                  "tools_in_file": tools_in_file, "session": session.id})
        return {"ok": True, "episode": ep, **row}
