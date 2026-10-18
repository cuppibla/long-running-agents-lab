"use client";
import type { Progress } from "@/lib/api";
import { CHAPTERS, CLOSING } from "@/lib/chapters";

/** 📱 the breakfast message — the finale. The phone screen at 7:30: "While you
 *  slept:" six lines, each a chapter and the number you produced, then the
 *  closing line. Beside it, the read-only diff between this page and production.
 *  Every number is a receipt; an untorn stub shows a dash. */
export default function Breakfast({ p, name }: { p: Progress | null; name: string }) {
  const lit = p?.lit || {};
  const clock = p?.after || p?.last_wake;
  const before = p?.before;
  const after = p?.after;
  const o = after?.orders_new?.[0];
  const rows: [string, string, string, boolean][] = [
    ["I", "the clock", clock ? `${clock.calls} calls · nobody typed` : "—", Boolean(lit["1"])],
    ["II", "where a fact lives", after && o ? `${o.weekday} ×${o.seats} · ${after.memory_facts ?? ""} facts read` : before ? "a Tuesday · 0 facts read" : "—", Boolean(lit["2"])],
    ["III", "the kill", lit["3"] ? "1 ticket · 2 boots" : "—", Boolean(lit["3"])],
    ["IV", "old news", lit["4"] ? "refused before the venue" : "—", Boolean(lit["4"])],
    ["V", "the graph", lit["5"] ? `${p?.clock_runs} wake-ups · 1 ticket` : "—", Boolean(lit["5"])],
    ["VI", "the budget", lit["6"] ? "inside the limit you typed" : "—", Boolean(lit["6"])],
  ];
  const torn = rows.filter((r) => r[3]).length;
  return (
    <div className="finale">
      <div className="phone">
        <div className="st"><span>7:30</span><span>{name || "you"}</span><span>●●●</span></div>
        <div className="msg">
          <div className="from">the agent · while you slept · {torn} of 6</div>
          {rows.map(([n, t, num, ok]) => <div key={n} className={"row" + (ok ? "" : " dim")}><span className="n">{n}</span><span className="t">{t}</span><span className="num">{num}</span></div>)}
          <div className="closing display">{CLOSING}</div>
        </div>
      </div>
      <div className="card diff">
        <div className="eyebrow">the diff between your laptop and production · read, not run</div>
        <div className="line">The agent, its tools, its callbacks and the budget did not change. Two URIs and one environment variable did.</div>
        <table><thead><tr><th>on this page</th><th>in the cloud</th><th>what changed</th></tr></thead><tbody>
          <tr><td><code>sqlite+aiosqlite:///lab.db</code></td><td>Cloud SQL</td><td>a connection string</td></tr>
          <tr><td><code>file://artifacts</code> · <code>memory/userx.md</code></td><td><code>gs://bucket</code></td><td>a URI · a path</td></tr>
          <tr><td>🐓 <code>monstertix/clock.py</code></td><td>Cloud Scheduler → Pub/Sub</td><td><code>trigger_sources=[&quot;pubsub&quot;]</code></td></tr>
          <tr><td><code>/api/say</code> marks a person present</td><td><code>someone_is_there()</code></td><td>a default, overridden per request</td></tr>
          <tr><td>🔬 the workbench</td><td>one Cloud Run service</td><td>a Dockerfile and a main.py</td></tr>
        </tbody></table>
        <div className="concept">Self-study, in the codelab: the <b>Idempotency-Key</b> (press BREAK THE NEXT PURCHASE and read the venue’s <code>duplicate suppressed</code>) · the <code>budget_split</code> sub-agent with <code>include_contents=&quot;none&quot;</code> · the three artifact URIs · the source lab’s <code>deploy-agent.sh</code>, for a project of your own.</div>
        <div className="dim mono" style={{ fontSize: 10.5 }}>{CHAPTERS.filter((c) => c.phase > 1).map((c) => c.roman).join(" · ")} tear in the next build phases.</div>
      </div>
    </div>
  );
}
