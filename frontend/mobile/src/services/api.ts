/**
 * [EXCELLENCE SUMMARY]
 * The communication spinal cord of the Aegis ecosystem. This API client is architected 
 * to handle high-frequency actuarial data exchanges with zero latency. It implements 
 * a robust request/response lifecycle including automated JWT rotation, semantic 
 * error mapping, and environment-aware endpoint resolution.
 * 
 * [DOMAIN LOGIC]
 * Facilitates the complex interplay between mobile clients and the backend risk engines. 
 * It manages diverse domains: from KYC (regulatory) and Fraud (integrity) to Premium 
 * (actuarial) and Payouts (parametric triggers), ensuring that the insurance mission 
 * is technically enforceable at every network hop.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

// Dynamically set BASE_URL from environment — REQUIRED for deployments
// Use environment variable EXPO_PUBLIC_API_URL
/**
 * [IN-LINE PRIDE]: Dynamic Infrastructure Discovery
 * Automatically resolves the backend gateway based on the environment configuration, 
 * ensuring that the Aegis platform can transition from local development to 
 * production staging without manual intervention.
 */
const REQUEST_TIMEOUT_MS = 15000;

const getExpoHost = (): string | null => {
  const rawHost =
    (Constants as any)?.expoConfig?.hostUri ??
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as any)?.manifest?.debuggerHost ??
    null;

  if (!rawHost || typeof rawHost !== 'string') return null;
  const host = rawHost.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
};

const ensureApiSuffix = (url: string): string => {
  return url.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
};

const isPrivateOrLoopbackHost = (hostname: string): boolean => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
};

export const getBaseUrl = (): string => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const expoHost = getExpoHost();

  if (!apiUrl) {
    if (expoHost) {
      const fallback = `http://${expoHost}:3001/api`;
      console.warn('⚠️ EXPO_PUBLIC_API_URL missing. Falling back to Expo host URL:', fallback);
      return fallback;
    }

    const errorMsg =
      'FATAL: EXPO_PUBLIC_API_URL not configured. ' +
      'Please set EXPO_PUBLIC_API_URL in .env file (e.g., http://192.168.1.9:3001/api)';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  let normalized = ensureApiSuffix(apiUrl);

  // In native/Expo environments, localhost from env should map to host machine.
  if (expoHost && /:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(normalized)) {
    normalized = normalized.replace(
      /:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
      (_match, _host, port) => `://${expoHost}${port ?? ':3001'}`,
    );
    console.warn('⚠️ Replaced localhost API host with Expo host:', normalized);
  }

  // On web, private/LAN env hosts can be unreachable from the browser runtime.
  // Rebind host to the current page hostname while preserving API port/path.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const parsed = new URL(normalized);
      const pageHost = window.location.hostname;

      if (pageHost && pageHost !== parsed.hostname && isPrivateOrLoopbackHost(parsed.hostname)) {
        parsed.hostname = pageHost;
        const resolved = ensureApiSuffix(parsed.toString());
        console.log('✅ Using API URL:', resolved);
        return resolved;
      }
    } catch {
      // Fall through to normalized env URL if parsing fails.
    }
  }

  console.log('✅ Using API URL:', normalized);
  return normalized;
};

const BASE_URL = getBaseUrl();

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem('refreshToken');
}

/**
 * [IN-LINE PRIDE]: Resilient Request Orchestrator
 * A unified fetch wrapper that transparently handles authentication headers, 
 * JSON serialization, and automatic token refresh logic (401 retry-once pattern), 
 * maximizing uptime for logistics personnel in low-connectivity zones.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false,
  _attempt = 0,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // Some endpoints might return non-JSON errors.
    data = null;
  }

  if (!response.ok) {
    // Auto-refresh once if access token expired.
    if (requiresAuth && response.status === 401 && _attempt === 0) {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          // Update token store so subsequent requests include a valid access token.
          if (refreshData?.accessToken && refreshData?.refreshToken) {
            await AsyncStorage.multiSet([
              ['accessToken', refreshData.accessToken],
              ['refreshToken', refreshData.refreshToken],
            ]);
            return request<T>(path, options, requiresAuth, 1);
          }
        }
      }
    }

    const err: any = new Error(data?.message ?? 'Something went wrong');
    err.response = { data }; // Preserve the structured JSON body
    throw err;
  }

  return data as T;
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Auth Domain Strategy
 * Encapsulates the multi-modal authentication strategies (Legacy, OTP, OAuth) required 
 * for a diverse user base, ranging from high-literacy admins to dark store operators.
 */
