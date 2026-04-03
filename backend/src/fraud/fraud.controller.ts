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
    const result = await this.fraudService.analyzeFraud(req.user.id, dto);

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
  async getLiveZoneRisk(@Query('lat') lat: number, @Query('lng') lng: number) {
    if (!lat || !lng) return {};
    const resolution = 8;
    const h3_cell = h3.latLngToCell(Number(lat), Number(lng), resolution);
    return this.zoneMonitoringService.getZoneState(h3_cell);
  }

  @Get('zone-neighbors')
  async getZoneNeighbors(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '1',
  ) {
    if (!lat || !lng) return { center: null, neighbors: [] };

    const resolution = 8;
    const centerCell = h3.latLngToCell(Number(lat), Number(lng), resolution);
    const ringFn = (h3 as any).gridDisk ?? (h3 as any).kRing;
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
        // Try to fetch from database (seeded data)
        const dbData = await (this.prisma as any).zoneRiskData.findUnique({
          where: { h3_cell: cell },
        });

        if (dbData) {
          // Apply time-based variance: riskScore varies ±15% every minute
          const cellSeed = cell
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const variance = ((cellSeed + timeHash) % 30) - 15; // ±15% variance
          const variedRiskScore = Math.max(
            0,
            Math.min(100, dbData.riskScore + variance),
          );
          
          // Recalculate riskLevel based on varied riskScore
          let variedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
          if (variedRiskScore > 69) variedRiskLevel = 'HIGH';
          else if (variedRiskScore > 39) variedRiskLevel = 'MEDIUM';
          else variedRiskLevel = 'LOW';

          // Vary other metrics slightly too
          const rainfallVariance = ((cellSeed + timeHash + 10) % 20) - 10;
          const variedRainfall = Math.max(0, dbData.rainfall + rainfallVariance * 0.1);
          
          const aqiVariance = ((cellSeed + timeHash + 20) % 40) - 20;
          const variedAqi = Math.max(0, Math.min(500, dbData.aqi + aqiVariance));

          return {
            h3_cell: cell,
            riskScore: variedRiskScore,
            riskLevel: variedRiskLevel,
            rainfall: variedRainfall,
            temperature: dbData.temperature,
            aqi: variedAqi,
            floodChance: dbData.floodChance,
            disruptionScore: dbData.disruptionScore,
            trafficStatus: dbData.trafficStatus,
            activeRiders: dbData.activeRiders,
          };
        }

        // If DB has no data, return defaults (never crash)
        return {
          h3_cell: cell,
          ...DEFAULT_RISK,
        };
      }),
    );

    const center = entries.find((e) => e.h3_cell === centerCell) ?? {
      h3_cell: centerCell,
      ...DEFAULT_RISK,
    };
    const neighbors = entries.filter((e) => e.h3_cell !== centerCell);

    console.log(`[ZoneNeighbors] Returned ${entries.length} cells for (${lat}, ${lng})`);

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
