import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PicturesController } from './pictures/pictures.controller';
import { PicturesDbService } from './pictures/pictures.db.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from './s3Controller/s3.module';
import { Pool } from 'pg';
import { SessionsController } from './sessions/sessions.controller';

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
  controllers: [AppController, PicturesController, SessionsController],
  providers: [
    AppService,
    PicturesDbService,

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