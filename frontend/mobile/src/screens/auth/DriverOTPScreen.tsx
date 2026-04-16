/**
 * [EXCELLENCE SUMMARY]
 * The DriverOTPScreen is the secondary validation layer of the Aegis 
 * authentication funnel. It implements a highly interactive 6-digit input 
 * sequencer with automatic focus-forward/backwards navigation. This screen 
 * bridges the gap between the initial identity claim and the final OAuth 
 * handshake with external operational platform providers.
 * 
 * [DOMAIN LOGIC]
 * Completes the "Digital-First Identity" verification. By requiring an OTP 
 * tied to the operator's operational account, Aegis ensures that the 
 * person accessing the parametric insurance benefits is the same individual 
 * performing deliveries in the physical store.
 */

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function DriverOTPScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { email, provider, redirectUri } = route?.params ?? {};
  const { verifyDriverOtp, loginWithOAuth } = useAuth();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(30);

  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  /**
   * [IN-LINE PRIDE]: Fluid Input Sequencing
   * Automatically shifts focus to the next/previous input field based on 
   * character presence or backspace events. This 'Zero-Friction' UX pattern 
   * is critical for dark store environments where operators may have limited 
   * time or dexterity.
   */
  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    setError('');

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const getApiBaseUrl = () => {
    const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
    const rawHost =
      (Constants as any)?.expoConfig?.hostUri ??
      (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ??
      (Constants as any)?.manifest?.debuggerHost ??
      '';
    const expoHost = typeof rawHost === 'string' ? rawHost.split(':')[0] : '';

    if (configured) {
      if (/:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured) && expoHost) {
        return configured.replace(
          /:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
          (_match, _host, port) => `://${expoHost}${port ?? ':3001'}`,
        );
      }
      return configured;
    }

    if (expoHost) return `http://${expoHost}:3001/api`;
    return 'http://127.0.0.1:3001/api';
  };

  /**
   * [IN-LINE PRIDE]: Atomic Auth Handshake
   * Orchestrates a multi-phase login: 1. Locally verifies the OTP signal. 
   * 2. Launches a secure browser session for provider OAuth. 
   * 3. Exchanges the resulting code for a final session. 
   * This complex sequence is encapsulated to provide a single, 
   * high-confidence login event to the user.
   */
  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError(t('auth.otp.error_missing'));
      return;
    }
    setLoading(true);
    try {
      // 1. Verify Email OTP
      await verifyDriverOtp(email, fullCode);
      setSuccess(true);

      // 2. Proceed to OAuth
      const authUrl = `${getApiBaseUrl()}/auth/${provider.toLowerCase()}/authorize?identifier=${encodeURIComponent(email)}&redirectUri=${encodeURIComponent(redirectUri)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'cancel') {
        setLoading(false);
        setSuccess(false);
        Alert.alert(t('common.login_cancelled'), t('common.login_cancelled_msg'));
        return;
      }

      if (result.type !== 'success' || !result.url) {
        const message = result.type === 'dismiss'
          ? t('common.dismissed_msg')
          : t('common.oauth_failed');
        throw new Error(message);
      }

      const queryParams = new URL(result.url).searchParams;
      const oauthError = queryParams.get('error');
      const errorDesc = queryParams.get('error_description');
      const oauthCode = queryParams.get('code');
      const sessionId = queryParams.get('sessionId');
      const state = queryParams.get('state') ?? undefined;

      if (oauthError) {
        const message = oauthError === 'access_denied'
          ? t('auth.errors.consent_denied')
          : errorDesc || t('auth.errors.oauth_provider_rejected');
        throw new Error(message);
      }

      if (!oauthCode || !sessionId) {
        throw new Error(t('auth.errors.oauth_exchange_failed'));
      }

      // 3. Complete Login
      await loginWithOAuth(provider, { code: oauthCode, sessionId, state, redirectUri });
      
      // Success will trigger AuthContext update and navigation automatically
    } catch (err: any) {
      setError(err.message ?? t('auth.otp.error_failed'));
      setLoading(false);
      setSuccess(false);
    }
  };

  const handleResend = () => {
    setTimer(30);
    setCode(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
    setError('');
    // Optionally trigger resend API here
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message={success ? t('auth.otp.loading_connecting', { provider }) : t('auth.otp.loading_verifying')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={success || loading}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <AuthCard style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={success ? "checkmark-circle" : "mail-open"} 
                size={48} 
                color={success ? Theme.colors.success : Theme.colors.primary} 
              />
            </View>
            
            <Text style={styles.title}>{success ? t('auth.otp.title_verified') : t('auth.otp.title_verify')}</Text>
            
            {success ? (
              <Text style={styles.subtitle}>{t('auth.otp.subtitle_verified', { provider })}</Text>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  {t('auth.otp.subtitle_verify', { email })}
                </Text>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color={Theme.colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.otpContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputs.current[index] = ref; }}
                      style={[styles.otpInput, error ? styles.otpInputError : null]}
                      value={digit}
                      onChangeText={(text) => handleChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      selectTextOnFocus
                      editable={!loading}
                    />
                  ))}
                </View>

                <Button 
                  title={loading ? t('auth.otp.button_verifying') : t('auth.otp.button_verify')} 
                  onPress={handleVerify} 
                  disabled={loading}
                  loading={loading}
                  style={styles.verifyButton}
                />

                <View style={styles.resendContainer}>
                  {timer > 0 ? (
                    <Text style={styles.resendText}>{t('auth.otp.resend_in', { timer })}</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend}>
                      <Text style={styles.resendLink}>{t('auth.otp.resend_link')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </AuthCard>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  container: { flex: 1 },
  backButton: { padding: Theme.spacing.lg, position: 'absolute', top: 0, left: 0, zIndex: 10 },
  content: { flex: 1, justifyContent: 'center', padding: Theme.spacing.xl },
  card: { padding: Theme.spacing.xl, alignItems: 'center' },
  iconContainer: { marginBottom: Theme.spacing.lg },
  title: { ...Theme.typography.h2, color: Theme.colors.text, marginBottom: Theme.spacing.sm, textAlign: 'center' },
  subtitle: { ...Theme.typography.body, color: Theme.colors.textSecondary, textAlign: 'center', marginBottom: Theme.spacing.xl, paddingHorizontal: Theme.spacing.md },
  errorContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.lg, borderWidth: 1, borderColor: Theme.colors.error },
  errorText: { ...Theme.typography.caption, color: Theme.colors.error, marginLeft: Theme.spacing.xs, flex: 1 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: Theme.spacing.xl },
  otpInput: { width: 45, height: 55, borderWidth: 2, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.md, textAlign: 'center', fontSize: 24, fontWeight: '700', color: Theme.colors.text, backgroundColor: Theme.colors.background },
  otpInputError: { borderColor: Theme.colors.error, backgroundColor: Theme.colors.surface },
  verifyButton: { width: '100%', height: 52 },
  resendContainer: { marginTop: Theme.spacing.lg },
  resendText: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  timerText: { color: Theme.colors.primary, fontWeight: 'bold' as const },
  resendLink: { ...Theme.typography.caption, color: Theme.colors.primary, fontWeight: 'bold' as const },
});

