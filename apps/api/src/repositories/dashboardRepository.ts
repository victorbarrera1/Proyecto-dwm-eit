import { getDatabase } from '../db/database.js';
import type { Crop, SensorType } from '../domain.js';
import { mapCrop, type CropRow } from './mappers.js';

export interface DashboardCounts {
  cropsTotal: number;
  cropsActive: number;
  sensorsTotal: number;
  sensorsActive: number;
  readingsInPeriod: number;
}

export interface LatestReading {
  sensorId: string;
  sensorName: string;
  type: SensorType;
  unit: string;
  value: number | null;
  recordedAt: string | null;
}

export function getDashboardCounts(
  userId: string,
  from: string,
  to: string
): DashboardCounts {
  const row = getDatabase()
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM crops c
          JOIN greenhouses g ON g.id = c.greenhouse_id
          WHERE g.user_id = ?) AS crops_total,
        (SELECT COUNT(*) FROM crops c
          JOIN greenhouses g ON g.id = c.greenhouse_id
          WHERE g.user_id = ? AND c.status = 'ACTIVE') AS crops_active,
        (SELECT COUNT(*) FROM sensors s
          JOIN greenhouses g ON g.id = s.greenhouse_id
          WHERE g.user_id = ?) AS sensors_total,
        (SELECT COUNT(*) FROM sensors s
          JOIN greenhouses g ON g.id = s.greenhouse_id
          WHERE g.user_id = ? AND s.active = 1) AS sensors_active,
        (SELECT COUNT(*) FROM sensor_readings r
          JOIN sensors s ON s.id = r.sensor_id
          JOIN greenhouses g ON g.id = s.greenhouse_id
          WHERE g.user_id = ? AND r.recorded_at >= ? AND r.recorded_at <= ?
        ) AS readings_in_period
    `)
    .get(userId, userId, userId, userId, userId, from, to) as {
    crops_total: number;
    crops_active: number;
    sensors_total: number;
    sensors_active: number;
    readings_in_period: number;
  };
  return {
    cropsTotal: row.crops_total,
    cropsActive: row.crops_active,
    sensorsTotal: row.sensors_total,
    sensorsActive: row.sensors_active,
    readingsInPeriod: row.readings_in_period
  };
}

export function getLatestReadings(userId: string): LatestReading[] {
  const rows = getDatabase()
    .prepare(`
      SELECT
        s.id AS sensor_id,
        s.name AS sensor_name,
        s.type,
        s.unit,
        r.value,
        r.recorded_at
      FROM sensors s
      JOIN greenhouses g ON g.id = s.greenhouse_id
      LEFT JOIN sensor_readings r ON r.id = (
        SELECT latest.id
        FROM sensor_readings latest
        WHERE latest.sensor_id = s.id
        ORDER BY latest.recorded_at DESC, latest.id DESC
        LIMIT 1
      )
      WHERE g.user_id = ?
      ORDER BY s.name COLLATE NOCASE ASC
    `)
    .all(userId) as Array<{
    sensor_id: string;
    sensor_name: string;
    type: SensorType;
    unit: string;
    value: number | null;
    recorded_at: string | null;
  }>;
  return rows.map((row) => ({
    sensorId: row.sensor_id,
    sensorName: row.sensor_name,
    type: row.type,
    unit: row.unit,
    value: row.value,
    recordedAt: row.recorded_at
  }));
}

export function getRecentCrops(userId: string, limit = 5): Crop[] {
  const rows = getDatabase()
    .prepare(`
      SELECT
        c.id, c.name, c.species, c.variety, c.status, c.planted_at,
        c.expected_harvest_at, c.notes, c.created_at, c.updated_at
      FROM crops c
      JOIN greenhouses g ON g.id = c.greenhouse_id
      WHERE g.user_id = ?
      ORDER BY c.updated_at DESC, c.id ASC
      LIMIT ?
    `)
    .all(userId, limit) as CropRow[];
  return rows.map(mapCrop);
}
