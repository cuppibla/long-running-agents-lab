/** The eight pages, in the language of VibeStudio Haunted Edition: one chapter per page,
 *  one colour per chapter, a 16:9 scene on top, the concept said term-first, then the
 *  stage, your edit, before you run, run it, verify. The numbers and the steps come from
 *  lib/chapters.ts (locked, measured on gemini-2.5-flash); this file holds the page copy. */
import { CHAPTERS, type Chapter } from "./chapters";

export type Slug = "story" | "clock" | "memory" | "kill" | "news" | "graph" | "budget" | "breakfast";
export const SLUGS: Slug[] = ["story", "clock", "memory", "kill", "news", "graph", "budget", "breakfast"];
export const C = {
  cyan: "var(--vibe-cyan)", blue: "var(--vibe-blue)", amber: "var(--vibe-amber)", purple: "var(--vibe-purple)", green: "var(--vibe-green)", red: "var(--vibe-red)",
  muted: "var(--fg-muted)", hairline: "var(--hairline)",
};
/** the graph's kinds, coloured the way the reference colours its nodes */
export const KIND = { function: C.hairline, agent: C.purple, waits: C.amber, fence: C.blue, store: C.green, clock: C.amber } as const;
export const LEGEND: [string, string][] = [["function node", KIND.function], ["agent as a node", KIND.agent], ["waits · your decision (RequestInput)", KIND.waits], ["the fence, then the venue", KIND.fence], ["a place a fact survives", KIND.store]];

export type Page = {
  slug: Slug; n: number; roman: string; label: string; color: string; scene: string;
  kicker: string; title: string; blurb: string;                                   // html
  concept?: { h2: string; body: string; chips: [string, string][] };               // html body · [label, colour]
  stageH2?: string;
  edit?: { title: string; intro: string };                                         // html
  run?: { h2: string; intro: string; big: "wake" | "kill" | "sell" | "wb"; bigLabel: string };
  verify?: { intro: string };
  cta: string; next: Slug | null;
};

