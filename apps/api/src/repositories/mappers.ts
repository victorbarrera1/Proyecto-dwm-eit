import type {
  Crop,
  CropStatus,
  Greenhouse,
  Sensor,
  SensorReading,
  SensorType,
  User,
  UserRole
} from '../domain.js';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type GreenhouseRow = {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type CropRow = {
  id: string;
  name: string;
  species: string;
  variety: string | null;
  status: CropStatus;
  planted_at: string;
  expected_harvest_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SensorRow = {
  id: string;
  code: string;
  name: string;
  type: SensorType;
  unit: string;
  active: number;
  created_at: string;
  updated_at: string;
};

export type ReadingRow = {
  id: string;
  sensor_id: string;
  value: number;
  recorded_at: string;
  created_at: string;
};

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapGreenhouse(row: GreenhouseRow): Greenhouse {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapCrop(row: CropRow): Crop {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    variety: row.variety,
    status: row.status,
    plantedAt: row.planted_at,
    expectedHarvestAt: row.expected_harvest_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapSensor(row: SensorRow): Sensor {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    unit: row.unit,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapReading(row: ReadingRow): SensorReading {
  return {
    id: row.id,
    sensorId: row.sensor_id,
    value: row.value,
    recordedAt: row.recorded_at,
    createdAt: row.created_at
  };
}
