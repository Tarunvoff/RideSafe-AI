import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminGuard, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { ZoneMonitoringService } from '../kafka/zone-monitoring.service';
import { RedisStateService } from '../state/redis-state.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeFraudDto, ReviewFraudDto } from './dto/fraud.dto';
import { FraudService } from './fraud.service';
import * as h3 from 'h3-js';

@Controller('fraud')
export class FraudController {
  constructor(
    private readonly fraudService: FraudService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly zoneMonitoringService: ZoneMonitoringService,
    private readonly redisState: RedisStateService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async analyzeFraud(@Request() req: any, @Body() dto: AnalyzeFraudDto): Promise<any> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const result = await this.fraudService.analyzeFraud(req.user.id, dto, token);

    this.kafkaProducerService
      .publishDriverLocation({
        driverId: req.user.id,
        lat: dto.gpsLatitude,
        lng: dto.gpsLongitude,
        timestamp: Math.floor(Date.now() / 1000),
        platform: 'mobile-app',
      })
      .subscribe({ error: () => undefined });

    try {
      const h3_cell = h3.latLngToCell(dto.gpsLatitude, dto.gpsLongitude, 8);
      const zoneState = await this.zoneMonitoringService.getZoneState(h3_cell);
      
      if (result && result.data && result.data.analysis) {
        result.data.analysis.zoneState = zoneState;
      }
    } catch (e) {
      // Ignore gracefully
    }

    return result;
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@Request() req: any) {
    return this.fraudService.getStatus(req.user.id);
  }

  @Get('zone-risk')
  @UseGuards(JwtAuthGuard)
  async getLiveZoneRisk(@Query('lat') lat: number, @Query('lng') lng: number) {
    if (!lat || !lng) return {};
    const resolution = 8;
    const h3_cell = h3.latLngToCell(Number(lat), Number(lng), resolution);
    return this.zoneMonitoringService.getZoneState(h3_cell);
  }

  @Get('zone-neighbors')
  @UseGuards(JwtAuthGuard)
  async getZoneNeighbors(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '1',
  ) {
    if (!lat || !lng) return { center: null, neighbors: [] };

    const resolution = 8;
    const centerCell = h3.latLngToCell(Number(lat), Number(lng), resolution);
    const h3Compat = h3 as unknown as {
      gridDisk?: (cell: string, radius: number) => string[];
      kRing?: (cell: string, radius: number) => string[];
    };
    const ringFn = h3Compat.gridDisk ?? h3Compat.kRing;
    const allCells = ringFn ? ringFn(centerCell, Number(radius)) : [centerCell];

    // Default risk data (fallback when DB has no data)
    const DEFAULT_RISK = {
      riskScore: 0,
      riskLevel: 'LOW',
      rainfall: 0,
      temperature: 25,
      aqi: 50,
      floodChance: 'Low',
      disruptionScore: 0,
      trafficStatus: 'Stable Flow',
      activeRiders: 0,
    };

    // Time-based variance: changes every minute for dynamic visualization
    const now = new Date();
    const timeHash = Math.floor(now.getTime() / 60000); // Changes every minute

    const entries = await Promise.all(
      allCells.map(async (cell) => {
        // 1. Try Live Zone Monitoring (Consolidated Redis/Kafka/API state)
        try {
          const liveData: any = await this.zoneMonitoringService.getZoneState(cell);
          if (liveData && liveData.state !== 'UNKNOWN' && liveData.source !== 'unknown') {
            // Apply slight time-based jitter to risk score for dynamic UI feel
            const cellSeed = cell.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const jitter = ((cellSeed + timeHash) % 10) - 5; // ±5 jitter
            const riskScore = Math.max(0, Math.min(100, (liveData.lf_score * 100) + jitter));

            return {
              h3_cell: cell,
              riskScore,
              riskLevel: liveData.state,
              rainfall: liveData.rainfall_mm ?? 0,
              temperature: 28, // Default if not in live payload
              aqi: liveData.aqi ?? 50,
              floodChance: riskScore > 70 ? 'High' : (riskScore > 40 ? 'Medium' : 'Low'),
              disruptionScore: Number((liveData.lf_score * 0.8).toFixed(2)),
              trafficStatus: liveData.state === 'HALTED' ? 'Halt' : 'Stable Flow',
              activeRiders: liveData.active_riders ?? 0,
              source: 'live',
            };
          }
        } catch (e) {
          // Fallback to DB
        }

        // 2. Try Database Persistence (Seeded/Historical Data)
        const dbData = await this.prisma.zoneRiskData.findUnique({
          where: { h3_cell: cell },
        });

        if (dbData) {
          const cellSeed = cell.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const variance = ((cellSeed + timeHash) % 30) - 15;
          const variedRiskScore = Math.max(0, Math.min(100, dbData.riskScore + variance));
          
          let variedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
          if (variedRiskScore > 69) variedRiskLevel = 'HIGH';
          else if (variedRiskScore > 39) variedRiskLevel = 'MEDIUM';
          else variedRiskLevel = 'LOW';

          return {
            h3_cell: cell,
            riskScore: variedRiskScore,
            riskLevel: variedRiskLevel,
            rainfall: dbData.rainfall,
            temperature: dbData.temperature,
            aqi: dbData.aqi,
            floodChance: dbData.floodChance,
            disruptionScore: dbData.disruptionScore,
            trafficStatus: dbData.trafficStatus,
            activeRiders: dbData.activeRiders,
            source: 'seeded',
          };
        }

        // 3. Absolute Fallback
        return {
          h3_cell: cell,
          ...DEFAULT_RISK,
          source: 'default',
        };
      }),
    );

    const center = entries.find((e) => e.h3_cell === centerCell) ?? {
      h3_cell: centerCell,
      ...DEFAULT_RISK,
    };
    const neighbors = entries.filter((e) => e.h3_cell !== centerCell);

    return { center, neighbors };
  }

  // ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────

  @Get('admin/submissions')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  getSubmissions() {
    return this.fraudService.getSubmissions();
  }

  @Get('admin/submission/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  getSubmissionDetails(@Param('userId') userId: string) {
    return this.fraudService.getSubmissionDetails(userId);
  }

  @Patch('admin/review/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  reviewSubmission(@Param('userId') userId: string, @Body() dto: ReviewFraudDto) {
    return this.fraudService.reviewSubmission(userId, dto);
  }

  @Patch('admin/escalate/:userId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  escalateSubmission(
    @Param('userId') userId: string,
    @Body() dto: ReviewFraudDto,
  ) {
    return this.fraudService.escalateSubmission(userId, dto?.reviewNote);
  }

  @Get('admin/submission/:userId/pdf')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  exportSubmissionPdf(@Param('userId') userId: string) {
    return this.fraudService.exportSubmissionPdf(userId);
  }
}
