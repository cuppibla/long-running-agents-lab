"use client";
import { sourceUrl } from "@/lib/api";
import { chapterOf, type Page } from "@/lib/pages";
import EditCard from "./EditCard";
import { BudgetFigure, GraphFigure, KillFigure, MemoryFigure, NewsFigure } from "./Figures";
import { useLab } from "./LabProvider";
import LoadCheck from "./LoadCheck";
import RunCard from "./RunCard";
import Shell from "./Shell";
import { Html, In, Kicker } from "./shared";
import StageCard from "./StageCard";
import VerifyCard from "./VerifyCard";

/** One chapter, one page: the 16:9 scene → the header (kicker · the hook · the concept, term
 *  first) → THE CONCEPT (2–3 sentences, chips, a kind-coloured figure of this chapter's
 *  mechanism) → THE STAGE → YOUR EDIT → BEFORE YOU RUN → RUN IT → VERIFY. */
function ClockCode() {
  return (
    <div className="code">
      <div className="ch"><span>monstertix/clock.py · the triggerer</span><a href={sourceUrl("monstertix/clock.py")} target="_blank" rel="noreferrer">read only · whole file ↗</a></div>
      <pre>{`with httpx.Client(timeout=300) as client:\n    `}<span className="fn">time</span>{`.sleep(args.delay)\n    `}<span className="kw">while</span> <span className="kw">True</span>{`:\n        log(`}<span className="st">&quot;firing → POST /wake&quot;</span>{`)\n        client.post(f`}<span className="st">&quot;{`{TRIGGER_URL}`}/wake&quot;</span>{`, json={`}<span className="st">&quot;message&quot;</span>{`: args.message})\n        `}<span className="kw">if not</span>{` args.every:\n            `}<span className="kw">return</span>{`                     `}<span className="cm"># once, unless told otherwise</span>{`\n        `}<span className="fn">time</span>{`.sleep(args.every)`}</pre>
    </div>
  );
}

export default function ChapterPage({ page }: { page: Page }) {
  const { p, refresh } = useLab();
  const c = chapterOf(page)!;
  const figure = c.n === 1 ? <ClockCode /> : c.n === 2 ? <MemoryFigure places={c.places?.(p) || []} /> : c.n === 3 ? <KillFigure p={p} /> : c.n === 4 ? <NewsFigure p={p} /> : c.n === 5 ? <GraphFigure p={p} /> : <BudgetFigure p={p} />;
  return (
    <Shell slug={page.slug}>
      <In><figure className="scene"><img src={page.scene} alt="" /></figure></In>
      <In d={1}><div className="head"><div><Kicker color={page.color}>{page.kicker}</Kicker><h1>{page.title}</h1></div></div></In>
      {page.concept && (
        <In d={2}><section className="card"><div className={c.n === 2 || c.n === 5 ? "two stack" : "two"}>
          <div><Kicker>The concept</Kicker><h2>{page.concept.h2}</h2><Html as="p" className="blurb" html={page.concept.body} />
            <div className="chips">{page.concept.chips.map(([l, col]) => <span key={l} className="chip" style={{ "--c": col } as React.CSSProperties}>{l}</span>)}</div></div>
          <div className={c.n === 1 ? "" : "fig"}>{figure}</div>
        </div></section></In>
      )}
      <In d={3}><StageCard page={page} c={c} /></In>
      {c.edit && <In d={3}><div id="your-edit"><EditCard page={page} c={c} p={p} onChanged={refresh} /></div></In>}
      {c.edit && <In d={4}><LoadCheck p={p} onChanged={refresh} /></In>}
      <In d={4}><RunCard page={page} c={c} /></In>
      <In d={5}><VerifyCard page={page} c={c} /></In>
    </Shell>
  );
}
