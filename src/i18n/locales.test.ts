import { describe, expect, it } from "vitest";

import { defaultLocale, isSupportedLocale, supportedLocales } from "./locales";

describe("locales", () => {
  it("keeps Spanish as the default locale and English supported", () => {
    expect(defaultLocale).toBe("es");
    expect(supportedLocales).toEqual(["es", "en"]);
    expect(isSupportedLocale("es")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });
});
