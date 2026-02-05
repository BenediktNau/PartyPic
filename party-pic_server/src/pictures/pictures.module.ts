/*
 * pictures.module.ts
 * 
 * Modul fuer Foto-Upload und Galerie-Funktionen.
 * Upload laeuft ueber Presigned URLs direkt zu S3.
 */

import { Module } from '@nestjs/common';
import { PicturesController } from './pictures.controller';
import { PicturesDbService } from './pictures.db.service';
import { SessionsModule } from '../sessions/sessions.module';
import { StorageModule } from '../s3/s3.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [SessionsModule, StorageModule, MetricsModule],
  controllers: [PicturesController],
  providers: [PicturesDbService],
  exports: [PicturesDbService],
})
export class PicturesModule {}
