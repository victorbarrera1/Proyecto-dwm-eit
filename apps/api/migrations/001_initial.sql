CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) <= 254),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE greenhouses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  location TEXT CHECK (location IS NULL OR length(location) <= 160),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE crops (
  id TEXT PRIMARY KEY,
  greenhouse_id TEXT NOT NULL REFERENCES greenhouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  species TEXT NOT NULL CHECK (length(species) BETWEEN 2 AND 80),
  variety TEXT CHECK (variety IS NULL OR length(variety) <= 80),
  status TEXT NOT NULL CHECK (status IN ('PLANNED', 'ACTIVE', 'HARVESTED', 'CANCELLED')),
  planted_at TEXT NOT NULL,
  expected_harvest_at TEXT,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (expected_harvest_at IS NULL OR expected_harvest_at >= planted_at)
) STRICT;

CREATE TABLE sensors (
  id TEXT PRIMARY KEY,
  greenhouse_id TEXT NOT NULL REFERENCES greenhouses(id) ON DELETE CASCADE,
  code TEXT NOT NULL COLLATE NOCASE CHECK (length(code) BETWEEN 3 AND 40),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  type TEXT NOT NULL CHECK (type IN ('TEMPERATURE', 'AIR_HUMIDITY', 'SOIL_MOISTURE', 'LIGHT')),
  unit TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (greenhouse_id, code)
) STRICT;

CREATE TABLE sensor_readings (
  id TEXT PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (sensor_id, recorded_at)
) STRICT;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_crops_greenhouse_status ON crops(greenhouse_id, status);
CREATE INDEX idx_crops_greenhouse_planted ON crops(greenhouse_id, planted_at);
CREATE INDEX idx_sensors_greenhouse_type ON sensors(greenhouse_id, type);
CREATE INDEX idx_readings_sensor_recorded ON sensor_readings(sensor_id, recorded_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
