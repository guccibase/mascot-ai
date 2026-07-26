import { createHash } from "crypto";

/** Short stable id from arbitrary strings. */
export function contentId(parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 12);
}
