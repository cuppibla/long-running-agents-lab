"use client";
import { useState } from "react";
import type { Wake } from "@/lib/api";
import type { Chapter } from "@/lib/chapters";
import type { Page } from "@/lib/pages";
import { plateOf } from "@/lib/plate";
import { useLab } from "./LabProvider";
import { Av, Copy, Kicker } from "./shared";

/** THE STAGE: MonsterTix, the page the agent is behind. Four readouts (this chapter's three
 *  numbers and what the agent is doing), the talk thread from receipts (the owl is the clock,
 *  the cat is you, the fox is the agent), this chapter's sentences as buttons (click says it on
 *  the stage — opening a new conversation first when the step says so — ⧉ copies it), a free
 *  talk box, ↻ new conversation, and the world buttons folded as “the switches”. */
export default function StageCard({ page, c }: { page: Page; c: Chapter }) {
  const lab = useLab();
  const { p, f, name, busy, wait } = lab;
  const [text, setText] = useState("");
  const thread: Wake[] = (p?.thread || []).slice(-6);
  const last = (p?.thread || []).slice(-1)[0] || null;
  const running = f.running && (f.kind === "stage" || f.kind === "clock");
  const plate = running
    ? { who: last?.kind === "Workflow" || p?.code?.graph ? "the graph" : "the agent", status: "running", sub: f.calledSoFar.length ? f.calledSoFar.join(" · ") : "…", cls: "hi" as const }
    : plateOf(last, p);
  const reads = c.nums(p);
  const sentences = c.steps.filter((s) => s.say);
  const sixty = (p?.venue?.clock || 1) >= 60;
  const send = () => { if (text.trim() && !wait) { lab.say(text.trim()); setText(""); } };
  return (
    <section className="card">
      <Kicker>The stage</Kicker>
      <h2>{page.stageH2 || "MonsterTix, the page the agent is behind."}</h2>
      <div className="reads">
        {reads.map((r, i) => <div key={i} className="read"><div className="k">{r.k}</div><div className={"v " + (r.cls || "")}>{r.v}</div><div className="s">{r.s || " "}</div></div>)}
        <div className="read"><div className="k">{plate.who}</div><div className={"v " + plate.cls}>{plate.status}</div><div className="s">{plate.sub}</div></div>
      </div>
      <div className="thread">
        {!thread.length && !running && <div className="bub"><Av who="fox" /><div><div className="who">the agent</div><div className="t muted">Nobody has spoken yet. Say a sentence below, or press 🐓 and say nothing.</div></div></div>}
        {thread.map((w) => (
          <div key={w.ts + w.session_id} style={{ display: "grid", gap: 10 }}>
            {w.source === "clock"
              ? <div className="bub"><Av who="owl" /><div><div className="who">the clock · 3:00 · {w.session_id}{w.answered ? ` · answers the pause ${String(w.answered).slice(0, 12)}` : ""}</div><div className="t">{w.message}</div></div></div>
              : <div className="bub"><Av who="cat" /><div><div className="who">{w.who === "replay" ? "you · typed by ▶ the replay" : (w.who || name || "you")}</div><div className="t you">{w.message}</div></div></div>}
            <div className="bub"><Av who="fox" /><div>
              <div className="who">{w.kind === "Workflow" ? "the graph" : "the agent"}{w.kind === "Workflow" && (w.nodes || []).length ? ` · ran ${(w.nodes || []).map((x) => x.node).filter((x, i, a) => a.indexOf(x) === i).join(" → ")}` : ""}{(w.turn_tools ?? w.tools).length ? ` · called ${(w.turn_tools ?? w.tools).join(" · ")}` : w.kind === "Workflow" ? "" : " · no tool call"}{w.orders_new.length ? ` · bought ${w.orders_new.map((o) => `${o.seats}× ${o.section} ${(o.weekday || "").slice(0, 3)}`).join(", ")}` : ""}{w.awaiting && w.turn_interrupts?.length ? ` · parked on ${String(w.turn_interrupts.slice(-1)[0]).slice(0, 14)}` : ""}{w.boot_id && p?.boot_id && w.boot_id !== p.boot_id ? ` · boot ${w.boot_id}` : ""}</div>
              <div className={"t" + (w.awaiting ? " ask" : "")}>{w.reply || (w.awaiting ? "(the run stopped on a question)" : "(no text)")}</div>
            </div></div>
          </div>
        ))}
        {running && <div className="bub"><Av who="fox" /><div><div className="who">{plate.who} · running{f.calledSoFar.length ? ` · ${f.calledSoFar.join(" · ")}` : ""}</div><div className="t muted">…</div></div></div>}
        {f.error && !running && <div className="bub"><Av who="fox" /><div><div className="who">error</div><div className="t err">{f.error}</div></div></div>}
      </div>
      <div className="say">
        {sentences.map((s, i) => (
          <span key={i} className="btn copy" style={{ padding: "6px 6px 6px 12px", gap: 6 }}>
            <button style={{ border: 0, background: "none", padding: 0, font: "inherit", color: "inherit", textAlign: "left", whiteSpace: "normal" }} disabled={wait} title={s.fresh ? "opens a new conversation, then says this on the stage" : "says this on the stage"} onClick={() => (s.fresh ? lab.sayFresh : lab.say)(s.say as string)}>
              {s.fresh && <span className="dim">↻ </span>}{s.say}{s.optional && <span className="dim"> · optional</span>}
            </button>
            <Copy text={s.say as string} className="ic" />
          </span>
        ))}
        <button className="btn" onClick={lab.newConversation} title="a fresh session id — nothing is deleted; the old conversation stays in lab.db">↻ new conversation</button>
      </div>
      <div className="talk">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="or say anything to it, in your own words…" aria-label="talk to the agent" />
        <button className="btn" disabled={wait || !text.trim()} onClick={send}>{busy ? "…" : "send"}</button>
      </div>
      <details className="switches">
        <summary className="btn sm">the switches ▾</summary>
        <div className="srow">
          <button className="btn sm" disabled={wait} onClick={lab.fireWake} title="monstertix/clock.py --in 10 → POST /api/wake · nobody is at the keyboard">🐓 wake it at 3am</button>
          <button className="btn sm danger" disabled={wait} onClick={lab.killIt} title="the process really dies; lab.sh brings it back with a new boot id">💀 kill the process{p?.boots && p.boots > 1 ? ` · boot ${p.boots}` : ""}</button>
          <button className="btn sm" onClick={() => lab.world("reset")} title="the venue: every ticket, order and feed line gone; the tour re-seeded">reset the venue</button>
          <button className="btn sm" onClick={() => lab.world("advance-queue")} title="every waiting ticket straight to the front">skip the wait</button>
          <button className="btn sm" onClick={() => lab.world("sellout", { section: "A" })} title="section A sold out for both Amsterdam shows — the seat map the agent holds becomes a lie">sell the good seats</button>
          <button className="btn sm" onClick={() => lab.world("hang-once")} title="the next purchase commits, then fails its response — the platform retries">break the next purchase</button>
          <button className="btn sm" onClick={() => lab.world("clock", { multiplier: sixty ? 1 : 60 })} title="how fast the queue drains: 40 minutes at 1×, 40 seconds at 60×">{sixty ? "60× → 1×" : "1× → 60×"}</button>
          {c.n === 2 && <button className="btn sm" onClick={lab.seed} title="the two-days-ago session, with user:prefs">▶ seed two-days-ago</button>}
        </div>
      </details>
    </section>
  );
}
