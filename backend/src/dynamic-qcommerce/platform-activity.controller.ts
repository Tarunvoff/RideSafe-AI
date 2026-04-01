import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { DynamicQCommerceService } from './dynamic-qcommerce.service';
import { QCommerceProvider } from './enums/qcommerce.enums';

@Controller('platform')
export class PlatformActivityController {
  constructor(private readonly dynamicQCommerceService: DynamicQCommerceService) {}

  @Get('activity')
  getZoneActivity(@Query('zone') zone: string, @Res() res: Response) {
    if (!zone || !zone.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'zone query param is required' });
    }

    const data = this.dynamicQCommerceService.getZoneActivity(zone);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('live-gps')
  getLiveGps(
    @Query('zone') zone: string,
    @Query('provider') provider: string,
    @Query('count') count: string,
    @Res() res: Response,
  ) {
    if (!zone || !zone.trim()) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'zone query param is required' });
    }

    const resolvedProvider = Object.values(QCommerceProvider).includes(provider as QCommerceProvider)
      ? (provider as QCommerceProvider)
      : QCommerceProvider.ZEPTO;
    const resolvedCount = Number.isFinite(Number(count)) ? Math.max(1, Number(count)) : 6;

    const result = this.dynamicQCommerceService.publishLiveTelemetry(zone, resolvedProvider, resolvedCount);
    return res.status(HttpStatus.OK).json(result);
  }
}
