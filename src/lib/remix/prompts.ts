import type { ExampleRemixConfig } from "./types";
import { remixReferenceBlock } from "@/lib/vision-prompt";

export const REMIX_IDENTITY_SCHEMA = `{
  "name": "string, the new mascot's name",
  "tagline": "string, one line personality hook",
  "product": "string optional, what app this is for",
  "accent": "#RRGGBB, primary accent",
  "glowLabel": "string optional, label for the glow slider",
  "instrument": {
    "label": "string",
    "description": "string",
    "lowLabel": "string",
    "midLabel": "string",
    "highLabel": "string",
    "defaultValue": 55-80 integer (resting signal; never 0-15),
    "ramp": ["#hex","#hex","#hex","#hex","#hex"]
  },
  "themes": {
    "primary": { "name","top","mid","base","core","stage","features?" }
  },
  "palette": { "#OLD_HEX": "#NEW_HEX" },
  "edits": [
    { "id": "element id from manifest", "fill?": "#hex", "stroke?": "#hex", "d?": "path data", "part?": "stable part key" }
  ],
  "parts": [
    { "key": "string", "label": "string", "category": "string", "essential?": boolean }
  ]
}`;

export const REMIX_POSE_SCHEMA = `{
  "edits": [
    { "id": "element id from variant manifest", "fill?": "#hex", "stroke?": "#hex", "d?": "path data", "part?": "stable part key" }
  ],
  "track": "boolean optional, eyes follow cursor",
  "delight": "boolean optional, auto spark bursts",
  "signal": "number optional 0-100, instrument slider default"
}`;

export function buildIdentityPrompt(args: {
  slug: string;
  exampleName: string;
  name: string;
  description: string;
  look: string;
  descriptionFromSource?: boolean;
  lookFromSource?: boolean;
  productContext?: string;
  personality?: string;
  sharedManifest: unknown[];
  palette: unknown[];
  hasReference?: boolean;
}): string {
  const briefMode =
    args.descriptionFromSource && args.lookFromSource
      ? "SOURCE VISUAL REFERENCE (no user description/look overrides — treat pose thumbnails and palette as canonical):"
      : args.descriptionFromSource || args.lookFromSource
        ? "BRIEF (blank fields inherit source artwork; honour any user overrides below):"
        : "NEW CHARACTER BRIEF (user overrides):";

  return `You are remixing the "${args.exampleName}" example mascot (${args.slug}) into a NEW character.

CRITICAL RULES:
- Return ONLY valid JSON matching the schema below. No markdown fences.
- NEVER output full SVG markup. Only targeted edits keyed by element id.
- Do NOT modify animation tags, <style>, viewBox, or transforms on animate* elements.
- Shape edits: only change fill, stroke, and path "d" on elements in the manifest.
- palette maps OLD hex colours (from the example) to NEW hex colours for the remixed character. Every palette value must be a literal #RRGGBB. Theme CSS vars come later.
- Shared elements appear in EVERY pose. Edit them once here so the character stays consistent.
- Assign part keys (accessory, prop, halo, instrument, etc.) via edits[].part where appropriate.
${args.hasReference ? `- ${remixReferenceBlock()}` : ""}

${briefMode}
Name: ${args.name}
Description: ${args.description}
Look: ${args.look}
${args.productContext ? `Product: ${args.productContext}` : ""}
${args.personality ? `Personality: ${args.personality}` : ""}

EXAMPLE COLOUR PALETTE (old hexes; remap all of these):
${JSON.stringify(args.palette)}

SHARED ELEMENT MANIFEST (${args.sharedManifest.length} elements; edit shapes/colours only):
${JSON.stringify(args.sharedManifest)}

OUTPUT SCHEMA:
${REMIX_IDENTITY_SCHEMA}`;
}

export function buildPosePrompt(args: {
  poseKey: string;
  poseLabel: string;
  variantManifest: unknown[];
  sharedEdits: unknown[];
  look: string;
  lookFromSource?: boolean;
}): string {
  const lookLine = args.lookFromSource
    ? `TARGET LOOK (source reference — preserve craft unless brief overrides): ${args.look}`
    : `TARGET LOOK (user override): ${args.look}`;

  return `Continue remixing this mascot. This is pose "${args.poseLabel}" (${args.poseKey}).

CRITICAL RULES:
- Return ONLY valid JSON. No markdown fences, no SVG strings.
- Only edit elements in the VARIANT manifest below (pose-specific parts: eyes, mouth, props, arms).
- Do NOT repeat shared-body edits unless this pose needs a pose-specific override.
- Never touch animation, style, or viewBox tokens.

${lookLine}

SHARED EDITS ALREADY APPLIED (reference; do not re-emit unless overriding):
${JSON.stringify(args.sharedEdits)}

VARIANT MANIFEST (${args.variantManifest.length} elements):
${JSON.stringify(args.variantManifest)}

OUTPUT SCHEMA:
${REMIX_POSE_SCHEMA}`;
}

export function configHint(_cfg: ExampleRemixConfig): string {
  return "Preserve all SMIL and CSS keyframe animations exactly. Only reshape geometry and swap colours.";
}
