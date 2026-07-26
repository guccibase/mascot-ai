import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

/**
 * Convex client scoped to the signed-in Clerk user, for route handlers that
 * need to read or write on that user's behalf. Returns null when there is no
 * session so callers can answer 401 rather than acting unauthenticated.
 */
export async function authedConvexClient(): Promise<ConvexHttpClient | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");

  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  if (!token) return null;

  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return client;
}
