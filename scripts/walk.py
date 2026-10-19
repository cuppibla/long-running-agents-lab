"""The headless learner: walks the chapters against a running lab, the way a
person would from the page — the same /api routes, the same edit, the same
job — and reports which stubs tore.

    uv run python scripts/walk.py                      # I–VI, leaves the files as the walk left them
    uv run python scripts/walk.py --restore            # restore only: every "# " back, root_agent = buyer_agent, the venue reset, memory re-seeded
    uv run python scripts/walk.py --only 5             # one chapter   (add --restore to restore afterwards)
    uv run python scripts/walk.py --all --restore      # walk I–VI, then restore
    uv run python scripts/walk.py --replay             # chapter II's ▶ only: the longer conversation (recall must be in)
    uv run python scripts/walk.py --all --skip-replay  # I–VI without the eight-turn replay (~1 min less)
    uv run python scripts/walk.py --base http://127.0.0.1:3499

Chapter I: say the plan on the stage, wait, prove nothing ran, then start the
clock job (monstertix/clock.py --in 10 → POST /api/wake) and read the receipt.
Chapter II: a 3am wake as shipped (no recall) for the before-number, delete the
"# " on `recall, remember,`, wake again, read the order. Then the two optional
sentences in a fresh conversation ("Sam can't do weeknights, by the way." →
note_companion → user:prefs; "Show me the seat map…" → get_seatmap → an artifact,
and no temp: key in lab.db), then ▶ the longer conversation: the replay job says
the source lab's eight step-5 sentences into one fresh session — compaction fires
(a summary event after turn 3 and 6), budget_plan is overwritten by the 10-person
plan, and the 8× C $760 order lands. --skip-replay leaves the replay out.
Chapter III: delete the "# " on the queue tools, ask for the tickets on the stage
(it joins the queue), POST /api/kill, wait for the new boot, ask "Where am I in
line?" in the same session — the same ticket, read back by the next process.
Chapter IV: as shipped first — ask, ask about the seats, SELL THE GOOD SEATS,
SKIP THE WAIT, "Buy the two section A seats." → the venue's 409; then the fence
in, the same five sentences in a new conversation → fence.py's refusal before the
venue, then "Then section C, two seats." → the order.
Chapter V: as shipped first — "go" to buyer_agent is a chat turn (the before-number);
swap `root_agent = buyer_agent` → `nightly`, "go" → the graph parks at check_front, 🐓
(the clock's door answers the stage's parked run), SKIP THE WAIT, 🐓 → the order.
Chapter VI: delete the "# " on `NIGHT.insert(0, agree_budget)`, ask for the tickets →
budget:ask, answer → budget:confirm, "Yes" → the sentence in state and the graph parks,
SKIP, 🐓 → the order with nobody there and no question asked; then the probe: 🐓 with
nothing parked opens a fresh session and agree_budget finds nobody there (the ContextVar).
Exit code 0 when every walked chapter lit. Numbers are printed so the copy in
site/lib/chapters.ts can be checked against what the model did today.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("LAB_URL", "http://127.0.0.1:3490").rstrip("/")
AGENT = "agent/concert/agent.py"
NIGHTLY = "agent/concert/nightly.py"
RECALL = "recall, remember,"
QUEUE = "LongRunningFunctionTool(func=join_queue), check_queue,"
FENCE = "before_tool_callback=refresh_before_purchase,"
BUDGET = "NIGHT.insert(0, agree_budget)"
GRAPH_WAS, GRAPH_NOW = "root_agent = buyer_agent", "root_agent = nightly"
GO = "go"
ASK = "Get us two tickets to the Amsterdam show."
BUDGET_SENTENCE = "About a 100 for the cheap seats. 250 if they’re the good ones."
YES = "Yes, that’s right."
PLAN = "Grab us two tickets the moment the presale opens. Keep checking."
LINE = "The presale just opened. Get us tickets to the Amsterdam show."
WHICH = "The Saturday show, please."                     # if it asks which show (recall should have told it)
SAM = "Sam can't do weeknights, by the way."              # chapter II, optional: note_companion → user:prefs
SEATMAP = "Show me the seat map for the Amsterdam Saturday show."   # chapter II, optional: get_seatmap → an artifact + temp:
SKIP_REPLAY = False
WHERE = "Where am I in line?"
SEATS = "How much are the seats, and what's still available?"
BUY = "Buy the two section A seats."
THEN_C = "Then section C, two seats."
SATURDAY = "ms-ams-01"
WATCH = float(os.environ.get("WALK_WATCH", "20"))         # seconds of hands-down after the plan


def http(path: str, body: dict | None = None, method: str | None = None, timeout: float = 300) -> dict | list:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method or ("POST" if data else "GET"),
                                 headers={"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else {}


def api(path: str, body: dict | None = None, method: str | None = None) -> dict:
    return http("/api" + path, body, method)                        # type: ignore[return-value]


def say(msg: str) -> None:
    print(f"[walk] {msg}", flush=True)


def wait_job(kind: str, limit: float = 400) -> dict:
    t0 = time.time()
    while time.time() - t0 < limit:
        j = api(f"/job?kind={kind}")
        if j["state"] in ("done", "error"):
            return j
        time.sleep(1.5)
    raise TimeoutError(f"{kind} did not finish in {limit:.0f} s")


def run_job(kind: str, **opts) -> dict:
    api("/job", {"kind": kind, **opts})
    j = wait_job(kind)
    say(f"{kind}: {j['state']} in {j['elapsed']} s · {json.dumps(j.get('summary', {}))[:200]}")
    if j["state"] != "done":
        print("\n".join(j["log"][-12:]))
    return j


def edit(path: str, fn) -> None:
    f = api(f"/code?path={path}")
    new = fn(f["content"])
    if new == f["content"]:
        say(f"{path}: already as wanted")
        return
    out = api("/code", {"path": path, "content": new})
    if not out["validation"]["valid"]:
        raise RuntimeError(f"{path}: {out['validation']['message']}")
    say(f"{path}: saved ({out['validation']['message']})")


def progress() -> dict:
    return api("/progress")


def lit(n: int) -> bool:
    return bool(progress()["lit"].get(str(n)))


def uncomment(marker: str):
    return lambda src: re.sub(r"^(\s*)# " + re.escape(marker), r"\1" + marker, src, count=1, flags=re.M)


def recomment(marker: str):
    return lambda src: re.sub(r"^(\s*)(?<!# )" + re.escape(marker), r"\1# " + marker, src, count=1, flags=re.M)


def describe(w: dict | None) -> str:
    if not w:
        return "no run"
    if not w.get("ok", True) or "calls" not in w:
        return f"FAILED · {w.get('error') or w}"[:200]
    o = (w.get("orders_new") or [None])[0]
    order = f"{o['weekday']} {o['seats']}× {o['section']} ${o['total']:g} ({o['event_id']})" if o else ("a question into the dark" if w.get("awaiting") else "no order")
    return f"session {w['session_id']} · {w['calls']} calls {w['tools']} · {order} · {w.get('elapsed')}s · reply {w.get('reply', '')[:110]!r}"


def last_clock(p: dict) -> dict | None:
    cw = [w for w in p.get("wakes", []) if w.get("source") == "clock"]
    return cw[-1] if cw else None


def conversation_root() -> None:
    """Chapters I–IV talk to buyer_agent. If an earlier walk left the graph as the root (V) or
    agree_budget in (VI), put both back first — a graph would answer the 3am sentence with
    "what are you willing to spend?" and none of the four receipts could happen."""
    p = progress()
    if p["code"].get("budget"):
        say("agree_budget is in — putting the “# ” back first (chapters I–IV talk to the agent, not the graph)")
        edit(NIGHTLY, recomment(BUDGET))
    if p["code"].get("graph"):
        say("the graph is the root — swapping root_agent back to buyer_agent first (chapters I–IV talk to the agent)")
        edit(AGENT, lambda s_: s_.replace(GRAPH_NOW, GRAPH_WAS))


def chapter1() -> bool:
    """Say the plan; hands down; prove 0 runs happened; then the clock."""
    conversation_root()
    p0 = progress()
    runs0 = p0.get("wakes_total", len(p0.get("wakes", [])))
    orders0 = p0["venue"]["order_count"]
    s = api("/session/new", {})
    r = api("/say", {"text": PLAN, "session_id": s["session_id"], "who": "walk"})
    say(f"stage: {describe(r)}")
    say(f"hands down for {WATCH:.0f} s …")
    time.sleep(WATCH)
    p1 = progress()
    runs_after = p1.get("wakes_total", len(p1.get("wakes", []))) - runs0 - 1      # minus the plan you just said
    say(f"after {WATCH:.0f} s: runs started by nobody = {runs_after} · orders {orders0} → {p1['venue']['order_count']}  (0 and unchanged is the lesson)")
    run_job("wake")
    w = last_clock(progress())
    say(f"the clock's run: {describe(w)}")
    return lit(1)


def chapter2() -> bool:
    conversation_root()
    p = progress()
    if p["code"].get("recall"):
        say("recall is already in — putting the “# ” back first so the before-receipt is real")
        edit(AGENT, recomment(RECALL))
    run_job("wake")
    before = last_clock(progress())
    say(f"BEFORE (no recall): {describe(before)}")
    edit(AGENT, uncomment(RECALL))
    run_job("wake")
    after = last_clock(progress())
    say(f"AFTER (recall in):  {describe(after)}")
    ok = lit(2)
    if not ok:
        o = (after or {}).get("orders_new") or []
        say(f"not lit: recall called = {'recall' in (after or {}).get('tools', [])} · order event = {[x['event_id'] for x in o]} (need {SATURDAY})")
    say("── the two optional sentences, in a fresh conversation (where it lives) ──")
    sid = api("/session/new", {})["session_id"]
    r = stage(SAM, sid)
    st = (r.get("db") or {}).get("state") or {}
    say(f"  note_companion {'note_companion' in (r.get('turn_tools') or [])} · user:prefs {st.get('user:prefs')}")
    r = stage(SEATMAP, sid)
    db = r.get("db") or {}
    say(f"  get_seatmap {'get_seatmap' in (r.get('turn_tools') or [])} · artifacts {r.get('artifacts')} · temp: keys in lab.db {db.get('temp_keys')} · state keys {sorted((db.get('state') or {}).keys())}")
    if not SKIP_REPLAY:
        replay()
    return ok


def replay() -> dict:
    """▶ the longer conversation: the replay job (lab/replay.py) — the source lab's eight
    step-5 sentences into one fresh session. Returns the receipt; prints the numbers."""
    say("── ▶ a longer conversation: the replay job ──")
    p = progress()
    if not p["code"].get("recall"):
        say("recall is not in — chapter II's line goes in first")
        edit(AGENT, uncomment(RECALL))
    if p["code"].get("queue"):
        say("note: the queue tools are in — the booking will join the queue instead of buying (chapter II's replay is meant for the file as chapter II leaves it)")
    run_job("replay")
    r = (progress().get("replay") or {}).get("after") or {}
    o = r.get("order") or {}
    order = f"{o.get('seats')}× {o.get('section')} ${o.get('total'):g} on turn {r.get('order_turn')}" if o else "none"
    plan = "overwritten" if r.get("overwritten") else ("set once" if r.get("plans") else "never set")
    say(f"replay: {r.get('turns')} of 8 turns in {r.get('session_id')} · {r.get('elapsed')} s · compactions {r.get('compactions')}"
        f" (first after turn {r.get('compaction_at')}) · budget_plan {plan} ({r.get('split_calls')}× budget_split) · order {order}"
        f" · asked back: {r.get('asked_back', '')[:70]!r} · ticks {'lit' if r.get('lit') else 'NOT lit'}")
    return r


def health() -> dict:
    return api("/health")


def stage(text: str, sid: str) -> dict:
    """One sentence on the stage (/api/say, attended), the way the talk box sends it."""
    r = api("/say", {"text": text, "session_id": sid, "who": "walk"})
    turn = r.get("turn_tools") if r.get("turn_tools") is not None else r.get("tools")
    say(f"you: {text!r}")
    say(f"  → {turn} · {describe(r)}")
    return r


def ask_for_tickets(sid: str) -> dict:
    """LINE on the stage; if the model asks which show instead of reading recall(), answer it
    the way a person would. The walk prints which happened — that is a number for the report."""
    r = stage(LINE, sid)
    if "join_queue" not in (r.get("tools") or []):
        say("  it asked which show instead of joining — answering")
        r = stage(WHICH, sid)
    return r


def responses(sid: str, tool: str) -> list[dict]:
    return [x for x in (api(f"/session?id={sid}").get("responses") or []) if x.get("tool") == tool]


def kill_and_wait(limit: float = 45) -> str:
    """💀 POST /api/kill, then poll /api/health until lab.sh's loop has brought a new boot_id up."""
    b0 = health()["boot_id"]
    try:
        api("/kill", {})
    except Exception:                                              # noqa: BLE001 — the process dies mid-reply
        pass
    t0 = time.time()
    while time.time() - t0 < limit:
        try:
            b = http("/api/health", timeout=3)["boot_id"]       # type: ignore[index]
            if b != b0:
                say(f"💀 boot {b0} → {b} in {time.time() - t0:.1f} s (lab.sh's loop)")
                return b
        except Exception:                                          # noqa: BLE001
            pass
        time.sleep(0.6)
    raise TimeoutError("the process did not come back — is lab.sh running it?")


