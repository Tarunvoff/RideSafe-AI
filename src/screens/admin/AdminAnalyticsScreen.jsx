import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart2 } from 'lucide-react-native';
import { BarChart, PieChart, TrendLine, StatRow } from '../../components/admin/AnalyticsChart';
import { ADMIN_ANALYTICS, ADMIN_SYSTEM_STATS, ADMIN_RISK_ZONES } from '../../data/adminMockData';

const RISK_ZONE_COLORS = {
  critical: '#EF4444',
  high:     '#F97316',
  moderate: '#F59E0B',
  low:      '#10B981',
};

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const stats = ADMIN_SYSTEM_STATS;
  const analytics = ADMIN_ANALYTICS;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Platform performance metrics · Mar 2026</Text>
        </View>
        <BarChart2 size={20} color="rgba(255,255,255,0.4)" strokeWidth={2} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Summary */}
        <View style={styles.kpiRow}>
          {[
            { label: 'Total Workers', value: stats.totalWorkers.toLocaleString('en-IN'), color: '#2563EB' },
            { label: 'Active Policies', value: stats.activePolicies.toLocaleString('en-IN'), color: '#7C3AED' },
            { label: 'Claims / Month', value: stats.claimsThisMonth.toLocaleString('en-IN'), color: '#F97316' },
          ].map((kpi, i) => (
            <View key={i} style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Worker Growth Trend */}
        <TrendLine
          data={analytics.workerGrowth.map(d => d.value)}
          color="#2563EB"
          title="Worker Registrations (Monthly)"
          subtitle={`+${(analytics.workerGrowth[6].value / analytics.workerGrowth[0].value * 100 - 100).toFixed(0)}% growth`}
          height={100}
        />

        {/* Weekly Payouts */}
        <BarChart
          data={analytics.weeklyPayouts.map(d => ({ label: d.label, value: d.value }))}
          color="#10B981"
          accentColor="#059669"
          title="Weekly Payouts (₹ Thousands)"
          height={130}
        />

        {/* Policy Distribution */}
        <PieChart
          data={analytics.policyDistribution}
          title="Policy Distribution"
        />

        {/* Claims by Disruption Type */}
        <PieChart
          data={analytics.claimsByType}
          title="Claims by Disruption Type"
        />

        {/* Claims Overview */}
        <View style={styles.claimsCard}>
          <Text style={styles.claimsCardTitle}>Claims Overview</Text>
          <View style={styles.claimsBigRow}>
            <View style={styles.claimsBig}>
              <Text style={styles.claimsBigValue}>{analytics.claimsOverview.total.toLocaleString('en-IN')}</Text>
              <Text style={styles.claimsBigLabel}>Total Claims</Text>
            </View>
            <View style={styles.claimsBig}>
              <Text style={[styles.claimsBigValue, { color: '#10B981' }]}>{analytics.claimsOverview.approvalRate}%</Text>
              <Text style={styles.claimsBigLabel}>Approval Rate</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <StatRow
            label="Paid / Approved"
            value={analytics.claimsOverview.approved.toLocaleString('en-IN')}
            color="#10B981"
            percentage={(analytics.claimsOverview.approved / analytics.claimsOverview.total) * 100}
          />
          <StatRow
            label="Pending Review"
            value={analytics.claimsOverview.pending.toLocaleString('en-IN')}
            color="#F59E0B"
            percentage={(analytics.claimsOverview.pending / analytics.claimsOverview.total) * 100}
          />
          <StatRow
            label="Rejected"
            value={analytics.claimsOverview.rejected.toLocaleString('en-IN')}
            color="#EF4444"
            percentage={(analytics.claimsOverview.rejected / analytics.claimsOverview.total) * 100}
          />
        </View>

        {/* Risk Zones Table */}
        <View style={styles.zonesCard}>
          <Text style={styles.zonesTitle}>Risk Zone Overview</Text>
          {ADMIN_RISK_ZONES.map((zone, i) => (
            <View key={i} style={[styles.zoneRow, i === ADMIN_RISK_ZONES.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.zoneDot, { backgroundColor: RISK_ZONE_COLORS[zone.riskLevel] }]} />
              <Text style={styles.zoneCity}>{zone.city}</Text>
              <Text style={styles.zoneWorkers}>{zone.insuredWorkers.toLocaleString('en-IN')} insured</Text>
              <View style={[styles.zoneScore, { backgroundColor: RISK_ZONE_COLORS[zone.riskLevel] + '20' }]}>
                <Text style={[styles.zoneScoreText, { color: RISK_ZONE_COLORS[zone.riskLevel] }]}>
                  {zone.riskScore}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Platform Summary */}
        <View style={styles.platformCard}>
          <Text style={styles.platformTitle}>Platform Financial Summary</Text>
          <View style={styles.platformGrid}>
            {[
              { label: 'Premiums Collected', value: `₹${(stats.totalPremiumCollected / 10000000).toFixed(2)} Cr`, color: '#2563EB' },
              { label: 'Payouts Issued', value: `₹${(stats.totalPayoutsIssued / 10000000).toFixed(2)} Cr`, color: '#F97316' },
              { label: 'Claim Ratio', value: `${((stats.totalPayoutsIssued / stats.totalPremiumCollected) * 100).toFixed(1)}%`, color: '#F59E0B' },
              { label: 'Net Margin', value: `₹${((stats.totalPremiumCollected - stats.totalPayoutsIssued) / 10000000).toFixed(2)} Cr`, color: '#10B981' },
            ].map((item, i) => (
              <View key={i} style={styles.platformItem}>
                <Text style={[styles.platformValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.platformLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  scroll: { padding: 14 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EEF8',
  },
  kpiValue: { fontSize: 18, fontWeight: '900' },
  kpiLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600', textAlign: 'center', marginTop: 3 },
  claimsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF8',
  },
  claimsCardTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  claimsBigRow: { flexDirection: 'row', marginBottom: 12 },
  claimsBig: { flex: 1, alignItems: 'center' },
  claimsBigValue: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  claimsBigLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 4 },
  zonesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF8',
  },
  zonesTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneCity: { flex: 1, fontSize: 13, fontWeight: '700', color: '#334155' },
  zoneWorkers: { fontSize: 11, color: '#64748B' },
  zoneScore: { width: 36, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  zoneScoreText: { fontSize: 12, fontWeight: '800' },
  platformCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  platformTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  platformItem: { minWidth: '44%', flex: 1 },
  platformValue: { fontSize: 18, fontWeight: '900' },
  platformLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, fontWeight: '600' },
});
