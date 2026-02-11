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
          // Connection Pool Settings (Prod)
          max: 20,                      // Max 20 Connections pro Pod
          min: 2,                       // Min 2 warm halten
          idleTimeoutMillis: 30000,     // Idle nach 30s schließen
          connectionTimeoutMillis: 5000, // Max 5s warten
          ssl: {
            // Für Prod ist SSL notwendig 
            rejectUnauthorized: false,
          },
        }) : new Pool({
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          user: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          // Dev: Weniger Connections
          max: 10,
          min: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        })
        return pool;
      },
    },
    DatabaseInitService, 
  ],
  exports: ['PG_POOL', DatabaseInitService], 
})
export class DatabaseModule {}