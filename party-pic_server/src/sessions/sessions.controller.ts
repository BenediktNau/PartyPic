import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Param,
  HttpException,
  Query,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { SessionsDbService } from './sessions.db.service';
import { AuthService } from '../auth/auth.service';
import { MetricsService } from '../metrics/metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as sessionsModel from '../models/sessions/sessions.model';
import { session_User } from '../models/sessions/session_User.model';

interface CreateSessionDto {
  user_id: string;
}

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsDBService: SessionsDbService,
    private readonly authService: AuthService,
    private readonly metricsService: MetricsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createSession(@Request() req) {
    const userAlreadyHaveSession =
      await this.sessionsDBService.getSessionsByUserId(req.user.sub);
    if (userAlreadyHaveSession.length > 0) {
      return {
        message: 'User already has a session',
        sessionId: userAlreadyHaveSession[0].id,
      };
    }
    const createdSession = await this.sessionsDBService.createSession(
      req.user.sub,
    );
    // Prometheus Counter inkrementieren
    this.metricsService.incrementTotalSessions();
    return { sessionId: createdSession.id };
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
  @Post('setmissions')
  async setMissions(
    @Body() body: { missions: {}[]; sessionId: string },
    @Request() req,
  ) {
    const { sessionId, missions } = body;
    const userId: string = req.user.sub;

    const session = await this.sessionsDBService.getSessionById(sessionId);
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    const userFromSession: string = session.user_id;

    // Annahme: session hat ein 'userId' Feld
    if (userFromSession !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const updatedSession = await this.sessionsDBService.updateMissions(
      sessionId,
      missions,
    );

    return {
      message: 'Missions updated successfully',
      data: updatedSession,
    };
  }

  @Post('registerSessionUser')
  async registerSessionUser(
    @Body() body: { username: string; sessionId: string },
  ) {
    const { username, sessionId } = body;
    const sessionUser: session_User =
      await this.sessionsDBService.addSessionUser(username, sessionId);
    return sessionUser;
  }

  @Post('loginSessionUser')
  async loginSessionUser(
    @Body() body: { userId:string, sessionId:string },
  ) {
    const { userId } = body;
    const sessionUser: session_User =
      await this.sessionsDBService.getSessionUserById(userId);

    if (sessionUser.session_id !== body.sessionId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return sessionUser;
  }
}
