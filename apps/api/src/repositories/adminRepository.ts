import { getDatabase } from '../db/database.js';
import type { Crop, Sensor, SensorReading, SensorType, User, UserRole } from '../domain.js';
import type { AdminResourcesQuery, AdminUsersQuery } from '../schemas.js';
import { escapeLike, paginationOffset } from '../utils/sql.js';
import {
  mapCrop,
  mapGreenhouse,
  mapReading,
  mapSensor,
  mapUser,
  type CropRow,
  type GreenhouseRow,
  type ReadingRow,
  type SensorRow,
  type UserRow
} from './mappers.js';

type AdminUserRow = UserRow & {
  greenhouse_id: string | null;
  greenhouse_name: string | null;
  greenhouse_location: string | null;
  greenhouse_created_at: string | null;
  greenhouse_updated_at: string | null;
  crops_count: number;
  sensors_count: number;
  readings_count: number;
};

export interface AdminUser {
  user: User;
  greenhouse: ReturnType<typeof mapGreenhouse> | null;
  counts: { crops: number; sensors: number; readings: number };
}

const adminUserSelect = `
  u.id, u.name, u.email, u.role, u.created_at, u.updated_at,
  g.id AS greenhouse_id,
  g.name AS greenhouse_name,
  g.location AS greenhouse_location,
  g.created_at AS greenhouse_created_at,
  g.updated_at AS greenhouse_updated_at,
  (SELECT COUNT(*) FROM crops c WHERE c.greenhouse_id = g.id) AS crops_count,
  (SELECT COUNT(*) FROM sensors s WHERE s.greenhouse_id = g.id) AS sensors_count,
  (SELECT COUNT(*) FROM sensor_readings r
    JOIN sensors s ON s.id = r.sensor_id
    WHERE s.greenhouse_id = g.id) AS readings_count
`;

