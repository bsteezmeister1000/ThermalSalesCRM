import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { PwaClientShell } from "@/components/layout/pwa-client-shell";

export const metadata: Metadata = {
  title: "Thermal Lead Tracker",
  description: "Permit-driven insulation lead tracking for the Cedar Rapids corridor.",
  applicationName: "Thermal Lead Tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Thermal Lead Tracker"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <PwaClientShell />
      </body>
    </html>
  );
}
