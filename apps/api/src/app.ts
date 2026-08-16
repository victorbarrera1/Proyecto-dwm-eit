import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { getConfig } from './config.js';
import { databaseIsReady, initializeDatabase } from './db/database.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { originMiddleware, requestIdMiddleware } from './middleware/security.js';
import { adminRouter } from './routes/adminRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { cropRouter } from './routes/cropRoutes.js';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { greenhouseRouter } from './routes/greenhouseRoutes.js';
import { sensorRouter } from './routes/sensorRoutes.js';

export function createApp() {
  initializeDatabase();
  const config = getConfig();
  const app = express();

  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(originMiddleware);
  app.use(express.json({ limit: '100kb', type: ['application/json', 'application/*+json'] }));
  app.use(cookieParser());

  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/v1/health', (_request, response) => {
    const ready = databaseIsReady();
    response.status(ready ? 200 : 503).json({
      data: {
        status: ready ? 'ok' : 'unavailable',
        database: ready ? 'ready' : 'unavailable',
        timestamp: new Date().toISOString()
      }
    });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/greenhouse', requireAuth, greenhouseRouter);
  app.use('/api/v1/crops', requireAuth, cropRouter);
  app.use('/api/v1/sensors', requireAuth, sensorRouter);
  app.use('/api/v1/dashboard', requireAuth, dashboardRouter);
  app.use('/api/v1/admin', requireAuth, requireAdmin, adminRouter);

  configureStaticWeb(app, config.webDistPath);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function configureStaticWeb(app: ReturnType<typeof express>, webDistPath: string): void {
  const indexPath = path.join(webDistPath, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  app.use(express.static(webDistPath, { index: false, maxAge: '1h' }));
  app.use((request, response, next) => {
    if (
      request.method !== 'GET' ||
      request.path.startsWith('/api/') ||
      !request.accepts('html')
    ) {
      next();
      return;
    }
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(indexPath);
  });
}
