/**
 * ── Elite Admin Control Plane API Orchestration ──────────────────────────
 * 
 * The adminApi service provides the authoritative data bridge between the 
 * Aegis Admin Dashboard and the platform's high-fidelity backend services. 
 * Designed for low-latency telemetry ingestion and risk enforcement.
 * 
 * For implementation details of the underlying actuarial logic, refer to:
 * - ARCHITECTURE/ADMIN_CONTROL_PLANE.md
 * 
 * For a deep dive into the system design, refer to ARCHITECTURE/SYSTEM_ARCHITECTURE.md 
 * and ARCHITECTURE/OVERALL_PROJECT_SYSTEM_VIEW.md.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_EXPIRED_EVENT = 'aegis-auth-expired';

function emitAuthExpired(reason: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason } }));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('adminToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    console.error(`[API ERROR] Path: ${path} | Status: ${response.status}`, error);
    const errMsg = error?.error || error?.message || 'Something went wrong';

    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      emitAuthExpired(errMsg);
    }

    throw new Error(errMsg);
  }

  const result = await response.json();
  console.log(`[API SUCCESS] Path: ${path} | Payload Size:`, Array.isArray(result) ? result.length : 'Object');
  if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
    return result.data;
  }
  return result;
}

export const adminApi = {
  getDashboard: () => request<any>('/admin/dashboard'),
  getWorkers: (params: any = {}) => {
    const cleanParams: any = {};
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request<any[]>(`/admin/workers${query ? `?${query}` : ''}`);
  },
  getLiveGps: (params: { zone: string; provider?: string; count?: number }) => {
    const query = new URLSearchParams({
      zone: params.zone,
      ...(params.provider ? { provider: params.provider } : {}),
      ...(params.count ? { count: String(params.count) } : {}),
    }).toString();
    return request<any>(`/platform/live-gps?${query}`);
  },
  getClaims: (params: any = {}) => {
    const cleanParams: any = {};
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return request<any>(`/admin/claims?${query}`);
  },
  getAlerts: () => request<any>('/admin/alerts'),
  getSettings: () => request<any>('/admin/settings'),
  getSubmissions: () => request<any>('/fraud/admin/submissions'),
  
  login: (credentials: any) => request<any>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  verifyOtp: (data: any) => request<any>('/auth/admin/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export { AUTH_EXPIRED_EVENT };
