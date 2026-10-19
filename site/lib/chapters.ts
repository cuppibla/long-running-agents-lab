import type { Progress, Wake } from "./api";

/** The six chapters and the breakfast message — the data model (v2, the sparse page).
 *
 *  Each chapter: a scene (the cast doing this chapter's thing, on the stage) · the hook
 *  (the failure, as a question) · `why` (one line + the concept, folded) · steps, each with
 *  a 2–4 word label, a where-chip, the one action (a sentence to say, the edit, 🐓, 💀, a
 *  world button) and one "you will see" line · the one edit (was/now, `fix` = "apply the
 *  edit for me") · `now(p)` — WHICH step the learner is on, computed from receipts (the one
 *  card that is open) · `ticks(p)` — the receipts that tick on their own, each with a hint
 *  until it is earned (the Watch idea from the source lab's interactive-workbench branch) ·
 *  `nums(p)` — the three numbers under the scene · `tiles(p)` — what it did · the drawer's
 *  guide. Nothing here lights a stub: stubs tear from /api/progress, which reads your files
 *  and the receipts of what actually ran.
 *
 *  Every number in the copy was measured on gemini-2.5-flash on 2026-10-17/18 (see the
 *  phase reports): I = 1 call and "which show?" into the dark · II = recall first, Saturday
 *  ×2 · III = #14,203 → #14,173 on the same ticket across two boots · IV = stale_plan,
 *  actually 0, no 409, then C $190 · V = four nodes parked at #14,203, 🐓 answered the
 *  pause in 0.0 s, 2× A $420 · VI = budget:ask, budget:confirm, the sentence in state,
 *  the 3am wake-up asked nothing, $210 a seat inside "250 if they’re the good ones". */

export type Where = "page" | "editor" | "workbench" | "watch";
export type Act = "edit" | "wake" | "skipwake" | "kill" | "sell" | "wb" | "phone" | "replay";
/** fresh: the button opens a new conversation first · optional: the stub does not need it (the card says so, and offers `skip`) */
export type Step = { lbl: string; where: Where; do: string; say?: string; act?: Act; see?: string; fresh?: boolean; optional?: boolean; skip?: "wake" };
export type Edit = { file: string; symbol?: string; marker: string; afterMarker: string; change: [string, string]; fix?: (src: string) => string; afterHint?: string; swap?: boolean };
export type Read = { k: string; v: string; s?: string; cls?: "" | "hi" | "ok" | "bad" };
export type Tile = { k: string; v: string; cls?: "" | "hi" | "ok" | "bad"; s?: string };
export type Place = { k: string; c: "y" | "n" | "z"; s: string };
export type Tick = { label: string; ok: boolean; hint?: string; opt?: boolean };   // opt: an optional receipt — hinted only once the required ones are in
/** which step the learner is on: 1-based; steps.length + 1 means every step is done (the stub is torn) */
export type Now = { n: number; note?: string };
export type Chapter = {
  n: number; roman: string; name: string; pill: [string, string]; phase: 1 | 2 | 3 | 4;
  scene: string;                                 // /art/scenes/<scene>.jpg — the cast doing this chapter's thing
  star: { img: string; name: string; role: string };   // the chapter's figure (chips, the title avatar, the codelab)
  hook: string;
  why: [string, string];                         // [one line, the concept as HTML]
  steps: Step[];
  edit?: Edit;
  sources: [string, string][];                   // [label, repo path] — opens as text in a new tab
  done: string;                                  // the one sentence when the stub is torn
  check: string;                                 // the receipt, in words (the stubs rail's title)
  now: (p: Progress | null) => Now;
  ticks: (p: Progress | null) => Tick[];
  nums: (p: Progress | null) => Read[];          // three numbers under the scene
  tiles: (p: Progress | null) => Tile[];         // what it did
  places?: (p: Progress | null) => Place[];      // chapter II: where each fact lives
  placesFrom?: (p: Progress | null) => string;   // …and which receipt the chips read (your conversation, or the clock's)
  mapLine: (p: Progress | null) => string;       // one line under the map
  wbGuide: (p: Progress | null) => { steps: string[]; see: string };
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
/** the chapters' sentences — scripts/walk.py says the same ones */
export const WHICH = "The Saturday show, please.";
export const WHERE_AM_I = "Where am I in line?";
export const SEATS = "How much are the seats, and what's still available?";
export const BUY = "Buy the two section A seats.";
export const THEN_C = "Then section C, two seats.";
export const GO = "go";
export const ASK = "Get us two tickets to the Amsterdam show.";
export const BUDGET_SENTENCE = "About a 100 for the cheap seats. 250 if they’re the good ones.";
export const YES = "Yes, that’s right.";
export const CLOSING = "Waking up was never the hard part.";
/** chapter II's two optional sentences (the source lab's step 4b) and its longer conversation (step 5c — lab/replay.py says the same eight) */
export const SAM = "Sam can't do weeknights, by the way.";
export const SEATMAP = "Show me the seat map for the Amsterdam Saturday show.";
export const REPLAY = ["hello", "what's on in Amsterdam?", "Sam is coming with us, and he can't do weeknights", "there are 4 of us and I can spend about $200 a head. What fits?",
  "what if 10 people come and I can only do $120 each?", "Book us something.", "Amsterdam Saturday, section C, 8 people", "yes"];

export const WHERE: Record<Where, string> = { page: "on the stage", editor: "in the editor", workbench: "in the workbench", watch: "watch" };

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
const weekday = (w: Wake | null | undefined) => order(w)?.weekday || null;
const factsN = (p: Progress | null) => p?.code?.memory_facts ?? 5;
const ordersRead = (p: Progress | null): Read => { const v = p?.venue; const o = v?.orders?.slice(-1)[0]; return { k: "orders", v: String(v?.order_count ?? 0), s: o ? `${(o.weekday || "?").slice(0, 3).toLowerCase()} · ${o.seats}× ${o.section} · ${money(o.total)}` : "box office", cls: "" }; };
const ticketsRead = (p: Progress | null): Read => { const t = p?.venue?.tickets ?? 0; return { k: t === 1 ? "ticket" : "tickets", v: String(t), s: "at the venue", cls: "" }; };
const queueRead = (p: Progress | null): Read => { const q = p?.venue?.queue?.[0]; return q ? { k: "in line", v: `#${q.position.toLocaleString()}`, s: q.ready ? "at the front" : q.ticket, cls: "hi" } : { k: "in line", v: "—", s: p?.code?.queue ? "no ticket yet" : "no queue tool", cls: "hi" }; };
const lastStage = (p: Progress | null) => stageWakes(p).slice(-1)[0] || null;
const joinOf = (w: Wake | null | undefined) => (w?.db?.responses || []).filter((r) => r.tool === "join_queue").slice(-1)[0] || null;
/** the newest stage run whose session holds a queue ticket (chapter III, before or after the kill) */
const lastJoined = (p: Progress | null) => stageWakes(p).filter((w) => joinOf(w)).slice(-1)[0] || null;
const pos = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `#${n.toLocaleString()}`);
const askedWhich = (w: Wake | null) => Boolean(w && !w.tools.includes("join_queue") && /which/i.test(w.reply));
const tick = (label: string, ok: boolean, hint?: string, opt?: boolean): Tick => ({ label, ok, hint, opt });
/** the stage's current conversation — your own session (or the replay's), its turns newest last */
const stageSession = (p: Progress | null) => { const sid = p?.stage?.session_id; return sid ? stageWakes(p).filter((w) => w.session_id === sid) : []; };
const calledIn = (w: Wake | null | undefined, t: string) => Boolean(w && (w.turn_tools ?? w.tools).includes(t));
/** the newest turn of `ws` that called tool `t` */
const turnWith = (ws: Wake[], t: string) => ws.filter((w) => calledIn(w, t)).slice(-1)[0] || null;

