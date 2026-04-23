import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thermal Lead Tracker",
    short_name: "Thermal Leads",
    description:
      "Permit-driven insulation lead discovery, scoring, and CRM workflow for the Cedar Rapids corridor.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f3ea",
    theme_color: "#14564f",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
