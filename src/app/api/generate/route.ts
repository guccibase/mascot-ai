import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { resolveMascotModel, runMascotModel } from "@/lib/mascot-model";
import { openMeter, tokenMetaFields } from "@/lib/metering";
import { MAX_CREATE_GESTURES } from "@/lib/token-pricing";
import { parseJsonObject } from "@/lib/parse-json";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import { styleReferenceBlock } from "@/lib/style-references";
import { referenceImageBlock } from "@/lib/vision-prompt";
import {
  defaultDelightForGesture,
  defaultTrackForGesture,
  normalizeGeneratedMascot,
} from "@/lib/studio-utils";
import { SVG_GESTURE_INSTRUCTIONS } from "@/lib/svg-gesture-prompt";
import type {
  GenerateRequest,
  GeneratedGesture,
  GeneratedMascot,
  GestureRequest,
  StudioInstrument,
  ThemeSwatch,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_BODY_BYTES = 200_000;

const SVG_INSTRUCTIONS = SVG_GESTURE_INSTRUCTIONS;

/** Bound parallel secondary-gesture calls so a 10-pose create does not stampede the provider. */
const STUDIO_GESTURE_CONCURRENCY = 4;

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]!);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

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

/**
 * Accept both well-formed gesture JSON and the salvaged `{ svg }` shape the
 * JSON parser produces when a model leaves quotes unescaped inside the SVG.
 */
