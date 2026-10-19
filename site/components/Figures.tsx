"use client";
import type { CSSProperties } from "react";
import type { Progress } from "@/lib/api";
import type { Place } from "@/lib/chapters";
import { KIND, LEGEND } from "@/lib/pages";

/** The graph the way the reference draws it: nodes = rounded rectangles with a mono label and
 *  one kind word under it (function · agent · waits), coloured by kind (function grey · agent purple · waits amber ·
 *  the fence blue · a place a fact survives green); curved edges with arrowheads; the back edge
 *  dashed. A node lights (tinted fill) when its chapter earned it — from receipts and code facts,
 *  never from a click — the box carries no receipt text, only the name and its kind. The full graph is on the story page and the breakfast page; each chapter
 *  page carries one small figure of its own mechanism. */

type NodeProps = { x: number; y: number; w: number; h?: number; label: string; sub?: string; kind?: string; lit?: boolean };
export const Node = ({ x, y, w, h = 40, label, sub, kind, lit }: NodeProps) => (
  <g>
    <rect className={`node${kind ? " kind" : ""}${lit ? " lit" : ""}`} x={x} y={y} width={w} height={h} rx={9} style={{ "--nc": kind || "var(--fg-muted)" } as CSSProperties} />
    <text x={x + w / 2} y={y + (sub ? 18 : h / 2 + 3.5)} textAnchor="middle">{label}</text>
    {sub && <text className="sub" x={x + w / 2} y={y + 31} textAnchor="middle">{sub}</text>}
  </g>
);
export const Edge = ({ d, back, lit, m = "ar" }: { d: string; back?: boolean; lit?: boolean; m?: string }) => (
  <path className={`edge${back ? " back" : ""}${lit ? " lit" : ""}`} d={d} markerEnd={`url(#${m})`} />
);
export const Marker = ({ id = "ar" }: { id?: string }) => (
  <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path className="ar" d="M0 0 L10 5 L0 10 z" /></marker></defs>
);
export const Sub = ({ x, y, children, anchor = "middle" }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end" }) => (
  <text className="sub" x={x} y={y} textAnchor={anchor}>{children}</text>
);

export function Legend() {
  return (
    <div className="legend">
      {LEGEND.map(([l, c]) => <span key={l}><i style={{ "--lc": c } as CSSProperties} /> {l}</span>)}
    </div>
  );
}

/** the whole night, every node naming the chapter that adds it; `cloud` swaps the names for Cloud Run's */
export function FullGraph({ p, cloud = false }: { p: Progress | null; cloud?: boolean }) {
  const lit = p?.lit || {}; const code = p?.code; const g = p?.graph?.after;
  const graph = Boolean(code?.graph || lit["5"]);
  const stage = (p?.wakes || []).some((w) => w.source === "stage");
  const m = cloud ? "arc" : "arf";
  return (
    <div className="graph">
      <svg viewBox="0 0 760 210" role="img" aria-label="the graph you finish with: agree_budget, open_the_night, pick_show, queue_up, check_front (waits), brief, buyer_agent; the fence to the venue; four places a fact survives; the clock answering the pause">
        <Marker id={m} />
        <circle cx="22" cy="60" r="12" className={`node${graph ? " lit" : ""}`} /><text x="22" y="63" textAnchor="middle" style={{ fontSize: 8 }}>START</text>
        <Node x={52} y={40} w={96} label="agree_budget" sub="waits" kind={KIND.waits} lit={Boolean(code?.budget || lit["6"])} />
        <Node x={168} y={40} w={96} label="open_the_night" sub="function" lit={graph} />
        <Node x={284} y={40} w={86} label="pick_show" sub="agent" kind={KIND.agent} lit={graph} />
        <Node x={390} y={40} w={80} label="queue_up" sub="function" lit={graph} />
        <Node x={490} y={40} w={92} label="check_front ⏸" sub="waits" kind={KIND.waits} lit={Boolean(g?.parks)} />
        <Node x={602} y={40} w={56} label="brief" sub="function" lit={Boolean(g?.order)} />
        <Node x={676} y={40} w={80} label="buyer_agent" sub="agent" kind={KIND.agent} lit={stage || Boolean(lit["1"])} />
        <Edge m={m} d="M34 60 H52" /><Edge m={m} d="M148 60 H168" /><Edge m={m} d="M264 60 H284" /><Edge m={m} d="M370 60 H390" /><Edge m={m} d="M470 60 H490" /><Edge m={m} d="M582 60 H602" /><Edge m={m} d="M658 60 H676" />
        <Edge m={m} back lit={Boolean(g?.wakeups)} d="M536 80 V104 H22 V72" />
        <Sub x={280} y={100}>wake me again</Sub>
        <Node x={626} y={130} w={130} label="⛩ fence → the venue" sub={cloud ? "Cloud Run" : "callback"} kind={KIND.fence} lit={Boolean(code?.fence || lit["4"])} />
        <Edge m={m} d="M716 80 V130" />
        <Node x={22} y={130} w={130} label={cloud ? "Cloud SQL · sessions" : "lab.db · sessions"} kind={KIND.store} lit={Boolean(lit["3"] || p?.kill)} />
        <Node x={168} y={130} w={120} label={cloud ? "gs://… · userx.md" : "user:prefs · memory"} sub="recall()" kind={KIND.store} lit={Boolean(code?.recall || lit["2"])} />
        <Node x={304} y={130} w={110} label="state.budget" kind={KIND.store} lit={Boolean(p?.budget?.after?.sentence)} />
        <Node x={440} y={130} w={120} label="🐓 the clock" sub={cloud ? "Scheduler → Pub/Sub" : "clock.py"} kind={KIND.clock} lit={Boolean(lit["1"] || (p?.clock_runs || 0) > 0)} />
      </svg>
      <Legend />
    </div>
  );
}

