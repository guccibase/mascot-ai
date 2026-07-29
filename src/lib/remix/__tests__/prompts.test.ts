import { describe, expect, it } from "vitest";
import { buildIdentityPrompt, buildPosePrompt } from "../prompts";

describe("remix prompts", () => {
  const baseIdentity = {
    slug: "mascot",
    exampleName: "Lyra",
    name: "Nova",
    description: "Preserve Lyra craft",
    look: "Indexed pose reference",
    sharedManifest: [{ id: "a1" }],
    palette: [{ hex: "#112233" }],
  };

  it("labels fully defaulted brief as source visual reference", () => {
    const prompt = buildIdentityPrompt({
      ...baseIdentity,
      descriptionFromSource: true,
      lookFromSource: true,
    });
    expect(prompt).toMatch(/SOURCE VISUAL REFERENCE/i);
    expect(prompt).not.toMatch(/user overrides/i);
  });

  it("labels mixed brief as inherit source with overrides", () => {
    const prompt = buildIdentityPrompt({
      ...baseIdentity,
      descriptionFromSource: true,
      lookFromSource: false,
      look: "Neon palette",
    });
    expect(prompt).toMatch(/inherit source artwork/i);
    expect(prompt).toMatch(/Neon palette/);
  });

  it("labels fully custom brief as user overrides", () => {
    const prompt = buildIdentityPrompt({
      ...baseIdentity,
      descriptionFromSource: false,
      lookFromSource: false,
    });
    expect(prompt).toMatch(/user overrides/i);
  });

  it("pose prompt distinguishes source look from user override", () => {
    const source = buildPosePrompt({
      poseKey: "idle",
      poseLabel: "Idle",
      variantManifest: [],
      sharedEdits: [],
      look: "Keep source craft",
      lookFromSource: true,
    });
    expect(source).toMatch(/source reference/i);

    const override = buildPosePrompt({
      poseKey: "idle",
      poseLabel: "Idle",
      variantManifest: [],
      sharedEdits: [],
      look: "Neon cyberpunk",
      lookFromSource: false,
    });
    expect(override).toMatch(/user override/i);
  });
});
