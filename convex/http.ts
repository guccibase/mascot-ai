import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("CLERK_WEBHOOK_SECRET not set", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await request.text();
    let event: WebhookEvent;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const u = event.data;
        const email =
          u.email_addresses.find((e) => e.id === u.primary_email_address_id)
            ?.email_address ??
          u.email_addresses[0]?.email_address ??
          "";
        const name =
          [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
          u.username ||
          (email ? email.split("@")[0]! : "Creator");
        await ctx.runMutation(internal.usersInternal.upsertFromClerk, {
          clerkId: u.id,
          email,
          name,
          imageUrl: u.image_url,
        });
        break;
      }
      case "user.deleted": {
        const id = event.data.id;
        if (id) {
          await ctx.runMutation(internal.usersInternal.deleteByClerkId, {
            clerkId: id,
          });
        }
        break;
      }
      default:
        break;
    }

    return new Response(null, { status: 200 });
  }),
});

/**
 * Constant-time compare of two secrets. Both sides are hashed first so the
 * comparison is fixed-length and leaks nothing about the secret's length.
 */
async function secureEquals(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

/**
 * Accept the secret with or without a `Bearer ` prefix. The RevenueCat
 * dashboard field is free text, and a prefix mismatch would 401 every webhook
 *. Silently halting all grants.
 */
function bearerToken(header: string): string {
  const trimmed = header.trim();
  const match = /^bearer\s+/i.exec(trimmed);
  return match ? trimmed.slice(match[0].length).trim() : trimmed;
}

type RevenueCatEvent = {
  id?: string;
  type?: string;
  event_timestamp_ms?: number | null;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string | null;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  store?: string | null;
  environment?: string | null;
  cancel_reason?: string | null;
};

/** Convex v.optional rejects JSON null; RevenueCat sends null for unset fields. */
function rcOptionalNumber(value: number | null | undefined): number | undefined {
  return value ?? undefined;
}

function rcOptionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

/**
 * RevenueCat authenticates webhooks with a shared secret sent in the
 * Authorization header, and retries any non-2xx response. Anything we could
 * not apply is answered with a 503 on purpose: a retry is how a purchase
 * survives a user row that has not synced yet or a catalog we need to fix.
 * RevenueCat surfaces events that exhaust their retries in its dashboard,
 * which is the alert of last resort.
 */
http.route({
  path: "/revenuecat-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("REVENUECAT_WEBHOOK_SECRET not set", { status: 500 });
    }

    const authorization = request.headers.get("authorization") ?? "";
    if (!(await secureEquals(bearerToken(authorization), bearerToken(secret)))) {
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: { event?: RevenueCatEvent };
    try {
      payload = (await request.json()) as { event?: RevenueCatEvent };
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const event = payload.event;
    if (!event?.id || !event.type) {
      return new Response("Missing event", { status: 400 });
    }

    const appUserId = event.app_user_id ?? event.original_app_user_id;
    if (!appUserId) {
      return new Response(null, { status: 200 });
    }

    try {
      const result = await ctx.runMutation(
        internal.billing.applyRevenueCatEvent,
        {
          eventId: event.id,
          type: event.type,
          appUserId,
          eventAtMs: rcOptionalNumber(event.event_timestamp_ms),
          productId: rcOptionalString(event.product_id),
          purchasedAtMs: rcOptionalNumber(event.purchased_at_ms),
          expiresAtMs: rcOptionalNumber(event.expiration_at_ms),
          store: rcOptionalString(event.store),
          environment: rcOptionalString(event.environment),
          cancelReason: rcOptionalString(event.cancel_reason),
        }
      );
      if (!result.handled) {
        console.warn(
          `[revenuecat] ${event.type} ${event.id} not applied: ${result.reason}`
        );
        // A duplicate is the one benign case. It means the event already
        // took effect. Everything else left the event unclaimed, so ask for a
        // retry instead of dropping a purchase on the floor.
        if (result.reason !== "duplicate") {
          return new Response(result.reason, { status: 503 });
        }
      }
    } catch (err) {
      // Signal a retry. A transient write failure must not lose a purchase.
      console.error("[revenuecat] webhook failed:", err);
      return new Response("Retry", { status: 500 });
    }

    return new Response(null, { status: 200 });
  }),
});

/**
 * Stripe marketplace checkout webhooks. Signature verification runs in the
 * Node action (Stripe SDK); this HTTP action only forwards the raw body.
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature", { status: 400 });
    }
    const payload = await request.text();
    const result = await ctx.runAction(internal.marketplaceStripe.fulfillWebhook, {
      signature,
      payload,
    });
    if (!result.success) {
      return new Response(result.error ?? "Webhook Error", { status: 400 });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
