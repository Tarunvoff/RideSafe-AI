import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FraudService } from '../fraud/fraud.service';
import { PrismaService } from '../prisma/prisma.service';
import { FraudCheckDto } from './canonical.dto';

@Controller('fraud')
@UseGuards(JwtAuthGuard)
export class CanonicalFraudController {
  constructor(
    private readonly fraudService: FraudService,
    private readonly prisma: PrismaService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot access another worker fraud data');
    }
  }

  @Post('check')
  check(@Request() req: any, @Body() dto: FraudCheckDto): Promise<any> {
    const workerId = dto.workerId ?? req.user.id;
    this.assertAccess(req, workerId);
    return this.fraudService.analyzeFraud(workerId, {
      gpsLatitude: dto.gpsLatitude,
      gpsLongitude: dto.gpsLongitude,
      deviceId: dto.deviceId,
      upiId: dto.upiId,
      claimAmount: dto.claimAmount,
      eventType: dto.eventType ?? 'FRAUD_CHECK',
    });
  }

  @Get('flags/:workerId')
  async flags(@Request() req: any, @Param('workerId') workerId: string) {
    this.assertAccess(req, workerId);
    const status = await this.fraudService.getStatus(workerId);
    const details = await this.prisma.fraudAnalysis.findUnique({
      where: { userId: workerId },
      select: {
        riskScore: true,
        status: true,
        analysisDetails: true,
        updatedAt: true,
      },
    });

    return {
      workerId,
      fraudStatus: status,
      flags: details,
    };
  }

  @Post('gps-verify')
  verifyGps(@Request() req: any, @Body() dto: FraudCheckDto): Promise<any> {
    const workerId = dto.workerId ?? req.user.id;
    this.assertAccess(req, workerId);
    return this.fraudService.analyzeFraud(workerId, {
      gpsLatitude: dto.gpsLatitude,
      gpsLongitude: dto.gpsLongitude,
      deviceId: dto.deviceId,
      upiId: dto.upiId,
      claimAmount: 0,
      eventType: 'GPS_VERIFY',
    });
  }
}
