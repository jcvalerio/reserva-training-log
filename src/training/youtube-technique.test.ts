import { describe, expect, it } from "vitest";

import { buildYoutubeTechniqueQuery, buildYoutubeTechniqueSearchUrl } from "./youtube-technique";

describe("buildYoutubeTechniqueQuery", () => {
  it("appends técnica to a bilateral exercise, no unilateral qualifier", () => {
    expect(buildYoutubeTechniqueQuery({ nameEs: "Prensa de piernas", isUnilateral: false })).toBe(
      "Prensa de piernas técnica",
    );
  });

  it("does not duplicate 'unilateral' when the Spanish name already says it", () => {
    expect(buildYoutubeTechniqueQuery({ nameEs: "Prensa unilateral", isUnilateral: true })).toBe(
      "Prensa unilateral técnica",
    );
  });

  it("appends 'unilateral' when the name doesn't already convey it", () => {
    expect(buildYoutubeTechniqueQuery({ nameEs: "Zancada", isUnilateral: true })).toBe("Zancada técnica unilateral");
    expect(buildYoutubeTechniqueQuery({ nameEs: "Sentadilla búlgara", isUnilateral: true })).toBe(
      "Sentadilla búlgara técnica unilateral",
    );
  });

  it("appends the English name in parentheses when present", () => {
    expect(
      buildYoutubeTechniqueQuery({ nameEs: "Zancada", nameEn: "Lunge", isUnilateral: true }),
    ).toBe("Zancada técnica unilateral (Lunge)");
  });

  it("ignores a null, undefined, or blank English name", () => {
    expect(buildYoutubeTechniqueQuery({ nameEs: "Zancada", nameEn: null, isUnilateral: false })).toBe(
      "Zancada técnica",
    );
    expect(buildYoutubeTechniqueQuery({ nameEs: "Zancada", nameEn: undefined, isUnilateral: false })).toBe(
      "Zancada técnica",
    );
    expect(buildYoutubeTechniqueQuery({ nameEs: "Zancada", nameEn: "   ", isUnilateral: false })).toBe(
      "Zancada técnica",
    );
  });

  it("trims surrounding whitespace on the Spanish name", () => {
    expect(buildYoutubeTechniqueQuery({ nameEs: "  Remo unilateral  ", isUnilateral: true })).toBe(
      "Remo unilateral técnica",
    );
  });
});

describe("buildYoutubeTechniqueSearchUrl", () => {
  it("builds a YouTube results URL with the query percent-encoded", () => {
    const url = buildYoutubeTechniqueSearchUrl({ nameEs: "Sentadilla búlgara", isUnilateral: true });
    expect(url).toBe(
      "https://www.youtube.com/results?search_query=" +
        encodeURIComponent("Sentadilla búlgara técnica unilateral"),
    );
    expect(url.startsWith("https://www.youtube.com/results?search_query=")).toBe(true);
  });
});
