import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource/merriweather";
import "@fontsource-variable/schibsted-grotesk";
import "@/styles/globals.css";
import "@/styles/print.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: {
    default: "Overhead Tank Management System | MAMS Hospital",
    template: "%s · MAMS Hospital",
  },
  description:
    "Real-time rooftop water monitoring for MAMS Hospital Overhead Tank Management System",
  icons: {
    icon: "/assets/mams-logo.png",
    apple: "/assets/mams-logo.png",
  },
  manifest: "/manifest.webmanifest",
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: "#003b6d", // --brand-800 per spec §6.2
  width: "device-width",
  initialScale: 1,
};

// Pre-paint theme bootstrap script: defaults to light per Override O1
const BOOTSTRAP_SCRIPT = `
  try {
    var theme = localStorage.getItem("theme") || localStorage.getItem("ohtms:theme") || "light";
    document.documentElement.dataset.theme = theme;
    var size = localStorage.getItem("ohtms:text-size");
    if (size) {
      document.documentElement.dataset.textSize = size;
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>

        {/* PWA Service Worker Registration in Production */}
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                      console.warn('SW registration failed:', err);
                    });
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
