"""Which chapter is lit — read from your files and from what actually ran.

    I    a run the clock started (a wake-* session) made at least one tool call     runs/state.json ← lab.db
    II   a run with recall in its tool calls bought the Saturday show (ms-ams-01)     runs/state.json ← lab.db + venue.db
    III  the same queue ticket read under two boot ids, one ticket at the venue       (phase 2)
    IV   a stale_plan refusal from fence.py, no 409 from the venue, an order elsewhere (phase 2)
    V    an adk_request_input, ≥ 2 wake-ups, one ticket, one order                    (phase 3)
    VI   budget in session state == a sentence you typed, one order, an unattended wake that did not ask (phase 3)
    VII  I–VI

A lamp pairs a receipt with the file facts that held when it ran — the receipt
records them (`wakes[].code`), so a lamp earned stays earned when the "# " goes
back. Never a checklist. Never raises — a broken file keeps the last good answer
and reports the error beside it.
"""
from __future__ import annotations

import ast
import logging
import re
import time
from pathlib import Path
from typing import Any

from lab import codefile, env, state, venue_mount

log = logging.getLogger("lab.progress")
ROOT = Path(__file__).resolve().parents[1]
AGENT_FILE = ROOT / "agent" / "concert" / "agent.py"
NIGHTLY_FILE = ROOT / "agent" / "concert" / "nightly.py"
MEMORY_FILE = ROOT / "memory" / "userx.md"
SATURDAY = "ms-ams-01"
_last_good: dict[str, Any] | None = None
_cache: tuple[float, dict] | None = None


def _buyer_call(tree: ast.Module) -> ast.Call | None:
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call) \
                and any(isinstance(t, ast.Name) and t.id == "buyer_agent" for t in node.targets):
            return node.value
    return None


def code_facts() -> dict:
    """The five toggles, read from the syntax tree (comments cannot count)."""
    facts = {"recall": False, "queue": False, "fence": False, "graph": False, "budget": False}
    try:
        tree = ast.parse(AGENT_FILE.read_text())
        call = _buyer_call(tree)
        if call is not None:
            for kw in call.keywords:
                if kw.arg == "tools":
                    src = ast.unparse(kw.value)
                    facts["recall"] = bool(re.search(r"\brecall\b", src)) and bool(re.search(r"\bremember\b", src))
                    facts["queue"] = "join_queue" in src and "check_queue" in src
                if kw.arg == "before_tool_callback":
                    facts["fence"] = "refresh_before_purchase" in ast.unparse(kw.value)
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "root_agent" for t in node.targets):
                facts["graph"] = isinstance(node.value, ast.Name) and node.value.id == "nightly"
    except (OSError, SyntaxError):
        pass
    try:
        tree = ast.parse(NIGHTLY_FILE.read_text())
        for node in tree.body:
            if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) \
                    and isinstance(node.value.func, ast.Attribute) and node.value.func.attr == "insert" \
                    and isinstance(node.value.func.value, ast.Name) and node.value.func.value.id == "NIGHT":
                facts["budget"] = "agree_budget" in ast.unparse(node.value)
    except (OSError, SyntaxError):
        pass
    return facts


def memory_facts() -> int:
    """How many facts the memory file holds under Preferences — what recall() hands back."""
    try:
        text = MEMORY_FILE.read_text()
    except OSError:
        return 0
    block = text.split("## Preferences", 1)[1].split("##", 1)[0] if "## Preferences" in text else ""
    return sum(1 for l in block.splitlines() if l.strip().startswith("- "))


def venue() -> dict:
    try:
        s = venue_mount.state()
    except Exception as exc:                                       # noqa: BLE001
        return {"ok": False, "error": str(exc)[:120], "order_count": 0, "orders": [], "tickets": 0, "clock": 1.0, "activity": []}
    orders = sorted(s.get("orders", []), key=lambda o: o.get("created_at", 0))
    by_event = {e["event_id"]: e for e in s.get("inventory", []) if e.get("section") == "A"}
    for o in orders:
        e = by_event.get(o.get("event_id"), {})
        o["weekday"], o["city"] = e.get("weekday"), e.get("city")
    return {"ok": True, "order_count": s.get("order_count", 0), "orders": orders[-6:], "tickets": len(s.get("queue", [])),
            "queue": s.get("queue", [])[:3], "clock": s.get("clock_multiplier", 1.0), "hang_armed": s.get("hang_armed", False),
            "section_a": [{"event_id": e["event_id"], "available": e["available"], "weekday": e["weekday"]} for e in s.get("inventory", []) if e.get("section") == "A" and e.get("city") == "Amsterdam"],
            "activity": [{"ts": a["ts"], "kind": a["kind"], "message": a["message"]} for a in s.get("agent_events", [])[:12]]}


def read() -> dict[str, Any]:
    global _last_good, _cache
    try:
        code = code_facts()
        wakes = state.STATE.get("wakes", [])
        clock_wakes = [w for w in wakes if w.get("source") == "clock"]
        recalled = [w for w in wakes if "recall" in (w.get("tools") or [])]
        saturday = [w for w in recalled if any(o.get("event_id") == SATURDAY for o in w.get("orders_new") or [])]
        lit = {
            1: any((w.get("calls") or 0) >= 1 for w in clock_wakes),
            2: bool(saturday),
            3: False, 4: False, 5: False, 6: False,            # phases 2 and 3
        }
        lit[7] = all(lit[k] for k in range(1, 7))
        v = venue()
        boots = state.boots()
        last_clock = clock_wakes[-1] if clock_wakes else None
        out = {
            "code": code | {"memory_facts": memory_facts()},
            "lit": {str(k): v_ for k, v_ in lit.items()},
            "boot_id": state.BOOT_ID, "boots": len(boots) or 1,
            "wakes": wakes[-10:], "wakes_total": len(wakes), "last_wake": last_clock,
            "stage": state.STATE.get("stage") or {},
            "thread": [w for w in wakes if w.get("source") in ("stage", "clock")][-8:],
            "clock_runs": len(clock_wakes), "clock_calls": last_clock["calls"] if last_clock else None,
            "before": next((w for w in clock_wakes if "recall" not in (w.get("tools") or [])), None),
            "after": saturday[-1] if saturday else None,
            "venue": v, "mode": env.MODE, "wake_message": env.WAKE_MESSAGE, "error": None,
        }
        _last_good = out
        return out
    except Exception as exc:                                       # noqa: BLE001
        log.warning("progress could not read the files: %s", exc)
        base = dict(_last_good or {"code": {}, "lit": {}, "boot_id": state.BOOT_ID})
        base["error"] = f"{type(exc).__name__}: {exc}"[:300]
        return base
