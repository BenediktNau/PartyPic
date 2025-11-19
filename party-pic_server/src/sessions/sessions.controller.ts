import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('sessions')
export class SessionsController {

    constructor() { }

    @UseGuards(JwtAuthGuard)
    @Post('create')
    async createSession() {
        return { message: 'Session created' };
    }

    @Get('get')
    async getSession() {
        return { message: 'Session data' };
    }
}
