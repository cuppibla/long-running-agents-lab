"use client";
import { useState } from "react";
import { sourceUrl } from "@/lib/api";
import type { Chapter } from "@/lib/chapters";
import type { Page } from "@/lib/pages";
import { useLab } from "./LabProvider";
import { Html, Kicker } from "./shared";

/** VERIFY: what the receipts say. Rows read from /api/progress — lab.db, the job log, the venue —
 *  never from a checklist; a row turns green when its receipt is in, and the roadmap circle fills
 *  when the chapter's lamp does. Under the rows, the measured numbers (what it did) and, for
 *  chapter II, where each fact lives. Check again re-reads everything. */
export default function VerifyCard({ page, c }: { page: Page; c: Chapter }) {
  const { p, refresh } = useLab();
  const [busy, setBusy] = useState(false);
  const ticks = c.ticks(p);
  const tiles = c.tiles(p);
  const places = c.places?.(p);
  const need = ticks.some((t) => !t.ok && !t.opt);
  let hinted = false;
  return (
    <section className="card">
      <div className="runrow">
        <div><Kicker>Verify</Kicker><h2>What the receipts say.</h2><Html as="p" className="blurb" html={page.verify?.intro || c.check} /></div>
        <button className="btn" disabled={busy} onClick={async () => { setBusy(true); await refresh(); setBusy(false); }}>{busy ? "reading…" : "↻ Check again"}</button>
      </div>
      <div className="rows">
        {ticks.map((t, i) => {
          const h = !t.ok && !hinted && t.hint && !(need && t.opt); if (h) hinted = true;
          return (
            <div key={i} className={"row" + (t.ok ? " ok" : "") + (t.opt ? " opt" : "")}>
              <span className="bx">{t.ok ? "✓" : ""}</span>
              <span className="lbl">{t.label}{t.opt && !t.ok && <small>optional</small>}</span>
              <span className="num">{t.ok ? "in lab.db" : h ? t.hint : ""}</span>
            </div>
          );
        })}
      </div>
      {tiles.length > 0 && <div className="tiles">{tiles.map((t, i) => <div key={i} className="tile"><div className="k">{t.k}</div><div className={"v " + (t.cls || "")}>{t.v}</div>{t.s && <div className="s">{t.s}</div>}</div>)}</div>}
      {places && places.length > 0 && (
        <div className="tile" style={{ marginTop: 10 }}><div className="k">where it lives · {c.placesFrom ? `${c.placesFrom(p)} · ` : ""}read from lab.db, artifacts/ and the file</div>
          <div className="places">{places.map((pl, i) => <div key={i} className="pl"><span className={pl.c}>{pl.c === "y" ? "✓" : pl.c === "n" ? "✗" : "–"}</span><span><b>{pl.k}</b> · {pl.s}</span></div>)}</div>
        </div>
      )}
      <div className="sources"><span className="k">source</span>{c.sources.map(([label, path]) => <a key={path + label} href={sourceUrl(path)} target="_blank" rel="noreferrer" title={path}>{label} ↗</a>)}</div>
      {p?.error && <div className="err">{p.error}</div>}
    </section>
  );
}
