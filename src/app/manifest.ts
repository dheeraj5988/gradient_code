import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gradient Code",
    short_name: "Gradient Code",
    description: "Practical courses, projects and internships for developers",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
