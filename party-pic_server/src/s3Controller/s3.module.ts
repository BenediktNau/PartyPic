import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './s3.service';

@Module({
  imports: [ConfigModule], // Stellt sicher, dass ConfigService verfügbar ist
  providers: [
    {
      provide: S3Client, // Wir stellen den S3Client bereit
      inject: [ConfigService],
      useFactory: (configService: ConfigService): S3Client => {
        
        const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
        
        if (isDevelopment) {
          // Konfiguration für MinIO (Lokal)
          console.log("DEVS3")
          return new S3Client({
            region: configService.getOrThrow<string>('S3_REGION'),
            endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
            credentials: {
              accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY'),
              secretAccessKey: configService.getOrThrow<string>('S3_SECRET_KEY'),
            },
            forcePathStyle: configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
          });
        } else {
          // Konfiguration für AWS S3 (Produktion)
          // Auf ECS/AWS werden Credentials automatisch über die IAM-Rolle bezogen
          console.log("PRODS3")
          return new S3Client({
            
            region: configService.getOrThrow<string>('S3_REGION'),
          });
        }
      },
    },
    StorageService, // Wir erstellen gleich den Service
  ],
  exports: [StorageService], // Damit andere Module den Service nutzen können
})
export class StorageModule {}