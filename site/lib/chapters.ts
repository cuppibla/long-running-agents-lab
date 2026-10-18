import type { Progress } from "./api";

/** The three chapters — CHANGE ME (the chapters).
 *
 *  Each chapter: the hook (the failure, as a question) · the concept (real term
 *  first, 2–3 sentences) · steps, each with a where-chip · the one edit (was/now,
 *  and `fix` = "apply the edit for me") · the one job · SOURCE links · what you
 *  will see · a NEXT cue computed from progress · the workbench drawer's guide.
 *
 *  Nothing here lights a lamp. Lamps come from /api/progress, which reads your
 *  files and the receipts of what actually ran. Instructions live ONCE, on the
 *  tool they are about: the workbench's numbered steps are in wbGuide and are
 *  not repeated in the panel. */

export type Where = "page" | "editor" | "workbench" | "terminal" | "watch";
export type Step = { where: Where; do: string; say?: string };
export type Edit = { file: string; symbol?: string; marker: string; afterMarker: string; change: [string, string]; fix?: (src: string) => string; afterHint?: string };
// `symbol` scopes the editor to one top-level def or assignment (lab/codefile.py::symbol_span), so the line to change is in view without scrolling.
export type Chapter = {
  n: number; roman: string; name: string; pill: [string, string];
  hook: string; concept: string;
  steps: Step[];
  edit?: Edit;
  run?: { kind: string; label: string };
  sources: [string, string][];                 // [label, repo path] — opens as text in a new tab
  expect: string;
  next: (p: Progress | null) => string;        // the state-aware NEXT → cue
  check: string;                               // the sentence under the ▢
  wbGuide: { steps: string[]; see: string };   // "[line]" in a step renders the copy-the-line button
};

export const SHOW = {                          // CHANGE ME (the show)
  title: "Long-Running Agents", em: "Agents", tag: "an interactive lab on ADK · three chapters",
  blurb: "One agent at the door. It cannot tell you the code. <b>What is the smallest change that makes the exam pass?</b> Three chapters: talk to it, give it one line, read the check.",
  agent: "the greeter", lampWord: "lamps", minutes: "~15 min",
};
export const ART = { hero: "/art/hero.jpg", agent: "/art/greeter.jpg" };
export const LINE = "Hi, I'm new here. What's the door code?";
export const CLOSING = "A lamp lights from a receipt, never from a checklist.";

