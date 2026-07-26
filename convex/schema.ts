import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

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
  }).index("by_user_created", ["userId", "createdAt"]),

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
    pack,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_updated", ["userId", "updatedAt"]),

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
