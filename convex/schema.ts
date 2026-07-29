import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { marketplaceCategoryValidator } from "./lib/marketplaceCategories";

const themeSwatch = v.object({
  name: v.string(),
  top: v.string(),
  mid: v.string(),
  base: v.string(),
  core: v.string(),
  stage: v.string(),
  features: v.optional(v.string()),
});

const instrument = v.object({
  label: v.string(),
  description: v.string(),
  lowLabel: v.string(),
  midLabel: v.string(),
  highLabel: v.string(),
  defaultValue: v.number(),
  ramp: v.array(v.string()),
  /** Studio ships no signal slider; the ramp still colours sparks/accents. */
  hidden: v.optional(v.boolean()),
});

const mascotPart = v.object({
  key: v.string(),
  label: v.string(),
  category: v.string(),
  description: v.optional(v.string()),
  essential: v.optional(v.boolean()),
});

const gesture = v.object({
  key: v.string(),
  label: v.string(),
  cat: v.string(),
  tip: v.string(),
  use: v.string(),
  svg: v.string(),
  track: v.optional(v.boolean()),
  delight: v.optional(v.boolean()),
  signal: v.optional(v.number()),
});

const pack = v.object({
  name: v.string(),
  tagline: v.string(),
  product: v.optional(v.string()),
  accent: v.string(),
  glowLabel: v.optional(v.string()),
  themes: v.record(v.string(), themeSwatch),
  instrument,
  gestures: v.array(gesture),
  parts: v.array(mascotPart),
});

/** Subscription state mirrored from RevenueCat webhooks. */
const entitlement = v.object({
  planId: v.string(),
  productId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("grace"),
    v.literal("expired")
  ),
  /** Access expiry in ms. Past this the plan allowance stops refilling. */
  expiresAt: v.number(),
  willRenew: v.boolean(),
  store: v.optional(v.string()),
  environment: v.optional(v.string()),
  /**
   * Store timestamp of the newest webhook applied to this entitlement. Older
   * events are dropped, so a retried EXPIRATION cannot undo a later RENEWAL.
   */
  lastEventAt: v.optional(v.number()),
  updatedAt: v.number(),
});

