import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) { }

  async findOne(email: string): Promise<any | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    return res.rows[0];
  }

  async create(name: string, email: string, pass: string): Promise<any> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pass, saltRounds);

    const res = await this.pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email',
      [name, email, hashedPassword],
    );
    return res.rows[0];
  }
} 