export const PAGES: Page[] = [
  { slug: "story", n: 0, roman: "0", label: "The night", color: C.cyan, scene: "/art/haunted/hero.jpg",
    kicker: "Chapter 0 · the night", title: "An agent that waits in line while you sleep.",
    blurb: "Most ticketing sites put you in a queue. You start behind 14,000 people, the queue moves for forty minutes, and your turn comes at 3am. This lab builds the agent that takes your place in that line: it wakes on its own, remembers what you told it last week, survives having its process killed, re-reads the world before it spends, and buys inside a limit you agreed out loud.",
    cta: "Wake it at 3am", next: "clock" },

  { slug: "clock", n: 1, roman: "I", label: "I · the clock", color: C.amber, scene: "/art/haunted/scene-clock.jpg",
    kicker: "Chapter I · the clock · press one", title: "You told it to buy the moment the presale opens. It agreed. Why did nothing happen?",
    blurb: "<code>instruction=</code> is a string handed to the model when somebody sends a message. Nothing reads it between turns. Being awake needs two halves: <b>the trigger</b>, an endpoint with a <code>Runner</code> behind it, and <b>the triggerer</b>, something with a clock that calls it. Here the triggerer is <code>clock.py</code>: a sleep and a POST. In production it is Cloud Scheduler.",
    concept: { h2: "A prompt cannot start itself.",
      body: "Read the plan you will type with fresh eyes. <i>Keep checking.</i> <i>The moment it opens.</i> Every one of those describes something happening <b>over time</b>, and the only thing that runs is the turn you just sent. So something outside the agent has to call it — and that something can be eleven lines of Python. The model never runs your code: a ⚡ <code>search_events</code> row means the model <i>asked</i> for that call and ADK ran the function. No wording gets around it — “set a timer for 10:00”, “check every five minutes”, “act autonomously” all fail the same way.",
      chips: [["the trigger = POST /api/wake", C.cyan], ["the triggerer = clock.py --in 10", C.amber], ["later = Cloud Scheduler", C.green]] },
    stageH2: "MonsterTix, the page the agent is behind.",
    run: { h2: "Wake it at 3am.", intro: "Say the plan on the stage, then take your hands off the keyboard for a minute. Then press the button: the clock job fires once, ten seconds later, with nobody typing — it POSTs the same sentence to the unattended door.", big: "wake", bigLabel: "🐓 Wake it at 3am" },
    verify: { intro: "Read from lab.db and the job log, not from a checklist. The chapter is done when a session the clock created holds at least one tool call." },
    cta: "Where a fact lives", next: "memory" },

  { slug: "memory", n: 2, roman: "II", label: "II · where a fact lives", color: C.purple, scene: "/art/haunted/scene-memory.jpg",
    kicker: "Chapter II · where a fact lives · edit one", title: "It asked you which show — at 3am, into the dark. Sam can’t do weeknights. You said so last week. Where did that go?",
    blurb: "A fact can live in four places, and each lasts a different time: <code>temp:</code> (one invocation, stripped on the way to disk) · <b>session state</b> (this booking) · <code>user:</code> (every session this person has) · a <b>memory file</b> (survives deleting the database). <code>recall()</code> reads that file through ADK’s <code>BaseMemoryService</code>. The one line you delete gives the agent <code>recall</code> and <code>remember</code>.",
    concept: { h2: "The conversation is the worst place to keep a fact.",
      body: "Every three turns ADK replaces it with a <b>paraphrase</b> you never wrote — <code>EventsCompactionConfig(compaction_interval=3, overlap_size=1)</code> on the App, one more event row in lab.db under <code>actions.compaction</code>. Nothing kept in state is touched by it: <code>user:prefs</code>, and <code>budget_plan</code> (the arithmetic agent’s <code>output_key</code> — its latest answer replaces the one before), come back exactly as they went in. The two optional sentences and the longer conversation each show one place a fact goes.",
      chips: [["temp: · one invocation", C.muted], ["session state · this booking", C.green], ["user: · every session", C.purple], ["memory/userx.md · recall()", C.green], ["compaction · a paraphrase", C.red]] },
    stageH2: "Tell it a fact. Then let the clock read the file.",
    edit: { title: "Delete the “# ” on <code>recall, remember,</code>", intro: "One line in <code>agent/concert/agent.py</code> gives the agent <code>recall</code> and <code>remember</code>. Save, then press 🐓 again — the clock, the stage and adk web all re-read the file on their next run." },
    run: { h2: "Wake it again.", intro: "Same sentence, same clock. This time ⚡ recall is the first call, and the order is the Saturday show for two. “Sam, by the way”, the seat map and ▶ the longer conversation are optional — eight turns is what compaction needs.", big: "wake", bigLabel: "🐓 Wake it again" },
    verify: { intro: "A wake whose events include recall, and whose order is the Saturday show (ms-ams-01). The optional rows read user:prefs, artifacts/ and the compaction events of the longer conversation." },
    cta: "The kill", next: "kill" },

  { slug: "kill", n: 3, roman: "III", label: "III · the kill", color: C.red, scene: "/art/haunted/scene-kill.jpg",
    kicker: "Chapter III · the kill · edit one", title: "The queue is 14,203 long. Your laptop will sleep before it reaches the front. What survives?",
    blurb: "<code>join_queue</code> returns a <b>handle</b> to work that is not finished: a ticket and a position. Wrapped as a <code>LongRunningFunctionTool</code>, the run stops after it; <code>ResumabilityConfig</code> is what lets it stop. What a new process reads is <code>lab.db</code>: the ticket in state and the call in the history. Your next sentence is a new turn on that session, and the agent checks the queue it is already in.",
    concept: { h2: "A text message never resumes an invocation. The session does the surviving.",
      body: "In ADK 2.9.2 only a function response resumes a paused invocation; plain text starts a new one. That is not a loss: the session store already holds <code>queue_ticket</code> and the <code>join_queue</code> response, so the model calls <code>check_queue</code> instead of joining again. One ticket, two boots. Why <code>join_queue</code> and not <code>check_queue</code>: both return in milliseconds, but only one hands back work that is <i>not finished</i>. Wrap the other and the run would park every time it asked where it was — including at “at the front, buy now”.",
      chips: [["LongRunningFunctionTool", C.red], ["ResumabilityConfig(is_resumable=True)", C.red], ["lab.db · sqlite", C.green]] },
    stageH2: "Ask for the tickets, kill it, ask where you are.",
    edit: { title: "Delete the “# ” on the queue line", intro: "One line in <code>agent/concert/agent.py</code> gives the agent <code>join_queue</code> wrapped as a long-running tool, and <code>check_queue</code>. Save, then ask for the tickets on the stage." },
    run: { h2: "Kill the process. Then ask again.", intro: "Two sentences and one button. The lamp goes dark, the server really dies, and comes back as a new boot reading the same database.", big: "kill", bigLabel: "💀 Kill the process" },
    verify: { intro: "One <code>queue_ticket</code> in the session’s state, seen under two boot ids, and exactly one ticket at the venue." },
    cta: "Old news", next: "news" },

  { slug: "news", n: 4, roman: "IV", label: "IV · old news", color: C.blue, scene: "/art/haunted/scene-news.jpg",
    kicker: "Chapter IV · old news · edit one", title: "It came back from the wait holding a seat map. Those seats sold twelve minutes in. Why did it buy anyway?",
    blurb: "A <code>before_tool_callback</code> runs in the instant before <code>purchase</code>: it re-reads live inventory, and <b>returning a dict short-circuits the tool</b>, so the stale plan never reaches the venue. The seat map it read while waiting is still in the <b>conversation</b>; its <code>temp:seatmap</code> copy died with that turn, which does not help.",
    concept: { h2: "An agent holding an old fact does not ask. It acts.",
      body: "An agent that is <i>missing</i> a fact asks. An agent holding an <i>old</i> fact just acts — nothing is missing from its context, the wrong thing is present. As shipped the venue itself says no, with a 409, <i>after</i> purchase reached it. With the fence, <code>fence.py</code> answers first: reason <code>stale_plan</code>, actually 0, and the venue was never called. The <code>Idempotency-Key</code> on every purchase is already in the shipped code; BREAK THE NEXT PURCHASE shows the venue returning the same order twice.",
      chips: [["before_tool_callback", C.blue], ["returns a dict → the tool is skipped", C.blue], ["409 sold_out · the venue", C.red], ["Idempotency-Key", C.muted]] },
    stageH2: "Read the map. Sell the seats behind its back. Watch who says no.",
    edit: { title: "Delete the “# ” on <code>before_tool_callback=</code>", intro: "The fence runs before every purchase. Save, then ask for the tickets in a new conversation." },
    run: { h2: "Sell the good seats behind its back.", intro: "Ask, ask about the seats while it waits (A 400 · B 900 · C 1200 become sentences in the conversation), then sell section A out and skip the wait. “Buy the two section A seats.” is refused by your code; “Then section C, two seats.” passes — 2× C · $190.", big: "sell", bigLabel: "Sell the good seats" },
    verify: { intro: "A <code>stale_plan</code> refusal from fence.py, no 409 from the venue in that turn, and an order in another section." },
    cta: "The graph", next: "graph" },

  { slug: "graph", n: 5, roman: "V", label: "V · the graph", color: C.purple, scene: "/art/haunted/scene-graph.jpg",
    kicker: "Chapter V · the graph · swap one", title: "At 3am, who decides the order of things? The model — nearly every time.",
    blurb: "A <code>Workflow</code> makes the rules <b>function nodes</b> (the same every night) and keeps <b>agent nodes</b> only where a decision lives: <code>pick_show</code>, and your agent, last. The wait is a node returning <code>RequestInput</code>: the run <b>parks</b>, the process may exit, and every wake-up re-enters the graph from <code>START</code>.",
    concept: { h2: "Functions for rules, agents for judgement, one node that waits.",
      body: "<code>rerun_on_resume=False</code> on <code>pick_show</code> and <code>queue_up</code> is why a wake-up does not pick again or take a second ticket. On this page the clock’s door answers the parked run: a wake-up with no session named goes to the stage’s interrupt, not to a new session. One more rule of the graph: an agent node cannot be first — straight after <code>START</code> with no user message there is nothing to respond to, and the run hangs with no error. <code>open_the_night</code> exists to say the sentence a person would have said.",
      chips: [["Workflow · edges=[(START, *NIGHT)]", C.purple], ["RequestInput · the run parks", C.amber], ["rerun_on_resume=False", C.muted], ["adk_request_input · its own answer box", C.amber]] },
    stageH2: "Say go. Then let the clock answer the pause.",
    edit: { title: "Swap <code>root_agent = buyer_agent</code> for <code>root_agent = nightly</code>", intro: "The root becomes the graph; your agent is its last node. Save, then say “go” in a new conversation — the stage runs the graph." },
    run: { h2: "Go, as shipped. Then go again.", intro: "“go” to the conversation first — the model chose the order. After the swap, “go” runs open → pick_show → queue_up → check_front in order and parks at #14,203. 🐓 answers the pause: only check_front runs, no model call, 0.0 s. SKIP THE WAIT, 🐓 once more: brief, then your agent buys — 2× A · $420.", big: "wake", bigLabel: "🐓 Answer the pause" },
    verify: { intro: "A run of the graph parked on an <code>adk_request_input</code>, two clock wake-ups that answered it, one ticket at the venue at every park, one order." },
    cta: "The budget", next: "budget" },

  { slug: "budget", n: 6, roman: "VI", label: "VI · the budget", color: C.amber, scene: "/art/haunted/scene-budget.jpg",
    kicker: "Chapter VI · the budget · edit one", title: "It can buy on its own now. Who said how much? Chapter V spent “up to $250 per seat” — a string in nightly.py that nobody agreed to.",
    blurb: "The same <code>RequestInput</code> that waits for a venue can wait for a <b>person</b>. <code>agree_budget</code> returns one aimed at you, reads your answer back, and stores <b>the sentence</b> — not a schema — in <b>session state</b>, no prefix: a limit agreed for this booking, not forever.",
    concept: { h2: "A limit in your own words, living exactly as long as the conversation.",
      body: "Three things make it work: <code>rerun_on_resume=True</code>, a <b>stable</b> <code>interrupt_id</code> (<code>budget:ask</code>, <code>budget:confirm</code>), and reading the answer from <code>ctx.resume_inputs</code>. And <code>someone_is_there()</code> is a fact about the <b>request</b>: <code>/api/say</code> marks a person present for that request only; <code>/api/wake</code> does not, so at 3am the node takes the standing budget instead of stopping on a question nobody will answer.",
      chips: [["RequestInput · aimed at you", C.amber], ["budget:ask · budget:confirm", C.amber], ["state.budget · your sentence, verbatim", C.green], ["someone_is_there() · per request", C.cyan]] },
    stageH2: "Answer the way people answer.",
    edit: { title: "Delete the “# ” on <code>NIGHT.insert(0, agree_budget)</code>", intro: "<code>agree_budget</code> becomes the first node of the graph, in <code>agent/concert/nightly.py</code>. Save, then ask for the tickets in a new conversation." },
    run: { h2: "Two questions, your sentence, then nobody there.", intro: "Ask; it stops before any tool runs and asks what you will spend. Answer in a sentence; it reads it back. Say yes; four nodes run off one “yes” and park. SKIP THE WAIT, then 🐓: nobody is there, and it does not ask again — $210 a seat inside “250 if they’re the good ones”.", big: "wake", bigLabel: "🐓 Wake it · nobody there" },
    verify: { intro: "<code>budget</code> in session state equal to a sentence you typed, budget:ask and budget:confirm answered, an order inside it, and a clock wake-up in that session that asked nothing." },
    cta: "Breakfast", next: "breakfast" },

  { slug: "breakfast", n: 7, roman: "VII", label: "VII · breakfast", color: C.green, scene: "/art/haunted/scene-breakfast.jpg",
    kicker: "Chapter VII · breakfast · the message", title: "Six stubs. What did it do while you slept?",
    blurb: "Every chapter on this page was lit by a <b>receipt</b>: a session the clock made, a recall call, one ticket under two boots, a refusal written by your code, one ticket under two wake-ups, a sentence in state. The page never ticks a checklist. The agent, its tools, its callbacks and the budget are what you would deploy — two URIs and one environment variable change, and nothing else does.",
    cta: "Back to the night", next: "story" },
];

export const pageOf = (slug: string): Page => PAGES.find((p) => p.slug === slug) || PAGES[0];
export const chapterOf = (p: Page): Chapter | null => (p.n >= 1 && p.n <= 7 ? CHAPTERS[p.n - 1] : null);
export const slugOfChapter = (n: number): Slug => (PAGES.find((p) => p.n === n) || PAGES[1]).slug;
