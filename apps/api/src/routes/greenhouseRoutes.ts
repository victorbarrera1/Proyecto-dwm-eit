import { Router } from 'express';
import { parseInput } from '../errors.js';
import { greenhousePatchSchema } from '../schemas.js';
import * as greenhouseService from '../services/greenhouseService.js';

export const greenhouseRouter = Router();

greenhouseRouter.get('/', (request, response) => {
  response.json({ data: greenhouseService.getGreenhouse(request.auth!.user.id) });
});

greenhouseRouter.patch('/', (request, response) => {
  const input = parseInput(greenhousePatchSchema, request.body);
  response.json({ data: greenhouseService.updateGreenhouse(request.auth!.user.id, input) });
});
