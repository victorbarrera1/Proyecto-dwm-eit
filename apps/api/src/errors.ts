import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function parseInput<T>(schema: ZodType<T>, value: unknown, status = 422): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'root';
    if (!fields[key]) fields[key] = issue.message;
  }

  throw new AppError(status, 'VALIDATION_ERROR', 'Revisa los datos ingresados.', fields);
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'La ruta solicitada no existe.'));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
        requestId: request.requestId
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos ingresados.',
        requestId: request.requestId
      }
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as SyntaxError & { status?: number }).status === 400
  ) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'El cuerpo de la solicitud no contiene JSON válido.',
        requestId: request.requestId
      }
    });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (getSafeNodeEnv() !== 'test') {
    console.error(JSON.stringify({ level: 'error', requestId: request.requestId, message }));
  }

  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'No fue posible completar la operación.',
      requestId: request.requestId
    }
  });
};

function getSafeNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}
