"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getHealth, getJob, getProgress, kill, newSession, say, startJob, world, type Job, type Progress } from "@/lib/api";
import { isBig, useEvents, type Folded } from "@/lib/useEvents";

/** One lab, every page: the receipts (/api/progress, polled), the event log (SSE, or
 *  once with ?still=1), your conversation id, your name, the two jobs (🐓 wake, ▶ replay)
 *  and the actions every card presses — say, 🐓, 💀, the world buttons. Lives in the root
 *  layout, so moving between chapters keeps the stream open.
 *
 *  ?still=1     read the log once instead of holding the SSE open (headless Chrome); no motion
 *  ?as=Name     seat a name (captures) — it goes on the breakfast message
 *  ?console=1   open the console strip under RUN IT */

export type Lab = {
  p: Progress | null; f: Folded; name: string; setName: (n: string) => void; sid: string | null;
  busy: boolean; still: boolean; consoleOpen: boolean; toast: string; dark: boolean;
  wake: Job | null; replay: Job | null; wakeRunning: boolean; replayRunning: boolean; wait: boolean;
  refresh: () => Promise<void>;
  say: (text: string) => Promise<void>; sayFresh: (text: string) => Promise<void>;
  fireWake: () => Promise<void>; fireReplay: () => Promise<void>; seed: () => Promise<void>;
  killIt: () => Promise<void>; world: (action: string, body?: Record<string, unknown>) => Promise<void>;
  newConversation: () => Promise<void>; setToast: (s: string) => void;
};

const Ctx = createContext<Lab | null>(null);
const SID_KEY = "lra.session";