export const CHAPTERS: Chapter[] = [
  { n: 1, roman: "I", name: "the clock", pill: ["read", "PRESS ONE"], phase: 1, scene: "clock",
    star: { img: "/art/lamb.jpg", name: "the cloud", role: "wakes it at 3am" },
    hook: "You told it to buy the moment the presale opens. Nothing happened. Why?",
    why: ["instruction= is read when a message arrives, never between messages",
      "<code>instruction=</code> is a string handed to the model <b>when somebody sends a message</b>. Nothing reads it between turns. Being awake needs two halves: <b>the trigger</b> — an endpoint with a <code>Runner</code> behind it (here <code>/api/wake</code>) — and <b>the triggerer</b> — something with a clock that calls it. <code>monstertix/clock.py</code> is a <code>sleep</code> and a POST; in the finale it is Cloud Scheduler. The model never runs your code: a ⚡ <code>search_events</code> row means the model <i>asked</i> for that call and ADK ran the function. And no wording gets around it — “set a timer for 10:00”, “check every five minutes”, “act autonomously without waiting for input” all fail the same way: an instruction cannot invoke the function it is written inside."],
    steps: [
      { lbl: "say the plan", where: "page", do: "Say the plan to it, as you would to a person.", say: PLAN, fresh: true, see: "a reply — and then nothing, for a whole minute" },
      { lbl: "hands down · 🐓", where: "page", do: "Hands down for a minute — watch <b>calls</b> stay at 0. Then press 🐓: the clock fires once, 10 s later, with nobody at the keyboard.", act: "wake", see: "one run with your hands off: it searches on its own and asks which show, into the dark" },
      { lbl: "adk web", where: "workbench", do: "Open 🔬 — the <code>wake-…</code> session is there, and you did not type it.", act: "wb", see: "the same session the stage showed, read from lab.db" },
    ],
    sources: [["monstertix/clock.py · the triggerer", "monstertix/clock.py"], ["monstertix/handlers.py · wake()", "monstertix/handlers.py"], ["lab/runner.py · /api/say vs /api/wake", "lab/runner.py"], ["lab/jobs.py · the wake job", "lab/jobs.py"]],
    done: "It ran without you — and asked which show, into the dark.",
    check: "a wake-… session created by the clock, with at least one tool call",
    now: (p) => { const w = clockI(p); const s = stageWakes(p).length;
      if (!s && !w) return { n: 1 };
      if (!w) return { n: 2 };
      if (!p?.lit?.["1"]) return { n: 2, note: "the clock woke it, but it made no tool call — read its reply on the stage, then 🐓 again" };
      return { n: 4 }; },
    ticks: (p) => { const w = clockI(p); return [
      tick("a wake-… session the clock created", Boolean(w) || (p?.clock_runs || 0) > 0, "press 🐓 — it fires 10 s later"),
      tick("at least one tool call in it", Boolean(p?.lit?.["1"]), "read its reply on the stage, then 🐓 again")]; },
    nums: (p) => { const w = clockI(p); return [
      { k: "calls", v: w ? String(w.calls) : "0", s: w ? "while you slept" : stageWakes(p).length ? "since your turn ended" : "nothing has run", cls: w && w.calls ? "ok" : stageWakes(p).length ? "bad" : "hi" },
      ticketsRead(p), ordersRead(p)]; },
    tiles: (p) => { const w = clockI(p); const s = stageWakes(p).slice(-1)[0];
      if (!w) return s ? [{ k: "calls after the turn ended", v: "0", cls: "bad", s: s.reply.toLowerCase().includes("can't") || s.reply.toLowerCase().includes("cannot") ? "It told you it cannot keep checking — and it was right. No code runs between messages." : "It said it would check. Nothing can check — no code runs between messages." }] : [];
      return [{ k: "calls while you slept", v: String(w.calls), cls: w.calls ? "ok" : "bad", s: w.tools.length ? w.tools.join(" · ") : "no tool call — read the reply" },
        { k: "who typed", v: "nobody", cls: "hi", s: `a sleep and an HTTP request · session ${w.session_id}` },
        ...(order(w) ? [{ k: "the 3am order", v: `${weekday(w)} · ${order(w)!.seats}× ${order(w)!.section}`, cls: "hi" as const, s: `${money(order(w)!.total)} · you never said which day` }] : [{ k: "the 3am reply", v: "a question", cls: "bad" as const, s: "“which show?” — asked into the dark, nobody there to answer" }])]; },
    mapLine: (p) => (p?.lit?.["1"] ? "the clock posted one sentence to /api/wake; a Runner ran the agent; nobody typed." : "a trigger is an endpoint with a Runner; a triggerer is a clock that calls it."),
    wbGuide: (p) => { const w = clockI(p); return { steps: [`Sessions (left rail): find <b>${w ? w.session_id : "wake-…"}</b> — the clock made it, not you`, "open its events: ⚡ search_events → ⚡ get_seatmap → ⚡ purchase (or whatever it chose — the stage lists the same names)", "nothing in it was typed by a person"], see: "the same session the stage showed, read from lab.db — which is what tears stub I." }; } },

  { n: 2, roman: "II", name: "where a fact lives", pill: ["edit", "EDIT ONE"], phase: 1, scene: "memory",
    star: { img: "/art/sleeper.jpg", name: "you", role: "said it last week" },
    hook: "It asked you which show — at 3am, into the dark. Sam can’t do weeknights. You said so last week. Where did that go?",
    why: ["four places a fact can live; recall() reads the one that survives the database",
      "A fact can live in four places, and each lasts a different time: <code>temp:</code> (one invocation, stripped on the way to disk) · <b>session state</b> (this booking) · <code>user:</code> (every session this person has) · a <b>memory file</b> (survives deleting the database). <code>recall()</code> reads that file through ADK’s <code>BaseMemoryService</code>. The conversation itself is the worst place: every three turns ADK replaces it with a <b>paraphrase</b> you never wrote — <code>EventsCompactionConfig(compaction_interval=3, overlap_size=1)</code> on the App, one more event row in lab.db under <code>actions.compaction</code>. Nothing kept in state is touched by it: <code>user:prefs</code>, and <code>budget_plan</code> (the arithmetic agent’s <code>output_key</code> — its latest answer replaces the one before), come back exactly as they went in."],
    steps: [
      { lbl: "delete the “# ”", where: "editor", do: "Delete the “# ” on the red line — the agent gets <code>recall</code> and <code>remember</code>.", act: "edit", see: "saved · lands on the next wake" },
      { lbl: "Sam, by the way", where: "page", do: "Optional — tell it a fact yourself, in a new conversation, and watch where it goes.", say: SAM, fresh: true, optional: true, skip: "wake", see: "⚡ note_companion — <b>user:prefs</b> lights in “where it lives”, below: a fact every conversation of yours can read" },
      { lbl: "the seat map", where: "page", do: "Optional — ask for the seat map, in the same conversation.", say: SEATMAP, optional: true, skip: "wake", see: "⚡ get_seatmap — a file lights in <b>artifacts/</b>; <b>temp:seatmap</b> lived only inside this turn, and is not in lab.db now that the reply is in" },
      { lbl: "🐓 again", where: "page", do: "Press 🐓 again. Same sentence, same clock.", act: "wake", see: "⚡ recall is the first call, and the order is the Saturday show for two" },
      { lbl: "▶ longer", where: "page", do: "Optional — let a script say the source lab’s eight sentences into a fresh conversation, one after another: hello · what’s on · Sam · 4 of us at $200 · 10 of us at $120 · book us something · Amsterdam Saturday, section C, 8 people · yes. Eight turns is what compaction needs.", act: "replay", optional: true, see: "a paraphrase in lab.db after turn 3 and again after turn 6, budget_plan overwritten by the 10-person plan, and 8× C · $760 — booked from a conversation that is partly a summary" },
      { lbl: "adk web", where: "workbench", do: "State tab · Artifacts tab · the two-days-ago session — the drawer says what to look for.", act: "wb", see: "user:prefs is there, temp:seatmap is not; a grey paraphrase where turns 1–3 used to be" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.recall}`, afterMarker: M.recall, change: [`# ${M.recall}`, M.recall], fix: uncomment(M.recall), afterHint: "lands on the next wake — the clock, the stage and adk web all re-read the file" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/memory.py · MarkdownMemoryService", "agent/concert/memory.py"], ["agent/concert/tools.py · note_companion · get_seatmap", "agent/concert/tools.py"], ["memory/userx.md", "memory/userx.md"], ["lab/replay.py · the longer conversation", "lab/replay.py"], ["lab/progress.py · what tears a stub", "lab/progress.py"]],
    done: "Saturday, for two, read from a file.",
    check: "a wake whose events include recall, and whose order is the Saturday show",
    now: (p) => { const r = p?.replay?.after;
      if (p?.lit?.["2"]) return r?.done ? { n: 7 } : { n: 5 };      // a torn stub stays torn, whatever the file says now — ▶ is still on offer
      if (!p?.code?.recall) return { n: 1 };
      const s = stageSession(p); const w = lastClock(p);
      if (w?.tools.includes("recall")) return { n: 4, note: "the clock ran with recall, but the order was not the Saturday show for two — read its reply on the stage, then 🐓 once more" };
      if (!turnWith(s, "note_companion")) return { n: 2 };
      if (!turnWith(s, "get_seatmap")) return { n: 3 };
      return { n: 4 }; },
    ticks: (p) => { const a = p?.after; const w = lastClock(p); const s = stageSession(p); const r = p?.replay?.after;
      const noted = turnWith(s, "note_companion"); const mapped = turnWith(s, "get_seatmap"); return [
      tick("recall is the first call", Boolean(w?.tools.includes("recall")) || Boolean(a), p?.code?.recall ? "press 🐓 — same sentence, same clock" : "delete the “# ”, then 🐓"),
      tick("the order is the Saturday show (ms-ams-01)", Boolean(a), "Sam’s rule, read from the file"),
      tick("a fact of yours in user:prefs · note_companion", Boolean(noted) || Boolean(r?.noted), "optional — say “Sam can't do weeknights, by the way.”", true),
      tick("a seat map in artifacts/ · no temp: key saved", Boolean(mapped && (mapped.artifacts || []).length && !(mapped.db?.temp_keys || []).length), "optional — ask for the seat map", true),
      tick(`a paraphrase in lab.db · compaction${r?.compaction_at ? ` after turn ${r.compaction_at}` : ""}`, Boolean(r?.compactions), "optional — ▶ a longer conversation: eight turns, one session", true),
      tick("budget_plan overwritten · output_key keeps the latest", Boolean(r?.overwritten), "turn 5’s plan replaces turn 4’s", true),
      tick("8× C · Saturday · $760, booked without repeating yourself", Boolean(r?.saturday), r?.eight && !r.saturday ? "it booked 8× C — for the Tuesday. Read the tile in “what it did”, then ▶ once more" : "“Book us something.” → “Amsterdam Saturday, section C, 8 people” → “yes”", true)]; },
    nums: (p) => { const w = lastClock(p); const got = w?.tools.includes("recall"); return [
      { k: "facts it read", v: got ? String(w?.memory_facts ?? factsN(p)) : "0", s: `of ${factsN(p)} in memory/userx.md`, cls: got ? "ok" : w ? "bad" : "hi" },
      ticketsRead(p), ordersRead(p)]; },
    tiles: (p) => { const b = p?.before, a = p?.after, r = p?.replay?.after; const out: Tile[] = [];
      if (b) out.push({ k: "the 3am order · before", v: order(b) ? `${weekday(b)}` : "a question", cls: "bad", s: order(b) ? `${order(b)!.seats}× ${order(b)!.section} · ${money(order(b)!.total)} · cheaper, listed first, wrong for this person` : "“which show?” — into the dark, instead of reading what it knew" },
        { k: "facts it could read", v: `0 / ${factsN(p)}`, cls: "bad", s: "memory/userx.md was never opened" });
      if (a) out.push({ k: "the 3am order · after", v: `${weekday(a)} ×${order(a)!.seats}`, cls: "ok", s: `${order(a)!.section} · ${money(order(a)!.total)} · Sam’s rule, read from a file` },
        { k: "facts it could read", v: `${a.memory_facts ?? factsN(p)} / ${a.memory_facts ?? factsN(p)}`, cls: "ok", s: "recall() ran first" },
        ...(a.db?.compactions ? [{ k: "paraphrases", v: String(a.db.compactions), cls: "hi" as const, s: "compaction events in this session — summaries you never wrote" }] : []));
      if (r) out.push({ k: "▶ the longer conversation", v: `${r.turns} turns`, cls: r.done ? "hi" : "bad", s: `one session · ${r.session_id} · ${r.elapsed} s${r.done ? "" : " · stopped early — read the stage"}` },
        { k: "paraphrases · compaction events", v: String(r.compactions), cls: r.compactions ? "ok" : "bad", s: r.compactions ? `the first after turn ${r.compaction_at} — every three turns, a summary you never wrote, one event row under actions.compaction` : "none — compaction fires after three turns of one session" },
        { k: "budget_plan · output_key", v: r.overwritten ? "overwritten" : r.plans.length ? "set once" : "never set", cls: r.overwritten ? "ok" : "bad", s: r.plans.length ? `“${r.plans[r.plans.length - 1].replace(/[*#_`]+/g, "").replace(/\s+/g, " ").trim().slice(0, 90)}…” — budget_split ran ${r.split_calls}×; the latest answer replaced the one before, nothing appended` : r.split_calls ? `budget_split ran ${r.split_calls}× and answered nothing — the model did the sums itself` : "budget_split never ran — the model did the sums itself" },
        ...(r.order ? [{ k: "the order", v: `${r.order.seats}× ${r.order.section} · ${money(r.order.total)} · ${(r.order.weekday || "").toLowerCase()}`, cls: r.saturday ? ("ok" as const) : ("bad" as const), s: r.eight && !r.saturday ? `the reply said Saturday; the purchase went to the ${r.order.weekday} show (${r.order.event_id}) — no error, no log line: after two summaries the agent believed something slightly different from what you said` : r.order_turn ? `on turn ${r.order_turn}${r.order_turn < 8 ? " — it booked the moment you named show, section and count; “yes” had nothing left to confirm" : " — after reading the order back"}` : "" }] : [{ k: "the order", v: "none", cls: "bad" as const, s: r.code?.queue ? "the queue tools are in (chapter III), so the booking waits in line instead of buying" : "it did not buy — read the stage" }]));
      return out; },
    placesFrom: (p) => { const s = stageSession(p); return s.length ? `your conversation · ${s[0].session_id}` : p?.after ? `the clock’s run · ${p.after.session_id}` : "no run yet"; },
    places: (p) => { const s = stageSession(p); const noted = turnWith(s, "note_companion"); const mapped = turnWith(s, "get_seatmap");
      const own = s.slice(-1)[0] || null; const w = own || p?.after || lastClock(p);
      const st = (w?.db?.state || {}) as Record<string, unknown>; const prefs = st["user:prefs"] as Record<string, string> | undefined;
      const recalled = Boolean(turnWith(s, "recall") || p?.after || lastClock(p)?.tools.includes("recall")); const facts = (turnWith(s, "recall") || p?.after || lastClock(p))?.memory_facts ?? factsN(p);
      const art = mapped?.artifacts || own?.artifacts || p?.after?.artifacts || []; const tempSaved = (w?.db?.temp_keys || []).length;
      const plain = Object.keys(st).filter((k) => !k.startsWith("user:") && !k.startsWith("temp:") && !k.startsWith("app:"));
      const mappedAt = mapped ? s.indexOf(mapped) + 1 : 0;
      return [{ k: "temp:seatmap", c: "z", s: mapped ? `set by get_seatmap in turn ${mappedAt} · ${tempSaved} temp: keys in lab.db now — stripped before the write, gone with the turn` : "set by get_seatmap for one invocation — ask for the seat map and watch it not arrive" },
        { k: plain.length ? `${plain.join(" · ")} · plain state` : "plain state", c: plain.length ? "y" : "z", s: "this session only" },
        { k: "user:prefs", c: prefs ? "y" : "n", s: noted ? `${JSON.stringify(prefs).slice(0, 60)} · written by note_companion in your conversation · every session of yours` : prefs ? `${JSON.stringify(prefs).slice(0, 44)} · seeded with two-days-ago — say “Sam can't do weeknights, by the way.” to write one yourself` : "empty — note_companion never ran" },
        { k: "memory/userx.md", c: recalled ? "y" : "n", s: recalled ? `read by recall() · ${facts} facts` : `${factsN(p)} facts · unread` },
        { k: art.length ? art[0] : "artifacts/seatmap_….json", c: art.length ? "y" : "z", s: art.length ? `saved by get_seatmap${mapped ? " in your conversation" : ""}, never in the prompt` : "appears when get_seatmap runs" }]; },
    mapLine: (p) => (p?.code?.recall ? "recall() reads memory/userx.md through BaseMemoryService. temp: never reaches the disk." : "four stores, one of them unread: the memory file."),
    wbGuide: (p) => { const r = p?.replay?.after; return { steps: ["<b>State</b> tab (left icons): <code>user:prefs</code> is there if note_companion ran · <code>temp:seatmap</code> is not — stripped before the write", "<b>Artifacts</b> tab: <code>seatmap_ms-ams-01.json</code> — the seat map that never entered the prompt", "session dropdown → <b>two-days-ago</b> (▶ seed it from the panel first): the first turns are a grey summary block. Nothing you did put it there",
      ...(r ? [`session <b>${r.session_id}</b> (▶ the longer conversation): ${r.compactions} grey summary block${r.compactions === 1 ? "" : "s"} where turns 1–3${r.compactions > 1 ? " and 3–6" : ""} used to be; <b>State</b> tab: <code>budget_plan</code> is the ${r.overwritten ? "10-person plan — the 4-person one is gone" : "arithmetic agent’s answer"}`] : [])], see: "three kinds of key side by side — plain, user:, and the one that is missing — and the paraphrase sitting where turns 1–3 used to be." }; } },

  { n: 3, roman: "III", name: "the kill", pill: ["edit", "EDIT ONE"], phase: 2, scene: "kill",
    star: { img: "/art/capy.jpg", name: "the dispatcher", role: "keeps your place in line" },
    hook: "The queue is 14,203 long. Your laptop will sleep before it reaches the front. What survives?",
    why: ["a long-running tool returns a handle; the ticket lives in lab.db, not in the process",
      "<code>join_queue</code> returns a <b>handle</b> to work that is not finished — a ticket and a position. Wrapped as a <code>LongRunningFunctionTool</code>, with <code>ResumabilityConfig</code> on the App, the run <b>parks</b> on that call: it says where it stands and stops — nothing loops, nothing holds a connection open. The ticket is in <b>session state</b>, and session state is in <code>lab.db</code>, not in the process. Kill the process. The next boot opens the same session; your next sentence is a new turn on it, and the agent checks the queue it is already in instead of joining again. Why <code>join_queue</code> and not <code>check_queue</code>: both return in milliseconds. <code>join_queue</code> hands back a handle to work that is <i>not finished</i> — a ticket, forty minutes still ahead; <code>check_queue</code> is a complete question with a complete answer, nothing pending to park on. Wrap that one as long-running and the run would park every time it asked where it was — including when the answer is “at the front, buy now”."],
    steps: [
      { lbl: "delete the “# ”", where: "editor", do: "Delete the “# ” — the agent gets <code>join_queue</code> (long-running) and <code>check_queue</code>.", act: "edit", see: "saved · lands on your next message" },
      { lbl: "ask", where: "page", do: "Ask for the tickets, in a new conversation — it joins the queue for the Saturday show and says the position.", say: LINE, fresh: true, see: "“Your position is 14,203”" },
      { lbl: "💀 kill", where: "page", do: "Press 💀 — the lights go out, the server really dies, and lab.sh brings it back as the next boot.", act: "kill", see: "a new boot id, a second later" },
      { lbl: "ask again", where: "page", do: "Ask where you are, in the same conversation.", say: WHERE_AM_I, see: "one check_queue call, the same ticket, a lower number — no second search, no second ticket" },
      { lbl: "adk web", where: "workbench", do: "The same session, after the reboot — the drawer shows the parked call and the one that followed.", act: "wb", see: "a conversation that does not know it was dead" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.queue}`, afterMarker: M.queue, change: [`# ${M.queue}`, M.queue], fix: uncomment(M.queue), afterHint: "lands on your next message" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/tools.py · join_queue · check_queue", "agent/concert/tools.py"], ["lab/service.py · /api/kill + boot_id", "lab/service.py"], ["lab.sh · the keep-open loop", "lab.sh"], ["lab/progress.py · kill_receipt", "lab/progress.py"], ["runs/boots.json", "runs/boots.json"]],
    done: "Same ticket, two boots, no second queue.",
    check: "one queue_ticket, handed out by join_queue under one boot and read back by check_queue under another — and one ticket at the venue",
    now: (p) => { const k = p?.kill; const w = lastJoined(p); const s = lastStage(p);
      if (!p?.code?.queue) return { n: 1 };
      if (!w) return askedWhich(s) ? { n: 2, note: "it asked which show instead of reading recall — say “The Saturday show, please.” and it joins the queue" } : { n: 2 };
      if (w.boot_id === p?.boot_id && !k) return { n: 3 };
      if (!k) return { n: 4 };
      if (!p?.lit?.["3"]) return { n: 2, note: `the ticket came back under two boots, but the venue holds ${k.tickets} tickets — RESET the venue, ↻ new conversation, and run the chapter once more` };
      return { n: 6 }; },
    ticks: (p) => { const k = p?.kill; const w = lastJoined(p); const j = joinOf(w); const moved = Boolean(w && w.boot_id !== p?.boot_id); return [
      tick("one queue ticket handed out", Boolean(j) || Boolean(k), "ask for the tickets"),
      tick("the process died and came back", Boolean(k) || moved, "press 💀"),
      tick("check_queue read the same ticket back", Boolean(k), "ask “Where am I in line?” in the same conversation"),
      tick("one ticket at the venue", Boolean(k?.lit), "two means a second join_queue")]; },
    nums: (p) => { const t = p?.venue?.tickets ?? 0; return [queueRead(p),
      { k: "boots", v: String(p?.boots ?? 1), s: p?.boot_id ? `this process · ${p.boot_id}` : "", cls: "hi" },
      { k: t === 1 ? "ticket" : "tickets", v: String(t), s: "at the venue · one is the point", cls: t === 1 ? "ok" : t > 1 ? "bad" : "" }]; },
    tiles: (p) => { const k = p?.kill; const w = lastJoined(p); const j = joinOf(w);
      if (k) return [{ k: "the ticket", v: k.ticket, cls: "ok", s: `${pos(k.positions[0])} → ${pos(k.positions[1])} · handed out by boot ${k.boots[0]}, read back by boot ${k.boots[1]}` },
        { k: "boots it lived through", v: "2", cls: "hi", s: "the process died in between; lab.db did not" },
        { k: "tickets at the venue", v: String(k.tickets ?? "?"), cls: k.tickets === 1 ? "ok" : "bad", s: k.tickets === 1 ? "no second join_queue — it checked the queue it was already in" : "more than one — a second join_queue happened" }];
      if (j && w) return [{ k: "the ticket", v: j.ticket || "—", cls: "hi", s: `${pos(j.position)} · boot ${w.boot_id} · ${w.boot_id === p?.boot_id ? "now press 💀" : "that boot is gone — ask “Where am I in line?”"}` }];
      return []; },
    mapLine: (p) => (p?.kill ? `one ticket (${p.kill.ticket}) handed out by boot ${p.kill.boots[0]} and read back by boot ${p.kill.boots[1]} — lab.db outlived the process.` : "a handle in session state; a new process reads lab.db back."),
    wbGuide: (p) => { const sid = p?.kill?.session_id || lastJoined(p)?.session_id || p?.stage?.session_id; return { steps: [`Sessions: <b>${sid || "web-…"}</b> is still here after the reboot — adk web reads the same lab.db`, "open the ⚡ <b>join_queue</b> event: its response is <code>status: waiting</code> and the ticket — a handle, not a result; the <b>State</b> tab holds <code>queue_ticket</code>", "the next ⚡ is <b>check_queue</b>, after the kill, on the same ticket — a new turn, no second join_queue"], see: "a conversation that does not know it was dead." }; } },

  { n: 4, roman: "IV", name: "old news", pill: ["edit", "EDIT ONE"], phase: 2, scene: "stale",
    star: { img: "/art/boxoffice-hero.jpg", name: "the box office", role: "stamps the same order once" },
    hook: "It came back from the wait holding a seat map. Those seats sold twelve minutes in. Why did it buy anyway?",
    why: ["a before_tool_callback re-reads the world; returning a dict short-circuits the tool",
      "An agent that is <i>missing</i> a fact asks. An agent holding an <i>old</i> fact just acts — nothing is missing from its context, the wrong thing is present. The seat map it read while waiting is still in the <b>conversation</b>; its <code>temp:seatmap</code> copy died with that turn, which does not help. A <code>before_tool_callback</code> runs in the instant before <code>purchase</code>: it re-reads live inventory, and <b>returning a dict short-circuits the tool</b>, so the stale plan never reaches the venue. (The <code>Idempotency-Key</code> on every purchase is already in the shipped code; BREAK THE NEXT PURCHASE shows the venue returning the same order twice.)"],
    steps: [
      { lbl: "delete the “# ”", where: "editor", do: "Delete the “# ” — the fence runs before every purchase.", act: "edit", see: "saved · lands on your next message" },
      { lbl: "ask", where: "page", do: "Ask for the tickets, in a new conversation — it joins the queue.", say: LINE, fresh: true, see: "“Your position is 14,203”" },
      { lbl: "the seats", where: "page", do: "Ask about the seats while it waits — A 400 · B 900 · C 1200 become sentences in the conversation.", say: SEATS, see: "a seat map, read into the conversation" },
      { lbl: "sell · skip", where: "page", do: "Press SELL THE GOOD SEATS, then SKIP THE WAIT.", act: "sell", see: "section A is gone; the conversation still says 400" },
      { lbl: "buy A", where: "page", do: "Tell it to buy from what it remembers.", say: BUY, see: "fence.py answers first: reason stale_plan, actually 0 — the venue was never called" },
      { lbl: "then C", where: "page", do: "Pick again — a fresh plan passes the fence.", say: THEN_C, see: "2× C · $190" },
      { lbl: "adk web", where: "workbench", do: "Open the purchase event — its response was written by fence.py, not the venue.", act: "wb", see: "the attempt, the refusal written by your code, and the purchase that passed" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "buyer_agent", marker: `# ${M.fence}`, afterMarker: M.fence, change: [`# ${M.fence}`, M.fence], fix: uncomment(M.fence), afterHint: "lands on your next message" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/fence.py · refresh_before_purchase", "agent/concert/fence.py"], ["agent/concert/tools.py · purchase · Idempotency-Key", "agent/concert/tools.py"], ["venue/app.py · /purchase", "venue/app.py"], ["lab/progress.py · fence_receipt", "lab/progress.py"]],
    done: "Refused by your code, before the venue.",
    check: "a stale_plan refusal from fence.py, no 409 from the venue in that turn, and an order in another section",
    now: (p) => { const f = p?.fence; const on = p?.code?.fence; const s = lastStage(p); const a = p?.venue?.section_a?.find((e) => e.weekday === "Saturday");
      if (!on) return f?.before ? { n: 1, note: "that was the venue saying no, after the attempt reached it. Now the fence: delete the “# ”, RESET the venue, ↻ new conversation" } : { n: 1 };
      if (p?.lit?.["4"]) return { n: 8 };
      if (f?.after) return { n: 6 };
      if (!s || s.kind !== "LlmAgent" || !s.tools.includes("join_queue")) return askedWhich(s) ? { n: 2, note: "it asked which show — say “The Saturday show, please.” and it joins the queue" } : { n: 2 };
      if (!s.tools.includes("get_seatmap")) return { n: 3, note: s.turn_tools?.length === 0 || /front|wait/i.test(s.reply) ? "it declined to read the map while queued — ask again until it lists A 400 · B 900 · C 1200" : undefined };
      if (a && a.available > 0) return { n: 4 };
      return { n: 5 }; },
    ticks: (p) => { const f = p?.fence; const s = lastStage(p); return [
      tick("a seat map in the conversation", Boolean(s?.tools.includes("get_seatmap")) || Boolean(f?.after), "ask about the seats while it waits"),
      tick("fence.py answered purchase: stale_plan", Boolean(f?.after), "SELL THE GOOD SEATS · SKIP THE WAIT · “Buy the two section A seats.”"),
      tick("no 409 from the venue in that turn", Boolean(f?.after && !f.after.venue_409), "the attempt never left the process"),
      tick("an order in another section", Boolean(f?.after?.order), "“Then section C, two seats.”")]; },
    nums: (p) => { const a = p?.venue?.section_a?.find((e) => e.weekday === "Saturday"); return [
      { k: "section A", v: a ? `${a.available} left` : "—", s: "saturday · live", cls: a && a.available === 0 ? "bad" : "hi" },
      { k: "fence", v: p?.code?.fence ? "armed" : "off", s: p?.code?.fence ? "before every purchase" : "purchase goes straight through", cls: p?.code?.fence ? "ok" : "" },
      ordersRead(p)]; },
    tiles: (p) => { const f = p?.fence; const out: Tile[] = [];
      if (f?.before) out.push({ k: "as shipped · who said no", v: "the venue · 409", cls: "bad", s: `sold_out — after purchase reached it. ${f.before.order ? `then ${f.before.order.section} · ${money(f.before.order.total)}` : "no order; it handed the re-read back to you"}` });
      if (f?.after) out.push({ k: "with the fence · who said no", v: "fence.py", cls: "ok", s: `reason stale_plan · actually ${f.after.actual ?? 0} · believed ${f.after.believed ?? "— (the old map lived in the conversation; temp: was gone)"}` },
        { k: "venue calls in that turn", v: f.after.venue_409 ? "1" : "0", cls: f.after.venue_409 ? "bad" : "ok", s: f.after.venue_409 ? "the venue still answered 409" : "the attempt never left the process" },
        ...(f.after.order ? [{ k: "the order", v: `${f.after.order.section} · ${money(f.after.order.total)}`, cls: "hi" as const, s: "a fresh plan — the live map agreed, so the fence let it through" }] : []));
      return out; },
    mapLine: (p) => (p?.lit?.["4"] ? "⛩ the fence refused once before the venue was asked; the order that followed came from a fresh read." : p?.code?.fence ? "⛩ refresh_before_purchase runs before every purchase — a dict returned there never reaches the venue." : "purchase goes straight to the venue with whatever seat map the conversation holds."),
    wbGuide: (p) => ({ steps: [`open <b>${p?.fence?.after?.session_id || "your session"}</b> and find the ⚡ <b>purchase</b> event for section A`, "its response reads <code>reason: stale_plan · actually_available: 0</code> — a dict returned by the callback. The venue’s feed shows <i>calling purchase</i> with no order behind it", "the next ⚡ <b>purchase</b> (section C) carries the venue’s own answer: an order id"], see: "the attempt, the refusal written by your code, and the purchase that passed — in a row." }) },

  { n: 5, roman: "V", name: "the graph", pill: ["edit", "SWAP ONE"], phase: 3, scene: "graph",
    star: { img: "/art/rook.jpg", name: "the agent", role: "the last node of the graph" },
    hook: "At 3am, who decides the order of things? The model — nearly every time.",
    why: ["a Workflow makes the rules nodes and keeps the model where judgement is",
      "Some steps have no judgement in them: take exactly one queue ticket, ask whether it is your turn, write the brief. A <b>Workflow</b> makes those <b>function nodes</b> (the same every night) and keeps <b>agent nodes</b> only where a decision lives (<code>pick_show</code>; your agent, last, when section A is gone). The wait is a node returning <code>RequestInput</code>: the run <b>parks</b>, the process may exit, and every wake-up re-enters the graph from <code>START</code> — <code>rerun_on_resume=False</code> on <code>pick_show</code> and <code>queue_up</code> is why it does not pick again or take a second ticket. On this page the clock’s door answers the parked run: a wake-up with no session named goes to the stage’s interrupt, not to a new session. One more rule of the graph: an agent node cannot be first. It responds to its input, and straight after <code>START</code> with no user message there is nothing to respond to — the run hangs with no error. <code>open_the_night</code> exists to say the sentence a person would have said."],
    steps: [
      { lbl: "go, as shipped", where: "page", do: "Say “go” to the conversation, as shipped. Watch which tools the model picks — it chose that order.", say: GO, fresh: true, see: "a different order every time: recall, search, a question back — or it joins the queue" },
      { lbl: "swap the line", where: "editor", do: "Swap the one line — the root becomes the graph; your agent is its last node.", act: "edit", see: "saved · lands on your next message" },
      { lbl: "go", where: "page", do: "Say “go” again, in a new conversation — open → pick_show → queue_up → check_front run in order and park.", say: GO, fresh: true, see: "parked at #14,203 · one ticket at the venue" },
      { lbl: "🐓", where: "page", do: "Press 🐓 — the clock’s sentence answers the pause.", act: "wake", see: "only check_front runs · no model call · still one ticket · a lower number" },
      { lbl: "skip, 🐓", where: "page", do: "SKIP THE WAIT, then 🐓 once more — at the front: brief, then your agent buys.", act: "skipwake", see: "2× A · $420, inside the $250 a seat nightly.py names" },
      { lbl: "adk web", where: "workbench", do: "The graph view: nodes turn green; the <code>adk_request_input</code> event has its own answer box.", act: "wb", see: "edges with 2× badges, one ticket at the venue" },
    ],
    edit: { file: "agent/concert/agent.py", symbol: "root_agent", marker: M.graphWas, afterMarker: M.graphNow, change: [M.graphWas, M.graphNow], fix: swapLine(M.graphWas, M.graphNow), swap: true, afterHint: "lands on your next message — the stage runs the graph" },
    sources: [["agent/concert/agent.py · the line", "agent/concert/agent.py"], ["agent/concert/nightly.py · the graph", "agent/concert/nightly.py"], ["monstertix/handlers.py · pending_interrupt", "monstertix/handlers.py"], ["lab/runner.py · the clock answers the stage", "lab/runner.py"], ["lab/progress.py · graph_receipt", "lab/progress.py"]],
    done: "Three entries, one ticket, one order.",
    check: "a run of the graph parked on an adk_request_input, two clock wake-ups that answered it, one ticket at the venue at every park, one order",
    now: (p) => { const on = p?.code?.graph; const b = p?.graph?.before, g = p?.graph?.after; const s = lastStage(p);
      if (!on && !b) return { n: 1 };
      if (!on) return { n: 2 };
      if (!g || (s && s.kind !== "Workflow")) return { n: 3 };
      if (g.parks && !g.wakeups && !g.order) return { n: 4 };
      if (g.wakeups === 1 && !g.order) return { n: 5 };
      if (!g.order) return { n: 5, note: "at the front but no order yet — read the reply on the stage, then 🐓 again" };
      if (!p?.lit?.["5"]) return { n: 3, note: g.wakeups < 2 ? "it bought — but the clock answered the pause only once. RESET, ↻ new conversation, “go”, 🐓, SKIP, 🐓" : `it bought, but the venue held ${g.tickets.join(", ")} tickets at the parks — RESET, ↻ new conversation and run the chapter once more` };
      return { n: 7 }; },
    ticks: (p) => { const g = p?.graph?.after; return [
      tick("the graph parked on an adk_request_input", Boolean(g?.parks), "↻ new conversation, then “go”"),
      tick("the clock answered the pause", Boolean(g?.wakeups), "press 🐓 — a wake-up with no session named answers the stage"),
      tick("one ticket at the venue at every park", Boolean(g?.one_ticket && g.wakeups), "two tickets means a wake-up started a new run"),
      tick("one order", Boolean(g?.order), "SKIP THE WAIT, then 🐓")]; },
    nums: (p) => { const g = p?.graph?.after; return [queueRead(p),
      { k: "wake-ups", v: String(g?.wakeups ?? 0), s: g?.wakeups ? "answered the pause" : "the clock", cls: "hi" },
      { k: (p?.venue?.tickets ?? 0) === 1 ? "ticket" : "tickets", v: String(p?.venue?.tickets ?? 0), s: "at the venue", cls: (p?.venue?.tickets ?? 0) > 1 ? "bad" : (p?.venue?.tickets ?? 0) === 1 ? "ok" : "" }]; },
    tiles: (p) => { const b = p?.graph?.before, g = p?.graph?.after; const out: Tile[] = [];
      if (b) out.push({ k: "as shipped · “go” to a conversation", v: `${b.tools.length} calls`, cls: "bad", s: `${b.tools.join(" · ") || "no tool"} — then ${/\?\s*$/.test(b.reply) ? "a question back" : "a reply"}. The model chose the order` });
      if (g) { const ran = g.nodes.filter((n) => n !== "concert").join(" → ") + (g.nodes.includes("concert") ? " → your agent" : "");
        out.push({ k: "the graph · nodes that ran", v: `${g.nodes.length} nodes`, cls: "ok", s: ran },
          { k: "entries into the graph", v: String(g.entries), cls: "hi", s: `“go” + ${g.answers} answers to the pause · pick_show and queue_up ran once (rerun_on_resume=False)` },
          { k: "tickets at the venue at each park", v: g.tickets.map((t) => String(t ?? "?")).join(" · ") || "—", cls: g.one_ticket ? "ok" : "bad", s: g.one_ticket ? `parked at ${g.positions.map(pos).join(" → ")} — one ticket, every time` : "more than one — a wake-up started a new run instead of answering" },
          ...(g.order ? [{ k: "the order", v: `${g.order.section} · ${money(g.order.total)}`, cls: "hi" as const, s: `${(g.order.weekday || "").toLowerCase()} · ${g.order.seats}× · bought by your agent, the last node, at the front` }] : [])); }
      return out; },
    mapLine: (p) => { const g = p?.graph?.after; return g?.lit ? `the graph parked ${g.parks}× on one ticket; the clock answered the pause ${g.wakeups}× through the back edge.` : p?.code?.graph ? "the graph is the root; a wake-up with no session named answers the stage’s parked run." : "the model orders the steps; a Workflow makes the rules nodes."; },
    wbGuide: (p) => { const sid = p?.graph?.after?.session_id || p?.stage?.session_id; return { steps: ["reload the drawer — the dropdown still says <b>concert</b>, but the left panel now draws a <b>graph</b>", `Sessions: open <b>${sid || "your session"}</b> — open_the_night → pick_show → queue_up → check_front are green and the run stopped`, "the last event is ⚡ <b>adk_request_input</b> with an <b>Enter your response…</b> box of its own. ⚠ That box answers the pause; the chat box at the bottom starts a NEW run and takes a second ticket. (The stage’s talk box and the clock’s door already answer the pause for you.)", "after 🐓: the edges into pick_show, queue_up and check_front carry a 2× / 3× badge — walked again, not run again"], see: "a graph parked on one interrupt, edges counted per wake-up, and one queue ticket at the venue — rerun_on_resume=False doing real work." }; } },

  { n: 6, roman: "VI", name: "the budget", pill: ["edit", "EDIT ONE"], phase: 3, scene: "budget",
    star: { img: "/art/sam-hero.jpg", name: "Sam", role: "the second ticket · inside what you said" },
    hook: "It can buy on its own now. Who said how much? Chapter V spent “up to $250 per seat” — a string in nightly.py that nobody agreed to.",
    why: ["the same interrupt, aimed at a person; the sentence goes into session state",
      "The same interrupt that waits for a venue can wait for a <b>person</b>. <code>agree_budget</code> returns a <code>RequestInput</code> aimed at you, reads your answer back, and stores <b>the sentence</b> — not a schema — in <b>session state</b> (no prefix: a limit agreed for this booking, not forever). Three things make it work: <code>rerun_on_resume=True</code>, a <b>stable</b> <code>interrupt_id</code> (<code>budget:ask</code>, <code>budget:confirm</code>), and reading the answer from <code>ctx.resume_inputs</code>. And <code>someone_is_there()</code> is a fact about the <b>request</b>: <code>/api/say</code> marks a person present for that request only; <code>/api/wake</code> does not, so at 3am the node takes the standing budget instead of stopping on a question nobody will answer."],
    steps: [
      { lbl: "delete the “# ”", where: "editor", do: "Delete the “# ” — <code>agree_budget</code> becomes the first node.", act: "edit", see: "saved · lands on your next message, in a new conversation" },
      { lbl: "ask", where: "page", do: "Ask for the tickets, in a new conversation — the run stops before any tool runs and asks what you will spend.", say: ASK, fresh: true, see: "“Before I book anything: what are you willing to spend?”" },
      { lbl: "answer", where: "page", do: "Answer the way people answer, in the same box — it reads your sentence back.", say: BUDGET_SENTENCE, see: "“So: … Have I got that right?”" },
      { lbl: "yes", where: "page", do: "Confirm — the sentence lands in session state and four nodes run off one “yes”.", say: YES, see: "parked at #14,203; the State tab holds budget, no prefix" },
      { lbl: "skip, 🐓", where: "page", do: "SKIP THE WAIT, then 🐓 — nobody is there, and it does not ask again.", act: "skipwake", see: "it buys inside your sentence: $210 a seat against “250 if they’re the good ones”" },
      { lbl: "adk web", where: "workbench", do: "State tab: <code>budget</code> — your sentence, verbatim, no prefix. New Session → it is gone, and the graph asks again.", act: "wb", see: "a limit that lives exactly as long as the conversation" },
    ],
    edit: { file: "agent/concert/nightly.py", symbol: "NIGHT", marker: `# ${M.budget}`, afterMarker: M.budget, change: [`# ${M.budget}`, M.budget], fix: uncomment(M.budget), afterHint: "lands on your next message — in a new conversation" },
    sources: [["agent/concert/nightly.py · the line", "agent/concert/nightly.py"], ["agent/concert/nightly.py · agree_budget", "agent/concert/nightly.py"], ["agent/concert/budget.py · someone_is_there()", "agent/concert/budget.py"], ["lab/runner.py · mark_attended on /api/say", "lab/runner.py"], ["lab/progress.py · budget_receipt", "lab/progress.py"]],
    done: "Two questions, your sentence, one order inside it, and a 3am wake-up that asked nothing.",
    check: "budget in session state equal to a sentence you typed, budget:ask and budget:confirm answered, an order, and a clock wake-up in that session that asked nothing",
    now: (p) => { const on = p?.code?.budget; const a = p?.budget?.after; const s = lastStage(p);
      if (!p?.code?.graph) return { n: 1, note: "chapter V first: the root must be the graph (root_agent = nightly) before agree_budget can be its first node" };
      if (!on) return { n: 1 };
      if (p?.lit?.["6"]) return { n: 7 };
      if (!a || (s && s.kind === "Workflow" && !s.turn_interrupts?.length && !a.asked)) return { n: 2 };
      if (a.asked && !a.confirmed) return { n: 3 };
      if (a.confirmed && !a.agreed) return { n: 4 };
      if (a.agreed && !a.order) return { n: 5 };
      return { n: 2, note: !a.typed ? "the budget in state is not a sentence you typed on the stage — ↻ new conversation and answer in the talk box, not in adk web" : "the order is in, but the clock never answered this session’s pause — RESET, ↻ new conversation, and run the five sentences again" }; },
    ticks: (p) => { const a = p?.budget?.after; return [
      tick("it asked before any tool ran · budget:ask", Boolean(a?.asked), "↻ new conversation, then ask"),
      tick("it read your sentence back · budget:confirm", Boolean(a?.confirmed), "answer in the same box"),
      tick("budget in session state, verbatim", Boolean(a?.sentence && a.typed), "say “Yes, that’s right.”"),
      tick("an order inside it", Boolean(a?.order), "SKIP THE WAIT, then 🐓"),
      tick("the 3am wake-up asked nothing", Boolean(a?.unattended), "nobody there — and nothing left to ask")]; },
    nums: (p) => { const a = p?.budget?.after; const on = p?.code?.budget; return [
      { k: a?.questions === 1 ? "question" : "questions", v: String(a?.questions ?? 0), s: "before spending", cls: a?.questions ? "ok" : on ? "hi" : "bad" },
      { k: "budget", v: a?.sentence ? "yours" : "default", s: a?.sentence ? a.sentence : "up to $250 per seat · nightly.py", cls: a?.sentence ? "ok" : "" },
      ordersRead(p)]; },
    tiles: (p) => { const b = p?.budget?.before, a = p?.budget?.after, pr = p?.budget?.probe; const out: Tile[] = [];
      if (b) out.push({ k: "as shipped · the [open] line", v: "nobody asked", cls: "bad", s: `“${b.open}” — a constant in nightly.py${b.order ? `, then ${b.order.seats}× ${b.order.section} · ${money(b.order.total)}` : ""}` });
      if (a) { out.push({ k: "questions before spending", v: String(a.questions), cls: "ok", s: "budget:ask · budget:confirm — both stopped the run, both answered in the same box" });
        if (a.sentence) out.push({ k: "the sentence · session state, no prefix", v: `“${a.sentence}”`, cls: a.typed ? "ok" : "bad", s: a.typed ? "verbatim — you typed it; a new session starts with none" : "not a sentence you typed on the stage" });
        if (a.request) out.push({ k: "request · session state", v: `“${a.request.replace(/\s*\n\s*/g, " · ").slice(0, 72)}${a.request.length > 72 ? "…" : ""}”`, cls: "hi", s: "everything you typed in this conversation, joined — what_they_asked_for() keeps the text, no fields, so open_the_night can hand the picker your own words at 3am" });
        if (a.order) out.push({ k: "seat price vs your sentence", v: `${money(a.order.unit_price)} a seat`, cls: "hi", s: `${a.order.seats}× ${a.order.section} · ${money(a.order.total)} — against “${a.sentence}”. The model’s judgement, not a parsed number` });
        out.push({ k: "the 3am wake-up", v: a.unattended ? "did not ask" : "—", cls: a.unattended ? "ok" : "bad", s: a.unattended ? "agree_budget re-ran (rerun_on_resume=True), found your sentence in state, and let the night run" : "no unattended wake-up in this session yet — SKIP THE WAIT, then 🐓" }); }
      if (pr) out.push({ k: "a fresh 3am session · someone_is_there()", v: "false", cls: "hi", s: `“[agree_budget] ${pr.text}” — nothing agreed, nobody to ask: the default, not a question` });
      return out; },
    mapLine: (p) => { const b = p?.budget?.after; return b?.lit ? `two doors, one Runner: /api/say was asked (${b.questions} questions); /api/wake found the budget agreed and asked nothing.` : p?.code?.budget ? "agree_budget is the first node: /api/say marks a person present, /api/wake does not." : "the same RequestInput, aimed at a person."; },
    wbGuide: (p) => { const sid = p?.budget?.after?.session_id || p?.stage?.session_id; return { steps: [`Sessions: open <b>${sid || "your session"}</b> — the first event is ⚡ <b>adk_request_input</b> with id <code>budget:ask</code>, before any tool`, "the next ⚡ adk_request_input is <code>budget:confirm</code> — the read-back. Both were answered from the stage’s box; in adk web you would answer in <b>each event’s own box</b>, never the chat box", "<b>State</b> tab: <code>budget</code> — your sentence, no prefix; <code>request</code> — everything you typed, joined", "<b>New Session</b> (top left), type the ask again: the graph stops on budget:ask once more — the budget died with the conversation it was agreed in"], see: "a limit in a person’s own words, living exactly as long as the conversation — and asked for again the moment there is a new one." }; } },

  { n: 7, roman: "VII", name: "breakfast", pill: ["gold", "THE MESSAGE"], phase: 3, scene: "breakfast",
    star: { img: "/art/clock-hero.jpg", name: "the clock", role: "7:30 · wake up" },
    hook: "Six stubs. What did it do while you slept?",
    why: ["every stub is a receipt; two URIs and one env var separate this page from production",
      "Every stub on this page is torn by a <b>receipt</b>: a session the clock made, a recall call, one ticket under two boots, a refusal written by your code, one ticket under two wake-ups, a sentence in state. The page never ticks a checklist. The agent, its tools, its callbacks and the budget are what you would deploy — two URIs and one environment variable change, and nothing else does."],
    steps: [{ lbl: "the phone", where: "page", do: "Read the message on the phone.", act: "phone", see: "six lines, each a number you produced" }],
    sources: [["lab/progress.py · what tears a stub", "lab/progress.py"], ["scripts/walk.py · the headless learner", "scripts/walk.py"], ["lab/runner.py · the two doors", "lab/runner.py"]],
    done: CLOSING,
    check: "six stubs · the breakfast message",
    now: (p) => (p?.lit?.["7"] ? { n: 2 } : { n: 1, note: `${["1", "2", "3", "4", "5", "6"].filter((k) => !p?.lit?.[k]).map((k) => CHAPTERS[Number(k) - 1].roman).join(" · ")} still untorn — the phone shows what is in so far` }),
    ticks: (p) => [tick(`six stubs · ${["1", "2", "3", "4", "5", "6"].filter((k) => p?.lit?.[k]).length} of 6`, Boolean(p?.lit?.["7"]), "the phone shows what is in so far")],
    nums: (p) => [{ k: "stubs torn", v: `${["1", "2", "3", "4", "5", "6"].filter((k) => p?.lit?.[k]).length} / 6`, s: "receipts, not clicks", cls: "hi" }, ordersRead(p), { k: "wake-ups", v: String(p?.clock_runs ?? 0), s: "the clock", cls: "" }],
    tiles: () => [],
    mapLine: () => "two URIs and one environment variable later, the same agent runs on Cloud Run with Cloud Scheduler as its clock.",
    wbGuide: () => ({ steps: ["Sessions: the whole night as ADK recorded it — yours and the clock’s, in one list"], see: "every run, in order." }) },
];
