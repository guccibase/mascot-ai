import { describe, expect, it } from "vitest";
import { responseJson } from "@/lib/response-json";

describe("responseJson", () => {
  it("returns parsed JSON", async () => {
    const response = Response.json({ error: "try again", code: "TIMEOUT" });

    await expect(
      responseJson<{ error: string; code: string }>(response)
    ).resolves.toEqual({ error: "try again", code: "TIMEOUT" });
  });

  it("returns null for a plain-text gateway response", async () => {
    const response = new Response("An error occurred with your deployment", {
      status: 504,
      headers: { "Content-Type": "text/plain" },
    });

    await expect(responseJson(response)).resolves.toBeNull();
  });
});
