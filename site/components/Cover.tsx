"use client";
import { useEffect, useState } from "react";
import { ART, SHOW } from "@/lib/chapters";

/** The first screen. Your name goes on the check. The hero is a layered CSS
 *  background — url() over the gradient — so a missing site/public/art/hero.jpg
 *  shows the gradient, never a broken-image icon (an <img> that fails before
 *  React hydrates never gets its onError replayed). */
export default function Cover() {
  const [name, setName] = useState("");
  useEffect(() => { try { setName(localStorage.getItem("lab.name") || ""); } catch { /* private mode */ } }, []);
  const go = () => {
    try { localStorage.setItem("lab.name", name.trim()); } catch { /* ignore */ }
    window.location.href = "/lab/";
  };
  return (
    <div className="cover">
      <div className="card">
        <div className="art" style={{ backgroundImage: `url(${ART.hero}), var(--art-hero)` }} role="img" aria-label="the cover" />
        <div className="rsv">
          <div className="eyebrow">{SHOW.tag}</div>
          <h1 className="display">{SHOW.title.replace(SHOW.em, "")}<em>{SHOW.em}</em></h1>
          <p dangerouslySetInnerHTML={{ __html: SHOW.blurb }} />
          <div><label>YOUR NAME · it goes on the check</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="who is here?" onKeyDown={(e) => { if (e.key === "Enter") go(); }} /></div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
            <button className="btn hot" onClick={go}>✦ come in</button>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>{SHOW.minutes} · a Gemini API key or a Google Cloud project</span>
          </div>
        </div>
      </div>
    </div>
  );
}
