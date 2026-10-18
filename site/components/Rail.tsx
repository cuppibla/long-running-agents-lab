"use client";
import { CHAPTERS, SHOW } from "@/lib/chapters";

/** The rail: three chapters, three lamps. A lamp lights when a chapter is
 *  proven — off · the one you are on · lit. `lit` comes from /api/progress,
 *  never from a click. */
const Lamp = ({ state }: { state: "" | "now" | "lit" }) => (
  <svg className="lamp" viewBox="0 0 34 34">
    <path className="shade" d="M9 6 h16 l4 12 h-24 z" />
    <rect className="stem" x="16" y="18" width="2" height="9" />
    <rect className="base" x="11" y="27" width="12" height="2.5" rx="1" />
    {state === "lit" && <circle className="glow" cx="17" cy="12" r="11" />}
    {state === "now" && <circle className="dot" cx="17" cy="12" r="3" />}
  </svg>
);

export default function Rail({ current, lit, onPick }: { current: number; lit: Record<string, boolean>; onPick: (n: number) => void }) {
  return (
    <div className="card rail">
      <div className="lbl">{SHOW.title}<small>THREE CHAPTERS · {SHOW.lampWord.toUpperCase()}</small></div>
      <div className="chapters">
        {CHAPTERS.map((c) => {
          const done = Boolean(lit[String(c.n)]);
          return (
            <button key={c.n} className={"chap" + (c.n === current ? " now" : "") + (done ? " done" : "")} onClick={() => onPick(c.n)}>
              <Lamp state={done ? "lit" : c.n === current ? "now" : ""} />
              <div><div className="n">CHAPTER {c.roman}</div><div className="t">{c.name}</div></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
