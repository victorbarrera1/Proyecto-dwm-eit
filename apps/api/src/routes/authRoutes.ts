import { Router, type CookieOptions, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getConfig } from '../config.js';
import { parseInput } from '../errors.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../schemas.js';
import * as authService from '../services/authService.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => getConfig().isTest,
  handler: (request, response) => {
    response.status(429).json({
      error: {
        code: 'TOO_MANY_AUTH_ATTEMPTS',
        message: 'Demasiados intentos. Intenta nuevamente más tarde.',
        requestId: request.requestId
      }
    });
  }
});

authRouter.post('/register', authLimiter, async (request, response) => {
  const result = await authService.register(parseInput(registerSchema, request.body));
  setSessionCookie(response, result.token, result.expiresAt);
  response.status(201).json({ data: { user: result.user, greenhouse: result.greenhouse } });
});

authRouter.post('/login', authLimiter, async (request, response) => {
  const result = await authService.login(parseInput(loginSchema, request.body));
  setSessionCookie(response, result.token, result.expiresAt);
  response.json({ data: { user: result.user, greenhouse: result.greenhouse } });
});

authRouter.post('/logout', (request, response) => {
  const config = getConfig();
  const token = request.cookies?.[config.sessionCookieName] as string | undefined;
  authService.logout(token);
  response.clearCookie(config.sessionCookieName, cookieOptions());
  response.sendStatus(204);
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({ data: authService.getProfile(request.auth!.user) });
});

function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: string
): void {
  const config = getConfig();
  response.cookie(config.sessionCookieName, token, {
    ...cookieOptions(),
    expires: new Date(expiresAt)
  });
}

function cookieOptions(): CookieOptions {
  const config = getConfig();
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/'
  };
}
