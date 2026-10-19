// Where the lab is. Same origin when the page is served by it (the normal
// case); NEXT_PUBLIC_LAB_ORIGIN when `npm run dev` runs the page on its own.
export const ORIGIN = process.env.NEXT_PUBLIC_LAB_ORIGIN || "";
const API = "/api";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${ORIGIN}${API}${path}`, { cache: "no-store", ...init });
  if (!r.ok) {
    let msg = `${r.status} from ${path}`;
    try { const b = await r.json(); if (b?.detail) msg = typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail); } catch { /* keep */ }
    throw new Error(msg);
  }
  return r.json();
}
const post = <T,>(path: string, body: unknown, method = "POST") =>
  j<T>(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export type Order = { id: string; event_id: string; section: string; seats: number; unit_price: number; total: number; weekday?: string | null; city?: string | null; created_at?: number };
export type CodeFacts = { recall: boolean; queue: boolean; fence: boolean; graph: boolean; budget: boolean; memory_facts?: number };
/** One run of the agent — the receipt lab/runner.py writes after every /api/say and /api/wake. */
export type Wake = {
  ts: number; source: "stage" | "clock"; attended: boolean; who: string; session_id: string; message: string;
  said: string[]; reply: string; awaiting: boolean; tools: string[]; calls: number; turn_tools?: string[]; tools_in_file: string[]; kind: string;
  orders_new: Order[]; boot_id: string; elapsed: number; code: CodeFacts;
  db?: { events?: number; interrupts?: number; compactions?: number; invocations?: number; state?: Record<string, unknown>; responses?: ToolResponse[];
    interrupt_ids?: { id: string; answered: boolean; node: string | null }[];
    temp_keys?: string[] };            // temp: keys lab.db holds for the session after this run — always none (stripped before the write)
  artifacts?: string[]; memory_facts?: number;
  tickets?: number;                       // queue tickets the venue held when this run ended (chapter III wants exactly one)
  /** chapters V and VI: the interrupt this run ANSWERED (the stage's words, or the clock's), the interrupts it emitted,
   *  the graph nodes it walked (edges — includes nodes skipped by rerun_on_resume=False), the node lines that RAN
   *  (what nightly.py printed), and the queue position check_front reported */
  answered?: string | null; turn_interrupts?: string[]; turn_nodes?: string[]; nodes?: { node: string; text: string }[]; position?: number | null;
};
/** One tool response kept in the receipt — what the venue (or fence.py) handed the model. */
export type ToolResponse = {
  tool: "join_queue" | "check_queue" | "purchase"; invocation: string; turn: number | null;
  ticket?: string; position?: number; ready?: boolean; status?: number | string; error?: string | boolean; message?: string;
  reason?: string; believed_available?: number | null; actually_available?: number | null;
  id?: string; event_id?: string; section?: string; seats?: number; total?: number; duplicate?: boolean;
  by?: "fence" | "venue" | "?";
};
/** chapter III's receipt: one ticket, handed out under one boot and read back under another */
export type KillReceipt = { session_id: string; ticket: string; boots: [string, string]; positions: [number | null, number | null]; tickets: number | null; ts: number; lit: boolean };
/** chapter IV's receipts: the venue's own 409 (before) and fence.py's refusal (after) */
export type FenceReceipt = {
  before: { session_id: string; turn: number | null; error?: string; section?: string; order: Order | null; ts: number; reply: string } | null;
  after: { session_id: string; turn: number | null; believed: number | null; actual: number | null; venue_409: boolean; order: Order | null; ts: number; reply: string; lit: boolean } | null;
};
/** chapter V's receipts: "go" to the conversation (before) and one session of the graph (after) */
export type GraphReceipt = {
  before: { session_id: string; reply: string; tools: string[]; ts: number; awaiting: boolean } | null;
  after: { session_id: string; parks: number; positions: number[]; wakeups: number; answers: number; entries: number; tickets: (number | null)[]; one_ticket: boolean;
    order: Order | null; nodes: string[]; interrupt_ids: string[]; ts: number; reply: string; elapsed: (number | null)[]; lit: boolean } | null;
};
/** chapter VI's receipts: the [open] line that spent DEFAULT_BUDGET (before), the session that agreed one (after), the fresh unattended session (probe) */
export type BudgetReceipt = {
  before: { session_id: string; open: string; ts: number; source: string; order: Order | null } | null;
  after: { session_id: string; sentence: string; typed: boolean; asked: boolean; confirmed: boolean; agreed: boolean; questions: number; ask_text: string; confirm_text: string;
    unattended: number; order: Order | null; request: string; ts: number; reply: string; lit: boolean } | null;
  probe: { session_id: string; text: string; ts: number; asked: boolean } | null;
};
/** chapter II's longer conversation (the replay job): eight turns in one session, compaction, budget_plan, the 8-seat order */
export type ReplayReceipt = {
  after: { session_id: string; turns: number; of: number; sentences: string[]; compactions: number; compaction_at: number | null;
    plans: string[]; overwritten: boolean; split_calls: number; noted: boolean; asked_back: string; order: Order | null; eight: boolean; saturday: boolean; order_turn: number | null;
    elapsed: number; ts: number; reply: string; done: boolean; code: Partial<CodeFacts>; lit: boolean } | null;
};
export type Venue = {
  ok: boolean; order_count: number; orders: Order[]; tickets: number; clock: number; hang_armed?: boolean;
  queue?: { ticket: string; position: number; ready: boolean; event_id: string }[];
  section_a?: { event_id: string; available: number; weekday: string }[];
  activity?: { ts: number; kind: string; message: string }[];
};
export type Progress = {
  code: CodeFacts;
  lit: Record<string, boolean>;
  boot_id: string; boots: number;
  wakes: Wake[]; wakes_total?: number; last_wake: Wake | null; stage: { session_id?: string; ts?: number | null };
  thread: Wake[]; clock_runs: number; clock_calls: number | null;
  before: Wake | null; after: Wake | null;
  kill: KillReceipt | null; fence: FenceReceipt; graph: GraphReceipt; budget: BudgetReceipt; replay?: ReplayReceipt;
  venue: Venue; mode: string; wake_message: string; error: string | null;
};
export const getHealth = () => j<{ ok: boolean; boot_id: string; mode: string; venue: string; port: number }>("/health");
export const getProgress = () => j<Progress>("/progress").catch(() => null);

export type CodeFile = { path: string; symbol?: string; span?: number[]; content: string;
  validation: { valid: boolean; message: string; line?: number | null } };
export const readCode = (path: string, symbol?: string) =>
  j<CodeFile>(`/code?path=${encodeURIComponent(path)}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ""}`);
export const writeCode = (path: string, content: string, symbol?: string) => post<CodeFile>("/code", { path, content, symbol });

export type SayOut = Partial<Wake> & { ok: boolean; error?: string; session_id?: string; said?: string[]; awaiting_input?: boolean };
export const say = (text: string, session_id: string | null, who = "you") => post<SayOut>("/say", { text, session_id, who });
export const newSession = () => post<{ session_id: string }>("/session/new", {});
export const world = (action: string, body: Record<string, unknown> = {}) => post<{ ok: boolean; result: unknown }>(`/venue/${action}`, body);
export const kill = () => post<{ ok: boolean; boot_id: string }>("/kill", {});

export type Job = { kind: string; state: "idle" | "running" | "done" | "error"; rc: number | null; started: number; ended: number;
  elapsed: number; log: string[]; summary: Record<string, unknown>; meta: Record<string, unknown>; episode: number | null };
export const startJob = (kind: string, opts: Record<string, unknown> = {}) => post<Job>("/job", { kind, ...opts });
export const getJob = (kind: string) => j<Job>(`/job?kind=${kind}`);
export const stopJob = (kind: string) => j<{ stopped: boolean }>(`/job?kind=${kind}`, { method: "DELETE" });

export type Ev = Record<string, unknown> & { i: number; ep: number; t: number; type: string };
export const eventsUrl = () => `${ORIGIN}${API}/events`;
export const sourceUrl = (path: string) => `${ORIGIN}${API}/source?path=${encodeURIComponent(path)}`;
