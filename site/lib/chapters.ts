import type { Progress, Wake } from "./api";

/** The six chapters and the breakfast message — the data model.
 *
 *  Each chapter: the hook (the failure, as a question) · the concept (real term
 *  first) · steps, each with a where-chip · the one edit (was/now, and `fix` =
 *  "apply the edit for me") · the one job · SOURCE links · what you will see ·
 *  the four readouts and the tiles, computed from receipts · a NEXT cue computed
 *  from receipts · the workbench drawer's guide · the big character on the stage.
 *
 *  Nothing here lights a stub. Stubs tear from /api/progress, which reads your
 *  files and the receipts of what actually ran. Instructions live ONCE, on the
 *  tool they are about: the workbench's numbered steps are in wbGuide and are
 *  not repeated in the panel.
 *
 *  `phase` says which build phase wires a chapter's receipt. Chapters I and II
 *  were walked on the real model on 2026-10-17 (gemini-2.5-flash, 3 samples per
 *  state): without recall the 3am run asked "which show?" into the dark 2 of 3
 *  times and guessed the Tuesday once; with recall in, recall was the first call
 *  3 of 3 and the order was the Saturday show 3 of 3 (section A twice, C once).
 *  The copy below says that. Chapters III and IV were walked on 2026-10-18: the same
 *  queue ticket read back by a second boot (#14,203 → #14,168, a few seconds later at 1×), and
 *  fence.py refusing a stale purchase (reason stale_plan, actually 0, believed null —
 *  the old map lived in the conversation, not in temp: state) before the venue was
 *  called; as shipped the venue itself answered 409 sold_out. Chapters V and VI were walked on
 *  2026-10-18 too: "go" to the conversation = recall + search_events + a question back; to the graph =
 *  four nodes parked at #14,203 on one ticket, 🐓 answering the pause in 0.0 s (check_front only), a
 *  second 🐓 after SKIP → brief → the agent → 2× A $420; with agree_budget first: budget:ask and
 *  budget:confirm before any tool, the typed sentence in state verbatim, the 3am wake-up asking nothing
 *  (the sentence was already in state), and a fresh unattended session printing
 *  "[agree_budget] unattended. Using: up to $250 per seat" — someone_is_there() false on that request. */

export type Where = "page" | "editor" | "workbench" | "watch";
export type Step = { where: Where; do: string; say?: string };
export type Edit = { file: string; symbol?: string; marker: string; afterMarker: string; change: [string, string]; fix?: (src: string) => string; afterHint?: string; swap?: boolean };
export type Read = { k: string; v: string; s?: string; cls?: "" | "hi" | "ok" | "bad" };
export type Tile = { k: string; v: string; cls?: "" | "hi" | "ok" | "bad"; s?: string };
export type Place = { k: string; c: "y" | "n" | "z"; s: string };
export type Chapter = {
  n: number; roman: string; name: string; pill: [string, string]; phase: 1 | 2 | 3 | 4;
  star: { img: string; name: string; role: string; afterImg?: string; afterRole?: string };
  hook: string; concept: string;
  steps: Step[];
  edit?: Edit;
  run?: { kind: "wake" | "seed"; label: string; d: string };
  sources: [string, string][];                 // [label, repo path] — opens as text in a new tab
  expect: string;
  check: string;                               // the sentence under the ▢
  reads: (p: Progress | null) => Read[];       // the four readouts on the stage
  tiles: (p: Progress | null) => Tile[];       // the numbers in the panel
  places?: (p: Progress | null) => Place[];    // chapter II: where each fact lives
  next: (p: Progress | null) => string;        // the state-aware NEXT → cue
  wbGuide: (p: Progress | null) => { steps: string[]; see: string };   // "[line]" renders the copy button
};

export const SHOW = {
  title: "Long-Running Agents", em: "Agents", eyebrow: "MonsterTix · ADK 2 on Google Cloud",
  tag: "An agent that waits in line, survives being killed, and buys at 3am inside limits you set.",
  blurb: "Most ticketing sites put you in a queue. You start behind 14,000 people, the queue moves for forty minutes, and your turn comes at 3am. <b>An agent that waits, survives being killed, and buys inside limits you set</b> — six chapters, one page, a real agent behind it.",
  ethics: "Ticket bots are a real problem and real ticketing sites prohibit automation. This runs against a <b>mock venue in this same process</b>, buying <b>one</b> allotment for <b>yourself</b>, inside limits you set.",
  agent: "the agent", minutes: "~60 min",
};
export const ART = {
  cover: "/art/rook-hero.jpg", hero: "/art/hero.jpg",
  av: { rook: "/art/rook.jpg", sleeper: "/art/sleeper.jpg", clock: "/art/clock.jpg", boxoffice: "/art/boxoffice.jpg", sam: "/art/sam.jpg" },
};
/** the one sentence the clock sends, all lab long — lab/env.py has the same string */
export const LINE = "The presale just opened. Get us tickets to the Amsterdam show.";
export const PLAN = "Grab us two tickets the moment the presale opens. Keep checking.";
/** chapter III and IV's sentences — scripts/walk.py says the same ones */
export const WHICH = "The Saturday show, please.";
export const WHERE_AM_I = "Where am I in line?";
export const SEATS = "How much are the seats, and what's still available?";
export const BUY = "Buy the two section A seats.";
export const THEN_C = "Then section C, two seats.";
/** chapter V and VI's sentences — scripts/walk.py says the same ones */
export const GO = "go";
export const ASK = "Get us two tickets to the Amsterdam show.";
export const BUDGET_SENTENCE = "About a 100 for the cheap seats. 250 if they’re the good ones.";
export const YES = "Yes, that’s right.";
export const CLOSING = "Waking up was never the hard part.";

export const WHERE: Record<Where, string> = { page: "on the page", editor: "in the editor", workbench: "in the workbench", watch: "watch" };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** delete the “# ” in front of the one line that contains `marker` */
export const uncomment = (marker: string) => (src: string) =>
  src.replace(new RegExp(`^(\\s*)# (${escapeRe(marker)})`, "m"), "$1$2");
/** put the “# ” back */
export const recomment = (marker: string) => (src: string) =>
  src.replace(new RegExp(`^(\\s*)(${escapeRe(marker)})`, "m"), "$1# $2");
