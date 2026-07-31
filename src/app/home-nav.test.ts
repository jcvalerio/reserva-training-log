import { describe, expect, it } from "vitest";

import { getHomeNavItems } from "./home-nav";

describe("getHomeNavItems", () => {
  it("keeps implemented onboarding destinations navigable", () => {
    const navItems = getHomeNavItems();

    expect(navItems.filter((item) => item.href).map((item) => item.labelEs)).toEqual([
      "Inicio",
      "Perfil",
      "Plan",
      "Entrenar",
      "Progreso",
    ]);
    expect(navItems.find((item) => item.labelEs === "Plan")?.href).toBe("/plan");
    expect(navItems.find((item) => item.labelEs === "Entrenar")?.href).toBe("/entrenar");
    expect(navItems.find((item) => item.labelEs === "Progreso")?.href).toBe("/progreso");
  });

  it("has no disabled placeholder destinations left", () => {
    expect(getHomeNavItems().filter((item) => !item.href)).toEqual([]);
  });
});
