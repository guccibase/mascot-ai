import {
  CLAUDE_MIN_OUTPUT_TOKENS,
  mascotModelOption,
  optionByApiModel,
  type MascotModelOption,
} from "@/lib/mascot-model-options";
import { MAX_STUDIO_GESTURES } from "@/lib/refine-pack";
import type { MascotModelId } from "@/lib/types";
import {
  MAX_TOKEN_RESERVATION,
  USD_PER_TOKEN,
} from "../../convex/lib/plans";

export { MAX_TOKEN_RESERVATION, USD_PER_TOKEN };

/**
 * Gross-margin multiplier on provider/infra COGS for app-asset actions.
 * `(S - C) / S = 0.5` when S = 2C.
 */
export const APP_ASSET_MARGIN_MULTIPLIER = 2;

/**
 * Per-call markup on Ask AI refine. Kept at `1` so edits use the same COGS→token
 * math as create/studio — plan/top-up prices already carry margin. A refine-only
 * ×2 made simple edits cost more than building a mascot on light models and
 * broke the weekly “refine anytime” promise on a 240K grant.
 */
export const REFINE_MARGIN_MULTIPLIER = 1;

/**
 * Reserve / UI hold for refine: typical × buffer, capped by absolute max.
 * Worst-case 32K-output holds made Fable “simple edits” exceed a weekly grant
 * even when a normal run fits comfortably.
 */
export const REFINE_RESERVE_BUFFER = 1.5;

/**
 * Apply an action margin to already-computed COGS billing tokens.
 * Integer COGS × integer margin stays exact (no second ceil inflation).
 */
export function billUsageTokens(cogsTokens: number, margin: number): number {
  const cogs = Math.max(0, Math.floor(cogsTokens));
  const m = Number.isFinite(margin) && margin > 0 ? margin : 1;
  if (m === 1) return cogs;
  return Math.ceil(cogs * m);
}

/**
 * Conservative USD COGS per gpt-image-2 reference **edit** at 1024×1024 high
 * quality (text + image input + image output). Sourced from OpenAI image
 * pricing examples (~$0.211 high square output) plus edit reference headroom.
 * Updated 2026-07-26.
 */
export const IMAGE_EDIT_USD_PER_IMAGE = 0.22;
/** Reservation ceiling per edit when usage is unknown. */
export const IMAGE_EDIT_USD_PER_IMAGE_MAX = 0.28;

/** @deprecated Use IMAGE_EDIT_USD_PER_IMAGE — kept for older imports/tests. */
export const IMAGE_GEN_USD_PER_IMAGE = IMAGE_EDIT_USD_PER_IMAGE;

export function estimateImageEditTokens(count: number): {
  typical: number;
  max: number;
} {
  const n = Math.max(1, Math.min(3, Math.floor(count)));
  return {
    typical: Math.ceil(
      ((n * IMAGE_EDIT_USD_PER_IMAGE) / USD_PER_TOKEN) * APP_ASSET_MARGIN_MULTIPLIER
    ),
    max: Math.ceil(
      ((n * IMAGE_EDIT_USD_PER_IMAGE_MAX) / USD_PER_TOKEN) *
        APP_ASSET_MARGIN_MULTIPLIER
    ),
  };
}

/** @deprecated Use estimateImageEditTokens. */
export const estimateImageGenTokens = estimateImageEditTokens;

/**
 * Sample previews are high-quality gpt-image reference edits.
 * Aliases keep older imports/tests aligned with IMAGE_EDIT COGS.
 */
export const APP_ASSET_SAMPLE_USD_PER_IMAGE = IMAGE_EDIT_USD_PER_IMAGE;
export const APP_ASSET_SAMPLE_USD_PER_IMAGE_MAX = IMAGE_EDIT_USD_PER_IMAGE_MAX;

/** Three creative icon masters billed as image edits @ ≥50% gross margin. */
export function estimateAppAssetSampleTokens(count: number): {
  typical: number;
  max: number;
} {
  return estimateImageEditTokens(count);
}

/** Infra COGS for pack assembly (resize + storage uploads); no LLM. */
export const APP_ASSET_PACK_BASE_USD = 0.002;
export const APP_ASSET_PACK_PER_FILE_USD = 0.00015;

export function estimateAppAssetPackTokens(fileCount: number): {
  typical: number;
  max: number;
} {
  const n = Math.max(1, Math.floor(fileCount));
  const cogs =
    APP_ASSET_PACK_BASE_USD + APP_ASSET_PACK_PER_FILE_USD * n;
  const typical = Math.ceil(
    (cogs / USD_PER_TOKEN) * APP_ASSET_MARGIN_MULTIPLIER
  );
  return {
    typical,
    max: Math.ceil(typical * 1.25),
  };
}

