import type {
  AdminStats,
  AdminUserRecord,
  AuthSession,
  Crop,
  CropInput,
  DashboardSummary,
  Greenhouse,
  PageMeta,
  Paginated,
  Sensor,
  SensorInput,
  SensorUpdateInput,
  SensorReading,
  User
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

interface ApiEnvelope<T> {
  data: T;
  meta?: PageMeta;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string | string[]>;
    requestId?: string;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string | string[]>;
  requestId?: string;

  constructor(message: string, status: number, payload?: ApiErrorPayload['error']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.code;
    this.fields = payload?.fields;
    this.requestId = payload?.requestId;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.', 0);
  }

  if (response.status === 204) return { data: undefined as T };

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T> & ApiErrorPayload;
  if (!response.ok) {
    const safeMessage =
      payload.error?.message ||
      (response.status === 401
        ? 'Tu sesión terminó. Inicia sesión nuevamente.'
        : response.status === 403
          ? 'No tienes permisos para realizar esta acción.'
          : response.status === 404
            ? 'No encontramos el recurso solicitado.'
            : 'No pudimos completar la operación. Inténtalo nuevamente.');
    throw new ApiError(safeMessage, response.status, payload.error);
  }

  return payload;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestEnvelope<T>(path, options)).data;
}

function queryString(values: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function paginated<T>(path: string, options?: RequestOptions): Promise<Paginated<T>> {
  const envelope = await requestEnvelope<T[]>(path, options);
  return {
    items: Array.isArray(envelope.data) ? envelope.data : [],
    meta: envelope.meta || { page: 1, limit: 20, total: Array.isArray(envelope.data) ? envelope.data.length : 0 }
  };
}

export const api = {
  auth: {
    me: (signal?: AbortSignal) => request<AuthSession>('/auth/me', { signal }),
    login: (values: { email: string; password: string }) =>
      request<AuthSession>('/auth/login', { method: 'POST', body: values }),
    register: (values: { name: string; email: string; password: string }) =>
      request<AuthSession>('/auth/register', { method: 'POST', body: values }),
    logout: () => request<void>('/auth/logout', { method: 'POST' })
  },
  greenhouse: {
    get: (signal?: AbortSignal) => request<Greenhouse>('/greenhouse', { signal }),
    update: (values: { name?: string; location?: string }) =>
      request<Greenhouse>('/greenhouse', { method: 'PATCH', body: values })
  },
  dashboard: {
    summary: (from: string, to: string, signal?: AbortSignal) =>
      request<DashboardSummary>(`/dashboard/summary${queryString({ from, to })}`, { signal })
  },
  crops: {
    list: (params: Record<string, string | number | undefined>, signal?: AbortSignal) =>
      paginated<Crop>(`/crops${queryString(params)}`, { signal }),
    get: (id: string, signal?: AbortSignal) => request<Crop>(`/crops/${id}`, { signal }),
    create: (values: CropInput) => request<Crop>('/crops', { method: 'POST', body: values }),
    update: (id: string, values: Partial<CropInput>) =>
      request<Crop>(`/crops/${id}`, { method: 'PATCH', body: values }),
    remove: (id: string) => request<void>(`/crops/${id}`, { method: 'DELETE' })
  },
  sensors: {
    list: (params: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
      paginated<Sensor>(`/sensors${queryString(params)}`, { signal }),
    get: (id: string, signal?: AbortSignal) => request<Sensor>(`/sensors/${id}`, { signal }),
    create: (values: SensorInput) => request<Sensor>('/sensors', { method: 'POST', body: values }),
    update: (id: string, values: Partial<SensorUpdateInput>) =>
      request<Sensor>(`/sensors/${id}`, { method: 'PATCH', body: values }),
    remove: (id: string) => request<void>(`/sensors/${id}`, { method: 'DELETE' }),
    readings: async (
      id: string,
      params: { from?: string; to?: string; page?: number; limit?: number },
      signal?: AbortSignal
    ) => paginated<SensorReading>(`/sensors/${id}/readings${queryString(params)}`, { signal })
  },
  admin: {
    stats: (signal?: AbortSignal) => request<AdminStats>('/admin/stats', { signal }),
    users: (params: { q?: string; page?: number; limit?: number }, signal?: AbortSignal) =>
      paginated<AdminUserRecord>(`/admin/users${queryString(params)}`, { signal }),
    user: (id: string, signal?: AbortSignal) => request<AdminUserRecord>(`/admin/users/${id}`, { signal }),
    resources: <T>(
      id: string,
      params: { type: 'crops' | 'sensors' | 'readings'; page?: number; limit?: number; from?: string; to?: string },
      signal?: AbortSignal
    ) => paginated<T>(`/admin/users/${id}/resources${queryString(params)}`, { signal }),
    removeUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' })
  }
};

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
