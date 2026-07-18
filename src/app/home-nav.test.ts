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
    ]);
    expect(navItems.find((item) => item.labelEs === "Plan")?.href).toBe("/plan");
  });

  it("marks future training and progress areas as disabled guidance", () => {
    const disabledItems = getHomeNavItems().filter((item) => !item.href);

    expect(disabledItems.map((item) => item.labelEs)).toEqual(["Entrenar", "Progreso"]);
    expect(disabledItems.find((item) => item.labelEs === "Entrenar")?.disabledReasonEs).toContain("plan activo");
  });
});
