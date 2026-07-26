import type { MascotModelId } from "@/lib/types";

export type MascotModelProvider = "Anthropic" | "OpenAI";

export type MascotModelOption = {
  id: MascotModelId;
  label: string;
  provider: MascotModelProvider;
  blurb: string;
  envKey: string;
  /** Model identifier sent to the provider API. */
  apiModel: string;
  /** List price in USD per 1M tokens. Drives billing and the cost estimate. */
  usd: { input: number; output: number };
  tier: "frontier" | "flagship" | "balanced" | "fast";
  /** Accepts reference image uploads for vision-guided generation. */
  supportsVision: boolean;
};

/**
 * The six frontier models customers can pick from, ordered by provider then
 * capability. Prices are the standard short-context published rates and feed
 * directly into token billing, so they must match the provider price lists.
 */
export const MASCOT_MODEL_OPTIONS: readonly MascotModelOption[] = [
  {
    id: "claude-fable-5",
    label: "Claude Fable 5",
    provider: "Anthropic",
    blurb: "Anthropic's most capable model. Richest illustration detail.",
    envKey: "ANTHROPIC_API_KEY",
    apiModel: "claude-fable-5",
    usd: { input: 10, output: 50 },
    tier: "frontier",
    supportsVision: true,
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "Anthropic",
    blurb: "Strong structured SVG craft and edits",
    envKey: "ANTHROPIC_API_KEY",
    apiModel: "claude-opus-5",
    usd: { input: 5, output: 25 },
    tier: "flagship",
    supportsVision: true,
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "Anthropic",
    blurb: "Great craft for half the tokens. The value pick.",
    envKey: "ANTHROPIC_API_KEY",
    apiModel: "claude-sonnet-5",
    usd: { input: 3, output: 15 },
    tier: "balanced",
    supportsVision: true,
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "OpenAI",
    blurb: "Flagship OpenAI model for studio packs",
    envKey: "OPENAI_API_KEY",
    apiModel: "gpt-5.6-sol",
    usd: { input: 5, output: 30 },
    tier: "flagship",
    supportsVision: true,
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "OpenAI",
    blurb: "Balanced OpenAI build at half the token cost of Sol",
    envKey: "OPENAI_API_KEY",
    apiModel: "gpt-5.6-terra",
    usd: { input: 2.5, output: 15 },
    tier: "balanced",
    supportsVision: true,
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "OpenAI",
    blurb: "Fastest and cheapest. Great for iterating on looks.",
    envKey: "OPENAI_API_KEY",
    apiModel: "gpt-5.6-luna",
    usd: { input: 1, output: 6 },
    tier: "fast",
    supportsVision: true,
  },
] as const;

/** Preferred model when the user has not chosen one. */
export const DEFAULT_MASCOT_MODEL: MascotModelId = "claude-opus-5";

/**
 * Claude truncates SVG mid-string below this ceiling, so every Anthropic call
 * is floored here. Token pricing reserves against it, otherwise a phase that
 * asks for less would be under-held.
 */
export const CLAUDE_MIN_OUTPUT_TOKENS = 8192;

const MODEL_IDS = new Set<string>(MASCOT_MODEL_OPTIONS.map((m) => m.id));

/** Narrow an unknown value to a model id, or null when unrecognised. */
export function asMascotModelId(value: unknown): MascotModelId | null {
  return typeof value === "string" && MODEL_IDS.has(value)
    ? (value as MascotModelId)
    : null;
}

export function mascotModelOption(id: MascotModelId): MascotModelOption {
  const found = MASCOT_MODEL_OPTIONS.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown mascot model: ${id}`);
  return found;
}

/**
 * Map a provider's returned model string back to a catalogue entry so billing
 * follows the model that actually ran, not the one that was requested.
 */
export function optionByApiModel(
  apiModel: string
): MascotModelOption | null {
  return (
    MASCOT_MODEL_OPTIONS.find((m) => m.apiModel === apiModel) ??
    MASCOT_MODEL_OPTIONS.find((m) => m.id === apiModel) ??
    null
  );
}
