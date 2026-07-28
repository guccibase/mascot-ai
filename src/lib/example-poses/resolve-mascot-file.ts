import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const MASCOTS_DIR = "src/components/mascots";

/**
 * Resolve a CLI argument to an on-disk mascot studio module.
 * Accepts: `nova`, `nova-mascot`, `nova-mascot.jsx`, paths under mascots/.
 * Always sandboxed to `src/components/mascots` — never loads arbitrary files.
 */
export function resolveMascotStudioPath(
  input: string,
  projectRoot: string
): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Mascot name or path is required");
  }

  const mascotsRoot = resolve(projectRoot, MASCOTS_DIR);
  const absolute = resolve(projectRoot, trimmed);

  if (existsSync(absolute)) {
    assertUnderMascotsDir(absolute, mascotsRoot);
    return absolute;
  }

  const base = trimmed
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/\.(jsx|tsx|js|ts)$/, "")
    .replace(/-mascot$/, "");

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(base)) {
    throw new Error(
      `Invalid mascot id “${base}”. Use lowercase letters, numbers, and hyphens.`
    );
  }

  const candidates = [
    join(mascotsRoot, `${base}-mascot.jsx`),
    join(mascotsRoot, `${base}-mascot.tsx`),
    join(mascotsRoot, `${base}.jsx`),
    join(mascotsRoot, `${base}.tsx`),
  ];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }

  throw new Error(
    `No mascot studio found for “${input}”. Expected one of:\n` +
      candidates.map((p) => `  · ${p}`).join("\n")
  );
}

/** Default pose-pack output for admin marketplace import. */
export function defaultPackOutputPath(
  slug: string,
  projectRoot: string
): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  if (!safe) throw new Error("Invalid slug for output path");
  return join(projectRoot, "src/lib/marketplace/packs", `${safe}.json`);
}

function assertUnderMascotsDir(filePath: string, mascotsRoot: string): void {
  const rel = relative(mascotsRoot, filePath);
  if (!rel || rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) {
    throw new Error(
      `Mascot studio must live under ${MASCOTS_DIR}/ (got ${filePath})`
    );
  }
}
