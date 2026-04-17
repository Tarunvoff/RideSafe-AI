import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as h3 from 'h3-js';
import { RedisStateService } from '../state/redis-state.service';
import { ZoneMonitoringService } from '../kafka/zone-monitoring.service';
import { PrismaService } from '../prisma/prisma.service';

const TRIGGER_APPROVAL_ZONE_STATES = (process.env.TRIGGER_APPROVAL_ZONE_STATES ?? 'HALTED')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);
const TRIGGER_LF_MIN_APPROVE = Number(process.env.TRIGGER_LF_MIN_APPROVE ?? 0.6);
const TRIGGER_FRAUD_HOLD_THRESHOLD = Number(process.env.TRIGGER_FRAUD_HOLD_THRESHOLD ?? 0.45);
const TRIGGER_FRAUD_REJECT_THRESHOLD = Number(process.env.TRIGGER_FRAUD_REJECT_THRESHOLD ?? 0.7);

type TriggerDecisionResult = {
  decision: 'APPROVED' | 'HOLD' | 'REJECTED';
  Lf: number;
  zone_state: string;
  reason: string;
  thresholdEvaluation: {
    zoneRequiredStates: string[];
    lfMinApprove: number;
    fraudHoldThreshold: number;
    fraudRejectThreshold: number;
    zoneGatePassed: boolean;
    lfGatePassed: boolean;
    fraudGate: 'PASS' | 'HOLD' | 'REJECT';
  };
};


@Injectable()
export class TriggerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisState: RedisStateService,
    @Inject(forwardRef(() => ZoneMonitoringService))
    private readonly zoneMonitoring: ZoneMonitoringService,
  ) {}

  private async writeTriggerLog(log: {
    userId?: string;
    policyId?: string;
    disruptionEventId?: string;
    h3Cell: string;
    decision: 'APPROVED' | 'HOLD' | 'REJECTED';
    source: string;
    reason?: string;
    riskScore?: number;
    correlationId?: string;
    eventTimestamp?: number;
  }) {
    try {
      await this.prisma.triggerEventLog.create({
        data: {
          userId: log.userId,
          policyId: log.policyId,
          disruptionEventId: log.disruptionEventId,
          h3Cell: log.h3Cell,
          decision: log.decision,
          source: log.source,
          reason: log.reason,
          riskScore: log.riskScore,
          correlationId: log.correlationId,
          eventTimestamp: log.eventTimestamp,
        },
      });
    } catch {
      // Trigger evaluation must not fail if audit-log persistence is unavailable.
    }
  }

  private async resolveH3Cell(driverId: string, h3Cell?: string, lat?: number, lng?: number) {
    if (h3Cell) return h3Cell;
    if (lat != null && lng != null) {
      return h3.latLngToCell(lat, lng, 8);
    }
    const driverState = await this.redisState.getDriverState(driverId);
    return driverState?.last_location?.h3_cell ?? null;
  }

  private async fallbackDecision(h3Cell: string, fraudScore?: number): Promise<TriggerDecisionResult> {
    let zoneState: any = await this.redisState.getZoneState(h3Cell);
    if (!zoneState) {
      zoneState = await this.zoneMonitoring.getZoneState(h3Cell);
    }

    const Lf = Number(zoneState?.Lf ?? zoneState?.lf_score ?? 0);
    const zoneStateLabel = String(zoneState?.zone_state ?? zoneState?.state ?? 'UNKNOWN').toUpperCase();

    const zoneGatePassed = TRIGGER_APPROVAL_ZONE_STATES.includes(zoneStateLabel);
    const lfGatePassed = Lf >= TRIGGER_LF_MIN_APPROVE;

    let fraudGate: 'PASS' | 'HOLD' | 'REJECT' = 'PASS';
    if (fraudScore != null) {
      if (fraudScore >= TRIGGER_FRAUD_REJECT_THRESHOLD) {
        fraudGate = 'REJECT';
      } else if (fraudScore >= TRIGGER_FRAUD_HOLD_THRESHOLD) {
        fraudGate = 'HOLD';
      }
    }

    let decision: 'APPROVED' | 'HOLD' | 'REJECTED' = 'APPROVED';
    let reason = 'passed-all-thresholds';

    if (!zoneGatePassed) {
      decision = 'HOLD';
      reason = `zone-state-${zoneStateLabel.toLowerCase()}-not-in-approval-list`;
    } else if (!lfGatePassed) {
      decision = 'HOLD';
      reason = `lf-below-min-approve-${TRIGGER_LF_MIN_APPROVE}`;
    } else if (fraudGate === 'REJECT') {
      decision = 'REJECTED';
      reason = `fraud-above-reject-threshold-${TRIGGER_FRAUD_REJECT_THRESHOLD}`;
    } else if (fraudGate === 'HOLD') {
      decision = 'HOLD';
      reason = `fraud-above-hold-threshold-${TRIGGER_FRAUD_HOLD_THRESHOLD}`;
    }

    return {
      decision,
      Lf,
      zone_state: zoneStateLabel,
      reason,
      thresholdEvaluation: {
        zoneRequiredStates: TRIGGER_APPROVAL_ZONE_STATES,
        lfMinApprove: TRIGGER_LF_MIN_APPROVE,
        fraudHoldThreshold: TRIGGER_FRAUD_HOLD_THRESHOLD,
        fraudRejectThreshold: TRIGGER_FRAUD_REJECT_THRESHOLD,
        zoneGatePassed,
        lfGatePassed,
        fraudGate,
      },
    };
  }

  async evaluateTrigger(params: {
    driverId: string;
    h3Cell?: string;
    fraudScore?: number;
    lat?: number;
    lng?: number;
    policyId?: string;
    disruptionEventId?: string;
    correlationId?: string;
    eventTimestamp?: number;
  }) {
    const h3Cell = await this.resolveH3Cell(params.driverId, params.h3Cell, params.lat, params.lng);
    if (!h3Cell) {
      await this.writeTriggerLog({
        userId: params.driverId,
        policyId: params.policyId,
        disruptionEventId: params.disruptionEventId,
        h3Cell: 'UNKNOWN',
        decision: 'HOLD',
        source: 'local-zone',
        reason: 'missing-h3',
        correlationId: params.correlationId,
        eventTimestamp: params.eventTimestamp,
      });
      return {
        decision: 'HOLD',
        reason: 'missing-h3',
        h3_cell: null,
        source: 'local-zone',
        zone_state: 'UNKNOWN',
        Lf: 0,
      };
    }

    const fallback = await this.fallbackDecision(h3Cell, params.fraudScore);
    await this.writeTriggerLog({
      userId: params.driverId,
      policyId: params.policyId,
      disruptionEventId: params.disruptionEventId,
      h3Cell,
      decision: fallback.decision,
      source: 'local-zone',
      reason: fallback.reason,
      riskScore: fallback.Lf,
      correlationId: params.correlationId,
      eventTimestamp: params.eventTimestamp,
    });

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
