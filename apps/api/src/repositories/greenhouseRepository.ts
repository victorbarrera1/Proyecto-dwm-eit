import { getDatabase } from '../db/database.js';
import type { Greenhouse } from '../domain.js';
import { mapGreenhouse, type GreenhouseRow } from './mappers.js';

export function findGreenhouseByUserId(userId: string): Greenhouse | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT id, name, location, created_at, updated_at
      FROM greenhouses
      WHERE user_id = ?
    `)
    .get(userId) as GreenhouseRow | undefined;
  return row ? mapGreenhouse(row) : undefined;
}

export function findGreenhouseIdByUserId(userId: string): string | undefined {
  const row = getDatabase()
    .prepare('SELECT id FROM greenhouses WHERE user_id = ?')
    .get(userId) as { id: string } | undefined;
  return row?.id;
}

export function updateGreenhouseByUserId(
  userId: string,
  patch: { name?: string; location?: string | null },
  now: string
): Greenhouse | undefined {
  const current = findGreenhouseByUserId(userId);
  if (!current) return undefined;
  const name = patch.name ?? current.name;
  const location = patch.location === undefined ? current.location : patch.location;
  getDatabase()
    .prepare(`
      UPDATE greenhouses
      SET name = ?, location = ?, updated_at = ?
      WHERE user_id = ?
    `)
    .run(name, location, now, userId);
  return findGreenhouseByUserId(userId);
}
