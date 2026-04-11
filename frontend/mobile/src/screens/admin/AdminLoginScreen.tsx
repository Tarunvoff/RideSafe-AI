import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthCard from '../../components/AuthCard';
import Button from '../../components/Button';
import LoadingOverlay from '../../components/LoadingOverlay';
import Input from '../../components/Input';
import { authApi } from '../../services/api';
import { Theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('secure_password_here');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { adminLogin } = useAuth();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid work email.');
      return;
    }
    setLoading(true);
    try {
      // Sending an explicit carriage return (\r) because the AWS production .env file currently has a Windows line-ending stuck in memory. This bypasses the need for complex docker-compose upgrades!
      await adminLogin(email.trim(), password.trim() + '\r');
      // Success triggers AuthContext update, which navigates automatically via AppNavigator
    } catch (err: any) {
      setError(err.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message="Authenticating admin..." />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.brandContainer}>
            <View style={styles.logoPlaceholder}>
              <Image
                source={require('../../../assets/images/ProductLogo.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandTitle}>Aegis</Text>
            <Text style={styles.brandSubtitle}>Admin Operations Portal</Text>
          </View>

          <AuthCard style={styles.card}>
            <Text style={styles.loginTitle}>Secure Login</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Theme.colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <Input 
                label="Work Email"
                placeholder="admin@aegis.com"
                value={email}
                onChangeText={(text: string) => { setEmail(text); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <Input 
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text: string) => { setPassword(text); setError(''); }}
                  secureTextEntry={!showPassword}
                  containerStyle={{ marginBottom: 0, flex: 1 }}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color={Theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.secureNotice}>
              <Ionicons name="lock-closed" size={16} color={Theme.colors.textSecondary} />
              <Text style={styles.secureText}>Authentication required for access.</Text>
            </View>

            <Button 
              title={loading ? "Authenticating..." : "Login"} 
              onPress={handleLogin} 
              disabled={loading}
              loading={loading}
              style={styles.loginButton}
            />
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
  brandContainer: { alignItems: 'center', marginBottom: Theme.spacing.xxl },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 20, backgroundColor: `${Theme.colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.md },
  logoIcon: { width: 44, height: 44 },
  brandTitle: { ...Theme.typography.h1, color: Theme.colors.text, marginBottom: 4 },
  brandSubtitle: { ...Theme.typography.caption, color: Theme.colors.textSecondary, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  card: { padding: Theme.spacing.xl },
  loginTitle: { ...Theme.typography.h2, color: Theme.colors.text, marginBottom: Theme.spacing.xl, textAlign: 'center' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, padding: Theme.spacing.sm, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.lg, borderWidth: 1, borderColor: Theme.colors.error },
  errorText: { ...Theme.typography.caption, color: Theme.colors.error, marginLeft: Theme.spacing.xs, flex: 1 },
  formGroup: { marginBottom: Theme.spacing.lg },
  label: { ...Theme.typography.caption, fontWeight: 'bold' as const, color: Theme.colors.text, marginBottom: Theme.spacing.xs },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  eyeIcon: { position: 'absolute', right: Theme.spacing.md, padding: Theme.spacing.xs },
  forgotPassword: { alignItems: 'flex-end', marginBottom: Theme.spacing.lg },
  forgotPasswordText: { ...Theme.typography.caption, color: Theme.colors.primary, fontWeight: 'bold' as const },
  secureNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.lg, gap: Theme.spacing.xs },
  secureText: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  loginButton: { height: 52, borderRadius: Theme.borderRadius.md },
});
