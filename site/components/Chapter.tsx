"use client";
import { useState } from "react";
import { sourceUrl, startJob, type Progress, type Wake } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";
import { ART, CHAPTERS, type Chapter as C, type Step } from "@/lib/chapters";
import Editor from "./Editor";
import NightShift from "./NightShift";

/** The chapter panel, v2: one thing open at a time.
 *  the hook · NOW (the step you are on, computed from receipts, with its action inside:
 *  the sentence, the editor, 🐓, 💀, a world button) · the ticks (receipts, ticking on their
 *  own, a hint on the first one not yet earned) · the track (every step, 2–4 words) · folds:
 *  why · the edit · the map · what it did · transcript · source. Explicit steps live where
 *  the gesture happens; the drawer keeps adk web's own numbered steps. */

function Say({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="say">
      <code>{text}</code>
      <button className="copy" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* blocked */ } }}>{done ? "copied ✓" : "copy"}</button>
    </span>
  );
}

function Fold({ k, one, open, children }: { k: string; one: React.ReactNode; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="fold" open={open}>
      <summary><span className="tri">▶</span><span className="k">{k}</span><span className="one">{one}</span></summary>
      <div className="body">{children}</div>
    </details>
  );
}

const Av = ({ src }: { src: string }) => <span className="av" style={{ backgroundImage: `url(${src})` }} aria-hidden />;

function Transcript({ p }: { p: Progress | null }) {
  const thread: Wake[] = (p?.thread || []).slice(-8);
  if (!thread.length) return <div className="dim">nothing yet.</div>;
  return (
    <div className="thread">
      {thread.map((w) => (
        <div key={w.ts + w.session_id} className="turn">
          {w.source === "clock"
            ? <div className="bubble"><Av src={ART.av.clock} /><div><div className="who">the clock · 3:00 · {w.session_id}{w.answered ? ` · answers the pause ${String(w.answered).slice(0, 12)}` : ""}</div><div className="txt">{w.message}</div></div></div>
            : <div className="bubble you"><Av src={ART.av.sleeper} /><div><div className="who">{w.who || "you"}</div><div className="txt">{w.message}</div></div></div>}
          <div className="bubble"><Av src={ART.av.rook} /><div>
            <div className="who">{w.kind === "Workflow" ? "the graph" : "the agent"}{w.kind === "Workflow" && (w.nodes || []).length ? ` · ran ${(w.nodes || []).map((x) => x.node).filter((x, i, a) => a.indexOf(x) === i).join(" → ")}` : ""}{(w.turn_tools ?? w.tools).length ? ` · called ${(w.turn_tools ?? w.tools).join(" · ")}` : w.kind === "Workflow" ? "" : " · no tool call"}{w.orders_new.length ? ` · bought ${w.orders_new.map((o) => `${o.seats}× ${o.section} ${(o.weekday || "").slice(0, 3)}`).join(", ")}` : ""}{w.awaiting && w.turn_interrupts?.length ? ` · parked on ${String(w.turn_interrupts.slice(-1)[0]).slice(0, 14)}` : ""}{w.boot_id && p?.boot_id && w.boot_id !== p.boot_id ? ` · boot ${w.boot_id}` : ""}</div>
            <div className={"txt" + (w.awaiting ? " ask" : "")}>{w.reply || (w.awaiting ? "(the run stopped on a question)" : "(no text)")}</div>
          </div></div>
        </div>
      ))}
    </div>
  );
}

