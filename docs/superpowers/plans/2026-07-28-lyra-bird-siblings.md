# Lyra Bird Sibling Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four Lyra-derived bird example studios (`nox`, `zest`, `quill`, `pip`) with the full 37-pose catalog, element toggles, and create-path studio layout.

**Architecture:** Mirror the octopus family: shared `bird-studio.jsx` engine + `bird-characters.js` kits + thin `*-mascot.jsx` wrappers. Lyra stays unchanged as the speech coach.

**Tech Stack:** React client components (JSX), existing pose-pack build (`npm run poses:build`), Vitest, Next.js studio routes.

## Global Constraints

- Gesture keys must match `GESTURE_PRESETS` exactly (37 keys; categories Core / Moods / Action / Feedback).
- Studio shell must match GeneratedStudio: `lg:grid-cols-[1fr_400px]`, Elements under stage, controls on the right.
- Origin-free CSS animations only; shape motion via SMIL / attributes (Lyra rule).
- `POSE_SOURCE.meta.instrument` is `null` (scores baked per pose).
- Do not modify Lyra’s coaching gesture set.
- CSS prefixes: shell `bd-`, SVG `bv-`.

---

### Task 1: Character kits — DONE

**Files:** `src/components/mascots/bird-characters.js`

- [x] Write NOX / ZEST / QUILL / PIP kits
- [x] Commit with engine when ready

### Task 2: Shared bird studio engine — DONE

**Files:** `src/components/mascots/bird-studio.jsx`

- [x] `createBirdStudio(cfg)` with 37 gestures, element toggles, GeneratedStudio layout
- [x] Lyra-derived SVG + Byte-adapted performances

### Task 3: Thin wrappers — DONE

**Files:** `nox|zest|quill|pip-mascot.jsx`, `index.ts`

- [x] Wrappers + exports

### Task 4: Register slugs — DONE

**Files:** mascots.ts, studio routes, build-pack, loaders, remix config, types, placeholders, seo test

- [x] Full wiring

### Task 5: Pose packs — DONE

- [x] `npm run poses:build` wrote nox/zest/quill/pip.json (37 poses each)
- [x] pose-packs + seo tests pass
