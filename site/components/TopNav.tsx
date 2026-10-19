"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PAGES } from "@/lib/pages";
import { useLab } from "./LabProvider";

/** Brand bar plus the roadmap: the mark (the fox), the wordmark, the mono tag, the live
 *  pill (SSE connected · a job running) and the dusk/night toggle; below, eight circles —
 *  the active chapter expanded to a labelled pill in its colour, the done ones (lit by
 *  /api/progress, never by a click) in colour outline. */
export function TopNav({ active }: { active: string }) {
  const { p, f, wakeRunning, replayRunning } = useLab();
  const [night, setNight] = useState(false);
  useEffect(() => { setNight(document.documentElement.classList.contains("night")); }, []);
  const toggle = () => {
    const on = !night; setNight(on);
    document.documentElement.classList.toggle("night", on);
    try { localStorage.setItem("lra.theme", on ? "night" : "dusk"); } catch { /* ignore */ }
  };
  const busy = f.running || wakeRunning || replayRunning;
  const what = f.running ? (f.kind === "clock" ? "the clock's run" : f.kind === "stage" ? "replying…" : `${f.kind} running`) : wakeRunning ? "🐓 armed" : replayRunning ? "▶ replaying" : f.connected ? "live" : "offline";
  const lit = p?.lit || {};
  return (
    <nav className="nav">
      <div className="bar">
        <Link className="brand" href="/lab/story/" aria-label="Long-Running Agents · the night">
          <span className="mark" /><span className="word">Long-Running <span className="holo">Agents</span></span>
          <span className="tag">· MonsterTix · ADK 2 on Google Cloud</span>
        </Link>
        <div className="navr">
          <span className="pill" title={busy ? what : f.connected ? "live: the page hears the server" : "not connected"}>
            <i className={busy ? "busy" : f.connected ? "" : "off"} /> {what}{p?.boot_id ? <span className="dim"> · {p.boot_id}</span> : null}
          </span>
          <button className="pill btn-theme" onClick={toggle} aria-label="toggle dusk / night" title={night ? "switch to dusk" : "switch to night"}>{night ? "☀" : "☾"}</button>
        </div>
      </div>
      <div className="roadmap">
        <ol>
          {PAGES.map((pg, i) => {
            const on = pg.slug === active;
            const done = pg.n >= 1 && Boolean(lit[String(pg.n)]);
            return (
              <li key={pg.slug}>
                {i > 0 && <span className="sep">›</span>}
                <Link href={`/lab/${pg.slug}/`} className={on ? "active" : done ? "done" : ""} style={{ "--c": pg.color } as React.CSSProperties} title={pg.label} aria-current={on ? "step" : undefined}>
                  <span className="n">{done && !on ? "✓" : i}</span>{on && <span>{pg.label.replace(/^[IVX0]+ · /, "")}</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
