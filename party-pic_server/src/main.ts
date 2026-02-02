import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsService } from './metrics/metrics.service';
import session from 'express-session';
import * as passport from 'passport';
import pgSession from 'connect-pg-simple';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, 
    credentials: true,
  });

  // 1. Datenbank-Pool aus dem AppModule holen
  const dbPool = app.get('PG_POOL');

  // 2. Session Store konfigurieren
  const PGStore = pgSession(session);

  app.use(
    session({
      store: new PGStore({
        pool: dbPool,
        tableName: 'auth_sessions', 
        createTableIfMissing: false, 
      }),
      secret: process.env.SESSION_SECRET || 'my-very-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, 
        httpOnly: true,
        sameSite: 'lax', 
      },
    }),
  );

  // 3. Passport initialisieren
  app.use(passport.initialize());
  app.use(passport.session());

  // 4. HTTP-Request-Metriken Middleware (Ihr bestehender Code)
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