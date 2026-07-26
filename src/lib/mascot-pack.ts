import type { GeneratedMascot } from "@/lib/types";

/** Normalize a Convex-stored pack into the studio's GeneratedMascot shape. */
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
  };
  gestures: GeneratedMascot["gestures"];
  parts: GeneratedMascot["parts"];
}): GeneratedMascot {
  const ramp = pack.instrument.ramp;
  if (ramp.length !== 5) {
    throw new Error("Invalid mascot pack: instrument.ramp must have 5 colors");
  }
  return {
    ...pack,
    instrument: {
      ...pack.instrument,
      defaultValue:
        typeof pack.instrument.defaultValue === "number" &&
        Number.isFinite(pack.instrument.defaultValue)
          ? pack.instrument.defaultValue
          : 50,
      ramp: [ramp[0]!, ramp[1]!, ramp[2]!, ramp[3]!, ramp[4]!],
    },
  };
}
