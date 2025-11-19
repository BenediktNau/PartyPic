import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService], // WICHTIG: Damit das AuthModule ihn nutzen kann
})
export class UsersModule {}