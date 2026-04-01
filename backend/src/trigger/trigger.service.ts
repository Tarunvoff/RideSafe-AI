import { Injectable } from '@nestjs/common';
import * as h3 from 'h3-js';
import { RedisStateService } from '../state/redis-state.service';
import { ZoneMonitoringService } from '../kafka/zone-monitoring.service';


@Injectable()
export class TriggerService {
  constructor(
    private readonly redisState: RedisStateService,
    private readonly zoneMonitoring: ZoneMonitoringService,
  ) {}

  private async resolveH3Cell(driverId: string, h3Cell?: string, lat?: number, lng?: number) {
    if (h3Cell) return h3Cell;
    if (lat != null && lng != null) {
      return h3.latLngToCell(lat, lng, 8);
    }
    const driverState = await this.redisState.getDriverState(driverId);
    return driverState?.last_location?.h3_cell ?? null;
  }

  private async fallbackDecision(h3Cell: string) {
    let zoneState: any = await this.redisState.getZoneState(h3Cell);
    if (!zoneState) {
      zoneState = await this.zoneMonitoring.getZoneState(h3Cell);
    }

    const Lf = Number(zoneState?.Lf ?? zoneState?.lf_score ?? 0);
    const zoneStateLabel = zoneState?.zone_state ?? zoneState?.state ?? 'UNKNOWN';
    const trigger = zoneStateLabel === 'HALTED';
    return {
      decision: trigger ? 'APPROVED' : 'HOLD',
      Lf,
      zone_state: zoneStateLabel,
    };
  }

  async evaluateTrigger(params: {
    driverId: string;
    h3Cell?: string;
    fraudScore?: number;
    lat?: number;
    lng?: number;
  }) {
    const h3Cell = await this.resolveH3Cell(params.driverId, params.h3Cell, params.lat, params.lng);
    if (!h3Cell) {
      return {
        decision: 'HOLD',
        reason: 'missing-h3',
        h3_cell: null,
      };
    }

    const fallback = await this.fallbackDecision(h3Cell);
    return {
      ...fallback,
      h3_cell: h3Cell,
      source: 'local-zone',
    };
  }

  async getZoneDrivers(h3Cell: string) {
    return this.redisState.getZoneDrivers(h3Cell);
  }
}
