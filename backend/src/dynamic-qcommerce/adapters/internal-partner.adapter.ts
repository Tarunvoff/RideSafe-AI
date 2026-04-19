/**
 * @forensic audit: Rule-EG-1
 * @forensic identity: internal-partner-adapter
 * @forensic status: HARDENED
 * @forensic provisioning: BASELINE
 */
import { Injectable, Logger } from '@nestjs/common';
import { IParametricPartnerProvider, PartnerDriverProfile } from '../interfaces/partner-provider.interface';
import { QCommerceProvider } from '../enums/qcommerce.enums';
import {
  buildStaticProfileParts,
  buildWeeklySnapshot,
  decodeInternalDriverId,
  getIsoWeekKey,
} from '../utils/dynamic-data.factory';

@Injectable()
export class InternalPartnerAdapter implements IParametricPartnerProvider {
  private readonly logger = new Logger(InternalPartnerAdapter.name);

  async getDriverProfile(driverId: string): Promise<PartnerDriverProfile> {
    this.logger.debug(`Resolving profile from internal registry for driver: ${driverId}`);
    
    const decoded = decodeInternalDriverId(driverId);
    const provider = decoded?.provider ?? QCommerceProvider.AEGIS;
    const identifier = decoded?.identifier ?? `aegis_${driverId}`;
    
    // Resolve from high-fidelity internal identity engine
    const staticParts = buildStaticProfileParts(provider, identifier, driverId);
    const weekKey = getIsoWeekKey();
    const weeklySnapshot = buildWeeklySnapshot(provider, identifier, weekKey, staticParts.cityContext);
    
    return {
      id: driverId,
      name: staticParts.staticProfile.identity.fullName ?? '',
      phone: staticParts.staticProfile.identity.phone ?? '',
      email: staticParts.staticProfile.identity.email ?? '',
      platform: provider,
      workSummary: {
        averageWeeklyEarnings: weeklySnapshot.workSummary.averageWeeklyEarnings,
        totalDeliveries: weeklySnapshot.workSummary.totalLifetimeDeliveries,
        rating: staticParts.staticProfile.identity.rating ?? 0,
      },
      currentWeek: weeklySnapshot.currentWeek,
      identity: {
        provider,
        externalId: identifier,
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true; // Internal registry is always operational
  }
}
