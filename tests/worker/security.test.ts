import { describe, expect, it } from "vitest";
import { derivePassword, hashToken, isAllowedOrigin } from "../../worker/security";

describe("worker security", () => {
  it("derives the same password hash for the same password and salt", async () => {
    const salt = "AAECAwQFBgcICQoLDA0ODw";
    expect(await derivePassword("correct horse battery staple", salt, 1_000)).toBe(
      await derivePassword("correct horse battery staple", salt, 1_000)
    );
  });

  it("hashes session tokens before storage", async () => {
    const token = "raw-session-token";
    expect(await hashToken(token)).not.toBe(token);
  });

  it("only accepts configured request origins", () => {
    expect(isAllowedOrigin("https://080492.xyz", ["https://080492.xyz"])).toBe(true);
    expect(isAllowedOrigin("https://attacker.example", ["https://080492.xyz"])).toBe(false);
  });
});
