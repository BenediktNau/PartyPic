import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Konfiguriert passport-local, um 'email' statt 'username' zu nutzen
    super({ usernameField: 'email' }); 
  }

  /**
   * Passport ruft diese Funktion automatisch auf, 
   * wenn der LocalAuthGuard genutzt wird.
   */
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Falsche Anmeldedaten');
    }
    return user;
  }
}