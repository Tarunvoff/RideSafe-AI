import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AuthCard from '../../components/AuthCard';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

export default function AdminOTPScreen({ navigation, route }: any) {
  const email = route?.params?.email ?? '';
  const { adminVerifyOtp } = useAuth();

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

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await adminVerifyOtp(email, fullCode);
      setSuccess(true);
      // The AppNavigator will automatically unmount this screen and show the AdminDashboard since `user.role` is now 'ADMIN'.
    } catch (err: any) {
      setError(err.message ?? 'Invalid verification code.');
      setLoading(false);
    }
  };

  const handleResend = () => {
    setTimer(30);
    setCode(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={success || loading}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <AuthCard style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={success ? "checkmark-circle" : "shield-checkmark"} 
                size={48} 
                color={success ? Theme.colors.success : Theme.colors.primary} 
              />
            </View>
            
            <Text style={styles.title}>{success ? "Access Granted" : "Two-Factor Auth"}</Text>
            
            {success ? (
              <Text style={styles.subtitle}>Redirecting to Admin Dashboard...</Text>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Enter the 6-digit verification code sent to your admin email.
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
                  title={loading ? "Verifying..." : "Verify Identity"} 
                  onPress={handleVerify} 
                  disabled={loading}
                  loading={loading}
                  style={styles.verifyButton}
                />

                <View style={styles.resendContainer}>
                  {timer > 0 ? (
                    <Text style={styles.resendText}>Resend code in <Text style={styles.timerText}>{timer}s</Text></Text>
                  ) : (
                    <TouchableOpacity onPress={handleResend}>
                      <Text style={styles.resendLink}>Resend Code</Text>
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
  safeArea: { flex: 1, backgroundColor: '#f0f4f8' },
  container: { flex: 1 },
  backButton: { padding: Theme.spacing.lg, position: 'absolute', top: 0, left: 0, zIndex: 10 },
  content: { flex: 1, justifyContent: 'center', padding: Theme.spacing.xl },
  card: { padding: Theme.spacing.xl, alignItems: 'center' },
  iconContainer: { marginBottom: Theme.spacing.lg },
  title: { ...Theme.typography.h2, color: '#0f172a', marginBottom: Theme.spacing.sm, textAlign: 'center' },
  subtitle: { ...Theme.typography.body, color: '#64748b', textAlign: 'center', marginBottom: Theme.spacing.xl, paddingHorizontal: Theme.spacing.md },
  errorContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.lg, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { ...Theme.typography.caption, color: Theme.colors.error, marginLeft: Theme.spacing.xs, flex: 1 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: Theme.spacing.xl },
  otpInput: { width: 45, height: 55, borderWidth: 2, borderColor: Theme.colors.border, borderRadius: Theme.borderRadius.md, textAlign: 'center', fontSize: 24, fontWeight: '700', color: Theme.colors.text, backgroundColor: Theme.colors.background },
  otpInputError: { borderColor: Theme.colors.error, backgroundColor: '#fef2f2' },
  verifyButton: { width: '100%', height: 52 },
  resendContainer: { marginTop: Theme.spacing.lg },
  resendText: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  timerText: { color: Theme.colors.primary, fontWeight: 'bold' as const },
  resendLink: { ...Theme.typography.caption, color: Theme.colors.primary, fontWeight: 'bold' as const },
});
