import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { RedisStateService } from './redis-state.service';
import { AdminGuard } from '../auth/jwt-auth.guard';

@Controller('internal')
export class InternalStateController {
  constructor(private readonly redisState: RedisStateService) {}

  @Post('zone-state')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async setZoneState(
    @Body()
    payload: {
      h3_cell: string;
      Lf: number;
      zone_state: string;
      rainfall_mm?: number;
      aqi?: number;
      demand_ratio?: number;
      computed_at?: string;
    },
  ) {
    if (!payload?.h3_cell) {
      return { success: false, message: 'h3_cell is required' };
    }

    await this.redisState.setZoneState(payload.h3_cell, {
      h3_cell: payload.h3_cell,
      Lf: payload.Lf,
      zone_state: payload.zone_state,
      rainfall_mm: payload.rainfall_mm ?? null,
      aqi: payload.aqi ?? null,
      demand_ratio: payload.demand_ratio ?? null,
      computed_at: payload.computed_at ?? new Date().toISOString(),
      source: 'h3-feature-service',
    });

    return { success: true, h3_cell: payload.h3_cell };
  }
}
