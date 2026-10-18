"use client";
import { useState } from "react";
import type { Progress } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";
import { ART, LINE, SHOW } from "@/lib/chapters";
import Console from "./Console";

/** The stage: the agent's portrait, one line to say, the reply, and one
 *  number. The reply is a projection of the event log — nothing here
 *  computes a score. The portrait is a layered CSS background — url() over
 *  the gradient — so missing art shows the gradient, never a broken icon. */
export default function Stage({ chapter, p, f, view, onSay, busy }: {
  chapter: number; p: Progress | null; f: Folded; view: "show" | "console"; onSay: (text: string) => void; busy: boolean;
}) {
  const [text, setText] = useState(LINE);
  const exams = p?.exams || [];
  const b = exams.filter((e) => !e.edit).slice(-1)[0];
  const a = exams.filter((e) => e.edit).slice(-1)[0];
  const replied = f.replied || (p?.last_say ? { text: p.last_say.reply, tools: p.last_say.tools, tools_in_file: p.last_say.tools_in_file } : null);
  const asked = f.asked || (p?.last_say ? { who: p.last_say.who, text: p.last_say.text } : null);
  const num: [string, string, string] =
    chapter === 1 ? ["workbench", p?.workbench_calls ? `${p.workbench_calls} ${p.workbench_calls === 1 ? "reply" : "replies"}` : "none yet", p?.workbench_calls ? "good" : ""]
    : chapter === 2 ? ["exam", `${b ? `${b.score}/${b.of}` : "–"} → ${a ? `${a.score}/${a.of}` : "–"}`, a && b && a.score > b.score ? "good" : b ? "bad" : ""]
    : [SHOW.lampWord, `${["1", "2"].filter((k) => p?.lit?.[k]).length} / 2`, p?.lit?.["3"] ? "good" : ""];
  const examLine = f.kind === "exam"
    ? (f.scored ? `exam · ${f.scored.score} / ${f.scored.of} · tool ${f.scored.edit ? "in" : "not in"}` : `the exam is running · ${f.cases.length} / 3…`)
    : null;

  return (
    <div className="card stage-card">
      <div className="top">
        <span className="k">THE STAGE</span>
        <span className={"feedchip " + (f.connected ? "live" : "off")}>{f.connected ? `● LIVE · ${p?.mode === "vertex" ? "Vertex AI" : "real model"}` : "○ the lab is away"}</span>
      </div>
      {view === "console" ? <Console f={f} /> : (
        <>
          <div className="scene">
            <div className={"portrait" + (busy || (f.running && f.kind === "say") ? " busy" : "")} style={{ backgroundImage: `url(${ART.agent}), var(--art-agent)` }} role="img" aria-label={SHOW.agent} />
            <div className="bubble">
              <div className="who">{SHOW.agent.toUpperCase()}{replied?.tools_in_file?.length ? ` · tools: ${replied.tools_in_file.join(", ")}` : " · no tools"}</div>
              <div>{busy ? "…" : replied ? `“${replied.text}”` : f.error ? <span style={{ color: "var(--tomato)" }}>{f.error}</span> : "…"}</div>
              {replied && replied.tools.length > 0 && <div className="called">called <b>{replied.tools.join(", ")}</b></div>}
              {asked && <div className="askline">you said: “{asked.text}”</div>}
            </div>
          </div>
          {examLine && <div className="examline">{examLine}</div>}
          {f.kind === "exam" && f.cases.length > 0 && (
            <div className="cases">{f.cases.map((c) => (
              <div key={c.i} className={"case " + (c.pass ? "p" : "f")} title={c.reply}>
                <span>{c.pass ? "✓" : "✗"} {c.i}</span><span className="pr">{c.prompt}</span>{c.tools.length > 0 && <i>called {c.tools.join(", ")}</i>}
              </div>))}</div>
          )}
        </>
      )}
      <div className="controls">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !busy) onSay(text); }} placeholder="say something" aria-label="say" />
        <button className="btn hot" onClick={() => onSay(text)} disabled={busy || f.running}>{busy ? "…" : "💬 say it"}</button>
        <span className={"num " + num[2]}>{num[0]} <b>{num[1]}</b></span>
      </div>
    </div>
  );
}
