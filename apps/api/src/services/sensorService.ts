import { randomUUID } from 'node:crypto';
import {
  SENSOR_UNITS,
  SENSOR_VALUE_RANGES,
  type Period
} from '../domain.js';
import { AppError } from '../errors.js';
import type {
  ReadingCreateInput,
  ReadingsQuery,
  SensorCreateInput,
  SensorPatchInput,
  SensorsQuery
} from '../schemas.js';
import { findGreenhouseIdByUserId } from '../repositories/greenhouseRepository.js';
import * as sensorRepository from '../repositories/sensorRepository.js';
import { resolvePeriod } from '../utils/time.js';

export function listSensors(userId: string, query: SensorsQuery) {
  return sensorRepository.listOwnedSensors(userId, query);
}

export function getSensor(userId: string, sensorId: string) {
  const sensor = sensorRepository.findOwnedSensor(userId, sensorId);
  if (!sensor) throw sensorNotFound();
  return sensor;
}

export function createSensor(userId: string, input: SensorCreateInput) {
  const greenhouseId = findGreenhouseIdByUserId(userId);
  if (!greenhouseId) {
    throw new AppError(404, 'GREENHOUSE_NOT_FOUND', 'No se encontró el invernadero.');
  }
  const id = randomUUID();
  try {
    sensorRepository.createSensor({
      id,
      greenhouseId,
      code: input.code.toUpperCase(),
      name: input.name,
      type: input.type,
      unit: SENSOR_UNITS[input.type],
      active: input.active,
      now: new Date().toISOString()
    });
  } catch (error) {
    if (isConstraint(error)) {
      throw new AppError(
        409,
        'SENSOR_CODE_ALREADY_EXISTS',
        'Ya existe un sensor con ese código en el invernadero.',
        { code: 'El código debe ser único.' }
      );
    }
    throw error;
  }
  return getSensor(userId, id);
}

export function updateSensor(userId: string, sensorId: string, patch: SensorPatchInput) {
  const current = getSensor(userId, sensorId);
  try {
    const changed = sensorRepository.updateOwnedSensor(userId, sensorId, {
      code: (patch.code ?? current.code).toUpperCase(),
      name: patch.name ?? current.name,
      active: patch.active ?? current.active,
      now: new Date().toISOString()
    });
    if (!changed) throw sensorNotFound();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isConstraint(error)) {
      throw new AppError(
        409,
        'SENSOR_CODE_ALREADY_EXISTS',
        'Ya existe un sensor con ese código en el invernadero.',
        { code: 'El código debe ser único.' }
      );
    }
    throw error;
  }
  return getSensor(userId, sensorId);
}

export function deleteSensor(userId: string, sensorId: string): void {
  if (!sensorRepository.deleteOwnedSensor(userId, sensorId)) throw sensorNotFound();
}

export function addReading(userId: string, sensorId: string, input: ReadingCreateInput) {
  const sensor = getSensor(userId, sensorId);
  const range = SENSOR_VALUE_RANGES[sensor.type];
  if (input.value < range.min || input.value > range.max) {
    throw new AppError(
      422,
      'READING_OUT_OF_RANGE',
      `El valor debe estar entre ${range.min} y ${range.max} ${sensor.unit}.`,
      { value: `Rango permitido: ${range.min} a ${range.max} ${sensor.unit}.` }
    );
  }
  const recorded = input.recordedAt ? new Date(input.recordedAt) : new Date();
  if (recorded.getTime() > Date.now() + 5 * 60_000) {
    throw new AppError(
      422,
      'READING_IN_FUTURE',
      'La fecha de la lectura no puede estar en el futuro.'
    );
  }
  const id = randomUUID();
  try {
    sensorRepository.createReading({
      id,
      sensorId,
      value: input.value,
      recordedAt: recorded.toISOString(),
      now: new Date().toISOString()
    });
  } catch (error) {
    if (isConstraint(error)) {
      throw new AppError(
        409,
        'READING_ALREADY_EXISTS',
        'Ya existe una lectura para ese sensor en el instante indicado.'
      );
    }
    throw error;
  }
  return sensorRepository.findReadingById(id)!;
}

export function listReadings(
  userId: string,
  sensorId: string,
  query: ReadingsQuery
): {
  sensor: ReturnType<typeof getSensor>;
  period: Period;
  items: ReturnType<typeof sensorRepository.listSensorReadings>['items'];
  total: number;
} {
  const sensor = getSensor(userId, sensorId);
  const period = resolvePeriod(query.from, query.to);
  const readings = sensorRepository.listSensorReadings({
    sensorId,
    from: period.from,
    to: period.to,
    page: query.page,
    limit: query.limit
  });
  return { sensor, period, ...readings };
}

function sensorNotFound(): AppError {
  return new AppError(404, 'SENSOR_NOT_FOUND', 'No se encontró el sensor.');
}

function isConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String(error.code).startsWith('SQLITE_CONSTRAINT')
  );
}
