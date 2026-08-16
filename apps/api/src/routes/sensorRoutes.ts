import { Router } from 'express';
import { parseInput } from '../errors.js';
import {
  idParamsSchema,
  readingCreateSchema,
  readingsQuerySchema,
  sensorCreateSchema,
  sensorPatchSchema,
  sensorsQuerySchema
} from '../schemas.js';
import * as sensorService from '../services/sensorService.js';

export const sensorRouter = Router();

sensorRouter.get('/', (request, response) => {
  const query = parseInput(sensorsQuerySchema, request.query, 400);
  const result = sensorService.listSensors(request.auth!.user.id, query);
  response.json({
    data: result.items,
    meta: { page: query.page, limit: query.limit, total: result.total }
  });
});

sensorRouter.post('/', (request, response) => {
  const input = parseInput(sensorCreateSchema, request.body);
  response.status(201).json({ data: sensorService.createSensor(request.auth!.user.id, input) });
});

sensorRouter.post('/:id/readings', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  const input = parseInput(readingCreateSchema, request.body);
  response.status(201).json({ data: sensorService.addReading(request.auth!.user.id, id, input) });
});

sensorRouter.get('/:id/readings', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  const query = parseInput(readingsQuerySchema, request.query, 400);
  const result = sensorService.listReadings(request.auth!.user.id, id, query);
  response.json({
    data: result.items,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      period: result.period,
      sensor: result.sensor
    }
  });
});

sensorRouter.get('/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  response.json({ data: sensorService.getSensor(request.auth!.user.id, id) });
});

sensorRouter.patch('/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  const input = parseInput(sensorPatchSchema, request.body);
  response.json({ data: sensorService.updateSensor(request.auth!.user.id, id, input) });
});

sensorRouter.delete('/:id', (request, response) => {
  const { id } = parseInput(idParamsSchema, request.params, 400);
  sensorService.deleteSensor(request.auth!.user.id, id);
  response.sendStatus(204);
});
