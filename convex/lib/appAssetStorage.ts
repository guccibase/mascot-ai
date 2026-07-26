import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type PackDoc = Doc<"mascotAppAssetPacks">;

function collectPackStorageIds(pack: PackDoc): Set<Id<"_storage">> {
  const ids = new Set<Id<"_storage">>();
  for (const sample of pack.sampleOptions) ids.add(sample.storageId);
  if (pack.masterStorageId) ids.add(pack.masterStorageId);
  for (const file of pack.files) ids.add(file.storageId);
  return ids;
}

/** True when any pack (optionally excluding one) still references the blob. */
export async function storageReferencedByPacks(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  exceptPackId?: Id<"mascotAppAssetPacks">
): Promise<boolean> {
  const owner = await ctx.db
    .query("appAssetUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
  if (!owner) return false;

  const packs = await ctx.db
    .query("mascotAppAssetPacks")
    .withIndex("by_user", (q) => q.eq("userId", owner.userId))
    .collect();

  for (const pack of packs) {
    if (exceptPackId && pack._id === exceptPackId) continue;
    if (collectPackStorageIds(pack).has(storageId)) return true;
  }
  return false;
}

export async function registerUploadForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">
): Promise<void> {
  const url = await ctx.storage.getUrl(storageId);
  if (!url) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Upload not found",
    });
  }

  const owned = await ctx.db
    .query("appAssetUploads")
    .withIndex("by_user_storage", (q) =>
      q.eq("userId", userId).eq("storageId", storageId)
    )
    .unique();
  if (owned) return;

  const global = await ctx.db
    .query("appAssetUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
  if (global && global.userId !== userId) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Storage blob is already registered to another account",
    });
  }

  await ctx.db.insert("appAssetUploads", {
    userId,
    storageId,
    createdAt: Date.now(),
  });
}

export async function assertOwnedStorageIds(
  ctx: MutationCtx,
  userId: Id<"users">,
  storageIds: Id<"_storage">[]
): Promise<void> {
  const unique = [...new Set(storageIds)];
  for (const storageId of unique) {
    const row = await ctx.db
      .query("appAssetUploads")
      .withIndex("by_user_storage", (q) =>
        q.eq("userId", userId).eq("storageId", storageId)
      )
      .unique();
    if (!row) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Storage blob is not registered for this account",
      });
    }
  }
}

/** Delete blob + registry row when safe (not referenced by other packs). */
export async function deleteOwnedStorage(
  ctx: MutationCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">,
  exceptPackId?: Id<"mascotAppAssetPacks">
): Promise<void> {
  const row = await ctx.db
    .query("appAssetUploads")
    .withIndex("by_user_storage", (q) =>
      q.eq("userId", userId).eq("storageId", storageId)
    )
    .unique();
  if (!row) return;

  if (await storageReferencedByPacks(ctx, storageId, exceptPackId)) {
    return;
  }

  await ctx.storage.delete(storageId);
  await ctx.db.delete(row._id);
}

export async function deletePackStorage(
  ctx: MutationCtx,
  userId: Id<"users">,
  pack: PackDoc,
  exceptPackId?: Id<"mascotAppAssetPacks">
): Promise<void> {
  const skipPack = exceptPackId ?? pack._id;
  for (const storageId of collectPackStorageIds(pack)) {
    await deleteOwnedStorage(ctx, userId, storageId, skipPack);
  }
}
