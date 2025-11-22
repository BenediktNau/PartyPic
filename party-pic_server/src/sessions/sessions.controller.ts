import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SessionsDbService } from './sessions.db.service';

interface CreateSessionDto {
    user_id: string;
}


@Controller('sessions')
export class SessionsController {



    constructor(
        private readonly sessionsDBService: SessionsDbService,
        private readonly authService: AuthService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createSession(@Request() req) {
        const userAlreadyHaveSession = await this.sessionsDBService.getSessionsByUserId(req.user.sub);
        if (userAlreadyHaveSession.length > 0) {
            return { message: 'User already has a session', sessionId: userAlreadyHaveSession[0].id };
        }
        const createdSession = await this.sessionsDBService.createSession(req.user.sub);
        return { sessionId: createdSession.id };
    }

    @Get('get')
    async getSession() {
        return { message: 'Session data' };
    }
}
