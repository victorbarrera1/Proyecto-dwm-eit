import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { getConfig } from '../config.js';
import { AppError } from '../errors.js';

export const requestIdMiddleware: RequestHandler = (request, response, next) => {
  const supplied = request.header('x-request-id');
  request.requestId = supplied && supplied.length <= 100 ? supplied : randomUUID();
  response.setHeader('x-request-id', request.requestId);
  next();
};

export const originMiddleware: RequestHandler = (request, response, next) => {
  const origin = request.header('origin');
  if (!origin) {
    next();
    return;
  }

  const configuredOrigins = getConfig().appOrigins;
  const requestOrigin = `${request.protocol}://${request.get('host')}`.replace(/\/$/, '');
  const allowed = origin === requestOrigin || configuredOrigins.includes(origin.replace(/\/$/, ''));
  if (!allowed) {
    next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'El origen de la solicitud no está permitido.'));
    return;
  }

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.append('Vary', 'Origin');
  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  next();
};
