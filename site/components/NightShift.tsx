"use client";
import type { Progress } from "@/lib/api";

/** The night shift, v2: the architecture as a small map inside the chapter panel's
 *  "the map" fold — bigger type, fewer words. Top row clock → trigger (two doors) →
 *  the agent / the graph → ⛩ → venue; the back edge "wake me again"; four stores below.
 *  Boxes light as chapters earn them (receipts) and as the file gains a line (code facts);
 *  chapter VII overlays the cloud names. */
export default function NightShift({ n, p }: { n: number; p: Progress | null }) {
  const lit = p?.lit || {};
  const code = p?.code;
  const L = new Set<string>();
  const add = (...k: string[]) => k.forEach((x) => L.add(x));
  if (lit["1"] || (p?.clock_runs || 0) > 0) add("clock", "trigger", "sessions");
  if ((p?.wakes || []).some((w) => w.source === "stage")) add("trigger", "sessions");
  if (lit["2"] || code?.recall) add("memory");
  if (lit["2"]) add("prefs", "artifacts", "sessions");
  if (lit["3"] || p?.kill) add("sessions", "trigger");
  if (lit["4"] || code?.fence) add("fence");
  if (lit["4"]) add("venue");
  if (code?.graph || lit["5"]) add("graph", "back");
  const g = p?.graph?.after, b = p?.budget?.after, probe = p?.budget?.probe;
  if (b?.asked) add("say");
  if (b?.unattended || probe) add("wake");
  if ((p?.venue?.order_count || 0) > 0) add("venue");
  const cloud = n === 7;
  const graph = Boolean(code?.graph || lit["5"]);
  const budget = Boolean(code?.budget || lit["6"]);
  const cls = (k: string) => (L.has(k) ? " lit" : "");
  return (
    <div className="map">
      <svg viewBox="0 0 640 170" role="img" aria-label="the night shift: clock, trigger, agent, venue; four stores below">
        <rect className={"box" + cls("clock")} x="4" y="18" width="118" height="52" rx="10" /><text x="63" y="40" textAnchor="middle">🐓 the clock</text><text className="s" x="63" y="58" textAnchor="middle">{cloud ? "Scheduler" : "clock.py"}</text>
        <path className={"edge" + cls("clock")} d="M122 44 H142" />
        <rect className={"box" + cls("trigger")} x="144" y="18" width="134" height="52" rx="10" /><text x="211" y="40" textAnchor="middle">▶ the trigger</text>
        <text className="s" x="211" y="58" textAnchor="middle"><tspan className={"door" + cls("say")}>{L.has("say") ? "◆" : "◇"} say</tspan>   <tspan className={"door" + cls("wake")}>{L.has("wake") ? "◆" : "◇"} wake</tspan></text>
        <path className={"edge" + cls("trigger")} d="M278 44 H298" />
        <rect className={"box" + cls("graph") + (L.has("trigger") && !graph ? " lit" : "")} x="300" y="18" width="200" height="52" rx="10" /><text x="400" y="40" textAnchor="middle">{graph ? "the graph" : "the agent"}</text>
        <text className="s" x="400" y="58" textAnchor="middle">{graph ? (budget ? "budget → open → pick → queue → ⏸ → buy" : "open → pick → queue → ⏸ → buy") : "the model picks the next step"}</text>
        <path className={"edge" + cls("venue")} d="M500 44 H518" />
        <rect className={"box" + cls("fence")} x="520" y="30" width="30" height="28" rx="8" /><text x="535" y="50" textAnchor="middle" style={{ fontSize: 14 }}>⛩</text>
        <path className={"edge" + cls("venue")} d="M550 44 H568" />
        <rect className={"box" + cls("venue")} x="570" y="18" width="66" height="52" rx="10" /><text x="603" y="40" textAnchor="middle">venue</text><text className="s" x="603" y="58" textAnchor="middle">{cloud ? "Cloud Run" : "in-process"}</text>
        <path className={"edge back" + cls("back")} d="M440 70 V94 H63 V70" /><text className="s" x="250" y="90" textAnchor="middle" style={{ fill: L.has("back") ? "var(--mint-ink)" : "var(--faint)" }}>{g?.wakeups ? `wake me again · answered ×${g.wakeups}` : "wake me again"}</text>
        <rect className={"box store" + cls("sessions")} x="4" y="118" width="150" height="44" rx="10" /><text x="79" y="138" textAnchor="middle">{cloud ? "Cloud SQL" : "lab.db"}</text><text className="s" x="79" y="154" textAnchor="middle">{p?.kill ? `boots ${p.kill.boots[0]} · ${p.kill.boots[1]}` : "sessions · state"}</text>
        <rect className={"box store" + cls("prefs")} x="166" y="118" width="140" height="44" rx="10" /><text x="236" y="138" textAnchor="middle">user:prefs</text><text className="s" x="236" y="154" textAnchor="middle">every session</text>
        <rect className={"box store" + cls("memory")} x="318" y="118" width="160" height="44" rx="10" /><text x="398" y="138" textAnchor="middle">{cloud ? "gs://…/userx.md" : "memory/userx.md"}</text><text className="s" x="398" y="154" textAnchor="middle">recall · remember</text>
        <rect className={"box store" + cls("artifacts")} x="490" y="118" width="146" height="44" rx="10" /><text x="563" y="138" textAnchor="middle">{cloud ? "gs://…/artifacts" : "artifacts/"}</text><text className="s" x="563" y="154" textAnchor="middle">seat maps</text>
      </svg>
    </div>
  );
}
