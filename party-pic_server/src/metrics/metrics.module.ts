import { Module, Global } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsProvidersModule } from './metrics-providers.module';

export const METRIC_APP_REQUEST_COUNT = 'app_request_count';
export const METRIC_ACTIVE_SESSIONS = 'partypic_active_sessions_current';
export const METRIC_SESSIONS_TOTAL = 'partypic_sessions_created_total';
export const METRIC_PHOTOS_UPLOADED = 'partypic_photos_uploaded_total';
export const METRIC_HTTP_DURATION = 'partypic_http_request_duration_seconds';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
    MetricsProvidersModule,  
  ],
  providers: [
    MetricsService,  
  ],
  exports: [
    MetricsService,
    MetricsProvidersModule,  
  ],
})
export class MetricsModule {}