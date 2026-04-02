import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, dynamicQCommerceApi, kycApi } from '../services/api';
import { useLocation } from './LocationContext';

interface AuthUser {
  id?: string;
  email: string;
  role: 'DRIVER' | 'ADMIN';
  driverName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewRegistration: boolean;
  kycStatus: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, phone?: string, skipKyc?: boolean) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminVerifyOtp: (email: string, otp: string) => Promise<void>;
  checkKycStatus: () => Promise<string | null>;
  refreshKycStatus: () => Promise<void>;
  updateDriverName: (name: string) => Promise<void>;
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
          let resolvedId = role === 'DRIVER' ? (driverId || userId || undefined) : (userId || undefined);

          if (role === 'DRIVER' && !driverId) {
            try {
              const created = await dynamicQCommerceApi.createDriver('BLINKIT', email);
              resolvedId = created?.driverId ?? resolvedId;
              if (created?.driverId) {
                await AsyncStorage.setItem('driverId', created.driverId);
              }
            } catch {
              // Ignore and keep fallback id.
            }
          }

          setUser({ id: resolvedId, email, role, driverName: savedName || undefined });
          
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
    
    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', 'DRIVER'],
      ['userId', email], // Use email as user ID for now
    ]);
    await refreshLocation();
    setUser({ email, role: 'DRIVER', driverName: savedName || undefined });
    setKycStatus('NOT_STARTED');
  };

  const login = async (email: string, password: string) => {
    // For manual logins, reset the new registration flag just in case
    // setIsNewRegistration(false); // Only set if not already set by register() within this session
    const res = await authApi.login(email, password) as any;
    
    // Get saved driver name from local storage
    const savedName = await AsyncStorage.getItem('driverName');
    
    await AsyncStorage.multiSet([
      ['accessToken', res.accessToken],
      ['refreshToken', res.refreshToken],
      ['userEmail', email],
      ['userRole', res.role || 'DRIVER'],
      ['userId', email],
    ]);
    let driverId: string | null = null;
    if ((res.role || 'DRIVER') === 'DRIVER') {
      try {
        const driverRes = await dynamicQCommerceApi.createDriver('BLINKIT', email);
        driverId = driverRes?.driverId ?? null;
        if (driverId) {
          await AsyncStorage.setItem('driverId', driverId);
        }
      } catch {
        driverId = null;
      }
    }
    await refreshLocation();
    setUser({ id: driverId || email, email, role: res.role || 'DRIVER', driverName: savedName || undefined });
    
    // Check KYC status for drivers
    if (res.role === 'DRIVER') {
      try {
        const status = await kycApi.getStatus();
        setKycStatus(status.status);
      } catch (e) {
        setKycStatus('NOT_STARTED');
      }
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore unauthorized or network errors during logout
      // We still want to clear the local session regardless of backend success
      console.log('Backend logout failed or token expired, proceeding with local logout');
    }
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userEmail', 'userRole', 'userId', 'driverName']);
    setUser(null);
    setKycStatus(null);
    setIsNewRegistration(false);
  };

  const adminLogin = async (email: string, password: string) => {
    await authApi.adminLogin(email, password);
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
      ['userId', email],
    ]);
    setUser({ id: email, email, role: 'ADMIN', driverName: savedName || undefined });
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isNewRegistration,
        kycStatus,
        login,
        logout,
        register,
        verifyOtp,
        adminLogin,
        adminVerifyOtp,
        checkKycStatus,
        refreshKycStatus,
        updateDriverName,
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
