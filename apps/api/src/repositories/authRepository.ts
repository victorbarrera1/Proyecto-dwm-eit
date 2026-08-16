import type { User, UserRole } from '../domain.js';
import { getDatabase } from '../db/database.js';
import { mapUser, type UserRow } from './mappers.js';

type UserWithPasswordRow = UserRow & { password_hash: string };

export interface UserWithPassword {
  user: User;
  passwordHash: string;
}

export interface SessionUser {
  sessionId: string;
  user: User;
}

export function findUserByEmail(email: string): UserWithPassword | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = ? COLLATE NOCASE
    `)
    .get(email) as UserWithPasswordRow | undefined;
  return row ? { user: mapUser(row), passwordHash: row.password_hash } : undefined;
}

export function createUserWithGreenhouse(input: {
  userId: string;
  greenhouseId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  greenhouseName: string;
  now: string;
}): User {
  const db = getDatabase();
  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.userId,
      input.name,
      input.email,
      input.passwordHash,
      input.role,
      input.now,
      input.now
    );
    db.prepare(`
      INSERT INTO greenhouses (id, user_id, name, location, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?)
    `).run(input.greenhouseId, input.userId, input.greenhouseName, input.now, input.now);
  });
  insert();
  return findUserById(input.userId)!;
}

export function findUserById(id: string): User | undefined {
  const row = getDatabase()
    .prepare('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;
  return row ? mapUser(row) : undefined;
}

export function createSession(input: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  now: string;
}): void {
  getDatabase()
    .prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(input.id, input.userId, input.tokenHash, input.expiresAt, input.now);
}

export function findValidSession(tokenHash: string, now: string): SessionUser | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT
        s.id AS session_id,
        u.id, u.name, u.email, u.role, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `)
    .get(tokenHash, now) as (UserRow & { session_id: string }) | undefined;

  return row ? { sessionId: row.session_id, user: mapUser(row) } : undefined;
}

export function deleteSessionByTokenHash(tokenHash: string): void {
  getDatabase().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function deleteExpiredSessions(now: string): void {
  getDatabase().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}