def chapter3() -> bool:
    """The kill: the queue tools in, ask, 💀, ask again in the same session."""
    conversation_root()
    p = progress()
    if not p["code"].get("recall"):
        say("recall is not in — chapter II's line goes in first (the chapters are in order)")
        edit(AGENT, uncomment(RECALL))
    edit(AGENT, uncomment(QUEUE))
    api("/venue/reset", {})                                        # one ticket means ONE ticket
    sid = api("/session/new", {})["session_id"]
    say(f"session {sid}")
    ask_for_tickets(sid)
    joined = responses(sid, "join_queue")
    if not joined:
        say("no join_queue — nothing to survive"); return False
    t = joined[-1]
    say(f"ticket {t['ticket']} at #{t['position']:,} · boot {health()['boot_id']}")
    kill_and_wait()
    r = stage(WHERE, sid)
    checks = responses(sid, "check_queue")
    c = checks[-1] if checks else {}
    k = progress().get("kill") or {}
    say(f"after the kill: {'check_queue' in (r.get('turn_tools') or r.get('tools') or [])} · ticket {c.get('ticket')} at #{c.get('position') or 0:,} · venue tickets {k.get('tickets')} · boots {k.get('boots')}")
    return lit(3)


def _stale_run(sid: str) -> dict:
    """The five sentences of chapter IV, in one session: ask, ask about the seats, SELL, SKIP, buy A."""
    ask_for_tickets(sid)
    r = stage(SEATS, sid)
    if "get_seatmap" not in (r.get("tools") or []):
        say("  it did not read the seat map while queued — asking once more (nothing stale otherwise)")
        stage(SEATS, sid)
    api("/venue/sellout", {"section": "A"})
    api("/venue/advance-queue", {})
    say("SELL THE GOOD SEATS · SKIP THE WAIT")
    return stage(BUY, sid)


