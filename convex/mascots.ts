import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
  ensureCurrentUser,
  getCurrentUserOrNull,
  requireOwnedMascot,
} from "./lib/auth";
import { validators } from "./schema";

/** Soft cap under Convex's 1MB document limit (SVG packs get large). */
const MAX_PACK_JSON_BYTES = 900_000;

const listItem = v.object({
  _id: v.id("mascots"),
  _creationTime: v.number(),
  name: v.string(),
  tagline: v.string(),
  model: v.optional(v.string()),
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
        const idle =
          m.pack.gestures.find((g) => g.key === "idle") ?? m.pack.gestures[0]!;
        return {
          _id: m._id,
          _creationTime: m._creationTime,
          name: m.name,
          tagline: m.tagline,
          model: m.model,
          gestureCount: m.pack.gestures.length,
          accent: m.pack.accent,
          previewSvg: idle.svg,
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
      pack: mascot.pack,
      createdAt: mascot.createdAt,
      updatedAt: mascot.updatedAt,
    };
  },
});

function assertPack(pack: {
  gestures: unknown[];
  instrument: { ramp: string[] };
}) {
  if (pack.gestures.length < 1 || pack.gestures.length > 12) {
    throw new Error("Mascot must have 1 to 12 gestures");
  }
  if (pack.instrument.ramp.length !== 5) {
    throw new Error("Instrument ramp must have exactly 5 colors");
  }
  const bytes = JSON.stringify(pack).length;
  if (bytes > MAX_PACK_JSON_BYTES) {
    throw new Error(
      "Mascot pack is too large to save. Remove a gesture or simplify SVGs."
    );
  }
}

export const save = mutation({
  args: {
    mascotId: v.optional(v.id("mascots")),
    look: v.optional(v.string()),
    productContext: v.optional(v.string()),
    personality: v.optional(v.string()),
    model: v.optional(v.string()),
    pack: validators.pack,
  },
  returns: v.id("mascots"),
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);
    const now = Date.now();
    assertPack(args.pack);

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
