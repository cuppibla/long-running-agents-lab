"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PAGES, pageOf } from "@/lib/pages";
import { TopNav } from "./TopNav";

/** Chrome around one page: nav + roadmap on top, the page, then
 *  ← Back · Chapter n of 7 · the CTA named after the next chapter's gesture. ← → move. */
export default function Shell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const page = pageOf(slug);
  const i = PAGES.indexOf(page);
  const prev = i > 0 ? PAGES[i - 1] : null;
  const next = page.next ? pageOf(page.next) : null;
  const router = useRouter();
  useEffect(() => {
    try { localStorage.setItem("lra.page", page.slug); } catch { /* ignore */ }
    window.scrollTo({ top: 0 });
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" && next) router.push(`/lab/${next.slug}/`);
      if (e.key === "ArrowLeft" && prev) router.push(`/lab/${prev.slug}/`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page.slug, next, prev, router]);
  return (
    <div className="vignette" style={{ "--c": page.color } as React.CSSProperties}>
      <TopNav active={page.slug} />
      <main className="page">{children}</main>
      <div className="foot">
        {prev ? <Link className="back" href={`/lab/${prev.slug}/`}>← Back</Link> : <span className="back" style={{ opacity: 0 }}>← Back</span>}
        <span className="step">Chapter {page.n} of 7</span>
        {next && <Link className="cta" href={`/lab/${next.slug}/`}>{page.cta} <span className="arrow">→</span></Link>}
      </div>
    </div>
  );
}
