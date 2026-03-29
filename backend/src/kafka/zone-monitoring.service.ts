import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ZoneMonitoringService {
    private readonly logger = new Logger(ZoneMonitoringService.name);
    // In production, this service would consume the zone_state_updates kafka topic 
    // to keep a local cache in the orchestrator, or would just hit the Grid Event Service.

    async getZoneState(h3Cell: string) {
        // Fallback or read from Grid Event Service directly.
        try {
            const GRID_EVENT_URL = process.env.GRID_EVENT_SERVICE_URL || 'http://localhost:8003';
            const response = await fetch(`${GRID_EVENT_URL}/zones/${h3Cell}`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000), // 2 seconds
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            this.logger.warn(`Failed to fetch zone state via API for ${h3Cell}. Is Grid Event Service running?`);
        }
        return {
            h3_cell: h3Cell,
            state: "UNKNOWN",
            lf_score: 0.0,
            active_riders: 0
        };
    }
}
