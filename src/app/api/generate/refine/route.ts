import { NextResponse } from "next/server";
import { boundedText, rateLimit, readJsonBody } from "@/lib/api-guard";
import {
  MascotModelResponseError,
  resolveMascotModel,
  runMascotModel,
} from "@/lib/mascot-model";
import { ensurePartAttributes, extractPartsFromMascot } from "@/lib/mascot-parts";
import { openMeter, tokenMetaFields } from "@/lib/metering";
import { parseJsonObject } from "@/lib/parse-json";
import {
  MAX_REFINE_HISTORY_MESSAGE_CHARS,
  MAX_REFINE_HISTORY_MESSAGES,
  MAX_REFINE_MESSAGE_CHARS,
} from "@/lib/refine-limits";
import {
  compactMascotForRefine,
  MAX_REFINE_SVG_CHARS_PER_BATCH,
  MAX_STUDIO_GESTURES,
  mergeRefinedGestureBatches,
  splitRefineGestures,
} from "@/lib/refine-pack";
import { isReferenceId } from "@/lib/reference-image-client";
import { loadReferenceImage } from "@/lib/reference-image";
import { sanitizeSvgOrThrow } from "@/lib/sanitize-svg";
import { styleReferenceBlock } from "@/lib/style-references";
import { applyThemeContract, normalizeGeneratedMascot } from "@/lib/studio-utils";
import { referenceImageBlock, refineReferenceBlock } from "@/lib/vision-prompt";
import type {
  GeneratedGesture,
  GeneratedMascot,
  RefineMessage,
  RefineRequest,
} from "@/lib/types";

export const runtime = "nodejs";
// Full-pack SVG refinements can take several minutes while the provider streams.
export const maxDuration = 300;

/** Refine packs include full gesture SVGs. Keep a firm but workable ceiling. */
const MAX_BODY_BYTES = 1_500_000;

const MODEL_DEADLINE_MS = 285_000;

class IncompleteRefineError extends Error {}

/** Specific reason the pack cannot be refined, or null when valid. */
function mascotRejectReason(value: unknown): string | null {
  if (!value || typeof value !== "object") return "Mascot pack is missing";
  const v = value as GeneratedMascot;
  const gestures = Array.isArray(v.gestures) ? v.gestures : [];
  const keys = gestures.map((gesture) => gesture?.key);

  if (typeof v.name !== "string" || !v.name.trim()) {
    return "Mascot pack needs a name";
  }
  if (typeof v.tagline !== "string") return "Mascot pack needs a tagline";
  if (typeof v.accent !== "string") return "Mascot pack needs an accent color";
  if (!v.themes || typeof v.themes !== "object" || Array.isArray(v.themes)) {
    return "Mascot pack needs themes";
  }
  if (Object.keys(v.themes).length === 0) {
    return "Mascot pack needs at least one theme";
  }
  if (
    !v.instrument ||
    typeof v.instrument !== "object" ||
    Array.isArray(v.instrument)
  ) {
    return "Mascot pack needs an instrument";
  }
  if (!Array.isArray(v.parts)) return "Mascot pack needs a parts list";
  if (gestures.length === 0) return "Mascot pack needs at least one gesture";
  if (gestures.length > MAX_STUDIO_GESTURES) {
    return `Mascot packs are limited to ${MAX_STUDIO_GESTURES} gestures`;
  }
  if (
    !gestures.every(
      (gesture) =>
        typeof gesture?.key === "string" &&
        gesture.key.trim().length > 0 &&
        typeof gesture.svg === "string" &&
        gesture.svg.includes("<svg")
    )
  ) {
    return "Every gesture needs a unique key and SVG markup";
  }
  if (new Set(keys).size !== keys.length) {
    return "Gesture keys must be unique";
  }
  return null;
}

function isMascot(value: unknown): value is GeneratedMascot {
  return mascotRejectReason(value) === null;
}

