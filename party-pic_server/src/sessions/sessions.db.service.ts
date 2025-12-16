import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
// import { session } from 'src/models/sessions/sessions.model'; // Optional, falls du Typen hast

@Injectable()
export class SessionsDbService {

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool
  ) { }

  async createSession(userId: string) {
    const queryText = `
      INSERT INTO sessions (
        user_id, settings, missions
      )
      VALUES ($1, $2, $3)
      RETURNING *; 
    `;
    // Wir initialisieren missions als leeres Array []
    // Hinweis: Postgres 'jsonb' Spalten akzeptieren JS-Arrays/Objekte direkt via pg-Driver
    const values = [
      userId, {}, [],
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

  // --- NEU HINZUGEFÜGT ---
  async updateMissions(sessionId: string, missions: any[]) {
    
    const queryText = `
      UPDATE sessions
      SET missions = $2
      WHERE id = $1
      RETURNING *;
    `;
    
    const values = [sessionId, JSON.stringify(missions)]; 
    
    const result = await this.pool.query(queryText, values);
    console.log(values)
    console.log(result)
    return result.rows[0];
  }
}