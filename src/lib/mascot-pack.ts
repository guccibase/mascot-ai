import {
  ensureThemeContractOnPack,
  normalizeInstrumentDefault,
} from "@/lib/studio-utils";
import type { GeneratedMascot, StudioInstrument } from "@/lib/types";

/** True when the pack's SVG can respond to a live signal / delivery slider. */
export function packHasLiveSignal(
  gestures: Array<{ svg: string }>
): boolean {
  return gestures.some(
    (g) =>
      /\bms-signal-fan\b/.test(g.svg) ||
      /\bms-signal-tint\b/.test(g.svg) ||
      /\bnm-chips\b/.test(g.svg)
  );
}

/**
 * Part key that must stay enabled for the signal slider to apply (null = always on).
 * Octopus chips use `chips`; Lyra-style fans use structural `instrument`.
 */
export function packSignalPartKey(
  gestures: Array<{ svg: string }>
): string | null {
  if (gestures.some((g) => /\bnm-chips\b/.test(g.svg))) return "chips";
  if (gestures.some((g) => /\bms-signal-fan\b/.test(g.svg))) return "instrument";
  return null;
}

/**
 * Normalize a Convex-stored pack into the studio's GeneratedMascot shape.
 * Hides the Signal control when the artwork has no live signal hooks — so a
 * buy-to-own copy never grows a slider the marketplace preview didn't show.
 */
export function toGeneratedMascot(pack: {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  themes: GeneratedMascot["themes"];
  instrument: {
    label: string;
    description: string;
    lowLabel: string;
    midLabel: string;
    highLabel: string;
    defaultValue: number;
    ramp: string[];
    hidden?: boolean;
  };
  gestures: GeneratedMascot["gestures"];
  parts: GeneratedMascot["parts"];
}): GeneratedMascot {
  const ramp = pack.instrument.ramp;
  if (ramp.length !== 5) {
    throw new Error("Invalid mascot pack: instrument.ramp must have 5 colors");
  }
  const live = packHasLiveSignal(pack.gestures);
  const instrument: StudioInstrument = {
    ...pack.instrument,
    defaultValue: normalizeInstrumentDefault(
      pack.instrument.defaultValue,
      50
    ),
    ramp: [ramp[0]!, ramp[1]!, ramp[2]!, ramp[3]!, ramp[4]!],
    // Explicit hide wins; otherwise hide when the SVG can't answer the slider.
    hidden: pack.instrument.hidden === true || !live,
  };
  // Bought / remixed / created packs all open in GeneratedStudio. Re-apply the
  // theme contract so legacy marketplace copies with baked hexes still respond
  // to theme swatches and custom colours.
  return ensureThemeContractOnPack({
    ...pack,
    instrument,
  });
}
