import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  // Turbopack sometimes walks up from src/app and loses sight of node_modules/next.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
