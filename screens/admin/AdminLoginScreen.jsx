import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react-native';
import { ADMIN_CREDENTIALS } from '../../data/adminMockData';

export default function AdminLoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (
        username.trim() === ADMIN_CREDENTIALS.username &&
        password === ADMIN_CREDENTIALS.password
      ) {
        setLoading(false);
        navigation.replace('AdminMain');
      } else {
        setLoading(false);
        setError('Invalid credentials. Use username: admin123 / password: 1234');
      }
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Badge */}
        <View style={styles.badge}>
          <Shield size={14} color="#60A5FA" strokeWidth={2.5} />
          <Text style={styles.badgeText}>ADMIN PORTAL</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Blink Insurance</Text>
        <Text style={styles.subtitle}>System Administration Dashboard</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Access restricted — authorized personnel only</Text>

          {/* Username */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="admin123"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
                {showPw
                  ? <EyeOff size={18} color="#94A3B8" strokeWidth={2} />
                  : <Eye size={18} color="#94A3B8" strokeWidth={2} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Demo hint */}
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>Demo: admin123 · 1234</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading
              ? <Text style={styles.loginBtnText}>Signing in…</Text>
              : <>
                  <LogIn size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.loginBtnText}>Sign In to Admin Panel</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Blink Insurance · Admin v1.0 · Phase 1 Prototype</Text>

      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 20,
  },
  badgeText: { fontSize: 11, color: '#60A5FA', fontWeight: '800', letterSpacing: 1.2 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#64748B', marginBottom: 24 },
  inputWrap: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 0,
  },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingRight: 6 },
  eyeBtn: { padding: 10 },
  errorBox: { backgroundColor: '#450A0A', borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { fontSize: 12, color: '#F87171', fontWeight: '600' },
  hintBox: { backgroundColor: 'rgba(96,165,250,0.08)', borderRadius: 8, padding: 8, marginBottom: 16 },
  hintText: { fontSize: 11, color: '#60A5FA', textAlign: 'center', fontWeight: '600' },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
  },
  loginBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  footer: { fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 24 },
});
