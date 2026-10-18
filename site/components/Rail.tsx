"use client";
import { CHAPTERS } from "@/lib/chapters";

/** Tonight's stubs: seven ADMIT ONE tickets. A stub tears when a chapter is
 *  proven — blank · the one you are on (amber) · torn (mint). `lit` comes from
 *  /api/progress, never from a click. */
const Ticket = () => (
  <svg className="ticket" viewBox="0 0 30 20" aria-hidden>
    <path className="b" d="M1 1h28v7a2.5 2.5 0 0 0 0 4v7H1v-7a2.5 2.5 0 0 0 0-4z" />
    <line className="tr" x1="20" y1="2" x2="20" y2="18" />
  </svg>
);

export default function Rail({ current, lit, onPick }: { current: number; lit: Record<string, boolean>; onPick: (n: number) => void }) {
  return (
    <div className="card rail">
      <div className="lbl display">Tonight’s<br />stubs<small>admit one · seven</small></div>
      <div className="stubs">
        {CHAPTERS.map((c) => {
          const done = Boolean(lit[String(c.n)]);
          return (
            <button key={c.n} className={"stubx" + (c.n === current ? " now" : "") + (done ? " done" : "")} onClick={() => onPick(c.n)} title={c.check}>
              <Ticket />
              <div><div className="n">{c.roman}</div><div className="t">{c.name}</div></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
