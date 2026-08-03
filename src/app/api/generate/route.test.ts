import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  openMeter: vi.fn(),
  rateLimit: vi.fn(async () => null),
  resolveMascotModel: vi.fn(() => ({
    ok: true as const,
    model: "claude-opus-5" as const,
  })),
  runMascotModel: vi.fn(),
}));

vi.mock("@/lib/api-guard", () => ({
  boundedText: (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "",
  rateLimit: mocks.rateLimit,
  readJsonBody: async (request: Request) => ({
    ok: true as const,
    data: await request.json(),
  }),
}));

vi.mock("@/lib/mascot-model", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mascot-model")>();
  return {
    ...actual,
    resolveMascotModel: mocks.resolveMascotModel,
    runMascotModel: mocks.runMascotModel,
  };
});

vi.mock("@/lib/metering", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/metering")>();
  return { ...actual, openMeter: mocks.openMeter };
});

vi.mock("@/lib/reference-image-client", () => ({
  isReferenceId: () => false,
}));

vi.mock("@/lib/style-references", () => ({
  styleReferenceBlock: () => "Reference styles",
}));

import { maxDuration, POST } from "./route";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 520"><g data-ms-part="body"><rect width="20" height="20" fill="#F2DCCE"/></g></svg>';

const bible = {
  name: "Pixel Pup",
  tagline: "Always ready",
  accent: "#F08A3C",
  silhouette: "A square pixel pup",
  themes: {
    primary: {
      name: "Primary",
      top: "#F2DCCE",
      mid: "#F08A3C",
      base: "#E8453C",
      core: "#FFF6CF",
      stage: "#202838",
    },
  },
  instrument: {
    label: "Fetch Signal Tail",
    description: "Controls the tail",
    lowLabel: "Resting Curl",
    midLabel: "Happy Wag",
    highLabel: "Full Zoomies",
    defaultValue: 68,
    ramp: ["#F2DCCE", "#FFC23C", "#F08A3C", "#E8453C", "#8A3A0A"],
    themes_note: "must be removed",
  },
};

function request(overrides: Record<string, unknown> = {}) {
  return POST(
    new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pixel Pup",
        description: "A tiny digital companion",
        look: "Warm pixel art dog",
        model: "claude-opus-5",
        selectedSample: {
          id: "a",
          title: "Classic Sit",
          rationale: "Friendly and clear",
          svg: SVG,
        },
        gestures: [
          {
            key: "idle",
            label: "Idle",
            cat: "Core",
            tip: "At rest",
            use: "Home screen",
          },
        ],
        ...overrides,
      }),
    })
  );
}

describe("POST /api/generate", () => {
  const meter = {
    record: vi.fn(),
    recordFallback: vi.fn(),
    forgive: vi.fn(),
    settle: vi.fn(async () => ({
      tokens: 50,
      balance: 1_000,
      estimated: 50,
      committed: true,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.openMeter.mockResolvedValue({ ok: true, meter });
    mocks.runMascotModel
      .mockResolvedValueOnce({
        model: "claude-opus-5",
        usage: { input_tokens: 100, output_tokens: 100 },
        text: JSON.stringify(bible),
      })
      .mockResolvedValueOnce({
        model: "claude-opus-5",
        usage: { input_tokens: 100, output_tokens: 100 },
        text: JSON.stringify({ svg: SVG }),
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the 300-second route budget and propagates one deadline signal", async () => {
    const response = await request();
    const data = (await response.json()) as {
      instrument: Record<string, unknown>;
    };

    expect(maxDuration).toBe(300);
    expect(response.status).toBe(200);
    expect(data.instrument).not.toHaveProperty("themes_note");
    expect(mocks.runMascotModel).toHaveBeenCalledTimes(2);
    const firstSignal = mocks.runMascotModel.mock.calls[0]![0].signal;
    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(mocks.runMascotModel.mock.calls[1]![0].signal).toBe(firstSignal);
  });

  it("returns structured 504 JSON and refunds when the provider deadline expires", async () => {
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
    mocks.runMascotModel.mockReset().mockRejectedValue(new Error("aborted"));

    const response = await request();
    const data = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(504);
    expect(data).toEqual({
      error: "Studio generation took too long. Please try again.",
      code: "STUDIO_TIMEOUT",
    });
    expect(meter.forgive).toHaveBeenCalledTimes(1);
    expect(meter.settle).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed bible objects before generating SVGs", async () => {
    mocks.runMascotModel.mockReset().mockResolvedValueOnce({
      model: "claude-opus-5",
      usage: { input_tokens: 100, output_tokens: 100 },
      text: JSON.stringify({
        ...bible,
        instrument: { ...bible.instrument, label: 42 },
      }),
    });

    const response = await request();
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to lock character bible");
    expect(mocks.runMascotModel).toHaveBeenCalledTimes(1);
    expect(meter.record).not.toHaveBeenCalled();
    expect(meter.forgive).toHaveBeenCalledTimes(1);
    expect(meter.settle).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed and duplicate gestures before metering", async () => {
    const malformed = await request({ gestures: { idle: true } });
    expect(malformed.status).toBe(400);

    const duplicateGesture = {
      key: "idle",
      label: "Idle",
      cat: "Core",
      tip: "At rest",
      use: "Home screen",
    };
    const duplicate = await request({
      gestures: [duplicateGesture, duplicateGesture],
    });
    const data = (await duplicate.json()) as { error?: string };

    expect(duplicate.status).toBe(400);
    expect(data.error).toBe("Gesture keys must be unique");
    expect(mocks.openMeter).not.toHaveBeenCalled();
    expect(mocks.runMascotModel).not.toHaveBeenCalled();
  });

  it("rejects malformed selected samples before metering", async () => {
    const response = await request({
      selectedSample: { id: "a", title: "Broken", svg: 42 },
    });

    expect(response.status).toBe(400);
    expect(mocks.openMeter).not.toHaveBeenCalled();
    expect(mocks.runMascotModel).not.toHaveBeenCalled();
  });
});
