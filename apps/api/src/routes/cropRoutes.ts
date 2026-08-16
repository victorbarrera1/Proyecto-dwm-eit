import { Router } from 'express';
import { parseInput } from '../errors.js';
import {
  cropCreateSchema,
  cropPatchSchema,
  cropsQuerySchema,
  idParamsSchema
} from '../schemas.js';
import * as cropService from '../services/cropService.js';

export const cropRouter = Router();

cropRouter.get('/', (request, response) => {
  const query = parseInput(cropsQuerySchema, request.query, 400);
  const result = cropService.listCrops(request.auth!.user.id, query);
  response.json({
    data: result.items,
    meta: { page: query.page, limit: query.limit, total: result.total }
  });
});

cropRouter.post('/', (request, response) => {
  const input = parseInput(cropCreateSchema, request.body);
  response.status(201).json({ data: cropService.createCrop(request.auth!.user.id, input) });
});

cropRouter.get('/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  response.json({ data: cropService.getCrop(request.auth!.user.id, id) });
});

cropRouter.patch('/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  const input = parseInput(cropPatchSchema, request.body);
  response.json({ data: cropService.updateCrop(request.auth!.user.id, id, input) });
});

cropRouter.delete('/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  cropService.deleteCrop(request.auth!.user.id, id);
  response.sendStatus(204);
});
