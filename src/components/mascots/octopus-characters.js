/**
 * Character kits for the shared octopus studio engine.
 * Each sibling uses a distinct body build (silhouette / face / costume),
 * not just a theme swap of Numi.
 */

import {
  BUILD_NUMI,
  BUILD_LEXA,
  BUILD_CODA,
  BUILD_KELP,
  BUILD_NORI,
} from "./octopus-bodies";

const mathRamp = ["#6E79C4", "#8B6FD4", "#54D6C0", "#F0C05A"];

export const NUMI = {
  slug: "numi",
  name: "Numi",
  product: "Mathematics App",
  tagline: "Clever octopus solving eight calculations at once",
  title: "Numi, the mathematics octopus",
  brand: "#8B6FD4",
  defaultTheme: "abacus",
  build: BUILD_NUMI,
  writingGlyph: "=",
  glowLabel: "Chalk glow",
  chipSymbols: {
    l: ["+", "\u2212", "\u00D7", "\u00F7"],
    r: ["=", "\u221A", "\u03C0", "%"],
  },
  partLabels: {
    slate: "Chalk slate",
    chips: "Digit chips",
  },
  solve: {
    label: "Solve",
    zones: ["Stuck", "Solving", "Solved"],
    hint: "Arm-tip digit chips light as the answer comes into focus.",
    dragHint: "drag Solve. Arm chips light with one ramp",
    ramp: mathRamp,
  },
  themes: {
    abacus: { name: "Abacus Violet", body: "#8B6FD4", belly: "#F2E6FF", slate: "#1D2436", accent: "#54D6C0", stage: "#191A2E" },
    coral: { name: "Coral Count", body: "#E5836B", belly: "#FFEDE2", slate: "#2A2130", accent: "#4FC8C0", stage: "#241A24" },
    lagoon: { name: "Lagoon Lattice", body: "#4FA2C8", belly: "#E4F5FB", slate: "#152A34", accent: "#6FE0B4", stage: "#132430" },
    ink: { name: "Ink Blackboard", body: "#6E79C4", belly: "#EAEDFF", slate: "#141828", accent: "#7ADCC8", stage: "#12162A" },
    sunset: { name: "Sunset Sum", body: "#D0729C", belly: "#FFE8F1", slate: "#241A2C", accent: "#F0C05A", stage: "#221726" },
  },
};

/** Language-learning octopus — phrasebook + letter chips. */
export const LEXA = {
  slug: "lexa",
  name: "Lexa",
  product: "Language App",
  tagline: "Eight tongues, one curious traveler under ink-dark seas",
  title: "Lexa, the language octopus",
  brand: "#5B6FE8",
  defaultTheme: "inkwell",
  build: BUILD_LEXA,
  eyeTrack: { l: 176, r: 244, y: 198 },
  writingGlyph: "あ",
  glowLabel: "Ink glow",
  chipSymbols: {
    l: ["A", "あ", "字", "أ"],
    r: ["ñ", "ü", "ß", "ø"],
  },
  partLabels: {
    slate: "Phrasebook",
    chips: "Letter chips",
    cap: "Scholar beret",
    specs: "Reading glasses",
  },
  solve: {
    label: "Fluency",
    zones: ["Lost", "Learning", "Fluent"],
    hint: "Letter chips light as the phrase clicks into place.",
    dragHint: "drag Fluency. Letter chips light with one ramp",
    ramp: ["#4A5BC7", "#5B6FE8", "#7AD4C8", "#F2C14E"],
  },
  themes: {
    inkwell: { name: "Inkwell Indigo", body: "#5B6FE8", belly: "#E8ECFF", slate: "#1A1F38", accent: "#7AD4C8", stage: "#141828" },
    parchment: { name: "Parchment Tide", body: "#C4A574", belly: "#FFF6E8", slate: "#2A241C", accent: "#5B8FE8", stage: "#221C16" },
    sakura: { name: "Sakura Script", body: "#E08AA8", belly: "#FFE8F0", slate: "#2A1A22", accent: "#6EC4B8", stage: "#24141C" },
    celadon: { name: "Celadon Calligraphy", body: "#5FA892", belly: "#E4F7F0", slate: "#152820", accent: "#E0B45A", stage: "#122018" },
    midnight: { name: "Midnight Lexicon", body: "#6E7AB8", belly: "#ECEFFF", slate: "#12162A", accent: "#E88A9C", stage: "#10142A" },
  },
};

