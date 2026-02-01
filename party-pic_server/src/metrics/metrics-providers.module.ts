import { Module } from '@nestjs/common';
import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { 
  METRIC_APP_REQUEST_COUNT, 
  METRIC_ACTIVE_SESSIONS, 
  METRIC_SESSIONS_TOTAL, 
  METRIC_PHOTOS_UPLOADED, 
  METRIC_HTTP_DURATION 
} from './metrics.module';

@Module({
  providers: [
    makeCounterProvider({
      name: METRIC_APP_REQUEST_COUNT,
      help: 'Total number of application requests',
      labelNames: ['method', 'status'],
    }),
    makeGaugeProvider({
      name: METRIC_ACTIVE_SESSIONS,
      help: 'Aktuelle Anzahl aktiver Sessions in der DB (via CronJob)',
    }),
    makeCounterProvider({
      name: METRIC_SESSIONS_TOTAL,
      help: 'Anzahl aller jemals erstellten Sessions',
    }),
    makeCounterProvider({
      name: METRIC_PHOTOS_UPLOADED,
      help: 'Anzahl aller hochgeladenen Fotos',
    }),
    makeHistogramProvider({
      name: METRIC_HTTP_DURATION,
      help: 'Dauer der HTTP Requests',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5],
    }),
  ],
  exports: [
    // Exportiere die Metriken, damit sie in anderen Modulen injiziert werden können
    METRIC_APP_REQUEST_COUNT,
    METRIC_ACTIVE_SESSIONS,
    METRIC_SESSIONS_TOTAL,
    METRIC_PHOTOS_UPLOADED,
    METRIC_HTTP_DURATION,
  ],
})
export class MetricsProvidersModule {}