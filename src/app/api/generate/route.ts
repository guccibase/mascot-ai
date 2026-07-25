import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  BIBLE_SYSTEM_PROMPT,
  LYRA_CRAFT_SYSTEM_PROMPT,
} from "@/lib/generate-system-prompt";
import { runMascotModel } from "@/lib/openai-mascot";
import { normalizeGeneratedMascot } from "@/lib/studio-utils";
import type { GenerateRequest, GeneratedMascot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function looksLikePack(value: unknown): value is GeneratedMascot {
  if (!value || typeof value !== "object") return false;
  const v = value as GeneratedMascot;
  return (
    typeof v.name === "string" &&
    typeof v.tagline === "string" &&
    typeof v.accent === "string" &&
    !!v.themes &&
    typeof v.themes === "object" &&
    Array.isArray(v.gestures) &&
    v.gestures.length > 0 &&
    v.gestures.every(
      (g) =>
        typeof g?.key === "string" &&
        typeof g?.svg === "string" &&
        g.svg.includes("<svg")
    )
  );
}

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // Some models wrap JSON in residual prose — extract first object
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("Model returned invalid JSON");
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const description = body.description?.trim();
  const gestures = body.gestures ?? [];

  if (!name || !description) {
    return NextResponse.json(
      { error: "Name and description are required" },
      { status: 400 }
    );
  }
  if (gestures.length < 1 || gestures.length > 8) {
    return NextResponse.json(
      { error: "Select between 1 and 8 gestures" },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const product = body.productContext?.trim();
  const personality = body.personality?.trim();

  try {
    /* ── Phase 1: Lyra-grade character bible ── */
    const bibleInput = [
      `Lock a production CHARACTER BIBLE in the Lyra craft language.`,
      `Name: ${name}`,
      `Description: ${description}`,
      product ? `Product context: ${product}` : null,
      personality ? `Personality: ${personality}` : null,
      `Gestures that must be performable (write gestureNotes for each):`,
      JSON.stringify(
        gestures.map((g) => ({
          key: g.key,
          label: g.label,
          cat: g.cat,
          tip: g.tip,
          use: g.use,
        })),
        null,
        2
      ),
      `Think like Lyra: invent a product INSTRUMENT in the anatomy (9 pieces), not a sticker.`,
      `Return JSON only.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const bibleRun = await runMascotModel({
      openai,
      instructions: BIBLE_SYSTEM_PROMPT,
      input: bibleInput,
      maxOutputTokens: 8000,
      reasoningEffort: "high",
    });
    const bible = parseJsonObject(bibleRun.text);

    /* ── Phase 2: Full studio pack — Lyra SVG craft ── */
    const packInput = [
      `Author the full production mascot STUDIO PACK in Lyra's exact craft.`,
      `Canonical reference: Lyra (Orator AI) — instrument-driven silhouette, whole-performance gestures, SMIL bounce/blink, spectrogram ramp, grain+halo, ms-eyes + ms-signal-fan.`,
      ``,
      `CHARACTER BIBLE (obey this — do not redesign the silhouette):`,
      JSON.stringify(bible, null, 2),
      ``,
      `User brief:`,
      `Name: ${name}`,
      `Description: ${description}`,
      product ? `Product: ${product}` : null,
      personality ? `Personality: ${personality}` : null,
      ``,
      `Gestures to author (keep keys/labels/cats/tips/uses exactly; set track/delight/signal; draw a COMPLETE production SVG each):`,
      JSON.stringify(gestures, null, 2),
      ``,
      `Hard requirements:`,
      `- 5 themes (primary + 4 alternates), plumage-only; ramp stays violet→amber family`,
      `- Every SVG: ms-root, ms-hit, ms-glow-halo, ms-eyes, ms-signal-fan (7–9 pieces), click bounce on ms-hit, contact shadow, transparent bg`,
      `- Theme paints use literal hex from themes.primary top/mid/base/core/features`,
      `- Quality bar = Lyra, not emoji. Return one JSON pack.`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const packRun = await runMascotModel({
      openai,
      instructions: LYRA_CRAFT_SYSTEM_PROMPT,
      input: packInput,
      maxOutputTokens: 64000,
      reasoningEffort: "high",
    });

    const parsed = parseJsonObject(packRun.text);
    if (!looksLikePack(parsed)) {
      return NextResponse.json(
        {
          error: "Model returned an incomplete mascot pack",
          model: packRun.model,
        },
        { status: 502 }
      );
    }

    const result = normalizeGeneratedMascot({ ...parsed, name }, gestures);

    return NextResponse.json({
      ...result,
      _meta: {
        model: packRun.model,
        bibleModel: bibleRun.model,
        craft: "lyra",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
