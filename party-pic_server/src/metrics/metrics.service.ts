import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';
import { SessionsDbService } from '../sessions/sessions.db.service';

@Injectable()
export class MetricsService {
  public readonly registry: Registry;
  public readonly activeClientsGauge: Gauge;
  public readonly totalSessionsCounter: Counter;
  public readonly uploadedPhotosCounter: Counter;
  public readonly httpRequestDuration: Histogram;

  constructor(
    // Wir injizieren den Service, um die DB abfragen zu können
    @Inject(forwardRef(() => SessionsDbService))
    private readonly sessionsDbService: SessionsDbService
  ) {
    this.registry = new Registry();
    // Default Node.js Metriken (CPU, RAM, GC)
    collectDefaultMetrics({ register: this.registry });

    this.activeClientsGauge = new Gauge({
      name: 'partypic_active_sessions_current',
      help: 'Aktuelle Anzahl aktiver Sessions in der DB (via CronJob)',
      registers: [this.registry],
    });

    this.totalSessionsCounter = new Counter({
      name: 'partypic_sessions_created_total',
      help: 'Anzahl aller jemals erstellten Sessions',
      registers: [this.registry],
    });

    this.uploadedPhotosCounter = new Counter({
      name: 'partypic_photos_uploaded_total',
      help: 'Anzahl aller hochgeladenen Fotos',
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'partypic_http_request_duration_seconds',
      help: 'Dauer der HTTP Requests',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
      registers: [this.registry],
    });
  }

  // Dieser Job läuft alle 10 Sekunden automatisch
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    try {
      const count = await this.sessionsDbService.countAllSessions();
      this.activeClientsGauge.set(count);
    } catch (error) {
      console.error('Metrics CronJob Error:', error);
    }
  }
}