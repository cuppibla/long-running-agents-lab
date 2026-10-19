"use client";
import { useState } from "react";
import { readCode, writeCode, type Progress } from "@/lib/api";
import type { Chapter } from "@/lib/chapters";
import type { Page } from "@/lib/pages";
import Editor from "./Editor";
import { Html, Kicker } from "./shared";

/** YOUR EDIT, the amber card: the title is the gesture itself, the pill says as shipped /
 *  the line is in, and Hint → Write the answer → Write the answer again. The answer is the same
 *  transform the editor and scripts/walk.py use (symbol-scoped, so it hits the code line and not
 *  the docstring's copy), written through /api/code. */
export function isEditDone(c: Chapter, p: Progress | null): boolean {
  const code = p?.code; if (!code) return false;
  switch (c.n) { case 2: return code.recall; case 3: return code.queue; case 4: return code.fence; case 5: return code.graph; case 6: return code.budget; default: return false; }
}

export default function EditCard({ page, c, p, onChanged }: { page: Page; c: Chapter; p: Progress | null; onChanged: () => void }) {
  const e = c.edit; const copy = page.edit;
  const [hint, setHint] = useState(0);
  const [writing, setWriting] = useState(false);
  const [written, setWritten] = useState<{ ok: boolean; text: string } | null>(null);
  if (!e || !copy) return null;
  const ok = isEditDone(c, p);
  const writeAnswer = async () => {
    if (!e.fix) return;
    setWriting(true);
    try {
      const f0 = await readCode(e.file, e.symbol);
      const fixed = e.fix(f0.content);
      if (fixed === f0.content) setWritten({ ok: true, text: `${e.file} already has it — ${e.change[1]}` });
      else {
        const out = await writeCode(e.file, fixed, e.symbol);
        setWritten(out.validation.valid ? { ok: true, text: `Written to ${e.file} and saved · ${e.afterHint || "lands on your next run"}` } : { ok: false, text: out.validation.message });
      }
      window.dispatchEvent(new Event("lra:sync"));
      onChanged();
    } catch (err) { setWritten({ ok: false, text: (err as Error).message }); }
    finally { setWriting(false); }
  };
  const onHint = () => { if (hint >= 1) void writeAnswer(); setHint((h) => Math.min(h + 1, 2)); };
  return (
    <section className="edit">
      <div className="top">
        <div>
          <Kicker color="var(--vibe-amber)">Your edit</Kicker>
          <h2><Html html={copy.title} />.</h2>
          <Html as="p" className="blurb" html={copy.intro} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={"statepill" + (ok ? " ok" : "")}>{ok ? `${e.change[1]} is in` : "as shipped"}</span>
          <button className="hintbtn" onClick={onHint} disabled={writing}>💡 {writing ? "writing…" : hint === 0 ? "Hint" : hint === 1 ? "Write the answer" : "Write the answer again"}</button>
        </div>
      </div>
      {hint >= 1 && (
        <div className="hintbox">
          <p style={{ margin: 0 }}><b>Hint 1.</b> The line is highlighted in <code>{e.file}</code>{e.symbol ? <> · <code>{e.symbol}</code></> : null}. {e.swap ? <>Replace <code>{e.change[0]}</code> with the line below.</> : <>Delete the <code>#&nbsp;</code> in front of it, so the line reads as below. The 👉 comments above it say why.</>}</p>
          {hint >= 2 && <pre>{e.change[1]}</pre>}
          {hint >= 2 && <div className="wrote" style={{ color: written ? (written.ok ? "var(--vibe-green)" : "var(--vibe-red)") : "var(--fg-muted)" }}>{written ? written.text : writing ? "writing…" : ""}</div>}
        </div>
      )}
      <Editor path={e.file} symbol={e.symbol} marker={e.marker} afterMarker={e.afterMarker} fix={e.fix} afterHint={e.afterHint} change={e.change} swap={e.swap} onSaved={onChanged} />
    </section>
  );
}
