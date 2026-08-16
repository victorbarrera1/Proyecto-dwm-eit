import { Router } from 'express';
import { parseInput } from '../errors.js';
import {
  adminResourcesQuerySchema,
  adminUsersQuerySchema,
  idParamsSchema
} from '../schemas.js';
import * as adminService from '../services/adminService.js';

export const adminRouter = Router();

adminRouter.get('/users', (request, response) => {
  const query = parseInput(adminUsersQuerySchema, request.query, 400);
  const result = adminService.listUsers(query);
  response.json({
    data: result.items,
    meta: { page: query.page, limit: query.limit, total: result.total }
  });
});

adminRouter.get('/users/:id/resources', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  const query = parseInput(adminResourcesQuerySchema, request.query, 400);
  const result = adminService.getUserResources(id, query);
  response.json({
    data: result.items,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      type: query.type,
      ...('period' in result ? { period: result.period } : {})
    }
  });
});

adminRouter.get('/users/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  response.json({ data: adminService.getUser(id) });
});

adminRouter.delete('/users/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  adminService.removeUser(request.auth!.user.id, id);
  response.sendStatus(204);
});

adminRouter.get('/stats', (_request, response) => {
  response.json({ data: adminService.getStats() });
});
