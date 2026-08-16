import { getDatabase } from '../db/database.js';
import type { Sensor, SensorReading, SensorType } from '../domain.js';
import type { SensorsQuery } from '../schemas.js';
import { escapeLike, paginationOffset } from '../utils/sql.js';
import {
  mapReading,
  mapSensor,
  type ReadingRow,
  type SensorRow
} from './mappers.js';

const sensorColumns = `
  s.id, s.code, s.name, s.type, s.unit, s.active, s.created_at, s.updated_at
`;

export function listOwnedSensors(
  userId: string,
  query: SensorsQuery
): { items: Sensor[]; total: number } {
  const conditions = ['g.user_id = ?'];
  const parameters: Array<string | number> = [userId];
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(`(
      s.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      s.code LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    parameters.push(pattern, pattern);
  }
  if (query.type) {
    conditions.push('s.type = ?');
    parameters.push(query.type);
  }
  if (query.active !== undefined) {
    conditions.push('s.active = ?');
    parameters.push(query.active ? 1 : 0);
  }
  const where = conditions.join(' AND ');
  const db = getDatabase();
  const count = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM sensors s
      JOIN greenhouses g ON g.id = s.greenhouse_id
      WHERE ${where}
    `)
    .get(...parameters) as { total: number };
  const rows = db
    .prepare(`
      SELECT ${sensorColumns}
      FROM sensors s
      JOIN greenhouses g ON g.id = s.greenhouse_id
      WHERE ${where}
      ORDER BY s.updated_at DESC, s.id ASC
      LIMIT ? OFFSET ?
    `)
    .all(...parameters, query.limit, paginationOffset(query.page, query.limit)) as SensorRow[];
  return { items: rows.map(mapSensor), total: count.total };
}

export function findOwnedSensor(userId: string, sensorId: string): Sensor | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT ${sensorColumns}
      FROM sensors s
      JOIN greenhouses g ON g.id = s.greenhouse_id
      WHERE s.id = ? AND g.user_id = ?
    `)
    .get(sensorId, userId) as SensorRow | undefined;
  return row ? mapSensor(row) : undefined;
}

export function createSensor(input: {
  id: string;
  greenhouseId: string;
  code: string;
  name: string;
  type: SensorType;
  unit: string;
  active: boolean;
  now: string;
}): void {
  getDatabase()
    .prepare(`
      INSERT INTO sensors (
        id, greenhouse_id, code, name, type, unit, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.id,
      input.greenhouseId,
      input.code,
      input.name,
      input.type,
      input.unit,
      input.active ? 1 : 0,
      input.now,
      input.now
    );
}

export function updateOwnedSensor(
  userId: string,
  sensorId: string,
  input: { code: string; name: string; active: boolean; now: string }
): boolean {
  const result = getDatabase()
    .prepare(`
      UPDATE sensors
      SET code = ?, name = ?, active = ?, updated_at = ?
      WHERE id = ?
        AND greenhouse_id IN (SELECT id FROM greenhouses WHERE user_id = ?)
    `)
    .run(input.code, input.name, input.active ? 1 : 0, input.now, sensorId, userId);
  return result.changes === 1;
}

export function deleteOwnedSensor(userId: string, sensorId: string): boolean {
  const result = getDatabase()
    .prepare(`
      DELETE FROM sensors
      WHERE id = ?
        AND greenhouse_id IN (SELECT id FROM greenhouses WHERE user_id = ?)
    `)
    .run(sensorId, userId);
  return result.changes === 1;
}

export function createReading(input: {
  id: string;
  sensorId: string;
  value: number;
  recordedAt: string;
  now: string;
}): void {
  getDatabase()
    .prepare(`
      INSERT INTO sensor_readings (id, sensor_id, value, recorded_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(input.id, input.sensorId, input.value, input.recordedAt, input.now);
}

export function findReadingById(readingId: string): SensorReading | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT id, sensor_id, value, recorded_at, created_at
      FROM sensor_readings
      WHERE id = ?
    `)
    .get(readingId) as ReadingRow | undefined;
  return row ? mapReading(row) : undefined;
}

export function listSensorReadings(input: {
  sensorId: string;
  from: string;
  to: string;
  page: number;
  limit: number;
}): { items: SensorReading[]; total: number } {
  const db = getDatabase();
  const count = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM sensor_readings
      WHERE sensor_id = ? AND recorded_at >= ? AND recorded_at <= ?
    `)
    .get(input.sensorId, input.from, input.to) as { total: number };
  const rows = db
    .prepare(`
      SELECT id, sensor_id, value, recorded_at, created_at
      FROM sensor_readings
      WHERE sensor_id = ? AND recorded_at >= ? AND recorded_at <= ?
      ORDER BY recorded_at ASC, id ASC
      LIMIT ? OFFSET ?
    `)
    .all(
      input.sensorId,
      input.from,
      input.to,
      input.limit,
      paginationOffset(input.page, input.limit)
    ) as ReadingRow[];
  return { items: rows.map(mapReading), total: count.total };
}
