"""The headless learner: walks the three chapters against a running lab, the
way a person would from the page — the same /api routes, the same edit, the
same job — and reports which chapters lit.

    uv run python scripts/walk.py                      # I–III, leaves the file as the walk left it
    uv run python scripts/walk.py --restore            # …then puts the "# " back
    uv run python scripts/walk.py --only 2             # one chapter
    uv run python scripts/walk.py --base http://127.0.0.1:3900

Chapter I is walked through adk web's own API (the same routes its page
calls), so the receipt is a real workbench session in lab.db.
Exit code 0 when every walked chapter lit.

CHANGE ME (the chapters): one function per chapter, and restore().
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

BASE = os.environ.get("LAB_URL", "http://127.0.0.1:3600").rstrip("/")
MARKER = "tools=[door_code],"
LINE = "Hi, I'm new here. What's the door code?"


def http(path: str, body: dict | None = None, method: str | None = None, timeout: float = 120) -> dict | list:
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


def wait_job(kind: str, limit: float = 240) -> dict:
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
    say(f"{kind}: {j['state']} in {j['elapsed']} s · {json.dumps(j.get('summary', {}))[:160]}")
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


def lit(n: int) -> bool:
    return bool(api("/progress")["lit"].get(str(n)))


def uncomment(src: str) -> str:
    return re.sub(r"^(\s*)# " + re.escape(MARKER), r"\1" + MARKER, src, count=1, flags=re.M)


def recomment(src: str) -> str:
    return re.sub(r"^(\s*)" + re.escape(MARKER), r"\1# " + MARKER, src, count=1, flags=re.M)


def chapter1() -> bool:
    """Say the line on the stage, then once more through adk web's API —
    POST /workbench/apps/agent/users/user/sessions, then POST /workbench/run —
    which is exactly what the dev UI's chat does. That session is the receipt."""
    r = api("/say", {"text": LINE, "who": "walk"})
    say(f"stage: {str(r.get('reply', r.get('error')))[:120]!r}")
    s = http("/workbench/apps/agent/users/user/sessions", {})
    sid = s["id"]                                                   # type: ignore[index]
    evs = http("/workbench/run", {"app_name": "agent", "user_id": "user", "session_id": sid,
                                  "new_message": {"role": "user", "parts": [{"text": LINE}]}})
    texts = [p.get("text", "") for e in evs for p in (e.get("content") or {}).get("parts", [])  # type: ignore[union-attr]
             if e.get("author") != "user" and p.get("text")]
    say(f"workbench session {sid}: {(texts[-1] if texts else '')[:120]!r}")
    return lit(1)


def chapter2() -> bool:
    p = api("/progress")
    if p["code"].get("edit"):
        say("the edit is already in — putting the “# ” back first so the before-receipt is real")
        edit("agent/agent.py", recomment)
    run_job("exam")                                                 # as shipped: 0/3
    edit("agent/agent.py", uncomment)
    r = api("/say", {"text": LINE, "who": "walk"})
    say(f"stage after the edit: {str(r.get('reply', r.get('error')))[:120]!r} · tools {r.get('tools')}")
    run_job("exam")                                                 # with the tool: 3/3
    return lit(2)


def chapter3() -> bool:
    return lit(3)


def restore() -> None:
    say("restoring agent/agent.py as shipped")
    edit("agent/agent.py", recomment)


def main() -> int:
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE)
    ap.add_argument("--only", type=int)
    ap.add_argument("--restore", action="store_true")
    a = ap.parse_args()
    BASE = a.base.rstrip("/")
    try:
        h = api("/health")
    except urllib.error.URLError as exc:
        print(f"no lab at {BASE}: {exc}")
        return 2
    say(f"lab at {BASE} · mode {h['mode']} · boot {h['boot_id']}")
    steps = {1: chapter1, 2: chapter2, 3: chapter3}
    todo = [a.only] if a.only else [1, 2, 3]
    results: dict[int, bool] = {}
    for n in todo:
        say(f"── chapter {n} ──")
        try:
            results[n] = steps[n]()
        except Exception as exc:                                   # noqa: BLE001
            say(f"chapter {n} failed: {type(exc).__name__}: {exc}")
            results[n] = False
        say(f"chapter {n}: {'LIT ✓' if results[n] else 'not lit ✗'}")
    p = api("/progress")
    print("\nlit:", p["lit"], "· workbench calls:", p.get("workbench_calls"))
    for e in p.get("exams", [])[-6:]:
        print(f"  exam  score {e['score']}/{e['of']}  edit {'in ' if e['edit'] else 'out'}  tools {e.get('tools')}")
    if a.restore:
        restore()
    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
