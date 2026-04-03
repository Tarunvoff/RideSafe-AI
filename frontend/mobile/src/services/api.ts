import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Dynamically set BASE_URL depending on the platform environment
// Local network IP (192.168.1.9) is used so physical devices scanning Expo Go can connect.
const getBaseUrl = () => {
  // Use the API URL from your local .env file first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallback for Web Simulator if .env is missing
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api';
  }
  
  // Final fallback (Ideally this never happens since we have .env)
  return 'http://127.0.0.1:3001/api';
};

const BASE_URL = getBaseUrl();

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem('refreshToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false,
  _attempt = 0,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

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
    request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  adminVerifyOtp: (email: string, otp: string) =>
    request<{ accessToken: string; refreshToken: string; role: string }>('/auth/admin/verify-otp', {
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

export const kycApi = {
  getStatus: () =>
    request<{
      status: string;
      completedSteps: number;
      totalSteps: number;
      steps: Record<string, boolean>;
    }>('/kyc/status', {}, true),

  saveBasicIdentity: (data: { fullName: string; dob: string; gender: string }) =>
    request('/kyc/basic-identity', { method: 'POST', body: JSON.stringify(data) }, true),

  savePersonalDetails: (data: { address: string; city: string; state: string; pincode: string }) =>
    request('/kyc/personal-details', { method: 'POST', body: JSON.stringify(data) }, true),

  saveIdentityVerification: (data: { aadhaarNumber: string; panNumber: string }) =>
    request('/kyc/identity-verification', { method: 'POST', body: JSON.stringify(data) }, true),

  savePayoutSetup: (data: {
    method: 'UPI' | 'BANK';
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
      payoutSetup: { method: string; upiId?: string; accountHolder?: string; bankName?: string } | null;
    }>('/kyc/details', {}, true),
};

// ── FRAUD ────────────────────────────────────────────────────────────────────

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
      state: string;
      active_riders: number;
      lf_score: number;
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
};

// ── ADMIN ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getDashboard: () =>
    request<{
      totalWorkers: number;
      activePlans: number;
      activeAlerts: number;
      claimsToday: number;
      highRiskWorkers: number;
      simulatedPayout: number;
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
    }>('/admin/dashboard', {}, true),

  getWorkers: () =>
    request<Array<{
      profileId: string;
      userId: string;
      email: string;
      phone: string | null;
      status: string;
      submittedAt: string;
      userCreatedAt: string;
    }>>('/admin/workers', {}, true),

  getClaims: () =>
    request<{
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
    }>('/admin/claims', {}, true),
};

// ── DRIVER / DASHBOARD ─────────────────────────────────────────────────────

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
    }),
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

export type ClaimRecord = {
  claimId: string;
  status: string;
  amount: number;
  trigger: string;
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

// ── TELEMETRY ─────────────────────────────────────────────────────────────

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
