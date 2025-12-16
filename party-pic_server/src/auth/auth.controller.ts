import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from '../models/auth/register.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto.username, registerDto.email, registerDto.password);
    }

    // @UseGuards(LocalAuthGuard) ruft automatisch deine LocalStrategy auf.
    // Wenn validate() erfolgreich ist, wird 'req.user' befüllt.
    @Post('login')
    async login(@Request() req) {
        // req.user wurde vom LocalAuthGuard (via LocalStrategy) angehängt
        const user = await this.authService.validateUser(req.body.email, req.body.password)
        if (user) {
            console.log("User validated:", user);
            return this.authService.login(user);
        }
        else {
            return { message: 'Unauthorized' };
        }
    }
}
