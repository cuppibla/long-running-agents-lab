"use client";
import { useState } from "react";

/** The small shapes every page shares: In (rise-in once), Kicker, Av (the Valley cast
 *  as round face crops), Copy (a sentence to the clipboard), Head (a card's kicker + h2 + blurb). */

export function In({ d = 0, className = "", children, style }: { d?: number; className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className={`in${d ? ` d${d}` : ""} ${className}`.trim()} style={style}>{children}</div>;
}

export function Kicker({ children, color }: { children: React.ReactNode; color?: string }) {
  return <div className="kicker" style={{ color: color || "var(--fg-muted)" }}>{children}</div>;
}

export type Who = "fox" | "cat" | "owl" | "skull";
export const Av = ({ who, title }: { who: Who; title?: string }) => (
  <span className={`av ${who}`} title={title} aria-hidden>{who === "skull" ? "💀" : ""}</span>
);

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** a copy button: ⧉, then “copied ✓” for a moment */
export function Copy({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className={className} title="copy to the clipboard" onClick={async () => { if (await copyText(text)) { setDone(true); setTimeout(() => setDone(false), 1500); } }}>
      {done ? "copied ✓" : label ?? "⧉"}
    </button>
  );
}

export function Head({ kicker, h2, blurb, color, right }: { kicker: string; h2?: string; blurb?: string; color?: string; right?: React.ReactNode }) {
  return (
    <div className="runrow">
      <div>
        <Kicker color={color}>{kicker}</Kicker>
        {h2 && <h2>{h2}</h2>}
        {blurb && <p className="blurb" dangerouslySetInnerHTML={{ __html: blurb }} />}
      </div>
      {right}
    </div>
  );
}

export const Html = ({ html, className, as: Tag = "span" }: { html: string; className?: string; as?: "span" | "div" | "p" }) =>
  <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
