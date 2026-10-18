"use client";
import { useState } from "react";
import { sourceUrl, startJob, type Progress } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";
import { CHAPTERS, CLOSING, WHERE, type Chapter as C } from "@/lib/chapters";
import Editor from "./Editor";

/** The chapter panel, kept sparse: hook · concept · steps (each with a
 *  where-chip) · the one edit (was/now + the file, live) · the run box · the
 *  tiles · SOURCE · what you will see · NEXT → · one ▢. Explicit steps live
 *  where the gesture happens (the editor, the drawer), not here. */

function Say({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="say">
      <code>{text}</code>
      <button className="copy" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* blocked */ } }}>{done ? "copied ✓" : "copy"}</button>
    </span>
  );
}

export default function Chapter({ n, p, f, onGo, onChanged, onCheck, onWorkbench, onWake }: {
  n: number; p: Progress | null; f: Folded; onGo: (n: number) => void; onChanged: () => void; onCheck: () => void; onWorkbench: () => void; onWake: () => void;
}) {
  const c: C = CHAPTERS[n - 1];
  const prev = CHAPTERS[n - 2], next = CHAPTERS[n];
  const ok = Boolean(p?.lit?.[String(n)]);
  const tiles = c.tiles(p);
  const places = c.places?.(p);
  const cue = c.next(p);
  const [seeding, setSeeding] = useState(false);
  const seed = async () => { setSeeding(true); try { await startJob("seed"); } catch (e) { alert((e as Error).message); } setTimeout(() => { setSeeding(false); onChanged(); }, 4000); };

  return (
    <div className="card stub panel">
      <div className="tear" />
      <div className="top"><h2 className="display"><small>chapter {c.roman}</small>{c.name}</h2><span className={"pill " + c.pill[0]}>{c.pill[1]}</span></div>
      <div className="hook">{c.hook}</div>
      <div className="concept" dangerouslySetInnerHTML={{ __html: c.concept }} />

      <div className="steps">
        {c.steps.map((s, i) => (
          <div key={i} className="step">
            <span className={"where w-" + s.where} onClick={s.where === "workbench" ? onWorkbench : undefined} style={s.where === "workbench" ? { cursor: "pointer" } : undefined}>{WHERE[s.where]}</span>
            <span><span dangerouslySetInnerHTML={{ __html: s.do }} />{s.say && <><br /><Say text={s.say} /></>}</span>
          </div>
        ))}
      </div>

      {c.edit && (
        <Editor path={c.edit.file} symbol={c.edit.symbol} marker={c.edit.marker} afterMarker={c.edit.afterMarker} fix={c.edit.fix} afterHint={c.edit.afterHint}
          change={c.edit.change} swap={c.edit.swap} onSaved={onChanged} />
      )}

      {c.run && (
        <div className="runbox">
          <button className="btn night big" disabled={f.running} onClick={onWake}>{c.run.label}</button>
          <div className="d"><span dangerouslySetInnerHTML={{ __html: c.run.d }} />{n === 2 && <> · <button className="copy" disabled={seeding} onClick={seed}>{seeding ? "seeding…" : "▶ seed the two-days-ago session"}</button></>}</div>
        </div>
      )}

      {tiles.length > 0 && (
        <div className="tiles">{tiles.map((t, i) => <div key={i} className="tile"><div className="k">{t.k}</div><div className={"v " + (t.cls || "")}>{t.v}</div>{t.s && <div className="s">{t.s}</div>}</div>)}</div>
      )}
      {places && places.length > 0 && (
        <div className="tile"><div className="k">where it lives · read from lab.db, artifacts/ and the file</div>
          <div className="chips">{places.map((pl, i) => <div key={i} className="chip"><span className={pl.c}>{pl.c === "y" ? "✓" : pl.c === "n" ? "✗" : "–"}</span><span><b>{pl.k}</b> · {pl.s}</span></div>)}</div>
        </div>
      )}

      {n === CHAPTERS.length && (
        <>
          <div className="closing display">“{CLOSING}”</div>
          <div><button className="btn on" onClick={onCheck}>📱 the breakfast message</button></div>
        </>
      )}

      {c.expect && <div className="expect"><span className="k">you will see</span><span>{c.expect}</span></div>}
      {cue && <div className={"nextcue" + (ok ? " lit" : "")}><span className="k">next →</span><span>{cue}</span></div>}
      <div className={"check" + (ok ? " lit" : "")}><span className="bx">{ok ? "✓" : ""}</span><span>{c.check}</span></div>
      <div className="sources"><span className="k">source</span>
        {c.sources.map(([label, path]) => <a key={path + label} href={sourceUrl(path)} target="_blank" rel="noreferrer" title={path}>{label} ↗</a>)}
      </div>
      {p?.error && <div className="err">{p.error}</div>}
      <div className="nav">
        {prev ? <a onClick={() => onGo(prev.n)} role="button">← {prev.roman} · {prev.name}</a> : <span />}
        {next ? <a onClick={() => onGo(next.n)} role="button">{next.roman} · {next.name} →</a> : <a onClick={() => onGo(1)} role="button">back to the clock</a>}
      </div>
    </div>
  );
}
