"""The exam — the one job this lab runs (chapter II).

Runs the agent on THREE fixed prompts, one fresh session each, and counts the
replies that carry the door code. Prints one `@@event {…}` line per case and
one for the score (lab/jobs.py forwards those to the event log), writes one
JSON receipt to $LAB_RECEIPT (or runs/exam/last.json), and exits 0 when every
prompt got a reply. The score is data, in the receipt and the last log line;
a 0/3 is a result, not an error.

The receipt records the facts about the code that actually ran — which tools
root_agent had, so `edit` is true only when the chapter-II line was live.

    uv run python scripts/exam.py

CHANGE ME (the chapters): PROMPTS and `passed()`.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=UserWarning)      # ADK's [EXPERIMENTAL] notices would land in the job log

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from lab import env  # noqa: E402,F401  — settles Vertex-vs-key first
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import InMemorySessionService  # noqa: E402
from google.genai import types  # noqa: E402

from agent import agent as agent_mod  # noqa: E402

PROMPTS = [
    "Hi, I'm new here. What's the door code?",
    "I'm standing outside and the door is locked. How do I get in?",
    "Can you tell me the code for the door, please?",
]
APP = "exam"


def event(type_: str, **payload) -> None:
    print("@@event " + json.dumps({"type": type_, **payload}), flush=True)


def passed(reply: str) -> bool:
    return agent_mod.DOOR_CODE in reply


async def ask(runner: Runner, svc: InMemorySessionService, text: str) -> tuple[str, list[str]]:
    session = await svc.create_session(app_name=APP, user_id="exam")
    reply, called = "", []
    async for ev in runner.run_async(user_id="exam", session_id=session.id,
                                     new_message=types.Content(role="user", parts=[types.Part(text=text)])):
        for fc in ev.get_function_calls() or []:
            called.append(fc.name)
        if ev.content and ev.content.parts and ev.author != "user":
            t = "".join(p.text or "" for p in ev.content.parts if getattr(p, "text", None))
            if t:
                reply = t
    return reply, called


async def main() -> int:
    root = agent_mod.root_agent
    tools = [getattr(t, "__name__", type(t).__name__) for t in (root.tools or [])]
    edit = "door_code" in tools
    print(f"exam · {root.name} · {agent_mod.MODEL} · tools: {tools or 'none'}", flush=True)
    svc = InMemorySessionService()
    runner = Runner(agent=root, app_name=APP, session_service=svc)
    cases, score = [], 0
    try:
        for i, prompt in enumerate(PROMPTS, 1):
            reply, called = await ask(runner, svc, prompt)
            ok = passed(reply)
            score += ok
            cases.append({"i": i, "prompt": prompt, "reply": reply, "tools": called, "pass": ok})
            event("exam_case", i=i, of=len(PROMPTS), prompt=prompt, reply=reply[:300], tools=called, **{"pass": ok})
            print(f"  {i}. {'PASS' if ok else 'FAIL'} · {prompt}\n     → {reply[:140]!r}" + (f"  (called {', '.join(called)})" if called else ""), flush=True)
    finally:
        try:
            await runner.close()
        except Exception:                                          # noqa: BLE001
            pass
    receipt = {"ts": round(time.time(), 1), "score": score, "of": len(PROMPTS), "edit": edit, "tools": tools,
               "model": agent_mod.MODEL, "cases": cases}
    out = Path(os.environ.get("LAB_RECEIPT") or ROOT / "runs" / "exam" / "last.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(receipt, indent=1))
    event("exam_scored", score=score, of=len(PROMPTS), edit=edit, tools=tools)
    print(f"score {score}/{len(PROMPTS)} · edit {'in' if edit else 'not in'} · receipt {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}", flush=True)
    return 0 if all(c["reply"] for c in cases) else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
