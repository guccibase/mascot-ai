import { NextResponse } from "next/server";
import { availableMascotModels } from "@/lib/mascot-model";
import {
  DEFAULT_MASCOT_MODEL,
  MASCOT_MODEL_OPTIONS,
} from "@/lib/mascot-model-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const available = availableMascotModels();
  const defaultModel = available.includes(DEFAULT_MASCOT_MODEL)
    ? DEFAULT_MASCOT_MODEL
    : (available[0] ?? null);

  return NextResponse.json({
    models: MASCOT_MODEL_OPTIONS.map(({ id, label, provider, blurb }) => ({
      id,
      label,
      provider,
      blurb,
      available: available.includes(id),
    })),
    defaultModel,
  });
}
