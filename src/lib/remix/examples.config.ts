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
  granary: {
    slug: "granary",
    eyesClass: /\bgw-eyes\b/,
    haloClass: /\bgw-halo\b/,
    instrumentClass: /\bgw-cache\b/,
  },
  byte: {
    slug: "byte",
    eyesClass: /\bbt-pupils\b/,
    haloClass: /\bbt-glow\b/,
  },
  numi: {
    slug: "numi",
    eyesClass: /\bnm-pupils\b/,
    haloClass: /\bnm-glow\b/,
    instrumentClass: /\bnm-chips\b/,
  },
  lexa: {
    slug: "lexa",
    eyesClass: /\bnm-pupils\b/,
    haloClass: /\bnm-glow\b/,
    instrumentClass: /\bnm-chips\b/,
  },
  coda: {
    slug: "coda",
    eyesClass: /\bnm-pupils\b/,
    haloClass: /\bnm-glow\b/,
    instrumentClass: /\bnm-chips\b/,
  },
  kelp: {
    slug: "kelp",
    eyesClass: /\bnm-pupils\b/,
    haloClass: /\bnm-glow\b/,
    instrumentClass: /\bnm-chips\b/,
  },
  nori: {
    slug: "nori",
    eyesClass: /\bnm-pupils\b/,
    haloClass: /\bnm-glow\b/,
    instrumentClass: /\bnm-chips\b/,
  },
  hay: {
    slug: "hay",
    eyesClass: /\bhm-pupils\b/,
    haloClass: /\bhm-glow\b/,
  },
  poppy: {
    slug: "poppy",
    eyesClass: /\bms-eyes\b/,
    haloClass: /\bms-glow-halo\b/,
    instrumentClass: /\bms-signal-fan\b/,
  },
  dada: {
    slug: "dada",
    eyesClass: /\bms-eyes\b/,
    haloClass: /\bms-glow-halo\b/,
    instrumentClass: /\bms-signal-fan\b/,
  },
  nox: {
    slug: "nox",
    eyesClass: /\bck-eyes\b/,
    haloClass: /\bck-halo\b/,
  },
  zest: {
    slug: "zest",
    eyesClass: /\bck-eyes\b/,
    haloClass: /\bck-halo\b/,
  },
  quill: {
    slug: "quill",
    eyesClass: /\bck-eyes\b/,
    haloClass: /\bck-halo\b/,
  },
  pip: {
    slug: "pip",
    eyesClass: /\bck-eyes\b/,
    haloClass: /\bck-halo\b/,
  },
  bolt: {
    slug: "bolt",
    eyesClass: /\brt-pupils\b|\bms-eyes\b/,
    haloClass: /\brt-glow\b|\bms-glow-halo\b/,
  },
  relay: {
    slug: "relay",
    eyesClass: /\brt-pupils\b|\bms-eyes\b/,
    haloClass: /\brt-glow\b|\bms-glow-halo\b/,
  },
  orbit: {
    slug: "orbit",
    eyesClass: /\brt-pupils\b|\bms-eyes\b/,
    haloClass: /\brt-glow\b|\bms-glow-halo\b/,
  },
  brew: {
    slug: "brew",
    eyesClass: /\brt-pupils\b|\bms-eyes\b/,
    haloClass: /\brt-glow\b|\bms-glow-halo\b/,
  },
  shade: {
    slug: "shade",
    eyesClass: /\bln-pupils\b|\bms-eyes\b/,
    haloClass: /\bln-glow\b|\bms-glow-halo\b/,
  },
  watt: {
    slug: "watt",
    eyesClass: /\bln-pupils\b|\bms-eyes\b/,
    haloClass: /\bln-glow\b|\bms-glow-halo\b/,
  },
  arc: {
    slug: "arc",
    eyesClass: /\bln-pupils\b|\bms-eyes\b/,
    haloClass: /\bln-glow\b|\bms-glow-halo\b/,
  },
  aura: {
    slug: "aura",
    eyesClass: /\bms-eyes\b/,
    haloClass: /\bob-glow\b|\bms-glow-halo\b/,
  },
  glint: {
    slug: "glint",
    eyesClass: /\bms-eyes\b/,
    haloClass: /\bob-glow\b|\bms-glow-halo\b/,
  },
  trove: {
    slug: "trove",
    eyesClass: /\bms-eyes\b/,
    haloClass: /\bob-glow\b|\bms-glow-halo\b/,
  },
  zephyr: {
    slug: "zephyr",
    eyesClass: /\bms-eyes\b/,
    haloClass: /\bob-glow\b|\bms-glow-halo\b/,
  },
};


export function remixConfigFor(slug: MascotSlug): ExampleRemixConfig {
  return EXAMPLE_REMIX_CONFIG[slug];
}
