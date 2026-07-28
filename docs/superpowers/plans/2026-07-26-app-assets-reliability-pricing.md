# App Assets Reliability & Pricing — Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Fix app-asset 504s, price previews/pack with accurate COGS and 50% gross margin, clarify UX, coerce RevenueCat null expiry, harden refine settle.

**Architecture:** Shared `estimateTokens` remains the single quote/reserve path. Image edits bill `ceil((cogsUsd/USD_PER_TOKEN)*2)`. Pack bills the same formula on infra USD scaled by `packOutputFileCount`. Samples generate three edits in parallel with `quality: "high"`.

**Tech Stack:** Next.js route handlers, Sharp, OpenAI Images API, Convex HTTP webhook, Vitest.

## Global Constraints

- Touch only app-assets pricing/UI/API, `openai-image.ts`, RevenueCat coerce in `convex/http.ts`, refine settle hygiene.
- Do not change plan catalog / LLM 1:1 billing.
- Favicon/PWA/logo remain resize-from-master (no extra AI).
- Lean diffs; no drive-by refactors.

---

### Task 1: Pricing + pack file count

**Files:** `src/lib/token-pricing.ts`, `src/lib/app-assets/catalog.ts`, tests

- [ ] `packOutputFileCount(kinds)` mirroring pack-builder extras + README
- [ ] `IMAGE_EDIT_USD_PER_IMAGE` (~0.22) / `_MAX` (~0.28); `MARGIN_MULTIPLIER = 2`
- [ ] `estimateImageEditTokens`; wire `appAssetSamples` / `appAssetPack` with `fileCount`
- [ ] Update unit tests for 50% margin and fileCount scaling

### Task 2: High-quality parallel samples

**Files:** `src/lib/openai-image.ts`, `src/app/api/generate/app-assets/samples/route.ts`, pack route

- [ ] Pass `quality: "high"` on images.edit
- [ ] Parallel `Promise.all` for 3 variants; settle only in `finally`
- [ ] Raise `maxDuration` if needed (e.g. 300)
- [ ] Pack route: `openMeter({ kind: "appAssetPack", fileCount })`

### Task 3: Panel UX

**Files:** `src/components/app-assets-panel.tsx`

- [ ] Estimates use fileCount from kinds; CTAs per spec
- [ ] Better timeout/non-JSON error toasts

### Task 4: RevenueCat + refine

**Files:** `convex/http.ts`, `src/app/api/generate/refine/route.ts`

- [ ] `expiresAtMs: event.expiration_at_ms ?? undefined`
- [ ] Refine: settle only in `finally`

### Task 5: Verify

- [ ] `npx vitest run src/lib/__tests__/app-assets.test.ts src/lib/__tests__/token-pricing.test.ts`
