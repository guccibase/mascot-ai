# App Assets Reliability, Pricing & Related Fixes — Design

**Date:** 2026-07-26  
**Status:** Approved in conversation; awaiting spec review before implementation plan  
**Scope:** App asset panel UX + token pricing, samples 504 fix, RevenueCat `expiresAtMs` null, refine error hygiene

## Problem

1. **UX mismatch:** Panel CTA says “Generate 3 icons” while checkboxes imply a full pack. Flow is two-step (AI previews → resize/export), but copy and estimates hide that.
2. **Token estimates:** Pack quote is a flat `450` tokens and does not change when kinds are toggled. Image sample pricing uses an understated `$0.07` COGS × ad-hoc `1.35`/`1.55` multipliers — inconsistent with real `gpt-image-2` edit costs and with the business need for ≥50% gross margin on image spend.
3. **Samples failure:** `/api/generate/app-assets/samples` runs **three sequential** OpenAI image edits inside one request (`maxDuration = 120`). That overruns → **504** → client catch shows “Network error while generating icons.”
4. **RevenueCat:** Webhook passes `expiration_at_ms: null` into `expiresAtMs: v.optional(v.number())`. Convex rejects `null` (optional ≠ nullable) → 500 on `applyRevenueCatEvent`.
5. **Refine:** Concurrent `500`s on `/api/generate/refine`; harden error handling and settle path. Console noise (Stripe payment manifest, extension message-channel) is out of scope.

## Goals

- Accurate, profitable token pricing for app assets (≥50% gross margin on image COGS; pack fee scales with selected output files).
- Clear two-step UX: previews vs pack, estimates and CTAs match selections.
- Reliable preview generation (no routine 504).
- **Very high quality and accuracy** for AI masters and all derived sizes (favicon, PWA, logo, store icons).
- RevenueCat webhooks accept null expiry.
- Refine returns actionable errors without settling bugs.

## Quality & accuracy bar

### AI icon previews (master)

- Use the highest practical Image API quality for the production path (`quality: "high"` on **both** generate and **edit**/reference flows — edit currently omits this and must be fixed).
- Preserve mascot identity: reference PNG from idle SVG at high density; prompts require store-ready composition, crisp silhouette, readable at small sizes.
- Bill COGS for the **same** quality tier actually requested (high edit + reference), not a cheaper tier — pricing accuracy tracks quality.

### Derived assets (favicon, PWA, logo, platform icons)

- Still **resize/export from the chosen high-quality master** (no extra AI). Quality comes from a sharp master + careful resampling.
- Use Sharp with high-quality downscale defaults; keep correct platform rules (opaque iOS/Play icons, PWA maskable safe zone, transparent logos, exact catalog sizes).
- Output dimensions and paths must match catalog / store specs exactly (no wrong sizes or missing required files for selected kinds).
- Spot-check: 16/32 favicons remain recognizable; 1024 marketing icon and 512 PWA stay crisp.

## Non-goals

- Changing plan catalog / `USD_PER_TOKEN` economics.
- Regenerating icons per pack kind (kinds only select resize/export targets from one master).
- Fixing Stripe payment-manifest or browser-extension console noise.
- Large refactors outside app-assets, billing webhook null-coercion, and refine error path.

## Pricing model

### Billing unit (unchanged)

`1` billing token = `USD_PER_TOKEN` (`$0.00001`) of provider spend, as in `convex/lib/plans.ts`. LLM mascot actions remain 1:1 COGS→tokens; plan-level margins stay as tested.

### Image previews (app asset samples)

- Pin a **conservative** per-image USD COGS for the production path: **reference edit**, ~1024×1024, high-quality `gpt-image-2` (include text + image input + image output). Constant name e.g. `IMAGE_EDIT_USD_PER_IMAGE`, documented with source/date comment. Replace understated `IMAGE_GEN_USD_PER_IMAGE = 0.07` for this path (keep or alias carefully so other callers stay correct).
- **Gross margin ≥50% on image spend:**

  ```
  billing_tokens = ceil((cogs_usd / USD_PER_TOKEN) * 2)
  ```

  So `(S − C) / S = 0.5`. Apply to both `typical` and `max` (max may use a slightly higher COGS ceiling for reservation headroom, still ≥2× that ceiling’s COGS).
- Samples always bill for **3** images (product choice). Kind selection does not change sample image count.
- Reservations and settle continue through existing `openMeter` / `estimateTokens` / `recordFallback` so UI quote ≡ server reserve.

