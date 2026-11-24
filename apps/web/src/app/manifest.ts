import type { MetadataRoute } from "next";

/** Web app manifest. Name and colours as on the old site (its Android icon files are not in the export). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doyuyo",
    short_name: "Doyuyo",
    icons: [{ src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    theme_color: "#e63d30",
    background_color: "#e63d30",
    display: "standalone",
  };
}
