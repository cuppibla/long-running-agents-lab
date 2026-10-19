import type { Progress, Wake } from "./api";

const pos = (n: number) => `#${n.toLocaleString()}`;

/** what the latest run says about itself — the fourth readout on the stage */
export function plateOf(w: Wake | null, p: Progress | null): { who: string; status: string; sub: string; cls: "" | "ok" | "hi" | "bad" } {
  const who = w?.kind === "Workflow" ? "the graph" : "the agent";
  if (!w) return { who, status: "asleep", sub: "nobody has spoken yet", cls: "" };
  const boot = w.boot_id && p?.boot_id && w.boot_id !== p.boot_id ? ` · boot ${w.boot_id}` : "";
  if (w.awaiting) {
    const id = String((w.turn_interrupts || []).slice(-1)[0] || "");
    if (id.startsWith("budget:")) return { who, status: id === "budget:ask" ? "asking you" : "reading it back", sub: id + boot, cls: "hi" };
    if (w.kind === "Workflow") return { who, status: "parked", sub: `check_front${w.position ? ` · ${pos(w.position)}` : ""}${boot}`, cls: "hi" };
    return { who, status: "asked you", sub: "a question back" + boot, cls: "hi" };
  }
  if (w.orders_new?.length) { const o = w.orders_new[0]; return { who, status: "bought", sub: `${o.seats}× ${o.section} · $${Math.round(o.total)}${boot}`, cls: "ok" }; }
  if ((w.turn_tools || w.tools).includes("join_queue")) return { who, status: "in line", sub: `${w.position ? pos(w.position) : "a ticket"}${boot}`, cls: "hi" };
  if ((w.turn_tools || w.tools).includes("check_queue")) return { who, status: "same ticket", sub: w.boot_id === p?.boot_id ? "back · read from lab.db" : `boot ${w.boot_id}`, cls: "ok" };
  if (w.answered) return { who, status: "answered", sub: "the pause, by the clock" + boot, cls: "ok" };
  if (w.source === "clock") return { who, status: "woke", sub: `3:00 · ${w.calls} ${w.calls === 1 ? "call" : "calls"}${boot}`, cls: w.calls > 0 ? "ok" : "bad" };
  const t = w.turn_tools ?? w.tools;
  return { who, status: "replied", sub: t.length ? t.join(" · ") : "no tool call", cls: "" };
}
