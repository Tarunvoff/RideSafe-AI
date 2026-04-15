import {
  DeliveryStatus,
  DriverStatus,
  EmploymentType,
  QCommerceProvider,
  StoreType,
  VehicleType,
} from '../enums/qcommerce.enums';
import {
  DriverDailyBreakdown,
  DriverOrderHistoryItem,
  DriverProfilePayload,
  DriverStaticProfileParts,
  DriverStoreAnalytics,
  DriverStorePerformance,
  DriverWeeklySnapshotPayload,
  DriverWeekSummary,
  DriverWeekSummaryTotals,
} from '../interfaces/driver-profile.interface';
import { SeededRandom, createSeedFromString } from './seeded-random.util';

export interface DriverCityContext {
  city: string;
  state: string;
  serviceZones: string[];
  darkStores: string[];
  clusters: string[];
}

const CITY_BLUEPRINTS: DriverCityContext[] = [
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    serviceZones: ['HSR Layout', 'Koramangala', 'BTM Layout', 'Bellandur'],
    darkStores: [
      'HSR Dark Store 12',
      'Koramangala Rapid Hub',
      'Bellandur Grid Node',
      'BTM Night Runner Store',
    ],
    clusters: ['HSR Cluster', 'Outer Ring Cluster', 'Koramangala Cluster'],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    serviceZones: ['Andheri West', 'Powai', 'Bandra', 'Lower Parel'],
    darkStores: [
      'Andheri Express Node',
      'Bandra Hyperlocal Hub',
      'Powai Central Dark Store',
      'Lower Parel Grid Station',
    ],
    clusters: ['Western Express Cluster', 'Bandra Kurla Cluster'],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    serviceZones: ['Gachibowli', 'Kondapur', 'Madhapur', 'Tolichowki'],
    darkStores: [
      'Gachibowli Dash Hub',
      'Madhapur Lightning Store',
      'Kondapur Fulfilment Node',
      'Tolichowki Sprint Depot',
    ],
    clusters: ['HITEC Corridor Cluster', 'Ring Road Cluster'],
  },
  {
    city: 'Delhi NCR',
    state: 'Delhi',
    serviceZones: ['Dwarka', 'Saket', 'Gurugram Sector 29', 'Noida Sector 62'],
    darkStores: [
      'Dwarka 24x7 Node',
      'Saket Night Ops Store',
      'Cyber City Dark Hub',
      'Noida Sector 62 Velocity Hub',
    ],
    clusters: ['Airport Corridor Cluster', 'Cyber City Cluster'],
  },
];

const NAME_SETS = {
  [QCommerceProvider.ZEPTO]: ['Pranav N', 'Aadarsh Singh', 'Kumar Ajith', 'Lakshmi Rao'],
  [QCommerceProvider.BLINKIT]: ['Rajat Mishra', 'Nikita Sharma', 'Gaurav Bansal', 'Prerna Malik'],
  [QCommerceProvider.INSTAMART]: ['Sai Karthik', 'Meera Iyer', 'Shravan Gupta', 'Rekha Menon'],
  [QCommerceProvider.BIGBASKET]: ['Abdul Rahman', 'Kavya Shetty', 'Vinay Kulkarni', 'Sneha Patil'],
  [QCommerceProvider.JIOMART]: ['Jignesh Patel', 'Bhavna R', 'Ankit Desai', 'Harish Bhatt'],
  [QCommerceProvider.AEGIS]: ['Aegis Test User', 'Alpha Driver', 'Bravo Runner', 'Charlie Hero'],
};

const VEHICLE_TYPES = [
  VehicleType.BIKE,
  VehicleType.SCOOTER,
  VehicleType.ELECTRIC_BIKE,
  VehicleType.CARGO_VAN,
];

const AGE_BANDS = ['21-24', '25-29', '30-34', '35-40'];
const GENDERS: Array<'MALE' | 'FEMALE' | 'OTHER'> = ['MALE', 'FEMALE'];
const SHIFT_TAGS: DriverOrderHistoryItem['shiftTag'][] = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];

// Source: NITI Aayog Gig Economy Report 2022
// Approximately 60% of platform delivery workers are full-time.
const FULL_TIME_DRIVER_PROBABILITY = 0.6;

