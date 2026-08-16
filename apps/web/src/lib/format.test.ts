import { describe, expect, it } from 'vitest';
import { cropStatusLabels, formatNumber, sensorTypeLabels, toDateInput } from './format';

describe('formatos de interfaz', () => {
  it('mantiene fechas de formulario en formato YYYY-MM-DD', () => {
    expect(toDateInput('2026-08-15T14:30:00.000Z')).toBe('2026-08-15');
    expect(toDateInput(null)).toBe('');
  });

  it('expone etiquetas para todos los enums aceptados por la API', () => {
    expect(Object.keys(cropStatusLabels)).toEqual([
      'PLANNED',
      'ACTIVE',
      'HARVESTED',
      'CANCELLED'
    ]);
    expect(Object.keys(sensorTypeLabels)).toEqual([
      'TEMPERATURE',
      'AIR_HUMIDITY',
      'SOIL_MOISTURE',
      'LIGHT'
    ]);
  });

  it('formatea números para la interfaz chilena', () => {
    expect(formatNumber(1234.56, 1)).toBe('1.234,6');
  });
});
