import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashPassword, isOpaqueToken, sha256Hex, verifyPassword } from "../src/security";

describe("authentication primitives", () => {
  it("creates unique URL-safe opaque tokens", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(isOpaqueToken(first)).toBe(true);
    expect(first).not.toBe(second);
  });

  it("hashes passwords with a per-password salt and verifies them", async () => {
    const firstHash = await hashPassword("correct horse battery staple");
    const secondHash = await hashPassword("correct horse battery staple");
    expect(firstHash.split("$").slice(0, 2)).toEqual(["pbkdf2-sha256", "100000"]);
    expect(firstHash).not.toBe(secondHash);
    expect(await verifyPassword("correct horse battery staple", firstHash)).toBe(true);
    expect(await verifyPassword("wrong password", firstHash)).toBe(false);
  });

  it("hashes opaque tokens deterministically for storage", async () => {
    const token = createOpaqueToken();
    expect(await sha256Hex(token)).toBe(await sha256Hex(token));
    expect(await sha256Hex(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});