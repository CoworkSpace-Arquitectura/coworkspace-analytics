import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';
import { EtlService } from './etl.service.js';
import { SourcesClient } from './sources.client.js';

@Module({
  controllers: [AnalyticsController],
  providers: [EtlService, SourcesClient],
})
export class AnalyticsModule {}