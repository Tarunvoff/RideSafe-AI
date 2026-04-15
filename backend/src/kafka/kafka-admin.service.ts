import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka, Admin, logLevel } from 'kafkajs';

@Injectable()
export class KafkaAdminService implements OnModuleInit {
  private readonly logger = new Logger(KafkaAdminService.name);
  private admin: Admin | null = null;

  private readonly REQUIRED_TOPICS = [
    'driver_telemetry',
    'driver_telemetry_dlq',
    'zone_state_updates',
  ];

  async onModuleInit() {
    process.on('warning', (warning) => {
      if (warning.name === 'TimeoutNegativeWarning' || 
          warning.message.includes('negative number') || 
          warning.message.includes('Timeout duration was set to 1')) {
        return; // Silence futuristic clock noise perfectly
      }
    });
    await this.ensureTopicsExist();
  }

  async ensureTopicsExist() {
    const brokers = (process.env.KAFKA_BROKER_URL ?? 'localhost:9092').split(',');
    const kafka = new Kafka({
      clientId: 'aegis-admin-client',
      brokers,
      logLevel: logLevel.NOTHING,
      logCreator: () => () => {},
      retry: {
        retries: 10,
        initialRetryTime: 1000,
      },
    });

    this.admin = kafka.admin();

    try {
      this.logger.log('🛠️  Connecting Kafka Admin to ensure dynamic topic state...');
      await this.admin.connect();
      
      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = this.REQUIRED_TOPICS.filter(t => !existingTopics.includes(t));

      if (topicsToCreate.length > 0) {
          this.logger.log(`📦 Creating missing dynamic topics: ${topicsToCreate.join(', ')}`);
          await this.admin.createTopics({
              topics: topicsToCreate.map(t => ({
                  topic: t,
                  numPartitions: 1,
                  replicationFactor: 1,
              })),
              waitForLeaders: true, // This is the key to solving the 'no leader' error!
          });
          this.logger.log('✅ All dynamic topics are now ready with active leaders.');
      } else {
          this.logger.log('✅ All required topics already exist and are healthy.');
      }
    } catch (err: any) {
      this.logger.warn(`⚠️  Kafka Admin could not verify topics: ${err.message}. The system will attempt to continue via dynamic fallbacks.`);
    } finally {
      if (this.admin) {
          await this.admin.disconnect().catch(() => {});
      }
    }
  }
}
