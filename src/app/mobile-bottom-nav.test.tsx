import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getHomeNavItems } from "./home-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";

describe("MobileBottomNav", () => {
  it("keeps implemented routes reachable and marks the active tab", () => {
    render(<MobileBottomNav items={getHomeNavItems()} activeHref="/baseline" />);

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Pesos base" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("href", "/plan");
  });

  it("shows sighted feedback for disabled future areas on tap", () => {
    render(<MobileBottomNav items={getHomeNavItems()} activeHref="/" />);

    expect(screen.getByText("Disponible después de tener un plan activo.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Progreso" }));

    expect(screen.getByText("Disponible después de registrar sesiones.")).toBeVisible();
  });
});
