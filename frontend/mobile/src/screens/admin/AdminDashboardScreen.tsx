import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AdminShell from '../../components/AdminShell';
import { Theme } from '../../theme';
import { ADMIN_TEST_DASHBOARD_SUMMARY } from './adminMockData';

export default function AdminDashboardScreen({ navigation }: any) {
  const [summary] = useState(ADMIN_TEST_DASHBOARD_SUMMARY);

  const formatINR = useMemo(
    () => (value: number) => `₹${Math.round(value ?? 0).toLocaleString('en-IN')}`,
    [],
  );

  return (
    <AdminShell navigation={navigation} activeKey="dash">
      <View style={styles.root}>
        {/* Page title section (top navbar lives above and stays sticky) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>ADMIN DASHBOARD</Text>
            <Text style={styles.headerSubtitle}>OPERATIONAL OVERVIEW</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Overview Grid */}
          <View style={styles.overviewGrid}>
            <OverviewCell label="Total Workers" value={String(summary.totalWorkers)} />
            <OverviewCell label="Active Plans" value={String(summary.activePlans)} isRight />
            <OverviewCell label="Active Alerts" value={String(summary.activeAlerts)} isTop />
            <OverviewCell label="Claims Today" value={String(summary.claimsToday)} isTop isRight />
            <OverviewCell label="High Risk Workers" value={String(summary.highRiskWorkers)} isTop />
            <OverviewCell
              label="Simulated Payout"
              value={formatINR(summary.simulatedPayout)}
              isTop
              isRight
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>QUICK ACTIONS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsRow}
            >
              <QuickAction icon={<MaterialIcons name="add-alert" size={22} color={Theme.colors.text} />} label="Alert" />
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
              <QuickAction icon={<MaterialIcons name="analytics" size={22} color={Theme.colors.text} />} label="Analytics" />
            </ScrollView>
          </View>

          {/* Risk Overview Chart Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionKicker}>RISK DISTRIBUTION</Text>
            <View style={styles.riskPlaceholder}>
              <MaterialIcons name="monitor" size={40} color={Theme.colors.text} />
              <Text style={styles.placeholderText}>
                {summary.highRiskWorkers} high-risk workers tracked
              </Text>
            </View>
          </View>

          {/* Recent Alerts (Empty State) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionKicker}>RECENT ALERTS</Text>
              <Text style={styles.viewAll}>VIEW ALL</Text>
            </View>
            <View style={styles.simpleList}>
              {summary.recentAlerts.map((a) => (
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

          {/* Recent Claims (Empty State) */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionKicker}>RECENT CLAIMS</Text>
              <Text style={styles.viewAll}>VIEW ALL</Text>
            </View>
            <View style={styles.simpleList}>
              {summary.recentClaims.map((c) => (
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
                    <Text style={styles.simpleListTitle}>
                      {c.userEmail ?? 'Unknown user'}
                    </Text>
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

function OverviewCell({
  label,
  value,
  isTop,
  isRight,
}: {
  label: string;
  value: string;
  isTop?: boolean;
  isRight?: boolean;
}) {
  return (
    <View
      style={[
        styles.overviewCell,
        isTop ? styles.cellTopBorder : null,
        isRight ? styles.cellRightBorder : null,
      ]}
    >
      <Text style={styles.cellLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.cellValue}>{value}</Text>
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
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  root: { flex: 1, backgroundColor: Theme.colors.background },

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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: Theme.spacing.lg,
    paddingTop: 60,
  },
  profileMenuBox: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.lg,
    padding: 8,
    width: 220,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  profileMenuHeader: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  profileMenuEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.text,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#fef2f2',
  },
  profileMenuTextLogout: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },

  scrollContent: {
    paddingBottom: 110,
  },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  overviewCell: {
    width: '50%',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
  },
  cellTopBorder: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  cellRightBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Theme.colors.border,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: Theme.colors.text,
  },
  cellValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: Theme.colors.text,
  },

  section: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: Theme.colors.text,
  },

  quickActionsRow: {
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
    gap: 12,
  },
  quickActionBtn: {
    width: 90,
    height: 90,
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

  riskPlaceholder: {
    marginTop: Theme.spacing.md,
    width: '100%',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Theme.colors.background,
  },
  placeholderText: { fontSize: 12, color: Theme.colors.text },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.6,
    color: Theme.colors.text,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  emptyBox: {
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  emptyBoxText: { fontSize: 12, color: Theme.colors.text },

  simpleList: { marginTop: Theme.spacing.md, gap: 10 },
  simpleListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
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

  // Bottom navbar is shared via `AdminBottomNavbar`.
});
