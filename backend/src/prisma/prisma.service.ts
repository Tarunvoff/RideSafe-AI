/** 
 * Data Persistence Layer: Manages the life cycle of the database connection and serves 
 * as the primary interface for state transitions within the Aegis ecosystem.
 *
 * For data models and state management logic, refer to ARCHITECTURE/DATA_SCHEMA_AND_STATE.md.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
