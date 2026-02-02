import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsService } from './metrics/metrics.service';
import session from 'express-session';
import * as passport from 'passport';
import pgSession from 'connect-pg-simple';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS aktivieren (Credentials true ist wichtig für Cookies!)
  app.enableCors({
    origin: true, // Erlaubt alle Origins (für Dev ok) oder spezifische URL setzen
    credentials: true,
  });

  // 1. Datenbank-Pool aus dem AppModule holen
  // Wir nutzen den Pool, den wir im DatabaseModule definiert haben ('PG_POOL')
  const dbPool = app.get('PG_POOL');

  // 2. Session Store konfigurieren
  const PGStore = pgSession(session);

  app.use(
    session({
      store: new PGStore({
        pool: dbPool,
        tableName: 'auth_sessions', // WICHTIG: Hier verweisen wir auf die separate Auth-Tabelle
        createTableIfMissing: false, // Haben wir bereits im DatabaseInitService erledigt
      }),
      secret: process.env.SESSION_SECRET || 'my-very-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Tage
        httpOnly: true,
        // secure: true, // Aktivieren, sobald HTTPS/SSL aktiv ist (in Prod empfohlen)
        sameSite: 'lax', // Hilft bei CORS-Problemen
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