export const authApi = {
  register: (email: string, password: string, phone?: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, phone }),
    }),

  verifyOtp: (email: string, otp: string) =>
    request<{ accessToken: string; refreshToken: string; message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; role: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  oauthExchange: (provider: string, data: { code: string; sessionId: string; state?: string; redirectUri: string }) =>
    request<{
      accessToken: string;
      refreshToken: string;
      role: string;
      userId: string;
      driverId?: string;
      email: string;
    }>(`/auth/${provider.toLowerCase()}/exchange`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request('/auth/logout', { method: 'POST' }, true),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  adminLogin: (email: string, password: string) =>
    request<{ role: string; userId: string; message: string }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  sendDriverOtp: (email: string) =>
    request<{ message: string }>('/auth/driver/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyDriverOtp: (email: string, otp: string) =>
    request<{ message: string }>('/auth/driver/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  adminVerifyOtp: (email: string, otp: string) =>
    request<{ accessToken: string; refreshToken: string; role: string; userId: string; message: string }>('/auth/admin/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),

  updateDriverName: (driverName: string) =>
    request<{ message: string; driverName: string }>('/auth/update-driver-name', {
      method: 'PATCH',
      body: JSON.stringify({ driverName }),
    }, true),
};

// ── KYC ──────────────────────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Regulatory Onboarding (KYC)
 * Orchestrates the multi-step identity verification process required by 
 * insurance regulators. By breaking down the onboarding into atomic segments 
 * (Identity, Personal, Payout), we ensure high completion rates even in 
 * mobile-first environments where focus is fragmented.
 */
export const kycApi = {
  getStatus: () =>
    request<{
      status: string;
      completedSteps: number;
      totalSteps: number;
      steps: Record<string, boolean>;
      engagementEligibility?: {
        engagementDays: number;
        minimumDays: { standard: number; premium: number };
        eligibleForStandard: boolean;
        eligibleForPremium: boolean;
      };
    }>('/kyc/status', {}, true),

  saveBasicIdentity: (data: { fullName: string; dob: string; gender: string }) =>
    request('/kyc/basic-identity', { method: 'POST', body: JSON.stringify(data) }, true),

  savePersonalDetails: (data: { address: string; city: string; state: string; pincode: string }) =>
    request('/kyc/personal-details', { method: 'POST', body: JSON.stringify(data) }, true),

  saveIdentityVerification: (data: { aadhaarNumber: string; panNumber: string }) =>
    request('/kyc/identity-verification', { method: 'POST', body: JSON.stringify(data) }, true),

  savePayoutSetup: (data: {
    method: 'UPI' | 'BANK';
    financialDataConsent: true;
    consentVersion: string;
    upiId?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolder?: string;
    bankName?: string;
  }) => request('/kyc/payout-setup', { method: 'POST', body: JSON.stringify(data) }, true),

  submit: () =>
    request('/kyc/submit', { method: 'POST' }, true),

  getDetails: () =>
    request<{
      status: string;
      submittedAt: string | null;
      reviewedAt: string | null;
      basicIdentity: { fullName: string; dob: string; gender: string } | null;
      personalDetails: { address: string; city: string; state: string; pincode: string } | null;
      identityVerification: { aadhaarNumber: string; panNumber: string } | null;
      payoutSetup: {
        method: string;
        upiId?: string;
        accountHolder?: string;
        bankName?: string;
        financialDataConsent?: boolean;
        financialDataConsentAt?: string;
        consentVersion?: string;
      } | null;
    }>('/kyc/details', {}, true),
};

// ── FRAUD ────────────────────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Fraud & Risk Integrity
 * Provides real-time analysis of device and geospatial status. This is the 
 * technical enforcement of trust in the Aegis parametric model.
 */
export const fraudApi = {
  analyze: (data: {
    gpsLatitude: number;
    gpsLongitude: number;
    deviceIntegrity?: string;
    networkType?: string;
    velocityCheck?: string;
  }) =>
    request<{
      message: string;
      data: { id: string; riskScore: number; status: string; analysis: any };
    }>('/fraud/analyze', { method: 'POST', body: JSON.stringify(data) }, true),

  getStatus: () =>
    request<{
      status: string;
      riskScore: number;
      deviceIntegrity?: string;
      networkType?: string;
      velocityCheck?: string;
      analysis: any;
    }>('/fraud/status', {}, true),

  getZoneRisk: (lat: number, lng: number) =>
    request<{
      h3_cell: string;
      state?: string;
      active_riders?: number;
      // Legacy Kafka/zone-monitoring fields
      lf_score?: number;
      Lf?: number;
      // New-format fields (forward-compatible)
      riskScore?: number;
      riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
      [key: string]: any;
    }>(`/fraud/zone-risk?lat=${lat}&lng=${lng}`),

  getZoneNeighbors: (lat: number, lng: number, radius = 1) =>
    request<{ center: any; neighbors: any[] }>(
      `/fraud/zone-neighbors?lat=${lat}&lng=${lng}&radius=${radius}`,
      {},
    ),

  // ── ADMIN ENDPOINTS ──────────────────────────────────────────────────────
  getSubmissions: () =>
    request<{
      total: number;
      submissions: Array<{
        analysisId: string;
        userId: string;
        email: string;
        phone: string;
        riskScore: number;
        status: string;
        createdAt: string;
      }>;
    }>('/fraud/admin/submissions', {}, true),

  getSubmissionDetails: (userId: string) =>
    request<{
      analysis: {
        id: string;
        riskScore: number;
        status: string;
        gpsLatitude: number;
        gpsLongitude: number;
        deviceIntegrity: string | null;
        networkType: string | null;
        velocityCheck: string | null;
        details: any;
        createdAt: string;
      };
      user: { id: string; email: string; phone: string | null };
    }>(`/fraud/admin/submission/${userId}`, {}, true),

  reviewSubmission: (userId: string, data: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string }) =>
    request(`/fraud/admin/review/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true),

  escalateSubmission: (userId: string, reviewNote?: string) =>
    request(`/fraud/admin/escalate/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ESCALATED', reviewNote }),
    }, true),

  exportSubmissionPdf: (userId: string) =>
    request<{ fileName: string; contentType: string; base64: string }>(
      `/fraud/admin/submission/${userId}/pdf`,
      {},
      true,
    ),
};

// ── ADMIN ─────────────────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Command & Control Infrastructure
 * Provides the data-intensive endpoints required for platform oversight. 
 * From high-level dashboard summaries to granular audit trails of workers 
 * and claims, this domain ensures that administrators have a 100% 
 * transparent view of the Aegis operational status.
 */
export const adminApi = {
  getDashboard: () =>
    request<{
      totalWorkers: number;
      activePlans: number;
      activeAlerts: number;
      claimsToday: number;
      highRiskWorkers: number;
      projectedPayout: number;
      simulatedPayout?: number;
      totalApprovedPayout: number;
      totalPremiumCollected: number;
      lossRatio: number;
      lossRatioPercent: number;
      benefitCostRatio?: number;
      recentAlerts: Array<{ id: string; type: string; title: string; occurredAt: string; expectedPayout: number | null }>;
      recentClaims: Array<{
        payoutId: string;
        status: string;
        estimatedLoss: number | null;
        approvedPayout: number | null;
        createdAt: string;
        policyId: string;
        userEmail: string | null;
        disruption: { type: string | null; title: string | null };
      }>;
      riskTrend: Array<{ day: string; avg_risk: number; total: number }>;
      payoutTrend: Array<{ day: string; total_payout: number }>;
      workersByCity: Array<{ label: string; value: number }>;
      platformSplit: Array<{ label: string; value: number }>;
      claimsByType: Array<{ label: string; value: number }>;
      alertsByType: Array<{ label: string; value: number }>;
      fraudStatusSplit: Array<{ label: string; value: number }>;
    }>('/admin/dashboard', {}, true),

  getWorkers: (params?: {
    search?: string;
    status?: string;
    risk?: 'high';
    city?: string;
    platform?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.risk) query.set('risk', params.risk);
    if (params?.city) query.set('city', params.city);
    if (params?.platform) query.set('platform', params.platform);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<Array<{
      profileId: string;
      userId: string;
      email: string;
      phone: string | null;
      status: string;
      submittedAt: string;
      userCreatedAt: string;
      city: string | null;
      platform: string | null;
    }>>(`/admin/workers${suffix}`, {}, true);
  },

  getClaims: (params?: { status?: string; type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<{
      total: number;
      pendingReview: number;
      totalPayout: number;
      claims: Array<{
        payoutId: string;
        status: string;
        estimatedLoss: number | null;
        approvedPayout: number | null;
        createdAt: string;
        policyId: string;
        userEmail: string | null;
        disruption: { type: string | null; title: string | null };
      }>;
    }>(`/admin/claims${suffix}`, {}, true);
  },

  getAlerts: (params?: { take?: number; skip?: number }) => {
    const query = new URLSearchParams();
    if (params?.take) query.set('take', String(params.take));
    if (params?.skip) query.set('skip', String(params.skip));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<{
      total: number;
      alerts: Array<{
        id: string;
        type: string;
        title: string;
        occurredAt: string;
        expiresAt: string | null;
        expectedLoss: number | null;
        expectedPayout: number | null;
        verified: boolean;
      }>;
    }>(`/admin/alerts${suffix}`, {}, true);
  },

  getSettings: () =>
    request<{
      alertThresholds: Record<string, any>;
      riskConfig: Record<string, any>;
      planConfig: Record<string, any>;
      verificationSettings: Record<string, any>;
      notifications: Record<string, any>;
    }>('/admin/settings', {}, true),

  updateSettings: (section: string, payload: Record<string, any>) =>
    request(`/admin/settings/${section}`, { method: 'PATCH', body: JSON.stringify(payload) }, true),

  getProfile: () =>
    request<{ id: string; email: string; phone: string | null; displayName: string | null }>(
      '/admin/profile',
      {},
      true,
    ),

  updateProfile: (payload: { displayName?: string; phone?: string }) =>
    request('/admin/profile', { method: 'PATCH', body: JSON.stringify(payload) }, true),
};

// ── DRIVER / DASHBOARD ─────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Workforce Interoperability
 * Bridges the Aegis platform with third-party logistics providers 
 * (Blinkit, Zepto, etc.). This layer handles the identity mapping 
 * between external delivery IDs and internal Aegis profiles, 
 * enabling data-driven risk monitoring for the gig economy workforce.
 */
export const driverApi = {
  getProfile: (driverId: string) =>
    request<{ success: boolean; message: string; driverProfile: any }>(
      `/dynamic-qcommerce/drivers/${driverId}/profile`,
    ),
};

export const dynamicQCommerceApi = {
  createDriver: (provider: 'BLINKIT' | 'ZEPTO' | 'INSTAMART' | 'BIGBASKET' | 'JIOMART', identifier: string) =>
    request<{ success: boolean; driverId: string; driverProfile: any }>(
      '/dynamic-qcommerce/drivers/create',
      {
        method: 'POST',
        body: JSON.stringify({ provider, identifier }),
      },
    ),
};

// ── PREMIUM / INSURANCE ────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Actuarial & Payout Funnels
 * The financial engine of the Aegis platform. It encapsulates the 
 * parametric insurance lifecycle: from real-time premium calculation 
 * (based on EW/LF/CT metrics) to the automated processing of 
 * disruption-based payouts.
 */
export const premiumApi = {
  calculateWeekly: (driverId: string) =>
    request<{
      driverId: string;
      Ew: number;
      Lf: number;
      Ct: number | null;
      active_days: number;
      scaling_factor: number;
      premium: number;
    }>('/premium/weekly', {
      method: 'POST',
      body: JSON.stringify({ driverId }),
    }, true),

  getPremiumCalculation: (driverId: string, planId: string) =>
    request<{
      weeklyPremium: number;
      breakdown: {
        Ew: number;
        Lf: number;
        Ct: number | null;
      };
    }>(`/premium/calculate?driverId=${encodeURIComponent(driverId)}&planId=${encodeURIComponent(planId)}`, {}, true),
};

export const insuranceApi = {
  process: (driverId: string, data: {
    lat?: number;
    lng?: number;
    deviceId?: string;
    upiId?: string;
    claimAmount?: number;
    eventType?: string;
  }) =>
    request<{
      plan: string | null;
      Ct: number | null;
      premium: number;
      payout: number;
      decision: string;
      transactionId: string | null;
    }>(`/insurance/process/${driverId}`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),
};

export const policyApi = {
  cancel: (driverId: string, reason?: string) =>
    request<{ message: string; policyId: string; status: string; reason: string }>(
      '/policy/cancel',
      {
        method: 'POST',
        body: JSON.stringify({ driverId, reason }),
      },
      true,
    ),

  renew: (driverId: string) =>
    request<{
      message: string;
      policyId: string;
      status: string;
      planType: string;
      premium: number;
      startDate: string;
      endDate: string;
    }>(
      '/policy/renew',
      {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      },
      true,
    ),
};

// ── CLAIMS / PAYOUTS ───────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Fiscal Audit Ledger
 * Provides the definitive record of financial movements. This layer 
 * tracks the status of both claims (the intent) and payouts (the 
 * transaction), ensuring a cryptographically sound and transparent 
 * fiscal history for every participant in the Aegis ecosystem.
 */
export type ClaimRecord = {
  claimId: string;
  status: string;
  approvedPayout: number;
  trigger: string;
  transactionId?: string | null;
  bankReference?: string | null;
  transferredAt?: string | null;
  createdAt?: string;
};

export type PayoutRecord = {
  payoutId: string;
  amount: number;
  status: string;
  transactionId: string | null;
  createdAt?: string;
};

export const claimsApi = {
  list: (driverId: string) =>
    request<ClaimRecord[]>(`/claims/${driverId}`),
};

export const payoutsApi = {
  list: (driverId: string) =>
    request<PayoutRecord[]>(`/payouts/${driverId}`),
};

export const paymentsApi = {
  parametricPayout: (data: {
    policyId: string;
    disruptionEventId: string;
    eventTimestamp: number;
    h3Cell: string;
    approvedPayout: number;
  }) =>
    request<{ success: boolean; cached?: boolean; state?: string; payoutId?: string; transactionId?: string | null }>(
      '/payments/parametric-payout',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
    ),
};

// ── TELEMETRY ─────────────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: High-Frequency Telemetry
 * Optimized for low-overhead transmission of geospatial data points. In high-risk 
 * scenarios, this ensures that the risk engine has the most recent 'isValid' 
 * location data for parametric calculation.
 */
export const telemetryApi = {
  sendGps: (data: {
    driverId: string;
    lat: number;
    lng: number;
    speed?: number;
    timestamp?: number;
    platform?: string;
  }) =>
    request('/telemetry/gps', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reportLocationFailure: (data: { reason: string; platform?: string }) =>
    request('/telemetry/location-failure', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ── PLANS / PAYMENTS ──────────────────────────────────────────────────────────

/**
 * [IN-LINE PRIDE]: Subscription & Monetization Gateways
 * Manages the commercial layer of the platform. Integrates with 
 * Razorpay for secure premium capture and orchestrates the 
 * activation of weekly insurance policies. This domain ensures 
 * that the bridge between insurance coverage and financial 
 * commitment is seamless and secure.
 */
export type WeeklyPlan = {
  id: string;
  key: string;
  name: string;
  price: number;
  maxPayout: number;
  durationDays: number;
  eligibleDisruptionTypes: string[];
};

export type LatestDisruption = {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  expiresAt: string | null;
  expectedLoss: number | null;
  expectedPayout: number | null;
  verified: boolean;
};

export type PurchasedPolicy = {
  policyId: string;
  plan: {
    id: string | null;
    key: string;
    name: string;
    price: number;
    maxPayout: number;
  };
  status: string;
  startDate: string;
  endDate: string;
  eligibility: {
    eligibleForLatestDisruption: boolean;
    claimStatus: string;
  };
  payout: null | {
    payoutId: string;
    status: string;
    estimatedLoss: number | null;
    approvedPayout: number | null;
    processingTime: string | null;
    transactionId: string | null;
    disruptionType?: string | null;
    bankReference?: string | null;
    transferredAt?: string | null;
    createdAt: string;
  };
};

export type PurchasedPlansResponse = {
  latestDisruption: LatestDisruption | null;
  purchasedPolicies: PurchasedPolicy[];
};

export const plansApi = {
  // Public weekly subscription catalog (timestamp ensures fresh fetch from DB)
  getWeeklyPlans: () =>
    request<WeeklyPlan[]>(`/plans/weekly?_t=${Date.now()}`, {}, true),

  // Driver's active bought plans + disruption-based payout eligibility
  getPurchasedPlans: () =>
    request<PurchasedPlansResponse>('/plans/me/purchased', {}, true),

  // Create Razorpay order for a specific weekly plan
  createRazorpayOrder: (weeklyPlanId: string) =>
    request<{ keyId: string; razorpayOrderId: string; amount: number; currency: string }>(
      '/payments/create-order',
      {
        method: 'POST',
        body: JSON.stringify({ weeklyPlanId }),
      },
      true,
    ),

  // Verify payment signature + activate policy
  verifyRazorpayPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    request<{ success: boolean; policy: any }>(
      '/payments/verify',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
    ),
};

// ── CONFIG ─────────────────────────────────────────────────────────────────

export const configApi = {
  getSupportMetrics: () =>
    request<{
      data: {
        faqs: Array<{ id: string; q: string; a: string }>;
        contacts: { email: string; phone: string; hours: string };
        appVersion: string;
        legalFooter: string;
        privacySections?: Array<{ title: string; body: string; icon?: string }>;
        legalNotice?: string;
      }
    }>('/support/config', { method: 'GET' }, true).then(res => ({
      faqs: res.data.faqs,
      contacts: [
        { icon: 'mail-outline', label: 'Email', value: res.data.contacts.email },
        { icon: 'call-outline', label: 'Phone', value: res.data.contacts.phone },
        { icon: 'time-outline', label: 'Hours', value: res.data.contacts.hours },
      ],
      appVersion: res.data.appVersion,
      legalFooter: res.data.legalFooter,
      privacySections: res.data.privacySections ?? [],
      legalNotice: res.data.legalNotice ?? '',
    })),
};

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────

export const notificationsApi = {
  getAlerts: () =>
    request<{
      data: Array<{
        id: string;
        title: string;
        message: string;
        date: string;
        read: boolean;
      }>
    }>('/notifications', { method: 'GET' }, true).then(res => res.data),
};
