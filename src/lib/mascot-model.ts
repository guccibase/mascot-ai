import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  CLAUDE_MIN_OUTPUT_TOKENS,
  DEFAULT_MASCOT_MODEL,
  asMascotModelId,
  mascotModelOption,
  MASCOT_MODEL_OPTIONS,
  optionByApiModel,
  type MascotModelOption,
} from "@/lib/mascot-model-options";
import {
  runOpenAIMascotModel,
  type MascotModelResult,
  type ReasoningEffort,
} from "@/lib/openai-mascot";
import type { MascotModelId, MascotImageInput } from "@/lib/types";

export type { MascotModelId, MascotImageInput };
export { asMascotModelId };
export { MASCOT_MODEL_OPTIONS, DEFAULT_MASCOT_MODEL };

function hasProviderKey(option: MascotModelOption): boolean {
  return Boolean(process.env[option.envKey]);
}

/** Model ids whose provider key is actually present in this deployment. */
export function availableMascotModels(): MascotModelId[] {
  return MASCOT_MODEL_OPTIONS.filter(hasProviderKey).map((m) => m.id);
}

/**
 * Pick the model to run. An explicit request for an unconfigured provider is
 * an error (silently switching providers would surprise the user and change
 * what the customer was quoted), while an omitted model falls back to the
 * default when configured.
 */
export function resolveMascotModel(
  requested: unknown,
  opts?: { requiresVision?: boolean }
): { ok: true; model: MascotModelId } | { ok: false; error: string } {
  const available = availableMascotModels();
  if (available.length === 0) {
    return {
      ok: false,
      error:
        "No model provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY",
    };
  }

  const explicit = asMascotModelId(requested);
  if (!explicit) {
    const preferred = available.includes(DEFAULT_MASCOT_MODEL)
      ? DEFAULT_MASCOT_MODEL
      : available[0]!;
    if (opts?.requiresVision && !mascotModelOption(preferred).supportsVision) {
      return {
        ok: false,
        error: "No vision-capable model is configured for reference uploads",
      };
    }
    return { ok: true, model: preferred };
  }
  if (available.includes(explicit)) {
    if (opts?.requiresVision && !mascotModelOption(explicit).supportsVision) {
      return {
        ok: false,
        error: `${mascotModelOption(explicit).label} does not support reference images`,
      };
    }
    return { ok: true, model: explicit };
  }

  const option = mascotModelOption(explicit);
  return {
    ok: false,
    error: `${option.label} was selected but ${option.envKey} is not configured`,
  };
}

function extractClaudeText(
  content: Anthropic.Messages.Message["content"]
): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n").trim();
}

function claudeUserContent(
  input: string,
  images?: MascotImageInput[]
): Anthropic.Messages.MessageParam["content"] {
  const inputWithJson = /json/i.test(input)
    ? input
    : `${input}\n\nReturn a single JSON object.`;

  if (!images?.length) return inputWithJson;

  return [
    ...images.map(
      (img): Anthropic.Messages.ImageBlockParam => ({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mediaType,
          data: img.data,
        },
      })
    ),
    { type: "text", text: inputWithJson },
  ];
}

/**
 * Claude counts thinking toward max_tokens. For SVG JSON packs we disable
 * thinking so the budget goes to the actual SVG payload.
 */
async function runClaudeMascotModel(args: {
  option: MascotModelOption;
  instructions: string;
  input: string;
  images?: MascotImageInput[];
  maxOutputTokens: number;
  reasoningEffort: ReasoningEffort;
}): Promise<MascotModelResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const requestedOverride =
    args.option.id === "claude-opus-5"
      ? process.env.ANTHROPIC_MASCOT_MODEL
      : undefined;
  const override =
    requestedOverride && optionByApiModel(requestedOverride)
      ? requestedOverride
      : undefined;
  if (requestedOverride && !override) {
    console.warn(
      `[mascot-ai] ignoring unpriceable ANTHROPIC_MASCOT_MODEL=${requestedOverride}`
    );
  }
  const model = override ?? args.option.apiModel;

  const anthropic = new Anthropic({ apiKey });
  const maxTokens = Math.max(args.maxOutputTokens, CLAUDE_MIN_OUTPUT_TOKENS);

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: `${args.instructions}\n\nRespond with a single valid JSON object only. No markdown fences.`,
    messages: [
      {
        role: "user",
        content: claudeUserContent(args.input, args.images),
      },
    ],
    thinking: { type: "disabled" },
    output_config: { effort: args.reasoningEffort },
  });

  const text = extractClaudeText(response.content);
  if (!text) {
    throw new Error(
      `Empty output from ${model} (stop=${response.stop_reason ?? "unknown"})`
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      `Claude hit max_tokens (${maxTokens}) mid-response. Try fewer gestures or regenerate`
    );
  }

  return {
    model,
    text,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

/**
 * Run mascot generation/refine against the user-selected model.
 */
export async function runMascotModel(args: {
  model: MascotModelId;
  instructions: string;
  input: string;
  images?: MascotImageInput[];
  maxOutputTokens?: number;
  reasoningEffort?: ReasoningEffort;
}): Promise<MascotModelResult> {
  const {
    model,
    instructions,
    input,
    images,
    maxOutputTokens = 32000,
    reasoningEffort = "medium",
  } = args;

  const option = mascotModelOption(model);

  if (option.provider === "Anthropic") {
    return runClaudeMascotModel({
      option,
      instructions,
      input,
      images,
      maxOutputTokens,
      reasoningEffort,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const openai = new OpenAI({ apiKey });

  return runOpenAIMascotModel({
    openai,
    preferredModel: option.apiModel,
    instructions,
    input,
    images,
    maxOutputTokens,
    reasoningEffort,
  });
}

export type { MascotModelResult, ReasoningEffort };
