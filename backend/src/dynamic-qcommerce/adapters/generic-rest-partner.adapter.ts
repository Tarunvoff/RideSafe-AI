/**
 * @forensic audit: Rule-EG-1
 * @forensic identity: generic-rest-partner-adapter
 * @forensic status: HARDENED
 * @forensic provisioning: BASELINE
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IParametricPartnerProvider, PartnerDriverProfile } from '../interfaces/partner-provider.interface';

/**
 * Generic REST adapter for production-ready partner integrations.
 * This adapter enables Aegis to connect to real-world Q-commerce partner gateways
 * by configuring the PARTNER_GATEWAY_URL and PARTNER_API_TOKEN environment variables.
 */
@Injectable()
export class GenericRestPartnerAdapter implements IParametricPartnerProvider {
  private readonly logger = new Logger(GenericRestPartnerAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async getDriverProfile(driverId: string): Promise<PartnerDriverProfile> {
    const baseUrl = this.config.get<string>('PARTNER_GATEWAY_URL');
    const apiToken = this.config.get<string>('PARTNER_API_TOKEN');

    if (!baseUrl) {
      this.logger.error('Integration failure: PARTNER_GATEWAY_URL not configured');
      throw new Error('Partner integration not configured for production traffic');
    }

    try {
      const response = await fetch(`${baseUrl}/v1/drivers/${driverId}/parametric-profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
          'X-Aegis-Source': 'Parametric-Shield-V1',
        },
        signal: AbortSignal.timeout(10000), // production-grade 10s timeout
      });

      if (!response.ok) {
        throw new Error(`Partner gateway returned HTTP status ${response.status}`);
      }

      return (await response.json()) as PartnerDriverProfile;
    } catch (err: any) {
      this.logger.error(`Live partner profile fetch failed for ${driverId}: ${err.message}`);
      throw err; // In production, we propagate this to trigger insurance fallbacks
    }
  }

  async healthCheck(): Promise<boolean> {
    const baseUrl = this.config.get<string>('PARTNER_GATEWAY_URL');
    if (!baseUrl) return false;

    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return response.ok;
    } catch {
      return false;
    }
  }
}
