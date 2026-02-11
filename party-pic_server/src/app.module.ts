import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // Für CronJobs
import { StorageModule } from './s3/s3.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/user.module';
import { SessionsModule } from './sessions/sessions.module';
import { MetricsModule } from './metrics/metrics.module';
import { PicturesController } from './pictures/pictures.controller';
import { PicturesDbService } from './pictures/pictures.db.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.dev'
    }),
    ScheduleModule.forRoot(), 
    DatabaseModule,
    StorageModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    MetricsModule,
  ],
  controllers: [AppController, PicturesController],
  providers: [AppService, PicturesDbService],
})
export class AppModule {}