import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from '@smithy/uuid';

@Injectable()
export class StorageService {
    private readonly bucket: string;

    constructor(
        private readonly s3Client: S3Client,
        private readonly configService: ConfigService,
    ) {
        this.bucket = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    }

    /**
     * Lädt eine Datei in den S3-Speicher hoch.
     * @param file Das Multer-Datei-Objekt
     * @param userId (Optional) Zur Erstellung des Pfads
     * @returns Metadaten, die in der DB gespeichert werden sollen
     */
    async uploadFile(
        file: Express.Multer.File,
        session_id: string, // z.B. die u_name oder session_id
    ) {
        const fileExtension = file.originalname.split('.').pop();
        const s3_key = `user/${session_id}/${uuidv4()}.${fileExtension}`;

        // 1. Befehl zum Hochladen erstellen
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: s3_key,
            Body: file.buffer, // Der Datei-Inhalt
            ContentType: file.mimetype,
        });

        try {
            // 2. Befehl an S3 (oder MinIO) senden
            await this.s3Client.send(command);

            // 3. Metadaten für die Postgres-DB zurückgeben
            return {
                s3_key: s3_key,
                s3_bucket: this.bucket,
                original_filename: file.originalname,
                mimetype: file.mimetype,
                filesize_bytes: file.size,
            };
        } catch (error) {
            console.error('Fehler beim S3-Upload', error);
            throw new Error('Datei-Upload fehlgeschlagen');
        }
    }
}