def chapter4() -> bool:
    """Old news: once as shipped (the venue's 409), then with the fence in (fence.py's refusal)."""
    conversation_root()
    p = progress()
    for marker, key in ((RECALL, "recall"), (QUEUE, "queue")):
        if not p["code"].get(key):
            edit(AGENT, uncomment(marker))
    if p["code"].get("fence"):
        say("the fence is already in — putting the “# ” back first so the before-receipt is real")
        edit(AGENT, recomment(FENCE))
    say("── as shipped: no fence ──")
    api("/venue/reset", {})
    sid = api("/session/new", {})["session_id"]
    _stale_run(sid)
    before = [x for x in responses(sid, "purchase")]
    say(f"BEFORE: purchase answered by {[ (x.get('by'), x.get('status') or x.get('reason')) for x in before ]}")
    say("── the fence in ──")
    edit(AGENT, uncomment(FENCE))
    api("/venue/reset", {})
    sid = api("/session/new", {})["session_id"]
    r = _stale_run(sid)
    fence = [x for x in responses(sid, "purchase") if x.get("by") == "fence"]
    say(f"AFTER: fence.py answered {[ (x.get('reason'), 'believed', x.get('believed_available'), 'actually', x.get('actually_available')) for x in fence ]} · venue 409 in that turn: {any(x.get('status') == 409 for x in responses(sid, 'purchase'))}")
    if not (r.get("orders_new") or []):
        stage(THEN_C, sid)
    f = (progress().get("fence") or {}).get("after") or {}
    say(f"order after the refusal: {f.get('order')}")
    return lit(4)


