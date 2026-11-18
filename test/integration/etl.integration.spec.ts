import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/setup-app.js';
import { SourcesClient } from '../../src/analytics/sources.client.js';

/**
 * Integración del ETL con PostgreSQL real: extrae (de dobles de los otros servicios),
 * transforma, carga las métricas en la base y las expone por la API.
 */
describe('ETL de analítica (integración con la base de datos)', () => {
  let app: INestApplication;
  const locationId = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SourcesClient)
      .useValue({
        locations: () => Promise.resolve([{ id: locationId, name: 'Sede de prueba', city: 'Montería' }]),
        bookings: () =>
          Promise.resolve([
            { locationId, startTime: '2026-11-20T14:00:00.000Z', endTime: '2026-11-20T16:00:00.000Z', status: 'CONFIRMED' },
            { locationId, startTime: '2026-11-20T17:00:00.000Z', endTime: '2026-11-20T18:00:00.000Z', status: 'CANCELLED' },
          ]),
        subscriptions: () => Promise.resolve([{ memberId: randomUUID(), status: 'ACTIVE', startedAt: '2026-11-01T00:00:00.000Z', plan: { name: 'Flex' } }]),
        invoices: () => Promise.resolve([{ planName: 'Flex', period: '2026-11', amount: 250000, currency: 'COP' }]),
        charges: () => Promise.resolve([]),
      })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('ejecuta el ETL y deja las métricas consultables', async () => {
    const run = await request(app.getHttpServer()).post('/etl/run').expect(201);
    expect(run.body.status).toBe('SUCCESS');

    const occupancy = await request(app.getHttpServer()).get(`/metrics/occupancy?locationId=${locationId}`).expect(200);
    expect(occupancy.body).toHaveLength(1);
    expect(occupancy.body[0]).toMatchObject({ locationName: 'Sede de prueba', bookings: 1, bookedHours: 2 });

    const revenue = await request(app.getHttpServer()).get('/metrics/revenue?month=2026-11').expect(200);
    expect(revenue.body[0]).toMatchObject({ planName: 'Flex', amount: 250000 });
  });

  it('registra la ejecución en el historial', async () => {
    const runs = await request(app.getHttpServer()).get('/etl/runs').expect(200);
    expect(runs.body[0]).toMatchObject({ trigger: 'MANUAL', status: 'SUCCESS' });
  });

  it('publica la documentación de la API (OpenAPI)', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.openapi).toBeDefined();
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);
  });
});
