import OpenAI from "openai";

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

function candidateOrder(): string[] {
  if (cachedModelVerified && cachedModel) {
    return [
      cachedModel,
      ...MASCOT_MODEL_CANDIDATES.filter((m) => m !== cachedModel),
    ];
  }
  return MASCOT_MODEL_CANDIDATES;
}

/**
 * Responses API for mascot packs. Default medium effort — high is too slow for studio UX.
 */
export async function runMascotModel(args: {
  openai: OpenAI;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
}): Promise<MascotModelResult> {
  const {
    openai,
    instructions,
    input,
    maxOutputTokens = 32000,
    reasoningEffort = "medium",
  } = args;

  const inputWithJson = /json/i.test(input)
    ? input
    : `${input}\n\nReturn a single JSON object.`;

  let lastError: unknown;

  for (const model of candidateOrder()) {
    try {
      const response = await openai.responses.create({
        model,
        reasoning: { effort: reasoningEffort },
        instructions,
        input: inputWithJson,
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

      if (model !== "gpt-5.6-sol") {
        console.warn(`[mascot-ai] using ${model}`);
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
