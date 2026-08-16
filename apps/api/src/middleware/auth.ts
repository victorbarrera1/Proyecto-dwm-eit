import type { RequestHandler } from 'express';
import { getConfig } from '../config.js';
import { AppError } from '../errors.js';
import { authenticate } from '../services/authService.js';

export const requireAuth: RequestHandler = (request, _response, next) => {
  const token = request.cookies?.[getConfig().sessionCookieName] as string | undefined;
  request.auth = authenticate(token);
  next();
};

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.auth) {
    next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.'));
    return;
  }
  if (request.auth.user.role !== 'ADMIN') {
    next(new AppError(403, 'ADMIN_REQUIRED', 'Esta operación requiere permisos de administrador.'));
    return;
  }
  next();
};
