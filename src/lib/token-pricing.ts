import {
  CLAUDE_MIN_OUTPUT_TOKENS,
  mascotModelOption,
  optionByApiModel,
  type MascotModelOption,
} from "@/lib/mascot-model-options";
import type { MascotModelId } from "@/lib/types";
import { USD_PER_TOKEN } from "../../convex/lib/plans";

export { USD_PER_TOKEN };

/** Conservative USD per 1024×1024 high-quality image (gpt-image-2). */
export const IMAGE_GEN_USD_PER_IMAGE = 0.07;

export function estimateImageGenTokens(count: number): {
  typical: number;
  max: number;
} {
  const base = count * IMAGE_GEN_USD_PER_IMAGE;
  return {
    typical: Math.ceil((base / USD_PER_TOKEN) * 1.35),
    max: Math.ceil((base / USD_PER_TOKEN) * 1.55),
  };
}

/** Flat fee for deterministic resize + manifest assembly (no LLM COGS). */
export const APP_ASSET_PACK_TOKENS_TYPICAL = 450;
export const APP_ASSET_PACK_TOKENS_MAX = 650;

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
  /** Three 1024px icon previews via OpenAI Image API. */
  appAssetSamples: {
    input: 0,
    outputTypical: 0,
    outputMax: 0,
    carriesPayload: false,
  },
  /** Deterministic resize + manifest assembly from chosen master icon. */
  appAssetPack: {
    input: 0,
    outputTypical: 2_500,
    outputMax: 3_500,
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
  | { kind: "refine" }
  | { kind: "remix"; poses: number }
  | { kind: "appAssetSamples"; images?: number }
  | { kind: "appAssetPack" };

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
    case "refine":
      return [PHASES.refine];
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
    const img = estimateImageGenTokens(Math.max(1, Math.min(3, action.images ?? 3)));
    typical += img.typical;
    max += img.max;
  }

  if (action.kind === "appAssetPack") {
    typical += APP_ASSET_PACK_TOKENS_TYPICAL;
    max += APP_ASSET_PACK_TOKENS_MAX;
  }

  return {
    typical: Math.ceil(typical),
    max: Math.ceil(max),
    calls: phases.length,
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
