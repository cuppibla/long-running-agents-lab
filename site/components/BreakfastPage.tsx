"use client";
import { useState } from "react";
import { CLOSING } from "@/lib/chapters";
import { pageOf } from "@/lib/pages";
import { FullGraph } from "./Figures";
import { useLab } from "./LabProvider";
import { WB_URL } from "./RunCard";
import Shell from "./Shell";
import { Html, In, Kicker } from "./shared";

/** Chapter VII · breakfast: the phone at 7:30 — “While you slept:” six lines, each a chapter
 *  and the number you produced — in the VERIFY position, the laptop → cloud diff as the
 *  statement card, and the whole graph with Cloud Run's names on it. Every number is a
 *  receipt; an unlit chapter shows a dash. */
export default function BreakfastPage() {
  const page = pageOf("breakfast");
  const { p, name, refresh } = useLab();
  const [busy, setBusy] = useState(false);
  const lit = p?.lit || {};
  const clock = p?.before || p?.last_wake;      // row I is the clock's own run (the one without recall), not chapter II's
  const before = p?.before; const after = p?.after; const o = after?.orders_new?.[0];
  const k = p?.kill; const fa = p?.fence?.after; const g = p?.graph?.after; const b = p?.budget?.after;
  const pos = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `#${n.toLocaleString()}`);
  const rows: [string, string, string, boolean][] = [
    ["I", "the clock", clock ? `${clock.calls} calls · nobody typed` : "—", Boolean(lit["1"])],
    ["II", "where a fact lives", after && o ? `${o.weekday} ×${o.seats} · ${after.memory_facts ?? ""} facts read` : before ? "a Tuesday · 0 facts read" : "—", Boolean(lit["2"])],
    ["III", "the kill", k ? `1 ticket · 2 boots · ${pos(k.positions[0])} → ${pos(k.positions[1])}` : "—", Boolean(lit["3"])],
    ["IV", "old news", fa ? `refused before the venue${fa.order ? ` · ${fa.order.section} · $${Math.round(fa.order.total)}` : ""}` : "—", Boolean(lit["4"])],
    ["V", "the graph", g ? `${g.wakeups} wake-ups · ${g.one_ticket ? "1 ticket" : `${g.tickets.join("/")} tickets`}${g.order ? ` · ${g.order.section} · $${Math.round(g.order.total)}` : ""}` : "—", Boolean(lit["5"])],
    ["VI", "the budget", b?.order && b.sentence ? `$${Math.round(b.order.unit_price)} a seat inside “${b.sentence.length > 38 ? b.sentence.slice(0, 36) + "…" : b.sentence}”` : b?.sentence ? `agreed: “${b.sentence.slice(0, 40)}”` : "—", Boolean(lit["6"])],
  ];
  const torn = rows.filter((r) => r[3]).length;
  const missing = rows.filter((r) => !r[3]).map((r) => r[0]);
  return (
    <Shell slug="breakfast">
      <In><figure className="scene"><img src={page.scene} alt="" /></figure></In>
      <In d={1}><div className="head"><div><Kicker color={page.color}>{page.kicker}</Kicker><h1>{page.title}</h1><Html as="p" html={page.blurb} /></div></div></In>
      <In d={2}><section className="card">
        <div className="runrow">
          <div><Kicker>Verify</Kicker><h2>{torn === 6 ? "Six of six. The message it left you." : `${torn} of 6 so far${missing.length ? ` · ${missing.join(" · ")} still unlit` : ""}.`}</h2><p className="blurb">Every line is a receipt read from lab.db, the job log and the venue. {torn < 6 ? "Go back to an unlit chapter and run it; the line fills in here." : "Waking up was never the hard part."}</p></div>
          <div style={{ display: "flex", gap: 8 }}><button className="btn" disabled={busy} onClick={async () => { setBusy(true); await refresh(); setBusy(false); }}>{busy ? "reading…" : "↻ Check again"}</button><a className="btn" href={WB_URL} target="_blank" rel="noreferrer">🔬 Open adk web ↗</a></div>
        </div>
        <div className="finale" style={{ marginTop: 16 }}>
          <div className="phone">
            <div className="st"><span>7:30</span><span>{name || "you"}</span><span>●●●</span></div>
            <div className="msg">
              <div className="from">the agent · while you slept · {torn} of 6</div>
              {rows.map(([n, t, num, ok]) => <div key={n} className={"prow" + (ok ? "" : " dim")}><span className="n">{n}</span><span className="t">{t}</span><span className="num">{num}</span></div>)}
              <div className="closing">{CLOSING}</div>
            </div>
          </div>
          <div className="statement diff">
            <Kicker>The diff between your laptop and production · read, not run</Kicker>
            <div className="line">The agent, its tools, its callbacks and the budget did not change. Two URIs and one environment variable did.</div>
            <table><thead><tr><th>on this page</th><th>in the cloud</th><th>what changed</th></tr></thead><tbody>
              <tr><td><code>sqlite+aiosqlite:///lab.db</code></td><td>Cloud SQL</td><td>a connection string</td></tr>
              <tr><td><code>file://artifacts</code> · <code>memory/userx.md</code></td><td><code>gs://bucket</code></td><td>a URI · a path</td></tr>
              <tr><td>🐓 <code>monstertix/clock.py</code></td><td>Cloud Scheduler → Pub/Sub</td><td><code>trigger_sources=[&quot;pubsub&quot;]</code></td></tr>
              <tr><td><code>/api/wake</code> finds the stage’s parked run</td><td><code>/trigger/wake</code>, not ADK’s <code>/apps/concert/trigger/pubsub</code></td><td>nothing — the default trigger opens a <b>new session per message</b>; a 3am push would never find the parked run, and would buy twice</td></tr>
              <tr><td>a sleep and one POST, then it gives up</td><td>Pub/Sub between the Scheduler and the service</td><td>the message is <b>held</b> while the service restarts, <b>retried</b> if the call fails, and can <b>fan out</b> to a second subscriber — a trigger endpoint needs Cloud Run or GKE; Agent Runtime has no triggers</td></tr>
              <tr><td><code>/api/say</code> marks a person present</td><td><code>someone_is_there()</code></td><td>a default, overridden per request</td></tr>
              <tr><td>🔬 the workbench</td><td>one Cloud Run service</td><td>a Dockerfile and a main.py</td></tr>
            </tbody></table>
            <p className="blurb" style={{ textAlign: "left" }}>Self-study, in the codelab: the <b>Idempotency-Key</b> (press BREAK THE NEXT PURCHASE and read the venue’s <code>duplicate suppressed</code>) · the <code>budget_split</code> sub-agent with <code>include_contents=&quot;none&quot;</code> · the three artifact URIs · the source lab’s <code>deploy-agent.sh</code>, for a project of your own.</p>
          </div>
        </div>
      </section></In>
      <In d={3}><section className="card"><Kicker>The same graph, on Cloud Run · what each node is called there</Kicker><div style={{ marginTop: 14 }}><FullGraph p={p} cloud /></div></section></In>
    </Shell>
  );
}
