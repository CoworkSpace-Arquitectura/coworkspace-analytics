import { Injectable } from '@nestjs/common';

export interface SourceLocation {
  id: string;
  name: string;
  city: string;
}

export interface SourceBooking {
  locationId: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface SourceSubscription {
  memberId: string;
  status: string;
  startedAt: string;
  plan: { name: string };
}

export interface SourceInvoice {
  planName: string;
  period: string;
  amount: number;
  currency?: string;
}

export interface SourceCharge {
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const base = (name: string, fallback: string) => (process.env[name] ?? fallback).replace(/\/$/, '');

@Injectable()
export class SourcesClient {
  private readonly urls = {
    space: base('SPACE_URL', 'http://localhost:3001'),
    membership: base('MEMBERSHIP_URL', 'http://localhost:3002'),
    booking: base('BOOKING_URL', 'http://localhost:3004'),
    billing: base('BILLING_URL', 'http://localhost:3005'),
  };

  locations() {
    return this.get<SourceLocation[]>(`${this.urls.space}/locations`);
  }

  bookings() {
       return this.get<SourceBooking[]>(`${this.urls.booking}/internal/bookings`);
  }

  subscriptions() {
    return this.get<SourceSubscription[]>(`${this.urls.membership}/subscriptions`);
  }

  invoices() {
    return this.get<SourceInvoice[]>(`${this.urls.billing}/invoices`);
  }

  charges() {
    return this.get<SourceCharge[]>(`${this.urls.billing}/charges`);
  }

  private async get<T>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    } catch (error) {
      throw new Error(`${url} no respondió: ${(error as Error).message}`);
    }
    if (!response.ok) {
      throw new Error(`${url} respondió con estado ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
