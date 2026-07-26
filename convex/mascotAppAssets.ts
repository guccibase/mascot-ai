import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrNull, requireOwnedMascot } from "./lib/auth";
import {
  MAX_FILE_BYTES,
  MAX_IMAGE_MODEL_CHARS,
  MAX_PACK_FILES,
  MAX_PACKS_LIST,
  MAX_PACKS_PER_MASCOT,
  MAX_STYLE_CHARS,
  ORPHAN_UPLOAD_TTL_MS,
  SWEEP_BATCH,
  expectedPathsForKinds,
} from "./lib/appAssetPaths";
import {
  assertOwnedStorageIds,
  deleteOwnedStorage,
  deletePackStorage,
  registerUploadForUser,
  storageReferencedByPacks,
} from "./lib/appAssetStorage";

const assetKind = v.union(
  v.literal("app_icon"),
  v.literal("favicon"),
  v.literal("pwa"),
  v.literal("logo")
);

const mediaType = v.union(
  v.literal("image/png"),
  v.literal("image/svg+xml"),
  v.literal("application/json"),
  v.literal("text/plain")
);

const sampleOption = v.object({
  id: v.string(),
  label: v.string(),
  storageId: v.id("_storage"),
});

const assetFile = v.object({
  path: v.string(),
  label: v.string(),
  storageId: v.id("_storage"),
  bytes: v.number(),
  mediaType: mediaType,
});

const packSummary = v.object({
  _id: v.id("mascotAppAssetPacks"),
  _creationTime: v.number(),
  mascotId: v.id("mascots"),
  status: v.union(v.literal("samples"), v.literal("ready")),
  kinds: v.array(assetKind),
  styleDescription: v.optional(v.string()),
  sampleCount: v.number(),
  selectedSampleId: v.optional(v.string()),
  fileCount: v.number(),
  imageModel: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const packDetail = v.object({
  _id: v.id("mascotAppAssetPacks"),
  _creationTime: v.number(),
  mascotId: v.id("mascots"),
  status: v.union(v.literal("samples"), v.literal("ready")),
  kinds: v.array(assetKind),
  styleDescription: v.optional(v.string()),
  sampleOptions: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      url: v.string(),
    })
  ),
  selectedSampleId: v.optional(v.string()),
  masterUrl: v.optional(v.string()),
  files: v.array(
    v.object({
      path: v.string(),
      label: v.string(),
      url: v.string(),
      bytes: v.number(),
      mediaType: v.string(),
    })
  ),
  missingSampleCount: v.number(),
  missingFileCount: v.number(),
  imageModel: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const SAMPLE_IDS = new Set(["a", "b", "c"]);

function collectOldStorageIds(row: {
  sampleOptions: Array<{ storageId: Id<"_storage"> }>;
  masterStorageId?: Id<"_storage">;
  files: Array<{ storageId: Id<"_storage"> }>;
}): Set<Id<"_storage">> {
  const ids = new Set<Id<"_storage">>();
  for (const s of row.sampleOptions) ids.add(s.storageId);
  if (row.masterStorageId) ids.add(row.masterStorageId);
  for (const f of row.files) ids.add(f.storageId);
  return ids;
}

function validateSamples(samples: Array<{ id: string; storageId: string }>) {
  const ids = new Set<string>();
  const storageIds = new Set<string>();
  for (const sample of samples) {
    if (!SAMPLE_IDS.has(sample.id) || ids.has(sample.id)) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Sample ids must be unique a, b, c",
      });
    }
    if (storageIds.has(sample.storageId)) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Each sample must use a distinct storage blob",
      });
    }
    ids.add(sample.id);
    storageIds.add(sample.storageId);
  }
}

function validateKinds(kinds: string[]) {
  if (kinds.length < 1 || kinds.length > 4) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Select 1 to 4 asset types",
    });
  }
  if (new Set(kinds).size !== kinds.length) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Duplicate asset kinds",
    });
  }
}

function validatePackFiles(
  kinds: readonly string[],
  files: Array<{ path: string; bytes: number; mediaType: string; storageId: string }>
) {
  if (files.length < 1 || files.length > MAX_PACK_FILES) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Invalid file count for asset pack",
    });
  }

  const allowed = expectedPathsForKinds(kinds);
  const provided = new Set(files.map((f) => f.path));
  if (provided.size !== allowed.size || ![...allowed].every((p) => provided.has(p))) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Pack must include every file for the selected kinds",
    });
  }

  const seenPaths = new Set<string>();
  const seenStorage = new Set<string>();

  for (const file of files) {
    if (!allowed.has(file.path) || seenPaths.has(file.path)) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: `Unexpected asset path: ${file.path}`,
      });
    }
    if (file.bytes < 0 || file.bytes > MAX_FILE_BYTES) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "File size out of range",
      });
    }
    if (seenStorage.has(file.storageId)) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Duplicate storage id in pack files",
      });
    }
    seenPaths.add(file.path);
    seenStorage.add(file.storageId);
  }
}

