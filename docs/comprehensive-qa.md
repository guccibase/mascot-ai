# Comprehensive QA — Mascot AI

Manual and live-integration checklist for flows that unit tests cannot cover: billing truth, generation quality, studio behavior, marketplace, and edge cases.

**Run this in addition to `npm test` whenever you touch critical paths** (see [Critical-change triggers](#critical-change-triggers) and `.cursor/rules/comprehensive-qa-after-critical-changes.mdc`).

---

## Prerequisites

### Dev stack

```bash
# Terminal 1 — Next.js
yarn dev

# Terminal 2 — Convex (never `convex deploy` for local QA)
npx convex dev
```

Confirm `.env.local` has: `NEXT_PUBLIC_CLERK_*`, `NEXT_PUBLIC_CONVEX_URL`, `GENERATION_SERVER_SECRET` (matches Convex dashboard), model API keys, and `ALLOW_SANDBOX_BILLING` on Convex for sandbox purchases.

### Test personas

| Persona | Setup | Use for |
|---------|-------|---------|
| Anonymous | No sign-in | Home, public studios (`lyra`, `sol`, `bud`, `fanous`), marketplace browse |
| New user | Clerk sign-up | Onboarding → pricing redirect |
| Subscribed | RevenueCat sandbox `mascotai_weekly` / `monthly` / `yearly` | Create, refine, remix, app assets |
| Top-up only | Grant top-up via sandbox, no plan | Access via `topupTokens > 0` |
| Depleted | Zero balance | 402 on metered APIs, pricing CTAs |
| Admin | Clerk `publicMetadata.role = "admin"` (+ Convex JWT `role` claim) | Gated example studios, admin marketplace, `/admin` users & grants |

### Balance verification (Convex)

Use the signed-in user's JWT or server secret path:

```bash
CONVEX_URL=$(grep '^NEXT_PUBLIC_CONVEX_URL=' .env.local | cut -d= -f2-)
NOW=$(python3 -c "import time; print(int(time.time()*1000))")
curl -sS "$CONVEX_URL/api/query" \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H 'Content-Type: application/json' \
  -d "{\"path\":\"tokens:balance\",\"args\":{\"now\":$NOW},\"format\":\"json\"}" \
  | python3 -m json.tool
```

**Reconciliation rule:** After any metered action, `balance_after ≈ balance_before − response._meta.tokens` (when `_meta` includes `tokens` and `balance`). If `_meta` omits them, settle did not commit — treat as billing bug.

**Hold vs charge (auth/capture):** `reserve` earmarks capacity (`available = total − held` via denormalized `openHoldTotal`) without debiting the wallet. `settle(actual>0)` debits only after success (capped by leftover capacity after peer holds); failure + `forgive()` → `settle(0)` charges **0**. Wallet `total` must not drop mid-flight; only `available` shrinks while a hold is open. Expired deferred holds stay capturable for a settle grace window; after hard-delete, a late `settle(actual>0)` still orphan-captures once (`token_settle:{id}` receipt).

---

## Quality bar — production A++++ mascots

Generated output must meet or exceed our **27 example packs** (`src/lib/example-poses/*.json`). Compare within the same **factory family**:

| Family | Native example | Generated-studio slugs |
|--------|----------------|------------------------|
| Orb | `sol` | aura, glint, trove, zephyr |
| Lantern | `fanous` | shade, watt, arc |
| Bird/chick | `bud` | nox, zest, quill, pip |
| Robot | `byte` | bolt, relay, orbit, brew |
| Unique | `lyra`, `granary`, octopus line | — |

### Automated oracles (run before manual review)

```bash
npm test -- --run src/lib/example-poses/__tests__/pose-packs.test.ts
npm run poses:build   # if factory JSX changed — no drift
```

| Check | Pass criteria |
|-------|----------------|
| viewBox | `0 0 420 520` on every gesture SVG |
| Structure | `ms-root`, `ms-hit`, `ms-glow-halo`, `ms-signal-fan`, `ms-eyes` |
| Parts | `data-ms-part` on toggleable groups; `parts[]` matches |
| CSS | Hoisted `@keyframes` in pack CSS; empty `<style></style>` in SVG |
| Themes | Only `themes.primary` hex literals in SVG paint |
| Silhouette | Same character identity across all gestures |
| Animation | SMIL breathe/blink/click-bounce; CSS opacity/transform only |
| Instrument | Signal slider 0–100 drives fan/ramp/sparks consistently |
| Readability | Clear at 128px; transparent background |
| Sanitization | Export/copy passes `sanitize-svg` whitelist |
| No regressions | No `data-paused` in committed packs; unique gesture keys |

### Manual visual review (per generation)

- [ ] **Metaphor:** Product + instrument feel intentional, not generic blob
- [ ] **Gestures:** Each pose is a whole performance (posture + face + instrument + prop)
- [ ] **Motion:** Idle float, wave, flying, etc. feel alive — on par with Watt/Shade/Sol tier
- [ ] **Polish:** Blush, eye highlights, contact shadow, secondary volume
- [ ] **Studio UX:** Theme switch recolors all poses; part toggles instant and reversible
- [ ] **Export:** ZIP contains all gestures + shared CSS; SVG opens clean in browser

**Reject** sticker/emoji quality, broken animations, missing parts after refine, or gestures that look like unrelated illustrations.

---

## Token economics verification

Catalog: `convex/lib/plans.ts`

| Plan | Product ID | Tokens / cycle |
|------|------------|----------------|
| Weekly | `mascotai_weekly` | 240,000 |
| Monthly | `mascotai_monthly` | 1,250,000 |
| Yearly | `mascotai_yearly` | 1.25M × 12 |

| Top-up | Product ID | Tokens |
|--------|------------|--------|
| Starter | `topup_starter` | 240,000 |
| Studio | `topup_studio` | 600,000 |
| Pro | `topup_pro` | 1,650,000 |

### Per-action billing checks

| Action | API | Atomic billing? | Verify |
|--------|-----|-----------------|--------|
| Samples | `POST /api/generate/samples` | settle on success | `_meta.tokens`, balance ↓ |
| Create pack | `POST /api/generate` | settle on success | charge matches model + gesture count |
| Refine / Ask AI | `POST /api/generate/refine` | **Yes** — record after merge; `forgive()` on failure | success charges; abort/502/504/merge fail = **0 charge** |
| Add gesture | `POST /api/generate/gesture` | **Yes** — record after normalize; `forgive()` on failure | same |
| App asset samples | `POST /api/generate/app-assets/samples` | per call | |
| App asset pack | `POST /api/generate/app-assets/pack` | per call | |
| Remix | `POST /api/remix` | per call | |

**Hold sizing:** Refine hold uses `refineHoldTokens` (typical × 1.5, capped). Large packs (37–64 poses) must not hit `RESERVATION_TOO_LARGE` (30M cap in `convex/lib/plans.ts`).

**Reservation TTL:** 10 minutes (`convex/tokens.ts`) — must exceed refine `maxDuration` (300s).

**Subscription first:** Deplete subscription tokens before top-up; ledger reconciles with balances.

---

## Flow checklists

### 1. Auth & access gate

Routes: `/sign-in`, `/sign-up`, `/onboarding`, `/pricing`, `/library`

- [ ] Signed-out user hitting `/create` → sign-in
- [ ] New user → onboarding (use case, stack, referral, favorite example) → pricing if no access
- [ ] User with plan or top-up → library after onboarding
- [ ] Depleted user → pricing prompt; metered APIs return 402

Files: `src/components/access-gate.tsx`, `src/components/onboarding/onboarding-flow.tsx`

---

### 2. Create flow (`/create`)

APIs: `brief-surprise`, `samples`, `generate`

- [ ] Model picker reflects `/api/models` availability
- [ ] Token estimate updates with model + gesture count (`TokenEstimate`)
- [ ] Brief fields + “Surprise me” (rapid re-click aborts cleanly)
- [ ] Gesture presets + custom gestures (create still caps **1–6** at generation time)
- [ ] Optional reference image upload
- [ ] Samples → pick concept → full pack generation
- [ ] Auto-save to library (`useMascotPersistence` → `api.mascots.save`)
- [ ] Inline studio: themes, instrument, poses, parts, signal/sparks
- [ ] **Quality:** Compare output to same-family example pack
- [ ] **Billing:** Record balance before/after; success shows `_meta.tokens` + `_meta.balance`

---

### 3. Library studio (`/library/[id]`)

- [ ] Paginated list (12 initial), delete with confirm
- [ ] Open mascot → full `GeneratedStudio`
- [ ] Edits auto-save
- [ ] Marketplace-locked pack cannot duplicate-save (`assertPackNotMarketplaceLocked`)
- [ ] Remix link → `/library/[id]/remix`

---

### 4. Refine / Ask AI

API: `POST /api/generate/refine` (300s max)

- [ ] Small pack (3 poses): 200, mascot applied, charged
- [ ] Large pack (37+ poses): **not** rejected at old 24 limit; accepts up to **64**
- [ ] 65 poses → 400 with clear message
- [ ] Duplicate gesture keys → 400 before meter opens
- [ ] Client abort mid-run → **no net charge**
- [ ] Server failure (timeout, bad JSON, merge fail) → **no charge**; `_meta` without tokens if uncommitted
- [ ] Reference image refine works
- [ ] Affordability gate blocks send when insufficient (`useAffordability`)
- [ ] **Quality:** Edit applied consistently across all batched poses

---

### 5. Add gesture

API: `POST /api/generate/gesture`

- [ ] Preset or custom key/label/category
- [ ] Duplicate key rejected
- [ ] Success: new gesture animates; parts re-extracted
- [ ] Failure: full hold refunded
- [ ] At 64 gestures, add-gesture UI/API blocks 65th

---

### 6. Studio settings (all studio entry points)

Component: `src/components/generated-studio.tsx`  
Capability source of truth: `src/lib/studio-capabilities.ts`

| Setting | Verify |
|---------|--------|
| Themes | Swatches + custom; SVG recolors via theme contract |
| Instrument | Slider 0–100; ramp labels; sparks/signal bars |
| Parts | Toggle hide/show via `data-ms-part`; not metered |
| Gestures | Grid preview; click animates; track cursor on `track: true` poses |
| Export | ZIP download; copy SVG sanitized |
| Undo | Undo stack restores prior pack state |
| Ask AI / add gesture | Available whenever `edit` is on |
| App assets | Available whenever saved `mascotId` exists |

#### Owned-studio parity (created = remixed = bought)

**Rule:** Once a mascot is in your library (`userId` ownership), studio features must match created mascots. `source` (`created` / `remixed` / `purchased`) must never reduce capabilities. Privileged studio features are **opt-in** via explicit capability presets (omitting `capabilities` keeps export/edit/app assets off).

Automated lock: `npm test -- src/lib/__tests__/studio-capabilities.test.ts`

| Feature | Created (`/create` → `/library/[id]`) | Remixed (library or marketplace remix → library) | Bought (checkout → library) |
|---------|---------------------------------------|--------------------------------------------------|-----------------------------|
| Themes / instrument / poses | ✓ | ✓ | ✓ |
| Parts toggles | ✓ | ✓ | ✓ |
| Ask AI / refine | ✓ | ✓ | ✓ |
| Add gesture | ✓ | ✓ | ✓ |
| Undo | ✓ | ✓ | ✓ |
| Export / copy SVG | ✓ | ✓ | ✓ |
| App assets (icons) | ✓ | ✓ | ✓ |
| Autosave | ✓ | ✓ | ✓ |
| Remix again | ✓ | ✓ | ✓ |

Manual UI functional pass (run on **each** of created / remixed / bought library studios):

- [ ] Open studio from library card — full controls visible (not “Preview only”)
- [ ] Switch theme; instrument slider; toggle a part; play 3 gestures
- [ ] Ask AI small edit → pack updates + autosave
- [ ] Add gesture (preset) → animates
- [ ] Undo restores prior pack
- [ ] Download pose + download pack ZIP; copy SVG
- [ ] App assets: generate 3 previews → expand/inspect → build pack → download ZIP
- [ ] Remix link still works from library toolbar

Preview-only (must stay restricted):

- [ ] Marketplace listing: themes/parts/poses work; no export / Ask AI / app assets
- [ ] Example `/studio/[slug]` pack studios: same preview restrictions

---

### 7. Example & public studios (`/studio/[slug]`)

Public (no admin): `lyra`, `sol`, `bud`, `fanous`

- [ ] All gestures animate; instrument + themes work
- [ ] Export where enabled
- [ ] Admin-only slugs 404 for non-admin

Rebuild if factories changed: `npm run poses:build`

---

### 8. Remix flows

| Entry | Route | API |
|-------|-------|-----|
| Library remix | `/library/[id]/remix` | `POST /api/remix` |
| Marketplace remix | `/marketplace/[slug]/remix` | unlock + remix |

- [ ] Remix produces new pack; saves to library
- [ ] Token charge on metered remix
- [ ] Marketplace remix unlock TTL (24h) — expired requires re-pay
- [ ] Legacy `/remix/[slug]` redirects appropriately

---

### 9. Marketplace

Routes: `/marketplace`, `/marketplace/[slug]`, checkout success

| SKU | Price | Verify |
|-----|-------|--------|
| Remix | $4.99 | Stripe test → unlock remix studio |
| Buy to own | $49.99 | Copy to library; listing lock on re-save |

- [ ] Browse + search (no auth required)
- [ ] Preview studio: export/edit disabled; parts/themes view OK
- [ ] Checkout → success polling (`confirmOrder`)
- [ ] Pack ≤ 48 gestures, ≤ ~900KB JSON for listings

---

### 10. App assets / icon generation

APIs: `app-assets/samples`, `app-assets/pack`  
Requires saved `mascotId`.

Kinds (`src/lib/app-assets/catalog.ts`): `app_icon`, `favicon`, `pwa`, `logo`

- [ ] From **created** library mascot: samples (3) → pick → pack ZIP
- [ ] From **remixed** mascot: same flow
- [ ] From **bought** mascot: same flow
- [ ] ZIP contains expected sizes (iOS, Android, favicon, PWA)
- [ ] Icons readable at small sizes; on-brand with mascot
- [ ] Convex persistence: `api.mascotAppAssets.*`
- [ ] Billing: charge on success; balance reconciles

---

### 11. Pricing & top-ups (`/pricing`)

- [ ] RevenueCat sandbox purchase grants correct tokens
- [ ] Top-up adds to `topupTokens`; subscription consumed first on spend
- [ ] Manage billing link (`GET /api/billing/manage`)
- [ ] UI balance matches Convex `tokens.balance`

---

### 12. Admin users & token grants (`/admin`)

APIs: `api.adminUsers.listUsers`, `getUserDetail`, `userLedger`, `grantTokens`  
Auth: Clerk JWT `role=admin` (same as marketplace admin). Non-admins must see no user data.

**Automated (always):**

```bash
npm test -- --run convex/lib/__tests__/adminGrant.test.ts
```

| Check | Pass criteria |
|-------|----------------|
| Amount validation | Rejects ≤0 / non-finite / > `MAX_ADMIN_GRANT` (5M) |
| Idempotency key | Rejects unsafe / short / long keys |
| Subscription math | Full grant fits; at-cap → `SUBSCRIPTION_AT_CAP`; over-headroom → `SUBSCRIPTION_PARTIAL` |
| Ledger reason | `admin_grant:{adminId}` (+ optional note ≤120 chars) |

**Live (admin persona):**

- [ ] Header shows **Admin** only when `marketplace.isAdmin` is true (incl. mobile icon)
- [ ] Non-admin visiting `/admin` sees “Admin access required”; list/detail stay empty/null (no PII leak)
- [ ] User directory paginates; list shows wallet **balance** (detail shows held/available)
- [ ] Exact email search finds the user; unknown email → empty state
- [ ] User detail: plan, subscription/top-up split, held/available, onboarding, mascot count, recent ledger
- [ ] **Top-up grant** (e.g. +240K): balance increases by grant; ledger row `kind=grant`, `bucket=topup`, reason `admin_grant:…`
- [ ] Target user’s own `tokens.balance` / header chip matches after grant (refresh / minute clock)
- [ ] Confirm dialog appears for grants ≥ 600K (quick + custom)
- [ ] Double-submit / retry with same `idempotencyKey` → `duplicate: true`, **no second credit**
- [ ] Subscription bucket disabled when user has no active plan
- [ ] Subscription grant that exceeds plan headroom fails with clear toast (`SUBSCRIPTION_PARTIAL` / at-cap)
- [ ] Subscription grant within headroom credits `subscriptionTokens` only (capped at plan cycle)
- [ ] Analytics: successful grant emits `admin_grant` with `{ bucket, size }` only (no email / user id)

---

## Edge cases & failure modes

| Case | Expected | How to test |
|------|----------|-------------|
| Large pack refine (37–64) | Batches of 12 / 80K SVG chars; completes or times out with **no charge** on failure | Full Watt/Byte-scale pack |
| Abort refine / gesture | `forgive()` → settle(0) | Abort fetch at ~2s |
| Reservation expiry | Hold released after 10 min; cron sweep | Abandon mid-generation |
| Settle mutation failure | `committed: false`; retry succeeds | Unit: `metering.test.ts` |
| RESERVATION_TOO_LARGE | 413, helpful error | Theoretical Fable × 64 worst case |
| Insufficient tokens | 402 before or at reserve | Depleted account |
| Brief surprise spam | No stale overwrite | Rapid-click Surprise |
| Model fallback | Charge matches actual model used | If provider falls back |
| Concurrent creates | Reserves prevent overspend | Two tabs same user |
| Sandbox billing off | Purchases don't grant tokens | Convex env flag |
| Admin grant double-click / retry | Same idempotency key → no second credit; new key → second credit | `/admin` grant twice fast; network retry |
| Admin subscription grant over cap | Error toast; balance unchanged | Free user or near-cap plan user |
| Admin email duplicates | Search returns deduped rows (no throw) | Rare Clerk race rows |

---

## Critical-change triggers

Run **full sections** relevant to your diff when you change:

| Area | Files (examples) | Minimum QA |
|------|------------------|------------|
| Billing / tokens | `src/lib/metering.ts`, `convex/tokens.ts`, `convex/lib/plans.ts` | Token economics + abort/failure refund + balance reconciliation |
| Generate APIs | `src/app/api/generate/**` | Create + refine + gesture + app-assets billing paths |
| Prompts / craft | `src/lib/generate-system-prompt.ts`, `src/lib/svg-gesture-prompt.ts` | Create quality vs family example + animation |
| Studio UI | `generated-studio.tsx`, `mascot-edit-panel.tsx`, `studio-capabilities.ts` | Settings + export + Ask AI + **owned parity** (created/remixed/bought) |
| Refine pack logic | `src/lib/refine-pack.ts`, `token-pricing.ts` | 37-pose accept; 65 reject; batch behavior |
| Mascot factories | `src/components/mascots/**` | `npm run poses:build` + example studio smoke |
| Marketplace | `convex/marketplace*.ts`, checkout pages | Browse, pay, remix unlock, buy-to-own |
| Pricing / RC | `convex/billing.ts`, `/pricing` | Sandbox subscribe + top-up grants |
| Admin users / grants | `convex/adminUsers.ts`, `convex/lib/adminGrant.ts`, `/admin` | Section 12 + balance/ledger reconciliation |
| Schema | `convex/schema.ts` | Balance query + save flows still work |

When in doubt, run the **priority smoke path**:

1. Sandbox subscribe → balance confirmed  
2. Create up to 10-gesture mascot (Sol) → quality review vs family example  
3. Refine small + 37-pose → billing correct  
4. Add gesture → billing correct  
5. App icon pack on library mascot  
6. Export ZIP + theme/parts/instrument  
7. Abort mid-refine → balance unchanged  

---

## Sign-off template

Copy into PR or agent handoff:

```markdown
## QA sign-off

- [ ] `npm test` — ___/___ pass
- [ ] Dev stack running (Next + Convex dev)
- [ ] Critical paths exercised: ___
- [ ] Balance before/after reconciled for: ___
- [ ] Generation quality vs example pack (family: ___): pass / fail
- [ ] Edge cases: abort billing, large pack, 402 depleted
- [ ] Admin grants (if touched): top-up + idempotent retry + ledger row
- [ ] Known gaps / not tested: ___
```


---

## Reference index

| Topic | Location |
|-------|----------|
| Example packs | `src/lib/example-poses/*.json` |
| Pose drift tests | `src/lib/example-poses/__tests__/pose-packs.test.ts` |
| Metering tests | `src/lib/__tests__/metering.test.ts` |
| Refine route tests | `src/app/api/generate/refine/route.test.ts` |
| Plans / caps | `convex/lib/plans.ts` |
| Admin grant helpers / tests | `convex/lib/adminGrant.ts`, `convex/lib/__tests__/adminGrant.test.ts` |
| Admin users API / UI | `convex/adminUsers.ts`, `/admin` |
| Token balance hook | `src/lib/use-token-balance.ts` |
| Access gate | `src/components/access-gate.tsx` |
| Studio | `src/components/generated-studio.tsx` |
| Studio capabilities | `src/lib/studio-capabilities.ts` |
| Owned-studio parity tests | `src/lib/__tests__/studio-capabilities.test.ts` |
| App assets | `src/components/app-assets-panel.tsx` |

---

## QA sign-off — 2026-07-29 (full matrix pass)

```markdown
## QA sign-off

- [x] `npm test` — **349/349** pass (30 files)
- [x] Dev stack running (Next + Convex dev)
- [x] Critical paths exercised:
  - **Automated:** billing sandbox gate (`billingPolicy`), plan/top-up catalog (`plans`), sub-before-topup hold split + refund (`spendSplit`), refine abort/forgive + 65-pose/duplicate reject, gesture forgive + 64-cap, studio-capabilities owned/preview/admin wiring
  - **Live create:** QA Spark (Luna) — 3 look samples → Build studio → full owned studio (themes/parts/instrument/gestures/export/Ask AI/app assets); signal wave **120×36**; balance **1.14M → ~1.13M** (create metering)
  - **Live owned:** Nova (created), Nova Remix QA (remixed) — full studio parity
  - **Live preview:** `/marketplace/sol` — parts/themes only, “Preview only” copy
  - **Live admin:** Clerk `role=admin` granted; library Admin panel + listings (Sol, Lyra, Granary)
  - **Live marketplace checkout:** Remix Sol → Stripe test checkout session opened
- [x] Balance before/after reconciled for: create sample + pack build (UI balance chip); exact `_meta.tokens` JWT query blocked (expired test JWT)
- [ ] Generation quality vs example pack (family: **bird/chick**): **pass** (QA Spark orb-family craft bar met; not side-by-side with Nox/Zest pack)
- [ ] Edge cases:
  - abort billing refine/gesture: **unit pass** (`refine/route.test.ts`, `gesture/route.test.ts`); live abort not re-run
  - large pack 37–64: **unit pass** (refine batches); live not re-run
  - **402 depleted:** not tested (would need zero-balance persona)
- [ ] Known gaps / not tested:
  - Stripe **Pay** completion for buy/remix (cross-origin checkout iframe)
  - RevenueCat **manage subscription** + sandbox **top-up** grant UI end-to-end
  - Live **purchased** mascot studio (requires completed buy checkout)
  - Live **post-remix** studio after Stripe fulfill
  - App icon **ZIP download** after previews finish (generation started, not awaited)
  - Live abort-at-2s refine/gesture
```
