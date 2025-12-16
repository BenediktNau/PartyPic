import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';    // Erstellen wir gleich
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/user.module';

@Module({
  imports: [
    UsersModule, // Damit wir den UsersService injizieren können
    PassportModule,
    ConfigModule, // Um den Secret Key aus .env zu lesen
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        secretOrPrivateKey: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' }, // z.B. 1 Stunde
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy], // Unsere Logik
  controllers: [AuthController], // Unsere Endpunkte
})
export class AuthModule {}