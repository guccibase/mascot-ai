import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

const REFERENCE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_BYTES = 2_000_000;

const mediaTypeValidator = v.union(
  v.literal("image/png"),
  v.literal("image/jpeg"),
  v.literal("image/webp")
);

const referenceMeta = v.object({
  referenceId: v.id("referenceAssets"),
  mediaType: mediaTypeValidator,
  width: v.number(),
  height: v.number(),
  bytes: v.number(),
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeReference = mutation({
  args: {
    storageId: v.id("_storage"),
    mediaType: mediaTypeValidator,
    width: v.number(),
    height: v.number(),
    bytes: v.number(),
  },
  returns: referenceMeta,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.bytes < 1 || args.bytes > MAX_BYTES) {
      throw new ConvexError({
        code: "INVALID_REFERENCE",
        message: "Reference image must be under 2 MB",
      });
    }
    if (args.width < 1 || args.height < 1 || args.width > 4096 || args.height > 4096) {
      throw new ConvexError({
        code: "INVALID_REFERENCE",
        message: "Reference image dimensions are out of range",
      });
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: "INVALID_REFERENCE",
        message: "Upload not found",
      });
    }

    const now = Date.now();
    const referenceId = await ctx.db.insert("referenceAssets", {
      userId: user._id,
      storageId: args.storageId,
      mediaType: args.mediaType,
      width: args.width,
      height: args.height,
      bytes: args.bytes,
      expiresAt: now + REFERENCE_TTL_MS,
      createdAt: now,
    });

    return {
      referenceId,
      mediaType: args.mediaType,
      width: args.width,
      height: args.height,
      bytes: args.bytes,
    };
  },
});

export const getReferenceUrl = query({
  args: { referenceId: v.id("referenceAssets") },
  returns: v.union(
    v.object({
      url: v.string(),
      mediaType: mediaTypeValidator,
      width: v.number(),
      height: v.number(),
      bytes: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ref = await ctx.db.get(args.referenceId);
    if (!ref || ref.userId !== user._id) return null;
    if (ref.expiresAt < Date.now()) return null;

    const url = await ctx.storage.getUrl(ref.storageId);
    if (!url) return null;

    return {
      url,
      mediaType: ref.mediaType,
      width: ref.width,
      height: ref.height,
      bytes: ref.bytes,
    };
  },
});

export const removeReference = mutation({
  args: { referenceId: v.id("referenceAssets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ref = await ctx.db.get(args.referenceId);
    if (!ref || ref.userId !== user._id) return null;

    await ctx.storage.delete(ref.storageId);
    await ctx.db.delete(args.referenceId);
    return null;
  },
});

/** Drop expired reference uploads and their storage blobs. */
export const purgeExpiredReferences = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db.query("referenceAssets").collect();
    let deleted = 0;

    for (const ref of expired) {
      if (ref.expiresAt >= now) continue;
      await ctx.storage.delete(ref.storageId);
      await ctx.db.delete(ref._id);
      deleted++;
    }

    if (deleted > 0) {
      console.warn(`[referenceAssets] purged ${deleted} expired upload(s)`);
    }
    return { deleted };
  },
});
