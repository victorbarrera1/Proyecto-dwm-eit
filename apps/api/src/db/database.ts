import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { getConfig } from '../config.js';

let database: Database.Database | undefined;

function openDatabase(): Database.Database {
  const { databasePath } = getConfig();
  if (databasePath !== ':memory:' && !databasePath.startsWith('file:')) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const instance = new Database(databasePath);
  instance.pragma('foreign_keys = ON');
  instance.pragma('busy_timeout = 5000');
  if (databasePath !== ':memory:') instance.pragma('journal_mode = WAL');
  return instance;
}

export function getDatabase(): Database.Database {
  database ??= openDatabase();
  return database;
}

export function initializeDatabase(): Database.Database {
  const db = getDatabase();
  applyMigrations(db);
  return db;
}

export function closeDatabase(): void {
  if (!database) return;
  database.close();
  database = undefined;
}

export function databaseIsReady(): boolean {
  try {
    getDatabase().prepare('SELECT 1 AS ok').get();
    return true;
  } catch {
    return false;
  }
}

function applyMigrations(db: Database.Database): void {
  const { migrationsPath } = getConfig();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((file) => /^\d+.*\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right));

  const findApplied = db.prepare(
    'SELECT checksum FROM schema_migrations WHERE version = ?'
  );
  const recordApplied = db.prepare(
    'INSERT INTO schema_migrations (version, checksum, applied_at) VALUES (?, ?, ?)'
  );

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const applied = findApplied.get(file) as { checksum: string } | undefined;
    if (applied) {
      if (applied.checksum !== checksum) {
        throw new Error(`La migración ya aplicada ${file} cambió de contenido.`);
      }
      continue;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      recordApplied.run(file, checksum, new Date().toISOString());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
