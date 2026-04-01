import { DeliveryStatus, DriverStatus, EmploymentType, QCommerceProvider, StoreType, VehicleType } from '../enums/qcommerce.enums';

export interface DriverIdentity {
  internalDriverId: string;
  platformDriverId: string;
  provider: QCommerceProvider;
  fullName: string;
  phone: string;
  email?: string;
  ageBand: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  profilePhotoUrl: string;
  city: string;
  state: string;
  primaryServiceZone: string;
  primaryDarkStore: string;
  employmentType: EmploymentType;
  vehicleType: VehicleType;
  vehicleNumberMasked: string;
  joiningDate: string;
  currentStatus: DriverStatus;
  rating: number;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'FLAGGED';
}

export interface DriverKycProfile {
  kycVerified: boolean;
  kycVerifiedAt: string;
  aadhaarMasked: string;
  panMasked?: string;
  drivingLicenseMasked?: string;
  bankAccountMasked: string;
  upiIdMasked?: string;
  emergencyContactMasked: string;
  addressSummary: string;
  documents: Array<{
    type: string;
    maskedId: string;
    verifiedAt: string;
  }>;
  verificationSource: QCommerceProvider;
  trustScore: number;
}

export interface DriverWorkSummary {
  totalLifetimeDeliveries: number;
  totalLifetimeEarnings: number;
  activeDaysOnPlatform: number;
  averageDailyDeliveries: number;
  averageWeeklyEarnings: number;
  averageAcceptanceRate: number;
  averageSkipRate: number;
  averageCancellationRate: number;
  onTimeDeliveryScore: number;
  preferredWorkingHours: string;
  preferredStoreCluster: string;
}

export interface DriverDailyBreakdown {
  date: string;
  ordersAssigned: number;
  ordersAccepted: number;
  ordersSkipped: number;
  ordersRejected: number;
  completedDeliveries: number;
  totalCancelledAfterAccept: number;
  hoursWorked: number;
  baseEarnings: number;
  incentives: number;
  penalties: number;
  totalEarnings: number;
  darkStoresServed: string[];
  distanceTravelledKm: number;
}

export interface DriverWeekSummaryTotals {
  weekStartDate: string;
  weekEndDate: string;
  weeklyEarningsTotal: number;
  totalOrdersAssigned: number;
  totalOrdersAccepted: number;
  totalOrdersSkipped: number;
  totalOrdersRejected: number;
  totalCompletedDeliveries: number;
  totalCancelledAfterAccept: number;
  totalWorkingHours: number;
  incentiveEarnings: number;
  baseEarnings: number;
  penalties: number;
  averageEarningsPerOrder: number;
  averageEarningsPerActiveHour: number;
}

export interface DriverWeekSummary extends DriverWeekSummaryTotals {
  dailyBreakdown: DriverDailyBreakdown[];
}

export interface DriverOrderHistoryItem {
  orderId: string;
  provider: QCommerceProvider;
  orderDateTime: string;
  deliveryStatus: DeliveryStatus;
  assignedStoreId: string;
  assignedStoreName: string;
  storeType: StoreType;
  pickupZone: string;
  deliveryZone: string;
  orderValue?: number;
  driverPayout: number;
  deliveryDistanceKm: number;
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  skippedReason?: string;
  rejectionReason?: string;
  wasRainFlag?: boolean;
  shiftTag: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
}

export interface DriverStorePerformance {
  storeId: string;
  storeName: string;
  storeType: StoreType;
  totalDeliveries: number;
  totalEarnings: number;
  primaryZone: string;
}

export interface DriverStoreAnalytics {
  primaryStore: DriverStorePerformance;
  secondaryStores: DriverStorePerformance[];
  totalClustersServed: number;
  mostlyAttachedToPrimary: boolean;
}

export interface DriverStaticProfileParts {
  identity: DriverIdentity;
  kyc: DriverKycProfile;
}

export interface DriverWeeklySnapshotPayload {
  weekKey: string;
  workSummary: DriverWorkSummary;
  currentWeek: DriverWeekSummary;
  orderHistory: DriverOrderHistoryItem[];
  storeAnalytics: DriverStoreAnalytics;
}

export interface DriverHistoricalWeekSnapshot {
  weekKey: string;
  generatedAt: string;
  weekSummary: DriverWeekSummary;
}

export interface DriverProfilePayload extends DriverStaticProfileParts, DriverWeeklySnapshotPayload {
  historicalWeeks?: DriverHistoricalWeekSnapshot[];
}