def _graph_line(r: dict) -> str:
    nodes = " → ".join(f"[{n['node']}]" for n in (r.get("nodes") or [])) or "no node ran"
    return f"{nodes} · parked on {(r.get('turn_interrupts') or ['—'])[-1][:12]}" if r.get("awaiting") else f"{nodes} · finished"


def chapter5() -> bool:
    """The graph: "go" as a conversation first, then the swap, "go", 🐓, SKIP, 🐓."""
    p = progress()
    for marker, key in ((RECALL, "recall"), (QUEUE, "queue"), (FENCE, "fence")):
        if not p["code"].get(key):
            edit(AGENT, uncomment(marker))
    if p["code"].get("budget"):
        say("agree_budget is already in — putting the “# ” back first (chapter V runs the graph without it)")
        edit(NIGHTLY, recomment(BUDGET))
    say("── as shipped: buyer_agent is the root ──")
    edit(AGENT, lambda s_: s_.replace(GRAPH_NOW, GRAPH_WAS))
    api("/venue/reset", {})
    sid = api("/session/new", {})["session_id"]
    r = stage(GO, sid)
    say(f"BEFORE: “go” to a conversation → {r.get('kind')} · {len(r.get('turn_tools') or [])} calls · {'a question' if r.get('reply', '').rstrip().endswith('?') else 'a reply'} · no graph, no ticket")
    say("── the graph is the root ──")
    edit(AGENT, lambda s_: s_.replace(GRAPH_WAS, GRAPH_NOW))
    api("/venue/reset", {})
    sid = api("/session/new", {})["session_id"]
    say(f"session {sid}")
    r = stage(GO, sid)
    say(f"  {_graph_line(r)} · #{r.get('position') or 0:,} · venue tickets {r.get('tickets')} · {r.get('elapsed')}s")
    if not r.get("awaiting"):
        say("the graph did not park — nothing for the clock to answer"); return False
    run_job("wake")
    w = last_clock(progress())
    say(f"🐓 #1: answered {str(w.get('answered'))[:12]} in session {w.get('session_id')} · {_graph_line(w)} · #{w.get('position') or 0:,} · venue tickets {w.get('tickets')} · {w.get('elapsed')}s")
    api("/venue/advance-queue", {})
    say("SKIP THE WAIT")
    run_job("wake")
    w = last_clock(progress())
    say(f"🐓 #2: answered {str(w.get('answered'))[:12]} · {_graph_line(w)} · {describe(w)}")
    g = (progress().get("graph") or {}).get("after") or {}
    say(f"receipt: parks {g.get('parks')} at {g.get('positions')} · clock wake-ups that answered an interrupt {g.get('wakeups')} · tickets at each park {g.get('tickets')} · order {bool(g.get('order'))} · nodes {g.get('nodes')}")
    return lit(5)


