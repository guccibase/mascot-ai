import type { MascotSlug } from "@/lib/mascots";

export type CreateBriefPreset = {
  slug?: MascotSlug;
  name: string;
  description: string;
  look: string;
  productContext: string;
  personality: string;
};

/** Static hint copy when a field already has a value. */
export const CREATE_FIELD_PLACEHOLDERS = {
  name: "e.g. Nori, Pixel, Hearth",
  description: "A soft moss fox that helps with focus sessions…",
  look: "Round soft body, big glossy eyes, moss-green fur with warm lantern orange accents, tiny satchel, cozy not cutesy…",
  productContext: "Focus timer, fitness coach, Quran app…",
  personality: "Warm, slightly mischievous, never loud",
} as const;

export const CREATE_BRIEF_PRESETS: CreateBriefPreset[] = [
  {
    name: "Nori",
    description:
      "A soft moss fox that nudges you back into focus when your mind wanders.",
    look:
      "Round soft body, big glossy eyes, moss-green fur with warm lantern orange accents, tiny satchel, cozy not cutesy.",
    productContext: "Focus timer and deep-work companion",
    personality: "Warm, slightly mischievous, never loud",
  },
  {
    slug: "lyra",
    name: "Lyra",
    description:
      "A lyrebird speech coach whose tail feathers read like a live delivery spectrogram.",
    look:
      "Slim bird silhouette, nine feather paths fanned from one score input, violet-to-amber ramp, mic prop, rehearsal posture.",
    productContext: "Public speaking and presentation coach",
    personality: "Encouraging, precise, celebrates small wins",
  },
  {
    slug: "sol",
    name: "Sol",
    description:
      "A sunrise orb that wakes you with light, not noise. Emotions show up as flares.",
    look:
      "Soft living drop silhouette, bright sun-core nucleus, ground light pool instead of shadow, shimmer sweep, no generic blob face.",
    productContext: "Gentle alarm and morning ritual app",
    personality: "Bright, patient, a little sleepy before dawn",
  },
  {
    slug: "bud",
    name: "Bud",
    description:
      "A round dawn-orange rooster chick with tiny alarm-bell feet for morning rituals.",
    look:
      "Plump chick body, small comb, symmetric wings, brass bell feet, peach belly, warm glow. Playful, not babyish.",
    productContext: "AI alarm and habit streak app",
    personality: "Cheerful, gently grumpy when snoozed",
  },
  {
    slug: "fanous",
    name: "Fanous",
    description:
      "A Ramadan lantern companion that guides prayer times and everyday moments.",
    look:
      "Traced lantern silhouette, smooth bell dome, chunky mitten arms, stadium rings, gold face glow, teal midnight body.",
    productContext: "Islamic prayer and Ramadan companion",
    personality: "Calm, welcoming, quietly joyful at iftar",
  },
  {
    name: "Pixel",
    description:
      "A retro game sprite come alive. Your inventory guide and quest hint-giver.",
    look:
      "Chunky 16-bit proportions, limited palette, crisp pixel edges, bobbing idle, cape or pouch accessory, readable at 32px.",
    productContext: "Indie game launcher and community hub",
    personality: "Snarky, loyal, drops hints without spoiling",
  },
  {
    name: "Hearth",
    description:
      "A hearth-spirit that keeps couples and roommates aligned on shared chores.",
    look:
      "Small ember creature with stone-and-copper accents, soft flame hair, cozy scarf, warm amber core light.",
    productContext: "Shared household task app",
    personality: "Fair, playful mediator, never guilt-trips",
  },
];

export function briefForSlug(slug: MascotSlug): CreateBriefPreset | undefined {
  return CREATE_BRIEF_PRESETS.find((p) => p.slug === slug);
}

export function pickRandomBrief(): CreateBriefPreset {
  return CREATE_BRIEF_PRESETS[
    Math.floor(Math.random() * CREATE_BRIEF_PRESETS.length)
  ]!;
}

export function pickRandomBriefField<
  K extends Exclude<keyof CreateBriefPreset, "slug">,
>(field: K): string {
  return pickRandomBrief()[field];
}
