/**
 * Studio feature gates for GeneratedStudio.
 *
 * Ownership rule: created, remixed, and purchased library mascots always get
 * the same full studio. Only preview surfaces (marketplace listing, public
 * examples) restrict export / edit / app assets.
 *
 * Privileged features (export / edit / appAssets) are **opt-in**: omitting
 * `capabilities` keeps them off so a forgotten preview call site cannot
 * silently unlock downloads or mutation.
 */

export type StudioCapabilities = {
  /** Download pose/pack ZIP and copy SVG. */
  export?: boolean;
  /** Show AI edit / undo / add-gesture controls that mutate the pack. */
  edit?: boolean;
  /** Show reversible SVG element toggles without enabling AI mutation. */
  parts?: boolean;
  /** App-asset generation panel. */
  appAssets?: boolean;
};

export type MascotLibrarySource = "created" | "purchased" | "remixed";

/** Full studio for any library-owned mascot (created, remixed, or purchased). */
export const OWNED_STUDIO_CAPABILITIES = {
  export: true,
  edit: true,
  parts: true,
  appAssets: true,
} as const satisfies Required<StudioCapabilities>;

/** Marketplace listing preview — play only; buy/remix to own. */
export const MARKETPLACE_PREVIEW_CAPABILITIES = {
  export: false,
  edit: false,
  parts: true,
  appAssets: false,
} as const satisfies Required<StudioCapabilities>;

/** Public / admin example studios — play + parts; no mutation or export. */
export const EXAMPLE_PREVIEW_CAPABILITIES = {
  export: false,
  edit: false,
  parts: true,
  appAssets: false,
} as const satisfies Required<StudioCapabilities>;

export type ResolvedStudioFeatures = {
  canExport: boolean;
  canEdit: boolean;
  canToggleParts: boolean;
  canAppAssets: boolean;
};

/**
 * Resolve effective studio flags from capability overrides plus runtime props.
 * Privileged features require an explicit `true` (fail-closed).
 */
export function resolveStudioFeatures(args: {
  capabilities?: StudioCapabilities;
  mascotId?: string | null;
  hasMascotChangeHandler: boolean;
}): ResolvedStudioFeatures {
  const caps = args.capabilities;
  const canExport = caps?.export === true;
  const canEdit = caps?.edit === true && args.hasMascotChangeHandler;
  const canAppAssets = caps?.appAssets === true && Boolean(args.mascotId);
  // Parts: explicit override; otherwise follow edit (preview surfaces set parts: true).
  const canToggleParts = caps?.parts !== undefined ? caps.parts : canEdit;
  return { canExport, canEdit, canToggleParts, canAppAssets };
}

/**
 * Library source never reduces capabilities — remixed and purchased get the
 * same studio as created.
 */
export function ownedStudioCapabilitiesForSource(
  _source: MascotLibrarySource | undefined
): Required<StudioCapabilities> {
  return { ...OWNED_STUDIO_CAPABILITIES };
}

/**
 * Features gated by `resolveStudioFeatures` — used by `hasFullOwnedStudio`.
 * Always-on play surfaces (themes / instrument / gestures) are not claimed here.
 */
export const OWNED_STUDIO_GATED_FEATURES = [
  "parts",
  "export",
  "copySvg",
  "askAi",
  "addGesture",
  "undo",
  "appAssets",
  "autosave",
] as const;

export type OwnedStudioGatedFeature =
  (typeof OWNED_STUDIO_GATED_FEATURES)[number];

/** Play / navigation features always present in GeneratedStudio (not capability-gated). */
export const OWNED_STUDIO_ALWAYS_ON_FEATURES = [
  "themes",
  "instrument",
  "gestures",
  "remixAgain",
] as const;

/** Full owned-studio checklist for QA docs (gated ∪ always-on). */
export const OWNED_STUDIO_FEATURE_CHECKLIST = [
  ...OWNED_STUDIO_ALWAYS_ON_FEATURES,
  ...OWNED_STUDIO_GATED_FEATURES,
] as const;

export type OwnedStudioFeature = (typeof OWNED_STUDIO_FEATURE_CHECKLIST)[number];

/**
 * Maps resolved flags → gated feature coverage only.
 * Always-on features are excluded so tests cannot falsely pass.
 */
export function ownedStudioGatedCoverage(
  features: ResolvedStudioFeatures
): Record<OwnedStudioGatedFeature, boolean> {
  return {
    parts: features.canToggleParts,
    export: features.canExport,
    copySvg: features.canExport,
    askAi: features.canEdit,
    addGesture: features.canEdit,
    undo: features.canEdit,
    appAssets: features.canAppAssets,
    autosave: features.canEdit,
  };
}

/** @deprecated Use ownedStudioGatedCoverage — kept for older imports. */
export const ownedStudioFeatureCoverage = ownedStudioGatedCoverage;

/** True when every capability-gated owned-studio feature is available. */
export function hasFullOwnedStudio(features: ResolvedStudioFeatures): boolean {
  const coverage = ownedStudioGatedCoverage(features);
  return OWNED_STUDIO_GATED_FEATURES.every((key) => coverage[key]);
}
