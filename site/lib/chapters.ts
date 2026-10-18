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
 *  The copy below says that. III–VI carry the design's copy and tear in phases 2–3. */

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
const phaseNote = (phase: number, what: string) => `this chapter is wired in phase ${phase} — the edit saves and the agent runs with it, but ${what} is not read yet, so the stub cannot tear here today.`;

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
    concept: "<code>join_queue</code> returns a <b>handle</b> to work that is not finished — a ticket and a position. Wrapped as a <code>LongRunningFunctionTool</code>, the run may <b>park</b> on it; <code>ResumabilityConfig</code> writes where the run had got to into the session store; the process can die. A new process reads <code>lab.db</code>, not memory — so it picks up at that tool, and does <b>not</b> take a second ticket.",
    steps: [
      { where: "editor", do: "delete the “# ” — the agent gets join_queue (long-running) and check_queue" },
      { where: "page", do: "ask for the tickets", say: LINE },
      { where: "page", do: "press 💀 KILL THE PROCESS. The lamp goes dark, the server really dies, and comes back as the next boot" },
      { where: "page", do: "ask where you are", say: "Where am I in line?" },
      { where: "workbench", do: "the same session, after the reboot — the drawer shows the parked call" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.queue}`, afterMarker: M.queue, change: [`# ${M.queue}`, M.queue], fix: uncomment(M.queue), afterHint: "lands on your next message" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/tools.py · join_queue · check_queue", "agent/concert/tools.py"], ["lab/service.py · /api/kill + boot_id", "lab/service.py"], ["lab.sh · the keep-open loop", "lab.sh"], ["runs/boots.json", "runs/boots.json"]],
    expect: "Position 14,203, then the lamp goes dark. The next boot answers on the same ticket: no second search, no second queue ticket, no replay.",
    check: "one queue_ticket in state, seen under two boot_ids — and one ticket at the venue",
    reads: (p) => [queueRead(p), { k: "boots", v: String(p?.boots ?? 1), s: p?.boot_id ? `this process · ${p.boot_id}` : "", cls: "hi" }, { k: "tickets", v: String(p?.venue?.tickets ?? 0), s: "venue", cls: "" }, { k: "the agent", v: p?.venue?.queue?.length ? "parked" : "awake", s: p?.venue?.queue?.length ? "in line" : p?.code?.queue ? "can wait" : "cannot wait", cls: "" }],
    tiles: (p) => [{ k: "boots", v: String(p?.boots ?? 1), cls: "hi", s: (p?.boots ?? 1) > 1 ? "killed and back" : "nothing to survive yet" }, { k: "tickets at the venue", v: String(p?.venue?.tickets ?? 0), cls: p?.venue?.tickets === 1 ? "ok" : "", s: "one is the point" }],
    next: (p) => !p?.code?.queue ? "delete the “# ” on the red line, then ask for the tickets on the stage" : phaseNote(2, "the ticket under two boots"),
    wbGuide: () => ({ steps: ["Sessions: the one you were using is still here after the reboot", "open the ⚡ <b>join_queue</b> event: the response carries <code>status: waiting</code> and the ticket — a handle, not a result", "the next ⚡ is <b>check_queue</b>, after the kill, on the same ticket"], see: "a conversation that does not know it was dead." }) },

  { n: 4, roman: "IV", name: "old news", pill: ["edit", "EDIT ONE"], phase: 2,
    star: { img: "/art/boxoffice-hero.jpg", name: "the box office", role: "stamps the same order once" },
    hook: "It came back from the wait holding a seat map. Those seats sold twelve minutes in. Why did it buy anyway?",
    concept: "An agent that is <i>missing</i> a fact asks. An agent holding an <i>old</i> fact just acts — nothing is missing from its context, the wrong thing is present. A <code>before_tool_callback</code> runs in the instant before <code>purchase</code>: it re-reads live inventory, and <b>returning a dict short-circuits the tool</b>, so the stale plan never reaches the venue. (The <code>Idempotency-Key</code> on every purchase is already in the shipped code; BREAK THE NEXT PURCHASE on the stage shows the venue returning the same order twice.)",
    steps: [
      { where: "editor", do: "delete the “# ” — the fence runs before every purchase" },
      { where: "page", do: "press SELL THE GOOD SEATS, then SKIP THE WAIT" },
      { where: "page", do: "tell it to buy from what it remembers", say: "Buy the two section A seats." },
      { where: "watch", do: "the stage: the fence’s refusal arrives before any call to the venue" },
      { where: "workbench", do: "open the purchase event — its response was written by fence.py, not the venue" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.fence}`, afterMarker: M.fence, change: [`# ${M.fence}`, M.fence], fix: uncomment(M.fence), afterHint: "lands on your next message" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/fence.py · refresh_before_purchase", "agent/concert/fence.py"], ["agent/concert/tools.py · purchase · Idempotency-Key", "agent/concert/tools.py"], ["venue/app.py · /purchase", "venue/app.py"]],
    expect: "Before: ⚡ purchase → the venue answers 409 sold_out, and only then a re-read. After: the fence answers first — believed 400, actually 0 — and the venue is never called with the stale plan.",
    check: "a stale_plan refusal from fence.py in the log, no 409 from the venue for that session, and an order in another section",
    reads: (p) => { const a = p?.venue?.section_a?.find((e) => e.weekday === "Saturday"); return [queueRead(p), { k: "section A", v: a ? `${a.available} left` : "—", s: "saturday · amsterdam", cls: a && a.available === 0 ? "bad" : "" }, { k: "fence", v: p?.code?.fence ? "armed" : "off", s: p?.code?.fence ? "before every purchase" : "purchase goes straight through", cls: p?.code?.fence ? "ok" : "" }, ordersRead(p)]; },
    tiles: () => [],
    next: (p) => !p?.code?.fence ? "delete the “# ” on the red line, then SELL THE GOOD SEATS → SKIP THE WAIT → say “Buy the two section A seats.”" : phaseNote(2, "the fence’s refusal"),
    wbGuide: () => ({ steps: ["open the ⚡ <b>purchase</b> event", "its ✓ response reads <code>reason: stale_plan · believed_available: 400 · actually_available: 0</code> — a dict returned by the callback", "the next ⚡ is <b>get_seatmap</b>, unprompted; then purchase again, another section"], see: "the attempt, the refusal written by your code, and the retry — three events in a row." }) },

  { n: 5, roman: "V", name: "the graph", pill: ["edit", "SWAP ONE"], phase: 3,
    star: { img: "/art/rook.jpg", name: "the agent", role: "the last node of the graph" },
    hook: "At 3am, who decides the order of things? The model — nearly every time.",
    concept: "Some steps have no judgement in them: take exactly one queue ticket, ask whether it is your turn, write the brief. A <b>Workflow</b> makes those <b>function nodes</b> (the same every night) and keeps <b>agent nodes</b> only where a decision lives (which show; what to do when section A is gone). The wait is a node returning <code>RequestInput</code>: the run <b>parks</b>, the process may exit, and every wake-up re-enters the graph — <code>rerun_on_resume=False</code> is why it does not take a second ticket.",
    steps: [
      { where: "editor", do: "swap the one line — the root becomes the graph; your agent is its last node" },
      { where: "page", do: "start the night", say: "go" },
      { where: "watch", do: "parked at check_front, #14,203. Nothing is running" },
      { where: "page", do: "press 🐓 — the clock answers the pause. Still one ticket" },
      { where: "page", do: "SKIP THE WAIT, then 🐓 once more" },
      { where: "workbench", do: "the graph view: nodes turn green; find the box that answers the interrupt (not the chat box)" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "root_agent", marker: M.graphWas, afterMarker: M.graphNow, change: [M.graphWas, M.graphNow], fix: swapLine(M.graphWas, M.graphNow), swap: true, afterHint: "lands on your next message — the stage runs the graph" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/nightly.py · the graph", "agent/concert/nightly.py"], ["monstertix/handlers.py · pending_interrupt", "monstertix/handlers.py"]],
    expect: "“go” runs four nodes and parks at #14,203. Each 🐓 re-enters the graph — and the venue still shows one ticket. After SKIP, brief and your agent run and it buys.",
    check: "an adk_request_input event, at least two wake-ups, exactly one queue ticket at the venue, one order",
    reads: (p) => [queueRead(p), { k: "wake-ups", v: String(p?.clock_runs ?? 0), s: "the clock", cls: "hi" }, { k: "tickets", v: String(p?.venue?.tickets ?? 0), s: "venue", cls: "" }, { k: "the agent", v: p?.code?.graph ? "a graph" : "chatting", s: p?.code?.graph ? "nightly · 6 nodes" : "no graph", cls: "" }],
    tiles: () => [],
    next: (p) => !p?.code?.graph ? "swap the line in the editor (buyer_agent → nightly), then say “go” on the stage" : phaseNote(3, "the parked interrupt"),
    wbGuide: () => ({ steps: ["reload — the dropdown still says <b>concert</b>, but the left panel now draws a <b>graph</b>", "type <code>go</code>; watch open → pick_show → queue_up → check_front turn green and stop", "⚠ to wake it here, type in the <b>Enter your response…</b> box ON the adk_request_input event — the chat box at the bottom starts a NEW run and takes a second ticket. (The stage’s talk box does this for you.)"], see: "edges with 2× / 3× badges, and one queue ticket at the venue — that is rerun_on_resume=False doing real work." }) },

  { n: 6, roman: "VI", name: "the budget", pill: ["edit", "EDIT ONE"], phase: 3,
    star: { img: "/art/sam-hero.jpg", name: "Sam", role: "the second ticket" },
    hook: "It can buy on its own now. Who said how much?",
    concept: "The same interrupt that waits for a venue can wait for a <b>person</b>. <code>agree_budget</code> returns a <code>RequestInput</code> aimed at you, reads your answer back, and stores <b>the sentence</b> — not a schema — in <b>session state</b> (no prefix: a limit agreed for this booking, not forever). Three things make it work: <code>rerun_on_resume=True</code>, a <b>stable</b> <code>interrupt_id</code>, and reading the answer from <code>ctx.resume_inputs</code>. And <code>someone_is_there()</code> is a fact about the <b>request</b>: the stage’s box marks a person present; the clock’s door does not.",
    steps: [
      { where: "editor", do: "delete the “# ” — agree_budget becomes the first node" },
      { where: "page", do: "ask for the tickets", say: LINE },
      { where: "page", do: "answer the way people answer, in the same box", say: "About a 100 for the cheap seats. 250 if they’re the good ones." },
      { where: "page", do: "confirm", say: "Yes, that’s right." },
      { where: "page", do: "SKIP THE WAIT, then 🐓 — nobody is there, and it does not ask twice" },
      { where: "workbench", do: "State tab: budget — your sentence, verbatim, no prefix" },
    ],
    edit: { file: "agent/concert/nightly.py", symbol: "NIGHT", marker: `# ${M.budget}`, afterMarker: M.budget, change: [`# ${M.budget}`, M.budget], fix: uncomment(M.budget), afterHint: "lands on your next message" },
    sources: [["agent/concert/nightly.py · the line", "agent/concert/nightly.py"], ["agent/concert/nightly.py · agree_budget", "agent/concert/nightly.py"], ["agent/concert/budget.py · someone_is_there()", "agent/concert/budget.py"], ["lab/runner.py · mark_attended on /api/say", "lab/runner.py"]],
    expect: "The run stops and asks. It reads your number back before it commits. State holds your sentence with no prefix. After SKIP, the clock’s wake finds nobody there and uses the standing budget rather than stopping on a question nobody will answer.",
    check: "budget in session state equal to a sentence you typed, one order, and an unattended wake that did not stop on the question",
    reads: (p) => [{ k: "asked you", v: "0", s: "questions before spending", cls: "hi" }, { k: "budget", v: p?.code?.budget ? "yours" : "default", s: p?.code?.budget ? "agreed in the graph" : "up to $250 per seat", cls: "" }, ordersRead(p), { k: "the agent", v: "—", s: "", cls: "" }],
    tiles: () => [],
    next: (p) => !p?.code?.budget ? "delete the “# ” on the red line, then ask for the tickets on the stage" : phaseNote(3, "the sentence in session state"),
    wbGuide: () => ({ steps: ["type the ask in the chat box; the run stops on an <b>adk_request_input</b>", "answer in <b>that event’s box</b>; it asks again to confirm — same box", "<b>State</b> tab: <code>budget</code> — your sentence, no prefix. Start a New Session: it is gone, and the graph asks again"], see: "four nodes running off one “yes”, and a limit that lives exactly as long as the conversation." }) },

  { n: 7, roman: "VII", name: "breakfast", pill: ["gold", "THE MESSAGE"], phase: 4,
    star: { img: "/art/clock-hero.jpg", name: "the clock", role: "7:30 · wake up" },
    hook: "Six stubs. What did it do while you slept?",
    concept: "Every stub on this page is torn by a <b>receipt</b>: a session the clock made, a recall call, one ticket under two boots, a refusal written by your code, one ticket under three wake-ups, a sentence in state. The page never ticks a checklist. The agent, its tools, its callbacks and the budget are what you would deploy — two URIs and one environment variable change, and nothing else does.",
    steps: [{ where: "page", do: "read the message on the phone" }],
    sources: [["lab/progress.py · what tears a stub", "lab/progress.py"], ["scripts/walk.py · the headless learner", "scripts/walk.py"], ["lab/runner.py · the two doors", "lab/runner.py"]],
    expect: "", check: "six stubs · the breakfast message",
    reads: (p) => [{ k: "stubs torn", v: `${["1", "2", "3", "4", "5", "6"].filter((k) => p?.lit?.[k]).length} / 6`, s: "receipts, not clicks", cls: "hi" }, ordersRead(p), { k: "boots", v: String(p?.boots ?? 1), s: "", cls: "" }, { k: "wake-ups", v: String(p?.clock_runs ?? 0), s: "the clock", cls: "" }],
    tiles: () => [],
    next: (p) => p?.lit?.["7"] ? "✓ six stubs. 📱 the breakfast message." : `${["1", "2", "3", "4", "5", "6"].filter((k) => !p?.lit?.[k]).map((k) => CHAPTERS[Number(k) - 1].roman).join(" · ")} still untorn — the phone shows what is in so far`,
    wbGuide: () => ({ steps: ["Sessions: the whole night as ADK recorded it — yours and the clock’s, in one list"], see: "every run, in order." }) },
];
