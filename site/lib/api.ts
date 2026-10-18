// Where the lab is. Same origin when the page is served by it (the normal
// case); NEXT_PUBLIC_LAB_ORIGIN when `npm run dev` runs the page on its own.
export const ORIGIN = process.env.NEXT_PUBLIC_LAB_ORIGIN || "";
const API = "/api";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${ORIGIN}${API}${path}`, { cache: "no-store", ...init });
  if (!r.ok) {
    let msg = `${r.status} from ${path}`;
    try { const b = await r.json(); if (b?.detail) msg = String(b.detail); } catch { /* keep */ }
    throw new Error(msg);
  }
  return r.json();
}
const post = <T,>(path: string, body: unknown, method = "POST") =>
  j<T>(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export type ExamCase = { i: number; prompt: string; reply: string; tools: string[]; pass: boolean };
export type Exam = { ts?: number; score: number; of: number; edit: boolean; tools: string[]; model: string; receipt?: string; cases?: ExamCase[] };
export type Say = { ts?: number; who: string; text: string; reply: string; tools: string[]; tools_in_file: string[]; session?: string };
export type Progress = {
  code: { edit: boolean; model: string; instruction_chars: number };
  lit: Record<string, boolean>;
  boot_id: string;
  workbench_calls: number;
  last_exam: Exam | null; exams: Exam[];
  last_say: Say | null; says: number;
  mode: string; error: string | null;
};
export const getHealth = () => j<{ ok: boolean; boot_id: string; mode: string }>("/health");
export const getProgress = () => j<Progress>("/progress").catch(() => null);

export type CodeFile = { path: string; symbol?: string; span?: number[]; content: string;
  validation: { valid: boolean; message: string; line?: number | null } };
export const readCode = (path: string, symbol?: string) =>
  j<CodeFile>(`/code?path=${encodeURIComponent(path)}${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ""}`);
export const writeCode = (path: string, content: string, symbol?: string) => post<CodeFile>("/code", { path, content, symbol });

export const say = (text: string, who = "you") => post<Say & { ok: boolean; error?: string }>("/say", { text, who });

export type Job = { kind: string; state: "idle" | "running" | "done" | "error"; rc: number | null; started: number; ended: number;
  elapsed: number; log: string[]; summary: Record<string, unknown>; meta: Record<string, unknown>; episode: number | null };
export const startJob = (kind: string, opts: Record<string, unknown> = {}) => post<Job>("/job", { kind, ...opts });
export const getJob = (kind: string) => j<Job>(`/job?kind=${kind}`);
export const stopJob = (kind: string) => j<{ stopped: boolean }>(`/job?kind=${kind}`, { method: "DELETE" });

export type Ev = Record<string, unknown> & { i: number; ep: number; t: number; type: string };
export const eventsUrl = () => `${ORIGIN}${API}/events`;
export const sourceUrl = (path: string) => `${ORIGIN}${API}/source?path=${encodeURIComponent(path)}`;
