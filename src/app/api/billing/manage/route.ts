import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/api-guard";
import {
  getSubscriptionManagementUrl,
  isRevenueCatManagementConfigured,
} from "@/lib/revenuecat-management";

export const runtime = "nodejs";

/** One portal link per signed-in user per minute is plenty. */
const RATE = { name: "billing-manage", limit: 6, windowMs: 60_000 };

export async function GET(req: Request) {
  const limited = await rateLimit(req, RATE);
  if (limited) return limited;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!isRevenueCatManagementConfigured()) {
    return NextResponse.json(
      { error: "Billing management is not configured" },
      { status: 503 }
    );
  }

  try {
    const url = await getSubscriptionManagementUrl(userId);
    if (!url) {
      return NextResponse.json(
        { error: "No active subscription to manage" },
        { status: 404 }
      );
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/manage] RevenueCat error:", err);
    return NextResponse.json(
      { error: "Could not open billing portal. Try again shortly." },
      { status: 502 }
    );
  }
}
