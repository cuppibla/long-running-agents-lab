"use client";
import { useEffect, useRef, useState } from "react";
import { getJob, startJob, type Job, type Progress, type Wake } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";
import { ART, CHAPTERS, LINE } from "@/lib/chapters";

/** The stage, v2: the scene (the cast doing this chapter's thing), the agent speaking
 *  from it (one bubble — its latest sentence and its state), three numbers, one talk
 *  row with this step's sentence already in the box, and the two doors of this lab:
 *  🐓 wake it at 3am (clock.py as a job → /api/wake, nobody there) and, in chapter III,
 *  💀 kill the process. The world buttons fold away. The whole thread lives in the
 *  chapter panel's transcript fold and in 🧾. Everything shown is a projection of
 *  receipts and the event log. */

const Av = ({ who }: { who: "rook" | "sleeper" | "clock" | "boxoffice" | "sam" }) => (
  <span className={`av av-${who}`} style={{ backgroundImage: `url(${ART.av[who]})` }} aria-hidden />
);

/** what the latest run says about itself — one plate line */
export function plateOf(w: Wake | null, p: Progress | null): { who: string; status: string; mint: boolean } {
  const who = w?.kind === "Workflow" ? "the graph" : "the agent";
  if (!w) return { who, status: "asleep", mint: false };
  const boot = w.boot_id && p?.boot_id && w.boot_id !== p.boot_id ? ` · boot ${w.boot_id}` : "";
  if (w.awaiting) {
    const id = String((w.turn_interrupts || []).slice(-1)[0] || "");
    if (id.startsWith("budget:")) return { who, status: id === "budget:ask" ? "asking you" : "reading it back" + boot, mint: false };
    if (w.kind === "Workflow") return { who, status: `parked at check_front${w.position ? ` · ${pos(w.position)}` : ""}${boot}`, mint: false };
    return { who, status: "asked you" + boot, mint: false };
  }
  if (w.orders_new?.length) { const o = w.orders_new[0]; return { who, status: `bought · ${o.seats}× ${o.section} · $${Math.round(o.total)}${boot}`, mint: true }; }
  if ((w.turn_tools || w.tools).includes("join_queue")) return { who, status: `in line${w.position ? ` · ${pos(w.position)}` : ""}${boot}`, mint: false };
  if ((w.turn_tools || w.tools).includes("check_queue")) return { who, status: `same ticket · ${w.boot_id === p?.boot_id ? "back" : `boot ${w.boot_id}`}`, mint: true };
  if (w.answered) return { who, status: "answered the pause" + boot, mint: false };
  if (w.source === "clock") return { who, status: `woke at 3:00 · ${w.calls} ${w.calls === 1 ? "call" : "calls"}${boot}`, mint: w.calls > 0 };
  return { who, status: (w.turn_tools ?? w.tools).length ? `replied · ${(w.turn_tools ?? w.tools).join(" · ")}` : "replied · no tool call", mint: false };
}
const pos = (n: number) => `#${n.toLocaleString()}`;

