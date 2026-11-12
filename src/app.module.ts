import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}