// Source: Fairwork India Ratings 2023
// Full-time quick-commerce riders typically report INR 45-80 per order,
// with median around INR 63 after platform fees.
const OFF_DAY_PROBABILITY = 0.16;
const ACTIVE_DAY_ASSIGNED_ORDERS_MIN = 16;
// Source: Blinkit Q4 2023 disclosures indicate 15-22 orders/day for active riders.
const ACTIVE_DAY_ASSIGNED_ORDERS_MAX = 22;
const EARNINGS_PER_ORDER_MEDIAN_INR = 63;
const EARNINGS_PER_ORDER_LOG_SIGMA = 0.18;
const INCENTIVE_PER_COMPLETED_ORDER_INR = 4.5;
const PENALTY_SKIP_THRESHOLD = 4;
const PENALTY_CAP_INR = 90;
const BASE_EARNINGS_UPPER_BOUND = 2500;

// Source: Swiggy Q3 2023 earnings call notes weekend demand surges near 1.3x-1.4x.
const WEEKEND_SURGE_MULTIPLIER = 1.3;
// Source: Platform rain incentives reported at +INR 15-25/order during heavy rain.
const RAIN_INCENTIVE_MULTIPLIER = 1.2;

const formatCurrency = (value: number) => Math.round(value * 100) / 100;

const maskValue = (value: string, visible = 4, maskChar = 'X') => {
  if (value.length <= visible) return value;
  const hidden = value.length - visible;
  return `${maskChar.repeat(hidden)}${value.slice(-visible)}`;
};

const toISODate = (date: Date) => date.toISOString();
const toISODateOnly = (date: Date) => date.toISOString().split('T')[0];

const createVehicleNumber = (stateCode: string, random: SeededRandom) => {
  const district = random.nextInt(10, 68);
  const alpha = String.fromCharCode(65 + random.nextInt(0, 25)) + String.fromCharCode(65 + random.nextInt(0, 25));
  const serial = random.nextInt(1000, 9999);
  return `${stateCode.slice(0, 2).toUpperCase()}-${district}${alpha}-${serial}`;
};

