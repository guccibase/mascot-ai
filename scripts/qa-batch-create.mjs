/**
 * Multi-model create QA — run inside the signed-in browser via CDP:
 *   copy into Runtime.evaluate, or: node is not enough (needs Clerk cookies).
 * This file is the source of truth for the batch; the agent injects it.
 */
export const BATCH = [
  {
    model: "gpt-5.6-luna",
    name: "QA Luna Pip",
    description: "A tiny ember chick that keeps focus sessions warm.",
    look: "Round chick, soft orange glow, simple vector craft, one raised wing.",
    productContext: "Focus timer",
    personality: "Warm and steady",
  },
  {
    model: "gpt-5.6-terra",
    name: "QA Terra Moss",
    description: "A moss fox that nudges you back when attention drifts.",
    look: "Soft fox silhouette, moss green fur, lantern-orange accents, satchel.",
    productContext: "Deep work companion",
    personality: "Gentle and mischievous",
  },
  {
    model: "gpt-5.6-sol",
    name: "QA Sol Flare",
    description: "A sunrise orb that wakes habits with light, not noise.",
    look: "Living drop silhouette, bright sun core, ground light pool, shimmer.",
    productContext: "Habit alarm",
    personality: "Bright and patient",
  },
  {
    model: "claude-sonnet-5",
    name: "QA Sonnet Quill",
    description: "A magpie chick that collects every useful thought.",
    look: "Magpie chick, ink-black feathers, cream face, tiny journal prop.",
    productContext: "Journal app",
    personality: "Curious and tidy",
  },
  {
    model: "claude-opus-5",
    name: "QA Opus Watt",
    description: "An Edison bulb that sparks half-formed ideas into clarity.",
    look: "Soft glass bulb body, warm filament face, tiny base feet, glow halo.",
    productContext: "Idea capture",
    personality: "Sparky and encouraging",
  },
  {
    model: "claude-fable-5",
    name: "QA Fable Shade",
    description: "A mushroom lamp that dims the day into sleep.",
    look: "Soft mushroom lamp silhouette, warm cap, gentle stem face, sleepy eyes.",
    productContext: "Sleep wind-down",
    personality: "Calm and hush",
  },
  {
    model: "gpt-5.6-luna",
    name: "QA Luna Bolt",
    description: "A coach robot that never skips the warm-up.",
    look: "Angular robot, digital face panel, sporty accents, thumbs-up arm.",
    productContext: "Fitness coach",
    personality: "Energetic and kind",
  },
  {
    model: "gpt-5.6-terra",
    name: "QA Terra Nori",
    description: "A pantry octopus who tastes every recipe step first.",
    look: "Compact octopus, eight tapered arms, apron accent, cheerful eyes.",
    productContext: "Recipe app",
    personality: "Playful and precise",
  },
  {
    model: "claude-sonnet-5",
    name: "QA Sonnet Hay",
    description: "A careful pika who stacks every coin into neat piles.",
    look: "Round pika, cream belly, seed pouch, soft mountain palette.",
    productContext: "Budgeting app",
    personality: "Careful and proud",
  },
  {
    model: "gpt-5.6-luna",
    name: "QA Luna Zephyr",
    description: "A weather puff that always knows which way the wind is.",
    look: "Soft cloud puff body, wind-swept tuft, sky-blue accents, tiny kite.",
    productContext: "Weather app",
    personality: "Breezy and knowing",
  },
];

export const GESTURES = [
  {
    key: "idle",
    label: "Idle",
    cat: "Core",
    tip: "At rest.",
    use: "Default",
  },
  {
    key: "wave",
    label: "Wave",
    cat: "Delight",
    tip: "Hello.",
    use: "Greeting",
  },
];
