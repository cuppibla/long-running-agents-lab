import type { Metadata } from "next";
import "./globals.css";

// Three faces, from Google Fonts at runtime — a stylesheet link rather than
// next/font so the static export builds anywhere, Cloud Shell included.
// Playfair Display (display) · Nunito (body) · JetBrains Mono (labels).
const FONTS = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";

export const metadata: Metadata = {
  title: "Long-Running Agents",
  description: "MonsterTix · ADK 2 on Google Cloud. An agent that waits in line, survives being killed, and buys at 3am inside limits you set — six chapters, one page, a real agent behind it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
