import OpenAI from "openai";
import type { MascotImageInput } from "@/lib/types";

/**
 * Prefer GPT-5.6 Sol when available.
 * Sticky-cache the first model that works so we don't pay a 403 tax every request.
 */
export const MASCOT_MODEL_CANDIDATES = [
  process.env.OPENAI_MASCOT_MODEL,
  "gpt-5.6-sol",
  "gpt-5.6",
  "gpt-5.5",
  "gpt-5.4",
].filter((m): m is string => Boolean(m));

let cachedModel: string | null = process.env.OPENAI_MASCOT_MODEL || null;
let cachedModelVerified = false;

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

export type MascotModelResult = {
  model: string;
  text: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
  };
};

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

function candidateOrder(preferredModel?: string): string[] {
  const preferred = preferredModel || cachedModel;
  const base =
    cachedModelVerified && cachedModel
      ? [
          cachedModel,
          ...MASCOT_MODEL_CANDIDATES.filter((m) => m !== cachedModel),
        ]
      : [...MASCOT_MODEL_CANDIDATES];

  if (preferred && preferred !== base[0]) {
    return [preferred, ...base.filter((m) => m !== preferred)];
  }
  return base;
}

/**
 * Responses API for mascot packs. Default medium effort. High is too slow for studio UX.
 */
export async function runOpenAIMascotModel(args: {
  openai: OpenAI;
  preferredModel?: string;
  instructions: string;
  input: string;
  images?: MascotImageInput[];
  maxOutputTokens?: number;
  reasoningEffort?: ReasoningEffort;
}): Promise<MascotModelResult> {
  const {
    openai,
    preferredModel,
    instructions,
    input,
    images,
    maxOutputTokens = 32000,
    reasoningEffort = "medium",
  } = args;

  const inputWithJson = /json/i.test(input)
    ? input
    : `${input}\n\nReturn a single JSON object.`;

  const apiInput: OpenAI.Responses.ResponseInput = [
    {
      role: "user",
      content: [
        ...(images?.map((img) => ({
          type: "input_image" as const,
          image_url: `data:${img.mediaType};base64,${img.data}`,
          detail: "high" as const,
        })) ?? []),
        { type: "input_text" as const, text: inputWithJson },
      ],
    },
  ];

  let lastError: unknown;

  for (const model of candidateOrder(preferredModel)) {
    try {
      const response = await openai.responses.create({
        model,
        reasoning: { effort: reasoningEffort },
        instructions,
        input: apiInput,
        text: { format: { type: "json_object" } },
        max_output_tokens: maxOutputTokens,
      });

      const text =
        typeof response.output_text === "string"
          ? response.output_text.trim()
          : "";
      if (!text) {
        throw new Error(
          `Empty output from ${model} (status=${response.status})`
        );
      }

      cachedModel = model;
      cachedModelVerified = true;

      if (preferredModel && model !== preferredModel) {
        console.warn(`[mascot-ai] ${preferredModel} unavailable, used ${model}`);
      }

      return {
        model,
        text,
        usage: {
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
          reasoning_tokens:
            response.usage?.output_tokens_details?.reasoning_tokens,
        },
      };
    } catch (err) {
      lastError = err;
      if (isModelAccessError(err)) {
        if (cachedModel === model) {
          cachedModel = null;
          cachedModelVerified = false;
        }
        console.warn(`[mascot-ai] model ${model} not accessible, trying next`);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No accessible OpenAI model for mascot generation");
}

/** @deprecated Use runMascotModel from @/lib/mascot-model */
export async function runMascotModel(args: {
  openai: OpenAI;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  reasoningEffort?: ReasoningEffort;
}): Promise<MascotModelResult> {
  return runOpenAIMascotModel(args);
}
