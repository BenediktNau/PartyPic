import { Module, Global, forwardRef } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { SessionsModule } from '../sessions/sessions.module';

export const METRIC_APP_REQUEST_COUNT = 'app_request_count';
export const METRIC_ACTIVE_SESSIONS = 'partypic_active_sessions_current';
export const METRIC_SESSIONS_TOTAL = 'partypic_sessions_created_total';
export const METRIC_PHOTOS_UPLOADED = 'partypic_photos_uploaded_total';
export const METRIC_HTTP_DURATION = 'partypic_http_request_duration_seconds';

@Global()
@Module({
  imports: [
    forwardRef(() => SessionsModule),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
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
    MetricsService,
  ],
})
export class MetricsModule {}