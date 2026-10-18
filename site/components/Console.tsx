"use client";
import type { Progress } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";

/** 🧾 the console: one event stream — the runner, the clock, the venue, the
 *  fence — the engineer's projection of the same log the stage draws from.
 *  `?console=1` opens the page on it (capture.sh shoots it). */
export default function Console({ f, p }: { f: Folded; p: Progress | null }) {
  const rows = f.log.slice(-60);
  const t0 = rows.length ? rows[0].t : 0;
  const src = (e: Record<string, unknown>) =>
    e.type === "clock_fired" || e.type === "clock_armed" || e.type === "clock_done" ? "clock"
    : e.type === "world" || e.type === "venue" ? "venue"
    : e.type === "file_saved" || e.type === "session_new" || e.type === "kill" || e.type === "boot" ? "page"
    : (e.source as string) === "clock" ? "server" : (e.source as string) === "stage" ? "server" : "lab";
  const text = (e: Record<string, unknown>) => {
    switch (e.type) {
      case "run_asked": return `woken${e.attended ? "" : " · nobody there"} · "${String(e.text).slice(0, 90)}"`;
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
      case "episode_started": return `── ${e.kind} ──`;
      case "episode_done": case "job_done": return "";
      case "error": return `✗ ${e.message}`;
      default: return JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !["i", "ep", "t", "type"].includes(k)))).slice(0, 140);
    }
  };
  const venueFeed = (p?.venue?.activity || []).slice(0, 8);
  return (
    <div className="card console">
      <div className="eyebrow" style={{ marginBottom: 8 }}>🧾 console · one event stream: the runner, the clock, the venue · episode {f.episode} · {rows.length} events · boot {p?.boot_id}</div>
      <div className="lines">
        {rows.filter((e) => text(e)).map((e) => <div key={`${e.i}-${e.t}`} className={"l " + src(e)}><span className="src">+{(e.t - t0).toFixed(1)}s [{src(e)}]</span><span>{text(e)}</span></div>)}
      </div>
      {venueFeed.length > 0 && (
        <>
          <div className="eyebrow" style={{ margin: "12px 0 6px" }}>the venue’s activity feed · newest first</div>
          <div className="lines">{venueFeed.map((a) => <div key={a.ts + a.message} className="l venue"><span className="src">[{a.kind}]</span><span>{a.message}</span></div>)}</div>
        </>
      )}
    </div>
  );
}
