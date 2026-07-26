import { afterEach, describe, expect, it } from "vitest";
import { asMascotModelId } from "@/lib/mascot-model-options";
import { resolveMascotModel } from "@/lib/mascot-model";

const ORIGINAL = {
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  OPENAI: process.env.OPENAI_API_KEY,
};

afterEach(() => {
  if (ORIGINAL.ANTHROPIC === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIGINAL.ANTHROPIC;
  if (ORIGINAL.OPENAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIGINAL.OPENAI;
});

describe("asMascotModelId", () => {
  it("accepts known ids and rejects unknowns", () => {
    expect(asMascotModelId("claude-opus-5")).toBe("claude-opus-5");
    expect(asMascotModelId("gpt-5.6-sol")).toBe("gpt-5.6-sol");
    expect(asMascotModelId("nope")).toBeNull();
    expect(asMascotModelId(undefined)).toBeNull();
  });
});

describe("resolveMascotModel", () => {
  it("errors when no providers are configured", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const r = resolveMascotModel(undefined);
    expect(r.ok).toBe(false);
  });

  it("defaults to the first configured provider", () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test";
    const r = resolveMascotModel(undefined);
    expect(r).toEqual({ ok: true, model: "gpt-5.6-sol" });
  });

  it("rejects an explicit model whose key is missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test";
    const r = resolveMascotModel("claude-opus-5");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("honors an explicit configured model", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-test";
    const r = resolveMascotModel("gpt-5.6-sol");
    expect(r).toEqual({ ok: true, model: "gpt-5.6-sol" });
  });
});
