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
  // sharp@0.35 loads libvips via dlopen from a sibling package. Next/Turbopack
  // file tracing sees the .node addon but misses libvips-cpp.so, which breaks
  // app-asset rasterization on Vercel (ERR_DLOPEN_FAILED). Force-include it.
  // See: https://github.com/lovell/sharp/issues/4567
  outputFileTracingIncludes: {
    "/api/generate/app-assets/samples": [
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
    ],
    "/api/generate/app-assets/pack": [
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
    ],
  },
  // Turbopack sometimes walks up from src/app and loses sight of node_modules/next.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
