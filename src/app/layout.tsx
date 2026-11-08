import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/schibsted-grotesk"; // self-hosted from node_modules — no CDN, works offline
import "@/styles/globals.css";

export const metadata: Metadata = { title: { default: "MAMS Water", template: "%s · MAMS Water" }, description: "Overhead tank monitoring for MAMS Hospital", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#091820", width: "device-width", initialScale: 1 };

// Runs before paint: dark by default (control-room use), user's saved choice wins. No flash.
const THEME = `try{document.documentElement.dataset.theme=localStorage.getItem("theme")||"dark"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}</body>
    </html>
  );
}
