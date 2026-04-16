import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { TriggerEvaluateRequestDto } from './dto/trigger-evaluate.dto';
import { TriggerService } from './trigger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('trigger')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  private resolveAuthorizedDriverId(req: any, requestedDriverId?: string) {
    if (req.user?.role === 'ADMIN') {
      return requestedDriverId ?? req.user.id;
    }

    if (requestedDriverId && requestedDriverId !== req.user.id) {
      throw new ForbiddenException('Cannot evaluate trigger for another driver');
    }

    return req.user.id;
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  evaluate(@Request() req: any, @Body() dto: TriggerEvaluateRequestDto) {
    const driverId = this.resolveAuthorizedDriverId(req, dto.driverId);
    return this.triggerService.evaluateTrigger({
      driverId,
      h3Cell: dto.h3Cell,
      fraudScore: dto.fraudScore,
      lat: dto.lat,
      lng: dto.lng,
    });
  }

  @Post('zone-drivers')
  @HttpCode(HttpStatus.OK)
  async listZoneDrivers(@Body() dto: { h3Cell: string }) {
    const drivers = await this.triggerService.getZoneDrivers(dto.h3Cell);
    return { h3Cell: dto.h3Cell, drivers, count: drivers.length };
  }
}
