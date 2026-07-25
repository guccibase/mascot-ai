import OpenAI from "openai";

/** Prefer GPT-5.6 Sol; fall back to the strongest model the project can access. */
export const MASCOT_MODEL_CANDIDATES = [
  process.env.OPENAI_MASCOT_MODEL,
  "gpt-5.6-sol",
  "gpt-5.6",
  "gpt-5.5",
  "gpt-5.4",
].filter((m): m is string => Boolean(m));

export type MascotModelResult = {
  model: string;
  text: string;
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

/**
 * Responses API + high reasoning — Sol-grade craft for mascot packs.
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
    maxOutputTokens = 64000,
    reasoningEffort = "high",
  } = args;

  // Ensure json_object mode is allowed
  const inputWithJson = /json/i.test(input)
    ? input
    : `${input}\n\nReturn a single JSON object.`;

  let lastError: unknown;

  for (const model of MASCOT_MODEL_CANDIDATES) {
    try {
      const response = await openai.responses.create({
        model,
        reasoning: { effort: reasoningEffort },
        instructions,
        input: inputWithJson,
        text: { format: { type: "json_object" } },
        max_output_tokens: maxOutputTokens,
      });

      const text = response.output_text?.trim();
      if (!text) {
        throw new Error(`Empty output from ${model} (status=${response.status})`);
      }

      if (model !== "gpt-5.6-sol" && model !== process.env.OPENAI_MASCOT_MODEL) {
        console.warn(
          `[mascot-ai] gpt-5.6-sol unavailable on this project; using ${model}`
        );
      }

      return { model, text };
    } catch (err) {
      lastError = err;
      if (isModelAccessError(err)) {
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
