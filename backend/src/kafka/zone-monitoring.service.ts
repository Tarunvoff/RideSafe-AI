import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { Kafka, Consumer, logLevel } from 'kafkajs';
import { ClaimOrchestratorService } from '../insurance/claim-orchestrator.service';
import { RedisStateService } from '../state/redis-state.service';

type ZoneStateUpdatePayload = {
    h3_cell?: string;
    old_state?: string;
    new_state?: string;
    lf_score?: number;
    aqi?: number;
    timestamp?: number;
};

@Injectable()
export class ZoneMonitoringService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ZoneMonitoringService.name);
    private consumer: Consumer | null = null;
    private readonly zoneCache = new Map<string, Record<string, any>>();
    private readonly zoneState = new Map<string, string>();

    constructor(
        private readonly redisState: RedisStateService,
        @Optional() private readonly claimOrchestrator?: ClaimOrchestratorService,
    ) {}

    private normalizeZoneState(payload: Record<string, any>, h3Cell: string) {
        const state = (payload?.state ?? payload?.zone_state ?? 'UNKNOWN').toString().toUpperCase();
        const lfScore = Number(payload?.lf_score ?? payload?.Lf ?? 0);
        return {
            h3_cell: payload?.h3_cell ?? h3Cell,
            state,
            lf_score: Number.isFinite(lfScore) ? lfScore : 0,
            active_riders: Number(payload?.active_riders ?? 0),
            rainfall_mm: Number(payload?.rainfall_mm ?? 0),
            aqi: Number(payload?.aqi ?? 0),
            timestamp: payload?.timestamp ?? payload?.updated_at ?? new Date().toISOString(),
            source: payload?.source ?? 'unknown',
        };
    }

    onModuleInit(): void {
        /**
         * [TRUE WORK]: Resilient Asynchronous Consumption
         * We decouple the Kafka consumer subscription from the main application 
         * bootstrap. This ensures that ingress endpoints (Auth, Plans) are 
         * live immediately, while the zone-monitoring thread stabilizes 
         * asynchronously in the background.
         */
        this.initKafkaConsumer().catch(err => {
            this.logger.error(`[ZONE_MONITOR] Asynchronous ignition failure: ${err.message}`);
        });
    }

    private async initKafkaConsumer(): Promise<void> {
        const brokers = (process.env.KAFKA_BROKER_URL ?? 'localhost:9092')
            .split(',')
            .map((broker) => broker.trim())
            .filter(Boolean);
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

                        let newState = (payload?.new_state ?? '').toUpperCase();
                        const previousState = (this.zoneState.get(h3Cell) ?? payload?.old_state ?? '').toUpperCase();

                        // DevTrails Rule: AQI > 300 explicitly forces payouts (HALTED state)
                        if (payload?.aqi != null && payload.aqi > 300) {
                            this.logger.warn(`[zone-monitor] AQI > 300 detected in ${h3Cell}. Forcing HALTED state.`);
                            newState = 'HALTED';
                        }

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
                            if (this.claimOrchestrator) {
                                await this.claimOrchestrator.orchestrateZoneClaims(h3Cell, eventTimestamp);
                            } else {
                                this.logger.warn(
                                    'ClaimOrchestratorService unavailable in Kafka context; skipping auto-claim dispatch',
                                );
                            }
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

        const configuredBaseUrl = (process.env.GRID_EVENT_SERVICE_URL ?? 'http://127.0.0.1:8003').replace(/\/+$/, '');
        const candidateBaseUrls = [configuredBaseUrl];
        if (configuredBaseUrl.includes('localhost')) {
            candidateBaseUrls.push(configuredBaseUrl.replace('localhost', '127.0.0.1'));
        }

        let lastError: unknown;

        for (const baseUrl of candidateBaseUrls) {
            try {
                const response = await fetch(`${baseUrl}/zones/${h3Cell}`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000),
                });
                if (response.ok) {
                    const data = this.normalizeZoneState(await response.json(), h3Cell);
                    this.zoneCache.set(h3Cell, data);
                    return data;
                }
                lastError = new Error(`HTTP ${response.status}`);
            } catch (e) {
                lastError = e;
            }
        }

        this.logger.warn(
            `Failed to fetch zone state via API for ${h3Cell}. ` +
            `Checked: ${candidateBaseUrls.join(', ')}. ` +
            `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        );

        return {
            h3_cell: h3Cell,
            state: 'UNKNOWN',
            lf_score: 0.0,
            active_riders: 0,
        };
    }
}
