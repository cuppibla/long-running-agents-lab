/** The eight pages, in the language of VibeStudio Haunted Edition: one chapter per page,
 *  one colour per chapter, a 16:9 scene on top, a title that is the chapter's term, the
 *  concept said term-first, then the stage, your edit, before you run, run it, verify. The numbers and the steps come from
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
  kicker: string; title: string;                                                  // the title is a few words of terminology — the chapter's theme
  concept?: { h2: string; body: string; chips: [string, string][] };               // html body · [label, colour]
  stageH2?: string;
  edit?: { title: string; intro: string };                                         // html
  run?: { h2: string; intro: string; big: "wake" | "kill" | "sell" | "wb"; bigLabel: string };
  verify?: { intro: string };
  cta: string; next: Slug | null;
};

export const PAGES: Page[] = [
  { slug: "story", n: 0, roman: "0", label: "The night", color: C.cyan, scene: "/art/haunted/hero.jpg",
    kicker: "Chapter 0 · the night", title: "Long-running agents",
    cta: "Wake it at 3am", next: "clock" },

  { slug: "clock", n: 1, roman: "I", label: "I · the clock", color: C.amber, scene: "/art/haunted/scene-clock.jpg",
    kicker: "Chapter I · the clock · press one", title: "Trigger & triggerer",
    concept: { h2: "A prompt cannot start itself.",
      body: "<i>Keep checking</i> describes something happening <b>over time</b>, and the only thing that runs is the turn you just sent. So something outside the agent has to call it — eleven lines of Python with a clock. “Set a timer”, “check every five minutes”, “act autonomously” all fail the same way.",
      chips: [["the trigger = POST /api/wake", C.cyan], ["the triggerer = clock.py --in 10", C.amber], ["later = Cloud Scheduler", C.green]] },
    stageH2: "MonsterTix, the page the agent is behind.",
    run: { h2: "Wake it at 3am.", intro: "Say the plan, hands off for a minute, then press the button — the clock fires once with <b>nobody typing</b>.", big: "wake", bigLabel: "🐓 Wake it at 3am" },
    verify: { intro: "A session the clock created, with at least one tool call in it." },
    cta: "Where a fact lives", next: "memory" },

  { slug: "memory", n: 2, roman: "II", label: "II · where a fact lives", color: C.purple, scene: "/art/haunted/scene-memory.jpg",
    kicker: "Chapter II · where a fact lives · edit one", title: "Context lifetime & compaction",
    concept: { h2: "The conversation is the worst place to keep a fact.",
      body: "Every three turns ADK replaces the conversation with a <b>paraphrase</b> you never wrote. Anything kept in state — <code>user:prefs</code>, <code>budget_plan</code> — comes back exactly as it went in.",
      chips: [["temp: · one invocation", C.muted], ["session state · this booking", C.green], ["user: · every session", C.purple], ["memory/userx.md · recall()", C.green], ["compaction · a paraphrase", C.red]] },
    stageH2: "Tell it a fact. Then let the clock read the file.",
    edit: { title: "Delete the “# ” on <code>recall, remember,</code>", intro: "One line in <code>agent.py</code> gives the agent <b>recall</b> and <b>remember</b>." },
    run: { h2: "Wake it again.", intro: "Same sentence, same clock — this time <b>recall</b> runs first and the order is the Saturday show.", big: "wake", bigLabel: "🐓 Wake it again" },
    verify: { intro: "A wake with <b>recall</b> in it, and the Saturday order." },
    cta: "The kill", next: "kill" },

  { slug: "kill", n: 3, roman: "III", label: "III · the kill", color: C.red, scene: "/art/haunted/scene-kill.jpg",
    kicker: "Chapter III · the kill · edit one", title: "Long-running tools & resumability",
    concept: { h2: "A text message never resumes an invocation. The session does the surviving.",
      body: "The session store already holds <code>queue_ticket</code>, so a new process calls <code>check_queue</code> instead of joining again — one ticket, two boots. <code>check_queue</code> is not long-running because it returns a <b>complete answer</b>; wrapped, the run would park at “at the front, buy now”.",
      chips: [["LongRunningFunctionTool", C.red], ["ResumabilityConfig(is_resumable=True)", C.red], ["lab.db · sqlite", C.green]] },
    stageH2: "Ask for the tickets, kill it, ask where you are.",
    edit: { title: "Delete the “# ” on the queue line", intro: "One line gives the agent <b>join_queue</b>, long-running, and <b>check_queue</b>." },
    run: { h2: "Kill the process. Then ask again.", intro: "Two sentences and one button — the server really dies and comes back reading the <b>same database</b>.", big: "kill", bigLabel: "💀 Kill the process" },
    verify: { intro: "One <code>queue_ticket</code> under two boot ids, and one ticket at the venue." },
    cta: "Old news", next: "news" },

  { slug: "news", n: 4, roman: "IV", label: "IV · old news", color: C.blue, scene: "/art/haunted/scene-news.jpg",
    kicker: "Chapter IV · old news · edit one", title: "Stale data & tool callbacks",
    concept: { h2: "An agent holding an old fact does not ask. It acts.",
      body: "A <i>missing</i> fact makes an agent ask; an <i>old</i> one makes it act — the wrong thing is present. As shipped the venue says no with a 409 after the attempt reached it; with the fence, <code>fence.py</code> answers <b>stale_plan</b> first and the venue is never called.",
      chips: [["before_tool_callback", C.blue], ["returns a dict → the tool is skipped", C.blue], ["409 sold_out · the venue", C.red], ["Idempotency-Key", C.muted]] },
    stageH2: "Read the map. Sell the seats behind its back. Watch who says no.",
    edit: { title: "Delete the “# ” on <code>before_tool_callback=</code>", intro: "The <b>fence</b> runs before every purchase." },
    run: { h2: "Sell the good seats behind its back.", intro: "Let it read the map, sell section A out, then tell it to buy — <b>your code</b> says no before the venue does.", big: "sell", bigLabel: "Sell the good seats" },
    verify: { intro: "A <code>stale_plan</code> refusal from fence.py, no 409 that turn, and an order in another section." },
    cta: "The graph", next: "graph" },

  { slug: "graph", n: 5, roman: "V", label: "V · the graph", color: C.purple, scene: "/art/haunted/scene-graph.jpg",
    kicker: "Chapter V · the graph · swap one", title: "Workflow & interrupts",
    concept: { h2: "Functions for rules, agents for judgement, one node that waits.",
      body: "<code>check_front</code> returns a <b>RequestInput</b>: the run parks, the process may exit, and every wake-up re-enters from <code>START</code> — <code>rerun_on_resume=False</code> is why it does not pick again or take a second ticket. An agent node cannot be first; <code>open_the_night</code> says the sentence a person would have said.",
      chips: [["Workflow · edges=[(START, *NIGHT)]", C.purple], ["RequestInput · the run parks", C.amber], ["rerun_on_resume=False", C.muted], ["adk_request_input · its own answer box", C.amber]] },
    stageH2: "Say go. Then let the clock answer the pause.",
    edit: { title: "Swap <code>root_agent = buyer_agent</code> for <code>root_agent = nightly</code>", intro: "The root becomes the <b>graph</b>; your agent is its last node." },
    run: { h2: "Go, as shipped. Then go again.", intro: "“go” once as a conversation, once as the graph — then the clock <b>answers the pause</b> twice.", big: "wake", bigLabel: "🐓 Answer the pause" },
    verify: { intro: "A parked run, two wake-ups that answered it, one ticket at every park, one order." },
    cta: "The budget", next: "budget" },

  { slug: "budget", n: 6, roman: "VI", label: "VI · the budget", color: C.amber, scene: "/art/haunted/scene-budget.jpg",
    kicker: "Chapter VI · the budget · edit one", title: "Human in the loop",
    concept: { h2: "A limit in your own words, living exactly as long as the conversation.",
      body: "<code>agree_budget</code> stores <b>the sentence</b>, not a schema, in session state — a limit for this booking, not forever. <code>someone_is_there()</code> is a fact about the request: at 3am the node takes the standing budget instead of asking a question nobody will answer.",
      chips: [["RequestInput · aimed at you", C.amber], ["budget:ask · budget:confirm", C.amber], ["state.budget · your sentence, verbatim", C.green], ["someone_is_there() · per request", C.cyan]] },
    stageH2: "Answer the way people answer.",
    edit: { title: "Delete the “# ” on <code>NIGHT.insert(0, agree_budget)</code>", intro: "<b>agree_budget</b> becomes the first node of the graph." },
    run: { h2: "Two questions, your sentence, then nobody there.", intro: "It asks, reads you back, buys inside your sentence — and at 3am <b>asks nothing</b>.", big: "wake", bigLabel: "🐓 Wake it · nobody there" },
    verify: { intro: "Your sentence in <code>budget</code>, two questions answered, an order inside it, a 3am wake-up that asked nothing." },
    cta: "Breakfast", next: "breakfast" },

  { slug: "breakfast", n: 7, roman: "VII", label: "VII · breakfast", color: C.green, scene: "/art/haunted/scene-breakfast.jpg",
    kicker: "Chapter VII · breakfast · the message", title: "Receipts & deployment",
    cta: "Back to the night", next: "story" },
];

export const pageOf = (slug: string): Page => PAGES.find((p) => p.slug === slug) || PAGES[0];
export const chapterOf = (p: Page): Chapter | null => (p.n >= 1 && p.n <= 7 ? CHAPTERS[p.n - 1] : null);
export const slugOfChapter = (n: number): Slug => (PAGES.find((p) => p.n === n) || PAGES[1]).slug;
