import { Injectable } from '@nestjs/common';
import { Gauge, Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { 
  METRIC_HTTP_REQUESTS_TOTAL,
  METRIC_ACTIVE_SESSIONS, 
  METRIC_USERS_ONLINE,
  METRIC_SESSIONS_TOTAL,
  METRIC_PHOTOS_TOTAL, 
  METRIC_HTTP_DURATION 
} from './metrics.constants'; 

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric(METRIC_HTTP_REQUESTS_TOTAL) public readonly httpRequestsTotal: Counter<string>,
    @InjectMetric(METRIC_ACTIVE_SESSIONS) public readonly activeSessionsGauge: Gauge<string>,
    @InjectMetric(METRIC_USERS_ONLINE) public readonly usersOnlineGauge: Gauge<string>,
    @InjectMetric(METRIC_SESSIONS_TOTAL) public readonly totalSessionsCounter: Counter<string>,
    @InjectMetric(METRIC_PHOTOS_TOTAL) public readonly totalPhotosGauge: Gauge<string>,
    @InjectMetric(METRIC_HTTP_DURATION) public readonly httpRequestDuration: Histogram<string>,
  ) {}

  // HTTP Request zählen (wird von Middleware aufgerufen)
  incrementHttpRequests(method: string, route: string, status: number) {
    this.httpRequestsTotal.inc({ method, route, status: status.toString() });
  }

  // Aktive Sessions setzen (wird von CronJob aufgerufen)
  setActiveSessions(count: number) {
    this.activeSessionsGauge.set(count);
  }

  // Online User setzen (wird von CronJob aufgerufen)
  setUsersOnline(count: number) {
    this.usersOnlineGauge.set(count);
  }

  // Session erstellt Counter erhöhen
  incrementTotalSessions() {
    this.totalSessionsCounter.inc();
  }

  // Gesamtanzahl Fotos aus DB setzen (wird von CronJob aufgerufen)
  setTotalPhotos(count: number) {
    this.totalPhotosGauge.set(count);
  }
}