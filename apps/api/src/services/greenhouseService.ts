import { AppError } from '../errors.js';
import type { GreenhousePatchInput } from '../schemas.js';
import {
  findGreenhouseByUserId,
  updateGreenhouseByUserId
} from '../repositories/greenhouseRepository.js';

export function getGreenhouse(userId: string) {
  const greenhouse = findGreenhouseByUserId(userId);
  if (!greenhouse) {
    throw new AppError(404, 'GREENHOUSE_NOT_FOUND', 'No se encontró el invernadero.');
  }
  return greenhouse;
}

export function updateGreenhouse(userId: string, patch: GreenhousePatchInput) {
  const normalized = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.location !== undefined
      ? { location: normalizeNullableText(patch.location) }
      : {})
  };
  const greenhouse = updateGreenhouseByUserId(
    userId,
    normalized,
    new Date().toISOString()
  );
  if (!greenhouse) {
    throw new AppError(404, 'GREENHOUSE_NOT_FOUND', 'No se encontró el invernadero.');
  }
  return greenhouse;
}

function normalizeNullableText(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
