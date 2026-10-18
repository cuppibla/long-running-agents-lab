import type { NextConfig } from "next";

// The page is exported to static files once (bash lab.sh) and served by the
// same Python process that runs the agent, the exam, the editor and the
// workbench — one origin, one port. In dev, `npm run dev` on 3602 talks to
// that process through NEXT_PUBLIC_LAB_ORIGIN.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