/** @deprecated Prefer estimateAppAssetPackTokens(fileCount). */
export const APP_ASSET_PACK_TOKENS_TYPICAL = estimateAppAssetPackTokens(12).typical;
export const APP_ASSET_PACK_TOKENS_MAX = estimateAppAssetPackTokens(12).max;

/**
 * Billing tokens are denominated in provider spend, so a raw model token costs
 * a different number of billing tokens on every model. That keeps the margin
 * on a plan identical regardless of which model the customer picks.
 */
export type TokenRate = { input: number; output: number };

export function tokenRate(option: MascotModelOption): TokenRate {
  return {
    input: option.usd.input / 1_000_000 / USD_PER_TOKEN,
    output: option.usd.output / 1_000_000 / USD_PER_TOKEN,
  };
}

/**
 * Chars per provider token. SVG and JSON tokenise densely (punctuation-heavy),
 * so this is deliberately below the ~4 rule of thumb: a low divisor estimates
 * *more* tokens, which keeps a hold from coming up short.
 */
const CHARS_PER_TOKEN = 3;

/** Raw provider tokens a single model call is expected to consume. */
type PhaseEstimate = {
  /** Fixed scaffold: instructions, style references, schema. */
  input: number;
  /** Worst-case fixed input, when a phase also carries earlier model output. */
  inputMax?: number;
  outputTypical: number;
  outputMax: number;
  /**
   * Whether this phase embeds the caller's payload (the chosen sample SVG or
   * the existing pack). Those bytes are re-sent on every phase that needs
   * them, so they are charged once per phase, not once per request.
   */
  carriesPayload: boolean;
};

/** Idle output sizes, fed forward into every later gesture prompt. */
const PHASE_IDLE_TYPICAL = 7_000;
const PHASE_IDLE_MAX = 16_000;

/**
 * Derived from the prompt payloads and `maxOutputTokens` ceilings in the
 * generate routes. `outputMax` matches the ceiling we actually pass to the
 * provider and `inputMax` covers any earlier output fed forward, so a
 * reservation can never be too small for a successful call.
 */
const PHASES = {
  samples: {
    input: 900,
    outputTypical: 9_000,
    outputMax: 20_000,
    carriesPayload: true,
  },
  bible: {
    input: 7_000,
    outputTypical: 3_000,
    outputMax: 8_000,
    carriesPayload: true,
  },
  idle: {
    input: 6_500,
    outputTypical: PHASE_IDLE_TYPICAL,
    outputMax: PHASE_IDLE_MAX,
    carriesPayload: true,
  },
  // Also carries the generated idle SVG, bounded by the idle phase's ceiling.
  studioGesture: {
    input: 9_500 + PHASE_IDLE_TYPICAL,
    inputMax: 9_500 + PHASE_IDLE_MAX,
    outputTypical: 6_000,
    outputMax: 14_000,
    carriesPayload: true,
  },
  addGesture: {
    input: 10_000,
    outputTypical: 6_000,
    outputMax: 14_000,
    carriesPayload: true,
  },
  refine: {
    input: 16_000,
    outputTypical: 8_000,
    outputMax: 32_000,
    carriesPayload: true,
  },
  remixIdentity: {
    input: 8_000,
    outputTypical: 4_000,
    outputMax: 10_000,
    carriesPayload: true,
  },
  remixPose: {
    input: 5_000,
    inputMax: 9_000,
    outputTypical: 2_500,
    outputMax: 6_000,
    carriesPayload: true,
  },
  /** Three 1024px AI icon masters (reference edit; billed via image COGS). */
  appAssetSamples: {
    input: 0,
    outputTypical: 0,
    outputMax: 0,
    carriesPayload: false,
  },
  /** Deterministic resize + manifest assembly from chosen master icon. */
  appAssetPack: {
    input: 0,
    outputTypical: 0,
    outputMax: 0,
    carriesPayload: false,
  },
} satisfies Record<string, PhaseEstimate>;

/**
 * The `maxOutputTokens` each phase is priced against. Exported so a test can
 * pin it to the ceiling the routes actually send: if the two drift apart, a
 * reservation silently stops covering the call it is meant to cover.
 */