export const WHERE: Record<Where, string> = {
  page: "on the page", editor: "in the editor", workbench: "in the workbench", terminal: "in your terminal", watch: "watch",
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** delete the “# ” in front of the one line that contains `marker` */
export const uncomment = (marker: string) => (src: string) =>
  src.replace(new RegExp(`^(\\s*)# (${escapeRe(marker)})`, "m"), "$1$2");
/** put the “# ” back */
export const recomment = (marker: string) => (src: string) =>
  src.replace(new RegExp(`^(\\s*)(${escapeRe(marker)})`, "m"), "$1# $2");

const MARK = "tools=[door_code],";
const exams = (p: Progress | null) => p?.exams || [];
const before = (p: Progress | null) => exams(p).filter((e) => !e.edit);
const after = (p: Progress | null) => exams(p).filter((e) => e.edit);

export const CHAPTERS: Chapter[] = [
  { n: 1, roman: "I", name: "the first word", pill: ["read", "READ ONLY"],
    hook: "You can talk to it. Can anything in the system say whether the answer was any good?",
    concept: "An <b>LlmAgent</b> is a model plus an instruction. The greeter has exactly that and nothing else: no tools, no memory. A reply is text — nothing about it is checked. The workbench (<b>adk web</b>) shows the same agent and the same sessions, from the same <code>lab.db</code>.",
    steps: [
      { where: "page", do: "type the line into the stage and send it", say: LINE },
      { where: "workbench", do: "open 🔬 workbench and say it again there — the drawer has the steps" },
    ],
    sources: [["agent/agent.py", "agent/agent.py"], ["agent/instruction.txt", "agent/instruction.txt"], ["lab/say.py · the stage's call", "lab/say.py"], ["lab/workbench.py · what counts", "lab/workbench.py"]],
    expect: "A friendly greeting that cannot give you the code and says so.",
    next: (p) => !p?.last_say ? "say the line on the stage (left) — read the reply"
      : !p?.lit?.["1"] ? "now say it in 🔬 workbench (top right) — that session is the receipt"
      : "✓ lamp I is lit. Chapter II gives the greeter a tool.",
    check: "one reply in lab.db, made from the workbench",
    wbGuide: { steps: ["pick agent in the agent dropdown (top left)", "[line] → paste in the chat → send", "read the reply, then open the event: no function call anywhere"],
      see: "the same reply the stage got — and the session now exists in lab.db, which is what lights lamp I." } },

  { n: 2, roman: "II", name: "the one line", pill: ["olive", "EDIT ONE"],
    hook: "Ask for the door code. The greeter cannot tell you. What is the smallest change that makes the exam pass?",
    concept: "A <b>tool</b> is a plain Python function the model may call; ADK turns its signature and docstring into the function declaration the model sees. <code>tools=[door_code]</code> is the whole wiring. The <b>exam</b> runs the greeter on three fixed prompts and counts the replies that carry the code — a receipt, not an opinion.",
    steps: [
      { where: "page", do: "RUN THE EXAM as shipped — read the score" },
      { where: "editor", do: "delete the “# ” on the green line so the greeter gets the tool" },
      { where: "page", do: "RUN THE EXAM again" },
      { where: "workbench", do: "ask again in 🔬 workbench and open the event — the drawer says where to look" },
    ],
    edit: { file: "agent/agent.py", symbol: "root_agent", marker: `# ${MARK}`, afterMarker: MARK, change: [`# ${MARK}`, MARK], fix: uncomment(MARK), afterHint: "It lands on your next reply and your next exam." },
    run: { kind: "exam", label: "📝 run the exam · 3 prompts" },
    sources: [["agent/agent.py · the line", "agent/agent.py"], ["scripts/exam.py · the exam", "scripts/exam.py"], ["lab/jobs.py · the job runner", "lab/jobs.py"], ["lab/progress.py · what lights a lamp", "lab/progress.py"]],
    expect: "0 / 3 before the edit; 3 / 3 after, with “called door_code” beside each reply.",
    next: (p) => !before(p).length && !p?.code?.edit ? "📝 run the exam as shipped — expect 0 / 3"
      : !p?.code?.edit ? "delete the “# ” on the green line in the editor (or press “apply the edit for me”)"
      : !after(p).length ? "📝 run the exam again — the greeter has the tool now"
      : !p?.lit?.["2"] ? "the exam with the tool did not score higher yet — read its log, then run it again"
      : "✓ lamp II is lit. Say the line in 🔬 workbench and open the event: a function call. Then chapter III.",
    check: "an exam that ran with the tool scored higher than one that ran without it",
    wbGuide: { steps: ["pick agent, [line] → paste → send", "click the reply bubble → the event trace opens", "find the functionCall named door_code and its functionResponse — that is the tool, as the model saw it"],
      see: "with the edit in: a reply that carries the code and a function-call event. Without it: the polite refusal from chapter I." } },

  { n: 3, roman: "III", name: "the check", pill: ["gold", "THE CHECK"],
    hook: "Two lamps. Which of them did you earn?",
    concept: "Every lamp on this page is read from a <b>receipt</b>: a session in <code>lab.db</code>, an exam that ran before and after the edit, with the state of the file recorded inside the receipt. The page never ticks a checklist, and a lamp earned stays earned when the file changes back.",
    steps: [{ where: "page", do: "press 🧾 the check — read your two numbers" }],
    sources: [["lab/progress.py · what lights a lamp", "lab/progress.py"], ["scripts/walk.py · the headless learner", "scripts/walk.py"], ["scripts/capture.sh · the shots", "scripts/capture.sh"]],
    expect: "A receipt with chapter I's session count and chapter II's two scores.",
    next: (p) => !p?.lit?.["1"] ? "lamp I is not lit — one reply in the workbench (chapter I)"
      : !p?.lit?.["2"] ? "lamp II is not lit — the exam, before and after the edit (chapter II)"
      : "✓ both lamps. 🧾 the check, please.",
    check: "two lamps · the check",
    wbGuide: { steps: ["Sessions (left rail): every reply you made, the stage's and your own, in one list"], see: "the whole evening, as ADK recorded it." } },
];