export function listUsers(
  query: AdminUsersQuery
): { items: AdminUser[]; total: number } {
  const conditions: string[] = [];
  const parameters: Array<string | number> = [];
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    conditions.push(`(
      u.name LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      u.email LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    parameters.push(pattern, pattern);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const db = getDatabase();
  const count = db
    .prepare(`SELECT COUNT(*) AS total FROM users u ${where}`)
    .get(...parameters) as { total: number };
  const rows = db
    .prepare(`
      SELECT ${adminUserSelect}
      FROM users u
      LEFT JOIN greenhouses g ON g.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC, u.id ASC
      LIMIT ? OFFSET ?
    `)
    .all(...parameters, query.limit, paginationOffset(query.page, query.limit)) as AdminUserRow[];
  return { items: rows.map(mapAdminUser), total: count.total };
}

export function findAdminUser(userId: string): AdminUser | undefined {
  const row = getDatabase()
    .prepare(`
      SELECT ${adminUserSelect}
      FROM users u
      LEFT JOIN greenhouses g ON g.user_id = u.id
      WHERE u.id = ?
    `)
    .get(userId) as AdminUserRow | undefined;
  return row ? mapAdminUser(row) : undefined;
}

export function listUserResources(
  userId: string,
  query: AdminResourcesQuery,
  period?: { from: string; to: string }
): { items: Crop[] | Sensor[] | SensorReading[]; total: number } {
  const db = getDatabase();
  const offset = paginationOffset(query.page, query.limit);

  if (query.type === 'crops') {
    const total = db
      .prepare(`
        SELECT COUNT(*) AS total FROM crops c
        JOIN greenhouses g ON g.id = c.greenhouse_id
        WHERE g.user_id = ?
      `)
      .get(userId) as { total: number };
    const rows = db
      .prepare(`
        SELECT c.id, c.name, c.species, c.variety, c.status, c.planted_at,
               c.expected_harvest_at, c.notes, c.created_at, c.updated_at
        FROM crops c
        JOIN greenhouses g ON g.id = c.greenhouse_id
        WHERE g.user_id = ?
        ORDER BY c.updated_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(userId, query.limit, offset) as CropRow[];
    return { items: rows.map(mapCrop), total: total.total };
  }

  if (query.type === 'sensors') {
    const total = db
      .prepare(`
        SELECT COUNT(*) AS total FROM sensors s
        JOIN greenhouses g ON g.id = s.greenhouse_id
        WHERE g.user_id = ?
      `)
      .get(userId) as { total: number };
    const rows = db
      .prepare(`
        SELECT s.id, s.code, s.name, s.type, s.unit, s.active, s.created_at, s.updated_at
        FROM sensors s
        JOIN greenhouses g ON g.id = s.greenhouse_id
        WHERE g.user_id = ?
        ORDER BY s.updated_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(userId, query.limit, offset) as SensorRow[];
    return { items: rows.map(mapSensor), total: total.total };
  }

  const resolvedPeriod = period!;
  const total = db
    .prepare(`
      SELECT COUNT(*) AS total FROM sensor_readings r
      JOIN sensors s ON s.id = r.sensor_id
      JOIN greenhouses g ON g.id = s.greenhouse_id
      WHERE g.user_id = ? AND r.recorded_at >= ? AND r.recorded_at <= ?
    `)
    .get(userId, resolvedPeriod.from, resolvedPeriod.to) as { total: number };
  const rows = db
    .prepare(`
      SELECT r.id, r.sensor_id, r.value, r.recorded_at, r.created_at
      FROM sensor_readings r
      JOIN sensors s ON s.id = r.sensor_id
      JOIN greenhouses g ON g.id = s.greenhouse_id
      WHERE g.user_id = ? AND r.recorded_at >= ? AND r.recorded_at <= ?
      ORDER BY r.recorded_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(userId, resolvedPeriod.from, resolvedPeriod.to, query.limit, offset) as ReadingRow[];
  return { items: rows.map(mapReading), total: total.total };
}

export function deleteUser(userId: string): boolean {
  return getDatabase().prepare('DELETE FROM users WHERE id = ?').run(userId).changes === 1;
}

export function countAdmins(): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN'")
    .get() as { total: number };
  return row.total;
}

export function getGlobalStats() {
  const db = getDatabase();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const totals = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM greenhouses) AS greenhouses,
        (SELECT COUNT(*) FROM crops) AS crops,
        (SELECT COUNT(*) FROM crops WHERE status = 'ACTIVE') AS active_crops,
        (SELECT COUNT(*) FROM sensors) AS sensors,
        (SELECT COUNT(*) FROM sensors WHERE active = 1) AS active_sensors,
        (SELECT COUNT(*) FROM sensor_readings) AS readings,
        (SELECT COUNT(*) FROM sensor_readings WHERE recorded_at >= ?) AS readings_last_24h
    `)
    .get(since) as {
    users: number;
    greenhouses: number;
    crops: number;
    active_crops: number;
    sensors: number;
    active_sensors: number;
    readings: number;
    readings_last_24h: number;
  };
  const sensorTypes = db
    .prepare('SELECT type, COUNT(*) AS count FROM sensors GROUP BY type ORDER BY type')
    .all() as Array<{ type: SensorType; count: number }>;
  return {
    users: totals.users,
    greenhouses: totals.greenhouses,
    crops: totals.crops,
    activeCrops: totals.active_crops,
    sensors: totals.sensors,
    activeSensors: totals.active_sensors,
    readings: totals.readings,
    readingsLast24h: totals.readings_last_24h,
    sensorsByType: sensorTypes
  };
}

function mapAdminUser(row: AdminUserRow): AdminUser {
  const greenhouse = row.greenhouse_id
    ? mapGreenhouse({
        id: row.greenhouse_id,
        name: row.greenhouse_name!,
        location: row.greenhouse_location,
        created_at: row.greenhouse_created_at!,
        updated_at: row.greenhouse_updated_at!
      } satisfies GreenhouseRow)
    : null;
  return {
    user: mapUser(row),
    greenhouse,
    counts: {
      crops: row.crops_count,
      sensors: row.sensors_count,
      readings: row.readings_count
    }
  };
}
