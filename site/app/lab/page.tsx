"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Breakfast from "@/components/Breakfast";
import Chapter from "@/components/Chapter";
import Console from "@/components/Console";
import NightShift from "@/components/NightShift";
import Rail from "@/components/Rail";
import Stage from "@/components/Stage";
import Workbench from "@/components/Workbench";
import { getHealth, getProgress, kill, newSession, say, startJob, world, type Progress } from "@/lib/api";
import { ART, CHAPTERS, SHOW } from "@/lib/chapters";
import { isBig, useEvents } from "@/lib/useEvents";

/** The lab — one page, fixed shape.
 *  Left, the stage. Right, the night shift and the chapter panel. The stubs
 *  above tear from /api/progress, which reads your files and the receipts.
 *
 *  ?ch=N        open on chapter N (deep link)
 *  ?still=1     read the log once instead of holding the SSE open (headless Chrome)
 *  ?console=1   open the console under the page
 *  ?check=1     open the breakfast message
 *  ?as=Name     seat a name (captures) */

const CH_KEY = "lra.chapter";
const SID_KEY = "lra.session";
const N = CHAPTERS.length;

export default function LabPage() {
  const [chapter, setChapter] = useState(1);
  const [p, setP] = useState<Progress | null>(null);
  const [name, setName] = useState("");
  const [sid, setSid] = useState<string | null>(null);
  const [console_, setConsole] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [check, setCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState("");
  const [nudge, setNudge] = useState("");
  const [still, setStill] = useState(false);
  const f = useEvents();
  const bootSeen = useRef<string>("");

  const refresh = useCallback(async () => { const x = await getProgress(); if (x) setP(x); }, []);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    try { setName(qs.get("as") || localStorage.getItem("lra.name") || ""); } catch { setName(qs.get("as") || ""); }
    try { setSid(localStorage.getItem(SID_KEY)); } catch { /* ignore */ }
    if (qs.get("console") === "1") setConsole(true);
    if (qs.get("still") === "1") setStill(true);
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

  // a new boot id = the process died and came back (💀, or a restart) — say so once
  useEffect(() => {
    if (!p?.boot_id) return;
    if (bootSeen.current && bootSeen.current !== p.boot_id) { setDark(false); setToast(`back · boot ${p.boots} · ${p.boot_id} · lab.db read from disk`); }
    bootSeen.current = p.boot_id;
  }, [p?.boot_id, p?.boots]);

  // a big event (a reply, a save, a world button) is worth an immediate re-read —
  // and some are worth a look in the workbench, so the page says so once.
  const lastBig = f.log.length ? f.log[f.log.length - 1] : null;
  useEffect(() => {
    if (!lastBig) return;
    if (isBig(lastBig.type)) refresh();
    const age = Date.now() / 1000 - (lastBig.t as number);
    if (age > 20) return;
    if (lastBig.type === "file_saved") setNudge("the file changed — adk web re-reads it on its next run");
    else if (lastBig.type === "run_replied" && lastBig.source === "clock") setNudge(`the clock made session ${lastBig.session_id} — open it in adk web`);
    else if (lastBig.type === "fence_refused") setNudge("fence.py answered purchase — open the event in adk web");
    else if (lastBig.type === "run_parked") setNudge("the run parked on adk_request_input — in adk web that event has its own answer box");
  }, [lastBig?.i]);   // eslint-disable-line react-hooks/exhaustive-deps
  const openDrawer = (on: boolean) => { setDrawer(on); if (on) setNudge(""); };

  const go = (n: number) => { setChapter(n); try { localStorage.setItem(CH_KEY, String(n)); } catch { /* ignore */ } window.scrollTo({ top: 0 }); };

  const ensureSession = async (): Promise<string> => {
    if (sid) return sid;
    const s = await newSession();
    setSid(s.session_id); try { localStorage.setItem(SID_KEY, s.session_id); } catch { /* ignore */ }
    return s.session_id;
  };
  const onSay = async (text: string) => {
    setBusy(true);
    try {
      const id = await ensureSession();
      const r = await say(text, id, name || "you");
      if (!r.ok) setToast(String(r.error || "no reply"));
      else if (r.session_id && r.session_id !== id) { setSid(r.session_id); try { localStorage.setItem(SID_KEY, r.session_id); } catch { /* ignore */ } }
    } catch (e) { setToast((e as Error).message); }
    finally { setBusy(false); refresh(); }
  };
  const onWorld = async (action: string, body: Record<string, unknown> = {}) => {
    try { await world(action, body); setToast(`the world · ${action}${body.section ? ` · section ${body.section}` : ""}${body.multiplier ? ` · ${body.multiplier}×` : ""}`); }
    catch (e) { setToast((e as Error).message); }
    refresh();
  };
  const onWake = async () => { try { await startJob("wake"); setToast("🐓 armed · fires in 10 s · hands off the keyboard"); } catch (e) { setToast((e as Error).message); } refresh(); };
  const onKill = async () => {
    setDark(true);
    try { await kill(); } catch { /* it died on purpose */ }
    const t0 = Date.now();
    const wait = async () => {
      try { const h = await getHealth(); if (h.boot_id && h.boot_id !== bootSeen.current) { await refresh(); return; } } catch { /* still dead */ }
      if (Date.now() - t0 < 30000) setTimeout(wait, 700); else { setDark(false); setToast("the process did not come back — is lab.sh running it? (its loop restarts the server)"); }
    };
    setTimeout(wait, 900);
  };
  const newConversation = async () => { const s = await newSession(); setSid(s.session_id); try { localStorage.setItem(SID_KEY, s.session_id); } catch { /* ignore */ } setToast(`new conversation · ${s.session_id}`); refresh(); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4500); return () => clearTimeout(t); }, [toast]);

  const lit = p?.lit || {};
  const torn = ["1", "2", "3", "4", "5", "6"].filter((k) => lit[k]).length;
  const venueUp = Boolean(p?.venue?.ok);
  const status = !f.connected ? ["off", "the lab is away"] : f.running ? ["busy", f.kind === "clock" ? "the clock's run" : f.kind === "stage" ? "replying…" : `${f.kind} running`] : [venueUp ? "" : "off", venueUp ? `the venue is up · ${p?.venue?.clock || 1}×` : "the venue is down"];
  const asleep = !((chapter === 2 && lit["2"]) || (chapter === 6 && p?.budget?.after?.asked));

  return (
    <div className={"wrap" + (still ? " still" : "")}>
      <div className="head">
        <div>
          <div className="eyebrow"><Link href="/">{SHOW.eyebrow}</Link></div>
          <h1 className="display">{SHOW.title.replace(SHOW.em, "")}<em>{SHOW.em}</em></h1>
          <div className="tag">{SHOW.tag}</div>
        </div>
        <div className="headr">
          <span className="status"><i className={status[0]} />{status[1]}{p?.boot_id ? <span className="dim"> · boot {p.boot_id}</span> : null}</span>
          <span className="youchip" title={sid ? `your conversation · ${sid} · click for a new one` : "no conversation yet"} onClick={newConversation} style={{ cursor: "pointer" }}>
            <span className="av av-sleeper" style={{ backgroundImage: `url(${ART.av.sleeper})` }} /><span><b>{name || "you"}</b> · {asleep ? "asleep · 3:00am" : "awake"} · {torn}/6</span>
          </span>
          <button className={"btn" + (console_ ? " on" : "")} onClick={() => setConsole(!console_)}>🧾 console</button>
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {nudge && !drawer && <span className="wbnudge" onClick={() => openDrawer(true)}>{nudge}</span>}
            <button className={"btn" + (drawer ? " on" : "") + (nudge && !drawer ? " nudge" : "")} onClick={() => openDrawer(!drawer)}>🔬 workbench</button>
          </span>
        </div>
      </div>

      <Rail current={chapter} lit={lit} onPick={go} />

      <div className="main">
        <Stage chapter={chapter} p={p} f={f} name={name} busy={busy} onSay={onSay} onWorld={onWorld} onKill={onKill} onChanged={refresh} onNew={newConversation} />
        <div className="col">
          <NightShift n={chapter} p={p} f={f} />
          <Chapter n={chapter} p={p} f={f} onGo={go} onChanged={refresh} onCheck={() => setCheck(true)} onWorkbench={() => openDrawer(true)} onWake={onWake} />
        </div>
      </div>

      {(check || chapter === N) && <div style={{ marginTop: 16 }}><Breakfast p={p} name={name} /></div>}
      {console_ && <div style={{ marginTop: 16 }}><Console f={f} p={p} /></div>}

      <Workbench open={drawer} onClose={() => openDrawer(false)} chapter={chapter} p={p} />
      {dark && <div className="dark"><div><div className="display">💀 lights out</div><div className="mono">the process is gone · lab.sh starts a new one · what lived in memory is gone, lab.db is not</div></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
