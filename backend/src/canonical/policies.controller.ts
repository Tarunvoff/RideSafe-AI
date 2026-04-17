import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Put,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InsuranceService } from '../insurance/insurance.service';
import { CreatePolicyDto } from './canonical.dto';

@Controller('policies')
@UseGuards(JwtAuthGuard)
export class CanonicalPoliciesController {
  constructor(
    private readonly insuranceService: InsuranceService,
    private readonly prisma: PrismaService,
  ) {}

  private assertAccess(req: any, workerId: string) {
    if (req.user?.role === 'ADMIN') return;
    if (req.user?.id !== workerId) {
      throw new ForbiddenException('Cannot access another worker policy');
    }
  }

  @Post()
  async create(@Request() req: any, @Body() dto: CreatePolicyDto) {
    const workerId = dto.workerId ?? req.user.id;
    this.assertAccess(req, workerId);
    return this.insuranceService.enrollPolicy({ driverId: workerId, plan: dto.plan });
  }

  @Get(':workerId')
  async getActivePolicies(@Request() req: any, @Param('workerId') workerId: string) {
    this.assertAccess(req, workerId);
    const now = new Date();
    const policies = await this.prisma.policy.findMany({
      where: {
        userId: workerId,
        status: 'ACTIVE',
        endDate: { gt: now },
      },
      include: {
        weeklyPlan: true,
        payouts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { workerId, policies };
  }

  @Put(':id/renew')
  async renew(@Request() req: any, @Param('id') policyId: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) {
      throw new ForbiddenException('Policy not found');
    }
    this.assertAccess(req, policy.userId);
    return this.insuranceService.renewPolicy({ driverId: policy.userId });
  }

  @Delete(':id')
  async cancel(@Request() req: any, @Param('id') policyId: string) {
    const policy = await this.prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) {
      throw new ForbiddenException('Policy not found');
    }
    this.assertAccess(req, policy.userId);
    return this.insuranceService.cancelPolicy({
      driverId: policy.userId,
      reason: 'Cancelled via canonical API',
    });
  }
}
