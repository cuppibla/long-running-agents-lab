"""Which chapter is lit — read from your files and from what actually ran.

    I    a reply happened in the workbench                    (lab.db)
    II   an exam that ran WITH the edit scored higher than one that ran without it
    III  both

Never a checklist. Never raises — a broken file keeps the last good answer
and reports the error beside it.

CHANGE ME (the chapters): `edit_in_file` names the code fact chapter II
reads off the disk; `lit` pairs facts with receipts, one line per chapter.
"""
from __future__ import annotations

import ast
import logging
import re
from pathlib import Path
from typing import Any

from lab import env, state

log = logging.getLogger("lab.progress")
ROOT = Path(__file__).resolve().parents[1]
AGENT_FILE = ROOT / "agent" / "agent.py"
_last_good: dict[str, Any] | None = None


def edit_in_file() -> bool:
    """Is the chapter-II line live in agent/agent.py right now? Read from the
    syntax tree — the `tools=` keyword on the `root_agent = LlmAgent(...)` call —
    so neither the commented line nor the docstring that quotes it counts."""
    try:
        tree = ast.parse(AGENT_FILE.read_text())
    except (OSError, SyntaxError):
        return False
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) \
                and any(isinstance(t, ast.Name) and t.id == "root_agent" for t in node.targets):
            for kw in node.value.keywords:
                if kw.arg == "tools":
                    return "door_code" in ast.unparse(kw.value)
    return False


def _agent_facts() -> dict:
    src = AGENT_FILE.read_text()
    model = re.search(r'^MODEL\s*=\s*"([^"]+)"', src, re.M)
    instr = ROOT / "agent" / "instruction.txt"
    return {"edit": edit_in_file(), "model": model.group(1) if model else "?",
            "instruction_chars": len(instr.read_text()) if instr.exists() else 0}


def read(workbench_calls: int = 0) -> dict[str, Any]:
    global _last_good
    try:
        code = _agent_facts()
        exams = state.STATE.get("exams", [])
        says = state.STATE.get("says", [])
        before = [r for r in exams if not r.get("edit")]
        after = [r for r in exams if r.get("edit")]
        improved = any((a.get("score") or 0) > (b.get("score") or 0)
                       for a in after for b in before if (a.get("ts") or 0) > (b.get("ts") or 0))
        lit = {1: workbench_calls > 0, 2: improved}
        lit[3] = lit[1] and lit[2]
        out = {"code": code, "lit": {str(k): v for k, v in lit.items()},
               "boot_id": state.BOOT_ID, "workbench_calls": workbench_calls,
               "last_exam": exams[-1] if exams else None, "exams": exams[-12:],
               "last_say": says[-1] if says else None, "says": len(says),
               "mode": env.MODE, "error": None}
        _last_good = out
        return out
    except Exception as exc:                                       # noqa: BLE001
        log.warning("progress could not read the files: %s", exc)
        base = dict(_last_good or {"code": {}, "lit": {}, "boot_id": state.BOOT_ID})
        base["error"] = f"{type(exc).__name__}: {exc}"[:300]
        return base
