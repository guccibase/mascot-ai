# Ask AI Credits, Margin & Model Picker — Design

**Date:** 2026-07-29  
**Status:** Approved in conversation; awaiting spec review before implementation plan  
**Scope:** Studio Ask AI (`refine`) credit consumption with 50% gross margin, edit-session model picker, dual affordability gates

## Problem

1. **Ask AI has no model picker.** Edits reuse the mascot’s saved create model (or default). Users cannot choose a cheaper/faster model for a change the way they can on Create.
2. **LLM refine bills at provider COGS** (1:1 into billing tokens). App assets already apply `×2` for ≥50% gross margin; Ask AI does not, so edit spend under-monetizes relative to that convention.
3. **Affordability gate is all-or-nothing against a full-pack worst-case hold.** The UI reserves `estimateTokens({ kind: "refine", batches: N, … }).max`, which can show “needs about 784K” against a 240K weekly balance even when a smaller/cheaper path would be affordable on another model. There is no separate “smallest change” floor vs “this edit’s reservation.”

## Goals

- Consume tokens from the user’s available balance for Ask AI edits.
- Let the user pick the model for the edit (Create option set), session-only.
- Charge refine at **≥50% gross margin** on provider COGS (`billable = ceil(cogs × 2)`).
- Reject when balance is below the **minimum** for the smallest change on the **selected** model.
- Also reject when **this edit’s reservation `.max`** exceeds available balance (aligned with server reserve).
- Keep create / studio / gesture / remix pricing unchanged.
- Lean, DRY changes on the existing reserve → meter → settle path.

## Non-goals

- Applying the refine margin to samples, studio, gesture, or remix.
- Persisting the edit-panel model onto `mascots.model`.
- Changing plan catalog, `USD_PER_TOKEN`, top-up packs, or nav balance chip.
- Soft-allow on `.typical` with post-submit 402 risk.
- Extracting a shared Create/Ask-AI model-picker component unless duplication becomes large (prefer a compact inline control first).
- Schema / Convex token ledger shape changes.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Margin scope | Plan/top-up pricing (not a refine-only ×2 — that made edits costlier than creates) |
| Refine hold | Practical `typical × 1.5`, capped by absolute max (UI + reserve) |
| Smallest-change floor | 1-batch practical hold on the **selected** model (real payload) |
| Hard refuse for this edit | Balance must cover this edit’s practical hold |
| Model persistence | Edit-session only; default from mascot prop / `DEFAULT_MASCOT_MODEL` |

## Pricing model

### Billing unit (unchanged)

`1` billing token = `USD_PER_TOKEN` (`$0.00001`) of provider COGS, as in `convex/lib/plans.ts`.

### Refine billing

Refine uses the same COGS→billing-token math as create (`REFINE_MARGIN_MULTIPLIER = 1`). Margin lives in plan/top-up prices, not a refine-only surcharge.

**Hold (UI + `openMeter` reserve):** `refineHoldTokens(estimate) = min(max, ceil(typical × 1.5))` so a normal edit is not gated on the 32K-output worst case.

Actual settle still charges metered usage (overruns can draw more / writeoff as today).

### Quotes (selected model)

| Quote | Definition |
|-------|------------|
| `minCost` | Practical hold for 1-batch refine on selected model |
| `editCost` | Practical hold for actual batch count (+ vision when a reference is attached) |
| `typical` | Expected spend shown in the cost chip |

`payloadChars` = compact mascot JSON + current message + history (same as `/api/generate/refine`).

### Affordability gates

| Condition | Behavior |
|-----------|----------|
| No plan / `!hasAccess` | Existing needs-plan paywall |
| `balance < minCost` | Hard block — cannot afford a 1-batch edit on this model |
| `minCost ≤ balance < editCost` | Hard block — this edit’s reservation exceeds balance |
| `balance ≥ editCost` | Allow submit; server reserves `editCost` |

Client `useAffordability(editCost)` stays the primary gate (same number the API reserves). Copy differentiates below-min vs below-edit when useful; both link to `/pricing` and encourage a lighter model.

