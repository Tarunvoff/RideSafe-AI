/** 
 * Regulatory Gatekeeper: Ensures all platform operations comply with IRDAI, SS Code 2020, 
 * and DPDP Act 2023 standards.
 *
 * For the regulatory and compliance framework, refer to ARCHITECTURE/REGULATORY_COMPLIANCE_ARCHITECTURE.md.
 */
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ReserveSustainabilityService } from './reserve-sustainability.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly reserveService: ReserveSustainabilityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stress-test')
  getActuarialSustainability() {
    return this.reserveService.calculateHistoricalBCR();
  }

  @UseGuards(JwtAuthGuard)
  @Post('consent/dpdp')
  async logDPDPConsent(@Req() req: any, @Body() body: { type: 'GPS' | 'PLATFORM', partner?: string }) {
    const userId = req.user.id;

    if (body.type === 'GPS') {
      return this.prisma.user.update({
        where: { id: userId },
        data: { gpsConsentTimestamp: new Date(), gpsConsentVersion: 'v1.0' }
      });
    }

    if (body.type === 'PLATFORM') {
      return this.prisma.user.update({
        where: { id: userId },
        data: { platformDataConsentTimestamp: new Date(), platformDataPartner: body.partner }
      });
    }
  }
}
