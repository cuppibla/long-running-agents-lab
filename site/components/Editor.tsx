"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readCode, sourceUrl, writeCode, type CodeFile } from "@/lib/api";

/** One file (or one top-level symbol of it), in the page. The page never holds a copy of your
 *  code: it shows the file, saves it back through /api/code (syntax-checked), and says when the
 *  save takes effect. The marker line is highlighted until the edit is in; afterwards the edited
 *  line stays highlighted green (afterMarker). The card's "Write the answer" button runs `fix`
 *  through the same route. Shape: the reference's CodeEditor; logic: Table for N / Agent Valley. */

type SaveState = "saved" | "unsaved" | "saving" | "invalid";

export default function Editor({ path, symbol, readOnly, marker, afterMarker, fix, afterHint, change, swap, onSaved }: {
  path: string; symbol?: string; readOnly?: boolean; marker?: string; afterMarker?: string;
  fix?: (src: string) => string; afterHint?: string; change?: [string, string]; swap?: boolean; onSaved?: () => void;
}) {
  const [file, setFile] = useState<CodeFile | null>(null);
  const [code, setCode] = useState("");
  const [state, setState] = useState<SaveState>("saved");
  const [err, setErr] = useState("");
  const [onDisk, setOnDisk] = useState<string | null>(null);
  const [savedHere, setSavedHere] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const known = useRef({ code: "", original: "" });

  const load = useCallback(async () => {
    try {
      const f = await readCode(path, symbol);
      known.current = { code: f.content, original: f.content };
      setFile(f); setCode(f.content); setOnDisk(null); setState("saved"); setErr("");
    } catch (e) { setErr((e as Error).message); }
  }, [path, symbol]);

  useEffect(() => { load(); }, [load]);

  // other things write this file too (the answer button, walk.py, a terminal): take the file as it
  // is now unless there are unsaved edits here, in which case say so and let the person choose
  useEffect(() => {
    const poll = async () => {
      try {
        const f = await readCode(path, symbol);
        const { code: c, original: o } = known.current;
        if (f.content === o) return;
        if (c === o) { known.current = { code: f.content, original: f.content }; setFile(f); setCode(f.content); setState("saved"); }
        else setOnDisk(f.content);
      } catch { /* the lab is away */ }
    };
    const id = setInterval(poll, 4000);
    window.addEventListener("focus", poll);
    window.addEventListener("lra:sync", poll);
    return () => { clearInterval(id); window.removeEventListener("focus", poll); window.removeEventListener("lra:sync", poll); };
  }, [path, symbol]);

  const save = async (content: string) => {
    setState("saving");
    try {
      const f = await writeCode(path, content, symbol);
      setFile(f);
      if (f.validation.valid) { known.current = { code: content, original: content }; setState("saved"); setSavedHere(true); onSaved?.(); }
      else setState("invalid");
    } catch (e) { setErr((e as Error).message); setState("invalid"); }
  };
  const onChange = (v: string) => {
    setCode(v); known.current.code = v; setState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v), 700);
  };

  const lines = code.split("\n");
  const isDone = fix ? fix(code) === code : false;
  const markerLine = marker && !isDone ? lines.findIndex((l) => l.includes(marker)) + 1 : 0;
  const editedLine = isDone && afterMarker ? lines.findIndex((l) => l.includes(afterMarker) && !l.trimStart().startsWith("#")) + 1 : 0;
  const markerIsComment = markerLine > 0 && lines[markerLine - 1].trimStart().startsWith("#");
  const verb = swap ? "swap" : markerIsComment ? "delete the “# ” on" : "edit";
  const first = file?.span ? file.span[0] : 1;
  const status = readOnly ? "read only"
    : state === "saved" && savedHere && file?.validation.valid ? `✓ saved · ${afterHint || "lands on your next run"}`
    : state === "saved" ? "as on disk"
    : state === "invalid" ? `not saved · ${file?.validation.message || err}`
    : state === "saving" ? "saving…" : "unsaved";

  return (
    <div className="editor">
      <div className="eh">
        <span><b>{path}</b>{symbol ? <> · {symbol}</> : null}{file?.span ? <span className="dim"> · lines {file.span[0]}–{file.span[1]}</span> : null}
          {markerLine > 0 && !readOnly && <span className="mark-note"> · {verb} line {first + markerLine - 1}</span>}
          {editedLine > 0 && <span className="ok-note"> · line {first + editedLine - 1} edited</span>}</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <a className="src" href={sourceUrl(path)} target="_blank" rel="noreferrer" title="the whole file, as it is on disk">whole file ↗</a>
          {onDisk !== null && (
            <button className="src" style={{ color: "var(--vibe-amber)", borderColor: "var(--vibe-amber)" }} onClick={() => { known.current = { code: onDisk, original: onDisk }; setCode(onDisk); setOnDisk(null); setState("saved"); }}>
              changed on disk · reload
            </button>
          )}
          <span className={state === "invalid" ? "mark-note" : savedHere && state === "saved" ? "ok-note" : ""}>{status}</span>
        </span>
      </div>
      {err && !file ? <div style={{ color: "var(--vibe-red)", padding: 12, fontFamily: "var(--font-mono)", fontSize: 11 }}>{err}</div> : (
        <div className="body">
          <pre aria-hidden>
            {lines.map((l, i) => {
              const t = l.trimStart();
              const comment = t.startsWith("#");
              const target = Boolean(marker) && !isDone && !readOnly && l.includes(marker as string);
              const edited = editedLine > 0 && i + 1 === editedLine;
              const cls = target ? "hl" : edited ? "hl ok" : comment ? (t.startsWith("# 👉") ? "cmt" : "cm") : "";
              return <div key={i} className={"ln " + cls}><i>{first + i}</i><span>{l || " "}</span>{target && <em>← the one line</em>}{edited && <em>← edited · saved</em>}</div>;
            })}
          </pre>
          <textarea value={code} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} spellCheck={false} wrap="off"
            rows={lines.length} aria-label={`${path}${symbol ? " · " + symbol : ""}`} />
        </div>
      )}
      {change && <div className="wasnow"><span className="k">was</span><span className="was">{change[0]}</span><span className="k">now</span><span className="now">{change[1]}</span></div>}
      {fix && !readOnly && (
        <div className="efoot">
          {isDone ? <span className="ok-note">✓ the edit is in · {afterHint || "it lands on your next run"}</span> : <span>edit the one line here — it saves as you type — or press Hint, then Write the answer</span>}
        </div>
      )}
    </div>
  );
}
