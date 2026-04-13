import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Dynamically set BASE_URL from environment — REQUIRED for deployments
// Use environment variable EXPO_PUBLIC_API_URL
const getBaseUrl = (): string | null => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  
  if (!apiUrl) {
    const errorMsg = 
      'FATAL: EXPO_PUBLIC_API_URL not configured. ' +
      'Please set EXPO_PUBLIC_API_URL in .env file (e.g., http://192.168.1.9:3001/api)';
    console.error('❌', errorMsg);
    return null;
  }
  
  console.log('✅ Using API URL:', apiUrl.replace(/\/api\/?$/, '') + '/api');
  return apiUrl;
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
  if (!BASE_URL) {
    throw new Error(
      'API is not configured. Set EXPO_PUBLIC_API_URL in your Expo environment for this build profile.'
    );
  }

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
    request<{ accessToken: string; refreshToken: string; role: string; userId: string; message: string }>('/auth/admin/login', {
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
