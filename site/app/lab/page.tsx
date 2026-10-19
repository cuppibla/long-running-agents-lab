"use client";
import { useEffect } from "react";
import { slugOfChapter } from "@/lib/pages";

/** `/lab/?ch=N` → `/lab/<slug>/` with the other query parameters kept (?still=1, ?as=Name,
 *  ?console=1): the chapters moved to pages of their own, and the deep link stays good.
 *  With no ?ch, the page you were last on, else the story. */
export default function LabRedirect() {
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const ch = parseInt(qs.get("ch") || "", 10);
    qs.delete("ch");
    let slug = "story";
    if (ch >= 1 && ch <= 7) slug = slugOfChapter(ch);
    else { try { slug = localStorage.getItem("lra.page") || "story"; } catch { /* ignore */ } }
    const q = qs.toString();
    window.location.replace(`/lab/${slug}/${q ? `?${q}` : ""}`);
  }, []);
  return <p className="mono dim" style={{ padding: 40 }}>opening the chapter…</p>;
}
