import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  getDashboard() {
    return this.adminService.getDashboardSummary();
  }

  @Get('workers')
  @HttpCode(HttpStatus.OK)
  getWorkers() {
    return this.adminService.getWorkers();
  }

  @Get('claims')
  @HttpCode(HttpStatus.OK)
  getClaims() {
    return this.adminService.getClaims();
  }
}
