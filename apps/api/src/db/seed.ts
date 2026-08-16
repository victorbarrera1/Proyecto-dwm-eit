import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { getConfig } from '../config.js';
import { SENSOR_UNITS, type SensorType } from '../domain.js';
import { getDatabase, initializeDatabase } from './database.js';

const IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  userOne: '00000000-0000-4000-8000-000000000011',
  userTwo: '00000000-0000-4000-8000-000000000012',
  adminGreenhouse: '00000000-0000-4000-8000-000000000101',
  greenhouseOne: '00000000-0000-4000-8000-000000000111',
  greenhouseTwo: '00000000-0000-4000-8000-000000000112'
} as const;

type DemoSensor = {
  id: string;
  greenhouseId: string;
  code: string;
  name: string;
  type: SensorType;
};

const demoSensors: DemoSensor[] = [
  {
    id: '00000000-0000-4000-8000-000000000211',
    greenhouseId: IDS.greenhouseOne,
    code: 'TEMP-NORTE',
    name: 'Temperatura norte',
    type: 'TEMPERATURE'
  },
  {
    id: '00000000-0000-4000-8000-000000000212',
    greenhouseId: IDS.greenhouseOne,
    code: 'HUM-AIRE-1',
    name: 'Humedad ambiental',
    type: 'AIR_HUMIDITY'
  },
  {
    id: '00000000-0000-4000-8000-000000000213',
    greenhouseId: IDS.greenhouseOne,
    code: 'HUM-SUELO-1',
    name: 'Humedad bancal central',
    type: 'SOIL_MOISTURE'
  },
  {
    id: '00000000-0000-4000-8000-000000000214',
    greenhouseId: IDS.greenhouseOne,
    code: 'LUZ-1',
    name: 'Luminosidad cubierta',
    type: 'LIGHT'
  },
  {
    id: '00000000-0000-4000-8000-000000000221',
    greenhouseId: IDS.greenhouseTwo,
    code: 'TEMP-SUR',
    name: 'Temperatura sur',
    type: 'TEMPERATURE'
  },
  {
    id: '00000000-0000-4000-8000-000000000222',
    greenhouseId: IDS.greenhouseTwo,
    code: 'HUM-AIRE-2',
    name: 'Humedad ambiental',
    type: 'AIR_HUMIDITY'
  },
  {
    id: '00000000-0000-4000-8000-000000000223',
    greenhouseId: IDS.greenhouseTwo,
    code: 'HUM-SUELO-2',
    name: 'Humedad sector almácigos',
    type: 'SOIL_MOISTURE'
  },
  {
    id: '00000000-0000-4000-8000-000000000224',
    greenhouseId: IDS.greenhouseTwo,
    code: 'LUZ-2',
    name: 'Luminosidad central',
    type: 'LIGHT'
  }
];

