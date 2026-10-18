"""The lab — one process, one port.

    /                 the page (site/out, built once by lab.sh)
    /api/health       {ok, boot_id, mode}
    /api/progress     which chapter is lit — read from your files + what ran
    /api/events       SSE: the event log (recent history, then live) · /api/log: the same, once
    /api/say          POST {text, who}: one real reply from the agent, on the stage
    /api/code         GET / POST: the in-page editor (allow-listed files, syntax-checked)
    /api/job          POST {kind} / GET ?kind= / DELETE ?kind=: exam
    /api/source       GET ?path=: one file of the lab, as plain text (the ↗ links)
    /workbench        adk web, mounted here: same agent/ folder, same lab.db

    uvicorn lab.service:app --port 3600

CHANGE ME (the show): the title string. The routes are the contract the page,
scripts/walk.py and scripts/capture.sh all drive; keep them.
"""
from __future__ import annotations

import contextlib
import logging
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lab import env  # noqa: E402,F401  — settles the model path first
from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from lab import codefile, events, jobs, progress, say, state, workbench  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logging.getLogger("google_adk").setLevel(logging.WARNING)
log = logging.getLogger("lab")
SITE = ROOT / "site" / "out"
TITLE = "Lab Starter"

wb = workbench.app()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Starlette does not run a mounted app's lifespan; run the workbench's so
    # its own startup and shutdown hooks fire.
    async with wb.router.lifespan_context(wb):
        yield


app = FastAPI(title=TITLE, lifespan=lifespan)


@app.middleware("http")
async def _no_cache_api(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "boot_id": state.BOOT_ID, "mode": env.MODE}


@app.get("/api/progress")
async def get_progress() -> dict:
    return progress.read(workbench_calls=await workbench.calls())


# ── the log ──────────────────────────────────────────────────────────────────
@app.get("/api/events")
async def get_events():
    return StreamingResponse(events.stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/log")
async def get_log() -> dict:
    return {"events": events.recent(), "episode": events.EPISODE}


# ── the stage ────────────────────────────────────────────────────────────────
@app.post("/api/say")
async def post_say(req: Request) -> dict:
    body = await req.json()
    if say._busy.locked():
        raise HTTPException(409, "a reply is already in progress")
    try:
        return await say.say(str(body.get("text", "")), str(body.get("who", "you")))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


# ── the source, read-only ────────────────────────────────────────────────────
SOURCE_OK = ("agent/", "lab/", "scripts/", "site/lib/", "site/components/", "site/app/",
             "README.md", "lab.sh", "pyproject.toml", ".env.example")


@app.get("/api/source")
async def get_source(path: str):
    """One file of this repo as plain text — the ↗ links on the page. Only the
    lab's own folders; never the venv, the db, .env or anything outside ROOT."""
    clean = path.lstrip("/")
    target = (ROOT / clean).resolve()
    if ".." in clean or not str(target).startswith(str(ROOT)) or not clean.startswith(SOURCE_OK) \
            or clean.endswith((".db", ".env", ".pyc")) or "/.adk/" in clean or "/__pycache__/" in clean \
            or "node_modules" in clean:
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
        await workbench.forget()          # adk web re-reads the file on its next run
        events.emit("file_saved", path=body["path"])
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
    host = request.headers.get("x-forwarded-host", request.headers.get("host", "localhost:3600"))
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

if (SITE / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(SITE), html=True), name="site")
else:
    @app.get("/{path:path}", response_class=HTMLResponse, include_in_schema=False)
    async def _no_site(path: str) -> str:
        return ("<pre style='font:14px/1.6 monospace;padding:2rem'>The page is not built yet.\n\n"
                "    bash lab.sh\n\nbuilds site/ once and starts this server.</pre>")
