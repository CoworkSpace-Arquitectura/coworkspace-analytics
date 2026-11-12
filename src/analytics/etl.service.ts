import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { SourcesClient } from './sources.client.js';
import { memberRetention, occupancyByLocation, revenueByPlan } from './transform.js';

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sources: SourcesClient,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledRun() {
    if (this.running) {
      return;
    }
    await this.run('SCHEDULED');
  }

  async run(trigger: 'SCHEDULED' | 'MANUAL' = 'MANUAL') {
    if (this.running) {
      throw new ConflictException('Ya hay un ETL en ejecución');
    }
    this.running = true;
    const etlRun = await this.prisma.etlRun.create({ data: { trigger, status: 'RUNNING' } });

    try {
      // 1. Extraer (en paralelo)
      const [locations, bookings, subscriptions, invoices, charges] = await Promise.all([
        this.sources.locations(),
        this.sources.bookings(),
        this.sources.subscriptions(),
        this.sources.invoices(),
        this.sources.charges(),
      ]);

      // 2. Transformar
      const occupancy = occupancyByLocation(bookings, locations);
      const revenue = revenueByPlan(invoices, charges);
      const retention = memberRetention(subscriptions);

      // 3. Cargar: todo o nada
      await this.prisma.$transaction([
        this.prisma.occupancyByLocation.deleteMany(),
        this.prisma.occupancyByLocation.createMany({ data: occupancy }),
        this.prisma.revenueByPlan.deleteMany(),
        this.prisma.revenueByPlan.createMany({ data: revenue }),
        this.prisma.memberRetention.deleteMany(),
        this.prisma.memberRetention.createMany({ data: retention }),
      ]);

      const details = {
        bookings: bookings.length,
        subscriptions: subscriptions.length,
        invoices: invoices.length,
        charges: charges.length,
        occupancyRows: occupancy.length,
        revenueRows: revenue.length,
        retentionRows: retention.length,
      };
      this.logger.log(`ETL completado: ${JSON.stringify(details)}`);
      return await this.prisma.etlRun.update({
        where: { id: etlRun.id },
        data: { status: 'SUCCESS', finishedAt: new Date(), details },
      });
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`ETL fallido: ${message}`);
      return await this.prisma.etlRun.update({
        where: { id: etlRun.id },
        data: { status: 'FAILED', finishedAt: new Date(), error: message },
      });
    } finally {
      this.running = false;
    }
  }
}