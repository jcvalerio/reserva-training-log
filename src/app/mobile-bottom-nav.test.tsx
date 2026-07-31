import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getHomeNavItems } from "./home-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";

describe("MobileBottomNav", () => {
  it("keeps implemented routes reachable and marks the active tab", () => {
    render(<MobileBottomNav items={getHomeNavItems()} activeHref="/plan" />);

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("href", "/plan");
  });

  it("renders every implemented destination as a real link with no disabled areas left", () => {
    render(<MobileBottomNav items={getHomeNavItems()} activeHref="/" />);

    expect(screen.getByRole("link", { name: "Entrenar" })).toHaveAttribute("href", "/entrenar");
    expect(screen.getByRole("link", { name: "Progreso" })).toHaveAttribute("href", "/progreso");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
