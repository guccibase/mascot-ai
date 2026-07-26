export type MascotSlug = "lyra" | "sol" | "bud" | "fanous";

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
];

export function getMascot(slug: string): MascotMeta | undefined {
  return MASCOTS.find((m) => m.slug === slug);
}
