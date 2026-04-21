import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string) {
    // Clean phone number: remove whatsapp: prefix and any non-digits
    const cleanPhone = phone.replace('whatsapp:', '').replace(/[^0-9]/g, '');
    
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: `+${cleanPhone}` },
          { phone: cleanPhone.slice(-10) } // Match last 10 digits
        ]
      },
      include: {
        policies: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
  }
}
