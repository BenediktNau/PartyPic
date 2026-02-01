import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsDbService } from './sessions.db.service';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../s3/s3.module';
import { UsersModule } from '../users/user.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    UsersModule,
    MetricsModule,  
  ],
  controllers: [SessionsController],
  providers: [SessionsDbService],
  exports: [SessionsDbService],
})
export class SessionsModule {}