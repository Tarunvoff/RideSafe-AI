import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users, Shield, FileText, AlertTriangle, TrendingUp,
  Bell, Activity, IndianRupee, Clock,
} from 'lucide-react-native';
import AdminStatsCard from '../../components/admin/AdminStatsCard';
import { ADMIN_SYSTEM_STATS, ADMIN_FRAUD_ALERTS, ADMIN_DISRUPTIONS } from '../../data/adminMockData';

export default function AdminDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const stats = ADMIN_SYSTEM_STATS;
  const activeDisruptions = ADMIN_DISRUPTIONS.filter(d => d.status === 'active' || d.status === 'imminent');

  const STAT_TILES = [
    { label: 'Total Workers', value: stats.totalWorkers.toLocaleString('en-IN'), icon: Users, color: '#2563EB', trend: 'up', trendValue: '+12%' },
    { label: 'Active Policies', value: stats.activePolicies.toLocaleString('en-IN'), icon: Shield, color: '#7C3AED', trend: 'up', trendValue: '+8%' },
    { label: 'Claims This Month', value: stats.claimsThisMonth.toLocaleString('en-IN'), icon: FileText, color: '#F97316', trend: 'up', trendValue: '+22%' },
    { label: 'Fraud Alerts', value: stats.fraudAlerts, icon: AlertTriangle, color: '#EF4444', trend: 'up', trendValue: '+3' },
    { label: 'Total Payouts', value: `₹${(stats.totalPayoutsIssued / 10000000).toFixed(1)}Cr`, icon: IndianRupee, color: '#10B981', trend: 'up', trendValue: '+18%' },
    { label: 'Avg Payout Time', value: stats.avgPayoutTime, icon: Clock, color: '#0891B2', trendValue: '' },
    { label: 'Active Workers', value: stats.activeWorkers.toLocaleString('en-IN'), icon: Activity, color: '#059669', trend: 'up', trendValue: '+5%' },
    { label: 'Pending Claims', value: stats.pendingClaims, icon: Bell, color: '#DC2626', trend: 'neutral', trendValue: '' },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.headerGreet}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>Real-time system overview · March 11, 2026</Text>
        </View>
        <TouchableOpacity style={styles.alertDot} onPress={() => navigation.navigate('AdminFraud')}>
          <Bell size={18} color="#FFFFFF" strokeWidth={2} />
          {stats.fraudAlerts > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifText}>{stats.fraudAlerts}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Disruption Banner */}
        {activeDisruptions.length > 0 && (
          <TouchableOpacity style={styles.disruptionBanner} onPress={() => navigation.navigate('AdminDisruptions')}>
            <View style={styles.disruptionPulse}>
              <Activity size={14} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.disruptionBannerTitle}>
                {activeDisruptions.length} Active Disruption{activeDisruptions.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.disruptionBannerSub}>
                {activeDisruptions[0].title} — {activeDisruptions[0].city}
              </Text>
            </View>
            <Text style={styles.disruptionBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        <View style={styles.statsGrid}>
          {STAT_TILES.map((tile, i) => (
            <AdminStatsCard
              key={i}
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              color={tile.color}
              trend={tile.trend}
              trendValue={tile.trendValue}
            />
          ))}
        </View>

        {/* Approval Rate */}
        <View style={styles.approvalCard}>
          <View style={styles.approvalHeader}>
            <TrendingUp size={16} color="#10B981" strokeWidth={2.5} />
            <Text style={styles.approvalTitle}>Claim Approval Rate</Text>
            <Text style={styles.approvalRate}>{stats.claimApprovalRate}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stats.claimApprovalRate}%` }]} />
          </View>
          <Text style={styles.approvalSub}>
            {stats.claimsThisMonth.toLocaleString('en-IN')} total claims · {stats.pendingClaims} pending review
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'View Workers', color: '#2563EB', bg: '#EFF6FF', screen: 'AdminWorkers', icon: Users },
            { label: 'Monitor Claims', color: '#F97316', bg: '#FFF7ED', screen: 'AdminClaims', icon: FileText },
            { label: 'Disruptions', color: '#EF4444', bg: '#FEF2F2', screen: 'AdminDisruptions', icon: Activity },
            { label: 'Fraud & GPS', color: '#DC2626', bg: '#FEF2F2', screen: 'AdminFraud', icon: AlertTriangle },
            { label: 'Payouts', color: '#10B981', bg: '#D1FAE5', screen: 'AdminPayouts', icon: TrendingUp },
            { label: 'Policies', color: '#8B5CF6', bg: '#EDE9FE', screen: 'AdminPolicies', icon: Shield },
          ].map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, { backgroundColor: action.bg, borderColor: action.color + '30' }]}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.8}
              >
                <ActionIcon size={20} color={action.color} strokeWidth={2.5} />
                <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Premium Summary */}
        <View style={styles.premiumCard}>
          <Text style={styles.premiumLabel}>Total Premium Collected</Text>
          <Text style={styles.premiumValue}>₹{(stats.totalPremiumCollected / 10000000).toFixed(2)} Cr</Text>
          <Text style={styles.premiumSub}>
            Net Profit after payouts:{'  '}
            <Text style={{ color: '#10B981', fontWeight: '800' }}>
              ₹{((stats.totalPremiumCollected - stats.totalPayoutsIssued) / 10000000).toFixed(2)} Cr
            </Text>
          </Text>
        </View>

        {/* Payouts Section */}
        <Text style={styles.sectionTitle}>Payout Distribution</Text>
        <View style={styles.payoutGrid}>
          <View style={[styles.payoutCard, { backgroundColor: '#D1FAE5', borderColor: '#86EFAC' }]}>
            <Text style={[styles.payoutLabel, { color: '#10B981' }]}>Valid Payouts</Text>
            <Text style={[styles.payoutValue, { color: '#10B981' }]}>₹{(stats.totalPayoutsIssued * 0.85 / 1000000).toFixed(1)}M</Text>
            <Text style={styles.payoutSub}>2,540 workers</Text>
          </View>
          <View style={[styles.payoutCard, { backgroundColor: '#FECACA', borderColor: '#FCA5A5' }]}>
            <Text style={[styles.payoutLabel, { color: '#EF4444' }]}>Blocked (GPS)</Text>
            <Text style={[styles.payoutValue, { color: '#EF4444' }]}>₹{(stats.totalPayoutsIssued * 0.12 / 1000000).toFixed(1)}M</Text>
            <Text style={styles.payoutSub}>127 workers detected</Text>
          </View>
          <View style={[styles.payoutCard, { backgroundColor: '#FED7AA', borderColor: '#FDBA74' }]}>
            <Text style={[styles.payoutLabel, { color: '#F97316' }]}>Under Review</Text>
            <Text style={[styles.payoutValue, { color: '#F97316' }]}>₹{(stats.totalPayoutsIssued * 0.03 / 1000000).toFixed(1)}M</Text>
            <Text style={styles.payoutSub}>43 workers flagged</Text>
          </View>
        </View>

        {/* GPS Spoofing Impact */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <AlertTriangle size={18} color="#EF4444" strokeWidth={2.5} />
            <Text style={styles.impactTitle}>GPS Spoofing Impact</Text>
          </View>
          <View style={styles.impactRow}>
            <View>
              <Text style={styles.impactLabel}>Payouts Blocked This Month</Text>
              <Text style={[styles.impactValue, { color: '#EF4444' }]}>₹2.4 Cr</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.impactLabel}>Workers Flagged</Text>
              <Text style={styles.impactValue}>127</Text>
            </View>
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
  headerGreet: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  alertDot: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 6, right: 6, width: 14, height: 14, backgroundColor: '#EF4444', borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  notifText: { fontSize: 8, color: '#FFFFFF', fontWeight: '800' },
  scroll: { padding: 14 },
  disruptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#7F1D1D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  disruptionPulse: { width: 32, height: 32, backgroundColor: '#EF4444', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disruptionBannerTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  disruptionBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  disruptionBannerArrow: { color: '#EF4444', fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 10, marginTop: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 14 },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  approvalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  approvalTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  approvalRate: { fontSize: 20, fontWeight: '900', color: '#10B981' },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  approvalSub: { fontSize: 11, color: '#94A3B8' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    minWidth: '44%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 12, fontWeight: '800' },
  premiumCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  premiumLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  premiumValue: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  premiumSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  payoutGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  payoutCard: {
    flex: 1,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1.5,
  },
  payoutLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  payoutValue: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  payoutSub: { fontSize: 10, color: '#64748B' },
  impactCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  impactTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between' },
  impactLabel: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  impactValue: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
});
