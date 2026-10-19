"use client";
import { useEffect, useRef, useState } from "react";
import { getJob, startJob, type Job, type Progress, type Wake } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";
import { ART, CHAPTERS, LINE } from "@/lib/chapters";

/** The stage: ONE big character per chapter with a name plate, four readouts,
 *  the talk box (the MonsterTix front door — it posts to /api/say, and if the
 *  run is parked on a question your words are the answer), the world buttons
 *  (the venue panel's, in-process) and the two doors of this lab: 🐓 wake it at
 *  3am (clock.py as a job → /api/wake, nobody there) and 💀 kill the process.
 *  Everything shown is a projection of receipts and the event log. */

const Av = ({ who }: { who: "rook" | "sleeper" | "clock" | "boxoffice" | "sam" }) => (
  <span className={`av av-${who}`} style={{ backgroundImage: `url(${ART.av[who]})` }} aria-hidden />
);

export default function Stage({ chapter, p, f, name, busy, onSay, onWorld, onKill, onChanged, onNew }: {
  chapter: number; p: Progress | null; f: Folded; name: string; busy: boolean;
  onSay: (text: string) => void; onWorld: (action: string, body?: Record<string, unknown>) => Promise<void>; onKill: () => void; onChanged: () => void; onNew: () => void;
}) {
  const c = CHAPTERS[chapter - 1];
  const after = chapter === 2 && Boolean(p?.lit?.["2"]);
  const img = after && c.star.afterImg ? c.star.afterImg : c.star.img;
  const role = after && c.star.afterRole ? c.star.afterRole : c.star.role;
  // chapter VI: the sleeper is awake once the graph has asked them something
  const awake = after || (chapter === 6 && Boolean(p?.budget?.after?.asked));
  const quick = Array.from(new Set(c.steps.filter((s) => s.say).map((s) => s.say as string)));     // this chapter's sentences, in order, once each
  const defaultLine = quick[0] || LINE;
  const [text, setText] = useState(defaultLine);
  const lastDefault = useRef(defaultLine);
  useEffect(() => { if (text === lastDefault.current || !text) setText(defaultLine); lastDefault.current = defaultLine; }, [defaultLine]); // eslint-disable-line react-hooks/exhaustive-deps
  const [wake, setWake] = useState<Job | null>(null);
  const wakePrev = useRef("idle");
  useEffect(() => {
    const poll = async () => {
      try { const j = await getJob("wake"); setWake(j); if (wakePrev.current === "running" && j.state !== "running") onChanged(); wakePrev.current = j.state; } catch { /* away */ }
    };
    poll(); const id = setInterval(poll, wake?.state === "running" ? 1200 : 5000); return () => clearInterval(id);
  }, [wake?.state, onChanged]);
  const wakeRunning = wake?.state === "running";
  const fire = async () => { try { await startJob("wake"); } catch (e) { alert((e as Error).message); } try { setWake(await getJob("wake")); } catch { /* away */ } };

  const thread: Wake[] = (p?.thread || []).slice(-4);
  const reads = c.reads(p);
  const clockState = wakeRunning ? (f.clock === "fired" ? "fired · running" : `armed · fires in ${Math.max(0, 10 - Math.round(wake?.elapsed || 0))} s`) : (p?.clock_runs ? `fired · ${p.clock_runs}×` : "idle");
  const sixty = (p?.venue?.clock || 1) >= 60;

  return (
    <div className="card stage">
      <div className="scene">
        {/* a plain <img> with a gradient behind it; a missing file shows the gradient */}
        <img className="star" src={img} alt="" />
        <div className="starcap"><b>{c.star.name}</b><span>{role}</span></div>
        <div className={"chip sleeper" + (awake ? " awake" : "")}><Av who="sleeper" /><span><b>{name || "you"}</b> · {awake ? (chapter === 6 ? "awake · asked" : "awake") : "asleep"}</span></div>
        <div className={"chip clockchip" + (wakeRunning ? " firing" : "")}><Av who="clock" /><span><b>the clock</b> · {clockState}</span></div>
      </div>

      <div className="reads">
        {reads.map((r, i) => <div key={i} className={"read " + (r.cls || (i === 0 ? "hi" : ""))}><div className="k">{r.k}</div><div className="v">{r.v}</div><div className="sub">{r.s || " "}</div></div>)}
      </div>

      <div className="talk">
        {thread.length === 0 && !f.running && (
          <div className="bubble"><Av who="rook" /><div><div className="who">the agent</div><div className="txt" style={{ color: "var(--sub)" }}>Nobody has spoken. Say the plan, or press 🐓 and say nothing.</div></div></div>
        )}
        {thread.map((w) => (
          <div key={w.ts + w.session_id} className="turn">
            {w.source === "clock"
              ? <div className="bubble"><Av who="clock" /><div><div className="who">the clock · 3:00 · {w.session_id}{w.answered ? ` · answers the pause ${String(w.answered).slice(0, 12)}` : ""}</div><div className="txt">{w.message}</div></div></div>
              : <div className="bubble you"><Av who="sleeper" /><div><div className="who">{w.who || "you"}</div><div className="txt">{w.message}</div></div></div>}
            <div className="bubble"><Av who="rook" /><div>
              <div className="who">{w.kind === "Workflow" ? "the graph" : "the agent"}{w.kind === "Workflow" && (w.nodes || []).length ? ` · ran ${(w.nodes || []).map((x) => x.node).filter((x, i, a) => a.indexOf(x) === i).join(" → ")}` : ""}{(w.turn_tools ?? w.tools).length ? ` · called ${(w.turn_tools ?? w.tools).join(" · ")}` : w.kind === "Workflow" ? "" : " · no tool call"}{w.orders_new.length ? ` · bought ${w.orders_new.map((o) => `${o.seats}× ${o.section} ${(o.weekday || "").slice(0, 3)}`).join(", ")}` : ""}{w.awaiting && w.turn_interrupts?.length ? ` · parked on ${String(w.turn_interrupts.slice(-1)[0]).slice(0, 14)}` : ""}{w.boot_id && p?.boot_id && w.boot_id !== p.boot_id ? ` · boot ${w.boot_id}` : ""}</div>
              <div className={"txt" + (w.awaiting ? " ask" : "")}>{w.reply || (w.awaiting ? "(the run stopped on a question)" : "(no text)")}</div>
            </div></div>
          </div>
        ))}
        {f.running && (f.kind === "stage" || f.kind === "clock") && (
          <div className="bubble"><Av who="rook" /><div><div className="who">the agent · running{f.calledSoFar.length ? ` · ${f.calledSoFar.join(" · ")}` : ""}</div><div className="txt" style={{ color: "var(--sub)" }}>…</div></div></div>
        )}
        {f.error && <div className="bubble"><Av who="rook" /><div><div className="who">error</div><div className="txt" style={{ color: "var(--coral-ink)" }}>{f.error}</div></div></div>}
        <div className="input">
          <input className="box" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !busy && text.trim()) onSay(text); }} placeholder="talk to it…" aria-label="talk to the agent" />
          <button className="btn night on" disabled={busy || f.running} onClick={() => text.trim() && onSay(text)}>{busy ? "…" : "send"}</button>
        </div>
        <div className="quick">
          {quick.map((q) => <button key={q} className={"copy" + (text === q ? " on" : "")} onClick={() => setText(q)} title={q}>{q.length > 34 ? q.slice(0, 32) + "…" : q}</button>)}
          <button className="copy" onClick={onNew} title="a fresh session id — nothing is deleted; the old conversation stays in lab.db">↻ new conversation</button>
        </div>
      </div>

      <div className="world">
        <span className="k">the world</span>
        <button className="btn night" onClick={() => onWorld("reset")} title="the venue: every ticket, order and feed line gone; the tour re-seeded">reset</button>
        <button className="btn night" onClick={() => onWorld("advance-queue")} title="every waiting ticket straight to the front">skip the wait</button>
        <button className="btn night" onClick={() => onWorld("sellout", { section: "A" })} title="section A sold out for both Amsterdam shows — the seat map the agent holds becomes a lie">sell the good seats</button>
        <button className="btn night" onClick={() => onWorld("hang-once")} title="the next purchase commits, then fails its response — the platform retries">break the next purchase</button>
        <button className={"btn night" + (sixty ? " on" : "")} onClick={() => onWorld("clock", { multiplier: sixty ? 1 : 60 })} title="how fast the queue drains: 40 minutes at 1×, 40 seconds at 60×">{sixty ? "60× → 1×" : "1× → 60×"}</button>
      </div>
      <div className="special">
        <button className={"btn night" + (wakeRunning ? " on" : "")} id="wakebtn" disabled={wakeRunning || f.running} onClick={fire} title="monstertix/clock.py --in 10 → POST /api/wake · nobody is at the keyboard">
          {wakeRunning ? (f.clock === "fired" ? "🐓 fired · the agent is running" : `🐓 armed · ${Math.max(0, 10 - Math.round(wake?.elapsed || 0))} s`) : p?.clock_runs ? "🐓 wake it again" : "🐓 wake it at 3am"}
        </button>
        <button className="btn night kill" onClick={onKill} disabled={f.running || wakeRunning} title="the process really dies; lab.sh brings it back with a new boot id">💀 kill the process{p?.boots && p.boots > 1 ? ` · boot ${p.boots}` : ""}</button>
      </div>
    </div>
  );
}
