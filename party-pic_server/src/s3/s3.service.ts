import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('S3_REGION'),
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      forcePathStyle: this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_KEY'),
        // NEU: Session Token für Lab-User hinzufügen!
        sessionToken: this.configService.get<string>('S3_SESSION_TOKEN'), 
      },
    });
  }

  async getPresignedUrl(sessionId: string, mimetype: string) {
    const fileExtension = mimetype.split('/')[1];
    const key = `${sessionId}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimetype,
    });

    // URL ist 15 Minuten gültig
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      uploadUrl,
      key,
      bucket: this.bucketName,
    };
  }

  // Presigned URL zum Herunterladen/Anzeigen eines Bildes
  async getPresignedDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // URL ist 1 Stunde gültig
    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}