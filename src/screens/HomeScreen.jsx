import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, Shield, TrendingUp, Zap, ChevronRight, AlertTriangle,
  MapPin, Star, ArrowUpRight, Clock, Activity,
} from 'lucide-react-native';
import { MOCK_WORKER, MOCK_RISK_SCORE, MOCK_ALERTS, MOCK_DASHBOARD_STATS } from '../data/mockData';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants/colors';
import { useGpsMockDetection } from '../hooks/useGpsMockDetection';
import GpsSpoofingDetectionCard from '../components/GpsSpoofingDetectionCard';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const [currentTime, setCurrentTime] = useState(new Date());
  const activeAlerts = MOCK_ALERTS.filter((a) => a.isActive);

  // GPS Spoofing Detection Hook
  const { detectionResult, isChecking, performDetection } = useGpsMockDetection();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const riskColor = MOCK_RISK_SCORE.overall >= 70 ? COLORS.red
    : MOCK_RISK_SCORE.overall >= 50 ? COLORS.orange : COLORS.green;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#2563EB']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{MOCK_WORKER.initials}</Text>
              </View>
              <View>
                <Text style={styles.greetingText}>{getGreeting()},</Text>
                <Text style={styles.nameText}>{MOCK_WORKER.name}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Alerts')} activeOpacity={0.8}>
              <Bell size={20} color="#FFFFFF" strokeWidth={2} />
              {activeAlerts.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifCount}>{activeAlerts.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>₹{MOCK_DASHBOARD_STATS.totalPayoutsReceived.toLocaleString('en-IN')}</Text>
              <Text style={styles.summaryLabel}>Total Payouts</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.riskPill}>
                <Activity size={12} color="#fff" strokeWidth={2.5} />
                <Text style={styles.riskPillText}>{MOCK_RISK_SCORE.overall}%</Text>
              </View>
              <Text style={styles.summaryLabel}>Risk Score</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
              <Text style={styles.summaryLabel}>{MOCK_WORKER.activePolicy}</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <LinearGradient colors={['#1E3A8A', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.policyCard}>
            <View style={styles.policyCardTop}>
              <View>
                <Text style={styles.policyCardLabel}>Active Policy</Text>
                <Text style={styles.policyCardName}>{MOCK_WORKER.activePolicy}</Text>
                <Text style={styles.policyCardId}>Policy #{MOCK_WORKER.policyId}</Text>
              </View>
              <View style={styles.policyBadge}><Shield size={22} color="#FFFFFF" strokeWidth={2} /></View>
            </View>
            <View style={styles.policyCardBottom}>
              <View>
                <Text style={styles.policyCardSublabel}>Coverage</Text>
                <Text style={styles.policyCardValue}>₹{MOCK_DASHBOARD_STATS.protectedEarnings.toLocaleString('en-IN')}/week</Text>
              </View>
              <View style={{ marginLeft: 24 }}>
                <Text style={styles.policyCardSublabel}>Valid Until</Text>
                <Text style={styles.policyCardValue}>{MOCK_WORKER.policyExpiry}</Text>
              </View>
              <TouchableOpacity style={styles.policyCardArrow} onPress={() => navigation.navigate('Plans')}>
                <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsRow}>
          <StatBox icon={TrendingUp} iconBg={COLORS.blueLight} iconColor={COLORS.blue}
            label="Earnings" value={`₹${MOCK_WORKER.avgWeeklyEarnings.toLocaleString('en-IN')}`} sub="+12% vs last week" subPositive />
          <StatBox icon={Zap} iconBg="#FEF3C7" iconColor={COLORS.orange}
            label="Claims" value={MOCK_DASHBOARD_STATS.claimsThisMonth} sub="This month" />
          <StatBox icon={AlertTriangle} iconBg="#FEE2E2" iconColor={COLORS.red}
            label="Alerts" value={activeAlerts.length} sub="Active now" subAlert={activeAlerts.length > 0} />
        </View>

        <Text style={styles.sectionTitle}>Weekly Earnings</Text>
        <WeeklyEarningsCard data={MOCK_DASHBOARD_STATS} />

        {/* GPS Spoofing Detection Card */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Security Check</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={performDetection} disabled={isChecking}>
            <Text style={styles.seeAllText}>{isChecking ? 'Checking...' : 'Re-check'}</Text>
          </TouchableOpacity>
        </View>
        <GpsSpoofingDetectionCard
          detectionResult={detectionResult}
          isChecking={isChecking}
          onRefresh={performDetection}
          onViewDetails={() => {
            alert(`GPS Status: ${detectionResult?.recommendation}\nFraud Score: ${detectionResult?.fraudScore}%`);
          }}
          compact={false}
        />

        {activeAlerts.length > 0 && (
          <>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Active Alert</Text>
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Alerts')}>
                <Text style={styles.seeAllText}>All {MOCK_ALERTS.length} alerts</Text>
                <ChevronRight size={13} color={COLORS.blue} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <HomeAlertPreview alert={activeAlerts[0]} onPress={() => navigation.navigate('Alerts')} />
          </>
        )}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Risk Analysis</Text>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Risk')}>
            <Text style={styles.seeAllText}>Details</Text>
            <ChevronRight size={13} color={COLORS.blue} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Risk')} activeOpacity={0.92}>
          <View style={[styles.riskSnapshot, SHADOWS.card]}>
            <View style={styles.riskSnapshotLeft}>
              <View style={[styles.riskCircle, { borderColor: riskColor }]}>
                <Text style={[styles.riskScore, { color: riskColor }]}>{MOCK_RISK_SCORE.overall}</Text>
                <Text style={[styles.riskScoreLabel, { color: riskColor }]}>%</Text>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.riskLabel}>{MOCK_RISK_SCORE.label}</Text>
                <Text style={styles.riskSub}>5 live factors</Text>
                <View style={[styles.riskTrendBadge, { backgroundColor: COLORS.orangeLight }]}>
                  <ArrowUpRight size={10} color={COLORS.orange} strokeWidth={2.5} />
                  <Text style={[styles.riskTrendText, { color: COLORS.orange }]}>{MOCK_RISK_SCORE.trend} from yesterday</Text>
                </View>
              </View>
            </View>
            <View style={styles.riskFactorMini}>
              {MOCK_RISK_SCORE.factors.slice(0, 3).map((f) => (
                <View key={f.id} style={styles.riskFactorRow}>
                  <Text style={styles.riskFactorName} numberOfLines={1}>{f.name}</Text>
                  <View style={styles.riskBarBg}>
                    <View style={[styles.riskBarFill, { width: `${f.score}%`, backgroundColor: f.score > 65 ? COLORS.red : f.score > 40 ? COLORS.orange : COLORS.green }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.platformRow}>
          <View style={[styles.platformBadge, SHADOWS.subtle]}>
            <MapPin size={13} color={COLORS.blue} strokeWidth={2} />
            <Text style={styles.platformText}>{MOCK_WORKER.zone}, {MOCK_WORKER.city}</Text>
          </View>
          <View style={[styles.platformBadge, SHADOWS.subtle]}>
            <Star size={13} color={COLORS.orange} strokeWidth={2} />
            <Text style={styles.platformText}>{MOCK_WORKER.platform} · {MOCK_WORKER.rating}★</Text>
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ icon: Icon, iconBg, iconColor, label, value, sub, subPositive, subAlert }) {
  return (
    <View style={[sbS.card, SHADOWS.card]}>
      <View style={[sbS.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} strokeWidth={2.5} />
      </View>
      <Text style={sbS.value}>{value}</Text>
      <Text style={sbS.label}>{label}</Text>
      <Text style={[sbS.sub, subPositive && { color: COLORS.green }, subAlert && { color: COLORS.red }]}>{sub}</Text>
    </View>
  );
}

function WeeklyEarningsCard({ data }) {
  const max = Math.max(...data.weeklyEarningsData);
  return (
    <View style={[ecS.card, SHADOWS.card]}>
      <View style={ecS.bars}>
        {data.weeklyEarningsData.map((val, i) => {
          const h = Math.max((val / max) * 100, 8);
          const isToday = i === 3;
          return (
            <View key={i} style={ecS.barCol}>
              <Text style={ecS.barValue}>{isToday ? `₹${val}` : ''}</Text>
              <View style={ecS.barTrack}>
                <LinearGradient colors={isToday ? ['#1D4ED8', '#3B82F6'] : ['#BFDBFE', '#DBEAFE']} style={[ecS.bar, { height: `${h}%` }]} />
              </View>
              <Text style={[ecS.barDay, isToday && ecS.barDayActive]}>{data.labels[i]}</Text>
            </View>
          );
        })}
      </View>
      <View style={ecS.footer}>
        <View>
          <Text style={ecS.footerLabel}>Weekly Total</Text>
          <Text style={ecS.footerValue}>₹{data.weeklyEarningsData.reduce((a, b) => a + b, 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={ecS.footerLabel}>Protected</Text>
          <Text style={[ecS.footerValue, { color: COLORS.green }]}>₹{data.protectedEarnings.toLocaleString('en-IN')}</Text>
        </View>
      </View>
    </View>
  );
}

function HomeAlertPreview({ alert, onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  const c = alert.severity === 'critical' ? COLORS.red : alert.severity === 'high' ? COLORS.orange : alert.severity === 'medium' ? COLORS.yellow : COLORS.blue;
  const bg = alert.severity === 'critical' ? COLORS.redLight : alert.severity === 'high' ? COLORS.orangeLight : alert.severity === 'medium' ? COLORS.yellowLight : COLORS.blueLight;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={[apS.card, SHADOWS.card]}>
      <View style={[apS.bar, { backgroundColor: c }]} />
      <View style={apS.content}>
        <View style={apS.topRow}>
          <View style={[apS.badge, { backgroundColor: bg }]}>
            <Animated.View style={[apS.dot, { backgroundColor: c, transform: [{ scale: pulseAnim }] }]} />
            <Text style={[apS.badgeText, { color: c }]}>LIVE · {alert.severity.toUpperCase()}</Text>
          </View>
          <View style={apS.timeRow}>
            <Clock size={10} color={COLORS.textMuted} strokeWidth={2} />
            <Text style={apS.time}>{alert.timestamp}</Text>
          </View>
        </View>
        <Text style={apS.title}>{alert.title}</Text>
        <Text style={apS.desc} numberOfLines={2}>{alert.description}</Text>
        <View style={apS.footer}>
          <View><Text style={apS.fLabel}>Est. Income Loss</Text><Text style={apS.fLoss}>-₹{alert.expectedLoss}</Text></View>
          <View style={apS.fDivider} />
          <View><Text style={apS.fLabel}>Coverage Payout</Text><Text style={apS.fPayout}>+₹{alert.expectedPayout}</Text></View>
          <ChevronRight size={18} color={COLORS.blue} strokeWidth={2} style={{ marginLeft: 'auto' }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  greetingText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  nameText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  notifBadge: { position: 'absolute', top: 8, right: 8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#FFFFFF' },
  notifCount: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  summaryRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  riskPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  riskPillText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  policyCard: { borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md },
  policyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  policyCardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.8 },
  policyCardName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  policyCardId: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  policyBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  policyCardBottom: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  policyCardSublabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  policyCardValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  policyCardArrow: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.md },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm, marginTop: SPACING.md },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: COLORS.blue },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  riskSnapshot: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, flexDirection: 'row', gap: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  riskSnapshotLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  riskCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  riskScore: { fontSize: 18, fontWeight: '800' },
  riskScoreLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  riskLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  riskSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  riskTrendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  riskTrendText: { fontSize: 10, fontWeight: '600' },
  riskFactorMini: { flex: 1, justifyContent: 'space-between' },
  riskFactorRow: { marginBottom: 6 },
  riskFactorName: { fontSize: 10, color: COLORS.textMuted, marginBottom: 3 },
  riskBarBg: { height: 4, backgroundColor: COLORS.bgBorder, borderRadius: 2 },
  riskBarFill: { height: 4, borderRadius: 2 },
  platformRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  platformBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.bgBorder },
  platformText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
});
const sbS = StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  value: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  label: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },
  sub: { fontSize: 9, color: COLORS.textMuted, marginTop: 3 },
});
const ecS = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  bars: { flexDirection: 'row', height: 90, alignItems: 'flex-end', gap: 5 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 8, color: COLORS.blue, fontWeight: '700', marginBottom: 2 },
  barTrack: { width: '80%', height: '85%', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 4 },
  barDay: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  barDayActive: { color: COLORS.blue, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.bgBorder },
  footerLabel: { fontSize: 10, color: COLORS.textMuted },
  footerValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
});
const apS = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.bgBorder },
  bar: { width: 4 },
  content: { flex: 1, padding: SPACING.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  time: { fontSize: 10, color: COLORS.textMuted },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  desc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  fLabel: { fontSize: 10, color: COLORS.textMuted },
  fLoss: { fontSize: 13, fontWeight: '700', color: COLORS.red },
  fPayout: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  fDivider: { width: 1, height: 24, backgroundColor: COLORS.bgBorder, marginHorizontal: 12 },
});
