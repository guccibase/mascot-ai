import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  ensureCurrentUser,
  getCurrentUserOrNull,
  requireAdmin,
  requireOwnedMascot,
  roleFromIdentity,
} from "./lib/auth";
import {
  BUY_TO_OWN_PRICE_CENTS,
  MARKETPLACE_CATEGORIES,
  REMIX_PRICE_CENTS,
  REMIX_UNLOCK_TTL_MS,
  RESERVE_TTL_MS,
  assertPack,
  buildListingSearchText,
  marketplaceCategoryValidator,
  packFingerprint,
  previewSvgFromPack,
  slugify,
  type MarketplaceCategory,
} from "./lib/marketplace";
import { assertServerCaller } from "./lib/serverAuth";
import { validators } from "./schema";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const categoryValidator = marketplaceCategoryValidator;

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("available"),
  v.literal("reserved"),
  v.literal("sold"),
  v.literal("archived")
);

const listingCard = v.object({
  _id: v.id("marketplaceListings"),
  slug: v.string(),
  name: v.string(),
  tagline: v.string(),
  description: v.string(),
  category: categoryValidator,
  previewSvg: v.string(),
  accent: v.string(),
  gestureCount: v.number(),
  updatedAt: v.number(),
});

const listingDetail = v.object({
  _id: v.id("marketplaceListings"),
  slug: v.string(),
  name: v.string(),
  tagline: v.string(),
  description: v.string(),
  category: categoryValidator,
  status: statusValidator,
  pack: validators.pack,
  previewSvg: v.string(),
  accent: v.string(),
  gestureCount: v.number(),
  remixPriceCents: v.number(),
  buyToOwnPriceCents: v.number(),
  updatedAt: v.number(),
});

const emptyPage = {
  page: [] as never[],
  isDone: true,
  continueCursor: "",
  splitCursor: null,
  pageStatus: null,
};

function toCard(listing: Doc<"marketplaceListings">) {
  return {
    _id: listing._id,
    slug: listing.slug,
    name: listing.name,
    tagline: listing.tagline,
    description: listing.description,
    category: listing.category,
    previewSvg: listing.previewSvg,
    accent: listing.pack.accent,
    gestureCount: listing.pack.gestures.length,
    updatedAt: listing.updatedAt,
  };
}

