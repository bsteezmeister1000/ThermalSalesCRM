import type { Metadata } from "next";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";

import "@/app/globals.css";

const PwaClientShell = dynamic(
  () => import("@/components/layout/pwa-client-shell").then((module) => module.PwaClientShell),
  { ssr: false }
);

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
    <html lang="en">
      <body>
        {children}
        <PwaClientShell />
      </body>
    </html>
  );
}