export const PHASE_OUTPUT_CEILINGS: Readonly<Record<keyof typeof PHASES, number>> =
  Object.fromEntries(
    Object.entries(PHASES).map(([name, phase]) => [name, phase.outputMax])
  ) as Record<keyof typeof PHASES, number>;

type ActionKind =
  | { kind: "samples" }
  | { kind: "studio"; gestures: number }
  | { kind: "gesture" }
  | { kind: "refine"; batches?: number }
  | { kind: "remix"; poses: number }
  | { kind: "appAssetSamples"; images?: number }
  | { kind: "appAssetPack"; fileCount?: number };

export type MeteredAction = ActionKind & {
  /**
   * Characters of caller-supplied content that get embedded in the prompts.
   * Omitting it prices only the fixed scaffold, which under-reserves for any
   * request carrying a mascot pack. Always pass the measured size.
   */
  payloadChars?: number;
  /** Model calls that include a reference image (vision surcharge). */
  referenceImages?: number;
};

/** Conservative vision input surcharge per image-bearing call. */
export const VISION_IMAGE_TOKENS_TYPICAL = 1_600;
export const VISION_IMAGE_TOKENS_MAX = 2_400;

export type TokenEstimate = {
  /** What a normal run costs: the number shown to customers. */
  typical: number;
  /** Worst case if every call hits its output ceiling. Used for reservations. */
  max: number;
  /** Number of model calls the action makes. */
  calls: number;
};

function phasesFor(action: MeteredAction): PhaseEstimate[] {
  switch (action.kind) {
    case "samples":
      return [PHASES.samples];
    case "gesture":
      return [PHASES.addGesture];
    case "refine": {
      // Worst case: one pose per batch up to the studio ceiling.
      const batches = Math.max(
        1,
        Math.min(
          MAX_STUDIO_GESTURES,
          Math.floor(action.batches ?? 1)
        )
      );
      return Array.from({ length: batches }, () => PHASES.refine);
    }
    case "studio": {
      const gestures = Math.max(1, Math.min(6, Math.floor(action.gestures)));
      return [
        PHASES.bible,
        PHASES.idle,
        ...Array.from({ length: gestures - 1 }, () => PHASES.studioGesture),
      ];
    }
    case "remix": {
      const poses = Math.max(1, Math.min(6, Math.floor(action.poses)));
      return [
        PHASES.remixIdentity,
        ...Array.from({ length: poses }, () => PHASES.remixPose),
      ];
    }
    case "appAssetSamples":
      return [PHASES.appAssetSamples];
    case "appAssetPack":
      return [];
  }
}

export function estimateTokens(
  action: MeteredAction,
  model: MascotModelId
): TokenEstimate {
  const option = mascotModelOption(model);
  const rate = tokenRate(option);
  const phases = phasesFor(action);
  const payload = Math.ceil(
    Math.max(0, action.payloadChars ?? 0) / CHARS_PER_TOKEN
  );
  // Anthropic calls are floored, so their real ceiling can exceed the one the
  // route asks for. Reserve against whichever is higher.
  const outputFloor =
    option.provider === "Anthropic" ? CLAUDE_MIN_OUTPUT_TOKENS : 0;

  let typical = 0;
  let max = 0;
  const visionCalls = Math.max(0, action.referenceImages ?? 0);
  for (const phase of phases) {
    const carried = phase.carriesPayload ? payload : 0;
    typical += (phase.input + carried) * rate.input;
    typical += phase.outputTypical * rate.output;

    max += ((phase.inputMax ?? phase.input) + carried) * rate.input;
    max += Math.max(phase.outputMax, outputFloor) * rate.output;
  }

  typical += visionCalls * VISION_IMAGE_TOKENS_TYPICAL;
  max += visionCalls * VISION_IMAGE_TOKENS_MAX;

  if (action.kind === "appAssetSamples") {
    const img = estimateAppAssetSampleTokens(action.images ?? 3);
    typical += img.typical;
    max += img.max;
  }

  if (action.kind === "appAssetPack") {
    const pack = estimateAppAssetPackTokens(action.fileCount ?? 12);
    typical += pack.typical;
    max += pack.max;
  }

  const margin =
    action.kind === "refine" ? REFINE_MARGIN_MULTIPLIER : 1;

  return {
    typical: Math.ceil(typical * margin),
    max: Math.ceil(max * margin),
    calls: phases.length,
  };
}

/** Practical refine hold used by Ask AI UI and `openMeter` reserve. */
export function refineHoldTokens(estimate: TokenEstimate): number {
  const typical = Math.max(0, estimate.typical);
  const max = Math.max(typical, estimate.max);
  const buffered = Math.ceil(typical * REFINE_RESERVE_BUFFER);
  return Math.min(max, Math.max(typical, buffered));
}