def chapter6() -> bool:
    """The budget: agree_budget first; ask, answer, confirm, SKIP, 🐓; then the unattended probe."""
    p = progress()
    for marker, key in ((RECALL, "recall"), (QUEUE, "queue"), (FENCE, "fence")):
        if not p["code"].get(key):
            edit(AGENT, uncomment(marker))
    if not p["code"].get("graph"):
        say("the graph is not the root — chapter V's swap goes in first (the chapters are in order)")
        edit(AGENT, lambda s_: s_.replace(GRAPH_WAS, GRAPH_NOW))
    b = (p.get("budget") or {}).get("before")
    say(f"BEFORE (chapter V's run, no agree_budget): {b['open']!r} — spent without asking" if b else "BEFORE: no graph run without agree_budget on record (walk chapter V first for the before-number)")
    edit(NIGHTLY, uncomment(BUDGET))
    api("/venue/reset", {})
    sid = api("/session/new", {})["session_id"]
    say(f"session {sid}")
    r = stage(ASK, sid)
    say(f"  {_graph_line(r)} · asked: {r.get('reply', '')[:90]!r}")
    if "budget:ask" not in (r.get("turn_interrupts") or []):
        say("agree_budget did not ask — is the line in, and is this a new conversation?"); return False
    r = stage(BUDGET_SENTENCE, sid)
    say(f"  {_graph_line(r)} · read back: {r.get('reply', '')[:110]!r}")
    r = stage(YES, sid)
    st = (r.get("db") or {}).get("state") or {}
    say(f"  {_graph_line(r)} · state.budget = {st.get('budget')!r} · state.request = {str(st.get('request'))[:60]!r} · #{r.get('position') or 0:,} · tickets {r.get('tickets')} · {r.get('elapsed')}s")
    api("/venue/advance-queue", {})
    say("SKIP THE WAIT")
    run_job("wake")
    w = last_clock(progress())
    say(f"🐓 (nobody there): answered {str(w.get('answered'))[:12]} · budget interrupts this turn {[i for i in (w.get('turn_interrupts') or []) if str(i).startswith('budget:')]} · {describe(w)}")
    ok = lit(6)
    a = (progress().get("budget") or {}).get("after") or {}
    o = a.get("order") or {}
    say(f"receipt: questions before spending {a.get('questions')} · sentence typed {a.get('typed')} · order {o.get('section')} ${o.get('unit_price')}/seat vs “{a.get('sentence')}” · unattended wake-ups that did not ask {a.get('unattended')}")
    say("── probe: 🐓 with nothing parked — a fresh session reaches agree_budget with nobody there ──")
    run_job("wake")
    w = last_clock(progress())
    agree = [n["text"] for n in (w.get("nodes") or []) if n["node"] == "agree_budget"]
    say(f"probe: session {w.get('session_id')} · {agree[0] if agree else 'agree_budget printed nothing'} · budget interrupts {[i for i in (w.get('turn_interrupts') or []) if str(i).startswith('budget:')]} · {_graph_line(w)}")
    return ok


