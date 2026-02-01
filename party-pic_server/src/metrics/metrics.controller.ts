import { Controller, Get, Res } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import type { Response } from 'express';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    // Wichtig: Content-Type für Prometheus setzen
    res.set('Content-Type', this.metricsService.registry.contentType);
    const metrics = await this.metricsService.registry.metrics();
    res.send(metrics);
  }
}