function coerceGesture(
  parsed: unknown,
  req: GestureRequest
): GeneratedGesture {
  const svg =
    parsed && typeof parsed === "object"
      ? (parsed as { svg?: unknown }).svg
      : undefined;
  if (typeof svg !== "string" || !svg.includes("<svg")) {
    throw new Error("model returned no usable svg");
  }
  const p = parsed as Partial<GeneratedGesture>;
  return {
    key: req.key,
    label: req.label,
    cat: req.cat,
    tip: req.tip,
    use: req.use,
    track: typeof p.track === "boolean" ? p.track : undefined,
    delight: typeof p.delight === "boolean" ? p.delight : undefined,
    signal: typeof p.signal === "number" ? p.signal : undefined,
    svg,
  };
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "generate",
    limit: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<GenerateRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const wantsReference = isReferenceId(body.referenceId);
  const resolved = resolveMascotModel(body.model, {
    requiresVision: wantsReference,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const name = boundedText(body.name, 80);
  const description = boundedText(body.description, 1200);
  const look = boundedText(body.look, 1200);
  const gestures = body.gestures ?? [];
  const selectedSample = body.selectedSample;

  if (!name || !description || !look) {
    return NextResponse.json(
      { error: "Name, description, and look are required" },
      { status: 400 }
    );
  }
  if (!selectedSample?.svg?.includes("<svg")) {
    return NextResponse.json(
      { error: "A selected look sample is required" },
      { status: 400 }
    );
  }
  if (
    gestures.length < 1 ||
    gestures.length > MAX_CREATE_GESTURES
  ) {
    return NextResponse.json(
      {
        error: `Select between 1 and ${MAX_CREATE_GESTURES} gestures`,
      },
      { status: 400 }
    );
  }

  const product = boundedText(body.productContext, 400) || undefined;
  const personality = boundedText(body.personality, 400) || undefined;

  let referenceImage = null;
  if (wantsReference) {
    referenceImage = await loadReferenceImage(body.referenceId!);
    if (!referenceImage) {
      return NextResponse.json(
        { error: "Reference image not found or expired. Upload again." },
        { status: 410 }
      );
    }
  }

  const started = Date.now();
  const references = styleReferenceBlock();
  const warnings: string[] = [];
  const visionImages = referenceImage ? [referenceImage] : undefined;

  // The chosen sample is re-sent with every phase, so it dominates input cost.
  const payloadChars =
    selectedSample.svg.length + name.length + description.length + look.length;

  const metered = await openMeter(
    {
      kind: "studio",
      gestures: gestures.length,
      payloadChars,
      referenceImages: referenceImage ? 2 : 0,
    },
    model
  );
  if (!metered.ok) return metered.response;
  const { meter } = metered;

  try {
    /* Phase 1: character bible locked to chosen sample + Fanous/Lyra craft */
    const bibleRun = await runMascotModel({
      model,
      instructions: [
        `You are the principal engineer of Fanous and Lyra mascot studios.`,
        referenceImage ? referenceImageBlock() : null,
        `Lock a CHARACTER BIBLE for a NEW mascot. JSON only, no svg fields.`,
        `Schema:`,
        `{"name","tagline","product","accent","glowLabel","metaphor","silhouette",`,
        `"instrument":{"label","description","lowLabel","midLabel","highLabel","defaultValue":55-80,"ramp":[5 hex]},`,
        `"themes":{"primary":{"name","top","mid","base","core","stage","features"},"night":{…},"dune":{…}}}`,
        ``,
        references,
      ]
        .filter(Boolean)
        .join("\n"),
      input: [
        `Build the bible for the user's chosen look.`,
        referenceImage
          ? `The attached image is the user's design reference — themes and silhouette must match it.`
          : null,
        `Name: ${name}`,
        `Who: ${description}`,
        `Look brief: ${look}`,
        product ? `Product: ${product}` : null,
        personality ? `Personality: ${personality}` : null,
        `Chosen sample title: ${selectedSample.title}`,
        `Chosen sample rationale: ${selectedSample.rationale}`,
        `Chosen sample SVG (LOCK this silhouette / face / motif):`,
        selectedSample.svg,
        `Gestures to support: ${gestures.map((g) => g.key).join(", ")}`,
        `Invent a product INSTRUMENT in the anatomy (Lyra delivery-tail pattern). instrument.defaultValue MUST be an integer 55–80 (never 0–15). Themes should fit the sample. JSON only.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      images: visionImages,
      maxOutputTokens: 8000,
      reasoningEffort: "low",
    });
    let bible: BiblePack;
    try {
      const parsed = parseJsonObject(bibleRun.text);
      if (!isBible(parsed)) {
        // No usable pack yet — do not bill the bible call.
        meter.forgive();
        return NextResponse.json(
          {
            error: "Failed to lock character bible",
            model: bibleRun.model,
            detail: `bible keys: ${Object.keys((parsed as object) ?? {}).join(",")}`,
          },
          { status: 502 }
        );
      }
      bible = parsed;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "bad bible JSON";
      console.error("bible parse failed:", detail, "len=", bibleRun.text.length);
      meter.forgive();
      return NextResponse.json(
        { error: `Character bible JSON broken: ${detail}`, model: bibleRun.model },
        { status: 502 }
      );
    }
    meter.record(bibleRun.usage, bibleRun.model);

    const primary = bible.themes.primary;

    /* Phase 2: idle first (craft brief + chosen sample) */
    const idleReq =
      gestures.find((g) => g.key === "idle") ?? gestures[0]!;
    const otherReqs = gestures.filter((g) => g.key !== idleReq.key);

    const idleRun = await runMascotModel({
      model,
      instructions: [
        SVG_INSTRUCTIONS,
        referenceImage ? referenceImageBlock() : null,
        ``,
        references,
      ]
        .filter(Boolean)
        .join("\n"),
      input: [
        `Draw gesture "${idleReq.key}" for ${bible.name}.`,
        referenceImage
          ? `Match the attached reference image for face, colours, and silhouette.`
          : null,
        `Bible: ${JSON.stringify({
          name: bible.name,
          metaphor: bible.metaphor,
          silhouette: bible.silhouette,
          instrument: bible.instrument,
          theme: primary,
          accent: bible.accent,
        })}`,
        `User look brief: ${look}`,
        `Chosen sample (must match): ${selectedSample.svg}`,
        `Gesture metadata: ${JSON.stringify(idleReq)}`,
        `track=true for idle/listening/thinking; delight for celebrate/wave/love; signal idle~68`,
        `Return JSON for this one gesture only. Escape all quotes inside the svg string.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      images: visionImages,
      maxOutputTokens: 16000,
      reasoningEffort: "low",
    });

    let idleParsed: GeneratedGesture;
    try {
      idleParsed = coerceGesture(parseJsonObject(idleRun.text), idleReq);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "bad gesture JSON";
      console.error(
        "idle parse failed:",
        detail,
        "len=",
        idleRun.text.length,
        "stop-ish preview=",
        idleRun.text.slice(0, 120)
      );
      throw new Error(`Failed SVG for gesture "${idleReq.key}": ${detail}`);
    }
    meter.record(idleRun.usage, idleRun.model);

    const idleGesture: GeneratedGesture = {
      key: idleReq.key,
      label: idleReq.label,
      cat: idleReq.cat,
      tip: idleReq.tip,
      use: idleReq.use,
      track: idleParsed.track ?? defaultTrackForGesture(idleReq.key),
      delight: idleParsed.delight ?? defaultDelightForGesture(idleReq.key),
      signal: idleParsed.signal ?? 68,
      svg: idleParsed.svg,
    };

    /* Phase 3: remaining gestures (bounded concurrency); tolerate per-gesture failures */
    const settled = await mapPool(
      otherReqs,
      STUDIO_GESTURE_CONCURRENCY,
      async (g) => {
        try {
          const run = await runMascotModel({
            model,
            instructions: SVG_INSTRUCTIONS,
            input: [
              `Draw gesture "${g.key}" for ${bible.name}.`,
              `Match Fanous/Lyra engineering (SMIL, ms-eyes, ms-signal-fan, bounce) and the locked look.`,
              `Bible: ${JSON.stringify({
                name: bible.name,
                silhouette: bible.silhouette,
                instrument: bible.instrument,
                theme: primary,
                accent: bible.accent,
              })}`,
              `Chosen sample SVG: ${selectedSample.svg}`,
              `Idle SVG (same character; only change pose/face/prop/energy):`,
              idleGesture.svg,
              `Gesture metadata: ${JSON.stringify(g)}`,
              `track=${defaultTrackForGesture(g.key)}`,
              `delight=${defaultDelightForGesture(g.key)}`,
              `Return JSON for this one gesture only. Escape all quotes inside the svg string.`,
            ].join("\n\n"),
            maxOutputTokens: 14000,
            reasoningEffort: "low",
          });

          const coerced = coerceGesture(parseJsonObject(run.text), g);
          meter.record(run.usage, run.model);
          return {
            ok: true as const,
            gesture: {
              key: g.key,
              label: g.label,
              cat: g.cat,
              tip: g.tip,
              use: g.use,
              track: coerced.track ?? defaultTrackForGesture(g.key),
              delight: coerced.delight ?? defaultDelightForGesture(g.key),
              signal: coerced.signal,
              svg: coerced.svg,
            } satisfies GeneratedGesture,
          };
        } catch (err) {
          const detail = err instanceof Error ? err.message : "unknown";
          console.error(`gesture "${g.key}" failed:`, detail);
          return { ok: false as const, key: g.key, detail };
        }
      }
    );

    const otherGestures: GeneratedGesture[] = [];
    for (const item of settled) {
      if (item.ok) otherGestures.push(item.gesture);
      else warnings.push(`Skipped gesture "${item.key}": ${item.detail}`);
    }

    if (otherGestures.length === 0 && otherReqs.length > 0) {
      throw new Error(
        `All secondary gestures failed (${otherReqs.map((g) => g.key).join(", ")})`
      );
    }

    const succeeded = [idleGesture, ...otherGestures];
    const ordered = gestures
      .map((req) => succeeded.find((g) => g.key === req.key))
      .filter((g): g is GeneratedGesture => g !== undefined);

    const pack: GeneratedMascot = {
      name,
      tagline: bible.tagline,
      product: bible.product ?? product,
      accent: bible.accent,
      glowLabel: bible.glowLabel,
      instrument: bible.instrument,
      themes: bible.themes,
      gestures: ordered,
      parts: [],
    };

    const result = normalizeGeneratedMascot(
      pack,
      ordered.map((g) => ({
        key: g.key,
        label: g.label,
        cat: g.cat,
        tip: g.tip,
        use: g.use,
      }))
    );

    const tokens = await meter.settle();

    return NextResponse.json({
      ...result,
      _meta: {
        model: idleRun.model,
        bibleModel: bibleRun.model,
        craft: "fanous-lyra",
        sampleId: selectedSample.id,
        elapsedMs: Date.now() - started,
        ...tokenMetaFields(tokens),
        warnings: warnings.length ? warnings : undefined,
        skippedGestures: otherReqs
          .filter((g) => !ordered.some((o) => o.key === g.key))
          .map((g) => g.key),
      },
    });
  } catch (err) {
    // Failed create never applies a pack — full refund (matches refine/gesture).
    meter.forgive();
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Charges only the phases that completed and frees the rest of the hold.
    await meter.settle();
  }
}
