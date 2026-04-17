import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClaimOrchestratorService } from '../insurance/claim-orchestrator.service';
import { InsuranceService } from '../insurance/insurance.service';
import { RedisStateService } from '../state/redis-state.service';
import { TriggerService } from '../trigger/trigger.service';
import { PrismaService } from '../prisma/prisma.service';
import { TriggerEvaluateDto, TriggerDispatchDto } from './canonical.dto';

@Controller('triggers')
@UseGuards(JwtAuthGuard)
export class CanonicalTriggersController {
  constructor(
    private readonly triggerService: TriggerService,
    private readonly redisState: RedisStateService,
    private readonly claimOrchestrator: ClaimOrchestratorService,
    private readonly insuranceService: InsuranceService,
    private readonly prisma: PrismaService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot evaluate trigger for another worker');
    }
  }

  @Post('evaluate')
  async evaluate(@Request() req: any, @Body() dto: TriggerEvaluateDto) {
    const workerId = dto.workerId ?? req.user.id;
    this.assertAccess(req, workerId);

    const evaluation = await this.triggerService.evaluateTrigger({
      driverId: workerId,
      h3Cell: dto.h3Cell,
      lat: dto.lat,
      lng: dto.lng,
      fraudScore: dto.fraudScore,
    });

    const eventTs = dto.eventTimestamp ?? Math.floor(Date.now() / 1000);
    const disruption = await this.prisma.disruptionEvent.create({
      data: {
        type: `TRIGGER_${String(evaluation.zone_state ?? 'UNKNOWN').toUpperCase()}`,
        title: `Trigger evaluation for ${workerId}`,
        expectedLoss: 0,
        expectedPayout: 0,
        verified: evaluation.decision === 'APPROVED',
        occurredAt: new Date(eventTs * 1000),
      },
    });

    let claim = null;
    if (evaluation.decision === 'APPROVED') {
      const result = await this.insuranceService.processInsurance(workerId, {
        eventType: 'MANUAL_TRIGGER_EVAL',
        eventTimestamp: eventTs,
        lat: dto.lat,
        lng: dto.lng,
      });
      claim = {
        decision: result.decision,
        payout: result.payout,
        transactionId: result.transactionId,
      };
    }

    return {
      triggerEvent: disruption,
      evaluation,
      claim,
    };
  }

  @Get('active')
  active() {
    return this.redisState.getAllHaltedZones();
  }

  @Get('history')
  history(@Query('take') take?: string) {
    const resolvedTake = Number.isFinite(Number(take)) ? Math.max(1, Number(take)) : 50;
    return this.prisma.disruptionEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: resolvedTake,
    });
  }

  @Post('staged-dispatch')
  async stagedDispatch(@Body() dto: TriggerDispatchDto) {
    const zoneState = (dto.zoneState ?? 'HALTED').toUpperCase();
    const lfScore = dto.lfScore ?? 0.9;

    await this.redisState.setZoneState(dto.h3Cell, {
      h3_cell: dto.h3Cell,
      Lf: lfScore,
      lf_score: lfScore,
      zone_state: zoneState,
      source: 'canonical-trigger-simulation',
      updated_at: new Date().toISOString(),
    });

    const eventTimestamp = Math.floor(Date.now() / 1000);
    await this.claimOrchestrator.orchestrateZoneClaims(dto.h3Cell, eventTimestamp);

    const event = await this.prisma.disruptionEvent.create({
      data: {
        type: `SIM_${zoneState}`,
        title: `Staged trigger dispatch for ${dto.h3Cell}`,
        expectedLoss: 0,
        expectedPayout: 0,
        verified: true,
      },
    });

    return {
      message: 'Trigger simulation executed',
      event,
      zoneState,
      lfScore,
    };
  }
}
