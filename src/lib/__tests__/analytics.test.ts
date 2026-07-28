import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track }));

const { answered, oneOf, trackEvent, trackGenerationFailure } = await import(
  "../analytics"
);

beforeEach(() => {
  track.mockClear();
});

describe("trackEvent", () => {
  it("forwards the event name and properties", () => {
    trackEvent("model_selected", {
      model: "claude-opus-5",
      provider: "Anthropic",
    });

    expect(track).toHaveBeenCalledWith("model_selected", {
      model: "claude-opus-5",
      provider: "Anthropic",
    });
  });

  it("never sends more than the two properties Vercel keeps", () => {
    for (const [name, props] of [
      ["onboarding_step", { step: "proof", flow: "2" }],
      ["checkout_started", { product: "mascotai_monthly", kind: "plan" }],
      ["generate_started", { action: "studio", model: "gpt-5.6-sol" }],
      ["mascot_downloaded", { kind: "pack", gestures: 6 }],
    ] as const) {
      track.mockClear();
      trackEvent(name, props);
      expect(Object.keys(track.mock.calls[0]![1])).toHaveLength(
        Object.keys(props).length
      );
      expect(Object.keys(track.mock.calls[0]![1]).length).toBeLessThanOrEqual(2);
    }
  });
});

describe("trackGenerationFailure", () => {
  it("reports running out of tokens as a paywall hit, not a failure", () => {
    trackGenerationFailure("studio", "INSUFFICIENT_TOKENS");

    expect(track).toHaveBeenCalledWith("paywall_hit", {
      action: "studio",
      code: "INSUFFICIENT_TOKENS",
    });
  });

  it("reports having no plan as a paywall hit", () => {
    trackGenerationFailure("samples", "NO_SUBSCRIPTION");

    expect(track).toHaveBeenCalledWith("paywall_hit", {
      action: "samples",
      code: "NO_SUBSCRIPTION",
    });
  });

  it("falls back to a generic reason when the route sent no code", () => {
    trackGenerationFailure("refine");

    expect(track).toHaveBeenCalledWith("generate_failed", {
      action: "refine",
      reason: "error",
    });
  });
});

describe("oneOf", () => {
  const stacks = ["Next.js", "Flutter"];

  it("keeps an answer that came from our own suggestions", () => {
    expect(oneOf("Next.js", stacks)).toBe("Next.js");
    expect(oneOf("  Flutter  ", stacks)).toBe("Flutter");
  });

  it("buckets anything the customer typed themselves", () => {
    expect(oneOf("Rails + htmx at acme.internal", stacks)).toBe("other");
  });

  it("distinguishes an unanswered question from a typed one", () => {
    expect(oneOf("", stacks)).toBe("skipped");
    expect(oneOf(null, stacks)).toBe("skipped");
    expect(oneOf("   ", stacks)).toBe("skipped");
  });
});

describe("answered", () => {
  it("passes through a real answer and labels a missing one", () => {
    expect(answered("Product Hunt")).toBe("Product Hunt");
    expect(answered(null)).toBe("skipped");
    expect(answered(" ")).toBe("skipped");
  });
});
