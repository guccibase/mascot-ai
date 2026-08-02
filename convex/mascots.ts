import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  ensureCurrentUser,
  getCurrentUserOrNull,
  requireOwnedMascot,
} from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  assertPack,
  packFingerprint,
  previewSvgForCard,
} from "./lib/marketplace";
import { validators } from "./schema";

/** Reject unpaid copies of live marketplace packs (insert + update). */
async function assertPackNotMarketplaceLocked(
  ctx: MutationCtx,
  userId: Id<"users">,
  pack: Doc<"mascots">["pack"]
): Promise<void> {
  const fingerprint = packFingerprint(pack);
  const listed = await ctx.db
    .query("marketplaceListings")
    .withIndex("by_pack_fingerprint", (q) =>
      q.eq("packFingerprint", fingerprint)
    )
    .take(5);
  for (const listing of listed) {
    if (listing.status === "draft" || listing.status === "archived") continue;
    if (listing.status === "sold" && listing.soldToUserId === userId) {
      continue;
    }
    throw new Error(
      "This mascot is listed on the marketplace. Remix or buy to own before saving it to your library."
    );
  }
}

const mascotSource = v.optional(
  v.union(
    v.literal("created"),
    v.literal("purchased"),
    v.literal("remixed")
  )
);

const listItem = v.object({
  _id: v.id("mascots"),
  _creationTime: v.number(),
  name: v.string(),
  tagline: v.string(),
  model: v.optional(v.string()),
  source: mascotSource,
  gestureCount: v.number(),
  accent: v.string(),
  previewSvg: v.string(),
  updatedAt: v.number(),
  createdAt: v.number(),
});

const emptyPage = {
  page: [],
  isDone: true,
  continueCursor: "",
  splitCursor: null,
  pageStatus: null,
};

export const listMine = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(listItem),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return emptyPage;

    const result = await ctx.db
      .query("mascots")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((m) => {
        return {
          _id: m._id,
          _creationTime: m._creationTime,
          name: m.name,
          tagline: m.tagline,
          model: m.model,
          source: m.source,
          gestureCount: m.pack.gestures.length,
          accent: m.pack.accent,
          previewSvg: previewSvgForCard(m.pack),
          updatedAt: m.updatedAt,
          createdAt: m.createdAt,
        };
      }),
    };
  },
});

export const getMine = query({
  args: { mascotId: v.id("mascots") },
  returns: v.union(
    v.object({
      _id: v.id("mascots"),
      name: v.string(),
      tagline: v.string(),
      look: v.optional(v.string()),
      productContext: v.optional(v.string()),
      personality: v.optional(v.string()),
      model: v.optional(v.string()),
      source: mascotSource,
      pack: validators.pack,
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const mascot = await ctx.db.get(args.mascotId);
    if (!mascot || mascot.userId !== user._id) return null;
    return {
      _id: mascot._id,
      name: mascot.name,
      tagline: mascot.tagline,
      look: mascot.look,
      productContext: mascot.productContext,
      personality: mascot.personality,
      model: mascot.model,
      source: mascot.source,
      pack: mascot.pack,
      createdAt: mascot.createdAt,
      updatedAt: mascot.updatedAt,
    };
  },
});

export const save = mutation({
  args: {
    mascotId: v.optional(v.id("mascots")),
    look: v.optional(v.string()),
    productContext: v.optional(v.string()),
    personality: v.optional(v.string()),
    model: v.optional(v.string()),
    pack: validators.pack,
    source: mascotSource,
    sourceListingId: v.optional(v.id("marketplaceListings")),
    /** Library remix provenance — validated on insert, not stored. */
    sourceMascotId: v.optional(v.id("mascots")),
  },
  returns: v.id("mascots"),
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const now = Date.now();
    assertPack(args.pack);

    // Clients must not self-attest a purchase; fulfill writes those rows.
    if (args.source === "purchased") {
      throw new Error("Purchased mascots are granted by checkout only");
    }

    // Remixed badge requires a real source (listing or owned library mascot).
    if (args.source === "remixed" && !args.mascotId) {
      if (args.sourceListingId) {
        const listing = await ctx.db.get(args.sourceListingId);
        if (!listing) {
          throw new Error("Invalid remix source listing");
        }
      } else if (args.sourceMascotId) {
        await requireOwnedMascot(ctx, args.sourceMascotId);
      } else {
        throw new Error("Remix source required");
      }
    }

    // Block unpaid saves/overwrites of marketplace packs (preview returns full pack).
    await assertPackNotMarketplaceLocked(ctx, user._id, args.pack);

    if (args.mascotId) {
      const { mascot } = await requireOwnedMascot(ctx, args.mascotId);
      await ctx.db.patch(mascot._id, {
        name: args.pack.name,
        tagline: args.pack.tagline,
        look: args.look ?? mascot.look,
        productContext: args.productContext ?? mascot.productContext,
        personality: args.personality ?? mascot.personality,
        model: args.model ?? mascot.model,
        pack: args.pack,
        updatedAt: now,
      });
      return mascot._id;
    }

    return await ctx.db.insert("mascots", {
      userId: user._id,
      name: args.pack.name,
      tagline: args.pack.tagline,
      look: args.look,
      productContext: args.productContext,
      personality: args.personality,
      model: args.model,
      source: args.source ?? "created",
      sourceListingId: args.sourceListingId,
      pack: args.pack,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { mascotId: v.id("mascots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireOwnedMascot(ctx, args.mascotId);
    await ctx.runMutation(internal.mascotAppAssets.purgeForMascot, {
      mascotId: args.mascotId,
      userId: user._id,
    });
    await ctx.db.delete("mascots", args.mascotId);
    return null;
  },
});
