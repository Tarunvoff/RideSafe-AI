export interface PartnerDriverProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  platform: string;
  workSummary: {
    averageWeeklyEarnings: number;
    totalDeliveries: number;
    rating: number;
  };
  currentWeek: {
    weeklyEarningsTotal: number;
    dailyBreakdown: Array<{
      date: string;
      hoursWorked: number;
      completedDeliveries: number;
    }>;
  };
  identity: {
    provider: string;
    externalId: string;
  };
}

export interface IParametricPartnerProvider {
  /**
   * Fetches a driver's production profile and telemetry from the partner gateway.
   */
  getDriverProfile(driverId: string): Promise<PartnerDriverProfile>;

  /**
   * Validates if the partner gateway is alive and operational.
   */
  healthCheck(): Promise<boolean>;
}
