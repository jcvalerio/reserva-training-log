import { describe, expect, it } from "vitest";

import { viewport } from "./viewport-config";

/**
 * Guards the accessibility fix from regressing. `maximumScale: 1` (or
 * `userScalable: false`) blocks pinch-to-zoom *and* Safari's per-site "aA"
 * text-size control on iOS — the only two mechanisms mobile Safari offers to
 * enlarge an under-sized page, since it does not apply the OS "Larger Text"
 * setting to arbitrary page CSS. A real user with the system text size turned
 * up couldn't comfortably read the app because of this. WCAG 1.4.4 / 1.4.10.
 */
describe("root viewport", () => {
  it("does not constrain zoom, so iOS text scaling and pinch-zoom keep working", () => {
    expect(viewport.maximumScale).toBeUndefined();
    expect(viewport.userScalable).toBeUndefined();
  });

  it("still sets the mobile defaults the layout relies on", () => {
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
  });
});
