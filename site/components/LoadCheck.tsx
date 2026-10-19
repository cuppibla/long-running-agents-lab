"use client";
import { useState } from "react";
import { readCode, type Progress } from "@/lib/api";
import { Kicker } from "./shared";

/** BEFORE YOU RUN: read both editable files back through /api/code — the same syntax check the
 *  editor saves through — and read which of the five lines are in the file now (/api/progress's
 *  code facts). adk web imports the file on its next run; the lab has no import-in-a-subprocess
 *  route, and the backend stays as it is. */
export default function LoadCheck({ p, onChanged }: { p: Progress | null; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const run = async () => {
    window.dispatchEvent(new Event("lra:sync"));
    setBusy(true); setOut(null);
    try {
      const files = ["agent/concert/agent.py", "agent/concert/nightly.py"];
      const rs = await Promise.all(files.map((f) => readCode(f)));
      await onChanged();
      const lines = rs.map((r, i) => `${files[i].split("/").pop()} · ${r.validation.message}${r.validation.line ? ` (line ${r.validation.line})` : ""}`);
      setOut({ ok: rs.every((r) => r.validation.valid), lines });
    } catch (e) { setOut({ ok: false, lines: [`could not reach the lab: ${(e as Error).message}`] }); }
    finally { setBusy(false); }
  };
  const code = p?.code;
  const facts = code ? (["recall", "queue", "fence", "graph", "budget"] as const).filter((k) => code[k]) : [];
  const tone = out ? (out.ok ? "var(--vibe-green)" : "var(--vibe-red)") : "var(--fg-muted)";
  return (
    <section className="card">
      <div className="runrow">
        <div>
          <Kicker>Before you run</Kicker>
          <p className="blurb" style={{ marginTop: 4 }}>Save the edit, then click the button. It reads both files back the way the editor saved them and says whether Python still parses them, and which lines are in. adk web imports the file on its next run.</p>
        </div>
        <button className="btn" onClick={run} disabled={busy}>{busy ? "checking…" : "↻ Check the agent loads"}</button>
      </div>
      {out && (
        <div className="hintbox" style={{ borderColor: `color-mix(in srgb, ${tone} 40%, transparent)`, color: tone, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
          {out.lines.map((l) => <div key={l}>{l}</div>)}
          {out.ok && <div style={{ marginTop: 6, color: "var(--fg-muted)" }}>in the file now: {facts.length ? facts.join(" · ") : "as shipped — no line in yet"} · adk web has it on its next run</div>}
        </div>
      )}
    </section>
  );
}