function validateMasterStorage(
  masterStorageId: string,
  files: Array<{ storageId: string }>
) {
  if (files.some((f) => f.storageId === masterStorageId)) {
    throw new ConvexError({
      code: "INVALID_ASSETS",
      message: "Master icon must not duplicate a pack file blob",
    });
  }
}

export const registerUpload = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await registerUploadForUser(ctx, user._id, args.storageId);
    return null;
  },
});

export const listForMascot = query({
  args: { mascotId: v.id("mascots") },
  returns: v.array(packSummary),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const mascot = await ctx.db.get("mascots", args.mascotId);
    if (!mascot || mascot.userId !== user._id) return [];

    const rows = await ctx.db
      .query("mascotAppAssetPacks")
      .withIndex("by_mascot_updated", (q) => q.eq("mascotId", args.mascotId))
      .order("desc")
      .take(MAX_PACKS_LIST);

    return rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      mascotId: row.mascotId,
      status: row.status,
      kinds: row.kinds,
      styleDescription: row.styleDescription,
      sampleCount: row.sampleOptions.length,
      selectedSampleId: row.selectedSampleId,
      fileCount: row.files.length,
      imageModel: row.imageModel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },
});

export const getPack = query({
  args: { packId: v.id("mascotAppAssetPacks") },
  returns: v.union(packDetail, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    const row = await ctx.db.get("mascotAppAssetPacks", args.packId);
    if (!row || row.userId !== user._id) return null;

    let missingSampleCount = 0;
    const sampleOptions: Array<{ id: string; label: string; url: string }> = [];
    for (const s of row.sampleOptions) {
      const url = await ctx.storage.getUrl(s.storageId);
      if (url) sampleOptions.push({ id: s.id, label: s.label, url });
      else missingSampleCount++;
    }

    let missingFileCount = 0;
    const files: Array<{
      path: string;
      label: string;
      url: string;
      bytes: number;
      mediaType: string;
    }> = [];
    for (const f of row.files) {
      const url = await ctx.storage.getUrl(f.storageId);
      if (url) {
        files.push({
          path: f.path,
          label: f.label,
          url,
          bytes: f.bytes,
          mediaType: f.mediaType,
        });
      } else {
        missingFileCount++;
      }
    }

    let masterUrl: string | undefined;
    if (row.masterStorageId) {
      masterUrl = (await ctx.storage.getUrl(row.masterStorageId)) ?? undefined;
    }

    return {
      _id: row._id,
      _creationTime: row._creationTime,
      mascotId: row.mascotId,
      status: row.status,
      kinds: row.kinds,
      styleDescription: row.styleDescription,
      sampleOptions,
      selectedSampleId: row.selectedSampleId,
      masterUrl,
      files,
      missingSampleCount,
      missingFileCount,
      imageModel: row.imageModel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
});

export const saveSamples = mutation({
  args: {
    mascotId: v.id("mascots"),
    kinds: v.array(assetKind),
    styleDescription: v.optional(v.string()),
    imageModel: v.string(),
    samples: v.array(sampleOption),
    packId: v.optional(v.id("mascotAppAssetPacks")),
  },
  returns: v.id("mascotAppAssetPacks"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { mascot } = await requireOwnedMascot(ctx, args.mascotId);

    validateKinds(args.kinds);
    if (args.samples.length < 1 || args.samples.length > 3) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Expected 1–3 sample icons",
      });
    }
    validateSamples(args.samples);

    if (args.styleDescription && args.styleDescription.length > MAX_STYLE_CHARS) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Style description is too long",
      });
    }
    if (args.imageModel.length > MAX_IMAGE_MODEL_CHARS) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Image model name is too long",
      });
    }

    await assertOwnedStorageIds(
      ctx,
      user._id,
      args.samples.map((s) => s.storageId)
    );

    const now = Date.now();

    if (args.packId) {
      const existing = await ctx.db.get("mascotAppAssetPacks", args.packId);
      if (!existing || existing.userId !== user._id || existing.mascotId !== args.mascotId) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Asset pack not found" });
      }

      const oldStorage = collectOldStorageIds(existing);
      const newStorage = new Set(args.samples.map((s) => s.storageId));

      await ctx.db.patch(args.packId, {
        status: "samples",
        kinds: args.kinds,
        styleDescription: args.styleDescription,
        sampleOptions: args.samples,
        selectedSampleId: undefined,
        masterStorageId: undefined,
        files: [],
        imageModel: args.imageModel,
        updatedAt: now,
      });

      for (const storageId of oldStorage) {
        if (!newStorage.has(storageId)) {
          await deleteOwnedStorage(ctx, user._id, storageId);
        }
      }
      return args.packId;
    }

    const existingPacks = await ctx.db
      .query("mascotAppAssetPacks")
      .withIndex("by_mascot_updated", (q) => q.eq("mascotId", args.mascotId))
      .collect();
    if (existingPacks.length >= MAX_PACKS_PER_MASCOT) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: `Maximum ${MAX_PACKS_PER_MASCOT} asset packs per mascot`,
      });
    }

    return await ctx.db.insert("mascotAppAssetPacks", {
      userId: mascot.userId,
      mascotId: args.mascotId,
      status: "samples",
      kinds: args.kinds,
      styleDescription: args.styleDescription,
      sampleOptions: args.samples,
      selectedSampleId: undefined,
      masterStorageId: undefined,
      files: [],
      imageModel: args.imageModel,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const savePack = mutation({
  args: {
    packId: v.id("mascotAppAssetPacks"),
    selectedSampleId: v.string(),
    masterStorageId: v.id("_storage"),
    files: v.array(assetFile),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const row = await ctx.db.get("mascotAppAssetPacks", args.packId);
    if (!row || row.userId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Asset pack not found" });
    }

    const sample = row.sampleOptions.find((s) => s.id === args.selectedSampleId);
    if (!sample) {
      throw new ConvexError({
        code: "INVALID_ASSETS",
        message: "Selected sample not found",
      });
    }

    validatePackFiles(row.kinds, args.files);
    validateMasterStorage(args.masterStorageId, args.files);

    const storageIds = [
      args.masterStorageId,
      ...args.files.map((f) => f.storageId),
    ];
    await assertOwnedStorageIds(ctx, user._id, storageIds);

    const oldStorage = collectOldStorageIds(row);
    const newStorage = new Set(storageIds);

    const keptSample = row.sampleOptions.find((s) => s.id === args.selectedSampleId)!;
    const now = Date.now();

    await ctx.db.patch(args.packId, {
      status: "ready",
      selectedSampleId: args.selectedSampleId,
      masterStorageId: args.masterStorageId,
      sampleOptions: [keptSample],
      files: args.files,
      updatedAt: now,
    });

    for (const storageId of oldStorage) {
      if (!newStorage.has(storageId)) {
        await deleteOwnedStorage(ctx, user._id, storageId);
      }
    }
    return null;
  },
});

export const removePack = mutation({
  args: { packId: v.id("mascotAppAssetPacks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const row = await ctx.db.get("mascotAppAssetPacks", args.packId);
    if (!row || row.userId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Asset pack not found" });
    }

    await deletePackStorage(ctx, user._id, row);
    await ctx.db.delete(args.packId);
    return null;
  },
});

/** Delete all asset packs (and blobs) when a mascot is removed. */
export const purgeForMascot = internalMutation({
  args: { mascotId: v.id("mascots"), userId: v.id("users") },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const packs = await ctx.db
      .query("mascotAppAssetPacks")
      .withIndex("by_mascot_updated", (q) => q.eq("mascotId", args.mascotId))
      .collect();

    let deleted = 0;
    for (const pack of packs) {
      if (pack.userId !== args.userId) continue;
      await deletePackStorage(ctx, args.userId, pack);
      await ctx.db.delete(pack._id);
      deleted++;
    }
    return { deleted };
  },
});

const STALE_SAMPLES_MS = 30 * 24 * 60 * 60 * 1000;

/** Drop abandoned sample-only packs and their storage. */
export const purgeStaleSamplePacks = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - STALE_SAMPLES_MS;
    const rows = await ctx.db
      .query("mascotAppAssetPacks")
      .withIndex("by_status_updated", (q) =>
        q.eq("status", "samples").lt("updatedAt", cutoff)
      )
      .take(SWEEP_BATCH);

    let deleted = 0;
    for (const row of rows) {
      await deletePackStorage(ctx, row.userId, row);
      await ctx.db.delete(row._id);
      deleted++;
    }
    if (deleted > 0) {
      console.warn(`[mascotAppAssets] purged ${deleted} stale sample pack(s)`);
    }
    return { deleted };
  },
});

/** Remove upload registry rows (and blobs) never attached to a pack. */
export const purgeOrphanUploads = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_UPLOAD_TTL_MS;
    const rows = await ctx.db
      .query("appAssetUploads")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .take(SWEEP_BATCH);

    let deleted = 0;
    for (const row of rows) {
      if (await storageReferencedByPacks(ctx, row.storageId)) continue;
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
      deleted++;
    }
    if (deleted > 0) {
      console.warn(`[mascotAppAssets] purged ${deleted} orphan upload(s)`);
    }
    return { deleted };
  },
});
