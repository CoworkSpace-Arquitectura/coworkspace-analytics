import { Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EtlService } from './etl.service.js';

@Controller()
export class AnalyticsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly etl: EtlService,
  ) {}

  @Get('metrics/occupancy')
  occupancy(@Query('locationId') locationId?: string) {
    return this.prisma.occupancyByLocation.findMany({
      where: { locationId },
      orderBy: [{ day: 'desc' }, { locationName: 'asc' }],
    });
  }

  @Get('metrics/revenue')
  revenue(@Query('month') month?: string) {
    return this.prisma.revenueByPlan.findMany({
      where: { month },
      orderBy: [{ month: 'desc' }, { amount: 'desc' }],
    });
  }

  @Get('metrics/retention')
  retention() {
    return this.prisma.memberRetention.findMany({ orderBy: { cohort: 'desc' } });
  }

  @Post('etl/run')
  runEtl() {
    return this.etl.run('MANUAL');
  }

  @Get('etl/runs')
  runs() {
    return this.prisma.etlRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 });
  }
}