async function uniqueSlug(ctx: QueryCtx | MutationCtx, base: string) {
  const root = slugify(base);
  let candidate = root;
  for (let i = 0; i < 20; i++) {
    const existing = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing) return candidate;
    candidate = `${root}-${i + 2}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    return roleFromIdentity(identity as { [key: string]: unknown }) === "admin";
  },
});

export const listAvailable = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(categoryValidator),
  },
  returns: paginationResultValidator(listingCard),
  handler: async (ctx, args) => {
    if (args.category) {
      const result = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_category_status_updated", (q) =>
          q.eq("category", args.category!).eq("status", "available")
        )
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...result, page: result.page.map(toCard) };
    }

    const result = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status_updated", (q) => q.eq("status", "available"))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: result.page.map(toCard) };
  },
});

export const searchAvailable = query({
  args: {
    query: v.string(),
    category: v.optional(categoryValidator),
  },
  returns: v.array(listingCard),
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (!q) return [];

    const hits = await ctx.db
      .query("marketplaceListings")
      .withSearchIndex("search_listings", (search) => {
        let s = search.search("searchText", q).eq("status", "available");
        if (args.category) {
          s = s.eq("category", args.category);
        }
        return s;
      })
      .take(48);

    return hits.map(toCard);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(listingDetail, v.null()),
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!listing) return null;
    if (listing.status !== "available" && listing.status !== "reserved") {
      // Sold/archived/draft: only the buyer (via library) or admin should see.
      // Public detail stays null so the marketplace card disappears cleanly.
      return null;
    }
    if (listing.status === "reserved") {
      // Still show while checkout is in flight so the winner can return;
      // buy CTA will reject others.
    }
    return {
      _id: listing._id,
      slug: listing.slug,
      name: listing.name,
      tagline: listing.tagline,
      description: listing.description,
      category: listing.category,
      status: listing.status,
      pack: listing.pack,
      previewSvg: listing.previewSvg,
      accent: listing.pack.accent,
      gestureCount: listing.pack.gestures.length,
      remixPriceCents: REMIX_PRICE_CENTS,
      buyToOwnPriceCents: BUY_TO_OWN_PRICE_CENTS,
      updatedAt: listing.updatedAt,
    };
  },
});

export const adminList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(statusValidator),
  },
  returns: paginationResultValidator(
    v.object({
      _id: v.id("marketplaceListings"),
      slug: v.string(),
      name: v.string(),
      tagline: v.string(),
      category: categoryValidator,
      status: statusValidator,
      previewSvg: v.string(),
      updatedAt: v.number(),
      soldAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (
      !identity ||
      roleFromIdentity(identity as { [key: string]: unknown }) !== "admin"
    ) {
      return emptyPage;
    }

    // Paginate a single status index. Default = available (marketplace live set).
    const status = args.status ?? "available";
    const result = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_status_updated", (q) => q.eq("status", status))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((l) => ({
        _id: l._id,
        slug: l.slug,
        name: l.name,
        tagline: l.tagline,
        category: l.category,
        status: l.status,
        previewSvg: l.previewSvg,
        updatedAt: l.updatedAt,
        soldAt: l.soldAt,
      })),
    };
  },
});

export const adminGet = query({
  args: { listingId: v.id("marketplaceListings") },
  returns: v.union(
    v.object({
      _id: v.id("marketplaceListings"),
      slug: v.string(),
      name: v.string(),
      tagline: v.string(),
      description: v.string(),
      category: categoryValidator,
      status: statusValidator,
      pack: validators.pack,
      previewSvg: v.string(),
      updatedAt: v.number(),
      soldAt: v.optional(v.number()),
      soldToUserId: v.optional(v.id("users")),
      buyerMascotId: v.optional(v.id("mascots")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (
      !identity ||
      roleFromIdentity(identity as { [key: string]: unknown }) !== "admin"
    ) {
      return null;
    }
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;
    return {
      _id: listing._id,
      slug: listing.slug,
      name: listing.name,
      tagline: listing.tagline,
      description: listing.description,
      category: listing.category,
      status: listing.status,
      pack: listing.pack,
      previewSvg: listing.previewSvg,
      updatedAt: listing.updatedAt,
      soldAt: listing.soldAt,
      soldToUserId: listing.soldToUserId,
      buyerMascotId: listing.buyerMascotId,
    };
  },
});

export const adminUpsert = mutation({
  args: {
    listingId: v.optional(v.id("marketplaceListings")),
    slug: v.optional(v.string()),
    name: v.string(),
    tagline: v.string(),
    description: v.string(),
    category: categoryValidator,
    status: v.union(
      v.literal("draft"),
      v.literal("available"),
      v.literal("archived")
    ),
    pack: validators.pack,
    sourceMascotId: v.optional(v.id("mascots")),
  },
  returns: v.id("marketplaceListings"),
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx);
    const now = Date.now();

    let pack = args.pack;
    if (args.sourceMascotId) {
      const { mascot } = await requireOwnedMascot(ctx, args.sourceMascotId);
      pack = mascot.pack;
    }
    assertPack(pack);

    if (!MARKETPLACE_CATEGORIES.includes(args.category as MarketplaceCategory)) {
      throw new Error("Invalid category");
    }

    // Sold listings can't be re-published through this path.
    if (args.listingId) {
      const existing = await ctx.db.get(args.listingId);
      if (!existing) throw new Error("Listing not found");
      if (existing.status === "sold") {
        throw new Error("Sold listings cannot be edited");
      }
      if (existing.status === "reserved") {
        throw new Error("Listing is reserved by an in-flight checkout");
      }

      const previewSvg = previewSvgFromPack(pack);
      const searchText = buildListingSearchText({
        name: args.name,
        tagline: args.tagline,
        description: args.description,
        category: args.category,
        pack,
      });
      const slug =
        args.slug && args.slug !== existing.slug
          ? await uniqueSlug(ctx, args.slug)
          : existing.slug;

      await ctx.db.patch(args.listingId, {
        slug,
        name: args.name.trim(),
        tagline: args.tagline.trim(),
        description: args.description.trim(),
        category: args.category,
        status: args.status,
        pack,
        previewSvg,
        packFingerprint: packFingerprint(pack),
        searchText,
        updatedAt: now,
        // Previews play the stored pack now, so drop any legacy studio pin.
        exampleSlug: undefined,
      });
      return args.listingId;
    }

    const slug = await uniqueSlug(ctx, args.slug || args.name);
    const previewSvg = previewSvgFromPack(pack);
    const searchText = buildListingSearchText({
      name: args.name,
      tagline: args.tagline,
      description: args.description,
      category: args.category,
      pack,
    });

    return await ctx.db.insert("marketplaceListings", {
      slug,
      name: args.name.trim(),
      tagline: args.tagline.trim(),
      description: args.description.trim(),
      category: args.category,
      status: args.status,
      pack,
      previewSvg,
      packFingerprint: packFingerprint(pack),
      searchText,
      createdByAdminUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Replace only the pack on an existing listing (themes / instrument / poses).
 * Keeps slug, copy, category, and status — used after `npm run mascot:export`.
 */
export const adminRefreshPack = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    pack: validators.pack,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.listingId);
    if (!existing) throw new Error("Listing not found");
    if (existing.status === "sold") {
      throw new Error("Sold listings cannot be edited");
    }
    if (existing.status === "reserved") {
      throw new Error("Listing is reserved by an in-flight checkout");
    }

    assertPack(args.pack);
    const now = Date.now();
    const previewSvg = previewSvgFromPack(args.pack);
    const searchText = buildListingSearchText({
      name: existing.name,
      tagline: existing.tagline,
      description: existing.description,
      category: existing.category,
      pack: args.pack,
    });

    await ctx.db.patch(args.listingId, {
      pack: args.pack,
      previewSvg,
      packFingerprint: packFingerprint(args.pack),
      searchText,
      updatedAt: now,
      exampleSlug: undefined,
    });
    return null;
  },
});

export const adminSetStatus = mutation({
  args: {
    listingId: v.id("marketplaceListings"),
    status: v.union(
      v.literal("draft"),
      v.literal("available"),
      v.literal("archived")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");
    if (listing.status === "sold") {
      throw new Error("Sold listings cannot change status");
    }
    if (listing.status === "reserved") {
      throw new Error("Listing is reserved by an in-flight checkout");
    }
    await ctx.db.patch(args.listingId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Create a pending order + soft-reserve for buy_to_own.
 * Only callable from the Stripe checkout action (not the browser).
 */
export const beginCheckout = internalMutation({
  args: {
    listingId: v.id("marketplaceListings"),
    sku: v.union(v.literal("remix"), v.literal("buy_to_own")),
    userId: v.id("users"),
  },
  returns: v.object({
    orderId: v.id("marketplaceOrders"),
    amountCents: v.number(),
    listingName: v.string(),
    listingSlug: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    // Remix stays available during a buy-to-own hold; exclusive reserve is
    // buy_to_own only.
    if (args.sku === "buy_to_own") {
      if (listing.status !== "available") {
        throw new ConvexError({
          code: "LISTING_UNAVAILABLE",
          message:
            listing.status === "sold"
              ? "This mascot has already been sold"
              : "This mascot is not available for purchase",
        });
      }
    } else if (
      listing.status !== "available" &&
      listing.status !== "reserved"
    ) {
      throw new ConvexError({
        code: "LISTING_UNAVAILABLE",
        message:
          listing.status === "sold"
            ? "This mascot has already been sold"
            : "This mascot is not available for remix",
      });
    }

    const now = Date.now();
    const amountCents =
      args.sku === "remix" ? REMIX_PRICE_CENTS : BUY_TO_OWN_PRICE_CENTS;

    if (args.sku === "buy_to_own") {
      await ctx.db.patch(listing._id, {
        status: "reserved",
        reservedByUserId: user._id,
        reservedUntil: now + RESERVE_TTL_MS,
        updatedAt: now,
      });
    }

    const orderId = await ctx.db.insert("marketplaceOrders", {
      userId: user._id,
      listingId: listing._id,
      sku: args.sku,
      amountCents,
      currency: "usd",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return {
      orderId,
      amountCents,
      listingName: listing.name,
      listingSlug: listing.slug,
    };
  },
});

export const attachCheckoutSession = internalMutation({
  args: {
    orderId: v.id("marketplaceOrders"),
    stripeCheckoutSessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await ctx.db.patch(args.orderId, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: Date.now(),
    });
    if (order.sku === "buy_to_own") {
      await ctx.db.patch(order.listingId, {
        stripeCheckoutSessionId: args.stripeCheckoutSessionId,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const releaseCheckout = internalMutation({
  args: {
    orderId: v.id("marketplaceOrders"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "pending") return null;
    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: "expired",
      refundReason: args.reason,
      updatedAt: now,
    });
    if (order.sku === "buy_to_own") {
      const listing = await ctx.db.get(order.listingId);
      if (
        listing &&
        listing.status === "reserved" &&
        listing.reservedByUserId === order.userId
      ) {
        await ctx.db.patch(listing._id, {
          status: "available",
          reservedByUserId: undefined,
          reservedUntil: undefined,
          stripeCheckoutSessionId: undefined,
          updatedAt: now,
        });
      }
    }
    return null;
  },
});

export const getOrderInternal = internalQuery({
  args: { orderId: v.id("marketplaceOrders") },
  returns: v.union(
    v.object({
      _id: v.id("marketplaceOrders"),
      userId: v.id("users"),
      listingId: v.id("marketplaceListings"),
      sku: v.union(v.literal("remix"), v.literal("buy_to_own")),
      amountCents: v.number(),
      status: v.string(),
      stripeCheckoutSessionId: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    return {
      _id: order._id,
      userId: order.userId,
      listingId: order.listingId,
      sku: order.sku,
      amountCents: order.amountCents,
      status: order.status,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    };
  },
});

export const getOrderBySessionInternal = internalQuery({
  args: { stripeCheckoutSessionId: v.string() },
  returns: v.union(v.id("marketplaceOrders"), v.null()),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("marketplaceOrders")
      .withIndex("by_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .unique();
    return order?._id ?? null;
  },
});

/**
 * Fulfill a paid checkout. Does NOT write stripeEvents — the Stripe action
 * records the event only after fulfill succeeds or a refund completes, so
 * failed refunds can safely retry.
 */
export const fulfillPaidOrder = internalMutation({
  args: {
    stripeEventId: v.string(),
    stripeEventType: v.string(),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    orderId: v.optional(v.id("marketplaceOrders")),
    amountTotal: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  returns: v.object({
    handled: v.boolean(),
    reason: v.string(),
    needsRefund: v.boolean(),
    recordEvent: v.boolean(),
    eventOutcome: v.optional(
      v.union(
        v.literal("fulfilled"),
        v.literal("refunded"),
        v.literal("ignored")
      )
    ),
    orderId: v.optional(v.id("marketplaceOrders")),
    buyerMascotId: v.optional(v.id("mascots")),
    remixUnlockExpiresAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.stripeEventId))
      .unique();
    if (existingEvent) {
      return {
        handled: true,
        reason: "duplicate",
        needsRefund: false,
        recordEvent: false,
      };
    }

    let order: Doc<"marketplaceOrders"> | null = null;
    if (args.orderId) {
      order = await ctx.db.get(args.orderId);
    }
    if (!order) {
      order = await ctx.db
        .query("marketplaceOrders")
        .withIndex("by_session", (q) =>
          q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
        )
        .unique();
    }
    if (!order) {
      return {
        handled: false,
        reason: "order_not_found",
        needsRefund: true,
        recordEvent: false,
      };
    }

    if (order.status === "fulfilled") {
      return {
        handled: true,
        reason: "already_fulfilled",
        needsRefund: false,
        recordEvent: true,
        eventOutcome: "fulfilled" as const,
        orderId: order._id,
        buyerMascotId: order.buyerMascotId,
        remixUnlockExpiresAt: order.remixUnlockExpiresAt,
      };
    }

    if (order.status === "refunded") {
      return {
        handled: true,
        reason: "already_refunded",
        needsRefund: false,
        recordEvent: true,
        eventOutcome: "refunded" as const,
        orderId: order._id,
      };
    }

    // Already claimed for refund — do not fulfill; Stripe refunds use
    // idempotency keys so concurrent webhook + confirm are safe.
    if (order.status === "paid") {
      return {
        handled: false,
        reason: order.refundReason ?? "refund_pending",
        needsRefund: true,
        recordEvent: false,
        orderId: order._id,
      };
    }

    // Amount / currency guard when Stripe Price IDs are used.
    if (
      typeof args.amountTotal === "number" &&
      args.amountTotal !== order.amountCents
    ) {
      await ctx.db.patch(order._id, {
        status: "paid",
        refundReason: "amount_mismatch",
        stripePaymentIntentId: args.stripePaymentIntentId,
        updatedAt: Date.now(),
      });
      return {
        handled: false,
        reason: "amount_mismatch",
        needsRefund: true,
        recordEvent: false,
        orderId: order._id,
      };
    }
    if (
      args.currency &&
      args.currency.toLowerCase() !== order.currency.toLowerCase()
    ) {
      await ctx.db.patch(order._id, {
        status: "paid",
        refundReason: "currency_mismatch",
        stripePaymentIntentId: args.stripePaymentIntentId,
        updatedAt: Date.now(),
      });
      return {
        handled: false,
        reason: "currency_mismatch",
        needsRefund: true,
        recordEvent: false,
        orderId: order._id,
      };
    }

    const listing = await ctx.db.get(order.listingId);
    if (!listing) {
      await ctx.db.patch(order._id, {
        status: "paid",
        refundReason: "listing_missing",
        stripePaymentIntentId: args.stripePaymentIntentId,
        updatedAt: Date.now(),
      });
      return {
        handled: false,
        reason: "listing_missing",
        needsRefund: true,
        recordEvent: false,
        orderId: order._id,
      };
    }

    const now = Date.now();

    // Late payment after TTL sweep: try to fulfill if still claimable; else refund.
    // (`paid` already returned above as refund_pending.)
    const orderExpired = order.status === "expired";
    if (order.status !== "pending" && !orderExpired) {
      return {
        handled: false,
        reason: `order_${order.status}`,
        needsRefund: false,
        recordEvent: false,
        orderId: order._id,
      };
    }

    if (order.sku === "remix") {
      if (listing.status !== "available" && listing.status !== "reserved") {
        await ctx.db.patch(order._id, {
          status: "paid",
          refundReason: "listing_not_available_for_remix",
          stripePaymentIntentId: args.stripePaymentIntentId,
          updatedAt: now,
        });
        return {
          handled: false,
          reason: "listing_not_available_for_remix",
          needsRefund: true,
          recordEvent: false,
          orderId: order._id,
        };
      }

      const remixUnlockExpiresAt = now + REMIX_UNLOCK_TTL_MS;
      await ctx.db.patch(order._id, {
        status: "fulfilled",
        stripeCheckoutSessionId: args.stripeCheckoutSessionId,
        stripePaymentIntentId: args.stripePaymentIntentId,
        remixUnlockExpiresAt,
        updatedAt: now,
      });
      return {
        handled: true,
        reason: "remix_unlocked",
        needsRefund: false,
        recordEvent: true,
        eventOutcome: "fulfilled" as const,
        orderId: order._id,
        remixUnlockExpiresAt,
      };
    }

    // buy_to_own: rightful reserver may claim even after TTL if still reserved
    // for them (sweep may not have run). Never grant if sold to someone else.
    const reservedForBuyer =
      listing.status === "reserved" &&
      listing.reservedByUserId === order.userId;
    const stillAvailable = listing.status === "available";

    if (!reservedForBuyer && !stillAvailable) {
      await ctx.db.patch(order._id, {
        status: "paid",
        refundReason: "lost_exclusive_claim",
        stripePaymentIntentId: args.stripePaymentIntentId,
        updatedAt: now,
      });
      return {
        handled: false,
        reason: "lost_exclusive_claim",
        needsRefund: true,
        recordEvent: false,
        orderId: order._id,
      };
    }

    const buyerMascotId = await ctx.db.insert("mascots", {
      userId: order.userId,
      name: listing.pack.name,
      tagline: listing.pack.tagline,
      source: "purchased",
      sourceListingId: listing._id,
      pack: listing.pack,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(listing._id, {
      status: "sold",
      soldToUserId: order.userId,
      soldAt: now,
      buyerMascotId,
      reservedByUserId: undefined,
      reservedUntil: undefined,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: now,
    });

    await ctx.db.patch(order._id, {
      status: "fulfilled",
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      buyerMascotId,
      updatedAt: now,
    });

    return {
      handled: true,
      reason: "buy_to_own_fulfilled",
      needsRefund: false,
      recordEvent: true,
      eventOutcome: "fulfilled" as const,
      orderId: order._id,
      buyerMascotId,
    };
  },
});

export const recordStripeEvent = internalMutation({
  args: {
    eventId: v.string(),
    type: v.string(),
    outcome: v.union(
      v.literal("fulfilled"),
      v.literal("refunded"),
      v.literal("ignored")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) return null;
    await ctx.db.insert("stripeEvents", {
      eventId: args.eventId,
      type: args.type,
      outcome: args.outcome,
      processedAt: Date.now(),
    });
    return null;
  },
});

export const markOrderRefunded = internalMutation({
  args: {
    orderId: v.id("marketplaceOrders"),
    reason: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status === "fulfilled") return null;
    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "refunded",
      refundReason: args.reason,
      stripePaymentIntentId:
        args.stripePaymentIntentId ?? order.stripePaymentIntentId,
      updatedAt: now,
    });
    // Buy-to-own checkout reserves the listing — free it on refund so others
    // aren't blocked until the TTL sweep.
    if (order.sku === "buy_to_own") {
      const listing = await ctx.db.get(order.listingId);
      if (
        listing &&
        listing.status === "reserved" &&
        listing.reservedByUserId === order.userId
      ) {
        await ctx.db.patch(listing._id, {
          status: "available",
          reservedByUserId: undefined,
          reservedUntil: undefined,
          stripeCheckoutSessionId: undefined,
          updatedAt: now,
        });
      }
    }
    return null;
  },
});

export const getMyOrder = query({
  args: { orderId: v.id("marketplaceOrders") },
  returns: v.union(
    v.object({
      _id: v.id("marketplaceOrders"),
      listingId: v.id("marketplaceListings"),
      listingSlug: v.string(),
      listingName: v.string(),
      sku: v.union(v.literal("remix"), v.literal("buy_to_own")),
      status: v.string(),
      buyerMascotId: v.optional(v.id("mascots")),
      remixUnlockExpiresAt: v.optional(v.number()),
      remixConsumedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const order = await ctx.db.get(args.orderId);
    if (!order || order.userId !== user._id) return null;
    const listing = await ctx.db.get(order.listingId);
    return {
      _id: order._id,
      listingId: order.listingId,
      listingSlug: listing?.slug ?? "",
      listingName: listing?.name ?? "Mascot",
      sku: order.sku,
      status: order.status,
      buyerMascotId: order.buyerMascotId,
      remixUnlockExpiresAt: order.remixUnlockExpiresAt,
      remixConsumedAt: order.remixConsumedAt,
    };
  },
});

/** Active remix unlock for a listing (paid, unconsumed, unexpired). */
export const getActiveRemixUnlock = query({
  args: {
    listingId: v.id("marketplaceListings"),
    now: v.number(),
  },
  returns: v.union(
    v.object({
      orderId: v.id("marketplaceOrders"),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const orders = await ctx.db
      .query("marketplaceOrders")
      .withIndex("by_user_listing_sku", (q) =>
        q
          .eq("userId", user._id)
          .eq("listingId", args.listingId)
          .eq("sku", "remix")
      )
      .take(20);
    const mine = orders.find(
      (o) =>
        o.status === "fulfilled" &&
        !o.remixConsumedAt &&
        (o.remixUnlockExpiresAt ?? 0) > args.now
    );
    if (!mine?.remixUnlockExpiresAt) return null;
    return { orderId: mine._id, expiresAt: mine.remixUnlockExpiresAt };
  },
});

/**
 * Atomically claim a remix unlock and return the listing pack.
 * Server-only (`GENERATION_SERVER_SECRET`) — call before generation.
 */
export const claimRemixUnlock = mutation({
  args: {
    orderId: v.id("marketplaceOrders"),
    listingId: v.id("marketplaceListings"),
    serverSecret: v.optional(v.string()),
  },
  returns: v.object({
    name: v.string(),
    pack: validators.pack,
    sourceId: v.string(),
  }),
  handler: async (ctx, args) => {
    assertServerCaller(args.serverSecret);
    const user = await ensureCurrentUser(ctx);
    const now = Date.now();
    const order = await ctx.db.get(args.orderId);
    const listing = await ctx.db.get(args.listingId);
    if (!order || !listing) throw new Error("Remix unlock not found");
    if (order.userId !== user._id || order.listingId !== listing._id) {
      throw new Error("Remix unlock not found");
    }
    if (order.sku !== "remix" || order.status !== "fulfilled") {
      throw new Error("Invalid remix unlock");
    }
    if (order.remixConsumedAt) {
      throw new Error("Remix unlock already used");
    }
    if ((order.remixUnlockExpiresAt ?? 0) < now) {
      throw new Error("Remix unlock expired");
    }
    if (listing.status !== "available" && listing.status !== "reserved") {
      throw new Error("Listing is no longer available to remix");
    }
    await ctx.db.patch(order._id, {
      remixConsumedAt: now,
      updatedAt: now,
    });
    return {
      name: listing.name,
      pack: listing.pack,
      sourceId: listing._id,
    };
  },
});

/**
 * Restore a claimed unlock when generation fails after claim.
 * Server-only — never expose unconstrained restore to the browser.
 */
export const restoreRemixUnlock = mutation({
  args: {
    orderId: v.id("marketplaceOrders"),
    listingId: v.id("marketplaceListings"),
    serverSecret: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertServerCaller(args.serverSecret);
    const user = await ensureCurrentUser(ctx);
    const now = Date.now();
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    if (
      order.userId !== user._id ||
      order.listingId !== args.listingId ||
      order.sku !== "remix" ||
      order.status !== "fulfilled" ||
      !order.remixConsumedAt
    ) {
      return null;
    }
    if ((order.remixUnlockExpiresAt ?? 0) < now) {
      return null;
    }
    await ctx.db.patch(order._id, {
      remixConsumedAt: undefined,
      updatedAt: now,
    });
    return null;
  },
});

/** Owned-mascot pack for remix API. */
export const getOwnedRemixPack = query({
  args: { mascotId: v.id("mascots") },
  returns: v.union(
    v.object({
      name: v.string(),
      pack: validators.pack,
      sourceId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const mascot = await ctx.db.get(args.mascotId);
    if (!mascot || mascot.userId !== user._id) return null;
    return {
      name: mascot.name,
      pack: mascot.pack,
      sourceId: mascot._id,
    };
  },
});

export const sweepExpiredReservations = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    // Index range: only rows whose reservation TTL has elapsed.
    const reserved = await ctx.db
      .query("marketplaceListings")
      .withIndex("by_reserved_until", (q) =>
        q.eq("status", "reserved").lt("reservedUntil", now)
      )
      .take(100);

    let released = 0;
    for (const listing of reserved) {
      await ctx.db.patch(listing._id, {
        status: "available",
        reservedByUserId: undefined,
        reservedUntil: undefined,
        stripeCheckoutSessionId: undefined,
        updatedAt: now,
      });
      released += 1;

      if (listing.stripeCheckoutSessionId) {
        const order = await ctx.db
          .query("marketplaceOrders")
          .withIndex("by_session", (q) =>
            q.eq("stripeCheckoutSessionId", listing.stripeCheckoutSessionId)
          )
          .unique();
        if (order && order.status === "pending") {
          await ctx.db.patch(order._id, {
            status: "expired",
            refundReason: "reservation_expired",
            updatedAt: now,
          });
        }
      }
    }
    return released;
  },
});

export const pruneStripeEvents = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const old = await ctx.db
      .query("stripeEvents")
      .withIndex("by_processed", (q) => q.lt("processedAt", cutoff))
      .take(200);
    for (const row of old) {
      await ctx.db.delete(row._id);
    }
    return old.length;
  },
});

export const getUserIdByClerkInternal = internalQuery({
  args: { clerkId: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
    return user?._id ?? null;
  },
});

export const getOrderFulfillmentInternal = internalQuery({
  args: { orderId: v.id("marketplaceOrders") },
  returns: v.union(
    v.object({
      status: v.string(),
      buyerMascotId: v.optional(v.id("mascots")),
      listingSlug: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const listing = await ctx.db.get(order.listingId);
    return {
      status: order.status,
      buyerMascotId: order.buyerMascotId,
      listingSlug: listing?.slug,
    };
  },
});