export default function Stage({ chapter, p, f, name, busy, awake, onSay, onWorld, onKill, onChanged, onNew }: {
  chapter: number; p: Progress | null; f: Folded; name: string; busy: boolean; awake: boolean;
  onSay: (text: string) => void; onWorld: (action: string, body?: Record<string, unknown>) => Promise<void>; onKill: () => void; onChanged: () => void; onNew: () => void;
}) {
  const c = CHAPTERS[chapter - 1];
  const now = c.now(p);
  const cur = c.steps[Math.min(now.n, c.steps.length) - 1];
  const prefill = (now.n <= c.steps.length && cur.say) || (c.steps.find((s) => s.say) || {}).say || LINE;
  const [text, setText] = useState(prefill);
  const lastDefault = useRef(prefill);
  useEffect(() => { if (text === lastDefault.current || !text) setText(prefill); lastDefault.current = prefill; }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const thread: Wake[] = p?.thread || [];
  const last = thread.length ? thread[thread.length - 1] : null;
  const running = f.running && (f.kind === "stage" || f.kind === "clock");
  const plate = running ? { who: last?.kind === "Workflow" || p?.code?.graph ? "the graph" : "the agent", status: `running${f.calledSoFar.length ? ` · ${f.calledSoFar.join(" · ")}` : ""}`, mint: false } : plateOf(last, p);
  const said = running ? "…" : f.error ? f.error : last ? (last.reply || (last.awaiting ? "(the run stopped on a question)" : "(no text)")) : "Nobody has spoken yet. Say the sentence in the box, or press 🐓 and say nothing.";
  const nums = c.nums(p);
  const clockState = wakeRunning ? (f.clock === "fired" ? "fired · running" : `armed · ${Math.max(0, 10 - Math.round(wake?.elapsed || 0))} s`) : (p?.clock_runs ? `fired · ${p.clock_runs}×` : "idle");
  const sixty = (p?.venue?.clock || 1) >= 60;

  return (
    <div className="card stage">
      <div className="scene">
        <img className="star scenepic" src={`/art/scenes/${c.scene}.jpg`} alt="" />
        <div className={"chip sleeper" + (awake ? " awake" : "")}><Av who="sleeper" /><span><b>{name || "you"}</b> · {awake ? "awake" : "asleep"}</span></div>
        <div className={"chip clockchip" + (wakeRunning ? " firing" : "")}><Av who="clock" /><span><b>the clock</b> · {clockState}</span></div>
        <div className="speech">
          <Av who="rook" />
          <div>
            <div className={"plate" + (plate.mint ? " mint" : "")}>{plate.who} · {plate.status}</div>
            <div className={"txt" + (last?.awaiting && !running ? " ask" : "") + (f.error && !running ? " err" : "")}>{said}</div>
          </div>
        </div>
      </div>

      <div className="nums">
        {nums.map((r, i) => <div key={i} className={"num " + (r.cls || "")}><div className="v">{r.v}</div><div className="k">{r.k}{r.s ? ` · ${r.s}` : ""}</div></div>)}
      </div>

      <div className="talk">
        <input className="box" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !busy && text.trim()) onSay(text); }} placeholder="talk to it…" aria-label="talk to the agent" />
        <button className="btn sun" disabled={busy || f.running} onClick={() => text.trim() && onSay(text)}>{busy ? "…" : "send"}</button>
      </div>
      <div className="doors">
        <button className={"btn sky" + (wakeRunning ? " on" : "")} id="wakebtn" disabled={wakeRunning || f.running} onClick={fire} title="monstertix/clock.py --in 10 → POST /api/wake · nobody is at the keyboard">
          {wakeRunning ? (f.clock === "fired" ? "🐓 fired · the agent is running" : `🐓 armed · ${Math.max(0, 10 - Math.round(wake?.elapsed || 0))} s`) : "🐓 wake it at 3am"}
        </button>
        {chapter === 3 && <button className="btn kill" onClick={onKill} disabled={f.running || wakeRunning} title="the process really dies; lab.sh brings it back with a new boot id">💀 kill the process{p?.boots && p.boots > 1 ? ` · boot ${p.boots}` : ""}</button>}
        <button className="more" onClick={onNew} title="a fresh session id — nothing is deleted; the old conversation stays in lab.db">↻ new conversation</button>
        <span className="sp" />
        <details className="world">
          <summary className="more">the world ▾</summary>
          <div className="row">
            <button className="btn" onClick={() => onWorld("reset")} title="the venue: every ticket, order and feed line gone; the tour re-seeded">reset</button>
            <button className="btn" onClick={() => onWorld("advance-queue")} title="every waiting ticket straight to the front">skip the wait</button>
            <button className="btn" onClick={() => onWorld("sellout", { section: "A" })} title="section A sold out for both Amsterdam shows — the seat map the agent holds becomes a lie">sell the good seats</button>
            <button className="btn" onClick={() => onWorld("hang-once")} title="the next purchase commits, then fails its response — the platform retries">break the next purchase</button>
            <button className={"btn" + (sixty ? " on" : "")} onClick={() => onWorld("clock", { multiplier: sixty ? 1 : 60 })} title="how fast the queue drains: 40 minutes at 1×, 40 seconds at 60×">{sixty ? "60× → 1×" : "1× → 60×"}</button>
          </div>
        </details>
      </div>
    </div>
  );
}
