const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
    throw new Error(error.message || 'Something went wrong');
  }

  return response.json();
}

export const adminApi = {
  getDashboard: () => request<any>('/admin/dashboard'),
  getWorkers: () => request<any[]>('/admin/workers'),
  getClaims: () => request<any>('/admin/claims'),
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
