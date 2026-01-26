import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    // Custom Metrics für PartyPic
    makeGaugeProvider({
      name: 'partypic_active_sessions',
      help: 'Number of active photo sessions',
    }),
    makeGaugeProvider({
      name: 'partypic_users_online',
      help: 'Number of users currently online',
    }),
    makeCounterProvider({
      name: 'partypic_photos_uploaded_total',
      help: 'Total number of photos uploaded',
    }),
    makeCounterProvider({
      name: 'partypic_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    // Response Time / Latenz Metriken
    makeHistogramProvider({
      name: 'partypic_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeHistogramProvider({
      name: 'partypic_photo_upload_duration_seconds',
      help: 'Photo upload processing duration in seconds',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
