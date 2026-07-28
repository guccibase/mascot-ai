import { NextResponse } from "next/server";
import { rateLimit, readJsonBody } from "@/lib/api-guard";
import {
  generateBriefSurprise,
  isSurpriseBriefConfigured,
  normalizeBriefContext,
  type BriefContext,
  type BriefSurpriseField,
} from "@/lib/brief-surprise";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 8_000;

const SURPRISE_FIELDS = new Set<BriefSurpriseField>([
  "name",
  "description",
  "look",
  "productContext",
  "personality",
  "all",
]);

function isBriefSurpriseRequest(
  value: unknown
): value is { field: BriefSurpriseField; brief: BriefContext } {
  if (!value || typeof value !== "object") return false;
  const v = value as { field?: unknown; brief?: unknown };
  return (
    typeof v.field === "string" &&
    SURPRISE_FIELDS.has(v.field as BriefSurpriseField) &&
    !!v.brief &&
    typeof v.brief === "object"
  );
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, {
    name: "brief-surprise",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSurpriseBriefConfigured()) {
    return NextResponse.json(
      { error: "Surprise me is unavailable — OPENAI_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const parsedBody = await readJsonBody<unknown>(req, MAX_BODY_BYTES);
  if (!parsedBody.ok) return parsedBody.response;

  if (!isBriefSurpriseRequest(parsedBody.data)) {
    return NextResponse.json(
      { error: "Invalid brief surprise request" },
      { status: 400 }
    );
  }

  const { field, brief: rawBrief } = parsedBody.data;
  const brief = normalizeBriefContext(rawBrief);

  try {
    const { result, model } = await generateBriefSurprise({
      field,
      brief,
      signal: req.signal,
    });
    return NextResponse.json({ ...result, _meta: { model } });
  } catch (err) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    const message =
      err instanceof Error ? err.message : "Brief suggestion failed";
    console.error("brief-surprise error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
