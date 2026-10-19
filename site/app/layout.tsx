import type { Metadata } from "next";
import Ambience from "@/components/Ambience";
import { LabProvider } from "@/components/LabProvider";
import "./globals.css";

// Three faces, from Google Fonts at runtime — a stylesheet link rather than next/font so the
// static export builds anywhere, Cloud Shell included. Archivo (display) · Google Sans (body) ·
// JetBrains Mono (labels): the reference's three.
const FONTS = "https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Google+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

export const metadata: Metadata = {
  title: "Long-Running Agents",
  description: "MonsterTix · ADK 2 on Google Cloud. An agent that waits in line, survives being killed, and buys at 3am inside limits you set — six chapters, one page each, a real agent behind them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <Ambience />
        <LabProvider>{children}</LabProvider>
      </body>
    </html>
  );
}
