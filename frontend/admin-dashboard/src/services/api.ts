const BASE_URL = '/api';

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
    throw new Error(error.message || 'Something went wrong');
  }

  const result = await response.json();
  console.log(`[API SUCCESS] Path: ${path} | Payload Size:`, Array.isArray(result) ? result.length : 'Object');
  return result;
}

export const adminApi = {
  getDashboard: () => request<any>('/admin/dashboard'),
  getWorkers: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any[]>(`/admin/workers?${query}`);
  },
  getClaims: (params: any = {}) => {
    const query = new URLSearchParams(params).toString();
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
