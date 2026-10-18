# Long-Running Agents

The starter kit for an **interactive one-page lab**: one FastAPI/uvicorn process
on one port serves a Next.js page, `/api/*`, and `adk web` in a drawer. Three
chapters, one agent, one edit. Distilled from
[Table for N](https://github.com/cuppibla/table-for-n) (the newest) and Agent
Valley's Night Market; the code here is theirs, renamed and trimmed.

| chapter | the concept | what you do on the page | the receipt that lights it |
|---|---|---|---|
| I · the first word | an LlmAgent is a model + an instruction; a reply is not a result | say the line on the stage, then in the workbench | a session in `lab.db` made from the workbench |
| II · the one line | a tool is a Python function; `tools=[door_code]` is the wiring | delete one `# ` in `agent/agent.py` · run the exam before and after | an exam that ran with the tool scored higher than one that ran without it |
| III · the check | lamps come from receipts, never from a checklist | press the check | both |

*A lamp lights from a receipt, never from a checklist.*

## Run it

Needs Python 3.11+, [`uv`](https://docs.astral.sh/uv/) and Node 20+. Either a
Google Cloud project (Vertex AI) or an AI Studio key.

```bash
uv sync                                # .venv — lab.sh refuses to start without it
cp .env.example .env                   # point at a project, or paste a key (see the file)
uv run python scripts/preflight.py     # one real model call + "where am I"
bash lab.sh                            # builds site/ once, then ONE uvicorn on $PORT (default 3490)
```

Open **http://localhost:3490**. `lab.sh` recreates `.venv` (via `uv sync`) and
`site/node_modules` + `site/out` (via `npm ci` + `npm run build`) when they are
missing or stale; none of those are checked in.

In Cloud Shell: `./setup_project.sh` (a billing-linked project) then
`./setup_codelab.sh` (API on, `.venv`, the page built, `.env`, preflight), then
`bash lab.sh` and Web Preview on the port.

Nothing restarts. A save in the page lands on your next reply and your next
exam; the workbench re-reads the file on its next run (`POST /api/code` evicts
its cached agent).

## What is where

```
agent/                  the ADK agent folder adk web lists: __init__.py · agent.py (root_agent) · instruction.txt
lab/                    the service package
  service.py            the routes (below), the workbench mount, the static mount LAST
  events.py             the append-only event log · SSE (/api/events) + once (/api/log)
  jobs.py               subprocess jobs; a line printed as `@@event {json}` lands in the log
  progress.py           which chapter is lit: a code fact paired with a receipt, per chapter
  codefile.py           the in-page editor's back end: allow-listed files, syntax-checked writes
  workbench.py          adk web via get_fast_api_app(url_prefix="/workbench", reload_agents=False) + forget()
  say.py                POST /api/say: one real reply through ADK's Runner, sessions in the shared lab.db
  state.py              receipts (runs/state.json) + BOOT_ID
  env.py                Vertex-vs-key, settled once, .env over the shell
site/                   Next 15 static export (output:"export", trailingSlash)
  lib/chapters.ts       the three chapters — the data model (hook · concept · steps · edit · run · sources · expect · next · wbGuide)
  lib/api.ts            the /api client · lib/useEvents.ts  the SSE fold (+ ?still=1)
  components/           Cover · Rail (lamps) · Stage · Chapter · Editor · Console · Workbench (drawer) · Check (receipt)
  app/page.tsx          the cover · app/lab/page.tsx  the lab (?ch= &still=1 &console=1 &check=1)
  app/globals.css       the token block "THE SHOW'S PALETTE — change these"
scripts/
  exam.py               the job: the agent on 3 fixed prompts, @@event lines, one JSON receipt
  walk.py               the headless learner: drives /api/* as the page does, asserts lit chapters, --restore
  capture.sh            shoots every chapter with ?still=1 in headless Chrome (--timeout, not shell timeout)
  preflight.py          one real model call + "where am I" from files and receipts
art/gen.py              the Nano Banana pattern: ONE chat seeded with refs + STYLE + a PIECES dict; ships no images
lab.sh                  refuses to start unconfigured · builds the site once when changed · ONE uvicorn
setup_project.sh        Cloud Shell: a billing-linked project (LAB_SLUG / LAB_NAME / REUSE_FLAG block at the top)
setup_codelab.sh        Cloud Shell: API on, .venv, the page, .env, preflight
launch.example.json     the preview-runner entry (python -m uvicorn --app-dir …)
```

### The routes (the contract the page and the scripts drive)

```
GET  /api/health                 {ok, boot_id, mode}
GET  /api/progress               {code:{edit,…}, lit:{"1","2","3"}, boot_id, workbench_calls, exams, last_say, …}
GET  /api/events  · GET /api/log SSE, and the same history once (?still=1 uses it)
GET  /api/code?path=&symbol=     one allow-listed file (or one top-level symbol)
POST /api/code {path,content}    syntax-checked write; evicts the workbench's cached agent
POST /api/job {kind} · GET ?kind= · DELETE ?kind=     one job per kind; `exam` here
GET  /api/source?path=           plain-text read; rejects .., .env, .db, .pyc, /.adk/, __pycache__
POST /api/say {text, who}        one reply from root_agent; emits say_asked / say_replied
/workbench                       adk web; /workbench/dev-ui/assets/config/runtime-config.json is served
                                 with an ABSOLUTE backendUrl (otherwise the dev UI builds ws://workbench/run_live)
/                                site/out, mounted last
```

## The three CHANGE ME zones

**1 · the show** — `site/lib/chapters.ts` (`SHOW`, `ART`, `LINE`, `CLOSING`),
the token block at the top of `site/app/globals.css` (+ the font link in
`app/layout.tsx`), `TITLE` in `lab/service.py`, `LAB_NAME` in `lab.sh` and the
setup scripts, `STYLE` / `PIECES` in `art/gen.py`, `site/public/art/README.md`.
The page falls back to CSS gradients while the art is missing.

**2 · the chapters** — `site/lib/chapters.ts` (one entry per chapter),
`lab/progress.py` (one `lit` line per chapter: a code fact paired with a
receipt), `lab/codefile.py` (`FILES`, what the editor may open),
`lab/jobs.py` (one builder + finisher per job kind), `scripts/exam.py`
(the job itself), `scripts/walk.py` (one function per chapter + `restore`),
`scripts/capture.sh` (one shot per state), `scripts/preflight.py` (`chapters`).

**3 · the agent** — `agent/agent.py` (name, model, tools, the marker line),
`agent/instruction.txt`, `APP` in `lab/workbench.py` and `lab/say.py` if you
rename the folder.

## The UX laws the components honour

- Every edit shows a **was / now** box and the file it changed; a button that
  changes a file shows the file (the Editor is a live view of the disk).
- A state-aware **NEXT →** cue per chapter, computed from `/api/progress`.
- Instructions live on the tool they are about, **once**: the workbench drawer
  carries the numbered steps + a YOU WILL SEE line; the chapter panel only points there.
- Lamps light from **receipts** (a session that exists, an exam that ran),
  never from a checklist — and stay earned: the receipt records the state of
  the file when it ran, so changing the file back does not unlight it.
- A **SOURCE** row per chapter linking to `/api/source`; `?ch=N` deep links;
  `?still=1` reads the log once so headless Chrome can shoot the page.
- The chapter panel stays sparse; explicit steps sit where the gesture happens.

## Verify a derived lab

```bash
uv run python scripts/walk.py --base http://127.0.0.1:3490            # lights I, II, III on the real model
uv run python scripts/walk.py --base http://127.0.0.1:3490 --restore  # …and puts the "# " back
LAB_URL=http://127.0.0.1:3490 bash scripts/capture.sh runs/shots      # cover + every chapter, as PNGs (LAB_URL = where the lab runs)
```

`exam.py` exits 0 when every prompt got a reply; the score is data (in the
receipt, the `exam_scored` event and the last log line). A 0 / 3 is a result,
not an error — chapter II needs it.

## What was left out, and where to find it

Three chapters do not need everything Table for N has. When a lab does, copy from
`~/Documents/table-for-n`:

- more job kinds (`adk eval`, `adk optimize`, a loop, deploy/traffic/pipe/harvest) → `kitchen/jobs.py`
- the judge switch and per-party verdict parsing → `kitchen/service.py`, `kitchen/jobs.py::_parties`
- GEPA output parsing (`Optimized root agent instructions` block) → `kitchen/jobs.py::_finish_optimize`
- an instruction library installed by content, not by click → `kitchen/instruction.py`
- custom metrics registered into the dev UI's eval dialog → `kitchen/metrics_registry.py`
- `.env` lines edited from the page → `kitchen/env.py::write_env_line`, `/api/env`
- the floor-plan diagram that animates while a job runs → `site/components/FloorPlan.tsx`
- the symbol-scoped editor route as a reusable router → `~/Documents/agent-valley/shared/editor.py`

`uv.lock` is checked in so `uv sync` reproduces the exact set; regenerate it
when you change `pyproject.toml`.
