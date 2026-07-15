import type { AuthStore, NewSession, StoredUser } from "./auth-service";

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  password_salt: string;
  recovery_hash: string;
  created_at: number;
  updated_at: number;
}

function mapUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    recoveryHash: row.recovery_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class D1AuthStore implements AuthStore {
  constructor(private readonly database: D1Database) {}

  async getUserByUsername(username: string) {
    const row = await this.database
      .prepare("SELECT * FROM users WHERE username = ? LIMIT 1")
      .bind(username)
      .first<UserRow>();
    return row ? mapUser(row) : null;
  }

  async createUser(user: StoredUser) {
    await this.database
      .prepare(
        "INSERT INTO users (id, username, password_hash, password_salt, recovery_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        user.id,
        user.username,
        user.passwordHash,
        user.passwordSalt,
        user.recoveryHash,
        user.createdAt,
        user.updatedAt
      )
      .run();
  }

  async updateUser(user: StoredUser) {
    await this.database
      .prepare(
        "UPDATE users SET password_hash = ?, password_salt = ?, recovery_hash = ?, updated_at = ? WHERE id = ?"
      )
      .bind(user.passwordHash, user.passwordSalt, user.recoveryHash, user.updatedAt, user.id)
      .run();
  }

  async createSession(session: NewSession) {
    await this.database
      .prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
      .bind(session.tokenHash, session.userId, session.createdAt, session.expiresAt)
      .run();
  }

  async revokeSession(tokenHash: string) {
    await this.database.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }

  async getAttempts(key: string) {
    return this.database
      .prepare("SELECT count, window_started_at AS windowStartedAt FROM auth_attempts WHERE attempt_key = ?")
      .bind(key)
      .first<{ count: number; windowStartedAt: number }>();
  }

  async setAttempts(key: string, count: number, windowStartedAt: number) {
    await this.database
      .prepare(
        "INSERT INTO auth_attempts (attempt_key, count, window_started_at) VALUES (?, ?, ?) ON CONFLICT(attempt_key) DO UPDATE SET count = excluded.count, window_started_at = excluded.window_started_at"
      )
      .bind(key, count, windowStartedAt)
      .run();
  }

  async clearAttempts(key: string) {
    await this.database.prepare("DELETE FROM auth_attempts WHERE attempt_key = ?").bind(key).run();
  }

  async getUserBySessionTokenHash(tokenHash: string, now: number) {
    const row = await this.database
      .prepare(
        "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1"
      )
      .bind(tokenHash, now)
      .first<UserRow>();
    return row ? mapUser(row) : null;
  }
}
