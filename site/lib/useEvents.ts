"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { eventsUrl, type Ev } from "./api";

/** The stage is a projection of the lab's event log. This hook keeps the
 *  log (recent history, then live) and folds the latest episode into the
 *  state the stage renders: is a run going, who started it, what it has
 *  called so far. Receipts (progress.thread) carry the finished runs; the
 *  log carries the one in flight.
 *
 *  ?still=1 — capture mode: read the log once (GET /api/log) instead of
 *  holding the SSE open, so headless Chrome can take a picture of the page. */

export type Folded = {
  connected: boolean; episode: number; kind: string;        // kind: stage · clock · seed · ""
  running: boolean; done: boolean;
  asked: { who: string; text: string } | null;
  calledSoFar: string[];
  replied: { text: string; tools: string[]; awaiting: boolean; session_id: string } | null;
  clock: "idle" | "armed" | "fired";
  error: string | null;
  log: Ev[];
};

const BIG = new Set(["run_replied", "file_saved", "job_done", "world", "seeded", "kill", "boot", "error", "fence_refused", "venue_409", "run_parked"]);

export function useEvents(): Folded {
  const [log, setLog] = useState<Ev[]>([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef(-1);

  useEffect(() => {
    let es: EventSource | null = null;
    let dead = false;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("still") === "1") {
      fetch(eventsUrl().replace(/\/events$/, "/log")).then((r) => r.json())
        .then((d: { events: Ev[] }) => { setLog(d.events); setConnected(true); }).catch(() => setConnected(false));
      return () => { dead = true; };
    }
    const open = () => {
      if (dead) return;
      es = new EventSource(eventsUrl());
      es.onopen = () => setConnected(true);
      es.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data) as Ev;
          if (ev.i <= seen.current) {
            // a new boot restarts the counter — a smaller `i` after a kill is a new process, not a repeat
            if (ev.type !== "boot" && ev.i < seen.current - 50) seen.current = -1; else if (ev.type !== "boot") return;
          }
          seen.current = ev.i;
          setLog((p) => [...p.slice(-600), ev]);
        } catch { /* keep-alive */ }
      };
      es.onerror = () => { setConnected(false); es?.close(); setTimeout(open, 2000); };
    };
    open();
    return () => { dead = true; es?.close(); };
  }, []);

  return useMemo(() => fold(log, connected), [log, connected]);
}

function fold(log: Ev[], connected: boolean): Folded {
  const episode = log.length ? Math.max(...log.map((e) => e.ep)) : 0;
  const ev = log.filter((e) => e.ep === episode);
  const start = ev.find((e) => e.type === "episode_started");
  const asked = last(ev, "run_asked");
  const replied = last(ev, "run_replied");
  const err = last(ev, "error");
  const done = ev.some((e) => e.type === "episode_done" || e.type === "job_done");
  const kind = (start?.kind as string) || "";
  const clockFired = ev.some((e) => e.type === "clock_fired");
  const clockArmed = ev.some((e) => e.type === "clock_armed");
  return {
    connected, episode, kind,
    running: Boolean(start) && !done,
    done,
    asked: asked ? { who: asked.who as string, text: asked.text as string } : null,
    calledSoFar: ev.filter((e) => e.type === "tool_called").map((e) => e.name as string),
    replied: replied ? { text: replied.text as string, tools: (replied.tools as string[]) || [], awaiting: Boolean(replied.awaiting), session_id: replied.session_id as string } : null,
    clock: kind === "clock" && !done ? (clockFired ? "fired" : clockArmed ? "armed" : "idle") : "idle",
    error: err ? (err.message as string) : null,
    log,
  };
}

const last = (ev: Ev[], type: string) => { for (let i = ev.length - 1; i >= 0; i--) if (ev[i].type === type) return ev[i]; return null; };
export const isBig = (t: string) => BIG.has(t);
