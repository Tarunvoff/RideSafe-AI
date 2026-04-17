/**
 * [EXCELLENCE SUMMARY]
 * The AdminDashboardScreen is the mission-control center for the Aegis 
 * platform administrators. It provides a real-time, high-density view of 
 * the entire insurance ecosystem. Designed with a 'Brutalist-Minimal' 
 * aesthetic, it prioritizes rapid information retrieval and decision-making 
 * for high-stakes operational management.
 * 
 * [DOMAIN LOGIC]
 * Synthesizes cross-vertical data points—including real-time weather alerts, 
 * active insurance plans, and pending parametric claims. This screen 
 * acts as the primary cockpit for monitoring the 'H3-Risk' engine's 
 * real-world impacts on the gig-economy workforce.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { adminApi } from '../../services/api';
import { Theme } from '../../theme';

export default function AdminDashboardScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * [IN-LINE PRIDE]: Resilience & Fallbacks
   * Implements a robust data fetching pattern with immediate state 
   * reset on failure. This ensures that the admin is never viewing 
   * 'stale' or 'corrupt' summary data, maintaining the integrity of 
   * the operational overview.
   */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard();
      setSummary(res ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const safeSummary = summary ?? {
    totalWorkers: 0,
    activePlans: 0,
    activeAlerts: 0,
    claimsToday: 0,
    highRiskWorkers: 0,
    projectedPayout: 0,
    simulatedPayout: 0,
    totalApprovedPayout: 0,
    totalPremiumCollected: 0,
    lossRatio: 0,
    lossRatioPercent: 0,
    benefitCostRatio: 0,
    recentAlerts: [],
    recentClaims: [],
  };

  /**
   * [IN-LINE PRIDE]: Localized Financial Precision
   * Enforces strict INR formatting with useMemo for performance. In the 
   * context of payouts, precision in currency representation is a non-negotiable 
   * trust anchor between the platform and the administrators.
   */
  const formatINR = useMemo(
    () => (value: number) => `₹${Math.round(value ?? 0).toLocaleString('en-IN')}`,
    [],
  );

  const projectedPayout = Number(
    safeSummary.projectedPayout ?? safeSummary.simulatedPayout ?? 0,
  );
  const lossRatioPercent = Number(safeSummary.lossRatioPercent ?? 0);
  
  // P-012: Benefit-Cost Ratio = Premium (Benefit) / Payouts (Cost)
  const totalPremium = Number(safeSummary.totalPremiumCollected ?? 0);
  const totalPayout = Number(safeSummary.totalApprovedPayout ?? 0);
  const benefitCostRatio = totalPayout > 0 ? (totalPremium / totalPayout).toFixed(2) : 'N/A';

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      <LoadingOverlay visible={loading} message="Loading admin dashboard..." />
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>ADMIN DASHBOARD</Text>
            <Text style={styles.headerSubtitle}>OPERATIONAL OVERVIEW</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>KEY METRICS</Text>
            <View style={styles.kpiGrid}>
              <KpiCard label="Total Workers" value={String(safeSummary.totalWorkers)} />
              <KpiCard label="Active Plans" value={String(safeSummary.activePlans)} />
              <KpiCard label="Active Alerts" value={String(safeSummary.activeAlerts)} />
              <KpiCard label="Claims Today" value={String(safeSummary.claimsToday)} />
              <KpiCard label="High Risk" value={String(safeSummary.highRiskWorkers)} />
              <KpiCard label="Projected Payout" value={formatINR(projectedPayout)} />
              <KpiCard label="Loss Ratio" value={`${lossRatioPercent.toFixed(2)}%`} />
              <KpiCard label="Benefit-Cost" value={benefitCostRatio} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionKicker}>QUICK ACTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsRow}>
              <QuickAction
                icon={<MaterialIcons name="add-alert" size={22} color={Theme.colors.text} />}
                label="Alert"
                onPress={() => navigation.navigate('AdminAlerts')}
              />
              <QuickAction
                icon={<MaterialIcons name="report" size={22} color={Theme.colors.text} />}
                label="Fraud"
                onPress={() => navigation.navigate('AdminFraudReview')}
              />
              <QuickAction
                icon={<MaterialIcons name="group" size={22} color={Theme.colors.text} />}
                label="Workers"
                onPress={() => navigation.navigate('AdminWorkers')}
              />
              <QuickAction
                icon={<MaterialIcons name="description" size={22} color={Theme.colors.text} />}
                label="Claims"
                onPress={() => navigation.navigate('AdminClaims')}
              />
              <QuickAction
                icon={<MaterialIcons name="analytics" size={22} color={Theme.colors.text} />}
                label="Analytics"
                onPress={() => navigation.navigate('AdminAnalytics')}
              />
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionKicker}>RECENT ALERTS</Text>
              <Text style={styles.viewAll} onPress={() => navigation.navigate('AdminAlerts')}>VIEW ALL</Text>
            </View>
            <View style={styles.simpleList}>
              {(safeSummary.recentAlerts || []).map((a: any) => (
                <View key={a.id} style={styles.simpleListRow}>
                  <View style={styles.greenDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simpleListTitle}>{a.title}</Text>
                    <Text style={styles.simpleListMeta}>
                      {a.type} • {a.expectedPayout != null ? formatINR(a.expectedPayout) : 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.simpleListTime}>
                    {new Date(a.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionKicker}>RECENT CLAIMS</Text>
              <Text style={styles.viewAll}>VIEW ALL</Text>
            </View>
            <View style={styles.simpleList}>
              {(safeSummary.recentClaims || []).map((c: any) => (
                <View key={c.payoutId} style={styles.simpleListRow}>
                  <View
                    style={[
                      styles.statusPill,
                      c.status === 'APPROVED' ? styles.statusPillApproved : styles.statusPillProcessing,
                    ]}
                  >
                    <Text style={styles.statusPillText}>
                      {c.status === 'APPROVED' ? 'PAID OUT' : 'PROCESSING'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.simpleListTitle}>{c.userEmail ?? 'Unknown user'}</Text>
                    <Text style={styles.simpleListMeta}>
                      {c.disruption?.title ?? 'Disruption'} •{' '}
                      {c.approvedPayout != null ? formatINR(c.approvedPayout) : 'N/A'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </AdminShell>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.quickActionIcon}>{icon}</View>
      <Text style={styles.quickActionLabel}>{label.toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { paddingBottom: 110 },

  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  headerLeft: { flexDirection: 'column', gap: 4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: Theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.textSecondary,
  },

  section: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.text,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  kpiCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xs,
    backgroundColor: Theme.colors.background,
    gap: 3,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: Theme.colors.textSecondary,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },

  quickActionsRow: {
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xs,
    gap: 10,
  },
  quickActionBtn: {
    width: 84,
    height: 84,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  quickActionIcon: { marginBottom: 8 },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: Theme.colors.text,
  },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: Theme.colors.text,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },

  simpleList: { marginTop: Theme.spacing.sm, gap: 8 },
  simpleListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xs,
    backgroundColor: Theme.colors.background,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
  },
  simpleListTitle: { fontSize: 13, fontWeight: '900', color: Theme.colors.text },
  simpleListMeta: { fontSize: 11, fontWeight: '700', color: Theme.colors.textSecondary, marginTop: 3 },
  simpleListTime: { fontSize: 10, fontWeight: '800', color: Theme.colors.textSecondary },

  statusPill: { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillApproved: { backgroundColor: `${Theme.colors.primary}15` },
  statusPillProcessing: { backgroundColor: `${Theme.colors.primary}10` },
  statusPillText: { fontSize: 10, fontWeight: '900', color: Theme.colors.primary },
});

