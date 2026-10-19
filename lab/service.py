"""Long-Running Agents — one process, one port.

    /                     the page (site/out, built once by lab.sh)
    /api/health           {ok, boot_id, mode, venue}
    /api/progress         which chapter is lit — read from your files + what ran
    /api/events           SSE: the event log (recent history, then live) · /api/log: the same, once
    /api/say              POST {text, session_id?}: a person on the stage → the agent runs, attended
    /api/wake             POST {message?, session_id?}: the clock's door → the same agent, unattended;
                          with no session id it answers the stage's parked run (V, VI) or opens a wake-… session
    /api/session/new      POST: a fresh stage session id (nothing is deleted)
    /api/code             GET / POST: the in-page editor (two files, syntax-checked)
    /api/job              POST {kind} / GET ?kind= / DELETE ?kind=: wake · seed
    /api/venue/{action}   POST: the world buttons — reset · advance-queue · sellout · hang-once · clock
    /api/venue/state      GET: what the venue panel polls
    /api/kill             POST: the process ends on purpose; lab.sh brings it back (boot_id changes)
    /api/source           GET ?path=: one file of the lab, as plain text (the ↗ links)
    /workbench            adk web, mounted here: same agent/ folder, same lab.db, same artifacts
    /venue                the vendored venue, mounted for the page (the agent talks to its own port)

    uvicorn lab.service:app --port 3490
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
import os
import re
import sys
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
warnings.filterwarnings("ignore", message=r".*\[EXPERIMENTAL\].*")

from lab import env  # noqa: E402,F401  — settles the model path and the venue's port first
from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from lab import codefile, events, jobs, progress, runner, state, venue_mount, workbench  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logging.getLogger("google_adk").setLevel(logging.WARNING)
log = logging.getLogger("lab")
SITE = ROOT / "site" / "out"
TITLE = "Long-Running Agents"

wb = workbench.app()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    state.record_boot()
    venue_mount.start()
    ok = await asyncio.to_thread(venue_mount.wait_ready, 10.0)
    log.info("boot %s · venue %s on %s · mode %s", state.BOOT_ID, "up" if ok else "NOT UP", env.VENUE_URL, env.MODE)
    events.emit("boot", boot_id=state.BOOT_ID, venue=ok, boots=len(state.boots()))
    # Starlette does not run a mounted app's lifespan; run the workbench's so
    # its own startup and shutdown hooks fire.
    async with wb.router.lifespan_context(wb):
        yield
    venue_mount.stop()


app = FastAPI(title=TITLE, lifespan=lifespan)


@app.middleware("http")
async def _no_cache_api(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "boot_id": state.BOOT_ID, "mode": env.MODE, "venue": env.VENUE_URL, "port": env.PORT}


@app.get("/api/progress")
async def get_progress() -> dict:
    return progress.read()


# ── the log ──────────────────────────────────────────────────────────────────
@app.get("/api/events")
async def get_events():
    return StreamingResponse(events.stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/log")
async def get_log() -> dict:
    return {"events": events.recent(), "episode": events.EPISODE}


# ── the two doors ────────────────────────────────────────────────────────────
@app.post("/api/say")
async def post_say(req: Request) -> dict:
    """A person typed on the stage. Attended: a question can stop the run and wait for them."""
    body = await req.json()
    text = str(body.get("text", "")).strip()
    if not text:
        raise HTTPException(400, "say what?")
    try:
        return await runner.run(text, session_id=body.get("session_id") or None, attended=True, source="stage",
                                who=str(body.get("who") or "you"))
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/api/wake")
async def post_wake(req: Request) -> dict:
    """The clock posted (monstertix/clock.py, or the venue's DROP THE PRESALE). Nobody is there.
    If the stage's conversation is parked on an adk_request_input, this sentence answers it
    (lab/runner.py decides; handlers.pending_interrupt is the test)."""
    body = {}
    with contextlib.suppress(Exception):
        body = await req.json()
    message = str(body.get("message") or env.WAKE_MESSAGE)
    if body.get("kind") == "presale_drop":                     # the venue's button sends its own shape
        message = env.WAKE_MESSAGE
    try:
        return await runner.run(message, session_id=body.get("session_id") or None, attended=False, source="clock",
                                who="the clock")
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/api/session/new")
async def new_session() -> dict:
    from monstertix import handlers
    sid = handlers.new_session_id()
    state.set_("stage", {"session_id": sid, "ts": None})
    events.emit("session_new", session_id=sid)
    return {"session_id": sid}


@app.get("/api/session")
async def get_session(id: str) -> dict:
    """What lab.db holds for one session — the receipt behind the stage's readouts."""
    return {"id": id, **await runner.session_calls(id)}


# ── the world ────────────────────────────────────────────────────────────────
@app.post("/api/venue/{action}")
async def venue_action(action: str, req: Request) -> dict:
    body = {}
    with contextlib.suppress(Exception):
        body = await req.json()
    try:
        out = await asyncio.to_thread(venue_mount.admin, action, body)
    except KeyError as exc:
        raise HTTPException(404, f"no world button {action!r}") from exc
    events.emit("world", action=action, **{k: v for k, v in (body or {}).items() if isinstance(v, (str, int, float))})
    progress._cache = None
    return {"ok": True, "action": action, "result": out}


@app.get("/api/venue/state")
async def venue_state() -> dict:
    return await asyncio.to_thread(venue_mount.state)


@app.post("/api/kill")
async def kill() -> dict:
    """💀 the process ends on purpose. lab.sh's loop starts a new one a second
    later with a new boot_id; what survives is the lesson (chapter III)."""
    events.emit("kill", boot_id=state.BOOT_ID)
    state.save()
    asyncio.get_event_loop().call_later(0.3, os._exit, 3)
    return {"ok": True, "boot_id": state.BOOT_ID, "note": "dying in 0.3 s · lab.sh brings it back"}


# ── the source, read-only ────────────────────────────────────────────────────
SOURCE_OK = ("agent/", "lab/", "monstertix/", "venue/", "seed/", "memory/", "scripts/", "site/lib/", "site/components/",
             "site/app/", "README.md", "lab.sh", "pyproject.toml", ".env.example", "runs/boots.json")


@app.get("/api/source")
async def get_source(path: str):
    """One file of this repo as plain text — the ↗ links on the page. Only the
    lab's own folders; never the venv, the db, .env or anything outside ROOT."""
    clean = path.lstrip("/")
    target = (ROOT / clean).resolve()
    if ".." in clean or not str(target).startswith(str(ROOT)) or not clean.startswith(SOURCE_OK) \
            or clean.endswith((".db", ".env", ".pyc", ".jpg", ".png", ".mp3")) or "/.adk/" in clean or "/__pycache__/" in clean \
            or "node_modules" in clean or clean == ".env":
        raise HTTPException(404, "not a source file of this lab")
    if not target.is_file():
        raise HTTPException(404, f"{clean} does not exist")
    return PlainTextResponse(target.read_text(errors="replace"), headers={"X-Source-Path": clean})


# ── the editor ───────────────────────────────────────────────────────────────
@app.get("/api/code")
async def read_code(path: str, symbol: str | None = None) -> dict:
    try:
        return codefile.read(path, symbol)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc


@app.post("/api/code")
async def write_code(req: Request) -> dict:
    body = await req.json()
    try:
        out = codefile.write(body["path"], body["content"], body.get("symbol"))
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    if out.get("validation", {}).get("valid"):
        await workbench.forget()          # adk web re-reads the files on its next run
        progress._cache = None
        events.emit("file_saved", path=body["path"], code=progress.code_facts())
    return out


# ── jobs ─────────────────────────────────────────────────────────────────────
@app.post("/api/job")
async def post_job(req: Request) -> dict:
    body = await req.json()
    kind = body.get("kind", "")
    if kind not in jobs.BUILDERS:
        raise HTTPException(400, f"unknown job {kind!r}")
    opts = {k: v for k, v in body.items() if k != "kind"}
    try:
        job = await jobs.start(kind, **opts)
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc
    return job.view()


@app.get("/api/job")
async def get_job(kind: str | None = None) -> dict:
    if kind:
        j = jobs.JOBS.get(kind)
        return j.view() if j else {"kind": kind, "state": "idle", "log": [], "summary": {}}
    return jobs.views()


@app.delete("/api/job")
async def stop_job(kind: str) -> dict:
    return {"stopped": await jobs.stop(kind)}


# ── the workbench ────────────────────────────────────────────────────────────
def _origin(request: Request) -> str:
    """The origin the browser used. Behind a proxy — Cloud Shell's Web Preview
    is one — only the browser knows it, and it says so in Referer."""
    seen = re.match(r"https?://[^/]+", request.headers.get("referer", ""))
    if seen:
        return seen.group(0)
    proto = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    host = request.headers.get("x-forwarded-host", request.headers.get("host", f"localhost:{env.PORT}"))
    return f"{proto}://{host.split(',')[0].strip()}"


@app.get("/workbench/dev-ui/assets/config/runtime-config.json", include_in_schema=False)
async def runtime_config(request: Request):
    """The dev UI reads `backendUrl` from this file and builds its live
    websocket as `ws://<backendUrl>/run_live`. With the relative prefix ADK
    writes ("/workbench") that becomes `ws://workbench/run_live` — a host that
    does not exist. Give it the absolute origin the page was served from."""
    return JSONResponse({"backendUrl": f"{_origin(request)}/workbench", "telemetry": False},
                        headers={"Cache-Control": "no-store"})


app.mount(workbench.URL_PREFIX, wb)
app.mount("/venue", venue_mount.app(), name="venue")

if (SITE / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(SITE), html=True), name="site")
else:
    @app.get("/{path:path}", response_class=HTMLResponse, include_in_schema=False)
    async def _no_site(path: str) -> str:
        return ("<pre style='font:14px/1.6 monospace;padding:2rem'>The page is not built yet.\n\n"
                "    bash lab.sh\n\nbuilds site/ once and starts this server.</pre>")
