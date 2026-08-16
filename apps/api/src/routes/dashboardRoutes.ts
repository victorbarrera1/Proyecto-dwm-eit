import { Router } from 'express';
import { parseInput } from '../errors.js';
import { dashboardQuerySchema } from '../schemas.js';
import { getSummary } from '../services/dashboardService.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (request, response) => {
  const query = parseInput(dashboardQuerySchema, request.query, 400);
  response.json({ data: getSummary(request.auth!.user.id, query.from, query.to) });
});