/** II: four places a fact can live, lit from the receipts (chapters.ts places()) */
export function MemoryFigure({ places }: { places: Place[] }) {
  const on = (i: number) => places[i]?.c === "y";
  const kinds = [undefined, KIND.store, KIND.agent, KIND.store, KIND.store];
  const labels = ["temp:seatmap", "session state", "user:prefs", "memory/userx.md", "artifacts/"];
  const subs = ["one turn", "this booking", "every session", "recall()", "seat maps"];
  return (
    <div className="graph">
      <svg viewBox="0 0 530 150" role="img" aria-label="four places a fact can live, and the memory file recall reads">
        <Marker id="arm" />
        <Node x={215} y={6} w={100} label="buyer_agent" sub="agent" kind={KIND.agent} lit={on(3)} />
        {labels.map((l, i) => { const x = 6 + i * 105; return (
          <g key={l}>
            <Edge m="arm" d={`M265 46 L${x + 48} 92`} lit={on(i)} />
            <Node x={x} y={94} w={98} h={44} label={l} sub={subs[i]} kind={kinds[i]} lit={on(i)} />
          </g>); })}
      </svg>
    </div>
  );
}

/** III: join_queue under one boot, the kill, check_queue under the next; lab.db in between */
export function KillFigure({ p }: { p: Progress | null }) {
  const k = p?.kill; const on = Boolean(k);
  return (
    <div className="graph">
      <svg viewBox="0 0 360 150" role="img" aria-label="join_queue (long-running) under boot a, the kill, check_queue under boot b, both reading lab.db">
        <Marker id="ark" />
        <Node x={6} y={20} w={108} label="join_queue" sub="long-running" kind={KIND.waits} lit={on || Boolean(p?.code?.queue)} />
        <Node x={128} y={20} w={104} label="💀 kill" sub="restarts" kind={KIND.waits} lit={on} />
        <Node x={250} y={20} w={100} label="check_queue" sub="function" lit={on} />
        <Edge m="ark" d="M114 40 H128" /><Edge m="ark" d="M232 40 H250" />
        <Node x={90} y={95} w={180} label="lab.db · queue_ticket" kind={KIND.store} lit={on} />
        <Edge m="ark" d="M60 60 V115 H90" lit={on} /><Edge m="ark" d="M270 115 H300 V60" lit={on} />
      </svg>
    </div>
  );
}

/** IV: purchase → the fence → the venue; the fence's dict never reaches the venue */
export function NewsFigure({ p }: { p: Progress | null }) {
  const f = p?.fence; const armed = Boolean(p?.code?.fence);
  return (
    <div className="graph">
      <svg viewBox="0 0 360 150" role="img" aria-label="the model asks for purchase; refresh_before_purchase re-reads the venue; a returned dict short-circuits the tool">
        <Marker id="arn" />
        <Node x={6} y={20} w={96} label="purchase" sub="tool call" kind={KIND.agent} lit={Boolean(f?.after || f?.before)} />
        <Node x={117} y={20} w={130} label={armed ? "⛩ the fence · armed" : "⛩ the fence · off"} sub="before_tool_callback" kind={KIND.fence} lit={armed} />
        <Node x={262} y={20} w={92} label="the venue" sub="live inventory" kind={KIND.fence} lit={Boolean(f?.before || f?.after?.order)} />
        <Edge m="arn" d="M102 40 H117" /><Edge m="arn" d="M247 40 H262" lit={Boolean(f?.after?.order)} />
        <Node x={92} y={95} w={180} label={f?.after ? "stale_plan" : "a dict"} sub="the tool is skipped" kind={KIND.waits} lit={Boolean(f?.after)} />
        <Edge m="arn" d="M182 60 V95" lit={Boolean(f?.after)} />
        <Edge m="arn" back d="M92 115 H54 V60" lit={Boolean(f?.after)} />
      </svg>
    </div>
  );
}

