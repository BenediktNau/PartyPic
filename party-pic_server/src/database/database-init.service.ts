import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(@Inject('PG_POOL') private pool: Pool) {}

  async onModuleInit() {
    this.logger.log('Pruefe Datenbank-Tabellen...');
    await this.createTables();
  }

  private async createTables() {
    const client = await this.pool.connect();
    try {
      // 1. Users Tabelle (mit "name" Spalte fuer Neuinstallationen)
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            username VARCHAR(255),
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. MIGRATION: Falls die Tabelle schon existiert (wie jetzt), 
      // fuegen wir "name" nachtraeglich hinzu.
      try {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);`);
      } catch (e) {
        // Fehler ignorieren, falls Spalte schon da ist (Sicherheitshalber)
      }

      // 3. Sessions Tabelle
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid varchar NOT NULL COLLATE "default",
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);
      `);

      try {
        await client.query(`ALTER TABLE sessions ADD CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;`);
      } catch (e) {
        // Constraint existiert schon
      }

      await client.query(`CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);`);

      this.logger.log('Datenbank-Tabellen erfolgreich initialisiert und migriert.');
    } catch (error) {
      this.logger.error('Fehler beim Initialisieren der Datenbank:', error);
    } finally {
      client.release();
    }
  }
}