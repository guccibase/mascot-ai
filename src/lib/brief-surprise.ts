import OpenAI from "openai";
import { boundedText } from "@/lib/api-guard";
import { parseJsonObject } from "@/lib/parse-json";

export type BriefSurpriseField =
  | "name"
  | "description"
  | "look"
  | "productContext"
  | "personality"
  | "all";

export type BriefContext = {
  name?: string;
  description?: string;
  look?: string;
  productContext?: string;
  personality?: string;
};

export type BriefSurpriseBrief = {
  name: string;
  description: string;
  look: string;
  productContext: string;
  personality: string;
};

export type BriefSurpriseResult =
  | { field: Exclude<BriefSurpriseField, "all">; value: string }
  | { field: "all"; brief: BriefSurpriseBrief };

/**
 * Cheap OpenAI models only — never the studio catalogue (Sol/Terra/Luna).
 * Official pricing (per 1M tokens, short context):
 * - gpt-5.4-nano: $0.20 in / $1.25 out — best cheap GPT-5.4 for high-volume text
 * - gpt-5.4-mini: $0.75 in / $4.50 out — quality bump if nano unavailable
 * - gpt-4o-mini: $0.15 in / $0.60 out — legacy budget fallback
 *
 * Primary is nano: ~5× cheaper than gpt-5.6-luna, supports Responses + JSON.
 */
const CHEAP_SURPRISE_MODELS = [
  "gpt-5.4-nano",
  "gpt-5.4-mini",
  "gpt-4o-mini",
] as const;

const FIELD_LIMITS = {
  name: 80,
  description: 1200,
  look: 1200,
  productContext: 400,
  personality: 400,
} as const;

const SINGLE_FIELDS = [
  "name",
  "description",
  "look",
  "productContext",
  "personality",
] as const satisfies ReadonlyArray<Exclude<BriefSurpriseField, "all">>;

const FIELD_GUIDANCE: Record<
  Exclude<BriefSurpriseField, "all">,
  string
> = {
  name: "Short mascot name (1–2 words). Memorable and specific to this character.",
  description:
    "One sentence: who they are and how they help the user. Concrete, not generic.",
  look:
    "Visual design brief for an SVG app mascot: silhouette, palette, props, illustration style. 2–4 sentences. Production-ready.",
  productContext: "What app or product this mascot represents. Short phrase.",
  personality: "Tone and voice in a short phrase. Warm, specific, not generic.",
};

export function isSurpriseBriefConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Exposed for tests — preference order only, never studio models. */
export function cheapSurpriseModels(): readonly string[] {
  return CHEAP_SURPRISE_MODELS;
}

export function normalizeBriefContext(raw: BriefContext): BriefContext {
  return {
    name: boundedText(raw.name, FIELD_LIMITS.name) || undefined,
    description:
      boundedText(raw.description, FIELD_LIMITS.description) || undefined,
    look: boundedText(raw.look, FIELD_LIMITS.look) || undefined,
    productContext:
      boundedText(raw.productContext, FIELD_LIMITS.productContext) || undefined,
    personality:
      boundedText(raw.personality, FIELD_LIMITS.personality) || undefined,
  };
}

function formatContextBlock(brief: BriefContext): string {
  const lines = [
    brief.name ? `Name: ${brief.name}` : null,
    brief.description ? `What they are: ${brief.description}` : null,
    brief.look ? `How they look (current): ${brief.look}` : null,
    brief.productContext ? `App / product: ${brief.productContext}` : null,
    brief.personality ? `Personality (current): ${brief.personality}` : null,
  ].filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "No fields filled yet — invent a fresh, cohesive app mascot concept.";
}

function buildInstructions(field: BriefSurpriseField): string {
  const shared = [
    "You help users write mascot creation briefs for animated SVG app mascots.",
    "Return a single JSON object only. No markdown fences.",
    "Stay consistent with every detail the user already provided.",
    "If the user named a character or species (e.g. acorn woodpecker), every field you write MUST describe that same character — never swap to an unrelated motif.",
    "Match the user's language when they wrote in a non-English language.",
    "Be vivid and production-ready, not generic filler.",
  ];

  if (field === "all") {
    return [
      ...shared,
      'Return: {"name":string,"description":string,"look":string,"productContext":string,"personality":string}',
      "All five fields must fit one cohesive mascot.",
    ].join("\n");
  }

  return [
    ...shared,
    `Return: {"${field}":string}`,
    `Field to generate: ${field}`,
    `Guidance: ${FIELD_GUIDANCE[field]}`,
  ].join("\n");
}

