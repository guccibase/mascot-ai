import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "sharp",
    "@img/sharp-linux-x64",
    "@img/sharp-linuxmusl-x64",
    "@img/sharp-libvips-linux-x64",
    "@img/sharp-libvips-linuxmusl-x64",
  ],
  // Turbopack sometimes walks up from src/app and loses sight of node_modules/next.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
