import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TriggerEvaluateRequestDto } from './dto/trigger-evaluate.dto';
import { TriggerService } from './trigger.service';

@Controller('trigger')
export class TriggerController {
  constructor(private readonly triggerService: TriggerService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  evaluate(@Body() dto: TriggerEvaluateRequestDto) {
    return this.triggerService.evaluateTrigger({
      driverId: dto.driverId,
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
