import { randomUUID } from 'node:crypto';
import { AppError } from '../errors.js';
import type {
  CropCreateInput,
  CropPatchInput,
  CropsQuery
} from '../schemas.js';
import * as cropRepository from '../repositories/cropRepository.js';
import { findGreenhouseIdByUserId } from '../repositories/greenhouseRepository.js';

export function listCrops(userId: string, query: CropsQuery) {
  validateFilterDates(query.plantedFrom, query.plantedTo);
  return cropRepository.listOwnedCrops(userId, query);
}

export function getCrop(userId: string, cropId: string) {
  const crop = cropRepository.findOwnedCrop(userId, cropId);
  if (!crop) throw cropNotFound();
  return crop;
}

export function createCrop(userId: string, input: CropCreateInput) {
  validateHarvestDate(input.plantedAt, input.expectedHarvestAt ?? null);
  const greenhouseId = findGreenhouseIdByUserId(userId);
  if (!greenhouseId) {
    throw new AppError(404, 'GREENHOUSE_NOT_FOUND', 'No se encontró el invernadero.');
  }
  const id = randomUUID();
  cropRepository.createCrop({
    id,
    greenhouseId,
    name: input.name,
    species: input.species,
    variety: normalizeNullableText(input.variety),
    status: input.status,
    plantedAt: input.plantedAt,
    expectedHarvestAt: input.expectedHarvestAt ?? null,
    notes: normalizeNullableText(input.notes),
    now: new Date().toISOString()
  });
  return getCrop(userId, id);
}

export function updateCrop(userId: string, cropId: string, patch: CropPatchInput) {
  const current = getCrop(userId, cropId);
  const next = {
    name: patch.name ?? current.name,
    species: patch.species ?? current.species,
    variety:
      patch.variety === undefined ? current.variety : normalizeNullableText(patch.variety),
    status: patch.status ?? current.status,
    plantedAt: patch.plantedAt ?? current.plantedAt,
    expectedHarvestAt:
      patch.expectedHarvestAt === undefined
        ? current.expectedHarvestAt
        : patch.expectedHarvestAt,
    notes: patch.notes === undefined ? current.notes : normalizeNullableText(patch.notes),
    now: new Date().toISOString()
  };
  validateHarvestDate(next.plantedAt, next.expectedHarvestAt);
  if (!cropRepository.updateOwnedCrop(userId, cropId, next)) throw cropNotFound();
  return getCrop(userId, cropId);
}

export function deleteCrop(userId: string, cropId: string): void {
  if (!cropRepository.deleteOwnedCrop(userId, cropId)) throw cropNotFound();
}

function validateHarvestDate(plantedAt: string, expectedHarvestAt: string | null): void {
  if (expectedHarvestAt !== null && expectedHarvestAt < plantedAt) {
    throw new AppError(
      422,
      'INVALID_CROP_DATES',
      'La cosecha esperada no puede ser anterior a la plantación.',
      { expectedHarvestAt: 'Debe ser igual o posterior a la fecha de plantación.' }
    );
  }
}

function validateFilterDates(from: string | undefined, to: string | undefined): void {
  if (from && to && from > to) {
    throw new AppError(422, 'INVALID_PERIOD', 'La fecha desde debe ser anterior a la fecha hasta.');
  }
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function cropNotFound(): AppError {
  return new AppError(404, 'CROP_NOT_FOUND', 'No se encontró el cultivo.');
}
