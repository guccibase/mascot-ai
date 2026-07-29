export type ThemeSwatch = {
  name: string;
  top: string;
  mid: string;
  base: string;
  core: string;
  stage: string;
  /** Optional feature/line color (eyes, brows, beak outlines). */
  features?: string;
  /** Optional cheek blush; remapped to --ms-blush when present. */
  blush?: string;
};

export type StudioInstrument = {
  /** Product-facing control, Lyra's "Delivery" pattern. */
  label: string;
  description: string;
  lowLabel: string;
  midLabel: string;
  highLabel: string;
  defaultValue: number;
  /** 5-stop colour ramp used for the signal, 0→100. */
  ramp: [string, string, string, string, string];
  /**
   * Studios that ship no signal control (glow-only, like Bud or Sol) set this.
   * The ramp still colours sparks and accents; no slider is offered, so a
   * marketplace preview and the copy a buyer receives expose the same controls.
   */
  hidden?: boolean;
};

export type MascotPart = {
  /** Stable id used in data-ms-part on SVG groups. */
  key: string;
  label: string;
  category: string;
  description?: string;
  /** Core silhouette parts default on; accessories can be toggled. */
  essential?: boolean;
};

export type GeneratedGesture = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
  /** Full self-contained animated SVG markup (SMIL + inline styles). */
  svg: string;
  /** Eyes follow cursor (idle / listening style). */
  track?: boolean;
  /** Auto spark bursts while this pose is active. */
  delight?: boolean;
  /** Retarget the instrument slider when this pose is selected. */
  signal?: number;
};

export type GeneratedMascot = {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  themes: Record<string, ThemeSwatch>;
  instrument: StudioInstrument;
  gestures: GeneratedGesture[];
  /** Named removable/toggleable visual parts across all gesture SVGs. */
  parts: MascotPart[];
};

export type GestureRequest = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
};

export type MascotSample = {
  id: string;
  title: string;
  rationale: string;
  /** Static concept SVG: no SMIL / CSS animation. */
  svg: string;
};

export type MascotModelId =
  | "gpt-5.6-sol"
  | "gpt-5.6-terra"
  | "gpt-5.6-luna"
  | "claude-fable-5"
  | "claude-opus-5"
  | "claude-sonnet-5";

/** Base64 image payload for vision-guided model calls (server-side). */
export type MascotImageInput = {
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  data: string;
};

export type SamplesRequest = {
  name: string;
  description: string;
  look: string;
  productContext?: string;
  personality?: string;
  /** Convex referenceAssets id from an uploaded design sketch. */
  referenceId?: string;
  /** Which frontier model draws the samples. */
  model?: MascotModelId;
};

export type GenerateRequest = {
  name: string;
  description: string;
  look: string;
  productContext?: string;
  personality?: string;
  /** Chosen static concept the studio must match. */
  selectedSample: MascotSample;
  gestures: GestureRequest[];
  referenceId?: string;
  /** Which frontier model builds the studio. */
  model?: MascotModelId;
};

export type RefineMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RefineRequest = {
  mascot: GeneratedMascot;
  /** Parts currently enabled in the UI. */
  enabledParts: string[];
  message: string;
  history?: RefineMessage[];
  look?: string;
  /** Optional design reference for add/change/remove guidance. */
  referenceId?: string;
  /** Which frontier model applies the edit. */
  model?: MascotModelId;
};

export type AddGestureRequest = {
  mascot: GeneratedMascot;
  gesture: GestureRequest;
  look?: string;
  referenceId?: string;
  model?: MascotModelId;
};

export type RemixRequest = {
  /** @deprecated Example remix removed from product; prefer mascotId/listingId. */
  slug?:
    | "lyra"
    | "sol"
    | "bud"
    | "fanous"
    | "granary"
    | "byte"
    | "numi"
    | "lexa"
    | "coda"
    | "kelp"
    | "nori"
    | "hay"
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

  /** Remix an owned library mascot (created or purchased). */
  mascotId?: string;
  /** Remix a marketplace listing after paying the remix SKU. */
  listingId?: string;
  remixOrderId?: string;
  name: string;
  /** Optional — source artwork is the visual reference when omitted. */
  description?: string;
  /** Optional — source artwork is the visual reference when omitted. */
  look?: string;
  productContext?: string;
  personality?: string;
  gestures: GestureRequest[];
  referenceId?: string;
  model?: MascotModelId;
};

export type AppAssetKindId = "app_icon" | "favicon" | "pwa" | "logo";

export type AppAssetSamplesRequest = {
  mascotId: string;
  kinds: AppAssetKindId[];
  styleDescription?: string;
  /** Regenerate samples on an existing pack session. */
  packId?: string;
  model?: MascotModelId;
};

export type AppAssetPackRequest = {
  packId: string;
  selectedSampleId: string;
  styleDescription?: string;
  model?: MascotModelId;
};