function buildInput(field: BriefSurpriseField, brief: BriefContext): string {
  const context = formatContextBlock(brief);

  if (field === "all") {
    return [
      "Generate a complete mascot brief (all five fields).",
      context,
      "If some fields are already filled, keep them or improve them — do not contradict the user's character.",
    ].join("\n\n");
  }

  const replaceHint =
    brief[field]?.trim() &&
    `The user may already have a ${field} value — replace it with a better suggestion that still matches their concept.`;

  return [
    `Generate only the "${field}" field.`,
    context,
    replaceHint,
    "Do not mention unrelated characters or motifs.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function trimField(
  field: Exclude<BriefSurpriseField, "all">,
  value: unknown
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = boundedText(value, FIELD_LIMITS[field]);
  return trimmed || null;
}

export function parseBriefSurpriseResult(
  field: BriefSurpriseField,
  raw: unknown
): BriefSurpriseResult | null {
  if (!raw || typeof raw !== "object") return null;

  if (field === "all") {
    const obj = raw as Record<string, unknown>;
    const brief: Partial<BriefSurpriseBrief> = {};
    for (const key of SINGLE_FIELDS) {
      const value = trimField(key, obj[key]);
      if (!value) return null;
      brief[key] = value;
    }
    return { field: "all", brief: brief as BriefSurpriseBrief };
  }

  const value = trimField(field, (raw as Record<string, unknown>)[field]);
  if (!value) return null;
  return { field, value };
}

function isModelAccessError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status === 403 || e.status === 404) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("does not have access to model") ||
    msg.includes("model_not_found") ||
    msg.includes("invalid model")
  );
}

/** GPT-5.4 family accepts reasoning.effort; gpt-4o-mini does not. */
function supportsReasoningEffort(model: string): boolean {
  return model.startsWith("gpt-5");
}

async function runCheapOpenAI(args: {
  instructions: string;
  input: string;
  maxOutputTokens: number;
  signal?: AbortSignal;
}): Promise<{ model: string; text: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for Surprise me");
  }

  const openai = new OpenAI({ apiKey });
  let lastError: unknown;

  for (const model of CHEAP_SURPRISE_MODELS) {
    try {
      // OpenAI json_object mode requires the word "json" in input messages
      // (instructions alone are not enough — same rule as openai-mascot.ts).
      const input = /\bjson\b/i.test(args.input)
        ? args.input
        : `${args.input}\n\nReturn a single JSON object.`;

      const response = await openai.responses.create(
        {
          model,
          instructions: args.instructions,
          input,
          text: { format: { type: "json_object" } },
          max_output_tokens: args.maxOutputTokens,
          ...(supportsReasoningEffort(model)
            ? { reasoning: { effort: "none" as const } }
            : {}),
        },
        { signal: args.signal }
      );

      const text =
        typeof response.output_text === "string"
          ? response.output_text.trim()
          : "";
      if (!text) {
        throw new Error(`Empty output from ${model}`);
      }

      if (model !== CHEAP_SURPRISE_MODELS[0]) {
        console.warn(
          `[mascot-ai] brief-surprise: ${CHEAP_SURPRISE_MODELS[0]} unavailable, used ${model}`
        );
      }

      return { model, text };
    } catch (err) {
      lastError = err;
      if (isModelAccessError(err)) {
        console.warn(
          `[mascot-ai] brief-surprise: model ${model} not accessible, trying next cheap model`
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No accessible cheap OpenAI model for Surprise me");
}

export async function generateBriefSurprise(args: {
  field: BriefSurpriseField;
  brief: BriefContext;
  signal?: AbortSignal;
}): Promise<{ result: BriefSurpriseResult; model: string }> {
  if (!isSurpriseBriefConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured for Surprise me");
  }

  const brief = normalizeBriefContext(args.brief);
  const run = await runCheapOpenAI({
    instructions: buildInstructions(args.field),
    input: buildInput(args.field, brief),
    maxOutputTokens: args.field === "all" ? 900 : 350,
    signal: args.signal,
  });

  const parsed = parseJsonObject(run.text);
  const result = parseBriefSurpriseResult(args.field, parsed);
  if (!result) {
    throw new Error("Model returned an incomplete brief suggestion");
  }

  return { result, model: run.model };
}
