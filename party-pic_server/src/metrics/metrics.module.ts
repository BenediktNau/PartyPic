// metrics.module.ts
import { Module, Global, forwardRef } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { SessionsModule } from '../sessions/sessions.module';

// Define the metric name as a constant to avoid typos later
export const METRIC_APP_REQUEST_COUNT = 'app_request_count';

@Global() // Makes this module available everywhere without importing it specifically in every module
@Module({
  imports: [
    forwardRef(() => SessionsModule),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true, // Enables standard CPU/Memory metrics
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    makeCounterProvider({
      name: METRIC_APP_REQUEST_COUNT,
      help: 'Total number of application requests',
      labelNames: ['method', 'status'],
    }),
  ],
  exports: [
    MetricsService,
    METRIC_APP_REQUEST_COUNT, 
  ],
})
export class MetricsModule {}