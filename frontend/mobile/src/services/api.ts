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

    throw new Error(data?.message ?? 'Something went wrong');
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
    }>(`/fraud/zone-risk?lat=${lat}&lng=${lng}`, {}, true),

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
