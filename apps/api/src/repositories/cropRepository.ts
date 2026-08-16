import { getDatabase } from '../db/database.js';
import type { Crop, CropStatus } from '../domain.js';
import type { CropsQuery } from '../schemas.js';
import { escapeLike, paginationOffset } from '../utils/sql.js';
import { mapCrop, type CropRow } from './mappers.js';

const cropColumns = `
  c.id, c.name, c.species, c.variety, c.status, c.planted_at,
  c.expected_harvest_at, c.notes, c.created_at, c.updated_at
`;

export function listOwnedCrops(
  userId: string,
  query: CropsQuery
): { items: Crop[]; total: number } {
  const conditions = ['g.user_id = ?'];
  const parameters: Array<string | number> = [userId];

  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(`(
      c.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      c.species LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      COALESCE(c.variety, '') LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    parameters.push(pattern, pattern, pattern);
  }
  if (query.status) {
    conditions.push('c.status = ?');
    parameters.push(query.status);
  }
  if (query.plantedFrom) {
    conditions.push('c.planted_at >= ?');
    parameters.push(query.plantedFrom);
  }
  if (query.plantedTo) {
    conditions.push('c.planted_at <= ?');
    parameters.push(query.plantedTo);
  }

  const where = conditions.join(' AND ');
  const db = getDatabase();
  const count = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM crops c
      JOIN greenhouses g ON g.id = c.greenhouse_id
      WHERE ${where}
    `)
    .get(...parameters) as { total: number };
  const rows = db
    .prepare(`
      SELECT ${cropColumns}
      FROM crops c
      JOIN greenhouses g ON g.id = c.greenhouse_id
      WHERE ${where}
      ORDER BY c.updated_at DESC, c.id ASC
      LIMIT ? OFFSET ?
    `)
    .all(...parameters, query.limit, paginationOffset(query.page, query.limit)) as CropRow[];

  return { items: rows.map(mapCrop), total: count.total };
}

export function findOwnedCrop(userId: string, cropId: string): Crop | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT ${cropColumns}
      FROM crops c
      JOIN greenhouses g ON g.id = c.greenhouse_id
      WHERE c.id = ? AND g.user_id = ?
    `)
    .get(cropId, userId) as CropRow | undefined;
  return row ? mapCrop(row) : undefined;
}

export function createCrop(input: {
  id: string;
  greenhouseId: string;
  name: string;
  species: string;
  variety: string | null;
  status: CropStatus;
  plantedAt: string;
  expectedHarvestAt: string | null;
  notes: string | null;
  now: string;
}): void {
  getDatabase()
    .prepare(`
      INSERT INTO crops (
        id, greenhouse_id, name, species, variety, status, planted_at,
        expected_harvest_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.id,
      input.greenhouseId,
      input.name,
      input.species,
      input.variety,
      input.status,
      input.plantedAt,
      input.expectedHarvestAt,
      input.notes,
      input.now,
      input.now
    );
}

export function updateOwnedCrop(
  userId: string,
  cropId: string,
  input: {
    name: string;
    species: string;
    variety: string | null;
    status: CropStatus;
    plantedAt: string;
    expectedHarvestAt: string | null;
    notes: string | null;
    now: string;
  }
): boolean {
  const result = getDatabase()
    .prepare(`
      UPDATE crops
      SET name = ?, species = ?, variety = ?, status = ?, planted_at = ?,
          expected_harvest_at = ?, notes = ?, updated_at = ?
      WHERE id = ?
        AND greenhouse_id IN (SELECT id FROM greenhouses WHERE user_id = ?)
    `)
    .run(
      input.name,
      input.species,
      input.variety,
      input.status,
      input.plantedAt,
      input.expectedHarvestAt,
      input.notes,
      input.now,
      cropId,
      userId
    );
  return result.changes === 1;
}

export function deleteOwnedCrop(userId: string, cropId: string): boolean {
  const result = getDatabase()
    .prepare(`
      DELETE FROM crops
      WHERE id = ?
        AND greenhouse_id IN (SELECT id FROM greenhouses WHERE user_id = ?)
    `)
    .run(cropId, userId);
  return result.changes === 1;
}
