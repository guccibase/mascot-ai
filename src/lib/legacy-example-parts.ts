import type { MascotPart } from "@/lib/types";

/** Element catalogs for the four hand-authored example studios (Sol, Lyra, Bud, Fanous). */
export const SOL_PARTS: MascotPart[] = [
  { key: "pool", label: "Light pool", category: "Stage" },
  { key: "halo", label: "Glow halo", category: "Light" },
  { key: "body", label: "Body", category: "Core" },
  { key: "core", label: "Sun core", category: "Core" },
  { key: "gleam", label: "Shimmer", category: "Light" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "eyes", label: "Eyes", category: "Face", essential: true },
  { key: "mouth", label: "Mouth", category: "Face" },
  { key: "props", label: "Pose props", category: "Stage" },
];

export const LYRA_PARTS: MascotPart[] = [
  { key: "shadow", label: "Shadow", category: "Stage" },
  { key: "halo", label: "Glow halo", category: "Light" },
  { key: "instrument", label: "Lyre tail", category: "Instrument" },
  { key: "mic", label: "Microphone", category: "Body" },
  { key: "legs", label: "Legs", category: "Body" },
  { key: "wings", label: "Wings", category: "Body" },
  { key: "body", label: "Body", category: "Core" },
  { key: "crest", label: "Crest", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "eyes", label: "Eyes", category: "Face", essential: true },
  { key: "beak", label: "Beak", category: "Face" },
  { key: "props", label: "Pose props", category: "Stage" },
];

export const BUD_PARTS: MascotPart[] = [
  { key: "shadow", label: "Shadow", category: "Stage" },
  { key: "halo", label: "Dawn halo", category: "Light" },
  { key: "wings", label: "Wings", category: "Body" },
  { key: "legs", label: "Legs", category: "Body" },
  { key: "striker", label: "Bell striker", category: "Body" },
  { key: "feet", label: "Alarm bells", category: "Body" },
  { key: "body", label: "Body", category: "Core" },
  { key: "comb", label: "Comb", category: "Face" },
  { key: "wattle", label: "Wattle", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "eyes", label: "Eyes", category: "Face", essential: true },
  { key: "beak", label: "Beak", category: "Face" },
  { key: "props", label: "Pose props", category: "Stage" },
];

export const FANOUS_PARTS: MascotPart[] = [
  { key: "shadow", label: "Shadow", category: "Stage" },
  { key: "halo", label: "Lantern glow", category: "Light" },
  { key: "arms", label: "Arms", category: "Body" },
  { key: "base", label: "Base", category: "Body" },
  { key: "body", label: "Barrel", category: "Core" },
  { key: "face", label: "Glass face", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "eyes", label: "Eyes", category: "Face", essential: true },
  { key: "mouth", label: "Mouth", category: "Face" },
  { key: "bands", label: "Gold bands", category: "Details" },
  { key: "dome", label: "Bell dome", category: "Body" },
  { key: "finial", label: "Finial", category: "Details" },
  { key: "props", label: "Pose props", category: "Stage" },
];
