import OpenAI from "openai";
import { NextResponse } from "next/server";
import { runMascotModel } from "@/lib/openai-mascot";
import { normalizeGeneratedMascot } from "@/lib/studio-utils";
import type {
  GenerateRequest,
  GeneratedGesture,
  GeneratedMascot,
  StudioInstrument,
  ThemeSwatch,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const PACK_INSTRUCTIONS = `You design production animated SVG mascot studios in the Lyra craft: product-as-instrument anatomy, whole-performance gestures, SMIL bounce/blink, elegant Bezier silhouette. JSON only.`;

const SVG_INSTRUCTIONS = `You draw ONE production gesture SVG for an existing mascot studio (Lyra craft).
Return JSON: {"key":string,"label":string,"cat":string,"tip":string,"use":string,"track":boolean,"delight":boolean,"signal":number,"svg":string}
SVG rules:
- viewBox 0 0 420 520, class ms-root, xmlns set
- include ms-hit transparent rect, contact shadow, ms-glow-halo, ms-eyes, ms-signal-fan (7-9 pieces), click bounce begin=ms-hit.click
- transparent bg; paint with provided theme hexes (top/mid/base/core/features) literally
- keep same silhouette as the bible; change pose/face/prop/instrument energy only
- compact paths; JSON only`;

type BiblePack = {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  instrument: StudioInstrument;
  themes: Record<string, ThemeSwatch>;
  silhouette: string;
  metaphor?: string;
};

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("Model returned invalid JSON");
  }
}

function isBible(value: unknown): value is BiblePack {
  if (!value || typeof value !== "object") return false;
  const v = value as BiblePack;
  return (
    typeof v.name === "string" &&
    typeof v.tagline === "string" &&
    typeof v.accent === "string" &&
    !!v.themes?.primary &&
    !!v.instrument?.label &&
    typeof v.silhouette === "string"
  );
}

function isGesture(value: unknown): value is GeneratedGesture {
  if (!value || typeof value !== "object") return false;
  const g = value as GeneratedGesture;
  return (
    typeof g.key === "string" &&
    typeof g.svg === "string" &&
    g.svg.includes("<svg")
  );
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const gestures = body.gestures ?? [];

  if (!name || !description) {
    return NextResponse.json(
      { error: "Name and description are required" },
      { status: 400 }
    );
  }
  if (gestures.length < 1 || gestures.length > 6) {
    return NextResponse.json(
      { error: "Select between 1 and 6 gestures" },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const product =
    typeof body.productContext === "string"
      ? body.productContext.trim()
      : undefined;
  const personality =
    typeof body.personality === "string"
      ? body.personality.trim()
      : undefined;
  const started = Date.now();

  try {
    /* Phase 1 — fast character lock (no SVGs) */
    const bibleRun = await runMascotModel({
      openai,
      instructions: PACK_INSTRUCTIONS,
      input: [
        `Return JSON character bible (NO svg fields):`,
        `{`,
        `  "name","tagline","product","accent","glowLabel",`,
        `  "metaphor","silhouette",`,
        `  "instrument":{"label","description","lowLabel","midLabel","highLabel","defaultValue","ramp":[5 hex violet→amber]},`,
        `  "themes":{"primary":{"name","top","mid","base","core","stage","features"},"night":{…},"dune":{…}}`,
        `}`,
        ``,
        `Name: ${name}`,
        `Description: ${description}`,
        product ? `Product: ${product}` : null,
        personality ? `Personality: ${personality}` : null,
        `Gestures to support: ${gestures.map((g) => g.key).join(", ")}`,
        `Invent a product INSTRUMENT in the anatomy (like Lyra's delivery tail). JSON only.`,
      ]
        .filter(Boolean)
        .join("\n"),
      maxOutputTokens: 2500,
      reasoningEffort: "low",
    });

    const bible = parseJsonObject(bibleRun.text);
    if (!isBible(bible)) {
      return NextResponse.json(
        { error: "Failed to lock character bible", model: bibleRun.model },
        { status: 502 }
      );
    }

    const primary = bible.themes.primary;

    /* Phase 2 — draw every gesture in parallel */
    const gestureResults = await Promise.all(
      gestures.map(async (g) => {
        const run = await runMascotModel({
          openai,
          instructions: SVG_INSTRUCTIONS,
          input: [
            `Draw gesture "${g.key}" for mascot ${bible.name}.`,
            `Bible: ${JSON.stringify({
              name: bible.name,
              metaphor: bible.metaphor,
              silhouette: bible.silhouette,
              instrument: bible.instrument,
              theme: primary,
              accent: bible.accent,
            })}`,
            `Gesture metadata (keep exactly): ${JSON.stringify(g)}`,
            `track=${g.key === "idle" || g.key === "listening" || g.key === "thinking"}`,
            `delight=${["celebrate", "love", "wave", "proud", "bravo"].includes(g.key)}`,
            `signal hint: idle~68, celebrate~95, sad/oops~20`,
            `Return JSON for this one gesture only.`,
          ].join("\n"),
          maxOutputTokens: 4500,
          reasoningEffort: "low",
        });

        const parsed = parseJsonObject(run.text);
        if (!isGesture(parsed)) {
          throw new Error(`Failed SVG for gesture "${g.key}"`);
        }

        return {
          key: g.key,
          label: g.label,
          cat: g.cat,
          tip: g.tip,
          use: g.use,
          track: parsed.track,
          delight: parsed.delight,
          signal: parsed.signal,
          svg: parsed.svg,
          _model: run.model,
        } satisfies GeneratedGesture & { _model: string };
      })
    );

    const pack: GeneratedMascot = {
      name,
      tagline: bible.tagline,
      product: bible.product ?? product,
      accent: bible.accent,
      glowLabel: bible.glowLabel,
      instrument: bible.instrument,
      themes: bible.themes,
      gestures: gestureResults.map(({ _model: _m, ...g }) => g),
    };

    const result = normalizeGeneratedMascot(pack, gestures);
    const model =
      gestureResults[0]?._model ?? bibleRun.model;

    return NextResponse.json({
      ...result,
      _meta: {
        model,
        bibleModel: bibleRun.model,
        craft: "lyra-parallel",
        elapsedMs: Date.now() - started,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
