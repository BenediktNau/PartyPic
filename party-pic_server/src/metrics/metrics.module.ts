import { Module, Global } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsProvidersModule } from './metrics-providers.module';

export * from './metrics.constants';

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