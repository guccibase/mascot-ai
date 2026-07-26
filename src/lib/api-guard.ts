import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Best-effort in-process rate limiting for expensive generation calls. The
 * token ledger is what actually stops overspending; this only smooths bursts
 * and keeps one client from monopolising an instance. A shared store
 * (Redis/Upstash) is required once this runs on more than one instance , 
 * until then a caller can dodge it by landing on a different instance.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Cap on distinct buckets, so a spray of keys cannot grow the map forever. */
const MAX_BUCKETS = 10_000;

/**
 * Drop everything already past its window. Called only when the map is at its
 * cap, so the common path stays O(1).
 */
function evictExpired(now: number): void {
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
  // Still full of live windows: clear the oldest to bound memory. Worst case a
  // few callers get a fresh allowance, which is preferable to unbounded growth.
  if (buckets.size >= MAX_BUCKETS) {
    const overflow = buckets.size - Math.floor(MAX_BUCKETS / 2);
    let dropped = 0;
    for (const key of buckets.keys()) {
      if (dropped++ >= overflow) break;
      buckets.delete(key);
    }
  }
}

/**
 * Prefer the Clerk user id: an IP is shared by everyone behind a corporate NAT
 * and trivially rotated by an attacker, so it is only a fallback.
 */
async function clientKey(req: Request): Promise<string> {
  try {
    const { userId } = await auth();
    if (userId) return `u:${userId}`;
  } catch {
    // Unauthenticated or called outside a request scope. Fall through to IP.
  }
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return `ip:${fwd.split(",")[0]!.trim()}`;
  return `ip:${req.headers.get("x-real-ip") ?? "local"}`;
}

export async function rateLimit(
  req: Request,
  opts: { name: string; limit: number; windowMs: number }
): Promise<NextResponse | null> {
  const key = `${opts.name}:${await clientKey(req)}`;
  const now = Date.now();

  if (buckets.size >= MAX_BUCKETS) evictExpired(now);

  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (entry.count >= opts.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: `Too many requests. Retry in ${retryAfter}s` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  entry.count++;
  return null;
}

/** Parse a JSON body with a hard size cap so packs can't be used as a DoS. */
export async function readJsonBody<T>(
  req: Request,
  maxBytes: number
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Request body too large (limit ${maxBytes} bytes)` },
        { status: 413 }
      ),
    };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Could not read request body" },
        { status: 400 }
      ),
    };
  }

  if (text.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Request body too large (limit ${maxBytes} bytes)` },
        { status: 413 }
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

/** Trim free-text fields so prompt inputs stay bounded. */
export function boundedText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxChars);
}
