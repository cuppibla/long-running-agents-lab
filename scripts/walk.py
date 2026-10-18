"""The headless learner: walks the chapters against a running lab, the way a
person would from the page — the same /api routes, the same edit, the same
job — and reports which stubs tore.

    uv run python scripts/walk.py                      # I–IV, leaves the file as the walk left it
    uv run python scripts/walk.py --restore            # restore only: every "# " back, the venue reset, memory re-seeded
    uv run python scripts/walk.py --only 3             # one chapter   (add --restore to restore afterwards)
    uv run python scripts/walk.py --all --restore      # walk I–IV, then restore
    uv run python scripts/walk.py --base http://127.0.0.1:3499

Chapter I: say the plan on the stage, wait, prove nothing ran, then start the
clock job (monstertix/clock.py --in 10 → POST /api/wake) and read the receipt.
Chapter II: a 3am wake as shipped (no recall) for the before-number, delete the
"# " on `recall, remember,`, wake again, read the order.
Chapter III: delete the "# " on the queue tools, ask for the tickets on the stage
(it joins the queue), POST /api/kill, wait for the new boot, ask "Where am I in
line?" in the same session — the same ticket, read back by the next process.
Chapter IV: as shipped first — ask, ask about the seats, SELL THE GOOD SEATS,
SKIP THE WAIT, "Buy the two section A seats." → the venue's 409; then the fence
in, the same five sentences in a new conversation → fence.py's refusal before the
venue, then "Then section C, two seats." → the order.
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
PLAN = "Grab us two tickets the moment the presale opens. Keep checking."
LINE = "The presale just opened. Get us tickets to the Amsterdam show."
WHICH = "The Saturday show, please."                     # if it asks which show (recall should have told it)
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


def chapter1() -> bool:
    """Say the plan; hands down; prove 0 runs happened; then the clock."""
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
    return ok


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


def restore() -> None:
    say("restoring the repo as shipped: every “# ” back, the venue reset, the memory file re-seeded")
    edit(AGENT, recomment(RECALL))
    edit(AGENT, recomment(QUEUE))
    edit(AGENT, recomment(FENCE))
    edit(AGENT, lambda s: s.replace("root_agent = nightly", "root_agent = buyer_agent"))
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
    a = ap.parse_args()
    BASE = a.base.rstrip("/")
    try:
        h = api("/health")
    except urllib.error.URLError as exc:
        print(f"no lab at {BASE}: {exc}")
        return 2
    say(f"lab at {BASE} · mode {h['mode']} · boot {h['boot_id']} · venue {h['venue']}")
    if a.reset:
        api("/venue/reset", {})
        say("venue reset")
    steps = {1: chapter1, 2: chapter2, 3: chapter3, 4: chapter4}
    todo = [a.only] if a.only else ([] if a.restore and not a.all else [1, 2, 3, 4])
    results: dict[int, bool] = {}
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