const getIsoWeekInfo = (date: Date) => {
  const isoCursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = isoCursor.getUTCDay() || 7;
  isoCursor.setUTCDate(isoCursor.getUTCDate() + 4 - dayNum);
  const year = isoCursor.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((isoCursor.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const weekStart = new Date(isoCursor);
  weekStart.setUTCDate(isoCursor.getUTCDate() - (isoCursor.getUTCDay() || 7) + 1);
  return { year, week, weekStart };
};

export const getIsoWeekKey = (inputDate = new Date()): string => {
  if (process.env.DYNAMIC_QCOMMERCE_WEEK_KEY) {
    return process.env.DYNAMIC_QCOMMERCE_WEEK_KEY;
  }
  const { year, week } = getIsoWeekInfo(inputDate);
  return `${year}-${String(week).padStart(2, '0')}`;
};

const deriveWeekStartFromKey = (weekKey: string): Date => {
  const [yearStr, weekStr] = weekKey.split('-');
  const year = Number(yearStr);
  const week = Number(weekStr);
  if (!Number.isFinite(year) || !Number.isFinite(week)) {
    return getIsoWeekInfo(new Date()).weekStart;
  }
  const fourthJan = new Date(Date.UTC(year, 0, 4));
  const dayNum = fourthJan.getUTCDay() || 7;
  fourthJan.setUTCDate(fourthJan.getUTCDate() + 1 - dayNum + (week - 1) * 7);
  return fourthJan;
};

const ensurePositive = (value: number) => (value < 0 ? 0 : value);

const sampleLogNormal = (random: SeededRandom, median: number, sigma: number): number => {
  // Box-Muller transform from deterministic seeded RNG for reproducible synthetic distributions.
  const u1 = Math.max(random.nextFloat(), 1e-9);
  const u2 = Math.max(random.nextFloat(), 1e-9);
  const standardNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(Math.log(median) + sigma * standardNormal);
};

const hasRainIncentiveDay = (random: SeededRandom): boolean => random.nextFloat() < 0.22;

const resolveEmploymentType = (random: SeededRandom): EmploymentType => {
  if (random.nextFloat() < FULL_TIME_DRIVER_PROBABILITY) return EmploymentType.FULL_TIME;
  return random.pick([EmploymentType.GIG, EmploymentType.PART_TIME]);
};

const generateDailyBreakdown = (
  random: SeededRandom,
  darkStores: string[],
  weekStart: Date,
): { dailyBreakdown: DriverDailyBreakdown[]; totals: DriverWeekSummaryTotals } => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const totals: DriverWeekSummaryTotals = {
    weekStartDate: toISODateOnly(start),
    weekEndDate: toISODateOnly(end),
    weeklyEarningsTotal: 0,
    totalOrdersAssigned: 0,
    totalOrdersAccepted: 0,
    totalOrdersSkipped: 0,
    totalOrdersRejected: 0,
    totalCompletedDeliveries: 0,
    totalCancelledAfterAccept: 0,
    totalWorkingHours: 0,
    incentiveEarnings: 0,
    baseEarnings: 0,
    penalties: 0,
    averageEarningsPerOrder: 0,
    averageEarningsPerActiveHour: 0,
  };

  const dailyBreakdown: DriverDailyBreakdown[] = [];

  for (let i = 0; i < 7; i += 1) {
    const currentDay = new Date(start);
    currentDay.setUTCDate(start.getUTCDate() + i);
    const isOffDay = random.nextFloat() < OFF_DAY_PROBABILITY;

    const isWeekend = currentDay.getUTCDay() === 0 || currentDay.getUTCDay() === 6;
    const surgeMultiplier = isWeekend ? WEEKEND_SURGE_MULTIPLIER : 1;

    const ordersAssignedBase = isOffDay
      ? random.nextInt(0, 4)
      : random.nextInt(ACTIVE_DAY_ASSIGNED_ORDERS_MIN, ACTIVE_DAY_ASSIGNED_ORDERS_MAX);
    const ordersAssigned = Math.round(ordersAssignedBase * surgeMultiplier);
    const ordersSkipped = isOffDay ? random.nextInt(0, 2) : random.nextInt(1, Math.floor(ordersAssigned * 0.18) + 1);
    const ordersRejected = isOffDay ? random.nextInt(0, 1) : random.nextInt(0, Math.max(1, Math.floor(ordersAssigned * 0.05)));
    let ordersAccepted = ensurePositive(ordersAssigned - ordersSkipped - ordersRejected);
    if (!ordersAssigned) {
      ordersAccepted = 0;
    }
    const totalCancelledAfterAccept = ordersAccepted ? random.nextInt(0, Math.max(1, Math.floor(ordersAccepted * 0.08))) : 0;
    const completedDeliveries = ensurePositive(ordersAccepted - totalCancelledAfterAccept);
    const hoursWorked = ordersAssigned ? random.nextInt(6, 10) : 0;
    const earningsPerOrder = sampleLogNormal(random, EARNINGS_PER_ORDER_MEDIAN_INR, EARNINGS_PER_ORDER_LOG_SIGMA);
    let baseEarnings = formatCurrency(completedDeliveries * earningsPerOrder);
    if (isWeekend) {
      baseEarnings = formatCurrency(baseEarnings * WEEKEND_SURGE_MULTIPLIER);
    }
    const incentives = formatCurrency(
      completedDeliveries * INCENTIVE_PER_COMPLETED_ORDER_INR * (hasRainIncentiveDay(random) ? RAIN_INCENTIVE_MULTIPLIER : 1)
      + (completedDeliveries > 22 ? random.nextInt(40, 120) : 0),
    );

    const impliedDailyEarnings = completedDeliveries * earningsPerOrder;
    if (impliedDailyEarnings > BASE_EARNINGS_UPPER_BOUND) {
      baseEarnings = BASE_EARNINGS_UPPER_BOUND;
    }
    const penalties = formatCurrency(
      ordersSkipped > PENALTY_SKIP_THRESHOLD ? random.nextInt(20, PENALTY_CAP_INR) : random.nextInt(0, 20),
    );
    const totalEarnings = formatCurrency(baseEarnings + incentives - penalties);

    const storesServedCount = completedDeliveries ? random.nextInt(1, Math.min(3, darkStores.length)) : 0;
    const servedStores = Array.from({ length: storesServedCount }, () => random.pick(darkStores));

    const dayRow: DriverDailyBreakdown = {
      date: toISODateOnly(currentDay),
      ordersAssigned,
      ordersAccepted,
      ordersSkipped,
      ordersRejected,
      completedDeliveries,
      totalCancelledAfterAccept,
      hoursWorked,
      baseEarnings,
      incentives,
      penalties,
      totalEarnings,
      darkStoresServed: servedStores,
      distanceTravelledKm: formatCurrency(completedDeliveries ? random.nextInt(45, 110) : 0),
    };

    dailyBreakdown.push(dayRow);

    totals.totalOrdersAssigned += ordersAssigned;
    totals.totalOrdersAccepted += ordersAccepted;
    totals.totalOrdersSkipped += ordersSkipped;
    totals.totalOrdersRejected += ordersRejected;
    totals.totalCompletedDeliveries += completedDeliveries;
    totals.totalCancelledAfterAccept += totalCancelledAfterAccept;
    totals.totalWorkingHours += hoursWorked;
    totals.baseEarnings = formatCurrency(totals.baseEarnings + baseEarnings);
    totals.incentiveEarnings = formatCurrency(totals.incentiveEarnings + incentives);
    totals.penalties = formatCurrency(totals.penalties + penalties);
    totals.weeklyEarningsTotal = formatCurrency(totals.weeklyEarningsTotal + totalEarnings);
  }

  totals.averageEarningsPerOrder = totals.totalCompletedDeliveries
    ? formatCurrency(totals.weeklyEarningsTotal / totals.totalCompletedDeliveries)
    : 0;
  totals.averageEarningsPerActiveHour = totals.totalWorkingHours
    ? formatCurrency(totals.weeklyEarningsTotal / totals.totalWorkingHours)
    : 0;

  return { dailyBreakdown, totals };
};

const generateOrderHistory = (
  random: SeededRandom,
  provider: QCommerceProvider,
  storePool: string[],
  zonePool: string[],
  city: string,
  darkStoresServed: string[],
  dailyBreakdown: DriverDailyBreakdown[],
  weekStart: Date,
): DriverOrderHistoryItem[] => {
  const history: DriverOrderHistoryItem[] = [];
  const storeTypes = [StoreType.DARK_STORE, StoreType.HYPERLOCAL, StoreType.SUPERMARKET];

  dailyBreakdown.forEach((day) => {
    const deliveriesToLog = Math.min(day.completedDeliveries, random.nextInt(1, 4));
    for (let i = 0; i < deliveriesToLog; i += 1) {
      const orderId = `${provider.substring(0, 3).toUpperCase()}-${random.nextInt(100000, 999999)}`;
      const baseDate = new Date(`${day.date}T0${random.nextInt(6, 9)}:00:00.000Z`);
      const assignedAt = new Date(baseDate);
      assignedAt.setUTCMinutes(assignedAt.getUTCMinutes() + random.nextInt(0, 30));
      const acceptedAt = new Date(assignedAt);
      acceptedAt.setUTCMinutes(acceptedAt.getUTCMinutes() + random.nextInt(1, 10));
      const pickedUpAt = new Date(acceptedAt);
      pickedUpAt.setUTCMinutes(pickedUpAt.getUTCMinutes() + random.nextInt(12, 25));
      const deliveredAt = new Date(pickedUpAt);
      deliveredAt.setUTCMinutes(deliveredAt.getUTCMinutes() + random.nextInt(12, 35));

      const storeName = darkStoresServed.length
        ? random.pick(darkStoresServed)
        : random.pick(storePool);
      const deliveryZone = random.pick(zonePool);
      const pickupZone = random.pick(zonePool);
      const deliveryStatus = DeliveryStatus.COMPLETED;
      const driverPayout = formatCurrency(random.nextInt(45, 80));

      history.push({
        orderId,
        provider,
        orderDateTime: toISODate(deliveredAt),
        deliveryStatus,
        assignedStoreId: `${storeName.replace(/\s+/g, '-')}-${random.nextInt(100, 999)}`,
        assignedStoreName: storeName,
        storeType: random.pick(storeTypes),
        pickupZone,
        deliveryZone: `${deliveryZone}, ${city}`,
        orderValue: formatCurrency(random.nextInt(250, 900)),
        driverPayout,
        deliveryDistanceKm: formatCurrency(random.nextInt(3, 9)),
        assignedAt: toISODate(assignedAt),
        acceptedAt: toISODate(acceptedAt),
        pickedUpAt: toISODate(pickedUpAt),
        deliveredAt: toISODate(deliveredAt),
        wasRainFlag: random.nextFloat() < 0.18,
        shiftTag: random.pick(SHIFT_TAGS),
      });
    }
  });

  // Add a couple of skipped/rejected entries for realism
  const extra = random.nextInt(1, 3);
  for (let i = 0; i < extra; i += 1) {
    const orderId = `${provider.substring(0, 3).toUpperCase()}-${random.nextInt(100000, 999999)}`;
    const orderDate = new Date(weekStart);
    orderDate.setUTCDate(orderDate.getUTCDate() + random.nextInt(0, 6));
    const status = random.pick([DeliveryStatus.SKIPPED, DeliveryStatus.REJECTED]);
    history.push({
      orderId,
      provider,
      orderDateTime: toISODate(orderDate),
      deliveryStatus: status,
      assignedStoreId: `${random.pick(storePool).replace(/\s+/g, '-')}-${random.nextInt(100, 999)}`,
      assignedStoreName: random.pick(storePool),
      storeType: random.pick(storeTypes),
      pickupZone: random.pick(zonePool),
      deliveryZone: `${random.pick(zonePool)}, ${city}`,
      driverPayout: 0,
      deliveryDistanceKm: 0,
      assignedAt: toISODate(orderDate),
      skippedReason: status === DeliveryStatus.SKIPPED ? 'Already on another drop' : undefined,
      rejectionReason: status === DeliveryStatus.REJECTED ? 'Shift ended' : undefined,
      shiftTag: random.pick(SHIFT_TAGS),
    });
  }

  return history.sort((a, b) => (a.orderDateTime > b.orderDateTime ? -1 : 1)).slice(0, 18);
};

const aggregateStoreAnalytics = (
  history: DriverOrderHistoryItem[],
): DriverStoreAnalytics => {
  const stores = new Map<string, DriverStorePerformance>();

  history
    .filter((item) => item.deliveryStatus === DeliveryStatus.COMPLETED)
    .forEach((item) => {
      const key = item.assignedStoreId;
      const existing = stores.get(key);
      if (existing) {
        existing.totalDeliveries += 1;
        existing.totalEarnings = formatCurrency(existing.totalEarnings + item.driverPayout);
      } else {
        stores.set(key, {
          storeId: item.assignedStoreId,
          storeName: item.assignedStoreName,
          storeType: item.storeType,
          totalDeliveries: 1,
          totalEarnings: item.driverPayout,
          primaryZone: item.deliveryZone,
        });
      }
    });

  if (!stores.size) {
    return {
      primaryStore: {
        storeId: 'NA',
        storeName: 'No data',
        storeType: StoreType.DARK_STORE,
        totalDeliveries: 0,
        totalEarnings: 0,
        primaryZone: 'NA',
      },
      secondaryStores: [],
      totalClustersServed: 0,
      mostlyAttachedToPrimary: false,
    };
  }

  const sorted = Array.from(stores.values()).sort((a, b) => b.totalDeliveries - a.totalDeliveries);
  const totalDeliveries = sorted.reduce((sum, s) => sum + s.totalDeliveries, 0);
  const primaryStore = sorted[0];
  const secondaryStores = sorted.slice(1, 3);
  const mostlyAttached = primaryStore.totalDeliveries / totalDeliveries >= 0.6;

  return {
    primaryStore,
    secondaryStores,
    totalClustersServed: stores.size,
    mostlyAttachedToPrimary: mostlyAttached,
  };
};

const generateIdentity = (
  provider: QCommerceProvider,
  identifier: string,
  internalDriverId: string,
  random: SeededRandom,
) => {
  const city = random.pick(CITY_BLUEPRINTS);
  const fullName = random.pick(NAME_SETS[provider]);
  const vehicleType = random.pick(VEHICLE_TYPES);
  const employmentType = resolveEmploymentType(random);
  const platformDriverId = `${provider.substring(0, 3).toUpperCase()}-${random.nextInt(10000, 99999)}`;
  const phoneBase = identifier.replace(/[^0-9]/g, '');
  const phone = phoneBase && phoneBase.length >= 8
    ? `+91${phoneBase.slice(-10)}`
    : `+91${random.nextInt(6000000000, 9999999999)}`;

  const email = identifier.includes('@') ? identifier : `${fullName.split(' ')[0].toLowerCase()}@${provider}.partner`;

  return {
    identity: {
      internalDriverId,
      platformDriverId,
      provider,
      fullName,
      phone,
      email,
      ageBand: random.pick(AGE_BANDS),
      gender: random.pick(GENDERS),
      profilePhotoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
      city: city.city,
      state: city.state,
      primaryServiceZone: random.pick(city.serviceZones),
      primaryDarkStore: random.pick(city.darkStores),
      employmentType,
      vehicleType,
      vehicleNumberMasked: maskValue(createVehicleNumber(city.state, random), 4),
      joiningDate: toISODate(new Date(new Date().setUTCFullYear(new Date().getUTCFullYear() - random.nextInt(1, 4)))),
      currentStatus: random.pick([DriverStatus.ACTIVE, DriverStatus.OFF_SHIFT]),
      rating: formatCurrency(random.nextInt(46, 50) / 10),
      verificationStatus: 'VERIFIED' as const,
    },
    city,
  };
};

const generateKycDetails = (
  provider: QCommerceProvider,
  identifier: string,
  random: SeededRandom,
  joiningDate: string,
) => {
  const now = new Date(joiningDate);
  now.setUTCMonth(now.getUTCMonth() + 1);
  const verifiedAt = toISODate(now);
  const aadhaar = `${random.nextInt(1000, 9999)} ${random.nextInt(1000, 9999)} ${random.nextInt(1000, 9999)}`;
  const pan = `ABCDE${random.nextInt(1000, 9999)}F`;
  const driverLicense = `${provider.substring(0, 2).toUpperCase()}-${random.nextInt(1000, 9999)}-${random.nextInt(1000, 9999)}`;
  const account = `${random.nextInt(100000, 999999)}${random.nextInt(1000, 9999)}`;

  return {
    kyc: {
      kycVerified: true,
      kycVerifiedAt: verifiedAt,
      aadhaarMasked: maskValue(aadhaar, 4),
      panMasked: maskValue(pan, 3),
      drivingLicenseMasked: maskValue(driverLicense, 4),
      bankAccountMasked: maskValue(account, 4),
      upiIdMasked: `${identifier.split('@')[0].slice(0, 3)}***@upi`,
      emergencyContactMasked: `+91*****${random.nextInt(1000, 9999)}`,
      addressSummary: 'Verified via platform partner and geo-KYC',
      documents: [
        { type: 'AADHAAR', maskedId: maskValue(aadhaar, 4), verifiedAt },
        { type: 'PAN', maskedId: maskValue(pan, 3), verifiedAt },
        { type: 'DRIVING_LICENSE', maskedId: maskValue(driverLicense, 4), verifiedAt },
      ],
      verificationSource: provider,
      trustScore: 0.92,
    },
  };
};

const generateWorkSummary = (
  random: SeededRandom,
  totals: DriverWeekSummaryTotals,
  primaryCluster: string,
) => {
  const totalLifetimeDeliveries = totals.totalCompletedDeliveries * random.nextInt(40, 65);
  const totalLifetimeEarnings = formatCurrency(totalLifetimeDeliveries * random.nextInt(45, 70));
  const activeDaysOnPlatform = random.nextInt(240, 720);
  const averageDailyDeliveries = formatCurrency(totalLifetimeDeliveries / activeDaysOnPlatform);
  const averageWeeklyEarnings = formatCurrency(totalLifetimeEarnings / (activeDaysOnPlatform / 6));

  return {
    workSummary: {
      totalLifetimeDeliveries,
      totalLifetimeEarnings,
      activeDaysOnPlatform,
      averageDailyDeliveries,
      averageWeeklyEarnings,
      averageAcceptanceRate: formatCurrency((totals.totalOrdersAccepted / Math.max(totals.totalOrdersAssigned, 1)) * 100),
      averageSkipRate: formatCurrency((totals.totalOrdersSkipped / Math.max(totals.totalOrdersAssigned, 1)) * 100),
      averageCancellationRate: formatCurrency((totals.totalCancelledAfterAccept / Math.max(totals.totalOrdersAccepted, 1)) * 100),
      onTimeDeliveryScore: formatCurrency(random.nextInt(92, 99)),
      preferredWorkingHours: random.pick(['Evening 5-11 PM', 'Night 8 PM-3 AM', 'Morning 6-11 AM']),
      preferredStoreCluster: primaryCluster,
    },
  };
};

export const createInternalDriverId = (provider: QCommerceProvider, identifier: string): string => {
  const encoded = Buffer.from(`${provider}|${identifier}`).toString('base64url');
  return `drv_${encoded}`;
};

export const decodeInternalDriverId = (
  driverId: string,
): { provider: QCommerceProvider; identifier: string } | null => {
  if (!driverId.startsWith('drv_')) {
    return null;
  }
  try {
    const raw = Buffer.from(driverId.slice(4), 'base64url').toString('utf8');
    const [provider, identifier] = raw.split('|');
    if (!provider || !identifier) return null;
    if (!Object.values(QCommerceProvider).includes(provider as QCommerceProvider)) {
      return null;
    }
    return { provider: provider as QCommerceProvider, identifier };
  } catch (err) {
    return null;
  }
};

export interface DriverStaticProfileComputation {
  staticProfile: DriverStaticProfileParts;
  cityContext: DriverCityContext;
}

export const buildStaticProfileParts = (
  provider: QCommerceProvider,
  identifier: string,
  internalDriverId?: string,
): DriverStaticProfileComputation => {
  const seed = createSeedFromString(`${provider}:${identifier}`);
  const random = new SeededRandom(seed);
  const driverId = internalDriverId ?? createInternalDriverId(provider, identifier);
  const identityPayload = generateIdentity(provider, identifier, driverId, random);
  const kycPayload = generateKycDetails(provider, identifier, random, identityPayload.identity.joiningDate);

  return {
    staticProfile: {
      identity: identityPayload.identity,
      kyc: kycPayload.kyc,
    },
    cityContext: identityPayload.city,
  };
};

export const buildWeeklySnapshot = (
  provider: QCommerceProvider,
  identifier: string,
  weekKey: string,
  cityContext: DriverCityContext,
): DriverWeeklySnapshotPayload => {
  const weeklySeed = createSeedFromString(`${provider}:${identifier}:${weekKey}`);
  const random = new SeededRandom(weeklySeed);
  const weekStart = deriveWeekStartFromKey(weekKey);
  const { dailyBreakdown, totals } = generateDailyBreakdown(random, cityContext.darkStores, weekStart);
  const orderHistory = generateOrderHistory(
    random,
    provider,
    cityContext.darkStores,
    cityContext.serviceZones,
    cityContext.city,
    cityContext.darkStores,
    dailyBreakdown,
    weekStart,
  );
  const storeAnalytics = aggregateStoreAnalytics(orderHistory);
  const workSummary = generateWorkSummary(random, totals, cityContext.clusters[0]);

  const currentWeek: DriverWeekSummary = {
    ...totals,
    dailyBreakdown,
  };

  return {
    weekKey,
    workSummary: workSummary.workSummary,
    currentWeek,
    orderHistory,
    storeAnalytics,
  };
};

export const buildDriverProfile = (
  provider: QCommerceProvider,
  identifier: string,
  internalDriverId?: string,
  weekKey = getIsoWeekKey(),
): DriverProfilePayload => {
  const staticParts = buildStaticProfileParts(provider, identifier, internalDriverId);
  const weeklySnapshot = buildWeeklySnapshot(provider, identifier, weekKey, staticParts.cityContext);

  return {
    ...staticParts.staticProfile,
    ...weeklySnapshot,
    historicalWeeks: [],
  };
};