export const swapLine = (from: string, to: string) => (src: string) => src.replace(from, to);

const M = {
  recall: "recall, remember,",
  queue: "LongRunningFunctionTool(func=join_queue), check_queue,",
  fence: "before_tool_callback=refresh_before_purchase,",
  graphWas: "root_agent = buyer_agent", graphNow: "root_agent = nightly",
  budget: "NIGHT.insert(0, agree_budget)",
};

// ── helpers over receipts ─────────────────────────────────────────────────────
const clockWakes = (p: Progress | null) => (p?.wakes || []).filter((w) => w.source === "clock");
const stageWakes = (p: Progress | null) => (p?.wakes || []).filter((w) => w.source === "stage");
const lastClock = (p: Progress | null) => clockWakes(p).slice(-1)[0] || null;
/** chapter I's run: the first clock wake made without recall (as shipped), else the latest */
const clockI = (p: Progress | null) => clockWakes(p).find((w) => !w.tools.includes("recall")) || lastClock(p);
const order = (w: Wake | null | undefined) => (w?.orders_new || [])[0] || null;
const money = (n: number | undefined | null) => (n === undefined || n === null ? "" : `$${Math.round(n)}`);
const orderLine = (w: Wake | null | undefined) => { const o = order(w); return o ? `${(o.weekday || "?").slice(0, 3).toLowerCase()} · ${o.seats}× ${o.section} · ${money(o.total)}` : ""; };
const weekday = (w: Wake | null | undefined) => order(w)?.weekday || null;
const factsN = (p: Progress | null) => p?.code?.memory_facts ?? 5;
const ordersRead = (p: Progress | null): Read => { const v = p?.venue; const o = v?.orders?.slice(-1)[0]; return { k: "orders", v: String(v?.order_count ?? 0), s: o ? `${(o.weekday || "?").slice(0, 3).toLowerCase()} · ${o.seats}× ${o.section} · ${money(o.total)}` : "box office", cls: "" }; };
const queueRead = (p: Progress | null): Read => { const q = p?.venue?.queue?.[0]; return q ? { k: "queue", v: `#${q.position.toLocaleString()}`, s: q.ready ? "at the front" : q.ticket, cls: "hi" } : { k: "queue", v: "—", s: p?.code?.queue ? "no ticket yet" : "no queue tool", cls: "hi" }; };
const lastStage = (p: Progress | null) => stageWakes(p).slice(-1)[0] || null;
const joinOf = (w: Wake | null | undefined) => (w?.db?.responses || []).filter((r) => r.tool === "join_queue").slice(-1)[0] || null;
/** the newest stage run whose session holds a queue ticket (chapter III, before or after the kill) */
const lastJoined = (p: Progress | null) => stageWakes(p).filter((w) => joinOf(w)).slice(-1)[0] || null;
const pos = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `#${n.toLocaleString()}`);

