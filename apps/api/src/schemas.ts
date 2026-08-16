import { z } from 'zod';
import { CROP_STATUSES, SENSOR_TYPES } from './domain.js';

const shortText = (field: string, min = 2, max = 80) =>
  z
    .string({ error: `${field} es obligatorio.` })
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres.`)
    .max(max, `${field} no puede superar ${max} caracteres.`);

const optionalText = (field: string, max: number) =>
  z
    .union([z.string().trim().max(max, `${field} no puede superar ${max} caracteres.`), z.null()])
    .optional();

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato de fecha AAAA-MM-DD.')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), 'La fecha no es válida.');

const dateTime = z
  .string()
  .datetime({ offset: true, message: 'Usa una fecha y hora ISO 8601 con zona horaria.' });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
};

export const registerSchema = z
  .object({
    name: shortText('El nombre', 2, 80),
    email: z.string().trim().toLowerCase().email('El correo no tiene un formato válido.').max(254),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
        message: 'La contraseña no puede superar 72 bytes.'
      })
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('El correo no tiene un formato válido.'),
    password: z.string().min(1, 'La contraseña es obligatoria.')
  })
  .strict();

export const greenhousePatchSchema = z
  .object({
    name: shortText('El nombre', 2, 80).optional(),
    location: optionalText('La ubicación', 160)
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Debes indicar al menos un campo.');

export const cropCreateSchema = z
  .object({
    name: shortText('El nombre', 2, 80),
    species: shortText('La especie', 2, 80),
    variety: optionalText('La variedad', 80),
    status: z.enum(CROP_STATUSES).default('ACTIVE'),
    plantedAt: dateOnly,
    expectedHarvestAt: dateOnly.nullable().optional().transform((value) => value ?? null),
    notes: optionalText('Las notas', 1000)
  })
  .strict();

export const cropPatchSchema = z
  .object({
    name: shortText('El nombre', 2, 80).optional(),
    species: shortText('La especie', 2, 80).optional(),
    variety: optionalText('La variedad', 80),
    status: z.enum(CROP_STATUSES).optional(),
    plantedAt: dateOnly.optional(),
    expectedHarvestAt: dateOnly.nullable().optional(),
    notes: optionalText('Las notas', 1000)
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Debes indicar al menos un campo.');

export const cropsQuerySchema = z
  .object({
    ...pagination,
    q: z.string().trim().max(80).optional(),
    status: z.enum(CROP_STATUSES).optional(),
    plantedFrom: dateOnly.optional(),
    plantedTo: dateOnly.optional()
  })
  .strict();

export const sensorCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'El código debe tener al menos 3 caracteres.')
      .max(40, 'El código no puede superar 40 caracteres.')
      .regex(/^[A-Za-z0-9_-]+$/, 'El código solo admite letras, números, guion y guion bajo.'),
    name: shortText('El nombre', 2, 80),
    type: z.enum(SENSOR_TYPES),
    active: z.boolean().default(true)
  })
  .strict();

export const sensorPatchSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'El código debe tener al menos 3 caracteres.')
      .max(40, 'El código no puede superar 40 caracteres.')
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    name: shortText('El nombre', 2, 80).optional(),
    active: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Debes indicar al menos un campo.');

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const sensorsQuerySchema = z
  .object({
    ...pagination,
    q: z.string().trim().max(80).optional(),
    type: z.enum(SENSOR_TYPES).optional(),
    active: booleanQuery.optional()
  })
  .strict();

export const readingCreateSchema = z
  .object({
    value: z.number().finite('El valor debe ser un número finito.'),
    recordedAt: dateTime.optional()
  })
  .strict();

export const readingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(5000).default(500),
    from: dateTime.optional(),
    to: dateTime.optional()
  })
  .strict();

export const dashboardQuerySchema = z
  .object({
    from: dateTime.optional(),
    to: dateTime.optional()
  })
  .strict();

export const adminUsersQuerySchema = z
  .object({
    ...pagination,
    q: z.string().trim().max(100).optional()
  })
  .strict();

export const adminResourcesQuerySchema = z
  .object({
    ...pagination,
    type: z.enum(['crops', 'sensors', 'readings']),
    from: dateTime.optional(),
    to: dateTime.optional()
  })
  .strict();

export const idParamsSchema = z.object({ id: z.string().uuid('El identificador no es válido.') });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GreenhousePatchInput = z.infer<typeof greenhousePatchSchema>;
export type CropCreateInput = z.infer<typeof cropCreateSchema>;
export type CropPatchInput = z.infer<typeof cropPatchSchema>;
export type CropsQuery = z.infer<typeof cropsQuerySchema>;
export type SensorCreateInput = z.infer<typeof sensorCreateSchema>;
export type SensorPatchInput = z.infer<typeof sensorPatchSchema>;
export type SensorsQuery = z.infer<typeof sensorsQuerySchema>;
export type ReadingCreateInput = z.infer<typeof readingCreateSchema>;
export type ReadingsQuery = z.infer<typeof readingsQuerySchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminResourcesQuery = z.infer<typeof adminResourcesQuerySchema>;
