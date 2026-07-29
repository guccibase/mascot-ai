import { describe, expect, it } from "vitest";
import { resolveRemixBrief } from "../brief";

describe("resolveRemixBrief", () => {
  const base = {
    sourceName: "Lyra",
    tagline: "Your eloquent guide",
    product: "Orator AI",
  };

  it("uses source-derived defaults when description and look are blank", () => {
    const out = resolveRemixBrief(base);
    expect(out.descriptionFromSource).toBe(true);
    expect(out.lookFromSource).toBe(true);
    expect(out.description).toContain("Lyra");
    expect(out.description).toContain("Your eloquent guide");
    expect(out.description).toContain("Orator AI");
    expect(out.look).toMatch(/indexed pose artwork/i);
  });

  it("honours user-provided description and look", () => {
    const out = resolveRemixBrief({
      ...base,
      description: "A shy night owl",
      look: "Deep purple feathers, softer eyes",
    });
    expect(out.descriptionFromSource).toBe(false);
    expect(out.lookFromSource).toBe(false);
    expect(out.description).toBe("A shy night owl");
    expect(out.look).toBe("Deep purple feathers, softer eyes");
  });

  it("allows partial overrides", () => {
    const out = resolveRemixBrief({
      ...base,
      look: "Neon cyberpunk palette",
    });
    expect(out.descriptionFromSource).toBe(true);
    expect(out.lookFromSource).toBe(false);
    expect(out.look).toBe("Neon cyberpunk palette");
  });

  it("treats whitespace-only input as blank", () => {
    const out = resolveRemixBrief({
      ...base,
      description: "   ",
      look: "\n",
    });
    expect(out.descriptionFromSource).toBe(true);
    expect(out.lookFromSource).toBe(true);
  });
});
