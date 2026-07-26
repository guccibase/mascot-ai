import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MascotAI",
    short_name: "MascotAI",
    description: "Animated SVG mascot studios for web and mobile apps",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1020",
    theme_color: "#0B1020",
    icons: [
      {
        src: "/brand/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
