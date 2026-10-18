"use client";
import type { Progress } from "@/lib/api";
import type { Folded } from "@/lib/useEvents";

/** The night shift: the architecture, alive. Top row clock → trigger → graph →
 *  venue; bottom row the four stores. Boxes light as chapters earn them (and
 *  as the file gains a line); the back edge "wake me again" turns solid when the
 *  graph is the root (V); the finale overlays the cloud names. Packets move only
 *  while something runs. */
export default function NightShift({ n, p, f }: { n: number; p: Progress | null; f: Folded }) {
  const lit = p?.lit || {};
  const code = p?.code;
  const L = new Set<string>();
  const add = (...k: string[]) => k.forEach((x) => L.add(x));
  if (lit["1"] || (p?.clock_runs || 0) > 0) add("clock", "trigger", "sessions");
  if ((p?.wakes || []).some((w) => w.source === "stage")) add("trigger", "sessions");
  if (lit["2"] || code?.recall) add("memory");
  if (lit["2"]) add("prefs", "artifacts", "sessions");
  if (lit["3"]) add("sessions", "trigger");
  if (lit["4"] || code?.fence) add("fence");
  if (lit["4"]) add("venue");
  if (code?.graph || lit["5"]) add("graph", "back");
  if (code?.budget || lit["6"]) add("budget");
  if ((p?.venue?.order_count || 0) > 0) add("venue");
  const cloud = n === 7;
  const cls = (k: string) => (L.has(k) ? " lit" : "");
  const packets = f.running ? (f.kind === "clock" ? ["clock"] : f.kind === "stage" ? ["stage"] : []) : [];
  const legend =
    n === 1 ? (lit["1"] ? "the clock posted one sentence to /api/wake; a Runner ran the agent; nobody typed." : "nothing moves between messages. a trigger is an endpoint with a Runner behind it; a triggerer is a clock that calls it.") :
    n === 2 ? (code?.recall ? "recall() reads memory/userx.md through BaseMemoryService. user:prefs lives in every session; temp: dies with the invocation." : "four stores, one of them unread: the memory file. the conversation is the worst place for a fact.") :
    n === 3 ? "a LongRunningFunctionTool returns a handle; ResumabilityConfig writes the parked run into lab.db; a new process reads it back." :
    n === 4 ? "the fence runs before purchase reaches the venue — a dict returned there short-circuits the tool." :
    n === 5 ? (code?.graph ? "the graph is the root: open → pick_show → queue_up → check_front ⏸ → brief → buyer_agent. the clock answers the pause." : "the model orders the steps. a Workflow makes the rules nodes and keeps the model where judgement is.") :
    n === 6 ? "the same RequestInput, aimed at a person. someone_is_there() is a fact about the request: /api/say marks it, /api/wake does not." :
    "two URIs and one environment variable later, the same agent runs on Cloud Run with Cloud Scheduler as its clock.";

  return (
    <div className="card wire">
      <div className="eyebrow" style={{ marginBottom: 6 }}>the night shift · what wakes what</div>
      <svg viewBox="0 0 760 150" role="img" aria-label="the night shift: clock, trigger, graph, venue; four stores below">
        <rect className={"box" + cls("clock")} x="4" y="14" width="126" height="44" rx="8" /><text className="t" x="67" y="33" textAnchor="middle">🐓 the clock</text>
        {cloud ? <text className="cloud" x="67" y="48" textAnchor="middle">Scheduler → Pub/Sub</text> : <text x="67" y="48" textAnchor="middle">clock.py · sleep, POST</text>}
        <path className={"edge" + cls("clock")} d="M130 36 H150" />
        <rect className={"box" + cls("trigger")} x="152" y="14" width="150" height="44" rx="8" /><text className="t" x="227" y="33" textAnchor="middle">▶ the trigger</text>
        {cloud ? <text className="cloud" x="227" y="48" textAnchor="middle">Cloud Run · pubsub trigger</text> : <text x="227" y="48" textAnchor="middle">a Runner · /api/say | wake</text>}
        <path className={"edge" + cls("graph")} d="M302 36 H320" />
        <rect className={"box" + cls("graph")} x="322" y="8" width="346" height="56" rx="8" /><text className="t" x="495" y="27" textAnchor="middle">{code?.graph ? "the graph · nightly" : "the agent · buyer_agent"}</text>
        <text x="495" y="43" textAnchor="middle">{code?.graph ? `${L.has("budget") ? "budget → " : ""}open → pick → queue → check_front ⏸ → brief → buyer` : "a conversation: the model picks the next step"}</text>
        <text x="495" y="57" textAnchor="middle" style={{ fill: L.has("fence") ? "var(--mint-ink)" : "var(--faint)" }}>{L.has("fence") ? "⛩ fence: refresh_before_purchase" : "fence not yet"}</text>
        <path className={"edge" + cls("venue")} d="M668 36 H688" />
        <rect className={"box" + cls("venue")} x="690" y="14" width="66" height="44" rx="8" /><text className="t" x="724" y="33" textAnchor="middle">🎪 venue</text><text x="724" y="48" textAnchor="middle">in-process</text>
        <path className={"edge back" + cls("back")} d="M560 64 V84 H63 V58" /><text x="312" y="80" textAnchor="middle" style={{ fill: L.has("back") ? "var(--mint-ink)" : "var(--faint)" }}>wake me again · RequestInput answered by a clock</text>
        <rect className={"box store" + cls("sessions")} x="4" y="104" width="170" height="38" rx="8" /><text className="t" x="89" y="121" textAnchor="middle">{cloud ? "Cloud SQL" : "lab.db · sessions + state"}</text><text x="89" y="135" textAnchor="middle">I · III · V · VI</text>
        <rect className={"box store" + cls("prefs")} x="186" y="104" width="150" height="38" rx="8" /><text className="t" x="261" y="121" textAnchor="middle">user:prefs</text><text x="261" y="135" textAnchor="middle">II · every session</text>
        <rect className={"box store" + cls("memory")} x="348" y="104" width="190" height="38" rx="8" /><text className="t" x="443" y="121" textAnchor="middle">{cloud ? "gs://…/memory/userx.md" : "memory/userx.md"}</text><text x="443" y="135" textAnchor="middle">II · recall() · remember()</text>
        <rect className={"box store" + cls("artifacts")} x="550" y="104" width="206" height="38" rx="8" /><text className="t" x="653" y="121" textAnchor="middle">{cloud ? "gs://…/artifacts" : "artifacts/"}</text><text x="653" y="135" textAnchor="middle">II · seat maps · never in the prompt</text>
        {packets.map((k) => Array.from({ length: 3 }, (_, i) => (
          <circle key={`${k}${i}`} r="4.5" className="pk">
            <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${(i * 0.8).toFixed(1)}s`} path={k === "clock" ? "M67 36 L227 36 L495 36 L724 36" : "M227 36 L495 36 L724 36"} />
          </circle>
        )))}
      </svg>
      <div className="lg">{legend}</div>
    </div>
  );
}
