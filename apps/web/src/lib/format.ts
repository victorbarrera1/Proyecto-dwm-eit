import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CropStatus, SensorType } from '../types';

export const cropStatusLabels: Record<CropStatus, string> = {
  PLANNED: 'Planificado',
  ACTIVE: 'En cultivo',
  HARVESTED: 'Cosechado',
  CANCELLED: 'Cancelado'
};

export const sensorTypeLabels: Record<SensorType, string> = {
  TEMPERATURE: 'Temperatura',
  AIR_HUMIDITY: 'Humedad del aire',
  SOIL_MOISTURE: 'Humedad del suelo',
  LIGHT: 'Luz'
};

export function formatDate(value?: string | null, includeTime = false) {
  if (!value) return 'Sin fecha';
  const date = parseISO(value);
  if (!isValid(date)) return 'Sin fecha';
  return format(date, includeTime ? "d MMM yyyy, HH:mm" : 'd MMM yyyy', { locale: es });
}

export function relativeDate(value?: string | null) {
  if (!value) return 'Sin registros';
  const date = parseISO(value);
  if (!isValid(date)) return 'Sin registros';
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

export function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value);
}
