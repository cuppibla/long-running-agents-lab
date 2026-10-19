"""The longer conversation — the source lab's step 5, said on the stage by a script.

    python -m lab.replay                 (the `replay` job; TRIGGER_URL names this lab)

Eight sentences into ONE fresh stage session, one POST /api/say after another,
the way a person would type them: five turns of planning (hello · what's on ·
Sam · 4 of us at $200 · 10 of us at $120), then the booking (book us something ·
Amsterdam Saturday, section C, 8 people · yes). That is what gives compaction a
length — ADK summarises every three turns, and a one-sentence wake never reaches
three — and what overwrites `budget_plan` (output_key keeps the latest answer)
and lands the 8× C $760 order the source lab's step 5c ends on.

Like clock.py, this file knows a URL and nothing about agents. The agent runs
behind /api/say; the receipt of every turn is written by lab/runner.py.
"""
from __future__ import annotations

import os
import sys
import time

import httpx

TRIGGER_URL = os.environ.get("TRIGGER_URL", f"http://127.0.0.1:{os.environ.get('LAB_PORT', '3490')}/api").rstrip("/")
WHO = "replay"                        # the receipt's `who` — lab/progress.py keys the replay's receipt on it

#: the source lab's step 5 sentences (content/steps/05-compaction/step.yaml), verbatim
SENTENCES = [
    "hello",
    "what's on in Amsterdam?",
    "Sam is coming with us, and he can't do weeknights",
    "there are 4 of us and I can spend about $200 a head. What fits?",
    "what if 10 people come and I can only do $120 each?",
    "Book us something.",
    "Amsterdam Saturday, section C, 8 people",
    "yes",
]


def log(message: str) -> None:
    print(f"[replay] {message}", flush=True)


def _order(o: dict) -> str:
    return f"{o.get('seats')}× {o.get('section')} ${float(o.get('total') or 0):g}"


def main() -> int:
    n = len(SENTENCES)
    with httpx.Client(timeout=300) as client:
        try:
            sid = client.post(f"{TRIGGER_URL}/session/new").json()["session_id"]
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            log(f"nothing listening at {TRIGGER_URL} — is the lab running? ({type(exc).__name__})")
            return 2
        log(f"session {sid} · {n} sentences, one after another")
        ok = 0
        for i, text in enumerate(SENTENCES, 1):
            log(f"{i}/{n} → {text!r}")
            t0 = time.time()
            r = None
            for attempt in range(40):                         # a run on the stage may be in flight: wait for it
                r = client.post(f"{TRIGGER_URL}/say", json={"text": text, "session_id": sid, "who": WHO})
                if r.status_code != 409:
                    break
                if attempt == 0:
                    log("    the stage is busy — waiting")
                time.sleep(1.5)
            if r is None or r.status_code >= 400:
                log(f"    /say returned {r.status_code if r is not None else '?'} — stopping")
                return 1
            out = r.json()
            if not out.get("ok", True):
                log(f"    the run failed: {out.get('error')} — stopping")
                return 1
            db = out.get("db") or {}
            plan = (db.get("state") or {}).get("budget_plan")
            orders = out.get("orders_new") or []
            bought = " · bought " + ", ".join(_order(o) for o in orders) if orders else ""
            ok += 1
            log(f"    ← {str(out.get('reply') or '')[:110]!r}")
            log(f"    tools {out.get('turn_tools') or []} · compactions {db.get('compactions', 0)} · budget_plan "
                f"{'set' if plan else '—'}{bought} · {time.time() - t0:.1f} s")
    log(f"done. {ok} of {n} turns replied — the receipts are in runs/state.json")
    return 0 if ok == n else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        log("stopped.")
        sys.exit(0)
