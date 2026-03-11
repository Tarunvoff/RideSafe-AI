import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Activity, Cloud, Wind, Zap } from 'lucide-react-native';
import { MOCK_WORKER, MOCK_RISK_FACTORS } from '../data/mockData';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const RISK_SCORE = 68;
const TABS = ['Overview', 'Factors', 'History'];

export default function RiskAnalysisScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('Overview');
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scoreAnim, { toValue: RISK_SCORE, duration: 1200, useNativeDriver: false }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const scoreColor = RISK_SCORE > 75 ? COLORS.red : RISK_SCORE > 50 ? COLORS.orange : COLORS.green;
  const scoreLabel = RISK_SCORE > 75 ? 'High Risk' : RISK_SCORE > 50 ? 'Moderate' : 'Low Risk';

  const scoreWidth = scoreAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerSub}>{MOCK_WORKER.name}</Text>
        <Text style={styles.headerTitle}>Risk Analysis</Text>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabItem, tab === t && styles.tabItemActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <View style={[styles.scoreCard, SHADOWS.card]}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabelText}>Your Risk Score</Text>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{RISK_SCORE}<Text style={styles.scoreMax}>/100</Text></Text>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '18' }]}>
              <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>{scoreLabel}</Text>
            </View>
          </View>
          <View style={styles.scoreRight}>
            <View style={styles.scoreBarWrap}>
              <View style={styles.scoreBarBg}>
                <Animated.View style={[styles.scoreBarFill, { width: scoreWidth, backgroundColor: scoreColor }]} />
              </View>
              <View style={styles.scoreBarZones}>
                <Text style={[styles.scoreZoneText, { color: COLORS.green }]}>Safe</Text>
                <Text style={[styles.scoreZoneText, { color: COLORS.orange }]}>Moderate</Text>
                <Text style={[styles.scoreZoneText, { color: COLORS.red }]}>High</Text>
              </View>
            </View>
            <Text style={styles.scoreSub}>Based on 14 days of data</Text>
            <View style={styles.scoreTrend}>
              <TrendingUp size={13} color={COLORS.red} strokeWidth={2.5} />
              <Text style={[styles.scoreTrendText, { color: COLORS.red }]}>+5 pts vs last week</Text>
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Weather Events', value: '3', icon: Cloud, color: COLORS.blue },
            { label: 'AQI Breaches', value: '2', icon: Wind, color: COLORS.orange },
            { label: 'Disruptions', value: '1', icon: Zap, color: COLORS.red },
          ].map((s) => (
            <View key={s.label} style={[styles.statBox, SHADOWS.card]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                <s.icon size={16} color={s.color} strokeWidth={2.5} />
              </View>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Risk Factors</Text>
        {(MOCK_RISK_FACTORS || [
          { id: 1, name: 'Heavy Rainfall', impact: 'high', score: 82, description: 'Monsoon season active — high flood risk in delivery zones', trend: 'up' },
          { id: 2, name: 'Poor AQI', impact: 'medium', score: 61, description: 'AQI 245 in Koramangala — unsafe for outdoor workers', trend: 'stable' },
          { id: 3, name: 'Road Disruption', impact: 'low', score: 34, description: 'Annual infrastructure maintenance near Silk Board junction', trend: 'down' },
          { id: 4, name: 'Peak Heat', impact: 'medium', score: 58, description: 'Temperatures exceeding 38°C between 12–4pm', trend: 'up' },
        ]).map((factor) => (
          <RiskFactorCard key={factor.id} factor={factor} />
        ))}

        {/* Coverage recommendation */}
        <View style={[styles.recCard, SHADOWS.card]}>
          <View style={styles.recHeader}>
            <Shield size={20} color={COLORS.blue} strokeWidth={2} />
            <Text style={styles.recTitle}>Coverage Recommendation</Text>
          </View>
          <Text style={styles.recBody}>
            Based on your current risk profile, upgrading to <Text style={styles.recHighlight}>Elite Guard</Text> would provide ₹800 extra weekly protection against weather and AQI disruptions in your delivery zones.
          </Text>
          <TouchableOpacity style={styles.recCta} onPress={() => navigation.navigate('Plans')}>
            <Text style={styles.recCtaText}>View Upgrade Options</Text>
            <ChevronRight size={14} color={COLORS.blue} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

function RiskFactorCard({ factor }) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const impactConfig = {
    high: { color: COLORS.red, bg: COLORS.redLight, label: 'HIGH' },
    medium: { color: COLORS.orange, bg: COLORS.orangeLight, label: 'MED' },
    low: { color: COLORS.green, bg: COLORS.greenLight, label: 'LOW' },
  };
  const ic = impactConfig[factor.impact] || impactConfig.low;
  const TrendIcon = factor.trend === 'up' ? TrendingUp : factor.trend === 'down' ? TrendingDown : Activity;
  const trendColor = factor.trend === 'up' ? COLORS.red : factor.trend === 'down' ? COLORS.green : COLORS.textMuted;

  return (
    <Animated.View style={{ opacity: opacAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.factorCard, { borderLeftColor: ic.color }, SHADOWS.card]}>
        <View style={styles.factorTop}>
          <View style={styles.factorNameRow}>
            <View style={[styles.impactBadge, { backgroundColor: ic.bg }]}>
              <Text style={[styles.impactLabel, { color: ic.color }]}>{ic.label}</Text>
            </View>
            <Text style={styles.factorName}>{factor.name}</Text>
          </View>
          <View style={styles.factorTrend}>
            <TrendIcon size={13} color={trendColor} strokeWidth={2.5} />
            <Text style={[styles.factorScore, { color: ic.color }]}>{factor.score}</Text>
          </View>
        </View>
        <Text style={styles.factorDesc}>{factor.description}</Text>
        <View style={styles.factorBar}>
          <View style={[styles.factorBarFill, { width: factor.score + "%", backgroundColor: ic.color }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: SPACING.md, paddingBottom: 0 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: SPACING.sm },
  tabs: { flexDirection: 'row', gap: 4, marginBottom: 0 },
  tabItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 0, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#FFFFFF' },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  scrollContent: { padding: SPACING.md },
  scoreCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, flexDirection: 'row', gap: 16, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  scoreLeft: { alignItems: 'center', justifyContent: 'center', width: 100 },
  scoreLabelText: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  scoreValue: { fontSize: 40, fontWeight: '900', lineHeight: 46 },
  scoreMax: { fontSize: 16, color: COLORS.textMuted, fontWeight: '500' },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginTop: 6 },
  scoreBadgeText: { fontSize: 11, fontWeight: '700' },
  scoreRight: { flex: 1 },
  scoreBarWrap: { marginBottom: 8 },
  scoreBarBg: { height: 8, backgroundColor: COLORS.bgBorder, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreBarZones: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreZoneText: { fontSize: 8, fontWeight: '600' },
  scoreSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6 },
  scoreTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreTrendText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statBox: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.bgBorder },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLbl: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  factorCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder, borderLeftWidth: 4 },
  factorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  factorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  impactLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  factorName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  factorTrend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factorScore: { fontSize: 16, fontWeight: '800' },
  factorDesc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 18 },
  factorBar: { height: 4, backgroundColor: COLORS.bgBorder, borderRadius: 2, overflow: 'hidden' },
  factorBarFill: { height: 4, borderRadius: 2 },
  recCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  recTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  recBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.sm },
  recHighlight: { color: COLORS.blue, fontWeight: '700' },
  recCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recCtaText: { fontSize: 13, color: COLORS.blue, fontWeight: '700' },
});
