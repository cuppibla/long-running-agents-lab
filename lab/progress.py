"""Which chapter is lit — read from your files and from what actually ran.

    I    a run the clock started (a wake-* session) made at least one tool call     runs/state.json ← lab.db
    II   a run with recall in its tool calls bought the Saturday show (ms-ams-01)     runs/state.json ← lab.db + venue.db
    III  one queue ticket: join_queue handed it out under one boot id, check_queue read it back
         under another, in the same session — and the venue holds exactly one ticket   runs/state.json ← lab.db + venue.db
    IV   in one turn: fence.py answered purchase with reason stale_plan (the venue was never asked:
         no 409 in that turn), and the order that followed is in another section        runs/state.json ← lab.db + venue.db
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


def kill_receipt(wakes: list[dict]) -> dict | None:
    """Chapter III. The same ticket, handed out by join_queue in one process and read
    back by check_queue in another, in one session; the venue holding one ticket when
    it was read back. Returns the newest such pair, or None."""
    found = None
    by_sid: dict[str, list[dict]] = {}
    for w in wakes:
        if w.get("session_id"):
            by_sid.setdefault(w["session_id"], []).append(w)
    for sid, ws in by_sid.items():
        for w2 in ws:
            if not (w2.get("code") or {}).get("queue"):
                continue
            checks = [r for r in ((w2.get("db") or {}).get("responses") or []) if r.get("tool") == "check_queue" and r.get("ticket")]
            for c in checks:
                for w1 in ws:
                    if w1 is w2 or w1.get("boot_id") == w2.get("boot_id") or w1.get("ts", 0) > w2.get("ts", 0):
                        continue
                    joins = [r for r in ((w1.get("db") or {}).get("responses") or []) if r.get("tool") == "join_queue" and r.get("ticket") == c["ticket"]]
                    if joins and (c.get("turn") is None or joins[0].get("turn") is None or c["turn"] > joins[0]["turn"]):
                        row = {"session_id": sid, "ticket": c["ticket"], "boots": [w1.get("boot_id"), w2.get("boot_id")],
                               "positions": [joins[0].get("position"), c.get("position")], "tickets": w2.get("tickets"),
                               "ts": w2.get("ts"), "lit": w2.get("tickets") == 1}
                        if found is None or row["ts"] > found["ts"]:
                            found = row
    return found


def fence_receipt(wakes: list[dict]) -> dict | None:
    """Chapter IV. One run in which fence.py refused purchase with reason stale_plan,
    the venue answered no 409 in that same turn, and an order in another section
    followed (in that run, or a later run of the same session). Also returns the
    before-state: the newest run in which the venue itself answered 409 sold_out."""
    out: dict[str, Any] = {"before": None, "after": None}
    for w in wakes:
        rs = (w.get("db") or {}).get("responses") or []
        orders = w.get("orders_new") or []
        for r in rs:
            if r.get("tool") != "purchase":
                continue
            if r.get("by") == "venue" and r.get("status") == 409:
                out["before"] = {"session_id": w.get("session_id"), "turn": r.get("turn"), "error": r.get("error"), "section": r.get("section"),
                                 "order": orders[0] if orders else None, "ts": w.get("ts"), "reply": (w.get("reply") or "")[:200]}
            if r.get("by") == "fence" and r.get("reason") == "stale_plan" and (w.get("code") or {}).get("fence"):
                same_turn = [x for x in rs if x.get("tool") == "purchase" and x.get("turn") == r.get("turn")]
                venue_409 = any(x.get("by") == "venue" and x.get("status") == 409 for x in same_turn)
                later = [o for o in orders if o.get("section") and o.get("section") != (r.get("section") or "A")]
                if not later:
                    for w2 in wakes:
                        if w2.get("session_id") == w.get("session_id") and w2.get("ts", 0) > w.get("ts", 0):
                            later += [o for o in (w2.get("orders_new") or []) if o.get("section") and o.get("section") != "A"]
                out["after"] = {"session_id": w.get("session_id"), "turn": r.get("turn"), "believed": r.get("believed_available"),
                                "actual": r.get("actually_available"), "venue_409": venue_409, "order": later[0] if later else None,
                                "ts": w.get("ts"), "reply": (w.get("reply") or "")[:200], "lit": (not venue_409) and bool(later)}
    return out


def read() -> dict[str, Any]:
    global _last_good, _cache
    try:
        code = code_facts()
        wakes = state.STATE.get("wakes", [])
        clock_wakes = [w for w in wakes if w.get("source") == "clock"]
        recalled = [w for w in wakes if "recall" in (w.get("tools") or [])]
        saturday = [w for w in recalled if any(o.get("event_id") == SATURDAY for o in w.get("orders_new") or [])]
        kill = kill_receipt(wakes)
        fence = fence_receipt(wakes)
        lit = {
            1: any((w.get("calls") or 0) >= 1 for w in clock_wakes),
            2: bool(saturday),
            3: bool(kill and kill.get("lit")),
            4: bool(fence.get("after") and fence["after"].get("lit")),
            5: False, 6: False,                                 # phase 3
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
            "kill": kill, "fence": fence,
            "venue": v, "mode": env.MODE, "wake_message": env.WAKE_MESSAGE, "error": None,
        }
        _last_good = out
        return out
    except Exception as exc:                                       # noqa: BLE001
        log.warning("progress could not read the files: %s", exc)
        base = dict(_last_good or {"code": {}, "lit": {}, "boot_id": state.BOOT_ID})
        base["error"] = f"{type(exc).__name__}: {exc}"[:300]
        return base