const onboarding = v.object({
  useCase: v.string(),
  /** Legacy field from the first onboarding; no longer collected. */
  goals: v.optional(v.array(v.string())),
  favoriteExample: v.optional(v.string()),
  stack: v.optional(v.string()),
  referral: v.optional(v.string()),
  paidBefore: v.optional(v.string()),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    onboardingCompletedAt: v.optional(v.number()),
    onboarding: v.optional(onboarding),
    entitlement: v.optional(entitlement),
    /** Plan allowance for the current cycle. Reset, never stacked, on refill. */
    subscriptionTokens: v.optional(v.number()),
    /** Purchased top-up tokens. Roll over and never expire. */
    topupTokens: v.optional(v.number()),
    /** When the plan allowance next refills. */
    tokenCycleEnd: v.optional(v.number()),
    /**
     * Sum of open deferred hold amounts (capacity earmarked, not yet charged).
     * Maintained by reserve/settle/expiry mutations so balance queries need no
     * clock for hold math (avoids client `now` skew hiding open holds).
     */
    openHoldTotal: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  /** Immutable audit trail for every balance change. */
  tokenLedger: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("grant"),
      v.literal("charge"),
      v.literal("refund"),
      v.literal("revoke"),
      /** Cost we absorbed because the balance could not cover an overrun. */
      v.literal("writeoff")
    ),
    bucket: v.union(v.literal("subscription"), v.literal("topup")),
    /** Signed: positive credits the balance, negative debits it. */
    amount: v.number(),
    balanceAfter: v.number(),
    reason: v.string(),
    model: v.optional(v.string()),
    eventId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_created", ["userId", "createdAt"])
    /** Idempotent settle / grant lookups by opaque event key. */
    .index("by_event", ["eventId"]),

  /**
   * Open holds taken before a generation runs, settled against real usage
   * afterwards. Ids are server-only secrets. Never return one to a browser
   * and never add a query that lists them.
   */
  tokenReservations: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    fromSubscription: v.number(),
    fromTopup: v.number(),
    action: v.string(),
    model: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    /**
     * When true, wallet balances are not reduced at reserve — settle debits
     * only on success (auth/capture). Missing/false = legacy debit-on-reserve.
     */
    deferred: v.optional(v.boolean()),
  })
    .index("by_user_expires", ["userId", "expiresAt"])
    // Lets the cron sweep every user's stale holds, not just the caller's.
    .index("by_expires", ["expiresAt"]),

  /** RevenueCat delivers at-least-once; this makes webhook handling idempotent. */
  billingEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    appUserId: v.string(),
    processedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    // Pruning key: rows are only useful for RevenueCat's retry window.
    .index("by_processed", ["processedAt"]),

  /** Session-scoped reference uploads for vision-guided generation. */
  referenceAssets: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    mediaType: v.union(
      v.literal("image/png"),
      v.literal("image/jpeg"),
      v.literal("image/webp")
    ),
    width: v.number(),
    height: v.number(),
    bytes: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  /** Ownership registry for app-asset blobs uploaded before pack assembly. */
  appAssetUploads: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }).index("by_user_storage", ["userId", "storageId"])
    .index("by_storage", ["storageId"])
    .index("by_created", ["createdAt"]),

  mascots: defineTable({
    userId: v.id("users"),
    name: v.string(),
    tagline: v.string(),
    look: v.optional(v.string()),
    productContext: v.optional(v.string()),
    personality: v.optional(v.string()),
    model: v.optional(v.string()),
    /** How this row entered the library. Omitted on legacy creates. */
    source: v.optional(
      v.union(
        v.literal("created"),
        v.literal("purchased"),
        v.literal("remixed")
      )
    ),
    sourceListingId: v.optional(v.id("marketplaceListings")),
    pack,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_updated", ["userId", "updatedAt"]),

  /**
   * Admin-curated mascots for sale. Canonical payload is always `pack`
   * (same shape as library mascots). Public browse may return the full pack
   * for interactive preview; export/save is gated in the client + mutations.
   */
  marketplaceListings: defineTable({
    slug: v.string(),
    name: v.string(),
    tagline: v.string(),
    description: v.string(),
    category: marketplaceCategoryValidator,
    status: v.union(
      v.literal("draft"),
      v.literal("available"),
      v.literal("reserved"),
      v.literal("sold"),
      v.literal("archived")
    ),
    pack,
    previewSvg: v.string(),
    /**
     * @deprecated Previews used to render a built-in studio component for
     * example listings, which showed themes and controls the pack a buyer
     * receives does not have. Everything now plays the stored pack. Kept so
     * listings written before that change still validate; `adminUpsert` clears
     * it on the next save.
     */
    exampleSlug: v.optional(
      v.union(
        v.literal("bud"),
        v.literal("lyra"),
        v.literal("sol"),
        v.literal("fanous"),
        v.literal("granary"),
        v.literal("byte"),
        v.literal("numi"),
        v.literal("lexa"),
        v.literal("coda"),
        v.literal("kelp"),
        v.literal("nori"),
        v.literal("hay"),
        v.literal("nox"),
        v.literal("zest"),
        v.literal("quill"),
        v.literal("pip"),
        v.literal("bolt"),
        v.literal("relay"),
        v.literal("orbit"),
        v.literal("brew"),
        v.literal("shade"),
        v.literal("watt"),
        v.literal("arc"),
        v.literal("aura"),
        v.literal("glint"),
        v.literal("trove"),
        v.literal("zephyr")
      )
    ),

    /** Fingerprint of gesture SVGs — used to block unpaid save of listed packs. */
    packFingerprint: v.string(),
    /** Lowercase blob for full-text search (name, category, pose labels, …). */
    searchText: v.string(),
    createdByAdminUserId: v.id("users"),
    reservedByUserId: v.optional(v.id("users")),
    reservedUntil: v.optional(v.number()),
    stripeCheckoutSessionId: v.optional(v.string()),
    soldToUserId: v.optional(v.id("users")),
    soldAt: v.optional(v.number()),
    buyerMascotId: v.optional(v.id("mascots")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status_updated", ["status", "updatedAt"])
    .index("by_category_status_updated", ["category", "status", "updatedAt"])
    .index("by_reserved_until", ["status", "reservedUntil"])
    .index("by_pack_fingerprint", ["packFingerprint"])
    .searchIndex("search_listings", {
      searchField: "searchText",
      filterFields: ["status", "category"],
    }),

  /** One Stripe Checkout attempt for a marketplace SKU. */
  marketplaceOrders: defineTable({
    userId: v.id("users"),
    listingId: v.id("marketplaceListings"),
    sku: v.union(v.literal("remix"), v.literal("buy_to_own")),
    amountCents: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("fulfilled"),
      v.literal("refunded"),
      v.literal("expired")
    ),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    remixUnlockExpiresAt: v.optional(v.number()),
    remixConsumedAt: v.optional(v.number()),
    buyerMascotId: v.optional(v.id("mascots")),
    refundReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["stripeCheckoutSessionId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_listing_sku", ["userId", "listingId", "sku"])
    .index("by_listing_sku_status", ["listingId", "sku", "status"])
    .index("by_status_created", ["status", "createdAt"]),

  /** Stripe webhook idempotency (mirrors billingEvents for RC). */
  stripeEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    /** Terminal outcome — only written after fulfill or successful refund. */
    outcome: v.union(
      v.literal("fulfilled"),
      v.literal("refunded"),
      v.literal("ignored")
    ),
    processedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_processed", ["processedAt"]),

  /** Generated app icon / favicon / PWA asset packs for a mascot. */
  mascotAppAssetPacks: defineTable({
    userId: v.id("users"),
    mascotId: v.id("mascots"),
    status: v.union(v.literal("samples"), v.literal("ready")),
    kinds: v.array(
      v.union(
        v.literal("app_icon"),
        v.literal("favicon"),
        v.literal("pwa"),
        v.literal("logo")
      )
    ),
    styleDescription: v.optional(v.string()),
    sampleOptions: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        storageId: v.id("_storage"),
      })
    ),
    selectedSampleId: v.optional(v.string()),
    masterStorageId: v.optional(v.id("_storage")),
    files: v.array(
      v.object({
        path: v.string(),
        label: v.string(),
        storageId: v.id("_storage"),
        bytes: v.number(),
        mediaType: v.union(
          v.literal("image/png"),
          v.literal("image/svg+xml"),
          v.literal("application/json"),
          v.literal("text/plain")
        ),
      })
    ),
    imageModel: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mascot_updated", ["mascotId", "updatedAt"])
    .index("by_user", ["userId"])
    .index("by_status_updated", ["status", "updatedAt"]),
});

export const validators = {
  pack,
  gesture,
  themeSwatch,
  instrument,
  mascotPart,
  entitlement,
  onboarding,
};
