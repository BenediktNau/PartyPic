import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { DatabaseInitService } from './database-init.service'; 

@Global()
@Module({
  providers: [
    {


      provide: 'PG_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const pool = configService.get<string>('NODE_ENV') !== 'development' ? 
         new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          ssl: {
            rejectUnauthorized: true,
          },
        }) : new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
        })
        return pool;
      },
    },
    DatabaseInitService, 
  ],
  exports: ['PG_POOL', DatabaseInitService], 
})
export class DatabaseModule {}