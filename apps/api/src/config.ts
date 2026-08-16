import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
dotenv.config({ path: process.env.ENV_FILE ?? path.resolve(packageRoot, '.env'), quiet: true });
if (process.env.INIT_CWD && path.resolve(process.env.INIT_CWD) !== path.resolve(packageRoot)) {
  dotenv.config({ path: path.resolve(process.env.INIT_CWD, '.env'), override: false, quiet: true });
}

function readBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveDatabasePath(rawPath: string): string {
  if (rawPath === ':memory:' || rawPath.startsWith('file:')) return rawPath;
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(packageRoot, rawPath);
}

export function getConfig() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const defaultDatabase = nodeEnv === 'test' ? ':memory:' : './data/greenhouse.sqlite';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    packageRoot,
    port: readPositiveInteger(process.env.PORT, 3000),
    databasePath: resolveDatabasePath(process.env.DATABASE_PATH ?? defaultDatabase),
    migrationsPath: path.resolve(packageRoot, 'migrations'),
    webDistPath: path.resolve(
      packageRoot,
      process.env.WEB_DIST_PATH ?? path.join('..', 'web', 'dist')
    ),
    appOrigins: (process.env.APP_ORIGIN ?? 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'greenhouse_session',
    sessionTtlDays: readPositiveInteger(process.env.SESSION_TTL_DAYS, 7),
    trustProxy: readBoolean(process.env.TRUST_PROXY),
    autoSeed: readBoolean(process.env.AUTO_SEED),
    allowDemoSeed: readBoolean(process.env.ALLOW_DEMO_SEED),
    adminEmail: (process.env.ADMIN_EMAIL ?? 'admin@invernadero.local').trim().toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD ?? 'Admin123!',
    demoUserPassword: process.env.DEMO_USER_PASSWORD ?? 'Usuario123!'
  } as const;
}
