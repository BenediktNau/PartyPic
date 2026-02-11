import { Controller, Post, Body, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { StorageService } from '../s3/s3.service';
import { PicturesDbService } from './pictures.db.service';
import { SessionsDbService } from '../sessions/sessions.db.service';
import { ConfigService } from '@nestjs/config';

class InitUploadDto {
    session_id: string;
    mimetype: string; // e.g., 'image/jpeg'
}

class FinalizeUploadDto {
    u_name: string;
    session_id: string;
    s3_key: string;      // Passed back from frontend
    original_filename: string;
    filesize_bytes: number;
    mimetype: string;
}

@Controller('pictures')
export class PicturesController {
    constructor(
        private readonly storageService: StorageService,
        private readonly picturesDbService: PicturesDbService,
        private readonly sessionDbService: SessionsDbService,
            private readonly configService: ConfigService,
            private readonly metricsService: MetricsService
        ) { }

    // Step 1: Frontend asks for permission to upload
    @Post('init-upload')
    async initializeUpload(@Body() body: InitUploadDto) {
        if (this.sessionDbService.getSessionById(body.session_id) == null) {
            throw new Error('Session does not exist');
        }

        // Generate the URL
        const presignedData = await this.storageService.getPresignedUrl(
            body.session_id,
            body.mimetype
        );

        return presignedData; // Returns { uploadUrl, key, bucket }
    }

    // Step 2: Frontend confirms upload finished, backend saves to DB
    @Post('finalize-upload')
    async finalizeUpload(@Body() body: FinalizeUploadDto) {
        const dbEntry = await this.picturesDbService.createPicture({
            u_name: body.u_name,
            session_id: body.session_id,
            s3_key: body.s3_key,
            s3_bucket: this.configService.getOrThrow<string>('S3_BUCKET_NAME'),
            original_filename: body.original_filename,
            mimetype: body.mimetype,
            filesize_bytes: body.filesize_bytes,
            mission_id: body.session_id, 
        });
        return dbEntry;
    }

    // Bilder einer Session abrufen (mit presigned URLs zum Anzeigen)
    @Get('session')
    async getSessionPictures(@Query('sessionId') sessionId: string) {
        if (!sessionId) {
            throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
        }

        const pictures = await this.picturesDbService.getPicturesBySessionId(sessionId);
        
        // Presigned URLs zum Anzeigen generieren
        const picturesWithUrls = await Promise.all(
            pictures.map(async (pic) => ({
                ...pic,
                url: await this.storageService.getPresignedDownloadUrl(pic.s3_key),
            }))
        );

        return picturesWithUrls;
    }
}