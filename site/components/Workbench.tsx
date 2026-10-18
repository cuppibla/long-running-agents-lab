"use client";
import { useState } from "react";
import { ORIGIN } from "@/lib/api";
import { CHAPTERS, LINE } from "@/lib/chapters";

/** adk web, in a drawer. The same agent/ folder, the same lab.db — a reply
 *  here is a session there. The per-chapter steps live HERE and nowhere
 *  else; "[line]" in a step renders the copy-the-line button. */
function CopyLine() {
  const [done, setDone] = useState(false);
  return (
    <button className="copy" onClick={async () => {
      try { await navigator.clipboard.writeText(LINE); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* blocked */ }
    }}>{done ? "copied ✓" : "📋 copy the line"}</button>
  );
}

export default function Workbench({ open, onClose, chapter }: { open: boolean; onClose: () => void; chapter: number }) {
  const src = `${ORIGIN}/workbench/dev-ui/?app=agent`;
  const c = CHAPTERS[chapter - 1];
  return (
    <div className={"drawer" + (open ? " open" : "")} aria-hidden={!open}>
      <div className="hd">
        <span>🔬 THE WORKBENCH · adk web · same agent, same sessions</span>
        <span style={{ display: "flex", gap: 8 }}>
          <a className="btn" href={src} target="_blank" rel="noreferrer">open in a tab ↗</a>
          <button className="btn" onClick={onClose}>✕</button>
        </span>
      </div>
      <div className="wbhint">
        <div className="wbchap">ON CHAPTER {c.roman}, IN ADK WEB</div>
        <ol className="steps">
          {c.wbGuide.steps.map((st, i) => <li key={i}><b>{i + 1}</b><span>{st.includes("[line]") ? <>{st.split("[line]")[0]}<CopyLine />{st.split("[line]")[1]}</> : st}</span></li>)}
        </ol>
        <div className="see"><span>YOU WILL SEE</span> {c.wbGuide.see}</div>
      </div>
      {open && <iframe src={src} title="adk web" />}
    </div>
  );
}