### Pack export (resize + upload)

- No LLM COGS. Charge an **infra fee** that scales with selected kinds → output file count (use the same path set the pack builder emits, including manifest extras such as `site.webmanifest` / `Contents.json` when those kinds are selected):
  - Estimate infra COGS in USD: `baseUsd + perFileUsd * fileCount`, then  
    `billing_tokens = ceil((cogs_usd / USD_PER_TOKEN) * 2)` (same 50% margin).
  - Constants chosen so pack fees stay small vs image previews but **visible** when toggling kinds.
- `estimateTokens({ kind: "appAssetPack", fileCount })` must accept selection-derived count; UI and pack route must pass the same count used for quoting.

### UI estimate panel

| Line | Behavior |
|------|----------|
| 3 icon previews | Fixed quote for 3× image edit @ 2× COGS |
| Full asset pack | Scales with current kind → file count |
| Typical total | Sum |

CTA labels:

- Before samples: “Generate 3 icon previews”
- After samples exist: “New preview set” / “Regenerate”
- Pack button: “Build pack · N files” (N from current kinds)

## Reliability — samples route

- Generate three variants **concurrently** (`Promise.all`), not sequential `for`. Prefer three parallel edit calls with distinct prompts (keeps variation). Optional later: single `n: 3` if prompts can share.
- Ensure `maxDuration` covers p95 parallel wall time (raise if needed; Node runtime).
- Client: if response is non-JSON / 504 / network abort, toast a specific timeout/server message, not only “Network error.”
- Meter: `settle()` only in `finally` (idempotent); remove redundant settle-in-try if it duplicates.

## RevenueCat

In `convex/http.ts` (and any twin call sites), coerce before mutation:

```ts
expiresAtMs: event.expiration_at_ms ?? undefined
```

(or equivalent: omit field when null). Do not widen validators to `v.null()` unless needed elsewhere. Existing `resolveSubscriptionExpiry` already handles missing/0 expiry.

## Refine

- Keep settle in `finally` only; ensure catch returns clear `error` strings.
- Do not expand refine product behavior. If a known throw (parse/sanitize) can be mapped to 4xx/502 with a stable message, do that; otherwise leave provider failures as 500 with logged message.

## Files likely touched

| Area | Files |
|------|--------|
| Pricing | `src/lib/token-pricing.ts`, `src/lib/__tests__/token-pricing.test.ts`, `src/lib/__tests__/app-assets.test.ts` |
| UI | `src/components/app-assets-panel.tsx` |
| Samples API | `src/app/api/generate/app-assets/samples/route.ts`, `src/lib/openai-image.ts` (if batch helper) |
| Pack API | `src/app/api/generate/app-assets/pack/route.ts` (pass fileCount into meter if required) |
| Billing | `convex/http.ts` |
| Refine | `src/app/api/generate/refine/route.ts` (minimal) |

## Testing

- Unit: image token estimate = `2 * cogs / USD_PER_TOKEN` (ceil); pack estimate increases when `fileCount` increases; ≥50% margin identity `(2C − C) / 2C = 0.5`.
- Unit: catalog / path allowlist unchanged unless pack fee uses `filesForKinds`.
- Unit/integration: RevenueCat coercion — null expiry does not throw ArgumentValidationError (mutation args).
- Manual: generate 3 previews completes without 504; toggling kinds updates pack line; pack build still works.

## Edge cases

- At least one kind required (existing); pack quote with 1 kind vs all four.
- Insufficient tokens: affordability check uses **samples** typical before preview gen; pack check uses pack typical at build time.
- Partial parallel failure: fail the request; bill only completed image calls via existing meter records.
- Regenerate with existing `packId`: preserve current behavior.
- Mascot without idle SVG: keep 400.

## Success criteria

- [ ] Preview generation succeeds under normal load without 504.
- [ ] Estimate panel and CTAs reflect two-step flow and kind selection.
- [ ] Image billing uses documented **high-quality** COGS × 2; pack fee scales with file count × 2 margin.
- [ ] Edit path requests `quality: "high"`; derived favicon/PWA/logo/store sizes match catalog specs.
- [ ] RevenueCat webhook no longer 500s on `expiresAtMs: null`.
- [ ] Refine settle/error path cleaned; no unrelated feature changes.
- [ ] Existing mascot LLM pricing and plan margin tests still pass.
