import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedMascot } from "@/lib/types";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  openMeter: vi.fn(),
  rateLimit: vi.fn(async () => null),
  resolveMascotModel: vi.fn(() => ({
    ok: true as const,
    model: "gpt-5.6-sol" as const,
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
  return {
    ...actual,
    openMeter: mocks.openMeter,
  };
});

vi.mock("@/lib/reference-image-client", () => ({
  isReferenceId: () => false,
}));

import { POST } from "./route";

function baseMascot(): GeneratedMascot {
  return {
    name: "Test Bird",
    tagline: "For gesture tests",
    accent: "#E8A84A",
    glowLabel: "Spotlight",
    themes: {
      primary: {
        name: "Primary",
        top: "#D7A667",
        mid: "#C98A3B",
        base: "#202A31",
        core: "#F3E8CD",
        stage: "#18241F",
        features: "#12181D",
      },
    },
    instrument: {
      label: "Signal",
      description: "Intensity",
      lowLabel: "Low",
      midLabel: "Mid",
      highLabel: "High",
      defaultValue: 50,
      ramp: ["#111111", "#333333", "#555555", "#777777", "#999999"],
      hidden: true,
    },
    parts: [{ key: "body", label: "Body", category: "Core" }],
    gestures: [
      {
        key: "idle",
        label: "Idle",
        cat: "Core",
        tip: "Rest",
        use: "Default",
        track: true,
        svg: `<svg viewBox="0 0 420 520"><g data-ms-part="body"></g></svg>`,
      },
    ],
  };
}

describe("POST /api/generate/gesture", () => {
  const meter = {
    record: vi.fn(),
    recordFallback: vi.fn(),
    forgive: vi.fn(),
    settle: vi.fn(async () => ({
      tokens: 50,
      balance: 1000,
      estimated: 50,
      committed: true,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.openMeter.mockResolvedValue({ ok: true, meter });
    mocks.runMascotModel.mockResolvedValue({
      model: "gpt-5.6-sol",
      usage: { input_tokens: 500, output_tokens: 800 },
      text: JSON.stringify({
        svg: `<svg viewBox="0 0 420 520"><g data-ms-part="body" data-gesture="wave"></g></svg>`,
      }),
    });
  });

  async function request(mascot: GeneratedMascot, key = "wave") {
    return POST(
      new Request("http://localhost/api/generate/gesture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascot,
          model: "gpt-5.6-sol",
          gesture: {
            key,
            label: "Wave",
            cat: "Delight",
            tip: "Hello",
            use: "Greeting",
          },
        }),
      })
    );
  }

  it("adds a gesture and settles metering on success", async () => {
    const response = await request(baseMascot());
    const data = (await response.json()) as {
      gesture: { key: string };
      mascot: GeneratedMascot;
    };

    expect(response.status).toBe(200);
    expect(data.gesture.key).toBe("wave");
    expect(data.mascot.gestures).toHaveLength(2);
    expect(meter.record).toHaveBeenCalled();
    expect(meter.forgive).not.toHaveBeenCalled();
    expect(meter.settle).toHaveBeenCalled();
  });

  it("forgives the hold when generation fails", async () => {
    mocks.runMascotModel.mockRejectedValue(new Error("model down"));

    const response = await request(baseMascot());
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(data.error).toMatch(/model down/);
    expect(meter.record).not.toHaveBeenCalled();
    expect(meter.forgive).toHaveBeenCalledTimes(1);
    expect(meter.settle).toHaveBeenCalled();
  });

  it("rejects duplicate gesture keys before metering", async () => {
    const mascot = baseMascot();
    const response = await request(mascot, "idle");

    expect(response.status).toBe(409);
    expect(mocks.openMeter).not.toHaveBeenCalled();
    expect(mocks.runMascotModel).not.toHaveBeenCalled();
  });

  it("rejects at 64 gestures before metering", async () => {
    const mascot = baseMascot();
    mascot.gestures = Array.from({ length: 64 }, (_, index) => ({
      key: index === 0 ? "idle" : `pose_${index}`,
      label: `Pose ${index}`,
      cat: "Core",
      tip: "Tip",
      use: "Use",
      track: index === 0,
      svg: `<svg viewBox="0 0 420 520"><g data-ms-part="body"></g></svg>`,
    }));

    const response = await request(mascot);
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/64 gestures/);
    expect(mocks.openMeter).not.toHaveBeenCalled();
    expect(mocks.runMascotModel).not.toHaveBeenCalled();
  });
});
