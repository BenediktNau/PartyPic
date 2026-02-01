import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Gauge, Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { SessionsDbService } from '../sessions/sessions.db.service';
import { 
  METRIC_ACTIVE_SESSIONS, 
  METRIC_SESSIONS_TOTAL, 
  METRIC_PHOTOS_UPLOADED, 
  METRIC_HTTP_DURATION 
} from './metrics.module';

@Injectable()
export class MetricsService implements OnModuleInit {
  private sessionsDbService: SessionsDbService;

  constructor(
    private moduleRef: ModuleRef,

    @InjectMetric(METRIC_ACTIVE_SESSIONS) public readonly activeClientsGauge: Gauge<string>,
    @InjectMetric(METRIC_SESSIONS_TOTAL) public readonly totalSessionsCounter: Counter<string>,
    @InjectMetric(METRIC_PHOTOS_UPLOADED) public readonly uploadedPhotosCounter: Counter<string>,
    @InjectMetric(METRIC_HTTP_DURATION) public readonly httpRequestDuration: Histogram<string>,
  ) {}

  onModuleInit() {
    try {
      this.sessionsDbService = this.moduleRef.get(SessionsDbService, { strict: false });
    } catch (error) {
      console.error('MetricsService: Could not resolve SessionsDbService', error);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    if (!this.sessionsDbService) return;
    
    try {
      const count = await this.sessionsDbService.countAllSessions();
      this.activeClientsGauge.set(count);
    } catch (error) {
      console.error('Metrics CronJob Error:', error);
    }
  }
}