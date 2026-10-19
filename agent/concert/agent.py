# Vendored from https://github.com/gca-americas/monstertix (3b2febe) — agent/concert/agent.py,
# restructured so that each chapter's change is ONE line. The budget_split sub-agent, the
# App and the tools are the source lab's; see the 👉 comments for the four lines this page edits.
"""The buyer — the one agent this lab runs, and the file four chapters edit.

As shipped, three lines wear a "# " and one line names the conversational agent:

    II   # recall, remember,                                     the memory tools
    III  # LongRunningFunctionTool(func=join_queue), check_queue, the queue tools
    IV   # before_tool_callback=refresh_before_purchase,         the fence
    V    root_agent = buyer_agent                                → root_agent = buyer_agent

Chapter VI's line is in nightly.py. Nothing else in this package changes; the page
edits this file in place and the stage, the clock and the workbench re-read it on
their next run.
"""

from __future__ import annotations

from google.adk.agents import Agent
from google.adk.apps.app import App, EventsCompactionConfig, ResumabilityConfig
from google.adk.apps.llm_event_summarizer import LlmEventSummarizer
from google.adk.models.google_llm import Gemini
from google.adk.tools import LongRunningFunctionTool
from google.adk.tools.agent_tool import AgentTool

from .config import MODEL
from .fence import refresh_before_purchase
from .memory import recall, remember
from .panel import PanelPlugin
from .tools import (
    check_queue,
    get_seatmap,
    join_queue,
    note_companion,
    purchase,
    search_events,
    set_budget,
)

budget_split = Agent(
    name="budget_split",
    model=MODEL,
    # The description is what the MAIN agent reads when deciding whether to call
    # this. A vague one and it does the sums itself, which is the whole point of
    # the step going quietly missing.
    description=(
        "Works out ticket costs. Call this for ANY question about totals, "
        "per-seat costs, or which sections fit a budget."
    ),
    include_contents="none",
    instruction="""
You do ticket arithmetic and nothing else.

Given a per-person budget, a number of people, and a list of sections with
prices, work out which sections fit and what the total is. Show the numbers.

You have no conversation history and do not need any. Everything you need is in
the request.

You have no tools. Never call one; write the arithmetic out as text.
""",
    # The last line of that instruction is this lab's, not the source's. ADK appends an
    # agent's own description to its system prompt ("The description about you is: Works out
    # ticket costs. Call this for ANY question…"), and gemini-2.5-flash obeys "Call this" by
    # emitting a function call to a tool that does not exist. The API then answers
    # UNEXPECTED_TOOL_CALL with no text, so output_key never writes budget_plan — 3 of 3 runs
    # without the line, 3 of 3 answer in text with it. The description stays as shipped: it is
    # what the main agent reads when deciding to call this.
    output_key="budget_plan",
)

INSTRUCTION = """
You help someone buy tickets to see a band on tour.

When you are asked to get, book or recommend tickets, work in this order and do
not skip a step:

  1. recall() — when it is one of your tools it is ALWAYS your first call,
     before search_events and before any question to the user. It holds what
     you already know about this person from past bookings: who comes with
     them, which days work for them, which sections they liked and hated, what
     they will spend. Apply all of it: a show on a day they cannot do is not an
     option, a section they hated is not an option, stay inside what they
     spend — and never ask the user something recall() can answer.
  2. search_events — find the shows.
  3. If you have join_queue, the queue comes first: the moment you know which
     show, join it — you do not need a section or a price to join. Say what
     position you landed at. Do not poll check_queue in a loop, but never quote
     a queue position from memory either: call check_queue immediately before
     you state a position and immediately before any purchase. If you are
     asked about seats or prices while you wait, read the seat map and answer
     with the real numbers.
  4. get_seatmap — for the show you chose. If you were woken after a wait, do
     not trust anything you looked up before the wait: read the seat map again.
  5. purchase — two seats together unless told otherwise. Do not stop to ask a
     question the tools can answer; nobody may be there to answer it.

If a purchase comes back with reason "stale_plan" or "price_moved", the world
moved while you were waiting. Re-read the seat map, tell the user what changed,
and pick again — never retry the same purchase blindly.

Use note_companion for who is coming. Use set_budget once a person has confirmed
what they will spend. Use remember() for preferences and outcomes, never for
prices or availability.

Be concrete and brief.
"""

buyer_agent = Agent(
    name="concert",
    model=MODEL,
    instruction=INSTRUCTION,
    # 👉 Right now purchase() goes straight to the venue with a seat map from before the wait, and buys from it.
    # 👉 Fix: delete the "# " on the next line.
    # 👉 Then refresh_before_purchase re-reads the live seat map and returns a refusal before the venue is called.
    # before_tool_callback=refresh_before_purchase,
    tools=[
        search_events, get_seatmap, note_companion, set_budget, purchase,
        # 👉 Right now the agent cannot read memory/userx.md, so what you said last week is invisible at 3am.
        # 👉 Fix: delete the "# " on the next line.
        # 👉 Then recall() runs before anything else and the Saturday show wins.
        # recall, remember,
        # 👉 Right now the agent has no way to join the presale queue, so it cannot wait at all.
        # 👉 Fix: delete the "# " on the next line.
        # 👉 Then join_queue returns a ticket and the run parks on it, and the ticket survives a kill.
        # LongRunningFunctionTool(func=join_queue), check_queue,
        AgentTool(agent=budget_split),
    ],
)


# The graph imports buyer_agent from this module, so it is imported after it.
from .nightly import nightly  # noqa: E402

# 👉 Right now the stage and adk web run buyer_agent as a conversation, so the model decides the order of things.
# 👉 Fix: change buyer_agent to nightly on the next line.
# 👉 Then every run walks the graph: open → pick_show → queue_up → check_front ⏸ → brief → buyer_agent.
root_agent = buyer_agent

app = App(
    name="concert",
    root_agent=root_agent,
    plugins=[PanelPlugin()],
    events_compaction_config=EventsCompactionConfig(
        compaction_interval=3,
        overlap_size=1,
        # Required once the root is a Workflow. ADK normally borrows the
        # summariser's model from the root agent, and a graph has no model —
        # `No LlmAgent model available for event compaction summarizer.` So
        # name one explicitly.
        summarizer=LlmEventSummarizer(llm=Gemini(model=MODEL)),
    ),
    resumability_config=ResumabilityConfig(is_resumable=True),
)
