import { Injectable } from '@nestjs/common';
import { Gauge, Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { 
  METRIC_ACTIVE_SESSIONS, 
  METRIC_SESSIONS_TOTAL, 
  METRIC_PHOTOS_UPLOADED, 
  METRIC_HTTP_DURATION 
} from './metrics.constants'; 

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric(METRIC_ACTIVE_SESSIONS) public readonly activeClientsGauge: Gauge<string>,
    @InjectMetric(METRIC_SESSIONS_TOTAL) public readonly totalSessionsCounter: Counter<string>,
    @InjectMetric(METRIC_PHOTOS_UPLOADED) public readonly uploadedPhotosCounter: Counter<string>,
    @InjectMetric(METRIC_HTTP_DURATION) public readonly httpRequestDuration: Histogram<string>,
  ) {}

  setActiveSessions(count: number) {
    this.activeClientsGauge.set(count);
  }

  incrementTotalSessions() {
    this.totalSessionsCounter.inc();
  }
}