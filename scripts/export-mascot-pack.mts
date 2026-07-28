#!/usr/bin/env node
/**
 * Export a mascot studio JSX module to a marketplace-ready pose-pack JSON.
 *
 * Usage:
 *   npm run mascot:export -- bud
 *   npm run mascot:export -- my-mascot --out ./my-mascot.json
 *
 * Workflow:
 *   1. Add src/components/mascots/{name}-mascot.jsx with export const POSE_SOURCE
 *   2. Run this script
 *   3. Upload the JSON in Library → Admin → New listing
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildPosePackFromSource,
  type PoseSource,
} from "../src/lib/example-poses/build-pack";
import {
  defaultPackOutputPath,
  resolveMascotStudioPath,
} from "../src/lib/example-poses/resolve-mascot-file";
import { validateExportedPosePack } from "../src/lib/example-poses/validate-exported-pack";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function usage(): void {
  console.log(`Export a mascot studio to marketplace pose-pack JSON.

Usage:
  npm run mascot:export -- <mascot> [--out <path.json>]

Arguments:
  mascot    Studio module name or path (e.g. bud, my-mascot, src/components/mascots/foo-mascot.jsx)

Options:
  --out     Output JSON path (default: src/lib/marketplace/packs/<slug>.json)

Example:
  npm run mascot:export -- bud
  npm run mascot:export -- nova --out ./nova.json
`);
}

function parseArgs(argv: string[]): { mascot: string; out?: string } {
  const positional: string[] = [];
  let out: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--out" || arg === "-o") {
      out = argv[i + 1];
      if (!out) throw new Error("--out requires a file path");
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    positional.push(arg);
  }

  const mascot = positional[0];
  if (!mascot) {
    usage();
    process.exit(1);
  }

  return { mascot, out };
}

async function loadPoseSource(modulePath: string): Promise<PoseSource> {
  const mod = (await import(pathToFileURL(modulePath).href)) as {
    POSE_SOURCE?: PoseSource;
  };

  if (!mod.POSE_SOURCE) {
    throw new Error(
      `${modulePath} must export POSE_SOURCE (see bud-mascot.jsx for the contract)`
    );
  }

  return mod.POSE_SOURCE;
}

async function main(): Promise<void> {
  const { mascot, out } = parseArgs(process.argv.slice(2));
  const modulePath = resolveMascotStudioPath(mascot, ROOT);

  console.log(`Loading ${modulePath}…`);
  const source = await loadPoseSource(modulePath);

  console.log(`Rendering ${source.poses.length} poses for “${source.slug}”…`);
  const pack = buildPosePackFromSource(source);
  const report = validateExportedPosePack(pack);

  const outputPath = resolve(
    ROOT,
    out ?? defaultPackOutputPath(pack.slug, ROOT)
  );
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  console.log(
    `✓ Wrote ${outputPath}\n` +
      `  ${report.poseCount} poses · ${Math.round(report.bytes / 1024)}KB on disk · ` +
      `~${Math.round(report.restoredBytes / 1024)}KB after import · ` +
      `${Math.round(report.cssBytes / 1024)}KB CSS\n` +
      `  Upload this file in Library → Admin → New listing → Upload pose-pack JSON`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
