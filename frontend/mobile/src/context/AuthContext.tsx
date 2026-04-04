import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, kycApi } from '../services/api';
import { useLocation } from './LocationContext';

interface AuthUser {
  id?: string;
  email: string;
  role: 'DRIVER' | 'ADMIN';
  driverName?: string;
  isTermsAccepted?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewRegistration: boolean;
  kycStatus: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: string, data: { code: string; sessionId: string; state?: string; redirectUri: string }) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, phone?: string, skipKyc?: boolean) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminVerifyOtp: (email: string, otp: string) => Promise<void>;
  sendDriverOtp: (email: string) => Promise<void>;
  verifyDriverOtp: (email: string, otp: string) => Promise<void>;
  checkKycStatus: () => Promise<string | null>;
  refreshKycStatus: () => Promise<void>;
  updateDriverName: (name: string) => Promise<void>;
  acceptTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshLocation } = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const email = await AsyncStorage.getItem('userEmail');
        const userId = await AsyncStorage.getItem('userId');
        const driverId = await AsyncStorage.getItem('driverId');
        const role = await AsyncStorage.getItem('userRole') as 'DRIVER' | 'ADMIN' | null;
        
        if (token && email && role) {
          const savedName = await AsyncStorage.getItem('driverName');
          const termsAcceptedString = await AsyncStorage.getItem('isTermsAccepted');
          const isTermsAccepted = termsAcceptedString === 'true';
          const resolvedId = role === 'DRIVER' ? driverId : userId;

          if (role === 'DRIVER' && !resolvedId) {
            console.warn('Missing driverId for driver role, rejecting session');
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userEmail', 'userRole', 'userId', 'driverName', 'driverId', 'oauthProvider', 'isTermsAccepted']);
            return;
          }

          setUser({ 
            id: resolvedId ?? undefined, 
            email, 
            role, 
            driverName: savedName || undefined,
            isTermsAccepted: role === 'DRIVER' ? isTermsAccepted : true 
          });
          
          // Check KYC status if driver
          if (role === 'DRIVER') {
            try {
              const status = await kycApi.getStatus();
              setKycStatus(status.status || 'NOT_STARTED');
            } catch (e: any) {
              if (e?.message !== 'Unauthorized') {
                console.log('KYC status check failed:', e);
              }
            }
          }
        }
      } catch (e) {
        console.error('Session restore failed:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const register = async (email: string, password: string, phone?: string, skipKyc = false) => {
    await authApi.register(email, password, phone);
    setIsNewRegistration(!skipKyc);
    // Auto-login immediately after registration (no OTP required)
    await login(email, password);
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await authApi.verifyOtp(email, otp) as any;
    
    // Get saved driver name from local storage
    const savedName = await AsyncStorage.getItem('driverName');
    
    if (!res?.driverId) {
      throw new Error('Driver identity not found. Please re-authenticate.');
    }

    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', 'DRIVER'],
      ['userId', res.userId || res.id || ''],
      ['driverId', res.driverId],
    ]);
    await refreshLocation();
    setUser({ id: res.driverId, email, role: 'DRIVER', driverName: savedName || undefined });
    setKycStatus('NOT_STARTED');
  };

  const sendDriverOtp = async (email: string) => {
    await authApi.sendDriverOtp(email);
  };

  const verifyDriverOtp = async (email: string, otp: string) => {
    await authApi.verifyDriverOtp(email, otp);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password) as any;
    
    const savedName = await AsyncStorage.getItem('driverName');
    const role = (res.role || 'DRIVER') as 'DRIVER' | 'ADMIN';

    if (role === 'DRIVER' && !res?.driverId) {
      throw new Error('Driver identity not found. Please sign in again.');
    }

    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', role],
      ['userId', res.userId || res.id || ''],
      ['driverId', res.driverId || ''],
    ]);

    await refreshLocation();
    setUser({ id: role === 'DRIVER' ? res.driverId : (res.userId || res.id || undefined), email, role, driverName: savedName || undefined });

    if (role === 'DRIVER') {
      try {
        const status = await kycApi.getStatus();
        setKycStatus(status.status);
        console.log('✅ KYC Status:', status.status);
      } catch (e) {
        setKycStatus('NOT_STARTED');
        console.log('⚠️ KYC Status defaulted to NOT_STARTED');
      }
    }
    
    console.log('✅ Login complete - user:', { email, role, driverId: res.driverId });
  };

  const loginWithOAuth = async (provider: string, data: { code: string; sessionId: string; state?: string; redirectUri: string }) => {
    const res = await authApi.oauthExchange(provider, data) as any;
    const role = (res.role || 'DRIVER') as 'DRIVER' | 'ADMIN';
    const email = res.email;

    if (!email) {
      throw new Error('Missing email from provider. Please try again.');
    }

    if (role === 'DRIVER' && !res?.driverId) {
      throw new Error('Driver identity not found. Please sign in again.');
    }

    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', role],
      ['userId', res.userId || ''],
      ['driverId', res.driverId || ''],
      ['oauthProvider', provider.toUpperCase()],
    ]);

    const savedName = await AsyncStorage.getItem('driverName');
    await refreshLocation();
    setUser({ id: role === 'DRIVER' ? res.driverId : res.userId || undefined, email, role, driverName: savedName || undefined });

    if (role === 'DRIVER') {
      try {
        const status = await kycApi.getStatus();
        setKycStatus(status.status || 'NOT_STARTED');
      } catch {
        setKycStatus('NOT_STARTED');
      }
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.log('Backend logout failed or token expired, proceeding with local logout');
    }
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'userEmail',
      'userRole',
      'userId',
      'driverName',
      'driverId',
      'oauthProvider',
    ]);
    setUser(null);
    setKycStatus(null);
    setIsNewRegistration(false);
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await authApi.adminLogin(email, password);
    
    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', 'ADMIN'],
      ['userId', res.userId],
    ]);

    setUser({ id: res.userId, email, role: 'ADMIN' });
  };

  const adminVerifyOtp = async (email: string, otp: string) => {
    const res = await authApi.adminVerifyOtp(email, otp) as any;
    
    // Get saved driver name from local storage
    const savedName = await AsyncStorage.getItem('driverName');
    
    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', 'ADMIN'],
      ['userId', res.userId || res.id || ''],
    ]);
    setUser({ id: res.userId || res.id || undefined, email, role: 'ADMIN', driverName: savedName || undefined });
  };

  const checkKycStatus = useCallback(async () => {
    if (!user || user.role !== 'DRIVER') return null;
    try {
      const status = await kycApi.getStatus();
      setKycStatus(status.status);
      return status.status;
    } catch (e) {
      console.error('KYC status check failed:', e);
      return null;
    }
  }, [user]);

  const refreshKycStatus = useCallback(async () => {
    await checkKycStatus();
  }, [checkKycStatus]);

  const updateDriverName = async (name: string) => {
    try {
      // Call API to update name in database
      await authApi.updateDriverName(name);
      
      // Save to local storage as fallback
      await AsyncStorage.setItem('driverName', name);
      setUser(prev => prev ? { ...prev, driverName: name } : prev);
    } catch (error) {
      console.error('Error updating driver name:', error);
      // Still save locally as fallback
      await AsyncStorage.setItem('driverName', name);
      setUser(prev => prev ? { ...prev, driverName: name } : prev);
    }
  };

  const acceptTerms = async () => {
    try {
      await AsyncStorage.setItem('isTermsAccepted', 'true');
      setUser(prev => prev ? { ...prev, isTermsAccepted: true } : prev);
      console.log('✅ Terms accepted and saved.');
    } catch (error) {
      console.error('Error saving terms acceptance:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isNewRegistration,
        kycStatus,
        login,
        loginWithOAuth,
        logout,
        register,
        verifyOtp,
        adminLogin,
        adminVerifyOtp,
        sendDriverOtp,
        verifyDriverOtp,
        checkKycStatus,
        refreshKycStatus,
        updateDriverName,
        acceptTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
