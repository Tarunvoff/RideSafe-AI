import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Dynamically set BASE_URL depending on the platform environment
// Local network IP (192.168.1.9) is used so physical devices scanning Expo Go can connect.
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001/api'; // Web Simulator
  }
  // This allows Android emulator, iOS simulator, and Physical Devices to connect
  return 'http://10.73.162.36:3001/api'; 
};

const BASE_URL = getBaseUrl();

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false,
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? 'Something went wrong');
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
};
