# Gesture Presets Expansion

**Date:** 2026-07-27  
**Status:** Draft for review

## Goal

Expand the shared create / remix / studio gesture menu so users can pick from a broader set of poses that cover common app UI states and expressive actions. Target: **at least 20**; locked catalog below is **37**.

## Approach

Single source of truth: expand `GESTURE_PRESETS` and `GESTURE_CATEGORIES` in `src/lib/gesture-presets.ts`. No new modules, no API contract changes, no generate-limit changes.

Create, remix, and generated-studio already import this list, so they pick up the new options automatically.

## Categories

| Category | Purpose |
|---|---|
| **Core** | Everyday presence and communication |
| **Moods** | Emotional expression |
| **Action** | Physical / directive gestures |
| **Feedback** | Product UI states (success, error, empty, loading, etc.) |

## Locked catalog (37)

Keys are stable identifiers used in generate requests. Labels are UI copy.  
**Count:** Core 8 + Moods 12 + Action 11 + Feedback 6 = **37**.

### Core (8)

| key | label | tip (intent) | use |
|---|---|---|---|
| `idle` | Idle | At rest: floats, blinks, soft sway | Home screen |
| `wave` | Wave | Friendly hello; one limb raised and flapping | Hello · goodbye |
| `happy` | Happy | Creased eyes and a warm grin | Good news |
| `thinking` | Thinking | Gaze drifts up, mouth thoughtful | Loading · AI planning |
| `listening` | Listening | Leans in with soft focus | Voice input |
| `talking` | Talking | Mouth mid-word, posture open | AI reply |
| `pointing` | Pointing | One arm out, directing attention | Tour · callout |
| `writing` | Writing | Focused on a small pad or keyboard | Compose · notes |

### Moods (12)

| key | label | tip (intent) | use |
|---|---|---|---|
| `celebrate` | Celebrate | Wide grin, confetti energy | Streak · success |
| `love` | Love | Soft eyes, hearts floating off | Thanks · rating |
| `sad` | Sad | Soft eyes and a gentle droop | Missed goal, kindly |
| `crying` | Crying | Tears, bigger sorrow than sad | Bad news · empathy |
| `grumpy` | Grumpy | Brows down, small pout | Too early · friction |
| `sleepy` | Sleepy | Heavy lids, slow blink | Night mode |
| `proud` | Proud | Chin up, bright glow | Milestone |
| `oops` | Oops | Sheepish smile; soft fail | Rough take, kindly |
| `surprised` | Surprised | Wide eyes, small jump | Wow · discovery |
| `blowing_kiss` | Blowing kiss | Soft kiss blown toward viewer | Thanks · affection |
| `facepalm` | Facepalm | Hand to face, wry embarrassment | Facepalm moment |
| `dancing` | Dancing | Upbeat bounce / groove | Fun · celebration |

### Action (11)

| key | label | tip (intent) | use |
|---|---|---|---|
| `alarm` | Alarm! | Wide eyes, ringing energy | Notification · alarm |
| `encourage` | Encourage | Open posture, warm face | Nudge · coaching |
| `searching` | Searching | Looking around / scanning | Search · find |
| `thumbs_up` | Thumbs up | Clear approval gesture | Approve · yes |
| `thumbs_down` | Thumbs down | Clear disapproval gesture | Reject · no |
| `shrug` | Shrug | Shoulders up, unsure | Unknown · maybe |
| `working` | Working | Focused busy posture | Processing · busy |
| `running` | Running | Mid-stride energy | Hurry · progress |
| `flying` | Flying | Lifted / soaring pose | Delight · upgrade |
| `high_five` | High five | Arm raised for a high five | Team win · connect |
| `clapping` | Clapping | Hands mid-clap | Applause · praise |

### Feedback (6)

| key | label | tip (intent) | use |
|---|---|---|---|
| `confused` | Confused | Crooked mouth, a little lost | Error · not found |
| `success` | Success | Clear win pose / check energy | Done · completed |
| `error` | Error | Soft alert — concerned, not scary | Failed request |
| `empty` | Empty | Gentle “nothing here yet” | Empty state |
| `loading` | Loading | Soft wait / spinner energy | In progress |
| `waiting` | Waiting | Patient pause, eyes soft | Queued · hold on |

## Unchanged product rules

- Create / generate still allow **1–6** gestures per run.
- Defaults remain `idle`, `wave`, `happy`.
- Custom gestures remain supported.
- Studio add-gesture limit (`MAX_GESTURES`) unchanged.
- Tip/use copy style matches existing short, product-oriented phrasing.
- Existing keys keep the same `key` strings so prior selections and saved data stay valid (`confused` moves category only).

## Out of scope

- Raising the 6-gesture generate cap
- Changing pricing / token estimates beyond automatic count from selected gestures
- New example pose packs for every preset
- Backend schema changes (gestures are request payloads, not a Convex enum)

## Implementation surface

1. Update `src/lib/gesture-presets.ts`:
   - `GESTURE_CATEGORIES = ["Core", "Moods", "Action", "Feedback"]`
   - Full `GESTURE_PRESETS` array per tables above
2. No create/remix UI changes required unless category rendering assumes exactly three categories (verify; today it maps `GESTURE_CATEGORIES`).
3. Optional: tiny unit test that preset keys are unique and categories ⊆ `GESTURE_CATEGORIES`.

## Success criteria

- Create picker shows 37 presets across four categories.
- Remix “extra gestures” and studio “add gesture” menus show the same expanded list.
- Selecting any new preset generates successfully with existing `/api/generate` flow.
- No regressions to default selection or 6-max validation.
