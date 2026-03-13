import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Zap, TrendingUp, ChevronRight, Truck } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const FEATURES = [
  { icon: Shield, label: 'Parametric Insurance', sub: 'Instant coverage for every delivery' },
  { icon: Zap, label: 'Auto Payouts', sub: 'No claims, no paperwork — just money' },
  { icon: TrendingUp, label: 'Real-time Risk AI', sub: 'Weather, AQI, disruption monitoring' },
];

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#0F172A', '#1E3A8A', '#1D4ED8']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Zap size={36} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text style={styles.appName}>Blink</Text>
          <Text style={styles.appTagline}>Insurance for India's Gig Workers</Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {FEATURES.map(({ icon: Icon, label, sub }, i) => (
            <View key={label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Icon size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{label}</Text>
                <Text style={styles.featureSub}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[['₹4Cr+', 'Paid Out'], ['12,000+', 'Workers'], ['98%', 'Uptime']].map(([val, lbl]) => (
            <View key={lbl} style={styles.statItem}>
              <Text style={styles.statVal}>{val}</Text>
              <Text style={styles.statLbl}>{lbl}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* CTA */}
      <Animated.View style={[styles.ctaArea, { opacity: fadeAnim }]}>
        <Text style={styles.ctaHeading}>Sign in as</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Onboarding')}
          style={styles.ctaBtn}
          activeOpacity={0.9}
        >
          <View style={styles.ctaBtnIcon}>
            <Truck size={18} color={COLORS.navy} strokeWidth={2.5} />
          </View>
          <Text style={styles.ctaBtnText}>Delivery Person</Text>
          <ChevronRight size={18} color={COLORS.navy} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminPortal')}
          style={styles.ctaAdminBtn}
          activeOpacity={0.9}
        >
          <View style={styles.ctaAdminBtnIcon}>
            <Shield size={18} color="#60A5FA" strokeWidth={2.5} />
          </View>
          <Text style={styles.ctaAdminBtnText}>Admin</Text>
          <ChevronRight size={18} color="#60A5FA" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.ctaDisclaimer}>No paperwork. No waiting. Just instant protection.</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: height * 0.12 },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  appName: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  features: { gap: 20, marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  featureSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  ctaArea: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  ctaHeading: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 12 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, paddingVertical: 14, paddingHorizontal: 20, gap: 8, marginBottom: 10 },
  ctaBtnIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(15,12,41,0.1)', alignItems: 'center', justifyContent: 'center' },
  ctaBtnText: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.navy, textAlign: 'center' },
  ctaAdminBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, paddingVertical: 14, paddingHorizontal: 20, gap: 8, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(96,165,250,0.35)' },
  ctaAdminBtnIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(96,165,250,0.12)', alignItems: 'center', justifyContent: 'center' },
  ctaAdminBtnText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#60A5FA', textAlign: 'center' },
  ctaDisclaimer: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)' },
});
