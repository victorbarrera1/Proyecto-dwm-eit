import request, { type SuperAgentTest } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closeDatabase } from '../src/db/database.js';
import { DEMO_IDS, seedDatabase } from '../src/db/seed.js';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.APP_ORIGIN = 'http://localhost:5173';

let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  closeDatabase();
  await seedDatabase();
  app = createApp();
});

afterAll(() => {
  closeDatabase();
});

async function login(email: string, password = 'Usuario123!'): Promise<SuperAgentTest> {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
  return agent;
}

describe('API del invernadero', () => {
  it('expone health y mantiene una sesión opaca revocable', async () => {
    await request(app)
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.status).toBe('ok');
      });

    const agent = request.agent(app);
    await agent.get('/api/v1/auth/me').expect(401);
    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'camila@invernadero.local', password: 'Usuario123!' })
      .expect(200);
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(loginResponse.body.data.user.email).toBe('camila@invernadero.local');

    await agent.get('/api/v1/auth/me').expect(200);
    await agent.post('/api/v1/auth/logout').expect(204);
    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('crea un invernadero al registrarse y no permite elegir rol o propietario', async () => {
    const agent = request.agent(app);
    const response = await agent
      .post('/api/v1/auth/register')
      .send({
        name: 'Elena Campos',
        email: 'elena@example.com',
        password: 'Segura123!',
        role: 'ADMIN'
      })
      .expect(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const registered = await agent
      .post('/api/v1/auth/register')
      .send({ name: 'Elena Campos', email: 'elena@example.com', password: 'Segura123!' })
      .expect(201);
    expect(registered.body.data.user.role).toBe('USER');
    expect(registered.body.data.greenhouse.name).toContain('Elena Campos');
    await agent.get('/api/v1/greenhouse').expect(200);
  });

  it('realiza CRUD de cultivos y aplica el filtro en el backend', async () => {
    const agent = await login('camila@invernadero.local');
    const created = await agent
      .post('/api/v1/crops')
      .send({
        name: 'Frutillas de prueba',
        species: 'Fragaria',
        variety: 'Albión',
        status: 'PLANNED',
        plantedAt: '2026-08-10',
        expectedHarvestAt: '2026-11-10'
      })
      .expect(201);
    const cropId = created.body.data.id as string;

    const filtered = await agent
      .get('/api/v1/crops')
      .query({ q: 'frutillas', status: 'PLANNED' })
      .expect(200);
    expect(filtered.body.data.map((crop: { id: string }) => crop.id)).toContain(cropId);
    expect(filtered.body.meta.total).toBeGreaterThanOrEqual(1);

    const updated = await agent
      .patch(`/api/v1/crops/${cropId}`)
      .send({ status: 'ACTIVE', notes: 'Trasplantado' })
      .expect(200);
    expect(updated.body.data.status).toBe('ACTIVE');

    await agent.delete(`/api/v1/crops/${cropId}`).expect(204);
    await agent.get(`/api/v1/crops/${cropId}`).expect(404);
  });

  it('impide leer, modificar, borrar o consultar registros de otro usuario', async () => {
    const camila = await login('camila@invernadero.local');
    const diego = await login('diego@invernadero.local');
    const created = await camila
      .post('/api/v1/sensors')
      .send({
        code: 'AISLAMIENTO-1',
        name: 'Sensor privado',
        type: 'TEMPERATURE',
        active: true
      })
      .expect(201);
    const sensorId = created.body.data.id as string;

    await camila
      .post(`/api/v1/sensors/${sensorId}/readings`)
      .send({ value: 22.5, recordedAt: new Date(Date.now() - 60_000).toISOString() })
      .expect(201);

    await diego.get(`/api/v1/sensors/${sensorId}`).expect(404);
    await diego.patch(`/api/v1/sensors/${sensorId}`).send({ name: 'Intrusión' }).expect(404);
    await diego.get(`/api/v1/sensors/${sensorId}/readings`).expect(404);
    await diego
      .post(`/api/v1/sensors/${sensorId}/readings`)
      .send({ value: 20 })
      .expect(404);
    await diego.delete(`/api/v1/sensors/${sensorId}`).expect(404);

    await camila.get(`/api/v1/sensors/${sensorId}`).expect(200);
  });

  it('filtra lecturas por período y entrega resumen para gráficos', async () => {
    const agent = await login('camila@invernadero.local');
    const created = await agent
      .post('/api/v1/sensors')
      .send({ code: 'PERIODO-1', name: 'Sensor de período', type: 'SOIL_MOISTURE' })
      .expect(201);
    const sensorId = created.body.data.id as string;
    const oldTime = new Date(Date.now() - 48 * 3_600_000).toISOString();
    const recentTime = new Date(Date.now() - 60 * 60_000).toISOString();
    await agent
      .post(`/api/v1/sensors/${sensorId}/readings`)
      .send({ value: 45, recordedAt: oldTime })
      .expect(201);
    await agent
      .post(`/api/v1/sensors/${sensorId}/readings`)
      .send({ value: 55, recordedAt: recentTime })
      .expect(201);

    const from = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const to = new Date().toISOString();
    const readings = await agent
      .get(`/api/v1/sensors/${sensorId}/readings`)
      .query({ from, to })
      .expect(200);
    expect(readings.body.meta.total).toBe(1);
    expect(readings.body.data[0].value).toBe(55);

    const summary = await agent
      .get('/api/v1/dashboard/summary')
      .query({ from, to })
      .expect(200);
    expect(summary.body.data.counts.sensorsTotal).toBeGreaterThanOrEqual(1);
    expect(summary.body.data.period.from).toBe(from);
  });

  it('restringe administración y elimina en cascada una cuenta ajena', async () => {
    const normal = await login('camila@invernadero.local');
    await normal.get('/api/v1/admin/stats').expect(403);

    const admin = await login('admin@invernadero.local', 'Admin123!');
    const stats = await admin.get('/api/v1/admin/stats').expect(200);
    expect(stats.body.data.users).toBeGreaterThanOrEqual(3);

    const detail = await admin.get(`/api/v1/admin/users/${DEMO_IDS.userTwo}`).expect(200);
    expect(detail.body.data.user.email).toBe('diego@invernadero.local');
    const resources = await admin
      .get(`/api/v1/admin/users/${DEMO_IDS.userTwo}/resources`)
      .query({ type: 'sensors' })
      .expect(200);
    expect(resources.body.meta.total).toBeGreaterThan(0);

    await admin.delete(`/api/v1/admin/users/${DEMO_IDS.userTwo}`).expect(204);
    await admin.get(`/api/v1/admin/users/${DEMO_IDS.userTwo}`).expect(404);
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'diego@invernadero.local', password: 'Usuario123!' })
      .expect(401);
  });
});
