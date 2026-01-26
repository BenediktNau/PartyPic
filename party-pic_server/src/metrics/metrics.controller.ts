import { Controller, Get, Res } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Response } from 'express';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.metricsService.registry.contentType);
    res.send(await this.metricsService.registry.metrics());
  }
}
