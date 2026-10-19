"use client";
import type { Progress } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";

/** 🧾 the console: one event stream — the runner, the clock, the venue, the fence — the
 *  engineer's projection of the same log the stage draws from. Folds under RUN IT;
 *  `?console=1` opens it (capture.sh shoots it). */
export default function Console({ f, p }: { f: Folded; p: Progress | null }) {
  const rows = f.log.slice(-60);
  const t0 = rows.length ? rows[0].t : 0;
  const src = (e: Record<string, unknown>) =>
    e.type === "clock_fired" || e.type === "clock_armed" || e.type === "clock_done" ? "clock"
    : e.type === "world" || e.type === "venue" || e.type === "venue_409" ? "venue"
    : e.type === "file_saved" || e.type === "session_new" || e.type === "kill" || e.type === "boot" ? "page"
    : e.type === "fence_refused" ? "fence"
    : e.type === "node_line" ? "graph" : e.type === "interrupt_answered" || e.type === "run_parked" ? "server"
    : (e.source as string) === "clock" || (e.source as string) === "stage" ? "server" : "lab";
  const text = (e: Record<string, unknown>) => {
    switch (e.type) {
      case "run_asked": return `woken${e.attended ? "" : " · nobody there"}${e.answers ? ` · answering ${String(e.answers).slice(0, 14)}` : ""} · "${String(e.text).slice(0, 90)}"`;
      case "interrupt_answered": return `  the ${e.by === "the clock" ? "clock's sentence" : "words you typed"} answer interrupt ${String(e.id).slice(0, 14)} in ${e.session_id} — the parked run resumes`;
      case "node_line": return `  [${e.node}] ${String(e.text).slice(0, 120)}`;
      case "run_parked": return `  parked on adk_request_input ${String(e.id).slice(0, 14)} · "${String(e.text).slice(0, 80)}" · nothing is running`;
      case "runner_line": return /answering interrupt/.test(String(e.text)) ? "" : `  ${String(e.text).replace(/^\[server\]\s*/, "").slice(0, 120)}`;
      case "tool_called": return `  called ${e.name}`;
      case "run_said": return `  said   ${String(e.text).slice(0, 110)}`;
      case "run_replied": return `done · session ${e.session_id} · tools ${(e.tools as string[]).join(", ") || "none"}${(e.orders as unknown[]).length ? ` · bought ${(e.orders as unknown[]).length}` : ""}${e.awaiting ? " · parked on a question" : ""}`;
      case "clock_armed": return String(e.text);
      case "clock_fired": return "firing → POST /api/wake";
      case "clock_done": return String(e.text);
      case "world": return `${e.action}${e.section ? ` · section ${e.section}` : ""}${e.multiplier ? ` · ${e.multiplier}×` : ""}`;
      case "file_saved": return `saved ${e.path} · ${Object.entries(e.code as Record<string, boolean>).filter(([, v]) => v).map(([k]) => k).join(" ") || "as shipped"}`;
      case "boot": return `boot ${e.boot_id} · venue ${e.venue ? "up" : "down"} · boots ${e.boots}`;
      case "kill": return `💀 POST /api/kill → exit 3 · boot ${e.boot_id} ends`;
      case "fence_refused": return `⛩ fence.py answered purchase · reason ${e.reason} · actually ${e.actual} · believed ${e.believed ?? "—"} · the venue was not called`;
      case "venue_409": return `venue answered 409 ${e.error} on purchase(${e.section}) · the attempt reached the venue`;
      case "episode_started": return `── ${e.kind} ──`;
      case "episode_done": case "job_done": return "";
      case "error": return `✗ ${e.message}`;
      default: return JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !["i", "ep", "t", "type"].includes(k)))).slice(0, 140);
    }
  };
  const venueFeed = (p?.venue?.activity || []).slice(0, 8);
  return (
    <div>
      <div className="lines">
        {!rows.length && <div className="l"><span className="src">—</span><span className="dim">nothing yet · boot {p?.boot_id}</span></div>}
        {rows.filter((e) => text(e)).map((e) => <div key={`${e.i}-${e.t}`} className={"l " + src(e)}><span className="src">+{(e.t - t0).toFixed(1)}s [{src(e)}]</span><span>{text(e)}</span></div>)}
      </div>
      {venueFeed.length > 0 && (
        <div className="lines" style={{ marginTop: 8 }}>
          <div className="l"><span className="src">venue</span><span className="dim">the venue’s activity feed · newest first</span></div>
          {venueFeed.map((a) => <div key={a.ts + a.message} className="l venue"><span className="src">[{a.kind}]</span><span>{a.message}</span></div>)}
        </div>
      )}
    </div>
  );
}
