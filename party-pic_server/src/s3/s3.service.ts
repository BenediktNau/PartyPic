import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // NEW
import { v4 as uuidv4 } from 'uuid'; // Ensure you have uuid installed or use @smithy/uuid

@Injectable()
export class StorageService {
    private readonly bucket: string;

    constructor(
        private readonly s3Client: S3Client,
        private readonly configService: ConfigService,
    ) {
        this.bucket = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    }

    async getPresignedUrl(session_id: string, contentType: string) {
        const fileExtension = contentType.split('/')[1] || 'jpg';
        const s3_key = `user/${session_id}/${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: s3_key,
            ContentType: contentType, // Critical: Must match what the frontend sends
        });

        // Generate a URL valid for 15 minutes (900 seconds)
        const url = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

        return {
            uploadUrl: url,
            key: s3_key,
            bucket: this.bucket
        };
    }
}