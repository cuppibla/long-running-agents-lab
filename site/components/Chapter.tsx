"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getJob, sourceUrl, startJob, type Job, type Progress } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";
import { CHAPTERS, CLOSING, WHERE, type Chapter as C } from "@/lib/chapters";
import Editor from "./Editor";

/** The chapter panel, kept sparse: hook · concept · steps (each with a
 *  where-chip) · the one edit (was/now + the file, live) · the one button +
 *  its log · SOURCE · what you will see · NEXT → · one ▢. Explicit steps
 *  live where the gesture happens (the editor, the drawer), not here. */

function Say({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="say">
      <code>{text}</code>
      <button className="copy" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* blocked */ } }}>{done ? "copied ✓" : "copy"}</button>
    </span>
  );
}

/** The button that starts a subprocess job, and the log of its last run. */
function useJob(kind: string | undefined, onDone: () => void) {
  const [job, setJob] = useState<Job | null>(null);
  const prev = useRef<string>("idle");
  const poll = useCallback(async () => {
    if (!kind) return;
    try {
      const j = await getJob(kind);
      setJob(j);
      if (prev.current === "running" && j.state !== "running") onDone();
      prev.current = j.state;
    } catch { /* away */ }
  }, [kind, onDone]);
  useEffect(() => { poll(); }, [poll]);
  const running = job?.state === "running";
  useEffect(() => {
    const id = setInterval(poll, running ? 1500 : 6000);
    return () => clearInterval(id);
  }, [poll, running]);
  const start = async () => {
    if (!kind) return;
    try { await startJob(kind); } catch (e) { alert((e as Error).message); }
    poll();
  };
  return { job, start, running };
}

function Log({ job }: { job: Job | null }) {
  if (!job || !job.log.length) return null;
  const lines = job.log.slice(-14);
  return (
    <pre className="log">
      <span className="hi">$ {job.kind}{job.state === "running" ? ` · running ${job.elapsed}s…` : job.state === "done" ? ` · done in ${job.elapsed}s` : ` · ${job.state} (rc ${job.rc})`}</span>{"\n"}
      {lines.map((l, i) => <span key={i} className={/PASS|score 3|called/i.test(l) ? "ok" : /FAIL|error|Traceback/i.test(l) ? "bad" : ""}>{l}{"\n"}</span>)}
    </pre>
  );
}

export default function Chapter({ n, p, f, onGo, onChanged, onCheck, onWorkbench }: {
  n: number; p: Progress | null; f: Folded; onGo: (n: number) => void; onChanged: () => void; onCheck: () => void; onWorkbench: () => void;
}) {
  const c: C = CHAPTERS[n - 1];
  const prev = CHAPTERS[n - 2], next = CHAPTERS[n];
  const ok = Boolean(p?.lit?.[String(n)]);
  const { job, start, running } = useJob(c.run?.kind, onChanged);
  const exams = p?.exams || [];
  const b = exams.filter((e) => !e.edit).slice(-1)[0];
  const a = exams.filter((e) => e.edit).slice(-1)[0];
  const cue = c.next(p);

  return (
    <div className="card chapter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><span className="eyebrow">CHAPTER {c.roman}</span><h2>{c.name}</h2></div>
        <span className={"pill " + c.pill[0]}>{c.pill[1]}</span>
      </div>
      <div className="hook">{c.hook}</div>
      <div className="concept" dangerouslySetInnerHTML={{ __html: c.concept }} />

      <ol className="steps">
        {c.steps.map((s, i) => (
          <li key={i}>
            <span className={"where " + s.where} onClick={s.where === "workbench" ? onWorkbench : undefined}>{WHERE[s.where]}</span>
            <span>{s.do}{s.say && <Say text={s.say} />}</span>
          </li>
        ))}
      </ol>

      {c.edit && (
        <>
          <div className="change"><span className="k">{c.edit.file} · WAS</span><span className="was">{c.edit.change[0]}</span><span className="k">NOW</span><span className="now">{c.edit.change[1]}</span></div>
          <div style={{ margin: "10px 0" }}>
            <Editor path={c.edit.file} symbol={c.edit.symbol} marker={c.edit.marker} afterMarker={c.edit.afterMarker} fix={c.edit.fix} afterHint={c.edit.afterHint} onSaved={onChanged} />
          </div>
        </>
      )}

      {c.run && (
        <div className="runbox">
          <div className="opts">
            <button className="btn gold" disabled={running || f.running} onClick={start}>{c.run.label}</button>
            <span className="art">about 10 s · the tool is <b>{p?.code?.edit ? "in" : "not in"}</b> the file right now</span>
          </div>
          <Log job={job} />
          <div className="results">
            <div className={"result " + (b ? (b.score === b.of ? "pass" : "fail") : "")}>without the tool<b>{b ? `${b.score} / ${b.of}` : "—"}</b>{b ? `${b.cases?.filter((x) => x.tools.length).length || 0} tool calls` : "not run yet"}</div>
            <div className={"result " + (a ? (a.score === a.of ? "pass" : "fail") : "")}>with the tool<b>{a ? `${a.score} / ${a.of}` : "—"}</b>{a ? `${a.cases?.filter((x) => x.tools.length).length || 0} tool calls` : "not run yet"}</div>
          </div>
        </div>
      )}

      {n === CHAPTERS.length && (
        <>
          <div className="closing">“{CLOSING}”</div>
          <div><button className="btn gold" onClick={onCheck}>🧾 the check, please</button></div>
        </>
      )}

      <div className="sources"><span className="k">SOURCE</span>
        {c.sources.map(([label, path]) => <a key={path + label} className="src" href={sourceUrl(path)} target="_blank" rel="noreferrer" title={path}>{label} ↗</a>)}
      </div>
      <div className="expect"><span className="k">YOU WILL SEE</span>{c.expect}</div>
      {cue && <div className="next"><span>NEXT →</span> {cue}</div>}
      <div className={"check" + (ok ? " ok" : "")}><span className="box">{ok ? "✓" : "▢"}</span><span className="txt">{c.check}</span></div>
      {p?.error && <div className="err">{p.error}</div>}
      <div className="nav">
        {prev ? <button className="btn" onClick={() => onGo(prev.n)}>← {prev.roman} · {prev.name}</button> : <span />}
        {next ? <button className="btn on" onClick={() => onGo(next.n)}>{next.roman} · {next.name} →</button> : <button className="btn on" onClick={() => onGo(1)}>back to the first word</button>}
      </div>
    </div>
  );
}
