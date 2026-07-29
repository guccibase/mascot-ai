import "server-only";

import OpenAI, { toFile } from "openai";

export { buildIconPrompt } from "@/lib/app-assets/icon-prompt";

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
