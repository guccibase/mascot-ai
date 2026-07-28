"use node";

import { v } from "convex/values";
import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

function appUrl() {
  return (
    process.env.HOSTING_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/**
 * Authenticated: begin Convex order, create Stripe Checkout Session, return URL.
 */
export const createCheckoutSession = action({
  args: {
    listingId: v.id("marketplaceListings"),
    sku: v.union(v.literal("remix"), v.literal("buy_to_own")),
  },
  returns: v.object({ url: v.string(), orderId: v.id("marketplaceOrders") }),
  handler: async (
    ctx,
    args
  ): Promise<{ url: string; orderId: Id<"marketplaceOrders"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.marketplace.getUserIdByClerkInternal,
      { clerkId: identity.subject }
    );
    if (!userId) {
      throw new Error("User not synced yet. Refresh and try again.");
    }

    const begun: {
      orderId: Id<"marketplaceOrders">;
      amountCents: number;
      listingName: string;
      listingSlug: string;
    } = await ctx.runMutation(internal.marketplace.beginCheckout, {
      listingId: args.listingId,
      sku: args.sku,
      userId,
    });

    const stripe = stripeClient();
    const domain = appUrl();
    const productName =
      args.sku === "remix"
        ? `Remix license — ${begun.listingName}`
        : `Buy & own — ${begun.listingName}`;

    const priceId =
      args.sku === "remix"
        ? process.env.STRIPE_PRICE_REMIX
        : process.env.STRIPE_PRICE_BUY_TO_OWN;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: begun.amountCents,
              product_data: {
                name: productName,
                description:
                  args.sku === "remix"
                    ? "One remix session for this marketplace mascot. Listing stays available."
                    : "Exclusive ownership. Listing is removed from the marketplace.",
              },
            },
          },
        ];

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: identity.email ?? undefined,
        client_reference_id: identity.subject,
        line_items: lineItems,
        success_url: `${domain}/marketplace/checkout/success?orderId=${begun.orderId}`,
        cancel_url: `${domain}/marketplace/${begun.listingSlug}?canceled=1`,
        metadata: {
          orderId: begun.orderId,
          listingId: args.listingId,
          sku: args.sku,
          clerkUserId: identity.subject,
        },
      });
    } catch (err) {
      await ctx.runMutation(internal.marketplace.releaseCheckout, {
        orderId: begun.orderId,
        reason: "stripe_session_create_failed",
      });
      throw err;
    }

    if (!session.url) {
      await ctx.runMutation(internal.marketplace.releaseCheckout, {
        orderId: begun.orderId,
        reason: "stripe_missing_url",
      });
      throw new Error("Stripe did not return a checkout URL");
    }

    try {
      await ctx.runMutation(internal.marketplace.attachCheckoutSession, {
        orderId: begun.orderId,
        stripeCheckoutSessionId: session.id,
      });
    } catch (err) {
      await ctx.runMutation(internal.marketplace.releaseCheckout, {
        orderId: begun.orderId,
        reason: "attach_session_failed",
      });
      throw err;
    }

    return { url: session.url, orderId: begun.orderId };
  },
});

/** Verify Stripe signature and fulfill. Used by the HTTP webhook. */
export const fulfillWebhook = internalAction({
  args: {
    signature: v.string(),
    payload: v.string(),
  },
  returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { success: false, error: "STRIPE_WEBHOOK_SECRET not set" };
    }

    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.payload,
        args.signature,
        webhookSecret
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      return { success: false, error: message };
    }

    if (event.type === "checkout.session.expired") {
      const expired = event.data.object as Stripe.Checkout.Session;
      let orderId: Id<"marketplaceOrders"> | undefined = expired.metadata
        ?.orderId as Id<"marketplaceOrders"> | undefined;
      if (!orderId) {
        orderId =
          (await ctx.runQuery(internal.marketplace.getOrderBySessionInternal, {
            stripeCheckoutSessionId: expired.id,
          })) ?? undefined;
      }
      if (orderId) {
        await ctx.runMutation(internal.marketplace.releaseCheckout, {
          orderId,
          reason: "checkout_session_expired",
        });
      }
      return { success: true };
    }

    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.async_payment_succeeded"
    ) {
      return { success: true };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      return { success: true };
    }

    const orderId = (session.metadata?.orderId ?? undefined) as
      | Id<"marketplaceOrders">
      | undefined;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    // Key by checkout session so webhook + success-page confirm share one
    // idempotency record (completed + async_succeeded collapse too).
    const idempotencyKey = `session:${session.id}`;

    const result = await ctx.runMutation(internal.marketplace.fulfillPaidOrder, {
      stripeEventId: idempotencyKey,
      stripeEventType: event.type,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      orderId,
      amountTotal:
        typeof session.amount_total === "number"
          ? session.amount_total
          : undefined,
      currency: session.currency ?? undefined,
    });

    if (result.needsRefund) {
      if (!paymentIntentId) {
        return { success: false, error: "refund_missing_payment_intent" };
      }
      try {
        await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            reason: "requested_by_customer",
            metadata: {
              reason: result.reason,
              orderId: result.orderId ?? "",
            },
          },
          { idempotencyKey: `refund:${session.id}` }
        );
      } catch (err) {
        console.error("[stripe] refund failed", err);
        // Do not record the event — Stripe will retry the webhook.
        return { success: false, error: "refund_failed" };
      }
      if (result.orderId) {
        await ctx.runMutation(internal.marketplace.markOrderRefunded, {
          orderId: result.orderId,
          reason: result.reason,
          stripePaymentIntentId: paymentIntentId,
        });
      }
      await ctx.runMutation(internal.marketplace.recordStripeEvent, {
        eventId: idempotencyKey,
        type: event.type,
        outcome: "refunded",
      });
      return { success: true };
    }

    if (result.recordEvent) {
      await ctx.runMutation(internal.marketplace.recordStripeEvent, {
        eventId: idempotencyKey,
        type: event.type,
        outcome: result.eventOutcome ?? "fulfilled",
      });
    }

    return { success: true };
  },
});

