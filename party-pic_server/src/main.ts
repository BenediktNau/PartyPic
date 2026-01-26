import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // HTTP-Request-Metriken Middleware
  const metricsService = app.get(MetricsService);
  app.use((req, res, next) => {
    const end = metricsService.httpRequestDuration.startTimer({
      method: req.method,
      route: req.route ? req.route.path : req.path,
    });
    res.on('finish', () => {
      end({ status_code: res.statusCode });
    });
    next();
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
