import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  /**
   * Wird von LocalStrategy genutzt: Prüft E-Mail und Passwort.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(email);

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user; // Passwort nie zurückgeben
      return result;
    }
    return null; // Führt zu 401 Unauthorized
  }

  /**
   * Wird vom Login-Endpunkt aufgerufen, wenn validateUser() erfolgreich war.
   * Erstellt den JWT.
   */
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, { secret: process.env.JWT_SECRET }),
      user: user,

    };
  }

  /**
   * Wird vom Register-Endpunkt aufgerufen.
   */
  async register(name: string, email: string, pass: string) {
    // Hier könntest du Logik einbauen (z.B. "E-Mail bereits vergeben?")
    return this.usersService.create(name, email, pass);
  }
}