import { describe, expect, it } from "vitest";

import { parseAllowedDevOrigins } from "./dev-origins";

describe("parseAllowedDevOrigins", () => {
  it("returns an empty list when no local network origins are configured", () => {
    expect(parseAllowedDevOrigins(undefined)).toEqual([]);
    expect(parseAllowedDevOrigins("")).toEqual([]);
  });

  it("parses comma-separated local development origins deterministically", () => {
    expect(parseAllowedDevOrigins("192.168.68.69, localhost:3000, 192.168.68.69")).toEqual([
      "192.168.68.69",
      "localhost:3000",
    ]);
  });
});
