# Ask AI Credits, Margin & Model Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Charge Ask AI (`refine`) at 50% gross margin (`×2` COGS), let users pick an edit-session model, and gate submit on this-edit reservation `.max` (with min = 1-batch floor for messaging).

**Architecture:** Mark up refine in `estimateTokens`; multiply refine usage in `openMeter` only. Export `estimateRefineReservation` for UI min/edit quotes. `MascotEditPanel` owns local `editModel` + compact picker; does not persist `mascots.model`.

**Tech Stack:** Next.js client panel, existing Convex token reserve/settle, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-29-ask-ai-credits-model-picker-design.md`

## Global Constraints

- Refine-only margin; samples/studio/gesture/remix stay COGS 1:1.
- No schema / plan catalog / `USD_PER_TOKEN` changes.
- Model choice is edit-session only.
- Lean diffs; no drive-by refactors.

---

### Task 1: Refine margin + reservation helper

**Files:**
- Modify: `src/lib/token-pricing.ts`
- Modify: `src/lib/metering.ts`
- Test: `src/lib/__tests__/token-pricing.test.ts`

**Interfaces:**
- Produces: `REFINE_MARGIN_MULTIPLIER = 2`
- Produces: `estimateRefineReservation({ batches, payloadChars, hasReference }, model) → { minCost, editCost, typical }`
- Consumes: existing `estimateTokens`, `tokensForUsage`, `openMeter`

- [x] **Step 1: Add failing tests** for refine ×2, non-refine unchanged, min ≤ edit, reservation covers `ceil(cogs × 2)`

- [x] **Step 2: Implement** `REFINE_MARGIN_MULTIPLIER`; apply at end of `estimateTokens` for `kind === "refine"`; add `estimateRefineReservation`; in `openMeter.record` multiply refine usage by multiplier

- [x] **Step 3: Run** `npx vitest run src/lib/__tests__/token-pricing.test.ts` — expect PASS

- [x] **Step 4: Commit** pricing + metering + tests

---

### Task 2: Ask AI model picker + affordability UX

**Files:**
- Modify: `src/components/mascot-edit-panel.tsx`

- [x] Local `editModel` state (default `model ?? DEFAULT`); reset on identity change
- [x] Fetch `/api/models`; compact `<select>` or button row; keep visible when token-blocked
- [x] Quotes via `estimateRefineReservation`; `useAffordability(editCost)`
- [x] Warning copy: needs-plan / needs `editCost` (mention lighter model); show typical chip when affordable
- [x] POST body uses `editModel`; analytics use `editModel`
- [x] Do not write `mascots.model`

- [x] **Verify:** typecheck/lint on touched files; manual sanity on studio Ask AI

- [x] **Commit** panel changes

---

### Task 3: Verify refine route alignment

**Files:**
- Read/confirm: `src/app/api/generate/refine/route.ts` (only change if body model / openMeter wiring is wrong)

- [x] Confirm route uses `resolveMascotModel(body.model)` + `openMeter({ kind: "refine", … })` so Task 1 margin applies automatically
- [x] No unrelated edits

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| Refine ×2 margin estimate + settle | Task 1 |
| minCost / editCost gates + copy | Task 2 |
| Session-only model picker | Task 2 |
| Create/other kinds unchanged | Task 1 tests |
| No schema / persist model | Constraints |