/**
 * Ask AI quotes for the selected model: smallest 1-batch hold vs this edit's
 * full-pack hold (practical typical×buffer, not absolute output ceilings).
 */
export function estimateRefineReservation(
  args: {
    batches: number;
    payloadChars: number;
    hasReference: boolean;
  },
  model: MascotModelId
): { minCost: number; editCost: number; typical: number } {
  const batches = Math.max(1, Math.floor(args.batches));
  const payloadChars = Math.max(0, args.payloadChars);
  const min = estimateTokens(
    {
      kind: "refine",
      batches: 1,
      payloadChars,
      referenceImages: args.hasReference ? 1 : 0,
    },
    model
  );
  const edit = estimateTokens(
    {
      kind: "refine",
      batches,
      payloadChars,
      referenceImages: args.hasReference ? batches : 0,
    },
    model
  );
  return {
    minCost: refineHoldTokens(min),
    editCost: refineHoldTokens(edit),
    typical: edit.typical,
  };
}

/** Tokens for a full create: three look samples plus the animated studio. */
export function estimateFullCreate(
  gestures: number,
  model: MascotModelId,
  payloadChars = 0,
  referenceImages = 0
): TokenEstimate {
  const samples = estimateTokens(
    {
      kind: "samples",
      payloadChars,
      referenceImages: referenceImages > 0 ? 1 : 0,
    },
    model
  );
  const studio = estimateTokens(
    {
      kind: "studio",
      gestures,
      payloadChars,
      referenceImages: referenceImages > 0 ? 2 : 0,
    },
    model
  );
  return {
    typical: samples.typical + studio.typical,
    max: samples.max + studio.max,
    calls: samples.calls + studio.calls,
  };
}

export type ProviderUsage = {
  input_tokens?: number;
  output_tokens?: number;
};

/**
 * Published rates for models that are not selectable but sit in the OpenAI
 * access-fallback chain. Without these a fallback run would bill at the
 * requested model's rate and quietly eat the difference.
 */
const FALLBACK_USD: Record<string, { input: number; output: number }> = {
  "gpt-5.6": { input: 5, output: 30 },
  "gpt-5.5": { input: 5, output: 30 },
  "gpt-5.4": { input: 2.5, output: 15 },
};

/**
 * Convert metered provider usage into billing tokens. Bills against the model
 * that actually ran so a provider-side fallback can never overcharge; when the
 * returned id is unknown we fall back to the model the customer selected.
 *
 * `reasoning_tokens` is deliberately ignored: providers already include it in
 * `output_tokens`, and counting it again would double-bill.
 */
export function tokensForUsage(
  usage: ProviderUsage | undefined,
  requested: MascotModelId,
  actualApiModel?: string
): number {
  const matched = actualApiModel ? optionByApiModel(actualApiModel) : null;
  const fallbackUsd = actualApiModel ? FALLBACK_USD[actualApiModel] : undefined;
  const rate = matched
    ? tokenRate(matched)
    : fallbackUsd
      ? {
          input: fallbackUsd.input / 1_000_000 / USD_PER_TOKEN,
          output: fallbackUsd.output / 1_000_000 / USD_PER_TOKEN,
        }
      : tokenRate(mascotModelOption(requested));

  const input = Math.max(0, usage?.input_tokens ?? 0);
  const output = Math.max(0, usage?.output_tokens ?? 0);
  return Math.ceil(input * rate.input + output * rate.output);
}

/**
 * Fallback charge for a call that succeeded but reported no usage. Uses the
 * typical estimate so a provider omitting usage never yields a free generation.
 */
export function fallbackTokens(
  action: MeteredAction,
  model: MascotModelId
): number {
  return estimateTokens(action, model).typical;
}

export function tokensToUsd(tokens: number): number {
  return tokens * USD_PER_TOKEN;
}

/** Compact display: 1_250_000 -> "1.25M", 240_000 -> "240K". */
export function formatTokens(tokens: number): string {
  if (!Number.isFinite(tokens) || tokens <= 0) return "0";
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : Number(millions.toFixed(2))}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(Math.round(tokens));
}

/** How many more runs of this action a balance affords, floored at zero. */
export function runsRemaining(balance: number, perRun: number): number {
  if (perRun <= 0) return 0;
  return Math.max(0, Math.floor(balance / perRun));
}
