# Long-Running Agents

**MonsterTix · ADK 2 on Google Cloud.** An agent that waits in line, survives
being killed, and buys at 3am inside limits you set — six chapters on one page,
with a real agent behind it. This is the interactive-lab form of the
[MonsterTix workshop](https://github.com/gca-americas/monstertix) (Christina
Lin's two-hour long-running-agents codelab): the venue, the handler, the clock
and the agent package are vendored verbatim; every chapter's hands-on step is
one gesture on the page, lit by a receipt the process produced.

| chapter | the concept | what you do on the page | the receipt that tears the stub |
|---|---|---|---|
| I · the clock | `instruction=` is read only when a message arrives; a **trigger** (an endpoint + a `Runner`) and a **triggerer** (a clock) | say the plan, hands down, press 🐓 WAKE IT AT 3AM | a `wake-…` session the clock created, with ≥ 1 tool call |
| II · where a fact lives | `temp:` · session state · `user:` · a memory file; `recall()` through `BaseMemoryService`; compaction | delete one `# ` on `recall, remember,` · 🐓 again | a wake whose events include `recall` and whose order is the Saturday show |
| III · the kill | `LongRunningFunctionTool` returns a handle; `ResumabilityConfig` parks the run in the store | delete one `# ` · ask for tickets · 💀 KILL · ask again | the same queue ticket under two boot ids, one ticket at the venue *(phase 2)* |
| IV · old news | `before_tool_callback` re-reads the world; returning a dict short-circuits the tool | delete one `# ` · SELL THE GOOD SEATS · SKIP · "buy section A" | a `stale_plan` refusal before the venue is called *(phase 2)* |
| V · the graph | `Workflow`: rules as function nodes, judgement as agent nodes; `RequestInput` parks; `rerun_on_resume` | swap `root_agent = buyer_agent` → `nightly` · "go" · 🐓 · SKIP · 🐓 | an `adk_request_input`, ≥ 2 wake-ups, one ticket, one order *(phase 3)* |
| VI · the budget | the same interrupt aimed at a person; a stable `interrupt_id`; `ctx.resume_inputs`; `someone_is_there()` per request | delete one `# ` on `NIGHT.insert(0, agree_budget)` · answer in your words | `budget` in session state == your sentence *(phase 3)* |
| VII · breakfast | the laptop → cloud diff, read only | read the phone | six stubs |

*A stub tears from a receipt, never from a checklist.*

## Run it

Needs Python 3.11+, [`uv`](https://docs.astral.sh/uv/) and Node 20+. Either a
Google Cloud project (Vertex AI) or an AI Studio key.

```bash
uv sync                                # .venv — lab.sh refuses to start without it
cp .env.example .env                   # point at a project, or paste a key (see the file)
uv run python scripts/preflight.py     # one real model call + "where am I"
bash lab.sh                            # builds site/ once, then ONE uvicorn on $PORT (default 3490)
```

Open **http://localhost:3490**. `lab.sh` keeps the process open: 💀 KILL THE
PROCESS (chapter III) really ends it, and the loop starts a new one a second
later with a new boot id. To stop the lab, stop `lab.sh`.

In Cloud Shell: `./setup_project.sh` (a billing-linked project) then
`./setup_codelab.sh`, then `bash lab.sh` and Web Preview on the port.

Nothing restarts on a save. An edit in the page lands on the next run — the
stage's, the clock's and the workbench's all re-read the file.

## What is where

```
agent/concert/          the agent package, vendored from the source lab (header comment on each file)
  agent.py              RESTRUCTURED: four one-line toggles (II recall · III queue · IV fence · V root_agent)
  nightly.py            RESTRUCTURED: one one-line toggle (VI NIGHT.insert(0, agree_budget)); every node verbatim
  tools.py · memory.py · fence.py · budget.py · panel.py · venue.py · config.py   verbatim
monstertix/             handlers.py (wake · pending_interrupt · wipe) and clock.py (the triggerer), verbatim
venue/                  app.py, the fake ticket seller, verbatim — runs INSIDE the lab's process
seed/                   the two-days-ago session and the starting memory file, verbatim
memory/userx.md         what recall() reads; remember() appends; the seed job rewrites it
lab/                    the service package (this lab's own code)
  service.py            the routes (below), the workbench mount, the venue mount, the static mount LAST
  runner.py             the trigger: /api/say (attended) and /api/wake (unattended) through handlers.wake; receipts
  venue_mount.py        the venue on its own loopback port in a thread (sync tools would block one loop)
  jobs.py               subprocess jobs: wake (clock.py --in 10) · seed; `[clock]` lines → events
  progress.py           which stub is torn: a code fact paired with a receipt, per chapter
  codefile.py           the editor's back end: two files, symbol-scoped, syntax-checked writes
  workbench.py          adk web via get_fast_api_app(url_prefix="/workbench") + forget()
  events.py             the append-only event log · SSE (/api/events) + once (/api/log)
  state.py              receipts (runs/state.json) + boots (runs/boots.json) + BOOT_ID
  env.py                Vertex-vs-key, the venue's port, the clock's target — settled once
site/                   Next 15 static export (output:"export", trailingSlash)
  lib/chapters.ts       the seven chapters — hook · concept · steps · edit · run · reads · tiles · next · wbGuide
  components/           Cover · Rail (stubs) · Stage · NightShift · Chapter · Editor · Workbench · Console · Breakfast
scripts/
  walk.py               the headless learner: I and II on the real model, --restore puts every "# " back
  preflight.py          one real model call + "where am I"
  capture.sh            shoots the page in headless Chrome (?still=1)
lab.sh                  refuses to start unconfigured · builds the site once · keep-open loop around ONE uvicorn
```

### The routes

```
GET  /api/health                 {ok, boot_id, mode, venue, port}
GET  /api/progress               {code:{recall,queue,fence,graph,budget}, lit:{"1".."7"}, boot_id, boots, wakes, venue, …}
GET  /api/events  · GET /api/log SSE, and the same history once (?still=1 uses it)
POST /api/say {text, session_id}  a person typed: handlers.wake(…) with budget.mark_attended()
POST /api/wake {message?}        the clock's door: the same handler, unattended; a new wake-… session
POST /api/session/new            a fresh stage session id
GET  /api/session?id=            what lab.db holds for one session (calls, state, compactions)
GET/POST /api/code               the editor (agent/concert/agent.py · nightly.py); POST evicts the workbench's agent
POST /api/job {kind} · GET ?kind= · DELETE ?kind=     wake · seed
POST /api/venue/{action}         reset · advance-queue · sellout · hang-once · clock   (the world buttons)
GET  /api/venue/state            what the venue panel polls
POST /api/kill                   exit 3; lab.sh restarts; boot_id changes
GET  /api/source?path=           plain-text read; rejects .., .env, .db, .pyc, /.adk/, __pycache__
/workbench                       adk web (runtime-config.json served with an ABSOLUTE backendUrl)
/venue                           the venue, mounted for the page and its panel
/                                site/out, mounted last
```

## Verify

```bash
uv run python scripts/walk.py --base http://127.0.0.1:3490            # I and II on the real model
uv run python scripts/walk.py --base http://127.0.0.1:3490 --restore  # puts every "# " back, resets the venue, re-seeds memory; git status clean
LAB_URL=http://127.0.0.1:3490 bash scripts/capture.sh runs/shots      # the shots
```

The source lab's structural tests pass unchanged on the pinned ADK (2.9.2):
`38 passed, 10 skipped`. Credits: the venue, the handler, the clock, the seed
and the agent package are Christina Lin's, from the MonsterTix workshop.
