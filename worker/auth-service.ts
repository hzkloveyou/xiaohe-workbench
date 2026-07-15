import { derivePassword, hashToken, normalizeUsername, randomToken } from "./security";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  recoveryHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface NewSession {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthStore {
  getUserByUsername(username: string): Promise<StoredUser | null>;
  createUser(user: StoredUser): Promise<void>;
  updateUser(user: StoredUser): Promise<void>;
  createSession(session: NewSession): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  getAttempts(key: string): Promise<{ count: number; windowStartedAt: number } | null>;
  setAttempts(key: string, count: number, windowStartedAt: number): Promise<void>;
  clearAttempts(key: string): Promise<void>;
  getUserBySessionTokenHash?(tokenHash: string, now: number): Promise<StoredUser | null>;
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: 400 | 401 | 409 | 429 = 400
  ) {
    super(message);
  }
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function createAuthService(
  store: AuthStore,
  now: () => number = Date.now,
  passwordIterations = 310_000
) {
  async function createSession(userId: string) {
    const sessionToken = randomToken();
    const createdAt = now();
    await store.createSession({
      tokenHash: await hashToken(sessionToken),
      userId,
      createdAt,
      expiresAt: createdAt + SESSION_LIFETIME_MS
    });
    return sessionToken;
  }

  async function createPassword(password: string) {
    if (password.length < 12 || password.length > 200) {
      throw new AuthError("INVALID_PASSWORD", "密码长度需为 12–200 个字符");
    }
    const passwordSalt = randomToken(16);
    return {
      passwordSalt,
      passwordHash: await derivePassword(password, passwordSalt, passwordIterations)
    };
  }

  return {
    async register(usernameInput: string, password: string) {
      const username = normalizeUsername(usernameInput);
      if (await store.getUserByUsername(username)) {
        throw new AuthError("USERNAME_TAKEN", "该用户名已被使用", 409);
      }
      const passwordRecord = await createPassword(password);
      const recoveryCode = randomToken(24);
      const timestamp = now();
      const user: StoredUser = {
        id: crypto.randomUUID(),
        username,
        ...passwordRecord,
        recoveryHash: await hashToken(recoveryCode),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await store.createUser(user);
      return { user: { id: user.id, username }, recoveryCode, sessionToken: await createSession(user.id) };
    },

    async login(usernameInput: string, password: string, ipAddress: string) {
      const username = normalizeUsername(usernameInput);
      const attemptKey = `${ipAddress}:${username}`;
      const timestamp = now();
      const attempts = await store.getAttempts(attemptKey);
      if (
        attempts &&
        timestamp - attempts.windowStartedAt < ATTEMPT_WINDOW_MS &&
        attempts.count >= MAX_ATTEMPTS
      ) {
        throw new AuthError("RATE_LIMITED", "尝试次数过多，请稍后再试", 429);
      }

      const user = await store.getUserByUsername(username);
      const valid = user
        ? (await derivePassword(password, user.passwordSalt, passwordIterations)) === user.passwordHash
        : false;
      if (!valid || !user) {
        const count = attempts && timestamp - attempts.windowStartedAt < ATTEMPT_WINDOW_MS
          ? attempts.count + 1
          : 1;
        await store.setAttempts(attemptKey, count, attempts?.windowStartedAt ?? timestamp);
        throw new AuthError("INVALID_CREDENTIALS", "用户名或密码不正确", 401);
      }

      await store.clearAttempts(attemptKey);
      return { user: { id: user.id, username }, sessionToken: await createSession(user.id) };
    },

    async recover(usernameInput: string, recoveryCode: string, newPassword: string) {
      const username = normalizeUsername(usernameInput);
      const user = await store.getUserByUsername(username);
      if (!user || (await hashToken(recoveryCode)) !== user.recoveryHash) {
        throw new AuthError("INVALID_RECOVERY", "用户名或恢复码不正确", 401);
      }
      const passwordRecord = await createPassword(newPassword);
      const nextRecoveryCode = randomToken(24);
      const updatedUser: StoredUser = {
        ...user,
        ...passwordRecord,
        recoveryHash: await hashToken(nextRecoveryCode),
        updatedAt: now()
      };
      await store.updateUser(updatedUser);
      return {
        user: { id: user.id, username },
        recoveryCode: nextRecoveryCode,
        sessionToken: await createSession(user.id)
      };
    },

    async logout(sessionToken: string) {
      await store.revokeSession(await hashToken(sessionToken));
    },

    async getSession(sessionToken: string) {
      if (!store.getUserBySessionTokenHash) return null;
      const user = await store.getUserBySessionTokenHash(await hashToken(sessionToken), now());
      return user ? { id: user.id, username: user.username } : null;
    }
  };
}
