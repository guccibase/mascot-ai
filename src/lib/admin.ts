import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Read admin role from Clerk session claims when present (zero Backend API
 * cost), otherwise fall back to currentUser().publicMetadata — same source
 * Convex trusts via the JWT template `role: {{user.public_metadata.role}}`.
 */
function roleFromUnknown(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.role === "string") return record.role;
  const meta = record.metadata ?? record.public_metadata ?? record.publicMetadata;
  if (meta && typeof meta === "object" && meta !== null) {
    const role = (meta as { role?: unknown }).role;
    if (typeof role === "string") return role;
  }
  return undefined;
}

export const isAdminUser = cache(async (): Promise<boolean> => {
  const { sessionClaims } = await auth();
  const fromClaims = roleFromUnknown(sessionClaims);
  if (fromClaims !== undefined) return fromClaims === "admin";

  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
});
