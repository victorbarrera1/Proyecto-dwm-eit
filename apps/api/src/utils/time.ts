import { AppError } from '../errors.js';
import type { Period } from '../domain.js';

export function nowIso(): string {
  return new Date().toISOString();
}

export function resolvePeriod(
  from: string | undefined,
  to: string | undefined,
  defaultDays = 7
): Period {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - defaultDays * 86_400_000);

  if (!Number.isFinite(fromDate.getTime()) || !Number.isFinite(toDate.getTime())) {
    throw new AppError(422, 'INVALID_PERIOD', 'El período indicado no es válido.');
  }
  if (fromDate > toDate) {
    throw new AppError(422, 'INVALID_PERIOD', 'La fecha desde debe ser anterior a la fecha hasta.');
  }
  if (toDate.getTime() - fromDate.getTime() > 366 * 86_400_000) {
    throw new AppError(422, 'PERIOD_TOO_LARGE', 'El período máximo permitido es de 366 días.');
  }

  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}
