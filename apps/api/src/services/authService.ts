import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getConfig } from '../config.js';
import type { Greenhouse, User } from '../domain.js';
import { AppError } from '../errors.js';
import type { LoginInput, RegisterInput } from '../schemas.js';
import * as authRepository from '../repositories/authRepository.js';
import { findGreenhouseByUserId } from '../repositories/greenhouseRepository.js';

export interface AuthResult {
  user: User;
  greenhouse: Greenhouse;
  token: string;
  expiresAt: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  if (authRepository.findUserByEmail(input.email)) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Ya existe una cuenta con ese correo.');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  let user: User;
  try {
    user = authRepository.createUserWithGreenhouse({
      userId: randomUUID(),
      greenhouseId: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'USER',
      greenhouseName: `Invernadero de ${input.name}`.slice(0, 80),
      now: new Date().toISOString()
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Ya existe una cuenta con ese correo.');
    }
    throw error;
  }

  return createAuthResult(user);
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const stored = authRepository.findUserByEmail(input.email);
  const valid = stored ? await bcrypt.compare(input.password, stored.passwordHash) : false;
  if (!stored || !valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
  }
  return createAuthResult(stored.user);
}

export function authenticate(token: string | undefined): authRepository.SessionUser {
  if (!token) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
  }
  const session = authRepository.findValidSession(hashToken(token), new Date().toISOString());
  if (!session) {
    throw new AppError(401, 'INVALID_SESSION', 'La sesión expiró o no es válida.');
  }
  return session;
}

export function logout(token: string | undefined): void {
  if (!token) return;
  authRepository.deleteSessionByTokenHash(hashToken(token));
}

export function getProfile(user: User): { user: User; greenhouse: Greenhouse } {
  const greenhouse = findGreenhouseByUserId(user.id);
  if (!greenhouse) {
    throw new AppError(500, 'GREENHOUSE_INVARIANT', 'La cuenta no tiene un invernadero asociado.');
  }
  return { user, greenhouse };
}

function createAuthResult(user: User): AuthResult {
  const config = getConfig();
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.sessionTtlDays * 86_400_000).toISOString();
  authRepository.deleteExpiredSessions(now.toISOString());
  authRepository.createSession({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
    now: now.toISOString()
  });
  const greenhouse = findGreenhouseByUserId(user.id);
  if (!greenhouse) {
    throw new AppError(500, 'GREENHOUSE_INVARIANT', 'La cuenta no tiene un invernadero asociado.');
  }
  return { user, greenhouse, token, expiresAt };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String(error.code).startsWith('SQLITE_CONSTRAINT')
  );
}
