import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationConsumer } from './notification.consumer';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationConsumer],
  exports: [NotificationService],
})
export class NotificationModule {}