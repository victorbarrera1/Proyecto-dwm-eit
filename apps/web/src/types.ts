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

export type CropStatus = 'PLANNED' | 'ACTIVE' | 'HARVESTED' | 'ARCHIVED';

export interface Crop {
  id: string;
  name: string;
  species: string;
  variety?: string | null;
  status: CropStatus;
  plantedAt?: string | null;
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
  plantedAt?: string;
  expectedHarvestAt?: string;
  notes?: string;
}

export type SensorType = 'TEMPERATURE' | 'AIR_HUMIDITY' | 'SOIL_MOISTURE' | 'LIGHT' | 'PH' | 'OTHER';

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
  unit: string;
  active: boolean;
}

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
    value: number;
    recordedAt: string;
  }>;
  recentCrops: Crop[];
  period: { from: string; to: string };
}

export interface AdminStats {
  usersTotal: number;
  greenhousesTotal: number;
  cropsTotal: number;
  sensorsTotal: number;
  readingsTotal: number;
}

export interface AdminUserDetail extends User {
  greenhouse?: Greenhouse | null;
  counts?: {
    crops: number;
    sensors: number;
    readings: number;
  };
}
