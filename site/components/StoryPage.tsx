"use client";
import { SHOW } from "@/lib/chapters";
import { C, pageOf } from "@/lib/pages";
import { FullGraph } from "./Figures";
import { useLab } from "./LabProvider";
import Shell from "./Shell";
import { Html, In, Kicker } from "./shared";

/** Chapter 0 · the night: the hero beside the title, the same six things every night, the
 *  graph you finish with (each node names the chapter that adds it), your inputs, what you
 *  learn, the statement and the three-box arc. Your name goes on the breakfast message. */
const SIX = ["wake up without anyone typing", "remember who is coming and what they cannot stand", "take a place in the queue and keep it through a crash", "re-read the seat map before spending", "decide the order of things, every time the same", "spend inside a limit a person agreed"];
const INPUTS = ["Tell it the show, in your own words.", "Say what you will spend, when it asks. Confirm once.", "Sleep. Read the message over breakfast."];
const LEARN = [
  "An <code>instruction=</code> is read on invocation and never between turns: the trigger (a Runner behind an endpoint) and the triggerer (something with a clock).",
  "Four places a fact can live — <code>temp:</code>, session state, <code>user:</code>, a memory file — and the paraphrase compaction writes over your conversation.",
  "<code>LongRunningFunctionTool</code> + <code>ResumabilityConfig</code>: a handle to unfinished work, and what actually survives a kill (the session, not a resumed invocation).",
  "<code>before_tool_callback</code>: re-read the world in the instant before spending; returning a dict short-circuits the tool.",
  "<code>Workflow</code>: functions for rules, agents for judgement, <code>RequestInput</code> to park, <code>rerun_on_resume</code> so a wake-up walks but does not redo.",
  "The same interrupt aimed at a person: a stable id, the sentence in state, and <code>someone_is_there()</code> as a fact about the request.",
];
const CHIPS: [string, string][] = [["the clock · I", C.amber], ["facts · II", C.purple], ["survival · III", C.red], ["the fence · IV", C.blue], ["the graph · V", C.purple], ["the budget · VI", C.amber]];

export default function StoryPage() {
  const page = pageOf("story");
  const { p, name, setName } = useLab();
  return (
    <Shell slug="story">
      <In><div className="head art">
        <div><Kicker color={page.color}>{page.kicker}</Kicker><h1>{page.title}</h1><Html as="p" html={page.blurb} /></div>
        <div className="hero"><img src={page.scene} alt="" /></div>
      </div></In>
      <In d={1}><section className="card"><Kicker>Every night, the same six things</Kicker>
        <div className="two" style={{ marginTop: 8 }}>
          <ol className="list">{SIX.map((t, i) => <li key={t}><span className="n">0{i + 1}</span><span><i>{t}</i></span></li>)}</ol>
          <div><p className="blurb" style={{ marginTop: 0 }}>A chat assistant lives inside one turn: seconds long, purely reactive. It cannot wait forty minutes, and it cannot act on its own. <b>A long-running agent</b> needs four things a chat assistant does not: a clock of its own, facts that outlive the conversation, survival across process death, and bounded authority. Each chapter removes one reason not to leave it alone at 3am.</p>
            <div className="chips">{CHIPS.map(([l, col]) => <span key={l} className="chip" style={{ "--c": col } as React.CSSProperties}>{l}</span>)}</div>
            <Html as="p" className="ethics" html={SHOW.ethics} /></div>
        </div></section></In>
      <In d={2}><section className="card"><Kicker>The graph you finish with · each node names the chapter that adds it</Kicker><div style={{ marginTop: 14 }}><FullGraph p={p} /></div></section></In>
      <In d={3}><div className="two">
        <section className="card" style={{ "--c": page.color } as React.CSSProperties}><Kicker>Your inputs, per night</Kicker>
          <ol className="list">{INPUTS.map((t, i) => <li key={t}><span className="n ball">{i + 1}</span><span>{t}</span></li>)}</ol>
          <div className="namerow"><label htmlFor="who">your name · for the breakfast message</label><input id="who" value={name} onChange={(e) => setName(e.target.value)} placeholder="who is asleep?" /></div>
        </section>
        <section className="card"><Kicker>What you learn, in six chapters</Kicker>
          <ul className="bullets">{LEARN.map((t) => <li key={t} dangerouslySetInnerHTML={{ __html: t }} />)}</ul></section>
      </div></In>
      <In d={4}><section className="statement"><p>This agent is <b>a run that can stop and start again</b>. In six chapters you give it a clock, a memory, a survivable pause, a fence around the money, a fixed order of things, and a limit you agreed. The last page is the message it leaves you over breakfast.</p>
        <div className="arc">
          <div className="box" style={{ "--c": "var(--fg-muted)" } as React.CSSProperties}>chapters I to VI<small>you build the night shift</small></div><span className="arrow">→</span>
          <div className="box" style={{ "--c": C.purple } as React.CSSProperties}>chapter VII<small>the breakfast message · what it did</small></div><span className="arrow">→</span>
          <div className="box" style={{ "--c": C.green } as React.CSSProperties}>laptop → Cloud Run<small>two URIs and one env var changed · read, not run</small></div>
        </div>
        <div className="arc-cap">one agent, from the plan you typed to the tickets you wake up with · {SHOW.minutes} · a Gemini API key or a Google Cloud project</div></section></In>
    </Shell>
  );
}
