import { Injectable } from '@nestjs/common';
import { Pool } from 'pg'; // Annahme: Du nutzt 'pg'

@Injectable()
export class PicturesDbService {
  private pool: Pool; // Annahme: Pool wird hier initialisiert

  constructor() {
    // ... Initialisierung deines DB-Pools ...
    this.pool = new Pool({
      host: process.env.DB_HOST,
      // ...
    });
  }

  async createPicture(pictureData: {
    u_name: string;
    session_id: string;
    original_filename: string;
    s3_key: string;
    s3_bucket: string;
    mimetype: string;
    filesize_bytes: number;
  }) {
    const {
      u_name,
      session_id,
      original_filename,
      s3_key,
      s3_bucket,
      mimetype,
      filesize_bytes,
    } = pictureData;

    // Dein INSERT-Befehl (mit allen Metadaten)
    const queryText = `
      INSERT INTO pictures (
        u_name, session_id, original_filename, s3_key, s3_bucket, mimetype, filesize_bytes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *; 
    `;
    
    const values = [
      u_name,
      session_id,
      original_filename,
      s3_key,
      s3_bucket,
      mimetype,
      filesize_bytes,
    ];

    const result = await this.pool.query(queryText, values);
    return result.rows[0];
  }
}