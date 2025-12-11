import { ConsoleLogger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PicturesController } from './pictures/pictures.controller';
import { PicturesDbService } from './pictures/pictures.db.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from './s3/s3.module';
import { Pool } from 'pg';
import { SessionsController } from './sessions/sessions.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SessionsDbService } from './sessions/sessions.db.service';
import { AuthModule } from './auth/auth.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    // 3. Lade .env-Variablen global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.dev'
    }),

    // 4. Importiere das StorageModule.
    //    Es stellt S3Client bereit UND exportiert StorageService.
    StorageModule,
  ],
  controllers: [AppController, PicturesController, SessionsController, AuthController],
  providers: [
    AppService,
    AuthModule,
    PicturesDbService,
    SessionsDbService,
    AuthService,
    UsersService,
    JwtStrategy,
    JwtService,

    // 5. Stelle den DB-Pool für AppService und PicturesDbService bereit
    {
      provide: 'PG_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        });
      },
    }
  ],
})
export class AppModule { }