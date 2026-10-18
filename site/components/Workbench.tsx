"use client";
import { useState } from "react";
import { ORIGIN, type Progress } from "@/lib/api";
import { CHAPTERS, LINE } from "@/lib/chapters";

/** adk web, in a drawer. The same agent/ folder, the same lab.db, the same
 *  artifacts — a run on the stage is a session here. The per-chapter steps
 *  live HERE and nowhere else; "[line]" in a step renders the copy button. */
function CopyLine() {
  const [done, setDone] = useState(false);
  return (
    <button className="copy" onClick={async () => {
      try { await navigator.clipboard.writeText(LINE); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* blocked */ }
    }}>{done ? "copied ✓" : "📋 copy the 3am sentence"}</button>
  );
}

export default function Workbench({ open, onClose, chapter, p }: { open: boolean; onClose: () => void; chapter: number; p: Progress | null }) {
  const src = `${ORIGIN}/workbench/dev-ui/?app=concert`;
  const c = CHAPTERS[chapter - 1];
  const g = c.wbGuide(p);
  return (
    <div className={"drawer" + (open ? " open" : "")} aria-hidden={!open}>
      <div className="dh">
        <span><b className="display">🔬 workbench</b> <span className="mono dim">adk web · same lab.db · /workbench</span></span>
        <span style={{ display: "flex", gap: 8 }}>
          <a className="btn" href={src} target="_blank" rel="noreferrer">open in a tab ↗</a>
          <button className="btn" onClick={onClose}>close ✕</button>
        </span>
      </div>
      <div className="dbody">
        <div className="guide">
          <div className="eyebrow">chapter {c.roman} · in adk web</div>
          <ol>{g.steps.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s }} />)}</ol>
          <div className="see"><b>you will see</b> · {g.see}</div>
          <CopyLine />
          <div className="dim mono" style={{ fontSize: 10.5 }}>agent <b>concert</b> · user <b>user</b> · sessions wake-… are the clock’s, web-… yours</div>
        </div>
        {open && <iframe src={src} title="adk web" />}
      </div>
    </div>
  );
}
