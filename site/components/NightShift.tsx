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
  if (lit["3"] || p?.kill) add("sessions", "trigger");
  if (lit["4"] || code?.fence) add("fence");
  if (lit["4"]) add("venue", "gate");
  if (code?.graph || lit["5"]) add("graph", "back");
  if (code?.budget || lit["6"]) add("budget");
  const g = p?.graph?.after, b = p?.budget?.after, probe = p?.budget?.probe;
  if (g?.wakeups) add("answered");                                     // the back edge carried a real answer
  if (b?.asked) add("door-say");                                       // /api/say: a person was there, and was asked
  if (b?.unattended || probe) add("door-wake");                        // /api/wake: nobody there — no question
  if ((p?.venue?.order_count || 0) > 0) add("venue");
  const cloud = n === 7;
  const cls = (k: string) => (L.has(k) ? " lit" : "");
  const packets = f.running ? (f.kind === "clock" ? ["clock"] : f.kind === "stage" ? ["stage"] : []) : [];
  const legend =
    n === 1 ? (lit["1"] ? "the clock posted one sentence to /api/wake; a Runner ran the agent; nobody typed." : "nothing moves between messages. a trigger is an endpoint with a Runner behind it; a triggerer is a clock that calls it.") :
    n === 2 ? (code?.recall ? "recall() reads memory/userx.md through BaseMemoryService. user:prefs lives in every session; temp: dies with the invocation." : "four stores, one of them unread: the memory file. the conversation is the worst place for a fact.") :
    n === 3 ? (p?.kill ? `one ticket (${p.kill.ticket}) handed out by boot ${p.kill.boots[0]} and read back by boot ${p.kill.boots[1]} — lab.db outlived the process.` : code?.queue ? "join_queue hands back a handle; the run parks on it; the ticket is already in lab.db. Press 💀, then ask again." : "a LongRunningFunctionTool returns a handle; ResumabilityConfig lets the run park on it; a new process reads lab.db back.") :
    n === 4 ? (lit["4"] ? "⛩ the fence refused once before the venue was asked; the order that followed came from a fresh read." : code?.fence ? "⛩ refresh_before_purchase runs before every purchase — a dict returned there never reaches the venue." : "purchase goes straight to the venue with whatever seat map the conversation holds. The gate before the venue is not there yet.") :
    n === 5 ? (g?.lit ? `the graph parked ${g.parks}× on one ticket; the clock answered the pause ${g.wakeups}× through the back edge — ${g.entries} entries, pick_show and queue_up ran once.` : code?.graph ? "the graph is the root: open → pick_show → queue_up → check_front ⏸ → brief → buyer_agent. a wake-up with no session named answers the stage's parked run." : "the model orders the steps. a Workflow makes the rules nodes and keeps the model where judgement is.") :
    n === 6 ? (b?.lit ? `two doors, one Runner: /api/say was asked (${b.questions} questions, your sentence in state); /api/wake found the budget agreed and asked nothing${probe ? "; a fresh unattended session took the default" : ""}.` : code?.budget ? "agree_budget is the first node. /api/say marks a person present for that request; /api/wake does not — the same graph asks one door and not the other." : "the same RequestInput, aimed at a person. someone_is_there() is a fact about the request: /api/say marks it, /api/wake does not.") :
    "two URIs and one environment variable later, the same agent runs on Cloud Run with Cloud Scheduler as its clock.";

  return (
    <div className="card wire">
      <div className="eyebrow" style={{ marginBottom: 6 }}>the night shift · what wakes what</div>
      <svg viewBox="0 0 760 150" role="img" aria-label="the night shift: clock, trigger, graph, venue; four stores below">
        <rect className={"box" + cls("clock")} x="4" y="14" width="126" height="44" rx="8" /><text className="t" x="67" y="33" textAnchor="middle">🐓 the clock</text>
        {cloud ? <text className="cloud" x="67" y="48" textAnchor="middle">Scheduler → Pub/Sub</text> : <text x="67" y="48" textAnchor="middle">clock.py · sleep, POST</text>}
        <path className={"edge" + cls("clock")} d="M130 36 H150" />
        <rect className={"box" + cls("trigger")} x="152" y="14" width="150" height="44" rx="8" /><text className="t" x="227" y="31" textAnchor="middle">▶ the trigger · a Runner</text>
        {cloud ? <text className="cloud" x="227" y="48" textAnchor="middle">Cloud Run · pubsub trigger</text> : <>
          <text className={"door" + cls("door-say")} x="190" y="49" textAnchor="middle">{L.has("door-say") ? "◆" : "◇"} say · a person</text>
          <text className={"door" + cls("door-wake")} x="265" y="49" textAnchor="middle">{L.has("door-wake") ? "◆" : "◇"} wake · nobody</text></>}
        <path className={"edge" + cls("graph")} d="M302 36 H320" />
        <rect className={"box" + cls("graph")} x="322" y="8" width="326" height="56" rx="8" /><text className="t" x="485" y="27" textAnchor="middle">{code?.graph ? <>the graph · nightly{L.has("budget") && <tspan className={"budget" + (lit["6"] ? " lit" : "")}> · agree_budget first ⏸</tspan>}</> : "the agent · buyer_agent"}</text>
        <text x="485" y="43" textAnchor="middle">{code?.graph ? `open → pick → queue → check_front ⏸${g?.parks ? ` ×${g.parks}` : ""} → brief → buyer` : "a conversation: the model picks the next step"}</text>
        <text x="485" y="57" textAnchor="middle" style={{ fill: L.has("fence") ? "var(--mint-ink)" : "var(--faint)" }}>{L.has("fence") ? "before_tool_callback=refresh_before_purchase" : "no before_tool_callback yet"}</text>
        <path className={"edge" + cls("venue")} d="M648 36 H656" />
        <rect className={"gate" + cls("fence") + (L.has("gate") ? " held" : "")} x="656" y="22" width="28" height="28" rx="6" /><text className="g" x="670" y="42" textAnchor="middle">⛩</text>
        <text className="gl" x="670" y="60" textAnchor="middle">{L.has("gate") ? "refused ×1" : L.has("fence") ? "the fence" : "no fence"}</text>
        <path className={"edge" + cls("venue")} d="M684 36 H688" />
        <rect className={"box" + cls("venue")} x="690" y="14" width="66" height="44" rx="8" /><text className="t" x="724" y="33" textAnchor="middle">🎪 venue</text><text x="724" y="48" textAnchor="middle">in-process</text>
        <path className={"edge back" + cls("back") + (L.has("answered") ? " answered" : "")} d="M560 64 V84 H63 V58" /><text x="312" y="80" textAnchor="middle" style={{ fill: L.has("back") ? "var(--mint-ink)" : "var(--faint)" }}>{g?.wakeups ? `wake me again · the clock answered the pause ×${g.wakeups} · one ticket` : "wake me again · RequestInput answered by a clock"}</text>
        <rect className={"box store" + cls("sessions")} x="4" y="104" width="170" height="38" rx="8" /><text className="t" x="89" y="121" textAnchor="middle">{cloud ? "Cloud SQL" : "lab.db · sessions + state"}</text><text x="89" y="135" textAnchor="middle" style={p?.kill ? { fill: "var(--mint-ink)" } : undefined}>{p?.kill ? `III · read by boot ${p.kill.boots[0]} and boot ${p.kill.boots[1]}` : "I · III · V · VI"}</text>
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
