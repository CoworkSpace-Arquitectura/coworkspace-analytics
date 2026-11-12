import type { SourceBooking, SourceCharge, SourceInvoice, SourceLocation, SourceSubscription } from './sources.client.js';

export interface OccupancyRow {
  locationId: string;
  locationName: string;
  day: string;
  bookings: number;
  bookedHours: number;
}

export interface RevenueRow {
  planName: string;
  month: string;
  currency: string;
  amount: number;
  transactions: number;
}

export interface RetentionRow {
  cohort: string;
  started: number;
  active: number;
  churned: number;
  retentionRate: number;
}

const HOUR_MS = 60 * 60 * 1000;
const round2 = (value: number) => Math.round(value * 100) / 100;
export const EXTRA_CHARGES_PLAN = 'Cargos adicionales';

// Horas reservadas por sede y por día (no cuenta reservas canceladas)
export function occupancyByLocation(bookings: SourceBooking[], locations: SourceLocation[]): OccupancyRow[] {
  const names = new Map(locations.map((location) => [location.id, location.name]));
  const rows = new Map<string, OccupancyRow>();

  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') {
      continue;
    }
    const day = booking.startTime.slice(0, 10);
    const key = `${booking.locationId}|${day}`;
    const hours = (Date.parse(booking.endTime) - Date.parse(booking.startTime)) / HOUR_MS;
    const row = rows.get(key) ?? {
      locationId: booking.locationId,
      locationName: names.get(booking.locationId) ?? 'Sede desconocida',
      day,
      bookings: 0,
      bookedHours: 0,
    };
    row.bookings += 1;
    row.bookedHours = round2(row.bookedHours + hours);
    rows.set(key, row);
  }
  return [...rows.values()];
}

// Ingresos por plan y por mes: facturas de membresía + cargos adicionales pagados
export function revenueByPlan(invoices: SourceInvoice[], charges: SourceCharge[]): RevenueRow[] {
  const rows = new Map<string, RevenueRow>();
  const add = (planName: string, month: string, currency: string, amount: number) => {
    const key = `${planName}|${month}|${currency}`;
    const row = rows.get(key) ?? { planName, month, currency, amount: 0, transactions: 0 };
    row.amount += amount;
    row.transactions += 1;
    rows.set(key, row);
  };

  for (const invoice of invoices) {
    add(invoice.planName, invoice.period.slice(0, 7), invoice.currency ?? 'COP', invoice.amount);
  }
  for (const charge of charges) {
    if (charge.status === 'PAID') {
      add(EXTRA_CHARGES_PLAN, charge.createdAt.slice(0, 7), charge.currency, charge.amount);
    }
  }
  return [...rows.values()];
}

// Retención por cohorte: de las suscripciones iniciadas cada mes, cuántas siguen activas
export function memberRetention(subscriptions: SourceSubscription[]): RetentionRow[] {
  const rows = new Map<string, RetentionRow>();

  for (const subscription of subscriptions) {
    const cohort = subscription.startedAt.slice(0, 7);
    const row = rows.get(cohort) ?? { cohort, started: 0, active: 0, churned: 0, retentionRate: 0 };
    row.started += 1;
    if (subscription.status === 'ACTIVE') {
      row.active += 1;
    } else {
      row.churned += 1;
    }
    row.retentionRate = Math.round((row.active / row.started) * 1000) / 10;
    rows.set(cohort, row);
  }
  return [...rows.values()];
}