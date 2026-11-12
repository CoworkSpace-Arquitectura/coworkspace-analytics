import { describe, expect, it, vi } from 'vitest';
import { EXTRA_CHARGES_PLAN, memberRetention, occupancyByLocation, revenueByPlan } from './transform.js';
import { EtlService } from './etl.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SourcesClient } from './sources.client.js';

describe('occupancyByLocation', () => {
  const locations = [{ id: 'loc-1', name: 'Sede Centro', city: 'Montería' }];

  it('suma reservas y horas por sede y día, sin contar las canceladas', () => {
    const rows = occupancyByLocation(
      [
        { locationId: 'loc-1', startTime: '2026-12-01T14:00:00.000Z', endTime: '2026-12-01T16:00:00.000Z', status: 'CONFIRMED' },
        { locationId: 'loc-1', startTime: '2026-12-01T17:00:00.000Z', endTime: '2026-12-01T17:30:00.000Z', status: 'PENDING_PAYMENT' },
        { locationId: 'loc-1', startTime: '2026-12-01T18:00:00.000Z', endTime: '2026-12-01T20:00:00.000Z', status: 'CANCELLED' },
      ],
      locations,
    );

    expect(rows).toEqual([
      { locationId: 'loc-1', locationName: 'Sede Centro', day: '2026-12-01', bookings: 2, bookedHours: 2.5 },
    ]);
  });
});

describe('revenueByPlan', () => {
  it('agrupa facturas por plan y mes, y suma solo los cargos pagados', () => {
    const rows = revenueByPlan(
      [
        { planName: 'Flexible', period: '2026-12-10', amount: 250000 },
        { planName: 'Flexible', period: '2026-12-20', amount: 250000 },
      ],
      [
        { amount: 60000, currency: 'COP', status: 'PAID', createdAt: '2026-11-12T00:00:00.000Z' },
        { amount: 700, currency: 'MXN', status: 'FAILED', createdAt: '2026-11-12T00:00:00.000Z' },
      ],
    );

    expect(rows).toContainEqual({ planName: 'Flexible', month: '2026-12', currency: 'COP', amount: 500000, transactions: 2 });
    expect(rows).toContainEqual({ planName: EXTRA_CHARGES_PLAN, month: '2026-11', currency: 'COP', amount: 60000, transactions: 1 });
    expect(rows).toHaveLength(2);
  });
});

describe('memberRetention', () => {
  it('calcula la retención de cada cohorte', () => {
    const plan = { name: 'Flexible' };
    const rows = memberRetention([
      { memberId: 'm1', status: 'ACTIVE', startedAt: '2026-11-01T00:00:00.000Z', plan },
      { memberId: 'm2', status: 'ACTIVE', startedAt: '2026-11-05T00:00:00.000Z', plan },
      { memberId: 'm3', status: 'CANCELLED', startedAt: '2026-11-08T00:00:00.000Z', plan },
      { memberId: 'm4', status: 'EXPIRED', startedAt: '2026-11-09T00:00:00.000Z', plan },
    ]);

    expect(rows).toEqual([{ cohort: '2026-11', started: 4, active: 2, churned: 2, retentionRate: 50 }]);
  });
});

describe('EtlService', () => {
  it('si una fuente falla, marca el ETL como FAILED y no toca las métricas', async () => {
    const prisma = {
      etlRun: {
        create: vi.fn().mockResolvedValue({ id: 'run-1' }),
        update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'run-1', ...data })),
      },
      $transaction: vi.fn(),
    };
    const sources = {
      locations: vi.fn().mockResolvedValue([]),
      bookings: vi.fn().mockResolvedValue([]),
      subscriptions: vi.fn().mockResolvedValue([]),
      invoices: vi.fn().mockRejectedValue(new Error('http://localhost:3005/invoices no respondió')),
      charges: vi.fn().mockResolvedValue([]),
    };
    const service = new EtlService(prisma as unknown as PrismaService, sources as unknown as SourcesClient);

    const run = await service.run('MANUAL');

    expect(run.status).toBe('FAILED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});