def restore() -> None:
    say("restoring the repo as shipped: every “# ” back, the venue reset, the memory file re-seeded")
    edit(AGENT, recomment(RECALL))
    edit(AGENT, recomment(QUEUE))
    edit(AGENT, recomment(FENCE))
    edit(AGENT, lambda s_: s_.replace(GRAPH_NOW, GRAPH_WAS))
    edit(NIGHTLY, recomment(BUDGET))
    api("/venue/reset", {})
    run_job("seed")


def main() -> int:
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE)
    ap.add_argument("--only", type=int)
    ap.add_argument("--restore", action="store_true", help="put the repo back as shipped (alone: restore only)")
    ap.add_argument("--all", action="store_true", help="walk every chapter (with --restore: walk, then restore)")
    ap.add_argument("--reset", action="store_true", help="reset the venue first (a clean box office)")
    ap.add_argument("--replay", action="store_true", help="chapter II's ▶ only: the longer conversation, against the file as it is")
    ap.add_argument("--skip-replay", action="store_true", help="walk chapter II without the eight-turn replay")
    a = ap.parse_args()
    BASE = a.base.rstrip("/")
    global SKIP_REPLAY
    SKIP_REPLAY = a.skip_replay
    try:
        h = api("/health")
    except urllib.error.URLError as exc:
        print(f"no lab at {BASE}: {exc}")
        return 2
    say(f"lab at {BASE} · mode {h['mode']} · boot {h['boot_id']} · venue {h['venue']}")
    if a.reset:
        api("/venue/reset", {})
        say("venue reset")
    steps = {1: chapter1, 2: chapter2, 3: chapter3, 4: chapter4, 5: chapter5, 6: chapter6}
    todo = [a.only] if a.only else ([] if (a.restore or a.replay) and not a.all else [1, 2, 3, 4, 5, 6])
    results: dict[int, bool] = {}
    if a.replay and not a.all:
        results[2] = bool(replay().get("lit"))
        say(f"replay: {'ticks LIT ✓' if results[2] else 'ticks not lit ✗'}")
    for n in todo:
        say(f"── chapter {n} ──")
        try:
            results[n] = steps[n]()
        except Exception as exc:                                   # noqa: BLE001
            say(f"chapter {n} failed: {type(exc).__name__}: {exc}")
            results[n] = False
        say(f"chapter {n}: {'LIT ✓' if results[n] else 'not lit ✗'}")
    p = progress()
    print("\nlit:", p["lit"], "· code:", p["code"], "· orders:", p["venue"]["order_count"], "· boots:", p["boots"])
    for w in p.get("wakes", [])[-6:]:
        print(f"  {w['source']:<5} {describe(w)}")
    if a.restore:
        restore()
    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
