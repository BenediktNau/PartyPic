import { Controller, Get, Post, UseGuards, Request, Param, HttpException, Query, HttpStatus, Body } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SessionsDbService } from './sessions.db.service';
import * as sessionsModel from 'src/models/sessions/sessions.model';

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
        return { sessionId: createdSession.id};
    }

    @Get('get')
    // ÄNDERUNG: @Query statt @Param, da axios params in der URL sendet (?sessionId=...)
    async getSession(@Query('sessionId') sessionId: string) {
        if (!sessionId) {
            throw new HttpException('Session ID is missing', HttpStatus.BAD_REQUEST);
        }

        const session = await this.sessionsDBService.getSessionById(sessionId);
        
        if (!session) {
             throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
        }
        
        return session;
    }

    @UseGuards(JwtAuthGuard)
    @Post('setmissions') // Kleinschreibung beachten, falls Frontend das so sendet
    async setMissions(@Body() body: sessionsModel.session, @Request() req) {
        const { sessionId, sessionMissions } = body;
        const userId = req.user.sub;

        // Sicherheitscheck (Optional aber empfohlen): 
        // Gehört die Session wirklich dem User, der gerade angeloggt ist?
        const session = await this.sessionsDBService.getSessionById(sessionId);
        if (!session) {
             throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
        }
        // Annahme: session hat ein 'userId' Feld
        if (session.userId !== userId) {
             throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        // Speichern in der DB
        const updatedSession = await this.sessionsDBService.updateMissions(sessionId, sessionMissions);
        
        return { 
            message: 'Missions updated successfully', 
            data: updatedSession 
        };
    }
}
