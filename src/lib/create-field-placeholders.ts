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
    slug: "granary",
    name: "Granary",
    description:
      "A communal acorn woodpecker that collects, organizes, and retrieves every useful find.",
    look:
      "Clown-like cream face mask, charcoal plumage, red crown, pale eyes, chisel bill, white wing patches, oak branch, and a living acorn cache.",
    productContext: "Collaborative knowledge workspace and research archive",
    personality: "Sharp, generous, quietly proud of a well-kept collection",
  },
  {
    slug: "byte",
    name: "Byte",
    description:
      "A friendly robot with a digital face that helps users learn programming and fix coding mistakes.",
    look:
      "Round mint robot head with LED face panel, spring antenna with glowing tip, chunky torso with code vent, symmetric mitten arms, stubby wheeled feet.",
    productContext: "Coding education and learn-to-code companion app",
    personality: "Patient coach, celebrates clean builds, kind about bugs",
  },
  {
    slug: "numi",
    name: "Numi",
    description:
      "A clever octopus that works through several calculations at once, one on each of its eight arms.",
    look:
      "Tall violet mantle dome, wide-set eyes with slit pupils, eight tapered suckered arms fanning from the mantle base, a chalk slate, and digit chips at the arm tips.",
    productContext: "Mathematics practice and mental-arithmetic app",
    personality: "Quick, patient, quietly delighted by an elegant solution",
  },
  {
    slug: "lexa",
    name: "Lexa",
    description:
      "A language-learning octopus with a tall peaked mantle, ink-bar pupils, and letter chips on every arm.",
    look:
      "Tall peaked violet-blue mantle, vertical ink-bar pupils, scholar beret, rectangular reading glasses, phrasebook slate, hex letter chips.",
    productContext: "Language learning and translation practice app",
    personality: "Curious traveler, patient with mistakes, celebrates first phrases",
  },
  {
    slug: "coda",
    name: "Coda",
    description:
      "A music-practice octopus with a wide reef mantle, ring pupils, and a coral crown.",
    look:
      "Wide coral reef mantle, concentric ring pupils, coral crown, ear-fins, diamond note chips at the arm tips.",
    productContext: "Music practice and rhythm coaching app",
    personality: "Warm accompanist, exact about tempo, generous with encores",
  },
  {
    slug: "kelp",
    name: "Kelp",
    description:
      "A fitness octopus with a compact pear mantle, fierce pupils, and a coconut-shell helmet.",
    look:
      "Compact pear-green mantle, fierce grit-bar pupils, coconut shell helmet, sweatband, soft rounded rep chips.",
    productContext: "Fitness and wellness coaching app",
    personality: "Encouraging coach, zero shame, celebrates every finished set",
  },
  {
    slug: "nori",
    name: "Nori",
    description:
      "A recipe octopus with a round dumpling mantle, sesame pupils, chef toque, and an apron bib.",
    look:
      "Round warm dumpling mantle, tilted sesame-seed pupils, chef toque, apron bib, stubby arms, ingredient chips.",
    productContext: "Home cooking and recipe companion app",
    personality: "Taste-first, unfussy, delighted by a well-timed simmer",
  },
  {
    slug: "hay",
    name: "Hay",
    description:
      "A careful American pika who helps users save, budget, and stack every coin.",
    look:
      "Compact potato body, oversized head, short rounded ears with dark tips, whiskers, button nose, mitten paws, soft belly patch, and realistic gold/silver/copper SVG coins.",
    productContext: "Personal budgeting and savings companion app",
    personality: "Thrifty, cheerful, careful with money, never shames a miss",
  },
  {
    slug: "poppy",
    name: "Pixel Poppy",
    description:
      "A bright-eyed poppy who cheers users through onboarding, empty states, and tiny wins.",
    look:
      "Rounded red poppy head with scalloped petal circles, dark charcoal seed face, white eye dots, green leaf bow limbs, soft orange pollen mote, and a seven-blade pollen meter fan.",
    productContext: "Onboarding, empty states, loading screens, and micro-interaction rewards",
    personality: "Optimistic, encouraging, lightweight, playful without chaos",
  },
  {
    slug: "dada",
    name: "Dada",
    description:
      "A bright-eyed rose who blooms with every little joy through onboarding and tiny wins.",
    look:
      "Pink rose head with outer and inner petals, cream golden flower face, big oval eyes, green stem body, leaf bow, stick limbs, and a Rose Radiance meter fan.",
    productContext: "Joyful onboarding, empty states, and celebration micro-interactions",
    personality: "Warm, bright-eyed, blooms with every little joy",
  },
  {
    slug: "nox",
    name: "Nox",
    description:
      "A barn owl chick who guards deep-work sessions and settles in as focus locks.",
    look:
      "Round facial disk, oversized amber-iris eyes, ear tufts, short hooked beak, stocky pear body, soft rounded wings, hourglass perch, timer chest badge.",
    productContext: "Focus timer and deep-work companion app",
    personality: "Quiet, steady, celebrates locked-in focus without pressure",
  },
  {
    slug: "zest",
    name: "Zest",
    description:
      "A hummingbird chick who cheers every habit check-in and every tiny streak.",
    look:
      "Tiny jewel body, long dark needle beak, tiny bead eyes, horizontal blur wings, forked trail, nectar bloom perch, checkmark chest badge.",
    productContext: "Habit tracker and streak companion app",
    personality: "Energetic, encouraging, celebrates small wins loudly",
  },
  {
    slug: "quill",
    name: "Quill",
    description:
      "A magpie chick who welcomes rough thoughts and first sentences.",
    look:
      "Sleek elongated body, tall clever white-sclera eyes, pointed beak, black plumage with white face and bib, graduated feather tail, inkwell perch, notebook chest badge.",
    productContext: "Journaling and personal writing app",
    personality: "Curious collector, patient with blank pages, loves a finished entry",
  },
  {
    slug: "pip",
    name: "Pip",
    description:
      "A puffin chick who keeps the crew checking in and everyone included.",
    look:
      "Upright football body, tall banded triangular beak, mask eye patches, gray cheeks, stubby flipper wings, orange webbed feet, buoy perch, chat chest badge.",
    productContext: "Team check-in and standup companion app",
    personality: "Friendly facilitator, keeps everyone included, never awkward",
  },
  {
    slug: "bolt",
    name: "Bolt",
    description:
      "An angular fitness coach robot that counts every rep and never skips the warm-up.",
    look:
      "Hex-headed coral athlete robot, spike antenna, shoulder pads, heart-rate chest monitor, roller-blade feet.",
    productContext: "Fitness coaching and workout companion app",
    personality: "Encouraging coach, zero shame, celebrates finished sets",
  },
  {
    slug: "relay",
    name: "Relay",
    description:
      "A soft headset support robot who turns every ticket into a high-five.",
    look:
      "Sky-blue rounded robot with boom mic, headset cups, ticket badge on chest, soft caster feet.",
    productContext: "Customer support and helpdesk companion app",
    personality: "Patient helper, clear, celebrates resolved tickets",
  },
  {
    slug: "orbit",
    name: "Orbit",
    description:
      "A dome-headed space guide who makes the solar system feel reachable for kids.",
    look:
      "Violet astronaut dome helmet, satellite dish antenna, planet badge chest, chunky boot thrusters.",
    productContext: "Kids space learning and astronomy exploration app",
    personality: "Wonder-filled guide, patient with big questions, loves first discoveries",
  },
  {
    slug: "brew",
    name: "Brew",
    description:
      "A flat-top barista bot who pours loyalty into every cup.",
    look:
      "Espresso-brown flat-top robot, steam plume antenna, cup-handle ears, latte-art chest, stubby boots.",
    productContext: "Cafe loyalty and coffee rewards app",
    personality: "Warm host, remembers regulars, never rushes the pour",
  },
  {
    slug: "shade",
    name: "Shade",
    description:
      "A soft mushroom table lamp who dims the day into sleep.",
    look:
      "Wide dome shade head with large sleepy oval eyes, thin stem, weighted round base, moon charm.",
    productContext: "Sleep wind-down and bedtime routine app",
    personality: "Gentle, unhurried, never shames a late night",
  },
  {
    slug: "watt",
    name: "Watt",
    description:
      "An Edison bulb who sparks every half-formed idea into something keepable.",
    look:
      "Pear glass bulb body, round sparkle eyes, visible filament, brass screw-cap base, idea-spark accessory.",
    productContext: "Idea capture and brainstorm notes app",
    personality: "Curious spark-catcher, celebrates rough drafts",
  },
  {
    slug: "arc",
    name: "Arc",
    description:
      "An anglepoise desk lamp who bends every study session into focus.",
    look:
      "Conical shade head with rectangular HUD eyes, articulated spring arm, heavy round base, sticky-note accessory.",
    productContext: "Study focus and homework companion app",
    personality: "Steady coach, exact about deadlines, warm about progress",
  },
  {
    slug: "aura",
    name: "Aura",
    description:
      "A tall soft pill of dawn light that breathes with every meditation session.",
    look:
      "Elongated soft pill silhouette, crescent moon eyes, pale lunar core, breath-ring crown, lotus badge.",
    productContext: "Meditation and mindfulness companion app",
    personality: "Calm presence, never rushes the breath, soft about missed days",
  },
  {
    slug: "glint",
    name: "Glint",
    description:
      "A living aperture that catches every good light before you do.",
    look:
      "Rounded diamond body, sharp rhombus eyes, aperture iris nucleus, shutter-blade rays, camera badge.",
    productContext: "Photo filters and camera editing app",
    personality: "Tasteful editor, celebrates the keepers, never harsh about rejects",
  },
  {
    slug: "trove",
    name: "Trove",
    description:
      "A soft vault that grows every quiet deposit into something sturdy.",
    look:
      "Wide Apple squircle body, flat coin-slot eyes, gold coin core, sprouting leaf crown, coin badge.",
    productContext: "Savings and investing companion app",
    personality: "Patient saver, proud of small wins, never scolds a spend",
  },
  {
    slug: "zephyr",
    name: "Zephyr",
    description:
      "A weather puff that always knows which way the wind is turning.",
    look:
      "Scalloped cloud silhouette, big bubbly round eyes, sun-peek core, wind wisps, weather badge.",
    productContext: "Weather forecast companion app",
    personality: "Cheerful guide, clear about storms, soft about rainy days",
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
