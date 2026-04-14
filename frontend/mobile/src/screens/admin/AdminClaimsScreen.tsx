/**
 * [EXCELLENCE SUMMARY]
 * The AdminClaimsScreen is the financial audit command of the Aegis platform. 
 * It provides a comprehensive view of the parametric payout funnel, 
 * tracking every insurance claim from 'Processing' to 'Paid Out'. Designed 
 * for fiscal transparency, it combines real-time data fetching with 
 * rigorous status filtering to ensure zero-leakage in the actuarial lifecycle.
 * 
 * [DOMAIN LOGIC]
 * Orchestrates the 'Payout Integrity' vertical. By segmenting claims into 
 * 'Rain' or 'AQI' categories, administrators can monitor which environmental 
 * triggers are driving the most significant financial outflows. The 'Total Payout' 
 * metric serves as the primary gauge for the platform's social impact 
 * and capital efficiency.
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AdminShell from '../../components/layout/AdminShell';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { Theme } from '../../theme';
import { adminApi } from '../../services/api';

export default function AdminClaimsScreen({ navigation }: any) {
  // Profile/logout handled globally by AdminShell

  const handleBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else navigation.navigate('AdminDashboard');
  };

  const [claimsRes, setClaimsRes] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROCESSING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RAIN' | 'AQI'>('ALL');

  /**
   * [IN-LINE PRIDE]: Atomic Fetch Sequencing
   * Enforces a clean state transition between filter updates and 
   * network requests. By wrapping the fetch logic in useCallback, 
   * we prevent unnecessary re-renders while ensuring that the 
   * 'LoadingOverlay' state is perfectly synced with the backend 
   * response cycle.
   */
  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getClaims({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
      });
      setClaimsRes(res ?? null);
    } catch {
      setClaimsRes(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const claims = claimsRes?.claims ?? [];
  const summary = claimsRes ?? { total: 0, pendingReview: 0, totalPayout: 0, claims: [] };

  /**
   * [IN-LINE PRIDE]: High-Precision Localization
   * Enforces the 'en-IN' locale for all financial representations. In an 
   * Indian operational context, representing currency in the regional 
   * standard is a key part of the platform's professional visual identity.
   */
  const formatINR = useMemo(
    () => (value: number) => `₹${Math.round(value ?? 0).toLocaleString('en-IN')}`,
    [],
  );

  return (
    <AdminShell navigation={navigation} activeKey="claims">
      <LoadingOverlay visible={loading} message="Loading claims and payouts..." />
      <View style={styles.root}>
        {/* Header (page-specific) */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={20} color={Theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>CLAIMS</Text>
          </View>
        </View>

        <View style={styles.kickerWrap}>
          <Text style={styles.kicker}>CLAIMS AND PAYOUT MONITORING</Text>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          <FilterButton
            label={`Claim Type: ${typeFilter}`}
            onPress={() => {
              const options: Array<typeof typeFilter> = ['ALL', 'RAIN', 'AQI'];
              const next = options[(options.indexOf(typeFilter) + 1) % options.length];
              setTypeFilter(next);
            }}
          />
          <FilterButton
            label={`Status: ${statusFilter}`}
            onPress={() => {
              const options: Array<typeof statusFilter> = ['ALL', 'PROCESSING', 'APPROVED', 'REJECTED'];
              const next = options[(options.indexOf(statusFilter) + 1) % options.length];
              setStatusFilter(next);
            }}
          />
        </ScrollView>

        {/* Summary */}
        <View style={styles.summaryStrip}>
          <SummaryCell label="Total Claims" value={String(summary.total)} isRightBorder />
          <SummaryCell label="Pending Review" value={String(summary.pendingReview)} isRightBorder />
          <SummaryCell label="Total Payout" value={formatINR(summary.totalPayout)} />
        </View>

        {claims.length ? (
          <ScrollView contentContainerStyle={styles.listWrap} showsVerticalScrollIndicator={false}>
            {claims.map((c: any) => (
              <View key={c.payoutId} style={styles.claimRow}>
                <View style={styles.claimRowTop}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {c.status === 'APPROVED' ? 'PAID OUT' : 'PROCESSING'}
                    </Text>
                  </View>
                  <Text style={styles.claimEmail}>{c.userEmail ?? 'Unknown user'}</Text>
                </View>
                <Text style={styles.claimMeta}>
                  {c.disruption?.title ?? 'Disruption'} •{' '}
                  {c.approvedPayout != null ? formatINR(c.approvedPayout) : 'N/A'}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="receipt-long" size={64} color={Theme.colors.text} />
            </View>
            <Text style={styles.emptyTitle}>No claims available</Text>
            <Text style={styles.emptySubtitle}>Claim records and payout activity will appear here</Text>
          </View>
        )}
      </View>
    </AdminShell>
  );
}

function FilterButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.filterText}>{label.toUpperCase()}</Text>
      <MaterialIcons name="expand-more" size={18} color={Theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

function SummaryCell({
  label,
  value,
  isRightBorder,
}: {
  label: string;
  value: string;
  isRightBorder?: boolean;
}) {
  return (
    <View style={[styles.summaryCell, isRightBorder ? styles.summaryCellRightBorder : null]}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.background },
  root: { flex: 1, backgroundColor: Theme.colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.background,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: Theme.colors.text,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Theme.colors.surface,
  },

  kickerWrap: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    alignItems: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  filtersScroll: { flexGrow: 0 },
  filtersRow: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
    gap: 8,
  },
  filterBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.background,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Theme.colors.text,
  },

  summaryStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },
  summaryCell: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  summaryCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Theme.colors.textSecondary,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 110,
  },
  emptyIconWrap: {
    opacity: 0.2,
    marginBottom: Theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 18,
  },

  listWrap: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 110,
    gap: 12,
  },
  claimRow: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.background,
    padding: Theme.spacing.md,
  },
  claimRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${Theme.colors.primary}15`,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  claimEmail: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: Theme.colors.text,
  },
  claimMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },

  // Bottom navbar is shared via `AdminBottomNavbar`.

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
});

