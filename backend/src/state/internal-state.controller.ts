import { Body, Controller, HttpCode, HttpStatus, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { RedisStateService } from './redis-state.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('internal')
export class InternalStateController {
  constructor(
    private readonly redisState: RedisStateService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('zone-state')
  @HttpCode(HttpStatus.OK)
  async setZoneState(
    @Headers('x-aegis-internal-key') internalKey: string,
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
    const secret = process.env.INTERNAL_AUTH_KEY || 'aegis_telemetry_sovereign_2026';
    if (internalKey !== secret) {
      throw new UnauthorizedException('Invalid Internal Auth Key');
    }

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

    // ── Phase 3: Forensic Persistence Layer ──────────────────────────────────
    // We persist the telemetry snapshot into ZoneTelemetryLog (TimescaleDB) 
    // to enable historical cross-referencing for claim audits.
    await this.prisma.zoneTelemetryLog.create({
      data: {
        h3Cell:  payload.h3_cell,
        lfScore: payload.Lf,
        weather: payload.rainfall_mm ? (payload.rainfall_mm > 5 ? 'Heavy Rain' : 'Light Rain') : payload.zone_state,
        aqi:     payload.aqi ? Math.round(payload.aqi) : null,
        timestamp: payload.computed_at ? new Date(payload.computed_at) : new Date(),
      },
    }).catch(err => {
      // Log but don't fail the request (resilience first)
      console.error(`[Telemetry Failure] Could not persist to DB: ${err.message}`);
    });

    return { success: true, h3_cell: payload.h3_cell };
  }
}
