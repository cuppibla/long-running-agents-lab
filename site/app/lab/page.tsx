"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Chapter from "@/components/Chapter";
import Check from "@/components/Check";
import Rail from "@/components/Rail";
import Stage from "@/components/Stage";
import Workbench from "@/components/Workbench";
import { getProgress, say, type Progress } from "@/lib/api";
import { CHAPTERS, SHOW } from "@/lib/chapters";
import { isBig, useEvents } from "@/lib/useEvents";

/** The lab — one page, fixed shape.
 *  Left, the stage. Right, the chapter panel. The rail above lights from
 *  /api/progress, which reads your files and the receipts of what ran.
 *
 *  ?ch=N        open on chapter N (deep link)
 *  ?still=1     read the log once instead of holding the SSE open (headless Chrome)
 *  ?console=1   open the stage on the event table
 *  ?check=1     open the check */

const CH_KEY = "lab.chapter";
const N = CHAPTERS.length;

export default function LabPage() {
  const [chapter, setChapter] = useState(1);
  const [p, setP] = useState<Progress | null>(null);
  const [name, setName] = useState("");
  const [view, setView] = useState<"show" | "console">("show");
  const [drawer, setDrawer] = useState(false);
  const [check, setCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [nudge, setNudge] = useState("");          // something changed that adk web will show
  const f = useEvents();

  const refresh = useCallback(async () => { const x = await getProgress(); if (x) setP(x); }, []);

  useEffect(() => {
    try { setName(localStorage.getItem("lab.name") || ""); } catch { /* ignore */ }
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("console") === "1") setView("console");
    if (qs.get("check") === "1") setCheck(true);
    const want = parseInt(qs.get("ch") || "", 10);
    try {
      const c = want >= 1 && want <= N ? want : parseInt(localStorage.getItem(CH_KEY) || "1", 10);
      if (c >= 1 && c <= N) setChapter(c);
    } catch { if (want >= 1 && want <= N) setChapter(want); }
    refresh();
    const id = setInterval(refresh, 4000);
    const back = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", back); };
  }, [refresh]);

  // a big event (a reply, a score, a save) is worth an immediate re-read — and
  // some are worth a look in the workbench, so the page says so once.
  const lastBig = f.log.length ? f.log[f.log.length - 1] : null;
  useEffect(() => {
    if (!lastBig) return;
    if (isBig(lastBig.type)) refresh();
    const age = Date.now() / 1000 - (lastBig.t as number);
    if (age > 20) return;                                   // history on load is not news
    if (lastBig.type === "file_saved") setNudge("the file changed — adk web re-reads it on its next run");
    else if (lastBig.type === "exam_scored") setNudge("exam done — ask again in adk web and open the event");
  }, [lastBig?.i]);   // eslint-disable-line react-hooks/exhaustive-deps
  const openDrawer = (on: boolean) => { setDrawer(on); if (on) setNudge(""); };

  const go = (n: number) => { setChapter(n); try { localStorage.setItem(CH_KEY, String(n)); } catch { /* ignore */ } };
  const onSay = async (text: string) => {
    setBusy(true);
    try { const r = await say(text, name || "you"); if (!r.ok) setToast(String(r.error || "no reply")); }
    catch (e) { setToast((e as Error).message); }
    finally { setBusy(false); refresh(); }
  };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); }, [toast]);

  const lit = p?.lit || {};
  const litCount = ["1", "2"].filter((k) => lit[k]).length;
  const status = !f.connected ? ["off", "the lab is away"] : f.running ? ["busy", f.kind === "exam" ? "the exam is running" : "replying…"] : ["", `${SHOW.agent} is in`];

  return (
    <div className="wrap">
      <div className="head">
        <div>
          <div className="eyebrow"><Link href="/">{SHOW.title}</Link> · {SHOW.tag}</div>
          <h1 className="display">{SHOW.title.replace(SHOW.em, "")}<em>{SHOW.em}</em></h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="status"><i className={status[0]} />{status[1]}{p?.boot_id ? <span className="boot"> · boot {p.boot_id}</span> : null}</span>
          <span className="resv"><b>{name || "a guest"}</b> · {litCount} / 2 {SHOW.lampWord}</span>
          <button className={"btn" + (view === "console" ? " on" : "")} onClick={() => setView(view === "show" ? "console" : "show")}>🧾 console</button>
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {nudge && !drawer && <span className="wbnudge" onClick={() => openDrawer(true)}>{nudge}</span>}
            <button className={"btn" + (drawer ? " on" : "") + (nudge && !drawer ? " nudge" : "")} onClick={() => openDrawer(!drawer)}>🔬 workbench</button>
          </span>
        </div>
      </div>

      <Rail current={chapter} lit={lit} onPick={go} />

      <div className="main">
        <Stage chapter={chapter} p={p} f={f} view={view} onSay={onSay} busy={busy} />
        <Chapter n={chapter} p={p} f={f} onGo={go} onChanged={refresh} onCheck={() => setCheck(true)} onWorkbench={() => openDrawer(true)} />
      </div>

      <Workbench open={drawer} onClose={() => openDrawer(false)} chapter={chapter} />
      {check && <Check p={p} name={name} onClose={() => setCheck(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
