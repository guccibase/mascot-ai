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

export function buildIconPrompt(args: {
  mascotName: string;
  tagline?: string;
  styleDescription?: string;
  kinds: string[];
  variantIndex?: number;
}): string {
  const style = args.styleDescription?.trim()
    ? args.styleDescription.trim()
    : "Modern, polished app icon. Square composition, centered character, soft gradient background, crisp edges, readable at 48px.";

  const variantHint =
    args.variantIndex != null
      ? `Variation ${args.variantIndex + 1} of 3 — offer a distinct background or lighting treatment while keeping the same character.`
      : null;

  return [
    `Design a production-ready APP ICON for the mascot "${args.mascotName}".`,
    args.tagline ? `Brand vibe: ${args.tagline}.` : null,
    `Asset types requested: ${args.kinds.join(", ")}.`,
    style,
    variantHint,
    "Requirements: square 1:1, no rounded corners (platforms mask automatically), no text unless essential, high contrast silhouette, professional mobile app store quality, single character centered with breathing room.",
    "Match the reference mascot's colors, face, and silhouette when a reference image is provided.",
  ]
    .filter(Boolean)
    .join(" ");
}
