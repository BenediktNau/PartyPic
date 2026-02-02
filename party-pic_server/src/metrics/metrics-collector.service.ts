import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pool } from 'pg';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly metricsService: MetricsService,
  ) {
    // Initiale Sammlung beim Start
    this.collectMetrics();
  }

  // Alle 15 Sekunden Metriken aus der DB sammeln
  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectMetrics() {
    try {
      await Promise.all([
        this.collectActiveSessions(),
        this.collectOnlineUsers(),
      ]);
    } catch (error) {
      this.logger.error('Fehler beim Sammeln der Metriken:', error);
    }
  }

  // Anzahl aktiver Sessions aus der DB holen
  private async collectActiveSessions() {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM sessions 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
      const count = parseInt(result.rows[0]?.count || '0', 10);
      this.metricsService.setActiveSessions(count);
      this.logger.debug(`Active Sessions: ${count}`);
    } catch (error) {
      // Falls Tabelle nicht existiert, setze 0
      this.logger.warn('Konnte aktive Sessions nicht abrufen:', error.message);
      this.metricsService.setActiveSessions(0);
    }
  }

  // Anzahl online User aus der DB holen (basierend auf session_users)
  // Ein User gilt als "online" wenn er in den letzten 15 Minuten einer Session beigetreten ist
  private async collectOnlineUsers() {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(DISTINCT user_name) as count 
        FROM session_users 
        WHERE created_at > NOW() - INTERVAL '15 minutes'
      `);
      const count = parseInt(result.rows[0]?.count || '0', 10);
      this.metricsService.setUsersOnline(count);
      this.logger.debug(`Users Online: ${count}`);
    } catch (error) {
      // Falls Tabelle nicht existiert, setze 0
      this.logger.warn('Konnte online User nicht abrufen:', error.message);
      this.metricsService.setUsersOnline(0);
    }
  }
}
