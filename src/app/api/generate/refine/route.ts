import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import { resolveMascotModel, runMascotModel } from "@/lib/mascot-model";
import { ensurePartAttributes, extractPartsFromMascot } from "@/lib/mascot-parts";
import { openMeter } from "@/lib/metering";
import { parseJsonObject } from "@/lib/parse-json";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import { sanitizeSvgOrThrow } from "@/lib/sanitize-svg";
import { styleReferenceBlock } from "@/lib/style-references";
import { applyThemeContract, normalizeGeneratedMascot } from "@/lib/studio-utils";
import { referenceImageBlock, refineReferenceBlock } from "@/lib/vision-prompt";
import type {
  GeneratedGesture,
  GeneratedMascot,
  RefineRequest,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Refine packs include full gesture SVGs. Keep a firm but workable ceiling. */
const MAX_BODY_BYTES = 1_500_000;

const MAX_GESTURES = 12;

function isMascot(value: unknown): value is GeneratedMascot {
  if (!value || typeof value !== "object") return false;
  const v = value as GeneratedMascot;
  return (
    typeof v.name === "string" &&
    Array.isArray(v.gestures) &&
    v.gestures.length > 0 &&
    v.gestures.length <= MAX_GESTURES &&
    v.gestures.every(
      (g) => typeof g?.svg === "string" && g.svg.includes("<svg")
    )
  );
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "refine",
    limit: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const parsedBody = await readJsonBody<RefineRequest>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const resolved = resolveMascotModel(body.model, {
    requiresVision: isReferenceId(body.referenceId),
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const model = resolved.model;

  const message = boundedText(body.message, 2000);
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (!isMascot(body.mascot)) {
    return NextResponse.json(
      { error: `Valid mascot pack required (1 to ${MAX_GESTURES} gestures)` },
      { status: 400 }
    );
  }

  let referenceImage = null;
  if (isReferenceId(body.referenceId)) {
    referenceImage = await loadReferenceImage(body.referenceId);
    if (!referenceImage) {
      return NextResponse.json(
        { error: "Reference image not found or expired. Upload again." },
        { status: 410 }
      );
    }
  }

  const started = Date.now();
  const enabled = new Set(body.enabledParts ?? []);
  const history = (body.history ?? []).slice(-8);

  const compactMascot = {
    name: body.mascot.name,
    tagline: body.mascot.tagline,
    product: body.mascot.product,
    accent: body.mascot.accent,
    glowLabel: body.mascot.glowLabel,
    instrument: body.mascot.instrument,
    themes: body.mascot.themes,
    parts: body.mascot.parts,
    gestures: body.mascot.gestures.map((g) => ({
      key: g.key,
      label: g.label,
      cat: g.cat,
      tip: g.tip,
      use: g.use,
      track: g.track,
      delight: g.delight,
      signal: g.signal,
      svg: g.svg,
    })),
  };

  // Serialised once: it is both what we price and what we send.
  const mascotJson = JSON.stringify(compactMascot);
  const payloadChars =
    mascotJson.length +
    message.length +
    history.reduce((total, h) => total + h.content.length, 0);

  const metered = await openMeter(
    {
      kind: "refine",
      payloadChars,
      referenceImages: referenceImage ? 1 : 0,
    },
    model
  );
  if (!metered.ok) return metered.response;
  const { meter } = metered;

  try {
    const run = await runMascotModel({
      model,
      instructions: [
        `You refine an existing interactive mascot studio pack. Fully contextual. Obey the user's edit request.`,
        `Craft standard = Fanous + Lyra production SVG studios.`,
        referenceImage ? referenceImageBlock() : null,
        referenceImage ? refineReferenceBlock() : null,
        `Return JSON only:`,
        `{"assistantMessage":string,"mascot":{...full Updated GeneratedMascot including gestures[].svg and parts[]}}`,
        `Rules:`,
        `- Keep the same character identity unless the user asks to redesign`,
        `- Update ALL gesture SVGs consistently when changing silhouette/parts`,
        `- Every distinct visual element must use data-ms-part="key" groups`,
        `- parts[] must list every toggleable element with label + category`,
        `- Respect currently disabled parts: still include them in SVG (for add-back) but you may omit recreating removed motifs if user asked to remove permanently`,
        `- If user asks to add something, add data-ms-part + parts entry across gestures`,
        `- Preserve ms-root, ms-hit, ms-eyes, ms-signal-fan, ms-glow-halo, click bounce`,
        `- Escape all quotes inside svg strings`,
        ``,
        styleReferenceBlock(),
      ]
        .filter(Boolean)
        .join("\n"),
      input: [
        body.look ? `Original look brief: ${boundedText(body.look, 1200)}` : null,
        referenceImage
          ? `The attached image shows what the user wants added, changed, or removed — follow it for that edit.`
          : null,
        `Currently enabled parts: ${[...enabled].join(", ") || "(all)"}`,
        `Conversation:`,
        ...history.map((h) => `${h.role.toUpperCase()}: ${boundedText(h.content, 1500)}`),
        `USER: ${message}`,
        ``,
        `Current mascot JSON:`,
        mascotJson,
        ``,
        `Return the full updated mascot JSON plus a short assistantMessage describing what changed.`,
      ]
        .filter(Boolean)
        .join("\n"),
      images: referenceImage ? [referenceImage] : undefined,
      maxOutputTokens: 32000,
      reasoningEffort: "low",
    });
    meter.record(run.usage, run.model);

    const parsed = parseJsonObject(run.text) as {
      assistantMessage?: string;
      mascot?: GeneratedMascot;
    };

    if (!isMascot(parsed.mascot)) {
      return NextResponse.json(
        { error: "Refine returned an incomplete mascot", model: run.model },
        { status: 502 }
      );
    }

    const gestureMeta = parsed.mascot.gestures.map((g) => ({
      key: g.key,
      label: g.label,
      cat: g.cat,
      tip: g.tip,
      use: g.use,
    }));

    const keys =
      gestureMeta.length > 0
        ? gestureMeta
        : body.mascot.gestures.map((g) => ({
            key: g.key,
            label: g.label,
            cat: g.cat,
            tip: g.tip,
            use: g.use,
          }));

    let mascot: GeneratedMascot;
    try {
      mascot = normalizeGeneratedMascot(parsed.mascot, keys);
    } catch {
      const primary =
        parsed.mascot.themes.primary ??
        Object.values(parsed.mascot.themes)[0]!;
      const gestures: GeneratedGesture[] = parsed.mascot.gestures.map((g) => ({
        ...g,
        svg: ensurePartAttributes(
          applyThemeContract(
            sanitizeSvgOrThrow(g.svg, `gesture "${g.key}"`),
            primary,
            parsed.mascot!.accent
          )
        ),
      }));
      const draft: GeneratedMascot = {
        ...parsed.mascot,
        gestures,
        parts: parsed.mascot.parts ?? [],
      };
      mascot = { ...draft, parts: extractPartsFromMascot(draft) };
    }

    const tokens = await meter.settle();

    return NextResponse.json({
      assistantMessage:
        parsed.assistantMessage ||
        "Updated the mascot from your notes.",
      mascot,
      _meta: {
        model: run.model,
        elapsedMs: Date.now() - started,
        tokens: tokens.tokens,
        balance: tokens.balance,
      },
    });
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : "Refine failed";
    console.error("refine error:", messageText);
    return NextResponse.json({ error: messageText }, { status: 500 });
  } finally {
    await meter.settle();
  }
}