export default function Chapter({ n, p, f, onGo, onChanged, onCheck, onWorkbench, onWake, onWorld, onKill }: {
  n: number; p: Progress | null; f: Folded; onGo: (n: number) => void; onChanged: () => void; onCheck: () => void; onWorkbench: () => void; onWake: () => void;
  onWorld: (action: string, body?: Record<string, unknown>) => Promise<void>; onKill: () => void;
}) {
  const c: C = CHAPTERS[n - 1];
  const prev = CHAPTERS[n - 2], next = CHAPTERS[n];
  const ok = Boolean(p?.lit?.[String(n)]);
  const now = c.now(p);
  const done = ok || now.n > c.steps.length;           // a torn stub stays torn: the lit card wins over the file's state
  const [peek, setPeek] = useState<number | null>(null);         // a step you clicked on the track, to read ahead
  const shown = peek && peek !== now.n && !done ? peek : null;
  const step: Step | null = shown ? c.steps[shown - 1] : done ? null : c.steps[now.n - 1];
  const tiles = c.tiles(p);
  const places = c.places?.(p);
  const ticks = c.ticks(p);
  const editIsNow = Boolean(step && step.act === "edit" && !shown);
  const [seeding, setSeeding] = useState(false);
  const seed = async () => { setSeeding(true); try { await startJob("seed"); } catch (e) { alert((e as Error).message); } setTimeout(() => { setSeeding(false); onChanged(); }, 4000); };
  const busy = f.running;

  const action = (s: Step) => {
    switch (s.act) {
      case "edit": return c.edit ? <Editor path={c.edit.file} symbol={c.edit.symbol} marker={c.edit.marker} afterMarker={c.edit.afterMarker} fix={c.edit.fix} afterHint={c.edit.afterHint} change={c.edit.change} swap={c.edit.swap} onSaved={onChanged} /> : null;
      case "wake": return <button className="btn sky big" disabled={busy} onClick={onWake}>🐓 wake it at 3am</button>;
      case "skipwake": return <><button className="btn big" disabled={busy} onClick={() => onWorld("advance-queue")}>skip the wait</button><span className="dim">then</span><button className="btn sky big" disabled={busy} onClick={onWake}>🐓 wake it at 3am</button></>;
      case "kill": return <button className="btn kill big" disabled={busy} onClick={onKill}>💀 kill the process</button>;
      case "sell": return <><button className="btn big" disabled={busy} onClick={() => onWorld("sellout", { section: "A" })}>sell the good seats</button><span className="dim">then</span><button className="btn big" disabled={busy} onClick={() => onWorld("advance-queue")}>skip the wait</button></>;
      case "wb": return <button className="btn big" onClick={onWorkbench}>🔬 open the workbench</button>;
      case "phone": return <button className="btn sun big" onClick={onCheck}>📱 the breakfast message</button>;
      default: return s.say ? <><Say text={s.say} /><span className="dim" style={{ fontSize: 12.5 }}>— it is already in the box on the stage</span></> : null;
    }
  };
  const firstTile = tiles[0];

  return (
    <div className="card panel">
      <div className="top">
        <div className="ch"><Av src={c.star.img} /><h2 className="display"><small>chapter {c.roman}</small>{c.name}</h2></div>
        <span className={"pill " + c.pill[0]}>{c.pill[1]}</span>
      </div>
      <div className="hook">{c.hook}</div>

      {done && !shown ? (
        <div className="nowcard lit">
          <div className="k"><span>stub {c.roman} torn</span><span>{c.steps.length} of {c.steps.length}</span></div>
          <div className="do">✓ {c.done}</div>
          {tiles.length > 0 && <div className="tiles">{tiles.slice(0, 3).map((t, i) => <div key={i} className="tile"><div className="k">{t.k}</div><div className={"v " + (t.cls || "")}>{t.v}</div>{t.s && <div className="s">{t.s}</div>}</div>)}</div>}
          {n === CHAPTERS.length
            ? <div><button className="btn sun" onClick={onCheck}>📱 the breakfast message</button></div>
            : <div className="see">next: <b>chapter {next.roman} · {next.name}</b> — {next.hook}</div>}
        </div>
      ) : step && (
        <div className={"nowcard" + (shown ? " peek" : "")}>
          <div className="k"><span>{shown ? `step ${shown} · ahead` : "now"}</span><span>{shown ? <a role="button" onClick={() => setPeek(null)}>back to now ↩</a> : `step ${now.n} of ${c.steps.length}`}</span></div>
          <div className="do" dangerouslySetInnerHTML={{ __html: step.do }} />
          {!shown && now.note && <div className="note">{now.note}</div>}
          {!shown && <div className="act">{action(step)}{n === 2 && step.act === "wb" && <button className="copy" disabled={seeding} onClick={seed}>{seeding ? "seeding…" : "▶ seed the two-days-ago session"}</button>}</div>}
          {step.see && <div className="see">you will see · <b>{step.see}</b></div>}
        </div>
      )}

      <div className="ticks">
        <div className="k">watch · receipts, ticking on their own</div>
        {(() => { let hinted = false; return ticks.map((t, i) => { const h = !t.ok && !hinted && t.hint; if (h) hinted = true;
          return <div key={i} className={"tk" + (t.ok ? " ok" : "")}><span className="dot">{t.ok ? "✓" : ""}</span><span className="l">{t.label}{h && <span className="h">{t.hint}</span>}</span></div>; }); })()}
      </div>

      <div className="track">
        {c.steps.map((s, i) => { const k = i + 1; const st = done || k < now.n ? "done" : k === now.n ? "cur" : ""; return (
          <a key={i} className={"st " + st + (shown === k ? " peeking" : "")} role="button" title={s.do.replace(/<[^>]+>/g, "")} onClick={() => setPeek(k === now.n ? null : k)}><span className="dot" /><span className="lbl">{s.lbl}</span></a>); })}
      </div>

      <Fold k="why" one={c.why[0]}><div dangerouslySetInnerHTML={{ __html: c.why[1] }} /></Fold>
      {c.edit && !editIsNow && (
        <Fold k="the edit" one={isEditDone(c, p) ? <span style={{ color: "var(--mint-ink)" }}>✓ {c.edit.change[1]} · saved</span> : <>{c.edit.change[0]} → {c.edit.change[1]}</>}>
          <Editor path={c.edit.file} symbol={c.edit.symbol} marker={c.edit.marker} afterMarker={c.edit.afterMarker} fix={c.edit.fix} afterHint={c.edit.afterHint} change={c.edit.change} swap={c.edit.swap} onSaved={onChanged} />
        </Fold>
      )}
      <Fold k="the map" one={c.mapLine(p)}><NightShift n={n} p={p} /></Fold>
      {(tiles.length > 0 || (places && places.length > 0)) && (
        <Fold k="what it did" one={ok ? c.done : firstTile ? `${firstTile.k} · ${firstTile.v}` : "receipts"}>
          {tiles.length > 0 && <div className="tiles">{tiles.map((t, i) => <div key={i} className="tile"><div className="k">{t.k}</div><div className={"v " + (t.cls || "")}>{t.v}</div>{t.s && <div className="s">{t.s}</div>}</div>)}</div>}
          {places && places.length > 0 && (
            <div className="tile" style={{ marginTop: 8 }}><div className="k">where it lives · read from lab.db, artifacts/ and the file</div>
              <div className="chips">{places.map((pl, i) => <div key={i} className="chip"><span className={pl.c}>{pl.c === "y" ? "✓" : pl.c === "n" ? "✗" : "–"}</span><span><b>{pl.k}</b> · {pl.s}</span></div>)}</div>
            </div>
          )}
        </Fold>
      )}
      <Fold k="transcript" one={p?.thread?.length ? `${p.thread.length} turns · every sentence, every tool call, every boot` : "nothing yet"}><Transcript p={p} /></Fold>
      <Fold k="source" one={c.sources.map(([l]) => l.split(" · ")[0].split("/").pop()).join(" · ")}>
        <div className="sources">{c.sources.map(([label, path]) => <a key={path + label} href={sourceUrl(path)} target="_blank" rel="noreferrer" title={path}>{label} ↗</a>)}</div>
      </Fold>
      {p?.error && <div className="err">{p.error}</div>}
      <div className="nav">
        {prev ? <a onClick={() => onGo(prev.n)} role="button">← {prev.roman} · {prev.name}</a> : <span />}
        {next ? <a onClick={() => onGo(next.n)} role="button">{next.roman} · {next.name} →</a> : <a onClick={() => onGo(1)} role="button">back to the clock</a>}
      </div>
    </div>
  );
}

/** is this chapter's one edit in the file right now? (the code fact the lamp reads) */
function isEditDone(c: C, p: Progress | null): boolean {
  const code = p?.code; if (!code) return false;
  switch (c.n) { case 2: return code.recall; case 3: return code.queue; case 4: return code.fence; case 5: return code.graph; case 6: return code.budget; default: return false; }
}
