// metrics.module.ts
import { Module, Global } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider } from '@willsoto/nestjs-prometheus';

// Define the metric name as a constant to avoid typos later
export const METRIC_APP_REQUEST_COUNT = 'app_request_count';

@Global() // Makes this module available everywhere without importing it specifically in every module
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true, // Enables standard CPU/Memory metrics
      },
    }),
  ],
  providers: [
    // Define your custom metrics here
    makeCounterProvider({
      name: METRIC_APP_REQUEST_COUNT,
      help: 'Total number of application requests',
      labelNames: ['method', 'status'],
    }),
  ],
  exports: [
    // Export the custom metric provider so other services can inject it
    METRIC_APP_REQUEST_COUNT, 
  ],
})
export class MetricsModule {}