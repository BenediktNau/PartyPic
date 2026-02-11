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

  // Anzahl aktiver Sessions aus der DB holen (nicht abgelaufen)
  private async collectActiveSessions() {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM sessions 
        WHERE ends_at > NOW()
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

  // Anzahl online User aus der DB holen (basierend auf last_seen Heartbeat)
  // Ein User gilt als "online" wenn sein letzter Heartbeat < 1 Minute her ist
  private async collectOnlineUsers() {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(DISTINCT id) as count 
        FROM session_users 
        WHERE last_seen > NOW() - INTERVAL '1 minute'
      `);
      const count = parseInt(result.rows[0]?.count || '0', 10);
      this.metricsService.setUsersOnline(count);
      this.logger.debug(`Users Online: ${count}`);
    } catch (error) {
      // Falls Tabelle nicht existiert oder Spalte fehlt, setze 0
      this.logger.warn('Konnte online User nicht abrufen:', error.message);
      this.metricsService.setUsersOnline(0);
    }
  }
}
