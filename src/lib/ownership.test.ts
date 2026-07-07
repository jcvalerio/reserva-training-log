import { describe, expect, it } from "vitest";

import { assertOwnedByUser, filterOwnedByUser, isOwnedByUser, OwnershipError } from "./ownership";

const ownedProfile = { id: "profile-1", userId: "user-1", name: "Tester" };
const otherProfile = { id: "profile-2", userId: "user-2", name: "Otro" };

describe("ownership helpers", () => {
  it("allows access only when the resource belongs to the signed-in user", () => {
    expect(isOwnedByUser(ownedProfile, "user-1")).toBe(true);
    expect(isOwnedByUser(otherProfile, "user-1")).toBe(false);
    expect(isOwnedByUser(null, "user-1")).toBe(false);
  });

  it("throws a privacy-preserving not-found error for another user's resource", () => {
    expect(() => assertOwnedByUser(otherProfile, "user-1", "perfil"))
      .toThrow(OwnershipError);
    expect(() => assertOwnedByUser(otherProfile, "user-1", "perfil"))
      .toThrow("No se encontró perfil para este usuario.");
  });

  it("filters collections to the signed-in user's records", () => {
    expect(filterOwnedByUser([ownedProfile, otherProfile], "user-1")).toEqual([ownedProfile]);
  });
});
