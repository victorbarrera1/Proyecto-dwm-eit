export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CROP_STATUSES = ['PLANNED', 'ACTIVE', 'HARVESTED', 'CANCELLED'] as const;
export type CropStatus = (typeof CROP_STATUSES)[number];

export const SENSOR_TYPES = [
  'TEMPERATURE',
  'AIR_HUMIDITY',
  'SOIL_MOISTURE',
  'LIGHT'
] as const;
export type SensorType = (typeof SENSOR_TYPES)[number];

export const SENSOR_UNITS: Record<SensorType, string> = {
  TEMPERATURE: '°C',
  AIR_HUMIDITY: '%',
  SOIL_MOISTURE: '%',
  LIGHT: 'lx'
};

export const SENSOR_VALUE_RANGES: Record<SensorType, { min: number; max: number }> = {
  TEMPERATURE: { min: -40, max: 80 },
  AIR_HUMIDITY: { min: 0, max: 100 },
  SOIL_MOISTURE: { min: 0, max: 100 },
  LIGHT: { min: 0, max: 200_000 }
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Greenhouse {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Crop {
  id: string;
  name: string;
  species: string;
  variety: string | null;
  status: CropStatus;
  plantedAt: string;
  expectedHarvestAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sensor {
  id: string;
  code: string;
  name: string;
  type: SensorType;
  unit: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  recordedAt: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface Period {
  from: string;
  to: string;
}