/** Success-page confirm: retrieve session from Stripe and fulfill if needed. */
export const confirmOrder = action({
  args: { orderId: v.id("marketplaceOrders") },
  returns: v.object({
    status: v.string(),
    buyerMascotId: v.optional(v.id("mascots")),
    listingSlug: v.optional(v.string()),
    sku: v.optional(v.union(v.literal("remix"), v.literal("buy_to_own"))),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    status: string;
    buyerMascotId?: Id<"mascots">;
    listingSlug?: string;
    sku?: "remix" | "buy_to_own";
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const order: {
      _id: Id<"marketplaceOrders">;
      userId: Id<"users">;
      listingId: Id<"marketplaceListings">;
      sku: "remix" | "buy_to_own";
      amountCents: number;
      status: string;
      stripeCheckoutSessionId?: string;
    } | null = await ctx.runQuery(internal.marketplace.getOrderInternal, {
      orderId: args.orderId,
    });
    if (!order) throw new Error("Order not found");

    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.marketplace.getUserIdByClerkInternal,
      { clerkId: identity.subject }
    );
    if (!userId || userId !== order.userId) throw new Error("Unauthorized");

    if (order.status === "fulfilled") {
      const detail: {
        status: string;
        buyerMascotId?: Id<"mascots">;
        listingSlug?: string;
      } | null = await ctx.runQuery(
        internal.marketplace.getOrderFulfillmentInternal,
        { orderId: args.orderId }
      );
      return {
        status: "fulfilled",
        buyerMascotId: detail?.buyerMascotId,
        listingSlug: detail?.listingSlug,
        sku: order.sku,
      };
    }

    if (!order.stripeCheckoutSessionId) {
      return { status: order.status, sku: order.sku };
    }

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeCheckoutSessionId
    );

    if (session.payment_status === "paid") {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      // Idempotency key shared with webhook shape: prefer session id so
      // confirm + webhook don't double-process under different keys.
      const result = await ctx.runMutation(
        internal.marketplace.fulfillPaidOrder,
        {
          stripeEventId: `session:${session.id}`,
          stripeEventType: "checkout.session.completed",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          orderId: args.orderId,
          amountTotal:
            typeof session.amount_total === "number"
              ? session.amount_total
              : undefined,
          currency: session.currency ?? undefined,
        }
      );

      if (result.needsRefund && paymentIntentId) {
        try {
          await stripe.refunds.create(
            {
              payment_intent: paymentIntentId,
              reason: "requested_by_customer",
              metadata: {
                reason: result.reason,
                orderId: result.orderId ?? "",
              },
            },
            { idempotencyKey: `refund:${session.id}` }
          );
          if (result.orderId) {
            await ctx.runMutation(internal.marketplace.markOrderRefunded, {
              orderId: result.orderId,
              reason: result.reason,
              stripePaymentIntentId: paymentIntentId,
            });
          }
          await ctx.runMutation(internal.marketplace.recordStripeEvent, {
            eventId: `session:${session.id}`,
            type: "checkout.session.completed",
            outcome: "refunded",
          });
        } catch (err) {
          console.error("[stripe] confirm refund failed", err);
          throw new Error("Refund failed; retry confirmation shortly");
        }
      } else if (result.recordEvent) {
        await ctx.runMutation(internal.marketplace.recordStripeEvent, {
          eventId: `session:${session.id}`,
          type: "checkout.session.completed",
          outcome: result.eventOutcome ?? "fulfilled",
        });
      }
    }

    const detail: {
      status: string;
      buyerMascotId?: Id<"mascots">;
      listingSlug?: string;
    } | null = await ctx.runQuery(
      internal.marketplace.getOrderFulfillmentInternal,
      { orderId: args.orderId }
    );
    return {
      status: detail?.status ?? order.status,
      buyerMascotId: detail?.buyerMascotId,
      listingSlug: detail?.listingSlug,
      sku: order.sku,
    };
  },
});
