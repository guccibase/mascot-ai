import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { POST } from "./route";

function request() {
  return POST(
    new Request("http://localhost/api/generate/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pixel Pup",
        description: "A tiny digital companion",
        look: "Warm pixel art dog",
        model: "claude-opus-5",
      }),
    })
  );
}

function sample(svg: string) {
  return { id: "a", title: "Classic Sit", rationale: "Friendly", svg };
}

describe("POST /api/generate/samples", () => {
  const meter = {
    record: vi.fn(),
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
  });

  it("repairs JSON-escaped SVG attributes before returning samples", async () => {
    const escapedSvg = String.raw`<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 420 520\"><rect x=\"10\" y=\"20\" width=\"40\" height=\"50\"/></svg>`;
    mocks.runMascotModel.mockResolvedValue({
      model: "claude-opus-5",
      usage: { input_tokens: 100, output_tokens: 100 },
      text: JSON.stringify({ samples: [sample(escapedSvg)] }),
    });

    const response = await request();
    const data = (await response.json()) as {
      samples: Array<{ svg: string }>;
    };

    expect(response.status).toBe(200);
    expect(data.samples[0]!.svg).toContain('viewBox="0 0 420 520"');
    expect(data.samples[0]!.svg).toContain('width="40"');
    expect(data.samples[0]!.svg).not.toContain("\\");
    expect(meter.record).toHaveBeenCalledTimes(1);
    expect(meter.forgive).not.toHaveBeenCalled();
  });

  it("rejects non-renderable sample dimensions without charging", async () => {
    mocks.runMascotModel.mockResolvedValue({
      model: "claude-opus-5",
      usage: { input_tokens: 100, output_tokens: 100 },
      text: JSON.stringify({
        samples: [sample('<svg viewBox="broken"><rect width="10"/></svg>')],
      }),
    });

    const response = await request();
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(data.error).toBe("Model returned no usable sample SVGs");
    expect(meter.record).not.toHaveBeenCalled();
    expect(meter.forgive).toHaveBeenCalledTimes(1);
  });
});
