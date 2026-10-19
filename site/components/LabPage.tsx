"use client";
import { pageOf } from "@/lib/pages";
import BreakfastPage from "./BreakfastPage";
import ChapterPage from "./ChapterPage";
import StoryPage from "./StoryPage";

/** /lab/<slug>/ — the story, six chapters, breakfast. */
export default function LabPage({ slug }: { slug: string }) {
  const page = pageOf(slug);
  if (page.slug === "story") return <StoryPage />;
  if (page.slug === "breakfast") return <BreakfastPage />;
  return <ChapterPage page={page} />;
}
