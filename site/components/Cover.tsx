"use client";
import { useEffect, useState } from "react";
import { ART, SHOW } from "@/lib/chapters";

/** The gate. Your name goes on the breakfast message. The raccoon close-up is
 *  a plain <img> over a pastel background, so a missing file shows the colour. */
export default function Cover() {
  const [name, setName] = useState("");
  useEffect(() => { try { setName(localStorage.getItem("lra.name") || ""); } catch { /* private mode */ } }, []);
  const go = () => {
    try { localStorage.setItem("lra.name", name.trim()); } catch { /* ignore */ }
    window.location.href = "/lab/";
  };
  return (
    <div className="cover">
      <div className="card">
        <img src={ART.cover} alt="" />
        <div className="gate">
          <div className="eyebrow">{SHOW.eyebrow}</div>
          <h1 className="display">{SHOW.title.replace(SHOW.em, "")}<em>{SHOW.em}</em></h1>
          <p dangerouslySetInnerHTML={{ __html: SHOW.blurb }} />
          <div className="eth" dangerouslySetInnerHTML={{ __html: SHOW.ethics }} />
          <div><label>your name · for the breakfast message</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="who is asleep?" onKeyDown={(e) => { if (e.key === "Enter") go(); }} /></div>
          <button className="btn on" style={{ justifyContent: "center", padding: 11 }} onClick={go}>take your place in line →</button>
          <span className="mono dim" style={{ fontSize: 10.5 }}>{SHOW.minutes} · a Google Cloud project (Vertex AI) or a Gemini API key</span>
        </div>
      </div>
    </div>
  );
}
