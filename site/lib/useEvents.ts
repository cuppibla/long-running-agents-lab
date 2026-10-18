"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { eventsUrl, type Ev } from "./api";

/** The stage is a projection of the lab's event log. This hook keeps the
 *  log (recent history, then live) and folds the latest episode into the
 *  state the stage renders. Nothing here computes a score.
 *
 *  ?still=1 — capture mode: read the log once (GET /api/log) instead of
 *  holding the SSE open, so headless Chrome can take a picture of the page. */

export type Folded = {
  connected: boolean; episode: number; kind: string;
  asked: { who: string; text: string } | null;
  replied: { text: string; tools: string[]; tools_in_file: string[] } | null;
  cases: { i: number; of: number; prompt: string; reply: string; tools: string[]; pass: boolean }[];
  scored: { score: number; of: number; edit: boolean; tools: string[] } | null;
  error: string | null; done: boolean; running: boolean;
  log: Ev[];
};

const BIG = new Set(["say_replied", "exam_scored", "file_saved", "episode_done", "error"]);

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
          if (ev.i <= seen.current) return;
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
  const asked = last(ev, "say_asked");
  const replied = last(ev, "say_replied");
  const scored = last(ev, "exam_scored");
  const err = last(ev, "error");
  const done = ev.some((e) => e.type === "episode_done");
  return {
    connected, episode, kind: (start?.kind as string) || "",
    asked: asked ? { who: asked.who as string, text: asked.text as string } : null,
    replied: replied ? { text: replied.text as string, tools: (replied.tools as string[]) || [], tools_in_file: (replied.tools_in_file as string[]) || [] } : null,
    cases: ev.filter((e) => e.type === "exam_case").map((e) => ({ i: e.i as number, of: e.of as number, prompt: e.prompt as string, reply: e.reply as string, tools: (e.tools as string[]) || [], pass: Boolean(e.pass) })),
    scored: scored ? { score: scored.score as number, of: scored.of as number, edit: Boolean(scored.edit), tools: (scored.tools as string[]) || [] } : null,
    error: err ? (err.message as string) : null,
    done, running: Boolean(start) && !done,
    log,
  };
}

const last = (ev: Ev[], type: string) => { for (let i = ev.length - 1; i >= 0; i--) if (ev[i].type === type) return ev[i]; return null; };
export const isBig = (t: string) => BIG.has(t);
