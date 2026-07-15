import { describe, expect, it } from "vitest";
import { derivePasswordProof } from "../src/features/auth/password-proof";

describe("client password proof", () => {
  it("derives a stable non-plaintext proof scoped to the normalized username", async () => {
    const first = await derivePasswordProof(" XiaoHe ", "correct horse battery staple", 1_000);
    const second = await derivePasswordProof("xiaohe", "correct horse battery staple", 1_000);
    const anotherUser = await derivePasswordProof("another", "correct horse battery staple", 1_000);

    expect(first).toBe(second);
    expect(first).not.toContain("correct horse battery staple");
    expect(first).toHaveLength(43);
    expect(anotherUser).not.toBe(first);
  });

  it("rejects passwords outside the supported length", async () => {
    await expect(derivePasswordProof("xiaohe", "too-short", 1_000)).rejects.toThrow();
  });
});
