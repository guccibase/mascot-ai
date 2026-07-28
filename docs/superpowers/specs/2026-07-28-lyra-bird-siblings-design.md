# Lyra Bird Sibling Examples

**Date:** 2026-07-28  
**Status:** Approved (owner: proceed without further Q&A)

## Goal

Ship **four new bird example studios** derived from Lyra’s engineering, each for a different product vertical, matching the create-path studio layout and the full shared gesture catalog (37 poses), with studio-only element toggles.

Lyra herself stays the speech-coaching lyrebird (22 coaching poses). The new siblings use the standard Core / Moods / Action / Feedback keys.

## Approach (chosen)

Mirror the existing octopus family:

| Octopus | Birds |
|---|---|
| `octopus-studio.jsx` + `octopus-characters.js` | `bird-studio.jsx` + `bird-characters.js` |
| Thin wrappers: `numi` / `lexa` / `coda` / `kelp` / `nori` | Thin wrappers: `nox` / `zest` / `quill` / `pip` |

**Rejected alternatives**

1. **Four fully independent Lyra copies** — unmaintainable; octopus already proved the factory pattern.
2. **Retheme Lyra silhouette only, keep coaching gesture keys** — breaks create-path parity; remix/create users expect the 37 shared presets.
3. **Upgrade Lyra in place to 37 keys** — out of scope; would break Lyra’s coaching-specific pose pack and product story.

## Four characters

| Slug | Name | Species (story) | Product | Instrument label | Zones |
|---|---|---|---|---|---|
| `nox` | Nox | Barn owl | Focus Timer App | Focus | Scattered → Locked in → Deep work |
| `zest` | Zest | Hummingbird | Habit Tracker App | Streak | Cold → Building → On fire |
| `quill` | Quill | Magpie | Journal App | Flow | Blocked → Writing → In flow |
| `pip` | Pip | Puffin | Team Check-in App | Sync | Solo → Connected → In sync |

Shared body language comes from Lyra (perched songbird, wing gestures, crest, beak, score-driven feather fan). Character kits swap brand, themes, instrument copy, prop flavor, and part labels — same structure as octopus `chipSymbols` / `partLabels` / `solve`.

## Studio layout (must match create path)

Match `GeneratedStudio` / Numi shell:

- Header: name · product, short tagline
- Main: `lg:grid-cols-[1fr_400px]`
- Left card: Stage (Transparent / In-app) → SVG → hint → **Elements** panel (All / None / Reset)
- Right card: instrument slider → Gesture pills by category → tip card → Theme swatches → Spotlight / Pause

## Gestures (37)

Exact keys from `GESTURE_PRESETS` in `src/lib/gesture-presets.ts`:

- **Core (8):** idle, wave, happy, thinking, listening, talking, pointing, writing
- **Moods (12):** celebrate, love, sad, crying, grumpy, sleepy, proud, oops, surprised, blowing_kiss, facepalm, dancing
- **Action (11):** alarm, encourage, searching, thumbs_up, thumbs_down, shrug, working, running, flying, high_five, clapping
- **Feedback (6):** confused, success, error, empty, loading, waiting

Every gesture is a full performance: posture, eyes, brows, beak, wing pose, optional prop. Selecting a gesture may retarget the instrument score (like Lyra’s delivery / Numi’s solve).

## Element toggles

Studio-only (not baked into pose-pack snapshots beyond default-on). Categories: Body / Face / Costume / Props / Stage.

Base parts (labels overridable per character):

| key | default label |
|---|---|
| crest | Crest |
| wings | Wings |
| breast | Breast patch |
| legs | Legs |
| mic | Instrument prop (mic / hourglass / nectar / pen / badge) |
| brows | Brows |
| blush | Blush |
| glasses | Specs |
| hat | Hat |
| props | Pose props |
| tail | Score fan / tail |
| halo | Spotlight |
| shadow | Shadow |

## Engineering constraints

- Origin-free CSS animations only (opacity / translate); shape motion via SMIL or per-frame attributes (Lyra rule).
- `POSE_SOURCE` on each wrapper for `npm run poses:build`.
- Instrument is live in the studio; pose packs snapshot baked scores → `meta.instrument: null` (same as Lyra / Numi).
- Deterministic `renderPose` (no randomness / clocks).

## Wiring surface

For each of `nox`, `zest`, `quill`, `pip`:

1. Thin `*-mascot.jsx` calling `createBirdStudio(CFG)`
2. `MascotSlug` + `MASCOTS` entry (`poseCount: 37`)
3. Studio route + client switch
4. `example-poses/index.ts`, `build-pack.ts`, marketplace loaders
5. `remix/examples.config.ts` (eyes / glow / instrument class patterns)
6. `create-field-placeholders.ts`, SEO tests, `components/mascots/index.ts`
7. Committed `example-poses/{slug}.json` via `poses:build`
8. Marketplace pack copy when that pipeline expects it

## Out of scope

- Changing Lyra’s coaching gesture set
- Changing Granary / Bud
- Raising generate gesture caps
- Convex schema changes

## Success criteria

- `/studio/nox`, `/studio/zest`, `/studio/quill`, `/studio/pip` render with create-path layout
- Each shows 37 gestures across Core / Moods / Action / Feedback
- Every listed element toggles off and back on without breaking layout
- Pose-pack drift tests pass for the four new slugs
- Home / footer / marketplace example lists include the four birds