export function LabProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Progress | null>(null);
  const [name, setNameState] = useState("");
  const [sid, setSid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [still, setStill] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(false);
  const [wake, setWake] = useState<Job | null>(null);
  const [replay, setReplay] = useState<Job | null>(null);
  const f = useEvents();
  const bootSeen = useRef("");
  const wakePrev = useRef("idle");
  const replayPrev = useRef("idle");

  const refresh = useCallback(async () => { const x = await getProgress(); if (x) setP(x); }, []);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const as = qs.get("as");
    try { setNameState(as || localStorage.getItem("lra.name") || ""); } catch { setNameState(as || ""); }
    try { setSid(localStorage.getItem(SID_KEY)); } catch { /* ignore */ }
    if (qs.get("still") === "1") { setStill(true); document.documentElement.classList.add("still"); }
    if (qs.get("console") === "1") setConsoleOpen(true);
    try { if (localStorage.getItem("lra.theme") === "night") document.documentElement.classList.add("night"); } catch { /* ignore */ }
    refresh();
    const id = setInterval(refresh, 4000);
    const back = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", back); };
  }, [refresh]);

  // the two jobs, polled: fast while one runs, slow otherwise; a job that just ended re-reads the receipts
  useEffect(() => {
    const poll = async () => {
      try { const j = await getJob("wake"); setWake(j); if (wakePrev.current === "running" && j.state !== "running") refresh(); wakePrev.current = j.state; } catch { /* away */ }
      try { const j = await getJob("replay"); setReplay(j); if (replayPrev.current === "running" && j.state !== "running") refresh(); replayPrev.current = j.state; } catch { /* away */ }
    };
    poll();
    const fast = wake?.state === "running" || replay?.state === "running";
    const id = setInterval(poll, fast ? 1200 : 5000);
    return () => clearInterval(id);
  }, [wake?.state, replay?.state, refresh]);

  // a new boot id = the process died and came back (💀, or a restart) — say so once
  useEffect(() => {
    if (!p?.boot_id) return;
    if (bootSeen.current && bootSeen.current !== p.boot_id) { setDark(false); setToast(`back · boot ${p.boots} · ${p.boot_id} · lab.db read from disk`); }
    bootSeen.current = p.boot_id;
  }, [p?.boot_id, p?.boots]);

  // a big event (a reply, a save, a world button) is worth an immediate re-read
  const lastBig = f.log.length ? f.log[f.log.length - 1] : null;
  useEffect(() => { if (lastBig && isBig(lastBig.type)) refresh(); }, [lastBig?.i]);   // eslint-disable-line react-hooks/exhaustive-deps

  const setName = (n: string) => { setNameState(n); try { localStorage.setItem("lra.name", n.trim()); } catch { /* ignore */ } };
  const keep = (id: string) => { setSid(id); try { localStorage.setItem(SID_KEY, id); } catch { /* ignore */ } };
  const ensureSession = async (): Promise<string> => { if (sid) return sid; const s = await newSession(); keep(s.session_id); return s.session_id; };
  const sayWith = async (id: string, text: string) => {
    setBusy(true);
    try {
      const r = await say(text, id, name || "you");
      if (!r.ok) setToast(String(r.error || "no reply"));
      else if (r.session_id && r.session_id !== id) keep(r.session_id);
    } catch (e) { setToast((e as Error).message); }
    finally { setBusy(false); refresh(); }
  };
  const sayText = async (text: string) => sayWith(await ensureSession(), text);
  const sayFresh = async (text: string) => { const s = await newSession(); keep(s.session_id); await sayWith(s.session_id, text); };
  const doWorld = async (action: string, body: Record<string, unknown> = {}) => {
    try { await world(action, body); setToast(`the world · ${action}${body.section ? ` · section ${body.section}` : ""}${body.multiplier ? ` · ${body.multiplier}×` : ""}`); }
    catch (e) { setToast((e as Error).message); }
    refresh();
  };
  const fireWake = async () => { try { await startJob("wake"); setToast("🐓 armed · fires in 10 s · hands off the keyboard"); } catch (e) { setToast((e as Error).message); } try { setWake(await getJob("wake")); } catch { /* away */ } };
  const fireReplay = async () => { try { await startJob("replay"); setToast("▶ eight sentences, a new conversation, about a minute · hands off"); } catch (e) { setToast((e as Error).message); } try { setReplay(await getJob("replay")); } catch { /* away */ } };
  const seed = async () => { try { await startJob("seed"); setToast("▶ seeding the two-days-ago session"); } catch (e) { setToast((e as Error).message); } setTimeout(refresh, 4000); };
  const killIt = async () => {
    setDark(true);
    try { await kill(); } catch { /* it died on purpose */ }
    const t0 = Date.now();
    const waitBack = async () => {
      try { const h = await getHealth(); if (h.boot_id && h.boot_id !== bootSeen.current) { await refresh(); return; } } catch { /* still dead */ }
      if (Date.now() - t0 < 30000) setTimeout(waitBack, 700); else { setDark(false); setToast("the process did not come back — is lab.sh running it? (its loop restarts the server)"); }
    };
    setTimeout(waitBack, 900);
  };
  const newConversation = async () => { const s = await newSession(); keep(s.session_id); setToast(`new conversation · ${s.session_id}`); refresh(); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 4500); return () => clearTimeout(t); }, [toast]);

  const wakeRunning = wake?.state === "running";
  const replayRunning = replay?.state === "running";
  const lab: Lab = {
    p, f, name, setName, sid, busy, still, consoleOpen, toast, dark, wake, replay, wakeRunning, replayRunning,
    wait: busy || f.running || wakeRunning || replayRunning,
    refresh, say: sayText, sayFresh, fireWake, fireReplay, seed, killIt, world: doWorld, newConversation, setToast,
  };
  return (
    <Ctx.Provider value={lab}>
      {children}
      {dark && <div className="dark"><div><div className="display">💀 lights out</div><div className="mono">the process is gone · lab.sh starts a new one · what lived in memory is gone, lab.db is not</div></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}

export function useLab(): Lab {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLab outside LabProvider");
  return ctx;
}
