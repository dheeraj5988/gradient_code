import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Code Gradient",
    short_name: "Code Gradient",
    description: "Practical courses, projects and internships for developers",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b1120",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
