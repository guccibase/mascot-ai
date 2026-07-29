export type MascotSlug =
  | "lyra"
  | "sol"
  | "bud"
  | "fanous"
  | "granary"
  | "byte"
  | "numi"
  | "hay"
  | "lexa"
  | "coda"
  | "kelp"
  | "nori"
  | "nox"
  | "zest"
  | "quill"
  | "pip"
  | "bolt"
  | "relay"
  | "orbit"
  | "brew"
  | "shade"
  | "watt"
  | "arc"
  | "aura"
  | "glint"
  | "trove"
  | "zephyr";


export type MascotMeta = {
  slug: MascotSlug;
  name: string;
  tagline: string;
  product: string;
  accent: string;
  stage: string;
  poseCount: number;
  blurb: string;
};

export const MASCOTS: MascotMeta[] = [
  {
    slug: "lyra",
    name: "Lyra",
    tagline: "Lyrebird coach with a living spectrogram tail",
    product: "Orator AI",
    accent: "#C9A45C",
    stage: "#1A2438",
    poseCount: 22,
    blurb:
      "Speech coaching companion. Score-driven lyre feathers, mic posture, and rehearsal poses.",
  },
  {
    slug: "sol",
    name: "Sol",
    tagline: "A sunrise orb that speaks in light",
    product: "Alarm app",
    accent: "#F5B34F",
    stage: "#232B47",
    poseCount: 15,
    blurb:
      "Wake-light blob with a sun-core nucleus. Emotions show up as flares of light, not a generic face.",
  },
  {
    slug: "bud",
    name: "Bud",
    tagline: "Dawn chick with alarm-bell feet",
    product: "Buddy",
    accent: "#F0A35A",
    stage: "#2A2438",
    poseCount: 16,
    blurb:
      "Round rooster chick for morning rituals: crow, snooze, sunrise, and a little grumpy.",
  },
  {
    slug: "fanous",
    name: "Fanous",
    tagline: "Ramadan lantern companion",
    product: "Islamic app",
    accent: "#D4AF37",
    stage: "#0D1426",
    poseCount: 30,
    blurb:
      "Traced lantern character with prayer, festival, and everyday companion gestures.",
  },
  {
    slug: "granary",
    name: "Granary",
    tagline: "Acorn woodpecker who keeps every useful find",
    product: "Knowledge workspace",
    accent: "#E8A84A",
    stage: "#18241F",
    poseCount: 24,
    blurb:
      "Clown-faced acorn woodpecker with a living oak cache, collaborative archive actions, and clear retrieval signals.",
  },
  {
    slug: "byte",
    name: "Byte",
    tagline: "Friendly robot with a digital face for learning to code",
    product: "Coding Education App",
    accent: "#5EC4B0",
    stage: "#152028",
    poseCount: 37,
    blurb:
      "Round-headed coding buddy with an LED face panel, spring antenna, and full Core / Moods / Action / Feedback gesture set.",
  },
  {
    slug: "numi",
    name: "Numi",
    tagline: "Clever octopus solving eight calculations at once",
    product: "Mathematics App",
    accent: "#8B6FD4",
    stage: "#191A2E",
    poseCount: 38,
    blurb:
      "Eight-armed math companion with tapered suckered arms, a chalk slate, arm-tip digit chips, and twelve toggleable elements across the full Core / Moods / Action / Feedback gesture set — including a real swimming gait.",
  },
  {
    slug: "lexa",
    name: "Lexa",
    tagline: "Eight tongues, one curious traveler under ink-dark seas",
    product: "Language App",
    accent: "#5B6FE8",
    stage: "#141828",
    poseCount: 38,
    blurb:
      "Tall peaked-mantle language octopus with ink-bar pupils, scholar beret, wire glasses, phrasebook, and hex letter chips.",
  },
  {
    slug: "coda",
    name: "Coda",
    tagline: "A reef-born accompanist keeping tempo on every arm",
    product: "Music Practice App",
    accent: "#E07A6A",
    stage: "#241818",
    poseCount: 38,
    blurb:
      "Wide reef-mantle music octopus with ring pupils, coral crown, ear-fins, and diamond note chips on every arm tip.",
  },
  {
    slug: "kelp",
    name: "Kelp",
    tagline: "Eight limbs, zero excuses — your underwater workout buddy",
    product: "Fitness App",
    accent: "#3DB88A",
    stage: "#122018",
    poseCount: 38,
    blurb:
      "Compact pear-mantle fitness octopus with fierce pupils, coconut-shell helmet, sweatband, and soft rep chips.",
  },
  {
    slug: "nori",
    name: "Nori",
    tagline: "A pantry octopus who tastes every step before you do",
    product: "Recipe App",
    accent: "#D4784A",
    stage: "#221810",
    poseCount: 38,
    blurb:
      "Round dumpling-mantle cook octopus with sesame pupils, chef toque, apron bib, stubby arms, and ingredient chips.",
  },
  {
    slug: "hay",
    name: "Hay",
    tagline: "Careful pika who stacks every coin",
    product: "Budgeting App",
    accent: "#D4A84B",
    stage: "#221C16",
    poseCount: 37,
    blurb:
      "App-friendly American pika with short rounded ears, mitten paws, and realistic SVG coins across the full Core / Moods / Action / Feedback gesture set.",
  },
  {
    slug: "nox",
    name: "Nox",
    tagline: "Barn owl chick who guards the deep-work hour",
    product: "Focus Timer App",
    accent: "#C4A35A",
    stage: "#1A1624",
    poseCount: 37,
    blurb:
      "Duo-grade barn owl with amber-iris eyes, heart facial disk, ear-tuft notch, and a classic hourglass perch — full 37-pose set.",
  },
  {
    slug: "zest",
    name: "Zest",
    tagline: "Hummingbird chick who never drops a streak",
    product: "Habit Tracker App",
    accent: "#3DB88A",
    stage: "#122018",
    poseCount: 37,
    blurb:
      "Jewel hummingbird with bead eyes, needle beak, horizontal wings, forked scissor tail, and nectar flower — full 37-pose set.",
  },
  {
    slug: "quill",
    name: "Quill",
    tagline: "Magpie chick who collects every useful thought",
    product: "Journal App",
    accent: "#6B7AB8",
    stage: "#14161E",
    poseCount: 37,
    blurb:
      "Tall magpie with clever almond eyes, white bib, filled plume fan, and side inkwell — full 37-pose set.",
  },
  {
    slug: "pip",
    name: "Pip",
    tagline: "Puffin chick who keeps the crew in sync",
    product: "Team Check-in App",
    accent: "#E07A5A",
    stage: "#141C24",
    poseCount: 37,
    blurb:
      "Chunky puffin with mirrored face wedges, banded triangular bill, webbed feet, and striped buoy — full 37-pose set.",
  },
  {
    slug: "bolt",
    name: "Bolt",
    tagline: "Angular coach robot that never skips the warm-up",
    product: "Fitness Coach App",
    accent: "#FF6B4A",
    stage: "#1A1214",
    poseCount: 37,
    blurb:
      "Hex-headed athlete with spike antenna, heart-rate chest, roller blades, and the full Core / Moods / Action / Feedback set.",
  },
  {
    slug: "relay",
    name: "Relay",
    tagline: "Headset helper who turns every ticket into a high-five",
    product: "Customer Support App",
    accent: "#4AA3E0",
    stage: "#121C28",
    poseCount: 37,
    blurb:
      "Soft support bot with boom mic, headset cups, ticket badge, and toggleable studio parts across all 37 gestures.",
  },
  {
    slug: "orbit",
    name: "Orbit",
    tagline: "Dome-headed space guide for first trips past the moon",
    product: "Kids Space Learning App",
    accent: "#7B6FE0",
    stage: "#12101E",
    poseCount: 37,
    blurb:
      "Astronaut dome with sat dish, planet badge, boot thrusters, and a full 37-pose studio for curious explorers.",
  },
  {
    slug: "brew",
    name: "Brew",
    tagline: "Flat-top barista bot pouring loyalty into every cup",
    product: "Cafe Loyalty App",
    accent: "#C4784A",
    stage: "#1A1410",
    poseCount: 37,
    blurb:
      "Espresso chassis with steam plume, cup-handle ears, latte-art chest, and every Core / Moods / Action / Feedback pose.",
  },
  {
    slug: "shade",
    name: "Shade",
    tagline: "Soft mushroom lamp who dims the day into sleep",
    product: "Sleep Wind-down App",
    accent: "#9B8CDB",
    stage: "#1A1628",
    poseCount: 37,
    blurb:
      "Wide dome table lamp with sleepy oval eyes, a thin stem, weighted base, and moon charm — full Core / Moods / Action / Feedback set.",
  },
  {
    slug: "watt",
    name: "Watt",
    tagline: "Edison bulb who sparks every half-formed idea",
    product: "Idea Capture App",
    accent: "#E8A84A",
    stage: "#241810",
    poseCount: 37,
    blurb:
      "Pear-shaped Edison bulb with round sparkle eyes, living filament, screw-cap base, and idea-spark accessory across all 37 gestures.",
  },
  {
    slug: "arc",
    name: "Arc",
    tagline: "Desk lamp who bends every study session into focus",
    product: "Study Focus App",
    accent: "#5B8FD9",
    stage: "#141820",
    poseCount: 37,
    blurb:
      "Anglepoise desk lamp with HUD slit eyes, articulated spring arm, weighted base, and sticky-note accessory — full 37-pose studio.",
  },
  {
    slug: "aura",
    name: "Aura",
    tagline: "A tall dawn pill that breathes with you",
    product: "Meditation App",
    accent: "#B8A0E0",
    stage: "#1A1628",
    poseCount: 37,
    blurb:
      "Elongated soft pill with crescent moon eyes, a pale lunar core, and breath-rings — full Core / Moods / Action / Feedback set.",
  },
  {
    slug: "glint",
    name: "Glint",
    tagline: "A living aperture that catches every good light",
    product: "Photo Filters App",
    accent: "#E07898",
    stage: "#241018",
    poseCount: 37,
    blurb:
      "Rounded diamond body with rhombus eyes, aperture nucleus, and shutter-blade rays across all 37 gestures.",
  },
  {
    slug: "trove",
    name: "Trove",
    tagline: "A soft vault that grows every quiet deposit",
    product: "Savings App",
    accent: "#D4A84B",
    stage: "#1C1A14",
    poseCount: 37,
    blurb:
      "Wide squircle vault with coin-slot eyes, gold-coin core, and a sprouting leaf crown — every pose toggleable.",
  },
  {
    slug: "zephyr",
    name: "Zephyr",
    tagline: "A weather puff that always knows which way the wind is",
    product: "Weather App",
    accent: "#5AA8E0",
    stage: "#121C28",
    poseCount: 37,
    blurb:
      "Scalloped cloud form with bubbly round eyes, sun-peek core, and wind wisps — full 37-pose studio.",
  },
];

