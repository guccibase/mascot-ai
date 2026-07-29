import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  authedConvexClient: vi.fn(),
  openMeter: vi.fn(),
  rateLimit: vi.fn(async () => null),
  resolveMascotModel: vi.fn(() => ({
    ok: true as const,
    model: "gpt-5.6-sol" as const,
  })),
  runMascotModel: vi.fn(),
  restoreUnlock: vi.fn(),
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

vi.mock("@/lib/convex-server", () => ({
  authedConvexClient: mocks.authedConvexClient,
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

import { POST } from "./route";
import * as buildGestures from "@/lib/remix/build-gestures";
import {
  examplePackAsGenerated,
  remixIdentityJson,
  remixPoseJson,
  remixRequestBody,
} from "@/lib/remix/__tests__/fixtures";

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/remix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/remix", () => {
  const meter = {
    record: vi.fn(),
    recordFallback: vi.fn(),
    forgive: vi.fn(),
    settle: vi.fn(async () => ({
      tokens: 42,
      balance: 1000,
      estimated: 42,
      committed: true,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    const sourcePack = examplePackAsGenerated("lyra");
    mocks.authedConvexClient.mockResolvedValue({
      query: vi.fn(async () => ({
        name: sourcePack.name,
        sourceId: "src-1",
        pack: sourcePack,
      })),
      mutation: mocks.restoreUnlock,
    });
    mocks.openMeter.mockResolvedValue({ ok: true, meter });
    mocks.runMascotModel.mockImplementation(async (args: { input?: string }) => {
      if (args.input === "Return the pose JSON now.") {
        return {
          text: JSON.stringify(remixPoseJson()),
          model: "gpt-5.6-sol",
          usage: { inputTokens: 1, outputTokens: 1 },
        };
      }
      return {
        text: JSON.stringify(remixIdentityJson()),
        model: "gpt-5.6-sol",
        usage: { inputTokens: 1, outputTokens: 1 },
      };
    });
  });

  describe("validation", () => {
    it("accepts name-only brief (description and look optional)", async () => {
      const res = await post(remixRequestBody());
      expect(res.status).toBe(200);
      const data = (await res.json()) as { mascot?: { name: string } };
      expect(data.mascot?.name).toBe("Remixed");
    });

    it("rejects missing name", async () => {
      const res = await post(remixRequestBody({ name: "   " }));
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error?: string };
      expect(data.error).toMatch(/name/i);
    });

    it("rejects missing source", async () => {
      const res = await post({
        name: "Remixed",
        gestures: remixRequestBody().gestures,
      });
      expect(res.status).toBe(400);
    });

    it("rejects legacy slug-only remix", async () => {
      const res = await post({
        slug: "lyra",
        name: "Remixed",
        gestures: remixRequestBody().gestures,
      });
      expect(res.status).toBe(410);
    });

    it("rejects zero poses", async () => {
      const res = await post(remixRequestBody({ gestures: [] }));
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error?: string };
      expect(data.error).toMatch(/between 1 and/i);
    });

    it("rejects unknown pose keys", async () => {
      const res = await post(
        remixRequestBody({
          gestures: [
            {
              key: "not-a-real-pose",
              label: "Nope",
              cat: "Core",
              tip: "x",
              use: "x",
            },
          ],
        })
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error?: string };
      expect(data.error).toMatch(/Unknown poses/i);
    });

    it("rejects unauthenticated requests", async () => {
      mocks.authedConvexClient.mockResolvedValueOnce(null);
      const res = await post(remixRequestBody());
      expect(res.status).toBe(401);
    });

    it("returns metering response when balance is insufficient", async () => {
      mocks.openMeter.mockResolvedValueOnce({
        ok: false,
        response: new Response(JSON.stringify({ error: "stop" }), {
          status: 402,
        }),
      });
      const res = await post(remixRequestBody());
      expect(res.status).toBe(402);
    });
  });

  describe("success path", () => {
    it("returns a mascot pack with requested poses", async () => {
      const res = await post(
        remixRequestBody({
          gestures: [
            {
              key: "idle",
              label: "Idle",
              cat: "Core",
              tip: "Rest",
              use: "Home",
            },
            {
              key: "listening",
              label: "Listening",
              cat: "Core",
              tip: "Listen",
              use: "Voice",
            },
          ],
        })
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        mascot: { gestures: Array<{ key: string; svg: string }> };
      };
      expect(data.mascot.gestures).toHaveLength(2);
      expect(data.mascot.gestures.map((g) => g.key)).toEqual([
        "idle",
        "listening",
      ]);
      for (const gesture of data.mascot.gestures) {
        expect(gesture.svg).toContain("<svg");
      }
    });

    it("uses source-default brief in identity prompt when look/description omitted", async () => {
      await post(remixRequestBody());
      const identityCall = mocks.runMascotModel.mock.calls.find(
        (call) => call[0]?.input !== "Return the pose JSON now."
      );
      expect(identityCall?.[0]?.instructions).toMatch(
        /SOURCE VISUAL REFERENCE/i
      );
      expect(identityCall?.[0]?.instructions).toMatch(/Lyra/i);
    });

    it("uses user override brief mode when description and look provided", async () => {
      await post(
        remixRequestBody({
          description: "Shy librarian owl",
          look: "Muted teal palette",
        })
      );
      const identityCall = mocks.runMascotModel.mock.calls.find(
        (call) => call[0]?.input !== "Return the pose JSON now."
      );
      expect(identityCall?.[0]?.instructions).toMatch(/user overrides/i);
      expect(identityCall?.[0]?.instructions).toMatch(/Shy librarian owl/);
    });

    it("records warnings when pose AI fails but still returns shared-edit poses", async () => {
      mocks.runMascotModel.mockImplementation(
        async (args: { input?: string; instructions?: string }) => {
          if (args.input === "Return the pose JSON now.") {
            if (args.instructions?.includes("(listening)")) {
              throw new Error("pose model failed");
            }
            return {
              text: JSON.stringify(remixPoseJson()),
              model: "gpt-5.6-sol",
              usage: { inputTokens: 1, outputTokens: 1 },
            };
          }
          return {
            text: JSON.stringify(remixIdentityJson()),
            model: "gpt-5.6-sol",
            usage: { inputTokens: 1, outputTokens: 1 },
          };
        }
      );

      const res = await post(
        remixRequestBody({
          gestures: [
            {
              key: "idle",
              label: "Idle",
              cat: "Core",
              tip: "Rest",
              use: "Home",
            },
            {
              key: "listening",
              label: "Listening",
              cat: "Core",
              tip: "Listen",
              use: "Voice",
            },
          ],
        })
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        mascot: { gestures: Array<{ key: string }> };
        _meta: { warnings?: string[] };
      };
      expect(data.mascot.gestures).toHaveLength(2);
      expect(data._meta.warnings?.some((w) => w.includes("listening"))).toBe(
        true
      );
    });
  });

  describe("partial failures", () => {
    it("returns 502 when build produces no usable poses", async () => {
      vi.spyOn(buildGestures, "buildRemixGestures").mockReturnValue({
        gestures: [],
        warnings: ["idle: preservation gate failed; pose skipped"],
        skippedGestures: ["idle"],
      });

      const res = await post(remixRequestBody());
      expect(res.status).toBe(502);
      const data = (await res.json()) as { error?: string };
      expect(data.error).toMatch(/no usable poses/i);
      expect(meter.forgive).toHaveBeenCalled();
    });

    it("returns 502 when every pose AI call throws and build has no output", async () => {
      vi.spyOn(buildGestures, "buildRemixGestures").mockReturnValue({
        gestures: [],
        warnings: [],
        skippedGestures: ["idle"],
      });
      mocks.runMascotModel.mockImplementation(
        async (args: { input?: string }) => {
          if (args.input === "Return the pose JSON now.") {
            throw new Error("pose model failed");
          }
          return {
            text: JSON.stringify(remixIdentityJson()),
            model: "gpt-5.6-sol",
            usage: { inputTokens: 1, outputTokens: 1 },
          };
        }
      );

      const res = await post(remixRequestBody());
      expect(res.status).toBe(502);
      expect(meter.forgive).toHaveBeenCalled();
    });

    it("forgives metering when identity JSON is invalid", async () => {
      mocks.runMascotModel.mockResolvedValueOnce({
        text: "{not json",
        model: "gpt-5.6-sol",
        usage: { inputTokens: 1, outputTokens: 1 },
      });

      const res = await post(remixRequestBody());
      expect(res.status).toBe(502);
      expect(meter.forgive).toHaveBeenCalled();
    });
  });

  describe("marketplace unlock", () => {
    it("restores unlock when generation fails after claim", async () => {
      let mutationStep = 0;
      mocks.authedConvexClient.mockImplementation(async () => ({
        query: vi.fn(),
        mutation: async () => {
          mutationStep += 1;
          if (mutationStep === 1) {
            return {
              name: "Listing",
              sourceId: "listing-1",
              pack: examplePackAsGenerated("bud"),
            };
          }
          return mocks.restoreUnlock();
        },
      }));

      mocks.runMascotModel.mockRejectedValueOnce(new Error("boom"));

      const res = await post({
        listingId: "listing-1",
        remixOrderId: "order-1",
        name: "Remixed",
        gestures: remixRequestBody().gestures,
      });

      expect(res.status).toBe(502);
      expect(mocks.restoreUnlock).toHaveBeenCalled();
    });
  });
});