export const CHAPTERS: Chapter[] = [
  { n: 1, roman: "I", name: "the clock", pill: ["read", "PRESS ONE"], phase: 1,
    star: { img: "/art/lamb.jpg", name: "the cloud", role: "wakes it at 3am" },
    hook: "You told it to buy the moment the presale opens. Whatever it answered — a promise, or “I can’t keep checking” — nothing happened. Why?",
    concept: "<code>instruction=</code> is a string handed to the model <b>when somebody sends a message</b>. Nothing reads it between turns. Being awake needs two halves: <b>the trigger</b> — an endpoint with a <code>Runner</code> behind it (here <code>/api/wake</code>) — and <b>the triggerer</b> — something with a clock that calls it. <code>monstertix/clock.py</code> is a <code>sleep</code> and a POST; in the finale it is Cloud Scheduler.",
    steps: [
      { where: "page", do: "say the plan on the stage, exactly as you would to a person", say: PLAN },
      { where: "watch", do: "hands down for a minute. The readout: 0 calls since your turn ended. Whatever it said — “I’ll keep checking” or “I can’t” — nothing in the process can run between messages" },
      { where: "page", do: "press 🐓 WAKE IT AT 3AM — the clock fires once, 10 s later, with nobody at the keyboard" },
      { where: "workbench", do: "open 🔬 workbench: the wake-… session is there, and you did not type it" },
    ],
    run: { kind: "wake", label: "🐓 wake it at 3am", d: "runs <code>monstertix/clock.py --in 10</code> as a job. It POSTs one sentence to <code>/api/wake</code> — the unattended door. The same sentence, every chapter." },
    sources: [["monstertix/clock.py · the triggerer", "monstertix/clock.py"], ["monstertix/handlers.py · wake()", "monstertix/handlers.py"], ["lab/runner.py · /api/say vs /api/wake", "lab/runner.py"], ["lab/jobs.py · the wake job", "lab/jobs.py"]],
    expect: "Nothing, for a full minute. Then one run with your hands off the keyboard: it searches the tour on its own — and either asks which show, into the dark, or buys one you never chose.",
    check: "a wake-… session created by the clock, with at least one tool call",
    reads: (p) => { const w = clockI(p); return [queueRead(p), ordersRead(p),
      { k: "calls", v: w ? String(w.calls) : "0", s: w ? "while you slept" : stageWakes(p).length ? "since your turn ended" : "nothing has run", cls: w && w.calls ? "ok" : stageWakes(p).length ? "bad" : "" },
      { k: "the agent", v: w ? "woke" : stageWakes(p).length ? "awake" : "asleep", s: w ? `3:00 · the clock · ${w.elapsed}s` : stageWakes(p).length ? "listening, doing nothing" : "nobody has spoken", cls: "" }]; },
    tiles: (p) => { const w = clockI(p); const s = stageWakes(p).slice(-1)[0];
      if (!w) return s ? [{ k: "calls after the turn ended", v: "0", cls: "bad", s: s.reply.toLowerCase().includes("can't") || s.reply.toLowerCase().includes("cannot") ? "It told you it cannot keep checking — and it was right. No code runs between messages." : "It said it would check. Nothing can check — no code runs between messages." }] : [];
      return [{ k: "calls while you slept", v: String(w.calls), cls: w.calls ? "ok" : "bad", s: w.tools.length ? w.tools.join(" · ") : "no tool call — read the reply" },
        { k: "who typed", v: "nobody", cls: "hi", s: `a sleep and an HTTP request · session ${w.session_id}` },
        ...(order(w) ? [{ k: "the 3am order", v: `${weekday(w)} · ${order(w)!.seats}× ${order(w)!.section}`, cls: "hi" as const, s: `${money(order(w)!.total)} · you never said which day` }] : [{ k: "the 3am reply", v: "a question", cls: "bad" as const, s: "“which show?” — asked into the dark, nobody there to answer" }])]; },
    next: (p) => { const w = clockI(p); const s = stageWakes(p).length;
      if (!s && !w) return "say the plan on the stage, then hands down for a minute — watch the calls readout stay at 0";
      if (!w) return "press 🐓 WAKE IT AT 3AM — the clock fires once, 10 s later, with nobody at the keyboard";
      if (!p?.lit?.["1"]) return "the clock woke it, but it made no tool call — read its reply on the stage, then 🐓 again";
      const d = weekday(w); return `✓ stub I torn. It ran without you${d ? ` — and it bought a ${d}` : w.awaiting || !order(w) ? " — and asked which show, into the dark" : ""}. Chapter II: the answer was in a file it never read.`; },
    wbGuide: (p) => { const w = clockI(p); return { steps: [`Sessions (left rail): find <b>${w ? w.session_id : "wake-…"}</b> — the clock made it, not you`, "open its events: ⚡ search_events → ⚡ get_seatmap → ⚡ purchase (or whatever it chose — the stage lists the same names)", "nothing in it was typed by a person"], see: "the same session the stage showed, read from lab.db — which is what tears stub I." }; } },

  { n: 2, roman: "II", name: "where a fact lives", pill: ["edit", "EDIT ONE"], phase: 1,
    star: { img: "/art/sleeper.jpg", name: "you", role: "said it last week", afterImg: "/art/sleeper-awake.jpg", afterRole: "awake · it read what you said last week" },
    hook: "It woke up, found two Amsterdam shows, and asked you which one — at 3am, into the dark. Or it guessed the Tuesday. Sam can’t do weeknights. You said so last week. Where did that go?",
    concept: "A fact can live in four places, and each lasts a different time: <code>temp:</code> (one invocation, stripped on the way to disk) · <b>session state</b> (this booking) · <code>user:</code> (every session this person has) · a <b>memory file</b> (survives deleting the database). <code>recall()</code> reads that file through ADK’s <code>BaseMemoryService</code>. The conversation itself is the worst place: every three turns ADK replaces it with a <b>paraphrase</b> you never wrote.",
    steps: [
      { where: "editor", do: "delete the “# ” on the red line — the agent gets recall and remember" },
      { where: "page", do: "press 🐓 again. Same sentence, same clock" },
      { where: "watch", do: "the stage: ⚡ recall before anything else, then a Saturday" },
      { where: "workbench", do: "State tab · Artifacts tab · the two-days-ago session — the drawer says what to look for" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.recall}`, afterMarker: M.recall, change: [`# ${M.recall}`, M.recall], fix: uncomment(M.recall), afterHint: "lands on the next wake — the clock, the stage and adk web all re-read the file" },
    run: { kind: "wake", label: "🐓 wake it at 3am", d: "the same clock, the same sentence. With the line in, the first call is <code>recall</code>." },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/memory.py · MarkdownMemoryService", "agent/concert/memory.py"], ["agent/concert/tools.py · note_companion · get_seatmap", "agent/concert/tools.py"], ["memory/userx.md", "memory/userx.md"], ["lab/progress.py · what tears a stub", "lab/progress.py"]],
    expect: "Before: a question into the dark, or a Tuesday — and 0 of the 5 facts read. After: ⚡ recall is the first call, the order is the Saturday show (ms-ams-01) for two, and the file it read is one you can open.",
    check: "a wake whose events include recall, and whose order is the Saturday show",
    reads: (p) => { const w = lastClock(p); const got = w?.tools.includes("recall"); return [queueRead(p), ordersRead(p),
      { k: "facts it read", v: got ? String(w?.memory_facts ?? factsN(p)) : "0", s: `of ${factsN(p)} in memory/userx.md`, cls: got ? "ok" : w ? "bad" : "" },
      { k: "the agent", v: w ? "woke" : "asleep", s: got ? "recall first" : w ? "no recall" : "waiting for the clock", cls: "" }]; },
    tiles: (p) => { const b = p?.before, a = p?.after; const out: Tile[] = [];
      if (b) out.push({ k: "the 3am order · before", v: order(b) ? `${weekday(b)}` : "a question", cls: "bad", s: order(b) ? `${order(b)!.seats}× ${order(b)!.section} · ${money(order(b)!.total)} · cheaper, listed first, wrong for this person` : "“which show?” — into the dark, instead of reading what it knew" },
        { k: "facts it could read", v: `0 / ${factsN(p)}`, cls: "bad", s: "memory/userx.md was never opened" });
      if (a) out.push({ k: "the 3am order · after", v: `${weekday(a)} ×${order(a)!.seats}`, cls: "ok", s: `${order(a)!.section} · ${money(order(a)!.total)} · Sam’s rule, read from a file` },
        { k: "facts it could read", v: `${a.memory_facts ?? factsN(p)} / ${a.memory_facts ?? factsN(p)}`, cls: "ok", s: "recall() ran first" },
        ...(a.db?.compactions ? [{ k: "paraphrases", v: String(a.db.compactions), cls: "hi" as const, s: "compaction events in this session — summaries you never wrote" }] : []));
      return out; },
    places: (p) => { const w = p?.after || lastClock(p); const st = (w?.db?.state || {}) as Record<string, unknown>; const got = Boolean(w?.tools.includes("recall")); const art = w?.artifacts || [];
      return [{ k: "temp:seatmap", c: "z", s: "stripped at the end of the invocation — never reaches the database" },
        { k: Object.keys(st).filter((k) => !k.startsWith("user:")).length ? `${Object.keys(st).filter((k) => !k.startsWith("user:")).join(" · ")} · plain state` : "plain state", c: Object.keys(st).filter((k) => !k.startsWith("user:")).length ? "y" : "z", s: "this session only" },
        { k: "user:prefs", c: "user:prefs" in st ? "y" : "n", s: "user:prefs" in st ? JSON.stringify(st["user:prefs"]).slice(0, 60) : "empty — note_companion never ran" },
        { k: "memory/userx.md", c: got ? "y" : "n", s: got ? `read by recall() · ${w?.memory_facts ?? factsN(p)} facts` : `${factsN(p)} facts · unread` },
        { k: art.length ? art[0] : "artifacts/seatmap_….json", c: art.length ? "y" : "z", s: art.length ? "saved by get_seatmap, never in the prompt" : "appears when get_seatmap runs" }]; },
    next: (p) => { const r = p?.code?.recall;
      if (!r) return "delete the “# ” on the red line in the editor (or press “apply the edit for me”), then 🐓";
      if (!p?.lit?.["2"]) return "🐓 WAKE IT AT 3AM again — same sentence, same clock. recall is the first call, and the order is the Saturday show";
      return "✓ stub II torn. Saturday, for two, read from a file. Chapter III: the presale has a queue of 14,203 — and your laptop will sleep first."; },
    wbGuide: () => ({ steps: ["<b>State</b> tab (left icons): <code>user:prefs</code> is there if note_companion ran · <code>temp:seatmap</code> is not — stripped before the write", "<b>Artifacts</b> tab: <code>seatmap_ms-ams-01.json</code> — the seat map that never entered the prompt", "session dropdown → <b>two-days-ago</b> (▶ seed it from the panel first): the first turns are a grey summary block. Nothing you did put it there"], see: "three kinds of key side by side — plain, user:, and the one that is missing — and the paraphrase sitting where turns 1–3 used to be." }) },

  { n: 3, roman: "III", name: "the kill", pill: ["edit", "EDIT ONE"], phase: 2,
    star: { img: "/art/capy.jpg", name: "the dispatcher", role: "keeps your place in line" },
    hook: "The queue is 14,203 long. Your laptop will sleep before it reaches the front. What survives?",
    concept: "<code>join_queue</code> returns a <b>handle</b> to work that is not finished — a ticket and a position. Wrapped as a <code>LongRunningFunctionTool</code>, with <code>ResumabilityConfig</code> on the App, the run <b>parks</b> on that call: it says where it stands and stops — nothing loops, nothing holds a connection open. The ticket is in <b>session state</b>, and session state is in <code>lab.db</code>, not in the process. Kill the process. The next boot opens the same session; your next sentence is a new turn on it, and the agent checks the queue it is already in instead of joining again.",
    steps: [
      { where: "editor", do: "delete the “# ” — the agent gets join_queue (long-running) and check_queue" },
      { where: "page", do: "ask for the tickets — it joins the queue for the Saturday show and says the position", say: LINE },
      { where: "page", do: "press 💀 KILL THE PROCESS — the lights go out, the server really dies, and lab.sh brings it back as the next boot" },
      { where: "page", do: "ask where you are, in the same conversation", say: WHERE_AM_I },
      { where: "workbench", do: "the same session, after the reboot — the drawer shows the parked call and the one that followed" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.queue}`, afterMarker: M.queue, change: [`# ${M.queue}`, M.queue], fix: uncomment(M.queue), afterHint: "lands on your next message" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/tools.py · join_queue · check_queue", "agent/concert/tools.py"], ["lab/service.py · /api/kill + boot_id", "lab/service.py"], ["lab.sh · the keep-open loop", "lab.sh"], ["lab/progress.py · kill_receipt", "lab/progress.py"], ["runs/boots.json", "runs/boots.json"]],
    expect: "“Your position is 14,203”, then the lights go out. The next boot answers on the same ticket — one check_queue call, a lower number (the queue moves about 6 places a second at 1×: 14,168 in the walk) — with no second search and no second ticket.",
    check: "one queue_ticket, handed out by join_queue under one boot and read back by check_queue under another — and one ticket at the venue",
    reads: (p) => { const k = p?.kill; const w = lastJoined(p); const j = joinOf(w); const t = p?.venue?.tickets ?? 0; return [queueRead(p),
      { k: "boots", v: String(p?.boots ?? 1), s: p?.boot_id ? `this process · ${p.boot_id}` : "", cls: "hi" },
      { k: "tickets", v: String(t), s: "at the venue · one is the point", cls: t === 1 ? "ok" : t > 1 ? "bad" : "" },
      { k: "the agent", v: k ? "back" : j ? "parked" : "awake", s: k ? `same ticket · boot ${k.boots[1]}` : j ? `in line · ${j.ticket}` : p?.code?.queue ? "can wait" : "cannot wait", cls: "" }]; },
    tiles: (p) => { const k = p?.kill; const w = lastJoined(p); const j = joinOf(w);
      if (k) return [{ k: "the ticket", v: k.ticket, cls: "ok", s: `${pos(k.positions[0])} → ${pos(k.positions[1])} · handed out by boot ${k.boots[0]}, read back by boot ${k.boots[1]}` },
        { k: "boots it lived through", v: "2", cls: "hi", s: "the process died in between; lab.db did not" },
        { k: "tickets at the venue", v: String(k.tickets ?? "?"), cls: k.tickets === 1 ? "ok" : "bad", s: k.tickets === 1 ? "no second join_queue — it checked the queue it was already in" : "more than one — a second join_queue happened" }];
      if (j && w) return [{ k: "the ticket", v: j.ticket || "—", cls: "hi", s: `${pos(j.position)} · boot ${w.boot_id} · ${w.boot_id === p?.boot_id ? "now press 💀" : "that boot is gone — ask “Where am I in line?”"}` }];
      return []; },
    next: (p) => { const k = p?.kill; const w = lastJoined(p); const s = lastStage(p);
      if (!p?.code?.queue) return "delete the “# ” on the red line (or press “apply the edit for me”), then ask for the tickets on the stage";
      if (!w) return s && !s.tools.includes("join_queue") && /which/i.test(s.reply) ? "it asked which show instead of reading recall — say “The Saturday show, please.” and it joins the queue" : "ask for the tickets on the stage — it joins the queue and tells you the position";
      if (w.boot_id === p?.boot_id && !k) return `in line at ${pos(joinOf(w)?.position)} on boot ${w.boot_id}. Press 💀 KILL THE PROCESS, wait for the lights, then ask “Where am I in line?”`;
      if (!k) return `back as boot ${p?.boot_id}. Ask “Where am I in line?” in the same conversation — the ticket is in lab.db, not in the dead process`;
      if (!p?.lit?.["3"]) return `the ticket came back under two boots, but the venue holds ${k.tickets} tickets — RESET the venue, ↻ new conversation, and run the chapter once more`;
      return "✓ stub III torn. Same ticket, two boots, no second queue. Chapter IV: it is back from the wait holding a seat map — and the seats on it are gone."; },
    wbGuide: (p) => { const sid = p?.kill?.session_id || lastJoined(p)?.session_id || p?.stage?.session_id; return { steps: [`Sessions: <b>${sid || "web-…"}</b> is still here after the reboot — adk web reads the same lab.db`, "open the ⚡ <b>join_queue</b> event: its response is <code>status: waiting</code> and the ticket — a handle, not a result; the <b>State</b> tab holds <code>queue_ticket</code>", "the next ⚡ is <b>check_queue</b>, after the kill, on the same ticket — a new turn, no second join_queue"], see: "a conversation that does not know it was dead." }; } },

  { n: 4, roman: "IV", name: "old news", pill: ["edit", "EDIT ONE"], phase: 2,
    star: { img: "/art/boxoffice-hero.jpg", name: "the box office", role: "stamps the same order once" },
    hook: "It came back from the wait holding a seat map. Those seats sold twelve minutes in. Why did it buy anyway?",
    concept: "An agent that is <i>missing</i> a fact asks. An agent holding an <i>old</i> fact just acts — nothing is missing from its context, the wrong thing is present. The seat map it read while waiting is still in the <b>conversation</b>; its <code>temp:seatmap</code> copy died with that turn, which does not help. A <code>before_tool_callback</code> runs in the instant before <code>purchase</code>: it re-reads live inventory, and <b>returning a dict short-circuits the tool</b>, so the stale plan never reaches the venue. (The <code>Idempotency-Key</code> on every purchase is already in the shipped code; BREAK THE NEXT PURCHASE shows the venue returning the same order twice.)",
    steps: [
      { where: "editor", do: "delete the “# ” — the fence runs before every purchase" },
      { where: "page", do: "↻ new conversation, then ask for the tickets — it joins the queue", say: LINE },
      { where: "page", do: "ask about the seats while it waits — A 400 · B 900 · C 1200 become sentences in the conversation", say: SEATS },
      { where: "page", do: "press SELL THE GOOD SEATS, then SKIP THE WAIT" },
      { where: "page", do: "tell it to buy from what it remembers", say: BUY },
      { where: "page", do: "pick again — a fresh plan passes the fence", say: THEN_C },
      { where: "workbench", do: "open the purchase event — its response was written by fence.py, not the venue" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.fence}`, afterMarker: M.fence, change: [`# ${M.fence}`, M.fence], fix: uncomment(M.fence), afterHint: "lands on your next message" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/fence.py · refresh_before_purchase", "agent/concert/fence.py"], ["agent/concert/tools.py · purchase · Idempotency-Key", "agent/concert/tools.py"], ["venue/app.py · /purchase", "venue/app.py"], ["lab/progress.py · fence_receipt", "lab/progress.py"]],
    expect: "As shipped, with the seat map in the conversation: purchase reaches the venue, 409 sold_out comes back, no order, and it asks you to pick again (with no map in the conversation it reads one first, and nothing is stale). With the fence: the refusal is written by fence.py — reason stale_plan, actually 0 — before the venue hears anything; then “section C” goes through: 2× C, $190.",
    check: "a stale_plan refusal from fence.py, no 409 from the venue in that turn, and an order in another section",
    reads: (p) => { const a = p?.venue?.section_a?.find((e) => e.weekday === "Saturday"); return [queueRead(p), { k: "section A", v: a ? `${a.available} left` : "—", s: "saturday · amsterdam · live", cls: a && a.available === 0 ? "bad" : "" }, { k: "fence", v: p?.code?.fence ? "armed" : "off", s: p?.code?.fence ? "before every purchase" : "purchase goes straight through", cls: p?.code?.fence ? "ok" : "" }, ordersRead(p)]; },
    tiles: (p) => { const f = p?.fence; const out: Tile[] = [];
      if (f?.before) out.push({ k: "as shipped · who said no", v: "the venue · 409", cls: "bad", s: `sold_out — after purchase reached it. ${f.before.order ? `then ${f.before.order.section} · ${money(f.before.order.total)}` : "no order; it handed the re-read back to you"}` });
      if (f?.after) out.push({ k: "with the fence · who said no", v: "fence.py", cls: "ok", s: `reason stale_plan · actually ${f.after.actual ?? 0} · believed ${f.after.believed ?? "— (the old map lived in the conversation; temp: was gone)"}` },
        { k: "venue calls in that turn", v: f.after.venue_409 ? "1" : "0", cls: f.after.venue_409 ? "bad" : "ok", s: f.after.venue_409 ? "the venue still answered 409" : "the attempt never left the process" },
        ...(f.after.order ? [{ k: "the order", v: `${f.after.order.section} · ${money(f.after.order.total)}`, cls: "hi" as const, s: "a fresh plan — the live map agreed, so the fence let it through" }] : []));
      return out; },
    next: (p) => { const f = p?.fence; const on = p?.code?.fence; const s = lastStage(p);
      const noMap = s && s.tools.includes("join_queue") && !s.tools.includes("get_seatmap") && !s.tools.includes("purchase");
      if (noMap) return "it is in the queue but has not read a seat map yet — ask about the seats again until it lists A 400 · B 900 · C 1200. With nothing old in the conversation there is nothing to act on";
      if (!on && !f?.before) return "see it fail first, as shipped: ask for the tickets → ask about the seats → SELL THE GOOD SEATS → SKIP THE WAIT → “Buy the two section A seats.” — the venue itself answers 409";
      if (!on) return "that was the venue saying no, after the attempt reached it. Now delete the “# ” on the red line, RESET the venue, and ↻ new conversation";
      if (!f?.after) return "↻ new conversation → ask for the tickets → ask about the seats → SELL THE GOOD SEATS → SKIP THE WAIT → “Buy the two section A seats.” — this time your code answers first";
      if (!p?.lit?.["4"]) return f.after.venue_409 ? "the venue still answered a 409 in that turn — RESET, ↻ new conversation, and run the five sentences again" : "refused before the venue heard anything. Say “Then section C, two seats.” — a fresh plan goes through";
      return "✓ stub IV torn. Refused by your code, before the venue. Chapter V: at 3am, who decides the order of things?"; },
    wbGuide: (p) => ({ steps: [`open <b>${p?.fence?.after?.session_id || "your session"}</b> and find the ⚡ <b>purchase</b> event for section A`, "its response reads <code>reason: stale_plan · actually_available: 0</code> — a dict returned by the callback. The venue’s feed shows <i>calling purchase</i> with no order behind it", "the next ⚡ <b>purchase</b> (section C) carries the venue’s own answer: an order id"], see: "the attempt, the refusal written by your code, and the purchase that passed — in a row." }) },

  { n: 5, roman: "V", name: "the graph", pill: ["edit", "SWAP ONE"], phase: 3,
    star: { img: "/art/rook.jpg", name: "the agent", role: "the last node of the graph" },
    hook: "At 3am, who decides the order of things? The model — nearly every time. Say “go” to it and watch which tools it picks.",
    concept: "Some steps have no judgement in them: take exactly one queue ticket, ask whether it is your turn, write the brief. A <b>Workflow</b> makes those <b>function nodes</b> (the same every night) and keeps <b>agent nodes</b> only where a decision lives (<code>pick_show</code>; your agent, last, when section A is gone). The wait is a node returning <code>RequestInput</code>: the run <b>parks</b>, the process may exit, and every wake-up re-enters the graph from <code>START</code> — <code>rerun_on_resume=False</code> on <code>pick_show</code> and <code>queue_up</code> is why it does not pick again or take a second ticket. On this page the clock’s door answers the parked run: a wake-up with no session named goes to the stage’s interrupt, not to a new session.",
    steps: [
      { where: "page", do: "as shipped, say “go” to the conversation — the model recalls, searches and asks you back. It chose that order", say: GO },
      { where: "editor", do: "swap the one line — the root becomes the graph; your agent is its last node" },
      { where: "page", do: "↻ new conversation, then “go” — open → pick_show → queue_up → check_front run in order and park at #14,203", say: GO },
      { where: "page", do: "press 🐓 — the clock’s sentence answers the pause. Only check_front runs; still one ticket" },
      { where: "page", do: "SKIP THE WAIT, then 🐓 once more — at the front: brief, then your agent buys" },
      { where: "workbench", do: "the graph view: nodes turn green; the adk_request_input event has its own Enter-your-response box" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "root_agent", marker: M.graphWas, afterMarker: M.graphNow, change: [M.graphWas, M.graphNow], fix: swapLine(M.graphWas, M.graphNow), swap: true, afterHint: "lands on your next message — the stage runs the graph" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/nightly.py · the graph", "agent/concert/nightly.py"], ["monstertix/handlers.py · pending_interrupt", "monstertix/handlers.py"], ["lab/runner.py · the clock answers the stage", "lab/runner.py"], ["lab/progress.py · graph_receipt", "lab/progress.py"]],
    expect: "Before: “go” is a chat turn — recall, search_events, then a question back (which show?). After: “go” runs four nodes and parks at #14,203 with one ticket at the venue; 🐓 answers the pause in under a second — check_front alone runs, no model call — and the venue still holds one ticket; after SKIP the third entry runs brief and your agent: 2× A, $420, inside the $250 a seat nightly.py names.",
    check: "a run of the graph parked on an adk_request_input, two clock wake-ups that answered it, one ticket at the venue at every park, one order",
    reads: (p) => { const g = p?.graph?.after; const parked = g && g.parks > 0 && !g.order; return [queueRead(p),
      { k: "wake-ups", v: String(g?.wakeups ?? 0), s: g?.wakeups ? "answered the pause" : "the clock", cls: "hi" },
      { k: "tickets", v: String(p?.venue?.tickets ?? 0), s: g?.one_ticket ? "one at every park" : "at the venue", cls: g?.one_ticket ? "ok" : (p?.venue?.tickets ?? 0) > 1 ? "bad" : "" },
      { k: "the agent", v: !p?.code?.graph ? "chatting" : g?.order ? "bought" : parked ? "parked" : "a graph", s: !p?.code?.graph ? "the model orders the steps" : g?.order ? `${g.entries} entries · 1 ticket` : parked ? `check_front · ${pos(g?.positions.slice(-1)[0])}` : "nightly · 6 nodes", cls: "" }]; },
    tiles: (p) => { const b = p?.graph?.before, g = p?.graph?.after; const out: Tile[] = [];
      if (b) out.push({ k: "as shipped · “go” to a conversation", v: `${b.tools.length} calls`, cls: "bad", s: `${b.tools.join(" · ") || "no tool"} — then ${/\?\s*$/.test(b.reply) ? "a question back" : "a reply"}. The model chose the order; no ticket` });
      if (g) { const ran = g.nodes.filter((n) => n !== "concert").join(" → ") + (g.nodes.includes("concert") ? " → your agent" : "");
        out.push({ k: "the graph · nodes that ran", v: `${g.nodes.length} nodes`, cls: "ok", s: ran },
          { k: "entries into the graph", v: String(g.entries), cls: "hi", s: `“go” + ${g.answers} answers to the pause · pick_show and queue_up ran once (rerun_on_resume=False)` },
          { k: "tickets at the venue at each park", v: g.tickets.map((t) => String(t ?? "?")).join(" · ") || "—", cls: g.one_ticket ? "ok" : "bad", s: g.one_ticket ? `parked at ${g.positions.map(pos).join(" → ")} — one ticket, every time` : "more than one — a wake-up started a new run instead of answering" },
          ...(g.order ? [{ k: "the order", v: `${g.order.section} · ${money(g.order.total)}`, cls: "hi" as const, s: `${(g.order.weekday || "").toLowerCase()} · ${g.order.seats}× · bought by your agent, the last node, at the front` }] : [])); }
      return out; },
    next: (p) => { const on = p?.code?.graph; const b = p?.graph?.before, g = p?.graph?.after; const s = lastStage(p);
      if (!on && !b) return "say “go” on the stage as shipped — a conversation: watch which tools the model picks, and that it asks you back";
      if (!on) return "that was the model choosing the order. Swap the line in the editor (buyer_agent → nightly), then ↻ new conversation and say “go” again";
      if (!g || (s && s.kind !== "Workflow")) return "↻ new conversation, then say “go” — the graph runs open → pick_show → queue_up → check_front and parks";
      if (g.parks && !g.wakeups && !g.order) return `parked at ${pos(g.positions.slice(-1)[0])} on one ticket. Press 🐓 — the clock’s sentence answers the interrupt, and only check_front runs`;
      if (g.wakeups === 1 && !g.order) return "one wake-up answered, still one ticket, still in line. SKIP THE WAIT, then 🐓 once more";
      if (!g.order) return "at the front but no order yet — read the reply on the stage, then 🐓 again";
      if (!p?.lit?.["5"]) return g.wakeups < 2 ? "it bought — but the clock answered the pause only once. RESET, ↻ new conversation, “go”, 🐓, SKIP, 🐓" : `it bought, but the venue held ${g.tickets.join(", ")} tickets at the parks — RESET, ↻ new conversation and run the chapter once more`;
      return "✓ stub V torn. Three entries, one ticket, one order. Chapter VI: it spent “up to $250 per seat” because nightly.py says so — who agreed to that?"; },
    wbGuide: (p) => { const sid = p?.graph?.after?.session_id || p?.stage?.session_id; return { steps: ["reload the drawer — the dropdown still says <b>concert</b>, but the left panel now draws a <b>graph</b>", `Sessions: open <b>${sid || "your session"}</b> — open_the_night → pick_show → queue_up → check_front are green and the run stopped`, "the last event is ⚡ <b>adk_request_input</b> with an <b>Enter your response…</b> box of its own. ⚠ That box answers the pause; the chat box at the bottom starts a NEW run and takes a second ticket. (The stage’s talk box and the clock’s door already answer the pause for you.)", "after 🐓: the edges into pick_show, queue_up and check_front carry a 2× / 3× badge — walked again, not run again"], see: "a graph parked on one interrupt, edges counted per wake-up, and one queue ticket at the venue — rerun_on_resume=False doing real work." }; } },

  { n: 6, roman: "VI", name: "the budget", pill: ["edit", "EDIT ONE"], phase: 3,
    star: { img: "/art/sam-hero.jpg", name: "Sam", role: "the second ticket · inside what you said" },
    hook: "It can buy on its own now. Who said how much? Chapter V spent “up to $250 per seat” — a string in nightly.py that nobody agreed to.",
    concept: "The same interrupt that waits for a venue can wait for a <b>person</b>. <code>agree_budget</code> returns a <code>RequestInput</code> aimed at you, reads your answer back, and stores <b>the sentence</b> — not a schema — in <b>session state</b> (no prefix: a limit agreed for this booking, not forever). Three things make it work: <code>rerun_on_resume=True</code>, a <b>stable</b> <code>interrupt_id</code> (<code>budget:ask</code>, <code>budget:confirm</code>), and reading the answer from <code>ctx.resume_inputs</code>. And <code>someone_is_there()</code> is a fact about the <b>request</b>: <code>/api/say</code> marks a person present for that request only; <code>/api/wake</code> does not, so at 3am the node takes the standing budget instead of stopping on a question nobody will answer.",
    steps: [
      { where: "editor", do: "delete the “# ” — agree_budget becomes the first node" },
      { where: "page", do: "↻ new conversation, then ask — the run stops before any tool runs and asks what you will spend", say: ASK },
      { where: "page", do: "answer the way people answer, in the same box — it reads your sentence back", say: BUDGET_SENTENCE },
      { where: "page", do: "confirm — the sentence lands in session state and four nodes run off one “yes”", say: YES },
      { where: "page", do: "SKIP THE WAIT, then 🐓 — nobody is there, and it does not ask again" },
      { where: "workbench", do: "State tab: budget — your sentence, verbatim, no prefix. New Session → it is gone, and the graph asks again" },
    ],
    edit: { file: "agent/concert/nightly.py", symbol: "NIGHT", marker: `# ${M.budget}`, afterMarker: M.budget, change: [`# ${M.budget}`, M.budget], fix: uncomment(M.budget), afterHint: "lands on your next message — in a new conversation" },
    sources: [["agent/concert/nightly.py · the line", "agent/concert/nightly.py"], ["agent/concert/nightly.py · agree_budget", "agent/concert/nightly.py"], ["agent/concert/budget.py · someone_is_there()", "agent/concert/budget.py"], ["lab/runner.py · mark_attended on /api/say", "lab/runner.py"], ["lab/progress.py · budget_receipt", "lab/progress.py"]],
    expect: "Before (chapter V’s run): “[open] Budget: up to $250 per seat” — spent, nobody asked. After: two questions before any tool runs (what will you spend? · So: … have I got that right?), your sentence in state verbatim, then the same four nodes park at #14,203. The 3am wake-up finds the budget already agreed and buys inside it without asking — 2× A at $210 a seat against “250 if they’re the good ones”. A 🐓 with nothing parked opens a fresh session, finds nobody there, and uses the default rather than stopping.",
    check: "budget in session state equal to a sentence you typed, budget:ask and budget:confirm answered, an order, and a clock wake-up in that session that asked nothing",
    reads: (p) => { const a = p?.budget?.after; const on = p?.code?.budget; return [
      { k: "asked you", v: String(a?.questions ?? 0), s: "questions before spending", cls: a?.questions ? "ok" : on ? "hi" : "bad" },
      { k: "budget", v: a?.sentence ? "yours" : "default", s: a?.sentence ? a.sentence : "up to $250 per seat · nightly.py", cls: a?.sentence ? "ok" : "" },
      ordersRead(p),
      { k: "the agent", v: a?.order ? "bought" : a?.agreed ? "parked" : a?.asked ? "asking" : on ? "will ask" : "spends", s: a?.order ? `${money(a.order.unit_price)} a seat · inside` : a?.agreed ? "budget agreed · in line" : a?.asked ? "waiting for your answer" : on ? "agree_budget first" : "nobody agreed anything", cls: "" }]; },
    tiles: (p) => { const b = p?.budget?.before, a = p?.budget?.after, pr = p?.budget?.probe; const out: Tile[] = [];
      if (b) out.push({ k: "as shipped · the [open] line", v: "nobody asked", cls: "bad", s: `“${b.open}” — a constant in nightly.py${b.order ? `, then ${b.order.seats}× ${b.order.section} · ${money(b.order.total)}` : ""}` });
      if (a) { out.push({ k: "questions before spending", v: String(a.questions), cls: "ok", s: "budget:ask · budget:confirm — both stopped the run, both answered in the same box" });
        if (a.sentence) out.push({ k: "the sentence · session state, no prefix", v: `“${a.sentence}”`, cls: a.typed ? "ok" : "bad", s: a.typed ? "verbatim — you typed it; a new session starts with none" : "not a sentence you typed on the stage" });
        if (a.order) out.push({ k: "seat price vs your sentence", v: `${money(a.order.unit_price)} a seat`, cls: "hi", s: `${a.order.seats}× ${a.order.section} · ${money(a.order.total)} — against “${a.sentence}”. The model’s judgement, not a parsed number` });
        out.push({ k: "the 3am wake-up", v: a.unattended ? "did not ask" : "—", cls: a.unattended ? "ok" : "bad", s: a.unattended ? "agree_budget re-ran (rerun_on_resume=True), found your sentence in state, and let the night run" : "no unattended wake-up in this session yet — SKIP THE WAIT, then 🐓" }); }
      if (pr) out.push({ k: "a fresh 3am session · someone_is_there()", v: "false", cls: "hi", s: `“[agree_budget] ${pr.text}” — nothing agreed, nobody to ask: the default, not a question` });
      return out; },
    next: (p) => { const on = p?.code?.budget; const a = p?.budget?.after; const s = lastStage(p);
      if (!p?.code?.graph) return "chapter V first: the root must be the graph (root_agent = nightly) before agree_budget can be its first node";
      if (!on) return "delete the “# ” on the red line (or press “apply the edit for me”), then ↻ new conversation and ask for the tickets";
      if (!a || (s && s.kind === "Workflow" && !s.turn_interrupts?.length && !a.asked)) return "↻ new conversation, then ask for the tickets — the run stops on budget:ask before any tool runs";
      if (a.asked && !a.confirmed) return "it asked. Answer in the same box — your words, however you like — and it reads them back";
      if (a.confirmed && !a.agreed) return "it read your sentence back. Say “Yes, that’s right.” — the sentence lands in state and four nodes run";
      if (a.agreed && !a.unattended && !a.order) return `agreed: “${a.sentence}”. Parked at check_front on one ticket. SKIP THE WAIT, then 🐓 — nobody there, and it must not ask again`;
      if (!a.order) return "the clock answered the pause and did not ask — but no order yet. Read the reply on the stage; 🐓 again if it is still in line";
      if (!p?.lit?.["6"]) return !a.typed ? "the budget in state is not a sentence you typed on the stage — ↻ new conversation and answer in the talk box, not in adk web" : "the order is in, but the clock never answered this session’s pause — RESET, ↻ new conversation, and run the five sentences again";
      return "✓ stub VI torn. Two questions, your sentence, one order inside it, and a 3am wake-up that asked nothing. Chapter VII: breakfast."; },
    wbGuide: (p) => { const sid = p?.budget?.after?.session_id || p?.stage?.session_id; return { steps: [`Sessions: open <b>${sid || "your session"}</b> — the first event is ⚡ <b>adk_request_input</b> with id <code>budget:ask</code>, before any tool`, "the next ⚡ adk_request_input is <code>budget:confirm</code> — the read-back. Both were answered from the stage’s box; in adk web you would answer in <b>each event’s own box</b>, never the chat box", "<b>State</b> tab: <code>budget</code> — your sentence, no prefix; <code>request</code> — everything you typed, joined", "<b>New Session</b> (top left), type the ask again: the graph stops on budget:ask once more — the budget died with the conversation it was agreed in"], see: "a limit in a person’s own words, living exactly as long as the conversation — and asked for again the moment there is a new one." }; } },

  { n: 7, roman: "VII", name: "breakfast", pill: ["gold", "THE MESSAGE"], phase: 3,
    star: { img: "/art/clock-hero.jpg", name: "the clock", role: "7:30 · wake up" },
    hook: "Six stubs. What did it do while you slept?",
    concept: "Every stub on this page is torn by a <b>receipt</b>: a session the clock made, a recall call, one ticket under two boots, a refusal written by your code, one ticket under two wake-ups, a sentence in state. The page never ticks a checklist. The agent, its tools, its callbacks and the budget are what you would deploy — two URIs and one environment variable change, and nothing else does.",
    steps: [{ where: "page", do: "read the message on the phone" }],
    sources: [["lab/progress.py · what tears a stub", "lab/progress.py"], ["scripts/walk.py · the headless learner", "scripts/walk.py"], ["lab/runner.py · the two doors", "lab/runner.py"]],
    expect: "", check: "six stubs · the breakfast message",
    reads: (p) => [{ k: "stubs torn", v: `${["1", "2", "3", "4", "5", "6"].filter((k) => p?.lit?.[k]).length} / 6`, s: "receipts, not clicks", cls: "hi" }, ordersRead(p), { k: "boots", v: String(p?.boots ?? 1), s: "", cls: "" }, { k: "wake-ups", v: String(p?.clock_runs ?? 0), s: "the clock", cls: "" }],
    tiles: () => [],
    next: (p) => p?.lit?.["7"] ? "✓ six stubs. 📱 the breakfast message." : `${["1", "2", "3", "4", "5", "6"].filter((k) => !p?.lit?.[k]).map((k) => CHAPTERS[Number(k) - 1].roman).join(" · ")} still untorn — the phone shows what is in so far`,
    wbGuide: () => ({ steps: ["Sessions: the whole night as ADK recorded it — yours and the clock’s, in one list"], see: "every run, in order." }) },
];
