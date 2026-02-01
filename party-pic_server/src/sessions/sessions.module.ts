import { Module, forwardRef } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsDbService } from './sessions.db.service';
import { AuthModule } from '../auth/auth.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => MetricsModule), 
  ],
  controllers: [SessionsController],
  providers: [SessionsDbService],
  exports: [SessionsDbService], 
})
export class SessionsModule {}