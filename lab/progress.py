"""Which chapter is lit — read from your files and from what actually ran.

    I    a run the clock started (a wake-* session) made at least one tool call     runs/state.json ← lab.db
    II   a run with recall in its tool calls bought the Saturday show (ms-ams-01)     runs/state.json ← lab.db + venue.db
    III  one queue ticket: join_queue handed it out under one boot id, check_queue read it back
         under another, in the same session — and the venue holds exactly one ticket   runs/state.json ← lab.db + venue.db
    IV   in one turn: fence.py answered purchase with reason stale_plan (the venue was never asked:
         no 409 in that turn), and the order that followed is in another section        runs/state.json ← lab.db + venue.db
    V    in one session of the graph: a run parked on an adk_request_input, ≥ 2 clock wake-ups that
         answered an interrupt (the clock's door routed to the stage's parked session), the venue
         holding exactly one ticket at every park, and one order                       runs/state.json ← lab.db + venue.db
    VI   in one session of the graph with agree_budget first: budget:ask and budget:confirm asked and
         answered, `budget` in session state equal to a sentence typed on the stage, an order, and a
         clock wake-up in that session that did not emit a budget interrupt            runs/state.json ← lab.db + venue.db
    VII  I–VI

Beside the lamps, one receipt that lights ticks without tearing a stub — chapter II's
longer conversation (the `replay` job): eight turns in one session, a compaction event
in lab.db, `budget_plan` overwritten (output_key keeps the latest), 8× C for the Saturday show.

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


def _by_session(wakes: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for w in wakes:
        if w.get("session_id"):
            out.setdefault(w["session_id"], []).append(w)
    return out


def _graph_run(w: dict) -> bool:
    return w.get("kind") == "Workflow" and bool((w.get("code") or {}).get("graph"))


def graph_receipt(wakes: list[dict]) -> dict:
    """Chapter V. One session of the graph in which: a run parked on an adk_request_input
    (check_front), at least two clock wake-ups answered an interrupt in that session, the
    venue held exactly one ticket at every park, and an order followed. Also the before-
    state: the newest "go" said to buyer_agent as a conversation (no graph)."""
    out: dict[str, Any] = {"before": None, "after": None}
    for w in wakes:
        if w.get("source") == "stage" and w.get("kind") == "LlmAgent" and (w.get("message") or "").strip().lower() == "go":
            out["before"] = {"session_id": w.get("session_id"), "reply": (w.get("reply") or "")[:200], "tools": w.get("turn_tools") or w.get("tools") or [],
                             "ts": w.get("ts"), "awaiting": w.get("awaiting")}
    for sid, ws in _by_session(wakes).items():
        runs = [w for w in ws if _graph_run(w)]
        if not runs:
            continue
        parks = [w for w in runs if w.get("awaiting") and (w.get("turn_interrupts") or [])]
        wakeups = [w for w in runs if w.get("source") == "clock" and w.get("answered")]
        answers = [w for w in runs if w.get("answered")]
        orders = [o for w in runs for o in (w.get("orders_new") or [])]
        nodes: list[str] = []
        for w in runs:
            for n in w.get("turn_nodes") or []:
                if n not in nodes:
                    nodes.append(n)
        positions = [w.get("position") for w in parks if w.get("position") is not None]
        tickets_at_parks = [w.get("tickets") for w in parks]
        one_ticket = bool(parks) and all(t == 1 for t in tickets_at_parks)
        row = {"session_id": sid, "parks": len(parks), "positions": positions, "wakeups": len(wakeups), "answers": len(answers),
               "entries": 1 + len(answers), "tickets": tickets_at_parks, "one_ticket": one_ticket, "order": orders[-1] if orders else None,
               "nodes": nodes, "interrupt_ids": [i for w in parks for i in (w.get("turn_interrupts") or [])][-4:],
               "ts": runs[-1].get("ts"), "reply": (runs[-1].get("reply") or "")[:240], "elapsed": [w.get("elapsed") for w in runs],
               "lit": bool(parks) and len(wakeups) >= 2 and one_ticket and bool(orders)}
        if out["after"] is None or row["lit"] and not out["after"]["lit"] or (row["lit"] == out["after"]["lit"] and row["ts"] > out["after"]["ts"]):
            out["after"] = row
    return out


def budget_receipt(wakes: list[dict]) -> dict:
    """Chapter VI. One session of the graph with agree_budget first: budget:ask asked (attended),
    answered and budget:confirm asked, answered and `budget` stored equal to a sentence typed on
    the stage; an order; and a clock wake-up in that session that emitted no budget interrupt.
    Also the before-state (the newest graph run without agree_budget: the [open] line spending
    DEFAULT_BUDGET with nobody asked) and the probe (the newest unattended run that reached
    agree_budget with nothing agreed: "[agree_budget] unattended. Using: …")."""
    out: dict[str, Any] = {"before": None, "after": None, "probe": None}
    for w in wakes:
        if w.get("kind") != "Workflow":
            continue
        opens = [n["text"] for n in (w.get("nodes") or []) if n.get("node") == "open"]
        agree = [n["text"] for n in (w.get("nodes") or []) if n.get("node") == "agree_budget"]
        if not (w.get("code") or {}).get("budget") and opens and not any(str(i).startswith("budget:") for i in w.get("turn_interrupts") or []):
            out["before"] = {"session_id": w.get("session_id"), "open": opens[0][:200], "ts": w.get("ts"), "source": w.get("source"),
                             "order": (w.get("orders_new") or [None])[0]}
        if (w.get("code") or {}).get("budget") and not w.get("attended") and any("unattended" in t for t in agree):
            out["probe"] = {"session_id": w.get("session_id"), "text": [t for t in agree if "unattended" in t][0][:200], "ts": w.get("ts"),
                            "asked": any(str(i).startswith("budget:") for i in w.get("turn_interrupts") or [])}
    for sid, ws in _by_session(wakes).items():
        runs = [w for w in ws if _graph_run(w) and (w.get("code") or {}).get("budget")]
        if not runs:
            continue
        typed = {(w.get("message") or "").strip() for w in ws if w.get("source") == "stage"}
        ask = next((w for w in runs if "budget:ask" in (w.get("turn_interrupts") or [])), None)
        confirm = next((w for w in runs if w.get("answered") == "budget:ask" and "budget:confirm" in (w.get("turn_interrupts") or [])), None)
        agreed = next((w for w in runs if w.get("answered") == "budget:confirm"), None)
        sentence = ""
        for w in reversed(runs):
            b = ((w.get("db") or {}).get("state") or {}).get("budget")
            if b:
                sentence = str(b)
                break
        unattended = [w for w in runs if w.get("source") == "clock" and w.get("answered")
                      and not any(str(i).startswith("budget:") for i in w.get("turn_interrupts") or [])]
        orders = [o for w in runs for o in (w.get("orders_new") or [])]
        questions = [i for w in runs for i in (w.get("turn_interrupts") or []) if str(i).startswith("budget:")]
        row = {"session_id": sid, "sentence": sentence, "typed": bool(sentence) and sentence.strip() in typed,
               "asked": bool(ask), "confirmed": bool(confirm), "agreed": bool(agreed), "questions": len(questions),
               "ask_text": (ask or {}).get("reply", "")[:240] if ask else "", "confirm_text": (confirm or {}).get("reply", "")[:240] if confirm else "",
               "unattended": len(unattended), "order": orders[-1] if orders else None,
               "request": str(((agreed or runs[-1]).get("db") or {}).get("state", {}).get("request") or "")[:200],
               "ts": runs[-1].get("ts"), "reply": (runs[-1].get("reply") or "")[:240],
               "lit": bool(sentence) and sentence.strip() in typed and bool(ask) and bool(confirm) and bool(orders) and bool(unattended)}
        if out["after"] is None or row["lit"] and not out["after"]["lit"] or (row["lit"] == out["after"]["lit"] and row["ts"] > out["after"]["ts"]):
            out["after"] = row
    return out


def replay_receipt(wakes: list[dict]) -> dict:
    """Chapter II's longer conversation. One session the `replay` job drove (`who` == replay):
    how many of its eight turns replied, the first turn after which lab.db held a compaction
    event, the distinct `budget_plan` values in order (two means output_key overwrote the
    first), budget_split calls, and the order — the source lab's 8× C $760. `lit` is the
    tick row, not a stub: a compaction in the session, a plan overwritten, an 8-seat order."""
    out: dict[str, Any] = {"after": None}
    for sid, ws in _by_session(wakes).items():
        turns = [w for w in ws if w.get("who") == "replay" and w.get("source") == "stage"]
        if not turns:
            continue
        plans: list[str] = []
        compaction_at = order_turn = None
        for i, w in enumerate(turns, 1):
            st = (w.get("db") or {}).get("state") or {}
            bp = st.get("budget_plan")
            if bp and (not plans or plans[-1] != str(bp)):
                plans.append(str(bp))
            if compaction_at is None and ((w.get("db") or {}).get("compactions") or 0) >= 1:
                compaction_at = i
            if order_turn is None and any(o.get("seats") == 8 for o in (w.get("orders_new") or [])):
                order_turn = i
        compactions = max(((w.get("db") or {}).get("compactions") or 0) for w in turns)
        orders = [o for w in turns for o in (w.get("orders_new") or [])]
        eight = next((o for o in orders if o.get("seats") == 8), None)
        # the source's order is 8× C for the SATURDAY show (ms-ams-01, $760); an 8-seat order for the
        # Tuesday (1 of 4 runs: the reply said Saturday, the purchase went to ms-ams-02) is the paraphrase
        # risk made visible, and it does not earn the tick
        saturday = bool(eight) and eight.get("event_id") == SATURDAY
        asked_back = [w.get("reply", "")[:160] for w in turns if (w.get("message") or "").strip().lower() == "book us something."]
        row = {"session_id": sid, "turns": len(turns), "of": 8, "sentences": [(w.get("message") or "")[:80] for w in turns],
               "compactions": compactions, "compaction_at": compaction_at,
               "plans": [p_[:200] for p_ in plans], "overwritten": len(plans) >= 2,
               "split_calls": sum((w.get("turn_tools") or []).count("budget_split") for w in turns),
               "noted": any("note_companion" in (w.get("turn_tools") or []) for w in turns),
               "asked_back": asked_back[0] if asked_back else "",
               "order": eight or (orders[-1] if orders else None), "eight": bool(eight), "saturday": saturday, "order_turn": order_turn,
               "elapsed": round(sum(w.get("elapsed") or 0 for w in turns), 1), "ts": turns[-1].get("ts"),
               "reply": (turns[-1].get("reply") or "")[:240], "done": len(turns) >= 8, "code": turns[-1].get("code") or {},
               "lit": compactions >= 1 and len(plans) >= 2 and saturday}
        if out["after"] is None or row["lit"] and not out["after"]["lit"] or (row["lit"] == out["after"]["lit"] and row["ts"] > out["after"]["ts"]):
            out["after"] = row
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
        graph = graph_receipt(wakes)
        budget = budget_receipt(wakes)
        replay = replay_receipt(wakes)
        lit = {
            1: any((w.get("calls") or 0) >= 1 for w in clock_wakes),
            2: bool(saturday),
            3: bool(kill and kill.get("lit")),
            4: bool(fence.get("after") and fence["after"].get("lit")),
            5: bool(graph.get("after") and graph["after"].get("lit")),
            6: bool(budget.get("after") and budget["after"].get("lit")),
        }
        lit[7] = all(lit[k] for k in range(1, 7))
        v = venue()
        boots = state.boots()
        last_clock = clock_wakes[-1] if clock_wakes else None
        out = {
            "code": code | {"memory_facts": memory_facts()},
            "lit": {str(k): v_ for k, v_ in lit.items()},
            "boot_id": state.BOOT_ID, "boots": len(boots) or 1,
            # the last 24, not 10: the replay alone is eight stage rows, and chapters I–II read the clock's run from here
            "wakes": wakes[-24:], "wakes_total": len(wakes), "last_wake": last_clock,
            "stage": state.STATE.get("stage") or {},
            "thread": [w for w in wakes if w.get("source") in ("stage", "clock")][-12:],
            "clock_runs": len(clock_wakes), "clock_calls": last_clock["calls"] if last_clock else None,
            "before": next((w for w in clock_wakes if "recall" not in (w.get("tools") or [])), None),
            "after": saturday[-1] if saturday else None,
            "kill": kill, "fence": fence, "graph": graph, "budget": budget, "replay": replay,
            "venue": v, "mode": env.MODE, "wake_message": env.WAKE_MESSAGE, "error": None,
        }
        _last_good = out
        return out
    except Exception as exc:                                       # noqa: BLE001
        log.warning("progress could not read the files: %s", exc)
        base = dict(_last_good or {"code": {}, "lit": {}, "boot_id": state.BOOT_ID})
        base["error"] = f"{type(exc).__name__}: {exc}"[:300]
        return base