/** Public marketing examples — home, footer, sitemap, onboarding, ungated studios. */
export const PUBLIC_EXAMPLE_SLUGS = [
  "lyra",
  "sol",
  "bud",
  "fanous",
] as const satisfies readonly MascotSlug[];

export type PublicExampleSlug = (typeof PUBLIC_EXAMPLE_SLUGS)[number];

export type PublicExampleMeta = MascotMeta & { slug: PublicExampleSlug };

const PUBLIC_EXAMPLE_SLUG_SET = new Set<string>(PUBLIC_EXAMPLE_SLUGS);

export function isPublicExampleSlug(slug: string): slug is PublicExampleSlug {
  return PUBLIC_EXAMPLE_SLUG_SET.has(slug);
}

export const PUBLIC_EXAMPLES: PublicExampleMeta[] = MASCOTS.filter(
  (m): m is PublicExampleMeta => isPublicExampleSlug(m.slug)
);

/** Catalog entries reserved for admin (Library → Generated + gated /studio). */
export const ADMIN_GENERATED_EXAMPLES: MascotMeta[] = MASCOTS.filter(
  (m) => !isPublicExampleSlug(m.slug)
);

export function getMascot(slug: string): MascotMeta | undefined {
  return MASCOTS.find((m) => m.slug === slug);
}