export async function seedDatabase(options: { now?: Date } = {}): Promise<void> {
  const config = getConfig();
  if (config.isProduction && !config.allowDemoSeed) {
    throw new Error('El seed de demostración está deshabilitado en producción.');
  }

  initializeDatabase();
  const db = getDatabase();
  const now = options.now ?? new Date();
  const anchor = new Date(now);
  anchor.setUTCMinutes(0, 0, 0);
  const timestamp = now.toISOString();

  const [adminPasswordHash, userPasswordHash] = await Promise.all([
    bcrypt.hash(config.adminPassword, 12),
    bcrypt.hash(config.demoUserPassword, 12)
  ]);

  const runSeed = db.transaction(() => {
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(
      IDS.admin,
      IDS.userOne,
      IDS.userTwo
    );

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      IDS.admin,
      'Administración',
      config.adminEmail,
      adminPasswordHash,
      'ADMIN',
      timestamp,
      timestamp
    );
    insertUser.run(
      IDS.userOne,
      'Camila Rojas',
      'camila@invernadero.local',
      userPasswordHash,
      'USER',
      timestamp,
      timestamp
    );
    insertUser.run(
      IDS.userTwo,
      'Diego Soto',
      'diego@invernadero.local',
      userPasswordHash,
      'USER',
      timestamp,
      timestamp
    );

    const insertGreenhouse = db.prepare(`
      INSERT INTO greenhouses (id, user_id, name, location, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertGreenhouse.run(
      IDS.adminGreenhouse,
      IDS.admin,
      'Invernadero administrativo',
      null,
      timestamp,
      timestamp
    );
    insertGreenhouse.run(
      IDS.greenhouseOne,
      IDS.userOne,
      'Invernadero Los Aromos',
      'Talca, Región del Maule',
      timestamp,
      timestamp
    );
    insertGreenhouse.run(
      IDS.greenhouseTwo,
      IDS.userTwo,
      'Invernadero El Maitén',
      'Curicó, Región del Maule',
      timestamp,
      timestamp
    );

    insertDemoCrops(db, timestamp, anchor);
    insertDemoSensors(db, timestamp);
    insertDemoReadings(db, timestamp, anchor);
  });

  runSeed();
}

function insertDemoCrops(db: Database.Database, timestamp: string, anchor: Date): void {
  const insert = db.prepare(`
    INSERT INTO crops (
      id, greenhouse_id, name, species, variety, status, planted_at,
      expected_harvest_at, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const dateDaysAgo = (days: number) =>
    new Date(anchor.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const dateDaysAhead = (days: number) =>
    new Date(anchor.getTime() + days * 86_400_000).toISOString().slice(0, 10);

  const crops = [
    ['00000000-0000-4000-8000-000000000311', IDS.greenhouseOne, 'Tomates cherry', 'Solanum lycopersicum', 'Cherry', 'ACTIVE', dateDaysAgo(40), dateDaysAhead(25), 'Hilera norte'],
    ['00000000-0000-4000-8000-000000000312', IDS.greenhouseOne, 'Lechugas', 'Lactuca sativa', 'Costina', 'ACTIVE', dateDaysAgo(18), dateDaysAhead(12), null],
    ['00000000-0000-4000-8000-000000000313', IDS.greenhouseOne, 'Albahaca', 'Ocimum basilicum', null, 'PLANNED', dateDaysAhead(5), dateDaysAhead(55), null],
    ['00000000-0000-4000-8000-000000000321', IDS.greenhouseTwo, 'Pimentones', 'Capsicum annuum', 'California Wonder', 'ACTIVE', dateDaysAgo(50), dateDaysAhead(20), null],
    ['00000000-0000-4000-8000-000000000322', IDS.greenhouseTwo, 'Espinacas', 'Spinacia oleracea', null, 'HARVESTED', dateDaysAgo(65), dateDaysAgo(15), 'Cosecha completada'],
    ['00000000-0000-4000-8000-000000000323', IDS.greenhouseTwo, 'Cilantro', 'Coriandrum sativum', null, 'ACTIVE', dateDaysAgo(12), dateDaysAhead(18), null]
  ] as const;

  for (const crop of crops) insert.run(...crop, timestamp, timestamp);
}

function insertDemoSensors(db: Database.Database, timestamp: string): void {
  const insert = db.prepare(`
    INSERT INTO sensors (
      id, greenhouse_id, code, name, type, unit, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const sensor of demoSensors) {
    insert.run(
      sensor.id,
      sensor.greenhouseId,
      sensor.code,
      sensor.name,
      sensor.type,
      SENSOR_UNITS[sensor.type],
      timestamp,
      timestamp
    );
  }
}

function insertDemoReadings(db: Database.Database, createdAt: string, anchor: Date): void {
  const insert = db.prepare(`
    INSERT INTO sensor_readings (id, sensor_id, value, recorded_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const [sensorIndex, sensor] of demoSensors.entries()) {
    for (let offset = 719; offset >= 0; offset -= 1) {
      const recordedAt = new Date(anchor.getTime() - offset * 3_600_000);
      const value = demoValue(sensor.type, recordedAt, sensorIndex);
      const iso = recordedAt.toISOString();
      insert.run(deterministicUuid(`${sensor.id}:${iso}`), sensor.id, value, iso, createdAt);
    }
  }
}

function demoValue(type: SensorType, at: Date, sensorIndex: number): number {
  const hour = at.getUTCHours();
  const dailyWave = Math.sin(((hour - 6) / 24) * Math.PI * 2);
  const slowWave = Math.sin((at.getTime() / 3_600_000 + sensorIndex * 11) / 19);
  let value: number;

  switch (type) {
    case 'TEMPERATURE':
      value = 21 + dailyWave * 5.5 + slowWave * 0.8 + (sensorIndex % 2) * 0.4;
      break;
    case 'AIR_HUMIDITY':
      value = 67 - dailyWave * 11 + slowWave * 2;
      break;
    case 'SOIL_MOISTURE':
      value = 58 + slowWave * 7 - Math.max(0, dailyWave) * 2;
      break;
    case 'LIGHT': {
      const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
      value = daylight * (72_000 + slowWave * 5_000);
      break;
    }
  }
  return Math.round(value * 100) / 100;
}

function deterministicUuid(input: string): string {
  const hash = createHash('sha256').update(input).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export const DEMO_IDS = IDS;
