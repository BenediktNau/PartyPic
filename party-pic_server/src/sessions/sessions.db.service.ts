import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { session } from 'src/models/sessions/sessions.model';


@Injectable()
export class SessionsDbService {

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool
  ) { }

  async createSession(userId: string) {
    // Dein INSERT-Befehl (mit allen Metadaten)
    const queryText = `
      INSERT INTO sessions (
        user_id
      )
      VALUES ($1)
      RETURNING *; 
    `;
    const values = [
      userId
    ];


    const result = await this.pool.query(queryText, values);
    return result.rows[0];
  }

  async getSessionById(sessionId: string) {
    const queryText = `
      SELECT * FROM sessions WHERE id = $1;
    `;
    const values = [sessionId];

    const result = await this.pool.query(queryText, values);
    return result.rows[0];
  }

  async getSessionsByUserId(userId: string) {
    const queryText = `
      SELECT * FROM sessions WHERE user_id = $1;
    `;
    const values = [userId];

    const result = await this.pool.query(queryText, values);
    return result.rows;
  }
}