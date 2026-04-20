import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AegisNavbar from '../../components/layout/AegisNavbar';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import { manualAuthApi } from '../../services/api';

const OTP_LENGTH = 6;
const DEFAULT_RETRY_SECONDS = 30;

export default function ManualMobileAuthScreen({ navigation }: any) {
  const { loginManualOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [otp, setOtp] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const otpInputs = useRef<Array<TextInput | null>>([]);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return false;
    }
    return true;
  };

  const sendOtp = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    setError('');
    try {
      const response = await manualAuthApi.sendOtp(normalizedEmail);
      setOtpSent(true);
      setDebugOtp(response?.debugOtp || '');
      setResendIn(response?.retryAfterSec ?? DEFAULT_RETRY_SECONDS);
      Alert.alert('OTP sent', 'A verification code was sent to your email.');
    } catch (e: any) {
      setError(e?.message || 'Unable to send OTP right now. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const next = [...otp];
    next[index] = value.replace(/[^0-9]/g, '');
    setOtp(next);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await loginManualOtp(normalizedEmail, code);
    } catch (e: any) {
      setError(e?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendIn > 0) return;
    await sendOtp();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message="Securing your new driver sign up..." />
      <AegisNavbar onBack={() => navigation.goBack()} light />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <AuthCard style={styles.card}>
          <Text style={styles.step}>Step 1 of 2</Text>
          <Text style={styles.title}>New Driver Sign Up</Text>
          <Text style={styles.subtitle}>New drivers can sign up using email OTP and complete full KYC onboarding.</Text>

          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            placeholder="Enter your email"
            onChangeText={setEmail}
            editable={!otpSent}
          />

          {!otpSent ? (
            <Button title="Send OTP" onPress={sendOtp} style={styles.primaryButton} />
          ) : (
            <>
              <Text style={styles.fieldLabel}>Verification OTP</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      otpInputs.current[idx] = ref;
                    }}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={value => handleOtpChange(value, idx)}
                    onKeyPress={event => handleOtpBackspace(event.nativeEvent.key, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                ))}
              </View>

              <Button title="Verify OTP & Continue" onPress={verifyOtp} style={styles.primaryButton} />

              <TouchableOpacity onPress={resendOtp} disabled={resendIn > 0} style={styles.resendWrap}>
                <Text style={[styles.resendText, resendIn > 0 ? styles.resendDisabled : null]}>
                  {resendIn > 0 ? `Retry OTP in ${resendIn}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>

              {debugOtp ? <Text style={styles.debugOtpText}>Dev OTP: {debugOtp}</Text> : null}
            </>
          )}

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={18} color={Theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </AuthCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF5C39',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  card: {
    padding: Theme.spacing.xl,
    borderRadius: 24,
    backgroundColor: '#EFEBDC',
  },
  step: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4F44',
    marginBottom: 8,
  },
  title: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  fieldLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.text,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  otpInput: {
    width: 44,
    height: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 8,
  },
  resendWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  resendDisabled: {
    color: Theme.colors.textSecondary,
  },
  debugOtpText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    color: '#333',
    fontWeight: '700',
  },
  errorRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    ...Theme.typography.caption,
    color: Theme.colors.error,
    flex: 1,
  },
});