/** V: the chain, lit by the nodes that ran; the back edge counts the clock's answers */
export function GraphFigure({ p }: { p: Progress | null }) {
  const g = p?.graph?.after; const ran = new Set(g?.nodes || []); const on = Boolean(p?.code?.graph);
  const node = (x: number, w: number, name: string, label: string, sub: string, kind?: string) => <Node x={x} y={30} w={w} label={label} sub={sub} kind={kind} lit={ran.has(name) || (on && !g)} />;
  return (
    <div className="graph">
      <svg viewBox="0 0 540 130" role="img" aria-label="START, open_the_night, pick_show, queue_up, check_front (waits), brief, buyer_agent; the clock answers the pause">
        <Marker id="arg" />
        <circle cx="16" cy="50" r="11" className={`node${on ? " lit" : ""}`} /><text x="16" y="53" textAnchor="middle" style={{ fontSize: 7.5 }}>START</text>
        {node(40, 82, "open_the_night", "open_the_night", "function")}
        {node(132, 70, "pick_show", "pick_show", "agent", KIND.agent)}
        {node(212, 66, "queue_up", "queue_up", "function")}
        {node(288, 100, "check_front", "check_front ⏸", "waits", KIND.waits)}
        {node(398, 50, "brief", "brief", "function")}
        {node(458, 80, "concert", "buyer_agent", "agent", KIND.agent)}
        <Edge m="arg" d="M27 50 H40" /><Edge m="arg" d="M122 50 H132" /><Edge m="arg" d="M202 50 H212" /><Edge m="arg" d="M278 50 H288" /><Edge m="arg" d="M388 50 H398" /><Edge m="arg" d="M448 50 H458" />
        <Edge m="arg" back lit={Boolean(g?.wakeups)} d="M338 70 V98 H16 V62" />
        <Sub x={275} y={110}>🐓 wake me again</Sub>
      </svg>
    </div>
  );
}

/** VI: the same interrupt aimed at a person, two doors into it, the sentence in state */
export function BudgetFigure({ p }: { p: Progress | null }) {
  const b = p?.budget?.after; const pr = p?.budget?.probe; const on = Boolean(p?.code?.budget);
  return (
    <div className="graph">
      <svg viewBox="0 0 450 150" role="img" aria-label="/api/say and /api/wake into agree_budget; budget:ask and budget:confirm; the sentence in session state; then the night">
        <Marker id="arb" />
        <Node x={6} y={6} w={100} label="/api/say" sub="a person" kind={KIND.fence} lit={Boolean(b?.asked)} />
        <Node x={6} y={100} w={100} label="/api/wake" sub="nobody" kind={KIND.clock} lit={Boolean(b?.unattended || pr)} />
        <Node x={140} y={50} w={110} label="agree_budget" sub="waits" kind={KIND.waits} lit={on} />
        <Edge m="arb" d="M106 26 C 125 26, 125 60, 140 60" lit={Boolean(b?.asked)} /><Edge m="arb" d="M106 120 C 125 120, 125 80, 140 80" lit={Boolean(b?.unattended || pr)} />
        <Node x={276} y={6} w={168} h={36} label="budget:ask · budget:confirm" kind={KIND.waits} lit={Boolean(b?.asked)} />
        <Node x={276} y={60} w={168} h={36} label="state.budget" kind={KIND.store} lit={Boolean(b?.sentence)} />
        <Node x={276} y={114} w={168} h={30} label="→ open → pick → queue → ⏸" sub="" lit={Boolean(b?.order)} />
        <Edge m="arb" d="M250 60 C 263 60, 263 24, 276 24" lit={Boolean(b?.asked)} /><Edge m="arb" d="M250 70 H276" lit={Boolean(b?.sentence)} /><Edge m="arb" d="M250 80 C 263 80, 263 129, 276 129" lit={Boolean(b?.order)} />
      </svg>
    </div>
  );
}
