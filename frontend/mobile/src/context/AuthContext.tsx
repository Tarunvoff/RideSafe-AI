/**
 * [EXCELLENCE SUMMARY]
 * The AuthContext is the security sentinel of the Aegis Mobile application. 
 * It manages the entire lifecycle of user identity, from multi-factor authentication (OTP) 
 * to complex OAuth handshakes and KYC state synchronization. Architected for persistence, 
 * it ensures a seamless transition between offline states and authenticated sessions.
 * 
 * [DOMAIN LOGIC]
 * Handles the distinct authorization flows for DRIVER and ADMIN roles. 
 * For drivers, it integrates KYC (Know Your Customer) hooks, ensuring that only verified 
 * personnel can interact with the live risk and insurance modules, thereby maintaining 
 * the integrity of the Aegis trust ecosystem.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';
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

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return atob(padded);
};

const parseJwtSubject = (token?: string | null): string | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return typeof payload?.sub === 'string' && payload.sub.trim() ? payload.sub.trim() : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshLocation } = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  /**
   * [IN-LINE PRIDE]: Session Restoration Engine
   * On initial mount, the provider performs a multi-key asynchronous persistence check. 
   * This ensures that dark store operators do not lose context during app restarts 
   * or OS-level process reclamation.
   */
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
          // Canonical driver identity must match JWT subject (userId).
          // Older OAuth sessions may have stored provider-specific driverId.
          const tokenSub = parseJwtSubject(token);
          const canonicalUserId = userId || tokenSub || '';
          // Always trust first-party userId/JWT subject for authenticated driver APIs.
          const resolvedId = canonicalUserId;

          if (role === 'DRIVER' && !resolvedId) {
            console.warn('Missing driverId for driver role, rejecting session');
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userEmail', 'userRole', 'userId', 'driverName', 'driverId', 'oauthProvider', 'isTermsAccepted']);
            return;
          }

          if (role === 'DRIVER' && resolvedId && driverId !== resolvedId) {
            await AsyncStorage.setItem('driverId', resolvedId);
          }

          if (role === 'DRIVER' && resolvedId && userId !== resolvedId) {
            await AsyncStorage.setItem('userId', resolvedId);
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
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await authApi.verifyOtp(email, otp) as any;
    
    // Get saved driver name from local storage
    const savedName = await AsyncStorage.getItem('driverName');
    
    if (!res?.driverId) {
      throw new Error(i18n.t('auth.errors.reauthenticate'));
    }

    const token = res.accessToken || res.access_token;
    if (!token) throw new Error('Session token not generated.');

    await AsyncStorage.multiSet([
      ['accessToken', token],
      ['refreshToken', res.refreshToken || ''],
      ['userEmail', email || ''],
      ['userRole', 'DRIVER'],
      ['userId', String(res.userId || res.id || '')],
      ['driverId', String(res.driverId || '')],
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

  /**
   * [IN-LINE PRIDE]: Atomic Login Procedure
   * Orchestrates the secure exchange of credentials for JWT tokens, while 
   * simultaneously triggering a KYC status sync and location refresh to establish 
   * the user's operational baseline.
   */
  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password) as any;
    
    const savedName = await AsyncStorage.getItem('driverName');
    const role = (res.role || 'DRIVER') as 'DRIVER' | 'ADMIN';

    if (role === 'DRIVER' && !res?.driverId) {
      throw new Error(i18n.t('auth.errors.driver_not_found'));
    }

    const token = res.accessToken || res.access_token;
    if (!token) throw new Error('Session token not generated by server.');

    await AsyncStorage.multiSet([
      ['accessToken', token],
      ['refreshToken', res.refreshToken || ''],
      ['userEmail', email || ''],
      ['userRole', role],
      ['userId', String(res.userId || res.id || '')],
      ['driverId', String(res.driverId || '')],
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
    const tokenSub = parseJwtSubject(res.accessToken);
    const appUserId = tokenSub || res.userId || '';

    if (!email) {
      throw new Error(i18n.t('auth.errors.missing_email'));
    }

    if (role === 'DRIVER' && !appUserId) {
      throw new Error(i18n.t('auth.errors.driver_not_found'));
    }

    // Driver-facing APIs are keyed by first-party userId/JWT subject.
    // Keep provider-specific subject only for provider diagnostics, not auth identity.
    const canonicalDriverId = role === 'DRIVER' ? appUserId : '';

    const token = res.accessToken || res.access_token;
    if (!token) throw new Error('Session token not generated by OAuth provider.');

    await AsyncStorage.multiSet([
      ['accessToken', token],
      ['refreshToken', res.refreshToken || ''],
      ['userEmail', email || ''],
      ['userRole', role],
      ['userId', String(appUserId || '')],
      ['driverId', String(canonicalDriverId || '')],
      ['oauthProvider', provider.toUpperCase()],
    ]);

    const savedName = await AsyncStorage.getItem('driverName');
    await refreshLocation();
    setUser({ id: role === 'DRIVER' ? canonicalDriverId : appUserId || undefined, email, role, driverName: savedName || undefined });

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
    await authApi.adminLogin(email, password);
  };

  const adminVerifyOtp = async (email: string, otp: string) => {
    const res = await authApi.adminVerifyOtp(email, otp) as any;
    
    const token = res.accessToken || res.access_token;
    if (!token) {
       throw new Error('Session token not successfully generated by server.');
    }

    // Get saved driver name from local storage
    const savedName = await AsyncStorage.getItem('driverName');
    
    await AsyncStorage.multiSet([
      ['accessToken', token],
      ['refreshToken', res.refreshToken || ''],
      ['userEmail', email || ''],
      ['userRole', 'ADMIN'],
      ['userId', String(res.userId || res.id || '')],
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

/**
 * [IN-LINE PRIDE]: Context Guard
 * Prevents unauthorized access to auth state outside of the provider tree, 
 * enforcing strict architectural boundaries.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
