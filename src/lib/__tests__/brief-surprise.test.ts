import { describe, expect, it } from "vitest";
import {
  cheapSurpriseModels,
  normalizeBriefContext,
  parseBriefSurpriseResult,
} from "@/lib/brief-surprise";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("brief-surprise", () => {
  it("guards json_object mode by ensuring input contains the word json", () => {
    // OpenAI rejects json_object unless input messages contain "json".
    const source = readFileSync(
      join(__dirname, "../brief-surprise.ts"),
      "utf8"
    );
    expect(source).toMatch(/json_object/);
    expect(source).toMatch(/\\bjson\\b\/i\.test\(args\.input\)/);
    expect(source).toContain("Return a single JSON object.");
  });

  it("prefers gpt-5.4-nano and never includes studio models", () => {
    const models = cheapSurpriseModels();
    expect(models[0]).toBe("gpt-5.4-nano");
    expect(models).toEqual(["gpt-5.4-nano", "gpt-5.4-mini", "gpt-4o-mini"]);
    expect(models.some((m) => m.includes("sol") || m.includes("luna"))).toBe(
      false
    );
  });

  it("normalizes and trims brief context", () => {
    expect(
      normalizeBriefContext({
        name: "  Nori  ",
        description: "A fox",
        look: "",
      })
    ).toEqual({
      name: "Nori",
      description: "A fox",
    });
  });

  it("parses a single-field result", () => {
    expect(
      parseBriefSurpriseResult("look", {
        look: "Round acorn woodpecker with red crown and charcoal plumage.",
      })
    ).toEqual({
      field: "look",
      value: "Round acorn woodpecker with red crown and charcoal plumage.",
    });
  });

  it("parses a full brief result", () => {
    const parsed = parseBriefSurpriseResult("all", {
      name: "Granary",
      description: "An acorn woodpecker that organizes research.",
      look: "Cream face mask, red crown, chisel bill.",
      productContext: "Knowledge workspace",
      personality: "Sharp and generous",
    });
    expect(parsed?.field).toBe("all");
    if (parsed?.field === "all") {
      expect(parsed.brief.name).toBe("Granary");
      expect(parsed.brief.description).toContain("woodpecker");
    }
  });

  it("rejects incomplete model output", () => {
    expect(parseBriefSurpriseResult("look", { name: "Wrong key" })).toBeNull();
    expect(
      parseBriefSurpriseResult("all", { name: "Only one field" })
    ).toBeNull();
  });
});
