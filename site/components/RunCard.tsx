"use client";
import { ORIGIN } from "@/lib/api";
import { LINE, type Chapter, type Step } from "@/lib/chapters";
import type { Page } from "@/lib/pages";
import Console from "./Console";
import { useLab } from "./LabProvider";
import { Copy, Html, Kicker } from "./shared";

/** RUN IT: the big button in the chapter's colour (🐓 wake · 💀 kill · sell the seats), then
 *  one numbered card per step of the chapter — the sentence to say (⧉ copies it, “say →” says
 *  it on the stage), the button when the step is a press, and “you will see” — with the step
 *  you are on ringed (computed from receipts) and its note. The adk web step is the last card:
 *  the per-chapter guide and the button that opens the dev UI in a new tab. A strip under the
 *  cards says what a job is doing, and a DoneBanner when the chapter's receipt is in. The
 *  console (one event stream) folds under it. */
export const WB_URL = `${ORIGIN}/workbench/dev-ui/?app=concert`;

export default function RunCard({ page, c }: { page: Page; c: Chapter }) {
  const lab = useLab();
  const { p, f, wait, wake, replay, wakeRunning, replayRunning, consoleOpen } = lab;
  const run = page.run!;
  const lit = Boolean(p?.lit?.[String(c.n)]);
  const now = c.now(p);
  const done = lit || now.n > c.steps.length;
  const steps = c.steps.filter((s) => s.act !== "wb" && s.act !== "phone");
  const wb = c.steps.find((s) => s.act === "wb");
  const guide = c.wbGuide(p);
  const tiles = c.tiles(p);
  const bigClick = run.big === "wake" ? lab.fireWake : run.big === "kill" ? lab.killIt : run.big === "sell" ? () => lab.world("sellout", { section: "A" }) : () => window.open(WB_URL, "_blank");
  const wakeLeft = Math.max(0, 10 - Math.round(wake?.elapsed || 0));

  const act = (s: Step, k: number) => {
    const sayIt = () => (s.fresh ? lab.sayFresh : lab.say)(s.say as string);
    switch (s.act) {
      case "edit": return <div className="act"><a className="btn sm" href="#your-edit">↑ your edit, above</a></div>;
      case "wake": return <div className="act"><button className="btn sm" disabled={wait} onClick={lab.fireWake}>🐓 wake it at 3am</button><span className="hint">fires in 10 s · hands off the keyboard</span></div>;
      case "skipwake": return <div className="act"><button className="btn sm" disabled={wait} onClick={() => lab.world("advance-queue")}>1 · skip the wait</button><button className="btn sm" disabled={wait} onClick={lab.fireWake}>2 · 🐓 wake it</button></div>;
      case "kill": return <div className="act"><button className="btn sm danger" disabled={wait} onClick={lab.killIt}>💀 kill the process</button><span className="hint">the lights go out; lab.sh brings it back</span></div>;
      case "sell": return <div className="act"><button className="btn sm" disabled={wait} onClick={() => lab.world("sellout", { section: "A" })}>1 · sell the good seats</button><button className="btn sm" disabled={wait} onClick={() => lab.world("advance-queue")}>2 · skip the wait</button></div>;
      case "replay": return <div className="act"><button className="btn sm" disabled={wait} onClick={lab.fireReplay}>{replayRunning ? `▶ replaying · turn ${Number(replay?.meta?.turn || 0)} of ${Number(replay?.meta?.turns || 8)}` : "▶ a longer conversation"}</button><span className="hint">{replayRunning ? `“${String(replay?.meta?.text || "")}”` : "eight sentences, a new conversation, about a minute · hands off"}</span></div>;
      default: return s.say ? (
        <div className="act">
          <button className="btn sm" disabled={wait} onClick={sayIt} title={s.fresh ? "opens a new conversation, then says this on the stage" : "says this on the stage"}>{s.fresh ? "↻ new conversation, then say →" : "say it on the stage →"}</button>
          {s.optional && s.skip === "wake" && !done && <button className="btn sm" disabled={wait} onClick={lab.fireWake} title="skip the optional sentence — the clock is the step that lights the chapter">or skip · 🐓</button>}
          {k === 0 ? null : null}
        </div>) : null;
    }
  };

  // the strip under the cards: what a job is doing, or what the chapter's receipt says
  let banner: React.ReactNode = null;
  if (wakeRunning) banner = <div className="banner busy"><div className="txt"><span className="ic">🐓</span><div><b>{f.clock === "fired" ? "fired · the agent is running" : `armed · fires in ${wakeLeft} s`}</b><span>hands off the keyboard — nobody types this one. The stage shows the run as it happens.</span></div></div></div>;
  else if (replayRunning) banner = <div className="banner busy"><div className="txt"><span className="ic">▶</span><div><b>replaying · turn {Number(replay?.meta?.turn || 0)} of {Number(replay?.meta?.turns || 8)}</b><span>“{String(replay?.meta?.text || "")}” — watch the stage</span></div></div></div>;
  else if (lit) banner = <div className="banner"><div className="txt"><span className="ic">✓</span><div><b>Finished · {c.done}</b><span>{tiles[0] ? `${tiles[0].k} · ${tiles[0].v}${tiles[0].s ? ` — ${tiles[0].s}` : ""}` : c.check}</span></div></div><a className="btn solid" href={WB_URL} target="_blank" rel="noreferrer">Open adk web</a></div>;
  else if (wake?.state === "done" && wake.ended && Date.now() / 1000 - wake.ended < 180 && c.steps.some((s) => s.act === "wake" || s.act === "skipwake")) banner = <div className="banner bad"><div className="txt"><span className="ic">!</span><div><b>The clock ran · the receipt is not in yet</b><span>{String(wake.summary?.reply || wake.log.slice(-1)[0] || "read the stage, then check the rows below")}</span></div></div></div>;

  return (
    <section className="card" id="run-it">
      <div className="runrow">
        <div><Kicker>Run it</Kicker><h2>{run.h2}</h2><Html as="p" className="blurb" html={run.intro} /></div>
        <button className="btn solid" disabled={wait && run.big !== "wb"} onClick={bigClick}>{run.bigLabel}</button>
      </div>
      <div className={`cards3 n${steps.length}`}>
        {steps.map((s) => {
          const k = c.steps.indexOf(s) + 1;
          const isNow = !done && k === now.n;
          const isDone = done ? !s.optional : k < now.n;
          return (
            <div key={k} className={"c3" + (isNow ? " now" : isDone ? " done" : "")}>
              {isNow && <span className="here">you are here</span>}
              <div className="t"><span className="n">{isDone ? "✓" : k}</span>{s.lbl}{s.optional && <span className="opt">optional</span>}</div>
              <Html as="div" className="do" html={s.do} />
              {s.say && <div className="s"><span title={s.say}>{s.say}</span><Copy text={s.say} /></div>}
              {act(s, k)}
              {isNow && now.note && <div className="note">{now.note}</div>}
              {s.see && <div className="see"><Html html={s.see} /></div>}
            </div>
          );
        })}
      </div>
      {wb && (
        <div className="wbcard">
          <div className="runrow">
            <div><Kicker>{c.steps.indexOf(wb) + 1} · in adk web</Kicker><Html as="div" className="do" html={wb.do} /></div>
            <a className="btn" href={WB_URL} target="_blank" rel="noreferrer">🔬 Open adk web ↗</a>
          </div>
          <ol>{guide.steps.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s }} />)}</ol>
          <div className="see"><b>you will see</b> · {guide.see}</div>
          <div className="wrow"><Copy text={LINE} label="⧉ copy the 3am sentence" className="btn sm" /><span className="mono dim" style={{ fontSize: 10.5 }}>agent <b>concert</b> · user <b>user</b> · sessions wake-… are the clock’s, web-… yours · same lab.db</span></div>
        </div>
      )}
      {banner}
      <details className="console" open={consoleOpen}>
        <summary>🧾 console · one event stream · episode {f.episode} · {f.log.length} events</summary>
        <Console f={f} p={p} />
      </details>
    </section>
  );
}
