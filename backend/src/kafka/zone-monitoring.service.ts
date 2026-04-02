import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { ClaimOrchestratorService } from '../insurance/claim-orchestrator.service';

type ZoneStateUpdatePayload = {
    h3_cell?: string;
    old_state?: string;
    new_state?: string;
    lf_score?: number;
    timestamp?: number;
};

@Injectable()
export class ZoneMonitoringService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ZoneMonitoringService.name);
    private consumer: Consumer | null = null;
    private readonly zoneCache = new Map<string, Record<string, any>>();
    private readonly zoneState = new Map<string, string>();

    constructor(private readonly claimOrchestrator: ClaimOrchestratorService) {}

    async onModuleInit(): Promise<void> {
        const brokers = (process.env.KAFKA_BROKER_URL ?? 'localhost:9092').split(',');
        const kafka = new Kafka({
            clientId: 'aegis-zone-monitor',
            brokers,
        });

        this.consumer = kafka.consumer({
            groupId: process.env.ZONE_STATE_CONSUMER_GROUP ?? 'aegis-zone-state-consumer',
        });

        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: 'zone_state_updates', fromBeginning: false });
            await this.consumer.run({
                eachMessage: async ({ message }) => {
                    if (!message.value) return;
                    let payload: ZoneStateUpdatePayload | null = null;
                    try {
                        payload = JSON.parse(message.value.toString());
                    } catch (err) {
                        this.logger.warn(`[zone-monitor] Invalid JSON payload: ${err}`);
                        return;
                    }

                    const h3Cell = payload?.h3_cell;
                    if (!h3Cell) return;

                    const newState = (payload?.new_state ?? '').toUpperCase();
                    const previousState = (this.zoneState.get(h3Cell) ?? payload?.old_state ?? '').toUpperCase();

                    this.zoneState.set(h3Cell, newState || previousState || 'UNKNOWN');
                    this.zoneCache.set(h3Cell, {
                        h3_cell: h3Cell,
                        state: newState || previousState || 'UNKNOWN',
                        lf_score: payload?.lf_score ?? 0,
                        timestamp: payload?.timestamp ?? Math.floor(Date.now() / 1000),
                        source: 'kafka-zone-state-updates',
                    });

                    if (newState === 'HALTED' && previousState !== 'HALTED') {
                        const eventTimestamp = payload?.timestamp
                            ? Math.floor(payload.timestamp)
                            : Math.floor(Date.now() / 1000);
                        this.logger.log(`Zone ${h3Cell} entered HALTED → triggering auto-claims`);
                        await this.claimOrchestrator.orchestrateZoneClaims(h3Cell, eventTimestamp);
                    }
                },
            });

            this.logger.log(`[zone-monitor] Kafka consumer connected → ${brokers.join(', ')}`);
        } catch (err) {
            this.logger.warn(`[zone-monitor] Kafka consumer unavailable: ${err}`);
            this.consumer = null;
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.consumer) {
            await this.consumer.disconnect().catch(() => undefined);
            this.logger.log('[zone-monitor] Kafka consumer disconnected');
        }
    }

    async getZoneState(h3Cell: string) {
        const cached = this.zoneCache.get(h3Cell);
        if (cached) return cached;

        try {
            const GRID_EVENT_URL = process.env.GRID_EVENT_SERVICE_URL || 'http://localhost:8003';
            const response = await fetch(`${GRID_EVENT_URL}/zones/${h3Cell}`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) {
                const data = await response.json();
                this.zoneCache.set(h3Cell, data);
                return data;
            }
        } catch (e) {
            this.logger.warn(`Failed to fetch zone state via API for ${h3Cell}. Is Grid Event Service running?`);
        }

        return {
            h3_cell: h3Cell,
            state: 'UNKNOWN',
            lf_score: 0.0,
            active_riders: 0,
        };
    }
}
