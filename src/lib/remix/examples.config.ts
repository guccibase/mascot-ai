import type { MascotSlug } from "@/lib/mascots";
import type { ExampleRemixConfig } from "./types";

export const EXAMPLE_REMIX_CONFIG: Record<MascotSlug, ExampleRemixConfig> = {
  lyra: {
    slug: "lyra",
    eyesClass: /\blv-eyes\b/,
    haloClass: /\blv-glow\b/,
    instrumentClass: /\blv-tail\b|\bms-signal-fan\b/,
  },
  sol: {
    slug: "sol",
    eyesClass: /\bsd-eyes\b/,
    haloClass: /\bsd-glow\b/,
  },
  bud: {
    slug: "bud",
    eyesClass: /\bbd-pupils\b/,
    haloClass: /\bbd-glow\b/,
  },
  fanous: {
    slug: "fanous",
    eyesClass: /\blm-eyes\b/,
    haloClass: /\blm-glow\b/,
  },
};

export function remixConfigFor(slug: MascotSlug): ExampleRemixConfig {
  return EXAMPLE_REMIX_CONFIG[slug];
}
