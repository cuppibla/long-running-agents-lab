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
  said: string[]; reply: string; awaiting: boolean; tools: string[]; calls: number; tools_in_file: string[]; kind: string;
  orders_new: Order[]; boot_id: string; elapsed: number; code: CodeFacts;
  db?: { events?: number; interrupts?: number; compactions?: number; state?: Record<string, unknown> };
  artifacts?: string[]; memory_facts?: number;
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
