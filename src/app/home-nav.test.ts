import { describe, expect, it } from "vitest";

import { getHomeNavItems } from "./home-nav";

describe("getHomeNavItems", () => {
  it("keeps implemented onboarding destinations navigable", () => {
    const navItems = getHomeNavItems();

    expect(navItems.filter((item) => item.href).map((item) => item.labelEs)).toEqual([
      "Inicio",
      "Perfil",
      "Pesos base",
      "Mediciones",
      "Plan",
      "Entrenar",
    ]);
    expect(navItems.find((item) => item.labelEs === "Plan")?.href).toBe("/plan");
    expect(navItems.find((item) => item.labelEs === "Entrenar")?.href).toBe("/entrenar");
  });

  it("marks future progress area as disabled guidance", () => {
    const disabledItems = getHomeNavItems().filter((item) => !item.href);

    expect(disabledItems.map((item) => item.labelEs)).toEqual(["Progreso"]);
    expect(disabledItems.find((item) => item.labelEs === "Progreso")?.disabledReasonEs).toContain("sesiones");
  });
});
