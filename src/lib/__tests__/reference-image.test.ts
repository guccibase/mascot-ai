import { describe, expect, it } from "vitest";
import {
  isReferenceMediaType,
  isReferenceId,
  REFERENCE_MAX_BYTES,
  REFERENCE_MAX_EDGE,
} from "@/lib/reference-image-client";
import {
  estimateFullCreate,
  estimateTokens,
  VISION_IMAGE_TOKENS_TYPICAL,
} from "@/lib/token-pricing";
import {
  referenceImageBlock,
  samplesReferenceBlock,
} from "@/lib/vision-prompt";

describe("reference-image-client", () => {
  it("accepts png/jpeg/webp", () => {
    expect(isReferenceMediaType("image/png")).toBe(true);
    expect(isReferenceMediaType("image/jpeg")).toBe(true);
    expect(isReferenceMediaType("image/webp")).toBe(true);
    expect(isReferenceMediaType("image/gif")).toBe(false);
  });

  it("exports sane limits", () => {
    expect(REFERENCE_MAX_BYTES).toBe(2_000_000);
    expect(REFERENCE_MAX_EDGE).toBe(1568);
  });
});

describe("reference-image server helpers", () => {
  it("validates reference id shape", () => {
    expect(isReferenceId("abc")).toBe(false);
    expect(isReferenceId("j57abc1234567890")).toBe(true);
  });
});

describe("vision token pricing", () => {
  it("adds surcharge when referenceImages is set", () => {
    const base = estimateTokens({ kind: "samples" }, "claude-opus-5");
    const withRef = estimateTokens(
      { kind: "samples", referenceImages: 1 },
      "claude-opus-5"
    );
    expect(withRef.typical - base.typical).toBe(VISION_IMAGE_TOKENS_TYPICAL);
  });

  it("full create includes sample + studio vision calls", () => {
    const plain = estimateFullCreate(3, "claude-opus-5");
    const withRef = estimateFullCreate(3, "claude-opus-5", 0, 1);
    expect(withRef.typical - plain.typical).toBe(VISION_IMAGE_TOKENS_TYPICAL * 3);
  });
});

describe("vision-prompt", () => {
  it("includes fidelity language", () => {
    expect(referenceImageBlock()).toContain("canonical design");
    expect(samplesReferenceBlock()).toContain("faithful variations");
  });
});
