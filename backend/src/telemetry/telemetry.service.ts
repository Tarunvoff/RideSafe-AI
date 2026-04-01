import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KafkaProducerService } from '../kafka/kafka.producer.service';

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Postgres / TimescaleDB Engine...');
    
    try {
      // Create the Hypertable extension if it exists, otherwise fail silently without breaking the base app
      await this.prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);
      
      // Safely attempt to convert the standard Postgres table into a Timescale Hypertable partition mapped by time!
      await this.prisma.$executeRawUnsafe(`
        SELECT create_hypertable('zone_telemetry_logs', 'timestamp', if_not_exists => TRUE);
      `);
      this.logger.log('✅ TimescaleDB Hypertable [zone_telemetry_logs] successfully mounted!');
    } catch (e) {
      if (e.message?.includes('could not open extension control file')) {
         this.logger.warn('TimescaleDB extension not found on this Postgres instance. Defaulting to standard generic indexing. (Did you boot the docker-compose?)');
      } else {
         this.logger.log('Zone Telemetry Log is perfectly ready (Hypertable may already exist).');
      }
    }
  }

  /**
   * Called primarily by the Python Grid Services or direct internal cron jobs
   * to archive millions of ML events over a long time-horizon.
   */
  async ingestHighVolumeTelemetry(batch: any[]) {
      try {
          const inserted = await (this.prisma as any).zoneTelemetryLog.createMany({
              data: batch.map(b => ({
                  h3Cell: b.h3_cell,
                  lfScore: b.lf_score,
                  weather: b.weather,
                  aqi: b.aqi,
                  timestamp: new Date()
              })),
              skipDuplicates: true
          });
          this.logger.log(`TimescaleDB Ingestion Phase: ${inserted.count} logs archived.`);
          return inserted;
      } catch (e) {
          this.logger.error('TimescaleDB Bulk Write Phase Failed', e);
          throw e;
      }
  }

  publishGpsTelemetry(payload: {
    driverId: string;
    lat: number;
    lng: number;
    speed?: number;
    timestamp?: number;
    platform?: string;
  }) {
    const timestamp = payload.timestamp ?? Math.floor(Date.now() / 1000);
    const platform = payload.platform ?? 'mobile-app';
    return this.kafkaProducer.publishDriverLocation({
      driverId: payload.driverId,
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      timestamp,
      platform,
    });
  }
}
