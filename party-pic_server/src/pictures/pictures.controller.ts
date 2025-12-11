import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    Body,
    Request
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PicturesDbService } from './pictures.db.service'; // Dein DB-Service (siehe unten)
import { StorageService } from 'src/s3/s3.service';
import { SessionsDbService } from 'src/sessions/sessions.db.service';

// DTO für zusätzliche Daten, die als Text mitgesendet werden
class UploadMetaDto {
    u_name: string;
    session_id: string; // Annahme: u_name und session_id kommen als Textfelder
}

@Controller('pictures')
export class PicturesController {
    constructor(
        private readonly storageService: StorageService,
        private readonly picturesDbService: PicturesDbService,
        private readonly sessionDbService: SessionsDbService,

    ) { }

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', { // 'file' muss der Feldname im FormData sein
            storage: memoryStorage(), // WICHTIG: Datei im RAM halten
            limits: { fileSize: 10 * 1024 * 1024 }, // z.B. 10 MB Limit
        }),
    )
    async uploadPicture(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: UploadMetaDto,
    ) {
        if (this.sessionDbService.getSessionById(body.session_id) == null) {
            throw new Error('Session does not exist');
        }
        console.log('Received file:', file.originalname, 'for user:', body.u_name, 'in session:', body.session_id);

        // 1. Datei zu S3 (MinIO) hochladen
        const s3Data = await this.storageService.uploadFile(file, body.session_id);

        // 2. Metadaten in Postgres speichern
        const dbEntry = await this.picturesDbService.createPicture({
            u_name: body.u_name,
            session_id: body.session_id,
            ...s3Data, // Enthält s3_key, s3_bucket, original_filename etc.
            mission_id: body.session_id, // Füge mission_id hinzu, hier als null gesetzt
        });



        return dbEntry;
    }
}