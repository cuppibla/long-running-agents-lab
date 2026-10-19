import LabPage from "@/components/LabPage";
import { SLUGS } from "@/lib/pages";

/** /lab/story · clock · memory · kill · news · graph · budget · breakfast — exported as
 *  static pages (output: "export"); the content is client-side and reads /api/*. */
export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}
export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LabPage slug={slug} />;
}
