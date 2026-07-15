import { describe, expect, it } from "vitest";
import {
  AuthError,
  createAuthService,
  type AuthStore,
  type NewSession,
  type StoredUser
} from "../../worker/auth-service";

class MemoryAuthStore implements AuthStore {
  users = new Map<string, StoredUser>();
  sessions: NewSession[] = [];
  attempts = new Map<string, { count: number; windowStartedAt: number }>();

  async getUserByUsername(username: string) {
    return this.users.get(username) ?? null;
  }
  async createUser(user: StoredUser) {
    this.users.set(user.username, user);
  }
  async updateUser(user: StoredUser) {
    this.users.set(user.username, user);
  }
  async createSession(session: NewSession) {
    this.sessions.push(session);
  }
  async revokeSession() {}
  async getAttempts(key: string) {
    return this.attempts.get(key) ?? null;
  }
  async setAttempts(key: string, count: number, windowStartedAt: number) {
    this.attempts.set(key, { count, windowStartedAt });
  }
  async clearAttempts(key: string) {
    this.attempts.delete(key);
  }
}

describe("auth service", () => {
  it("registers without storing a reusable password proof or session token", async () => {
    const store = new MemoryAuthStore();
    const service = createAuthService(store, () => 1_000);
    const passwordProof = "A".repeat(43);

    const result = await service.register("XiaoHe", passwordProof);
    const user = store.users.get("xiaohe")!;

    expect(result.recoveryCode.length).toBeGreaterThan(20);
    expect(user.passwordHash).not.toBe(passwordProof);
    expect(user.passwordSalt).toBe("client-pbkdf2-v1");
    expect(store.sessions[0].tokenHash).not.toBe(result.sessionToken);
  });

  it("rejects an incorrect password", async () => {
    const store = new MemoryAuthStore();
    const service = createAuthService(store, () => 1_000);
    await service.register("xiaohe", "A".repeat(43));

    await expect(service.login("xiaohe", "B".repeat(43), "127.0.0.1")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS"
    });
  });

  it("rate limits repeated failed logins", async () => {
    const store = new MemoryAuthStore();
    const service = createAuthService(store, () => 1_000);
    await service.register("xiaohe", "A".repeat(43));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.login("xiaohe", "B".repeat(43), "127.0.0.1")).rejects.toBeInstanceOf(
        AuthError
      );
    }

    await expect(service.login("xiaohe", "B".repeat(43), "127.0.0.1")).rejects.toMatchObject({
      code: "RATE_LIMITED"
    });
  });

  it("resets a password with the recovery code and rotates the code", async () => {
    const store = new MemoryAuthStore();
    const service = createAuthService(store, () => 1_000);
    const registration = await service.register("xiaohe", "A".repeat(43));

    const recovery = await service.recover(
      "xiaohe",
      registration.recoveryCode,
      "B".repeat(43)
    );

    expect(recovery.recoveryCode).not.toBe(registration.recoveryCode);
    await expect(service.login("xiaohe", "B".repeat(43), "127.0.0.1")).resolves.toBeTruthy();
  });
});
