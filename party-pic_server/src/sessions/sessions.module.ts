import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsDbService } from './sessions.db.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsDbService],
  exports: [SessionsDbService], 
})
export class SessionsModule {}