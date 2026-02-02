import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(@Inject('PG_POOL') private pool: Pool) {}

  async onModuleInit() {
    this.logger.log('Initialisiere Datenbank-Schema (UUID Support)...');
    await this.initSchema();
  }

  private async initSchema() {
    const client = await this.pool.connect();
    try {
      // 1. Extension für UUID Generierung aktivieren
      await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

      const checkUser = await client.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
      `);

      if (checkUser.rows.length > 0 && checkUser.rows[0].data_type !== 'uuid') {
        this.logger.warn('ALTES SCHEMA DETEKTIERT (Integer IDs). Führe Hard-Reset durch...');
        await client.query(`DROP TABLE IF EXISTS session_users CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS pictures CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS sessions CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS auth_sessions CASCADE;`); 
      }

      // 2. Tabelle: USERS
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            CONSTRAINT unique_email UNIQUE(email)
        );
      `);

      // 3. Tabelle: SESSIONS 
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            settings JSON,
            missions JSON,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
            user_id UUID REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 4. Tabelle: SESSION_USERS 
      await client.query(`
        CREATE TABLE IF NOT EXISTS session_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_name VARCHAR(50),
            session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 5. Tabelle: PICTURES
      await client.query(`
        CREATE TABLE IF NOT EXISTS pictures (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            u_name VARCHAR(255) NOT NULL,
            mission_id VARCHAR(255), -- 'ID' ist kein SQL Typ, nutze VARCHAR oder UUID
            session_id UUID NOT NULL, -- FK constraint optional, hier lose Kopplung ok
            original_filename VARCHAR(255) NOT NULL,
            s3_key VARCHAR(255) NOT NULL,
            s3_bucket VARCHAR(100) NOT NULL,
            mimetype VARCHAR(100),
            filesize_bytes BIGINT,
            CONSTRAINT unique_s3_key UNIQUE(s3_key)
        );
      `);
      
      // Indizes erstellen
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pictures_session_id ON pictures(session_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_pictures_u_name ON pictures(u_name);`);

      // 6. Tabelle: AUTH_SESSIONS
      await client.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          sid varchar NOT NULL COLLATE "default",
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        )
        WITH (OIDS=FALSE);
      `);
      try {
        await client.query(`ALTER TABLE auth_sessions ADD CONSTRAINT auth_session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;`);
      } catch (e) {}
      await client.query(`CREATE INDEX IF NOT EXISTS IDX_auth_session_expire ON auth_sessions (expire);`);

      this.logger.log('Datenbank-Schema erfolgreich auf UUIDs migriert.');
    } catch (error) {
      this.logger.error('Fehler beim Initialisieren des Schemas:', error);
    } finally {
      client.release();
    }
  }
}