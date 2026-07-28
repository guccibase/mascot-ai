import "server-only";

import OpenAI, { toFile } from "openai";

const DEFAULT_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

export type GeneratedImage = {
  model: string;
  buffer: Buffer;
  mediaType: "image/png";
};

export async function generateAppIconImage(args: {
  prompt: string;
  referencePng?: Buffer;
  size?: "1024x1024";
}): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for app asset generation");
  }

  const openai = new OpenAI({ apiKey });
  const model = DEFAULT_IMAGE_MODEL;
  const size = args.size ?? "1024x1024";

  if (args.referencePng) {
    const file = await toFile(args.referencePng, "mascot-ref.png", {
      type: "image/png",
    });
    const edit = await openai.images.edit({
      model,
      image: file,
      prompt: args.prompt,
      size,
      n: 1,
      quality: "high",
    });
    const b64 = edit.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image model returned no data");
    return {
      model,
      buffer: Buffer.from(b64, "base64"),
      mediaType: "image/png",
    };
  }

  const gen = await openai.images.generate({
    model,
    prompt: args.prompt,
    size,
    n: 1,
    quality: "high",
  });
  const b64 = gen.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image model returned no data");
  return {
    model,
    buffer: Buffer.from(b64, "base64"),
    mediaType: "image/png",
  };
}

/**
 * Surgical edit prompt if image-model path is used again.
 * Prefer composeAppIconPreview for guaranteed character fidelity.
 */
export function buildIconPrompt(args: {
  mascotName: string;
  tagline?: string;
  styleDescription?: string;
  kinds: string[];
  variantIndex?: number;
}): string {
  const style = args.styleDescription?.trim()
    ? `Background only: ${args.styleDescription.trim()}`
    : "Background only: soft polished gradient, crisp, readable at 48px.";

  const variantHint =
    args.variantIndex != null
      ? `Variation ${args.variantIndex + 1} of 3 — change ONLY the background treatment.`
      : null;

  return [
    `Edit this image into a production APP ICON for "${args.mascotName}".`,
    "CRITICAL: Keep the mascot character 100% identical to the reference — same shape, colors, face, eyes, proportions, and details. Do NOT redesign, restyle, or replace the character.",
    "Change ONLY the background behind the character. Leave every character pixel unchanged.",
    args.tagline ? `Brand vibe for the background: ${args.tagline}.` : null,
    `Asset types requested: ${args.kinds.join(", ")}.`,
    style,
    variantHint,
    "Requirements: square 1:1, no rounded corners, no text, character centered with breathing room.",
  ]
    .filter(Boolean)
    .join(" ");
}
