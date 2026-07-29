import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedMascot } from "@/lib/types";

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

vi.mock("@/lib/reference-image", () => ({
  loadReferenceImage: vi.fn(),
}));

import { MascotModelResponseError } from "@/lib/mascot-model";
import { POST } from "./route";

function mascotWith24Poses(): GeneratedMascot {
  return {
    name: "Batch Bird",
    tagline: "Keeps every pose",
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
    gestures: Array.from({ length: 24 }, (_, index) => ({
      key: `pose_${index}`,
      label: `Pose ${index}`,
      cat: "Core",
      tip: `Tip ${index}`,
      use: `Use ${index}`,
      track: index === 0,
      svg: `<svg viewBox="0 0 420 520"><g data-ms-part="body">${"x".repeat(
        9_000
      )}</g></svg>`,
    })),
  };
}

function assignedKeys(instructions: string): string[] {
  const match = instructions.match(
    /Return exactly these gesture keys, with no additions or omissions: ([^\n]+)/
  );
  if (!match?.[1]) throw new Error("Missing assigned keys in test prompt");
  return match[1].split(", ");
}

describe("POST /api/generate/refine", () => {
  let mascot: GeneratedMascot;
  const meter = {
    record: vi.fn(),
    recordFallback: vi.fn(),
    forgive: vi.fn(),
    settle: vi.fn(async () => ({
      tokens: 123,
      balance: 456,
      estimated: 789,
      committed: true,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mascot = mascotWith24Poses();
    mocks.openMeter.mockResolvedValue({ ok: true, meter });
    mocks.runMascotModel.mockImplementation(
      async (args: { instructions: string }) => {
        const keys = assignedKeys(args.instructions);
        return {
          model: "gpt-5.6-sol",
          usage: { input_tokens: 1_000, output_tokens: 2_000 },
          text: JSON.stringify({
            assistantMessage: "Updated every pose.",
            mascot: {
              ...mascot,
              gestures: keys.map((key) => ({
                ...mascot.gestures.find((gesture) => gesture.key === key)!,
                svg: `<svg viewBox="0 0 420 520"><g data-ms-part="body" data-refined="${key}"></g></svg>`,
              })),
            },
          }),
        };
      }
    );
  });

  async function request() {
    return POST(
      new Request("http://localhost/api/generate/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascot,
          model: "gpt-5.6-sol",
          message: "Make the beak face forward",
          enabledParts: ["body"],
        }),
      })
    );
  }

  it("refines 24 poses in concurrent safe-size batches and merges atomically", async () => {
    const response = await request();
    const data = (await response.json()) as {
      mascot: GeneratedMascot;
      assistantMessage: string;
    };

    expect(response.status).toBe(200);
    expect(mocks.runMascotModel).toHaveBeenCalledTimes(3);
    expect(
      mocks.runMascotModel.mock.calls.map(
        ([args]) => (args as { maxOutputTokens: number }).maxOutputTokens
      )
    ).toEqual([32_000, 32_000, 32_000]);
    expect(data.mascot.gestures.map((gesture) => gesture.key)).toEqual(
      mascot.gestures.map((gesture) => gesture.key)
    );
    expect(
      data.mascot.gestures.every((gesture) =>
        gesture.svg.includes("data-refined")
      )
    ).toBe(true);
    expect(data.mascot.gestures[0]?.track).toBe(true);
    expect(data.assistantMessage).toBe("Updated every pose.");
    expect(meter.record).toHaveBeenCalledTimes(3);
    expect(meter.forgive).not.toHaveBeenCalled();
    expect(meter.settle).toHaveBeenCalled();
    expect(mocks.openMeter).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "refine", batches: 3 }),
      "gpt-5.6-sol"
    );
  });

  it("returns no partial mascot and refunds fully when one batch truncates", async () => {
    const success = mocks.runMascotModel.getMockImplementation()!;
    let call = 0;
    mocks.runMascotModel.mockImplementation(async (args) => {
      call += 1;
      if (call === 2) {
        throw new MascotModelResponseError(
          "truncated",
          "gpt-5.6-sol",
          { input_tokens: 900, output_tokens: 32_000 }
        );
      }
      return success(args);
    });

    const response = await request();
    const data = (await response.json()) as {
      code?: string;
      mascot?: GeneratedMascot;
    };

    expect(response.status).toBe(502);
    expect(data.code).toBe("REFINE_INCOMPLETE");
    expect(data.mascot).toBeUndefined();
    expect(mocks.runMascotModel).toHaveBeenCalledTimes(3);
    // Atomic refine: never bill for an edit that did not apply.
    expect(meter.record).not.toHaveBeenCalled();
    expect(meter.recordFallback).not.toHaveBeenCalled();
    expect(meter.forgive).toHaveBeenCalledTimes(1);
    expect(meter.settle).toHaveBeenCalled();
  });

  it("refunds fully when every batch returns but merge cannot assemble a pack", async () => {
    mocks.runMascotModel.mockResolvedValue({
      model: "gpt-5.6-sol",
      usage: { input_tokens: 1_000, output_tokens: 2_000 },
      text: JSON.stringify({
        assistantMessage: "oops",
        mascot: {
          ...mascot,
          // Wrong keys → merge throws IncompleteRefineError after all calls.
          gestures: [
            {
              ...mascot.gestures[0]!,
              key: "not_assigned",
              svg: `<svg viewBox="0 0 420 520"><g data-ms-part="body"></g></svg>`,
            },
          ],
        },
      }),
    });

    const response = await request();
    const data = (await response.json()) as {
      code?: string;
      mascot?: GeneratedMascot;
    };

    expect(response.status).toBe(502);
    expect(data.code).toBe("REFINE_INCOMPLETE");
    expect(data.mascot).toBeUndefined();
    expect(meter.record).not.toHaveBeenCalled();
    expect(meter.forgive).toHaveBeenCalledTimes(1);
    expect(meter.settle).toHaveBeenCalled();
  });

  it("rejects an individually oversized pose before metering", async () => {
    mascot.gestures = [
      {
        ...mascot.gestures[0]!,
        svg: `<svg>${"x".repeat(80_001)}</svg>`,
      },
    ];

    const response = await request();
    const data = (await response.json()) as { code?: string };

    expect(response.status).toBe(413);
    expect(data.code).toBe("REFINE_POSE_TOO_LARGE");
    expect(mocks.openMeter).not.toHaveBeenCalled();
    expect(mocks.runMascotModel).not.toHaveBeenCalled();
  });

  it("rejects duplicate pose keys before metering", async () => {
    mascot.gestures[1] = {
      ...mascot.gestures[1]!,
      key: mascot.gestures[0]!.key,
    };

    const response = await request();

    expect(response.status).toBe(400);
    expect(mocks.openMeter).not.toHaveBeenCalled();
    expect(mocks.runMascotModel).not.toHaveBeenCalled();
  });
});