Also hard-block (no pricing CTA) when `editCost > MAX_TOKEN_RESERVATION` so the UI never invites a submit that Convex would reject as `RESERVATION_TOO_LARGE`.

## Architecture

```
editModel (local state)
  → estimateTokens(refine, ×2) → minCost / editCost
  → useAffordability(editCost)
  → POST /api/generate/refine { model: editModel, … }
  → openMeter(refine) reserves editCost
  → record(usage) applies ×2 on COGS → settle
```

No Convex schema changes. Existing `tokens.reserve` / `tokens.settle` hold semantics unchanged.

### `tokensForUsage` / metering

`tokensForUsage` stays COGS-only for all callers. **Single choke point:** in `openMeter`, when `action.kind === "refine"`, multiply recorded usage by `REFINE_MARGIN_MULTIPLIER` before adding to `charged`. `recordFallback` already uses `estimateTokens` (marked up for refine). Non-refine `tokensForUsage` call sites stay untouched.

## UI / UX (`MascotEditPanel`)

- Local `editModel` state, initialized from `model ?? DEFAULT_MASCOT_MODEL`.
- On mascot identity change: reset `editModel` to incoming default; clear history/draft (existing).
- Compact model control above the prompt; options from `MASCOT_MODEL_OPTIONS`, availability via `/api/models` (same pattern as Create/remix).
- Live typical cost chip for current edit (`~{formatTokens(estimate.typical)}`).
- Submit body uses `editModel`, not the prop alone.
- When token-blocked, **keep model picker visible** so switching to a cheaper model can unblock without leaving the page.
- Preserve existing red warning + `/pricing` link pattern; update copy for needs-plan / needs-about-`editCost` (and min vs edit when distinct).
- Mobile: full-width picker stack; no new card chrome beyond Create-consistent controls.
- Do **not** patch `mascots.model` when the user changes `editModel`.

## File touch list

| File | Change |
|------|--------|
| `src/lib/token-pricing.ts` | `REFINE_MARGIN_MULTIPLIER`; apply on refine estimates; export refine quote helper |
| `src/lib/metering.ts` | Apply refine margin on recorded usage for `kind === "refine"` |
| `src/components/mascot-edit-panel.tsx` | Local model state, picker, dual messaging, submit `editModel` |
| `src/lib/__tests__/token-pricing.test.ts` | Refine ×2; non-refine unchanged; min ≤ edit for multi-batch |

Refine route (`/api/generate/refine`) should already reserve via `openMeter` + body `model`; only verify it receives the panel’s `editModel` and that estimates pick up the margin automatically. Avoid drive-by refactors elsewhere.

## Edge cases

- **Multi-batch pack:** `minCost` (1) &lt; `editCost` (N) — in-between balances see “this edit needs X,” not a false “any edit” floor.
- **Reference image:** Vision surcharge scales with batches (existing); included in both quotes.
- **Provider API fallback:** Bill actual model COGS, then apply ×2.
- **Missing usage:** `fallbackTokens` uses marked-up refine typical.
- **Overrun past reservation:** Existing settle / writeoff path unchanged.
- **Unavailable default model:** Fall back to first available / `DEFAULT_MASCOT_MODEL`.
- **Race:** Balance drops between UI check and reserve → existing `INSUFFICIENT_TOKENS` 402.
- **Single-batch pack:** `minCost ≈ editCost` (same reservation).

## Testing

- Refine `typical`/`max` = 2× pre-margin COGS; samples/studio/gesture/remix estimates unchanged.
- `tokensForUsage` path through refine meter charges 2× COGS; non-refine meter unchanged.
- `minCost` = 1-batch max; `editCost` scales with batches (and reference).
- Affordability: blocked when `balance < editCost`; messages remain actionable.

## Success criteria

- User can select a model in Ask AI without changing the saved mascot model.
- Edit cost and reservation reflect selected model × refine ×2 margin.
- Submit allowed iff balance covers `editCost`; clear block when below min or below this-edit max.
- Create and other LLM actions’ token math unchanged.
- No schema migrations; no data loss on existing balances or reservations.
