"use client";
import type { Folded } from "@/lib/useEvents";

/** The same log, the engineer's projection: the event table. `?console=1`
 *  opens the page on it (capture.sh shoots it). */
export default function Console({ f }: { f: Folded }) {
  const rows = f.log.slice(-60);
  const t0 = rows.length ? rows[0].t : 0;
  const short = (e: Record<string, unknown>) => {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(e)) {
      if (["i", "ep", "t", "type"].includes(k)) continue;
      if (typeof v === "string" && v.length > 70) { o[k] = v.slice(0, 67) + "…"; continue; }
      o[k] = v;
    }
    return JSON.stringify(o).replace(/"/g, "").slice(0, 150);
  };
  return (
    <div className="console">
      <div className="hd"><span>THE LOG · append-only · one contract, two feeds (SSE · /api/log)</span><span>episode {f.episode} · {rows.length} events</span></div>
      <div className="scroll">
        <table><tbody>
          {rows.map((e) => <tr key={e.i}><td>{e.i}</td><td>+{(e.t - t0).toFixed(1)}s</td><td>{e.type}</td><td>{short(e)}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
