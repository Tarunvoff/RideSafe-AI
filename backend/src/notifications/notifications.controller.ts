import { Controller, Get, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getNotifications(@Request() req: any) {
    return {
      message: 'Notifications retrieved',
      data: [
         { id: 'n1', title: 'Welcome to Aegis', message: 'Your identity is fully verified. Drive safe!', date: new Date().toISOString(), read: false },
         { id: 'n2', title: 'System Update', message: 'H3 burst detection is now live in your zone.', date: new Date(Date.now() - 3600*1000).toISOString(), read: true }
      ],
    };
  }
}
