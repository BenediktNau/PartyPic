import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg'; // Annahme: Du nutzt 'pg'
import { IpictureData } from '../models/pictures/picture.model';



@Injectable()
export class PicturesDbService {
  constructor(
    @Inject('PG_POOL') private readonly pool: Pool
  ) { }

  async createPicture(pictureData: IpictureData) {
    const {
      u_name,
      session_id,
      original_filename,
      s3_key,
      s3_bucket,
      mimetype,
      filesize_bytes,
      mission_id,
    } = pictureData;

    // Dein INSERT-Befehl (mit allen Metadaten)
    const queryText = `
      INSERT INTO pictures (
        u_name, session_id, original_filename, s3_key, s3_bucket, mimetype, filesize_bytes, mission_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      mission_id
    ];

    const result = await this.pool.query(queryText, values);
    return result.rows[0];
  }

  async getPicturesBySessionId(sessionId: string) {
    const queryText = `
      SELECT * FROM pictures 
      WHERE session_id = $1 
      ORDER BY created_at DESC;
    `;
    const result = await this.pool.query(queryText, [sessionId]);
    return result.rows;
  }
}