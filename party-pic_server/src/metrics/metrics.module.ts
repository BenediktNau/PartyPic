import { Module, Global } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { 
  METRIC_HTTP_REQUESTS_TOTAL,
  METRIC_ACTIVE_SESSIONS, 
  METRIC_USERS_ONLINE,
  METRIC_SESSIONS_TOTAL, 
  METRIC_PHOTOS_UPLOADED, 
  METRIC_HTTP_DURATION 
} from './metrics.constants';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    MetricsCollectorService,
    // Counter für HTTP Requests (für Dashboard-Queries mit status Label)
    makeCounterProvider({
      name: METRIC_HTTP_REQUESTS_TOTAL,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    }),
    // Gauge für aktuell aktive Sessions
    makeGaugeProvider({
      name: METRIC_ACTIVE_SESSIONS,
      help: 'Aktuelle Anzahl aktiver Sessions in der DB (via CronJob)',
    }),
    // Gauge für aktuell online User
    makeGaugeProvider({
      name: METRIC_USERS_ONLINE,
      help: 'Aktuelle Anzahl online User (via CronJob)',
    }),
    // Counter für alle erstellten Sessions
    makeCounterProvider({
      name: METRIC_SESSIONS_TOTAL,
      help: 'Anzahl aller jemals erstellten Sessions',
    }),
    // Counter für alle hochgeladenen Fotos
    makeCounterProvider({
      name: METRIC_PHOTOS_UPLOADED,
      help: 'Anzahl aller hochgeladenen Fotos',
    }),
    // Histogram für HTTP Request Dauer
    makeHistogramProvider({
      name: METRIC_HTTP_DURATION,
      help: 'Dauer der HTTP Requests',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
  ],
  exports: [
    MetricsService,
  ],
})
export class MetricsModule {}