"use client";
import type { Progress } from "@/lib/api";
import { CHAPTERS, CLOSING, SHOW } from "@/lib/chapters";

/** The check: three lines, your own numbers. Every number is a receipt. */
export default function Check({ p, name, onClose }: { p: Progress | null; name: string; onClose: () => void }) {
  const exams = p?.exams || [];
  const b = exams.filter((e) => !e.edit).slice(-1)[0];
  const a = exams.filter((e) => e.edit).slice(-1)[0];
  const lines: [string, string][] = [
    [`the first word${p?.workbench_calls ? ` · ${p.workbench_calls} in the workbench` : ""}`, p?.lit?.["1"] ? "lit" : "—"],
    ["the one line · tools=[door_code]", b || a ? `${b ? `${b.score}/${b.of}` : "–"} → ${a ? `${a.score}/${a.of}` : "–"}` : "—"],
    ["the check", p?.lit?.["3"] ? "paid" : "open"],
  ];
  return (
    <div className="sheet" onClick={onClose}>
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="t">{SHOW.title}</div>
        <div className="s">the check · {name || "tonight"}{p?.boot_id ? ` · boot ${p.boot_id}` : ""}</div>
        {lines.map(([k, v], i) => <div key={i} className={"ln" + (v === "—" ? " dim" : "")}><span>{CHAPTERS[i].roman}</span><span>{k}</span><span>{v}</span></div>)}
        <div className="tot"><span>{SHOW.lampWord} lit</span><span>{["1", "2"].filter((k) => p?.lit?.[k]).length} / 2</span></div>
        <div className="ty">every line is a receipt<em>“{CLOSING}”</em></div>
        <div style={{ textAlign: "center", marginTop: 14 }}><button className="btn on" onClick={onClose}>close</button></div>
      </div>
    </div>
  );
}
