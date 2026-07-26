import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function getIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED" });
  }
  return identity;
}

async function resolveUserByToken(
  ctx: Ctx,
  tokenIdentifier: string
): Promise<Doc<"users"> | null> {
  const matches = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .take(2);
  if (matches.length > 1) {
    // Two rows for one identity means a balance can flip between them
    // depending on insertion order. `ensureCurrentUser` dedups by Clerk id;
    // surface it here so the race is visible if that ever stops working.
    console.error(
      `[auth] duplicate users rows for tokenIdentifier ${tokenIdentifier}`
    );
  }
  return matches[0] ?? null;
}

async function resolveUserByClerk(
  ctx: MutationCtx,
  clerkId: string
): Promise<Doc<"users"> | null> {
  const matches = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
    .take(2);
  if (matches.length === 0) return null;

  const preferred =
    matches.find((u) => !u.tokenIdentifier.startsWith("pending:")) ??
    matches[0]!;

  // Deduplicate rare webhook/ensure races
  for (const dup of matches) {
    if (dup._id !== preferred._id) {
      await ctx.db.delete(dup._id);
    }
  }
  return preferred;
}

export async function getCurrentUserOrNull(
  ctx: Ctx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await resolveUserByToken(ctx, identity.tokenIdentifier);
}

export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUserOrNull(ctx);
  // A structured code so callers can tell "sign in again" apart from a
  // transient backend failure and stop presenting one as the other.
  if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });
  return user;
}

/** Ensure a Convex users row exists for the authenticated Clerk identity. */
export async function ensureCurrentUser(
  ctx: MutationCtx
): Promise<Doc<"users">> {
  const identity = await getIdentity(ctx);
  const now = Date.now();
  const clerkId = identity.subject;
  const email = identity.email ?? "";
  const name =
    identity.name ??
    identity.nickname ??
    (email ? email.split("@")[0]! : "Creator");
  const imageUrl = identity.pictureUrl ?? undefined;

  const byToken = await resolveUserByToken(ctx, identity.tokenIdentifier);
  if (byToken) {
    await ctx.db.patch(byToken._id, {
      clerkId,
      email: email || byToken.email,
      name: name || byToken.name,
      imageUrl: imageUrl ?? byToken.imageUrl,
      updatedAt: now,
    });
    const refreshed = await ctx.db.get(byToken._id);
    if (!refreshed) throw new Error("User missing after patch");
    return refreshed;
  }

  // Webhook may have created the row with a pending tokenIdentifier
  const byClerk = await resolveUserByClerk(ctx, clerkId);
  if (byClerk) {
    await ctx.db.patch(byClerk._id, {
      tokenIdentifier: identity.tokenIdentifier,
      email: email || byClerk.email,
      name: name || byClerk.name,
      imageUrl: imageUrl ?? byClerk.imageUrl,
      updatedAt: now,
    });
    const refreshed = await ctx.db.get(byClerk._id);
    if (!refreshed) throw new Error("User missing after patch");
    return refreshed;
  }

  const id = await ctx.db.insert("users", {
    clerkId,
    tokenIdentifier: identity.tokenIdentifier,
    email,
    name,
    imageUrl,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("User missing after insert");
  return created;
}

export async function requireOwnedMascot(
  ctx: Ctx,
  mascotId: Id<"mascots">
): Promise<{ user: Doc<"users">; mascot: Doc<"mascots"> }> {
  const user = await getCurrentUser(ctx);
  const mascot = await ctx.db.get(mascotId);
  if (!mascot) throw new Error("Mascot not found");
  if (mascot.userId !== user._id) throw new Error("Unauthorized");
  return { user, mascot };
}
