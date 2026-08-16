export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Greenhouse {
  id: string;
  name: string;
  location?: string | null;
  createdAt?: string;
}

export interface AuthSession {
  user: User;
  greenhouse: Greenhouse;
}

export type CropStatus = 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'CANCELLED';

export interface Crop {
  id: string;
  name: string;
  species: string;
  variety?: string | null;
  status: CropStatus;
  plantedAt: string;
  expectedHarvestAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CropInput {
  name: string;
  species: string;
  variety?: string;
  status: CropStatus;
  plantedAt: string;
  expectedHarvestAt?: string;
  notes?: string;
}

export type SensorType = 'TEMPERATURE' | 'AIR_HUMIDITY' | 'SOIL_MOISTURE' | 'LIGHT';

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

export interface SensorInput {
  code: string;
  name: string;
  type: SensorType;
  active: boolean;
}

export type SensorUpdateInput = Pick<SensorInput, 'code' | 'name' | 'active'>;

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  recordedAt: string;
  createdAt?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  period?: { from: string; to: string };
  sensor?: Sensor;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export interface DashboardSummary {
  greenhouse: Greenhouse;
  counts: {
    cropsTotal: number;
    cropsActive: number;
    sensorsTotal: number;
    sensorsActive: number;
    readingsInPeriod: number;
  };
  latestReadings: Array<{
    sensorId: string;
    sensorName: string;
    type: SensorType;
    unit: string;
    value: number | null;
    recordedAt: string | null;
  }>;
  recentCrops: Crop[];
  period: { from: string; to: string };
}

export interface AdminStats {
  users: number;
  greenhouses: number;
  crops: number;
  activeCrops: number;
  sensors: number;
  activeSensors: number;
  readings: number;
  readingsLast24h: number;
  sensorsByType: Array<{ type: SensorType; count: number }>;
}

export interface AdminUserRecord {
  user: User;
  greenhouse: Greenhouse | null;
  counts: {
    crops: number;
    sensors: number;
    readings: number;
  };
}
