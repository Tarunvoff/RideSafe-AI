import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, logLevel } from 'kafkajs';
import { ClaimOrchestratorService } from '../insurance/claim-orchestrator.service';
import { RedisStateService } from '../state/redis-state.service';

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

    constructor(
        private readonly claimOrchestrator: ClaimOrchestratorService,
        private readonly redisState: RedisStateService,
    ) {}

    private normalizeZoneState(payload: Record<string, any>, h3Cell: string) {
        const state = (payload?.state ?? payload?.zone_state ?? 'UNKNOWN').toString().toUpperCase();
        const lfScore = Number(payload?.lf_score ?? payload?.Lf ?? 0);
        return {
            h3_cell: payload?.h3_cell ?? h3Cell,
            state,
            lf_score: Number.isFinite(lfScore) ? lfScore : 0,
            active_riders: Number(payload?.active_riders ?? 0),
            timestamp: payload?.timestamp ?? payload?.updated_at ?? new Date().toISOString(),
            source: payload?.source ?? 'unknown',
        };
    }

    async onModuleInit(): Promise<void> {
        const brokers = (process.env.KAFKA_BROKER_URL ?? 'localhost:9092').split(',');
        const kafka = new Kafka({
            clientId: 'aegis-zone-monitor',
            brokers,
            logLevel: logLevel.ERROR,
            logCreator: () => ({ label, log }) => {
                const { message, error } = log;
                if (message?.includes('leadership election') || error?.includes('leadership election')) return;
                if (message?.includes('no leader') || error?.includes('no leader')) return;
                this.logger.verbose(`[Kafka] ${label}: ${message}`);
            },
        });

        this.consumer = kafka.consumer({
            groupId: process.env.ZONE_STATE_CONSUMER_GROUP ?? 'aegis-zone-state-consumer',
        });

        for (let i = 0; i < 3; i++) {
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

                        const zonePayload = {
                            h3_cell: h3Cell,
                            Lf: payload?.lf_score ?? 0,
                            zone_state: newState || previousState || 'UNKNOWN',
                            updated_at: new Date().toISOString(),
                            source: 'kafka-zone-state-updates',
                        };
                        await this.redisState.setZoneState(h3Cell, zonePayload);
                        this.logger.log(
                            `Zone ${h3Cell} state updated: Lf=${zonePayload.Lf}, state=${zonePayload.zone_state}`,
                        );

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
                return;
            } catch (err: any) {
                if (err?.message?.includes('middle of a leadership election') && i < 2) {
                    this.logger.debug(`[zone-monitor] Waiting for leadership election... (attempt ${i + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    continue;
                }
                this.logger.warn(`[zone-monitor] Kafka consumer unavailable: ${err.message}`);
                this.consumer = null;
                break;
            }
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.consumer) {
            await this.consumer.disconnect().catch(() => undefined);
            this.logger.log('[zone-monitor] Kafka consumer disconnected');
        }
    }

    async getZoneState(h3Cell: string) {
        const redisZoneState = await this.redisState.getZoneState(h3Cell);
        if (redisZoneState) {
            const normalized = this.normalizeZoneState(redisZoneState, h3Cell);
            this.zoneCache.set(h3Cell, normalized);
            return normalized;
        }

        const cached = this.zoneCache.get(h3Cell);
        if (cached) return cached;

        try {
            const GRID_EVENT_URL = process.env.GRID_EVENT_SERVICE_URL || 'http://localhost:8003';
            const response = await fetch(`${GRID_EVENT_URL}/zones/${h3Cell}`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });
            if (response.ok) {
                const data = this.normalizeZoneState(await response.json(), h3Cell);
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
