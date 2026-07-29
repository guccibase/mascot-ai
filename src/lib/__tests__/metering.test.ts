import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mutation: vi.fn(),
  authedConvexClient: vi.fn(),
}));

vi.mock("@/lib/convex-server", () => ({
  authedConvexClient: mocks.authedConvexClient,
}));

import { openMeter, tokenMetaFields } from "@/lib/metering";

describe("openMeter settle / forgive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authedConvexClient.mockResolvedValue({
      mutation: mocks.mutation,
    });
  });

  it("failure forgive settles with actualTokens 0 (no charge)", async () => {
    mocks.mutation
      .mockResolvedValueOnce({
        reservationId: "res_1",
        fromSubscription: 1000,
        fromTopup: 0,
      })
      .mockResolvedValueOnce({ charged: 0, balance: 9000 });

    const metered = await openMeter({ kind: "refine", batches: 1 }, "gpt-5.6-sol");
    expect(metered.ok).toBe(true);
    if (!metered.ok) return;

    metered.meter.record({ input_tokens: 5000, output_tokens: 8000 });
    metered.meter.forgive();
    const meta = await metered.meter.settle();

    expect(mocks.mutation).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ actualTokens: 0 })
    );
    expect(meta.committed).toBe(true);
    expect(meta.tokens).toBe(0);
  });

  it("retries settle after mutation failure and succeeds on second call", async () => {
    mocks.mutation
      .mockResolvedValueOnce({
        reservationId: "res_2",
        fromSubscription: 500,
        fromTopup: 0,
      })
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({ charged: 42, balance: 100 });

    const metered = await openMeter({ kind: "gesture" }, "gpt-5.6-sol");
    expect(metered.ok).toBe(true);
    if (!metered.ok) return;

    metered.meter.record({ input_tokens: 1000, output_tokens: 2000 });
    const first = await metered.meter.settle();
    expect(first.committed).toBe(false);
    expect(first.tokens).toBe(0);

    const second = await metered.meter.settle();
    expect(second.committed).toBe(true);
    expect(second.tokens).toBe(42);
    expect(mocks.mutation).toHaveBeenCalledTimes(3);
  });
});

describe("tokenMetaFields", () => {
  it("omits token fields when settle did not commit", () => {
    expect(
      tokenMetaFields({
        tokens: 999,
        balance: 1,
        estimated: 100,
        committed: false,
      })
    ).toEqual({});
  });

  it("includes token fields when settle committed", () => {
    expect(
      tokenMetaFields({
        tokens: 50,
        balance: 950,
        estimated: 100,
        committed: true,
      })
    ).toEqual({ tokens: 50, balance: 950 });
  });
});
