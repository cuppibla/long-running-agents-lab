"""The venue, inside this process.

venue/app.py is the source lab's fake ticket seller, vendored verbatim. The
source deploys one per student to Cloud Run so that pressing SELL OUT does not
hit anybody else's queue; here one person owns one process, so the same file
runs in it — on a loopback port of its own (`env.VENUE_PORT`), served by a
second uvicorn in a thread.

Why a thread and not a plain mount: ADK runs a sync tool on the event loop, and
every venue call in tools.py / fence.py / panel.py is a blocking httpx request.
Mounted on the same loop, the tool would block the loop that has to answer it.
The thread gives the venue a loop of its own; the process is still one process,
and the page still sees one port (the venue is ALSO mounted at /venue for the
world buttons and the panel).

The admin buttons on the stage do not go over HTTP at all — `admin()` calls the
venue's functions in-process, under its own lock.
"""
from __future__ import annotations

import logging
import threading
import time

import httpx
import uvicorn

from lab import env

log = logging.getLogger("lab.venue")
_thread: threading.Thread | None = None
_server: uvicorn.Server | None = None


def module():
    import venue.app as vapp          # reads VENUE_DB from the environment at import; env.py set it
    return vapp


def app():
    return module().app


def start() -> None:
    """Serve the venue on 127.0.0.1:VENUE_PORT from a daemon thread. Idempotent."""
    global _thread, _server
    if _thread and _thread.is_alive():
        return
    config = uvicorn.Config(app(), host="127.0.0.1", port=env.VENUE_PORT, log_level="warning", lifespan="on")
    _server = uvicorn.Server(config)
    _thread = threading.Thread(target=_server.run, name="venue", daemon=True)
    _thread.start()


def wait_ready(timeout: float = 10.0) -> bool:
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            if httpx.get(f"{env.VENUE_URL}/health", timeout=1).status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        time.sleep(0.15)
    return False


def stop() -> None:
    if _server is not None:
        _server.should_exit = True


# ── the world buttons, in-process ────────────────────────────────────────────
ACTIONS = {
    "reset": lambda m, body: m.reset(),
    "advance-queue": lambda m, body: m.advance_queue(),
    "sellout": lambda m, body: m.sell_out({"section": body.get("section", "A"), **({"city": body["city"]} if body.get("city") else {})}),
    "hang-once": lambda m, body: m.hang_once(),
    "clock": lambda m, body: m.set_clock({"multiplier": float(body.get("multiplier", 1))}),
}


def admin(action: str, body: dict | None = None) -> dict:
    if action not in ACTIONS:
        raise KeyError(action)
    return ACTIONS[action](module(), body or {})


def state() -> dict:
    """What the venue panel polls: queue, orders, inventory, activity, clock."""
    return module().state()
