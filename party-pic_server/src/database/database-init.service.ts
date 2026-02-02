import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(@Inject('PG_POOL') private pool: Pool) {}

  async onModuleInit() {
    this.logger.log('Prüfe Datenbank-Tabellen...');
    await this.createTables();
  }

  private async createTables() {
    const client = await this.pool.connect();
    try {
      // 1. Users Tabelle
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(255),
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Sessions Tabelle (wichtig für NestJS Sessions)
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid varchar NOT NULL COLLATE "default",
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);
      `);

      // 3. Primary Key für Sessions (nur wenn er noch nicht existiert - etwas tricky in SQL)
      // Wir fangen den Fehler ab, falls der Constraint schon existiert
      try {
        await client.query(`ALTER TABLE sessions ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;`);
      } catch (e) {
        // Ignorieren, wenn Constraint schon da ist
      }

      // 4. Index für Sessions
      await client.query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);`);

      this.logger.log('Datenbank-Tabellen erfolgreich initialisiert oder bereits vorhanden.');
    } catch (error) {
      this.logger.error('Fehler beim Initialisieren der Datenbank:', error);
      // Wir werfen den Fehler nicht weiter, damit der Server trotzdem startet (optional)
    } finally {
      client.release();
    }
  }
}