/** Music-practice octopus — coral reef + note chips. */
export const CODA = {
  slug: "coda",
  name: "Coda",
  product: "Music Practice App",
  tagline: "A reef-born accompanist keeping tempo on every arm",
  title: "Coda, the music octopus",
  brand: "#E07A6A",
  defaultTheme: "reef",
  build: BUILD_CODA,
  eyeTrack: { l: 158, r: 262, y: 216 },
  writingGlyph: "♪",
  glowLabel: "Stage glow",
  chipSymbols: {
    l: ["♪", "♫", "𝄞", "𝄢"],
    r: ["♯", "♭", "4/4", "♩"],
  },
  partLabels: {
    slate: "Sheet music",
    chips: "Note chips",
    cap: "Coral crown",
  },
  solve: {
    label: "Tempo",
    zones: ["Off-beat", "In time", "Encore"],
    hint: "Note chips light as the phrase locks to the beat.",
    dragHint: "drag Tempo. Note chips light with one ramp",
    ramp: ["#C45A6E", "#E07A6A", "#F0C05A", "#6EC8C0"],
  },
  themes: {
    reef: { name: "Coral Reef", body: "#E07A6A", belly: "#FFE8E2", slate: "#2A1E24", accent: "#6EC8C0", stage: "#241818" },
    jazz: { name: "Jazz Midnight", body: "#6B5B8C", belly: "#F0E8FF", slate: "#1A1628", accent: "#E0A84A", stage: "#161220" },
    seafoam: { name: "Seafoam Score", body: "#4EB8A8", belly: "#E4F8F4", slate: "#142824", accent: "#E07A6A", stage: "#12201C" },
    sunset: { name: "Sunset Sonata", body: "#D4846A", belly: "#FFF0E6", slate: "#2A2018", accent: "#7A9CE0", stage: "#221810" },
    pearl: { name: "Pearl Concerto", body: "#B8A0C8", belly: "#F8F0FF", slate: "#221828", accent: "#E8B45A", stage: "#1A1422" },
  },
};

/** Fitness / wellness octopus — kelp green coach. */
export const KELP = {
  slug: "kelp",
  name: "Kelp",
  product: "Fitness App",
  tagline: "Eight limbs, zero excuses — your underwater workout buddy",
  title: "Kelp, the fitness octopus",
  brand: "#3DB88A",
  defaultTheme: "tide",
  build: BUILD_KELP,
  eyeTrack: { l: 168, r: 252, y: 228 },
  writingGlyph: "♥",
  glowLabel: "Energy glow",
  chipSymbols: {
    l: ["5", "10", "15", "20"],
    r: ["GO", "SET", "REP", "MAX"],
  },
  partLabels: {
    slate: "Workout card",
    chips: "Rep chips",
    cap: "Sweatband",
  },
  solve: {
    label: "Energy",
    zones: ["Resting", "Working", "Peak"],
    hint: "Rep chips light as the set builds toward the finish.",
    dragHint: "drag Energy. Rep chips light with one ramp",
    ramp: ["#2A8A6A", "#3DB88A", "#F0C05A", "#E06A6A"],
  },
  themes: {
    tide: { name: "Tide Pool", body: "#3DB88A", belly: "#E4F8F0", slate: "#142820", accent: "#F0C05A", stage: "#122018" },
    sunrise: { name: "Sunrise Sprint", body: "#E08A5A", belly: "#FFF0E4", slate: "#2A2018", accent: "#3DB88A", stage: "#221810" },
    deep: { name: "Deep Current", body: "#3A8AA8", belly: "#E4F4F8", slate: "#142028", accent: "#E08A5A", stage: "#121820" },
    moss: { name: "Moss Trail", body: "#6A9A4A", belly: "#F0F8E4", slate: "#1C2414", accent: "#E0A84A", stage: "#161C12" },
    dusk: { name: "Dusk Cool-down", body: "#5A8AB8", belly: "#E8F0F8", slate: "#141C28", accent: "#E08A9A", stage: "#121820" },
  },
};

/** Home-cooking octopus — pantry-warm Nori. */
export const NORI = {
  slug: "nori",
  name: "Nori",
  product: "Recipe App",
  tagline: "A pantry octopus who tastes every step before you do",
  title: "Nori, the recipe octopus",
  brand: "#D4784A",
  defaultTheme: "miso",
  build: BUILD_NORI,
  eyeTrack: { l: 168, r: 252, y: 224 },
  writingGlyph: "★",
  glowLabel: "Kitchen glow",
  chipSymbols: {
    l: ["S", "G", "L", "C"],
    r: ["1c", "½t", "2T", "°F"],
  },
  partLabels: {
    slate: "Recipe card",
    chips: "Ingredient chips",
    cap: "Chef toque",
  },
  solve: {
    label: "Flavor",
    zones: ["Bland", "Simmering", "Delicious"],
    hint: "Ingredient chips light as the dish comes together.",
    dragHint: "drag Flavor. Ingredient chips light with one ramp",
    ramp: ["#B85A3A", "#D4784A", "#E8B45A", "#5AA88A"],
  },
  themes: {
    miso: { name: "Miso Warmth", body: "#D4784A", belly: "#FFF0E4", slate: "#2A1E16", accent: "#5AA88A", stage: "#221810" },
    matcha: { name: "Matcha Steam", body: "#6A9A5A", belly: "#F0F8E8", slate: "#1C2416", accent: "#D4784A", stage: "#161C12" },
    berry: { name: "Berry Compote", body: "#C45A7A", belly: "#FFE8F0", slate: "#2A1820", accent: "#E8B45A", stage: "#22141A" },
    citrus: { name: "Citrus Zest", body: "#E0A84A", belly: "#FFF8E8", slate: "#2A2414", accent: "#5A8AB8", stage: "#221C10" },
    charcoal: { name: "Charcoal Grill", body: "#6A6A78", belly: "#F0F0F4", slate: "#1A1A22", accent: "#E08A4A", stage: "#141418" },
  },
};

export const OCTOPUS_CHARACTERS = [NUMI, LEXA, CODA, KELP, NORI];