export async function POST(req: Request) {
  const deadlineAt = Date.now() + MODEL_DEADLINE_MS;

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

  const message = boundedText(body.message, MAX_REFINE_MESSAGE_CHARS);
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (!isMascot(body.mascot)) {
    return NextResponse.json(
      {
        error:
          mascotRejectReason(body.mascot) ??
          "Valid mascot pack required",
      },
      { status: 400 }
    );
  }
  const oversizedGesture = body.mascot.gestures.find(
    (gesture) => gesture.svg.length > MAX_REFINE_SVG_CHARS_PER_BATCH
  );
  if (oversizedGesture) {
    return NextResponse.json(
      {
        error: `Pose "${oversizedGesture.key}" is too complex to refine safely`,
        code: "REFINE_POSE_TOO_LARGE",
      },
      { status: 413 }
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
  const enabled = new Set(
    (Array.isArray(body.enabledParts) ? body.enabledParts : []).filter(
      (key): key is string => typeof key === "string"
    )
  );
  const history = (
    Array.isArray(body.history)
      ? body.history.slice(-MAX_REFINE_HISTORY_MESSAGES)
      : []
  ).filter(
    (entry): entry is RefineMessage =>
      Boolean(entry) &&
      (entry.role === "user" || entry.role === "assistant") &&
      typeof entry.content === "string"
  );

  // Serialised once: it is both what we price and what we send.
  const mascotJson = JSON.stringify(compactMascotForRefine(body.mascot));
  const gestureBatches = splitRefineGestures(body.mascot.gestures);
  const payloadChars =
    mascotJson.length +
    message.length +
    history.reduce((total, h) => total + h.content.length, 0);

  const metered = await openMeter(
    {
      kind: "refine",
      batches: gestureBatches.length,
      payloadChars,
      referenceImages: referenceImage ? gestureBatches.length : 0,
    },
    model
  );
  if (!metered.ok) return metered.response;
  const { meter } = metered;
  const remainingMs = Math.max(1, deadlineAt - Date.now());
  const deadlineSignal = AbortSignal.timeout(remainingMs);
  const batchAbort = new AbortController();
  const modelSignal = AbortSignal.any([
    req.signal,
    deadlineSignal,
    batchAbort.signal,
  ]);

  try {
    const successfulRuns = await Promise.all(
      gestureBatches.map((batch, batchIndex) =>
        runMascotModel({
          model,
          instructions: [
            `You refine an existing interactive mascot studio pack. Fully contextual. Obey the user's edit request.`,
            `Craft standard = Fanous + Lyra production SVG studios.`,
            referenceImage ? referenceImageBlock() : null,
            referenceImage ? refineReferenceBlock() : null,
            `This is pose batch ${batchIndex + 1} of ${gestureBatches.length}.`,
            `Return JSON only:`,
            `{"assistantMessage":string,"mascot":{...updated top-level GeneratedMascot fields, parts[], and only the assigned gestures[]}}`,
            `Rules:`,
            `- Return exactly these gesture keys, with no additions or omissions: ${batch.map((gesture) => gesture.key).join(", ")}`,
            `- Do not return gestures assigned to another batch`,
            `- Keep the same character identity unless the user asks to redesign`,
            `- Apply the requested change consistently to every assigned gesture`,
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
            body.look
              ? `Original look brief: ${boundedText(body.look, 1200)}`
              : null,
            referenceImage
              ? `The attached image shows what the user wants added, changed, or removed — follow it for that edit.`
              : null,
            `Currently enabled parts: ${[...enabled].join(", ") || "(none)"}`,
            `Conversation:`,
            ...history.map(
              (h) =>
                `${h.role.toUpperCase()}: ${boundedText(
                  h.content,
                  MAX_REFINE_HISTORY_MESSAGE_CHARS
                )}`
            ),
            `USER: ${message}`,
            ``,
            `Assigned output gesture keys: ${JSON.stringify(
              batch.map((gesture) => gesture.key)
            )}`,
            `Current full mascot JSON (context only; output only the assigned gestures):`,
            mascotJson,
            ``,
            `Return updated top-level mascot fields, parts[], exactly the assigned gestures[], and a short assistantMessage.`,
          ]
            .filter(Boolean)
            .join("\n"),
          images: referenceImage ? [referenceImage] : undefined,
          maxOutputTokens: 32_000,
          reasoningEffort: "low",
          signal: modelSignal,
        }).catch((err) => {
          if (!batchAbort.signal.aborted) batchAbort.abort();
          throw err;
        })
      )
    );

    const parsedBatches = successfulRuns.map((run) => {
      let parsed: {
        assistantMessage?: string;
        mascot?: GeneratedMascot;
      };
      try {
        parsed = parseJsonObject(run.text) as typeof parsed;
      } catch {
        throw new IncompleteRefineError("Refine returned invalid JSON");
      }
      if (!isMascot(parsed.mascot)) {
        throw new IncompleteRefineError(
          "Refine returned an incomplete mascot batch"
        );
      }
      return { ...parsed, mascot: parsed.mascot };
    });

    let mergedGestures: GeneratedGesture[];
    try {
      mergedGestures = mergeRefinedGestureBatches(
        body.mascot.gestures,
        gestureBatches,
        parsedBatches.map((parsed) => parsed.mascot.gestures)
      );
    } catch (error) {
      throw new IncompleteRefineError(
        error instanceof Error ? error.message : "Refine pose merge failed"
      );
    }

    const partsByKey = new Map(
      [
        ...(body.mascot.parts ?? []),
        ...parsedBatches.flatMap((parsed) => parsed.mascot.parts ?? []),
      ]
        .map((part) => [part.key, part] as const)
    );
    const parsedMascot: GeneratedMascot = {
      ...body.mascot,
      ...parsedBatches[0]!.mascot,
      gestures: mergedGestures,
      parts: [...partsByKey.values()],
    };
    const keys = body.mascot.gestures.map((gesture) => ({
      key: gesture.key,
      label: gesture.label,
      cat: gesture.cat,
      tip: gesture.tip,
      use: gesture.use,
    }));

    let mascot: GeneratedMascot;
    try {
      mascot = normalizeGeneratedMascot(parsedMascot, keys);
    } catch {
      try {
        const primary =
          parsedMascot.themes.primary ??
          Object.values(parsedMascot.themes)[0]!;
        const gestures: GeneratedGesture[] = parsedMascot.gestures.map((g) => ({
          ...g,
          svg: ensurePartAttributes(
            applyThemeContract(
              sanitizeSvgOrThrow(g.svg, `gesture "${g.key}"`),
              primary,
              parsedMascot.accent
            )
          ),
        }));
        const draft: GeneratedMascot = {
          ...parsedMascot,
          gestures,
          parts: parsedMascot.parts ?? [],
        };
        mascot = { ...draft, parts: extractPartsFromMascot(draft) };
      } catch {
        throw new IncompleteRefineError(
          "Refine returned an invalid mascot pack"
        );
      }
    }

    // Bill only after a usable pack is assembled. Refine is atomic for the
    // customer: no applied edit ⇒ full refund via settle(charged=0).
    for (const run of successfulRuns) {
      if (run.usage) {
        meter.record(run.usage, run.model);
      } else {
        meter.recordFallback({
          kind: "refine",
          batches: 1,
          payloadChars,
          referenceImages: referenceImage ? 1 : 0,
        });
      }
    }

    const tokens = await meter.settle();

    return NextResponse.json({
      assistantMessage:
        boundedText(parsedBatches[0]?.assistantMessage, 1_000) ||
        "Updated the mascot from your notes.",
      mascot,
      _meta: {
        model: successfulRuns[0]!.model,
        elapsedMs: Date.now() - started,
        ...tokenMetaFields(tokens),
      },
    });
  } catch (err) {
    // Always forgive before settle in finally — never charge for an edit that
    // did not produce an applied pack (the previous bug: partial batch usage
    // was billed on 502/504/500).
    meter.forgive();
    console.error("refine error:", err);
    const timedOut = deadlineSignal.aborted;
    const incomplete =
      err instanceof MascotModelResponseError ||
      err instanceof IncompleteRefineError;
    const publicError = timedOut
      ? {
          message:
            "This edit took too long. Try a smaller, more focused change.",
          code: "REFINE_TIMEOUT",
          status: 504,
        }
      : incomplete
        ? {
            message:
              "The AI could not complete this edit. Try a smaller, more focused change.",
            code: "REFINE_INCOMPLETE",
            status: 502,
          }
        : {
            message: "Could not apply that edit. Please try again.",
            code: "REFINE_FAILED",
            status: 500,
          };

    return NextResponse.json(
      {
        error: publicError.message,
        code: publicError.code,
      },
      { status: publicError.status }
    );
  } finally {
    // Idempotent if try already settled; on failure settles charged=0 (refund).
    await meter.settle();
  }
}
