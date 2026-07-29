import { buildPosePack } from "@/lib/example-poses/build-pack";
import { getMascot } from "@/lib/mascots";
import type { GeneratedMascot, MascotModelId } from "@/lib/types";
import type { MascotSlug } from "@/lib/mascots";

const DEFAULT_INSTRUMENT = {
  label: "Signal",
  description: "Intensity",
  lowLabel: "Low",
  midLabel: "Mid",
  highLabel: "High",
  defaultValue: 60,
  ramp: ["#111111", "#333333", "#555555", "#777777", "#999999"] as [
    string,
    string,
    string,
    string,
    string,
  ],
  hidden: true as const,
};

const DEFAULT_THEME = {
  name: "Primary",
  top: "#D7A667",
  mid: "#C98A3B",
  base: "#202A31",
  core: "#F3E8CD",
  stage: "#18241F",
  features: "#12181D",
};

/** Real pose pack shaped like a library/marketplace mascot for remix route tests. */
export function examplePackAsGenerated(
  slug: MascotSlug = "lyra"
): GeneratedMascot {
  const pack = buildPosePack(slug);
  const meta = pack.meta;
  const catalog = getMascot(slug);

  return {
    name: meta?.name ?? catalog?.name ?? "Example",
    tagline: meta?.tagline ?? catalog?.tagline ?? "Friendly helper",
    product: meta?.product ?? catalog?.product ?? "Test app",
    accent: meta?.accent ?? "#D4A843",
    glowLabel: meta?.glowLabel ?? "Spotlight",
    themes: meta?.themes ?? { primary: DEFAULT_THEME },
    instrument:
      meta?.instrument === null
        ? { ...DEFAULT_INSTRUMENT, hidden: true }
        : (meta?.instrument ?? DEFAULT_INSTRUMENT),
    gestures: pack.poses.map((pose) => ({
      key: pose.key,
      label: pose.label,
      cat: pose.cat,
      tip: pose.tip,
      use: pose.use,
      track: pose.track,
      signal: pose.signal,
      svg: pose.svg,
    })),
    parts: [],
  };
}

export function remixIdentityJson(name = "Remixed") {
  return {
    name,
    tagline: "Remixed tagline",
    accent: "#E8A84A",
    instrument: DEFAULT_INSTRUMENT,
    themes: { primary: DEFAULT_THEME },
    palette: {},
    edits: [],
    parts: [],
  };
}

export function remixPoseJson() {
  return { edits: [] };
}

export function remixRequestBody(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    mascotId: "mascot-1",
    name: "Remixed",
    gestures: [
      {
        key: "idle",
        label: "Idle",
        cat: "Core",
        tip: "Rest",
        use: "Home",
      },
    ],
    model: "gpt-5.6-sol" satisfies MascotModelId,
    ...overrides,
  };
}
