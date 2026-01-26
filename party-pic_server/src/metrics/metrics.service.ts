import { Injectable } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  public readonly registry: Registry;
  public readonly activeClientsGauge: Gauge;
  public readonly totalSessionsCounter: Counter;
  public readonly uploadedPhotosCounter: Counter;
  public readonly httpRequestDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.activeClientsGauge = new Gauge({
      name: 'partypic_active_clients',
      help: 'Anzahl aktiver Clients/Sessions',
      registers: [this.registry],
    });

    this.totalSessionsCounter = new Counter({
      name: 'partypic_total_sessions',
      help: 'Anzahl aller erstellten Sessions',
      registers: [this.registry],
    });

    this.uploadedPhotosCounter = new Counter({
      name: 'partypic_uploaded_photos',
      help: 'Anzahl aller hochgeladenen Fotos',
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP-Request Dauer in Sekunden',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }
}
