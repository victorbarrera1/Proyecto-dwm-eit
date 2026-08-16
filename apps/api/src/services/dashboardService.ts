import type { Period } from '../domain.js';
import { AppError } from '../errors.js';
import * as dashboardRepository from '../repositories/dashboardRepository.js';
import { findGreenhouseByUserId } from '../repositories/greenhouseRepository.js';
import { resolvePeriod } from '../utils/time.js';

export function getSummary(userId: string, from?: string, to?: string) {
  const period: Period = resolvePeriod(from, to);
  const greenhouse = findGreenhouseByUserId(userId);
  if (!greenhouse) {
    throw new AppError(404, 'GREENHOUSE_NOT_FOUND', 'No se encontró el invernadero.');
  }
  return {
    greenhouse,
    counts: dashboardRepository.getDashboardCounts(userId, period.from, period.to),
    latestReadings: dashboardRepository.getLatestReadings(userId),
    recentCrops: dashboardRepository.getRecentCrops(userId),
    period
  };
}
