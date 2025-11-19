import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor( configService: ConfigService) {
    console.log('JWT_SECRET:', configService.get<string>('JWT_SECRET'));
    super({
      // Sagt Passport, wie der Token gefunden wird (als Bearer Token im Header)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Passport ruft dies auf, NACHDEM der Token erfolgreich verifiziert wurde.
   * Das Ergebnis wird an 'request.user' angehängt.
   */
  async validate(payload: any) {
    // Payload ist der entschlüsselte Token: { email: '...', sub: '...' }
    return { userId: payload.sub, email: payload.email };
  }
}