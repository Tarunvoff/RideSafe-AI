import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { plansApi, type ClaimRecord } from '../../services/api';
import { Theme } from '../../theme';

export default function ClaimsScreen() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasProcessing, setHasProcessing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const driverId = user?.id ?? null;

  const loadClaims = useCallback(async (showLoading = true) => {
    if (!driverId) return;
    if (showLoading) setLoading(true);
    try {
      const res = await plansApi.getPurchasedPlans();
      const policies = Array.isArray(res?.purchasedPolicies) ? res.purchasedPolicies : [];
      const mapped: ClaimRecord[] = policies
        .filter((p: any) => p.payout)
        .map((p: any) => ({
          claimId: p.payout.payoutId,
          status: p.payout.status,
          approvedPayout: p.payout.approvedPayout ?? p.payout.estimatedLoss ?? 0,
          trigger: p.payout.disruptionType ?? res?.latestDisruption?.type ?? 'UNKNOWN',
          transactionId: p.payout.transactionId,
          bankReference: p.payout.bankReference,
          transferredAt: p.payout.transferredAt,
          createdAt: p.payout.createdAt,
        }));
      setClaims(mapped);
      setHasProcessing(mapped.some((claim) => claim.status === 'PROCESSING'));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load claims');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (hasProcessing) {
      pollingRef.current = setInterval(() => {
        void loadClaims(false);
      }, 10000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [hasProcessing, loadClaims]);


  const renderStatusStyle = (status: string): [ViewStyle, TextStyle] =>
    status === 'APPROVED'
      ? [styles.claimStatusResolved, styles.claimStatusTextResolved]
      : [styles.claimStatusPending, styles.claimStatusTextPending];

  const renderStatusLabel = (status: string) => {
    if (status === 'APPROVED') return 'Paid Out';
    if (status === 'REJECTED') return 'Rejected';
    return 'Processing';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <LoadingOverlay visible={loading} message="Fetching claims timeline..." />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Claims</Text>
          <Button title={loading ? 'Loading...' : 'Refresh'} onPress={() => void loadClaims()} style={styles.newClaimBtn} />
        </View>
        {user?.email ? (
          <Text style={styles.subtitle}>Notification email: {user.email}</Text>
        ) : null}

        {claims.length === 0 ? (
          <Card style={styles.claimCard}>
            <Text style={styles.claimTitle}>No claims yet</Text>
            <Text style={styles.emptyStateText}>Claims appear here after a verified disruption triggers a payout.</Text>
          </Card>
        ) : (
          claims.map((claim) => {
            const [badgeStyle, badgeTextStyle] = renderStatusStyle(claim.status);
            return (
              <Card style={styles.claimCard} key={claim.claimId}>
                <View style={styles.claimHeader}>
                  <View style={badgeStyle}>
                    <Text style={badgeTextStyle}>{renderStatusLabel(claim.status)}</Text>
                  </View>
                  <Text style={styles.claimDate}>
                    {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLeft}>
                    <Text style={styles.claimTitle}>{claim.trigger}</Text>
                    <Text style={styles.claimId}>Claim #{claim.claimId}</Text>
                  </View>
                  <View style={styles.amountPill}>
                    <Text style={styles.amountPillText}>
                      ₹{Number(claim.approvedPayout || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference</Text>
                    <Text style={styles.detailValueFull}>
                      {claim.transactionId ? claim.transactionId : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Ref</Text>
                    <Text style={styles.detailValueFull}>
                      {claim.bankReference ? claim.bankReference : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRowInline}>
                    <Text style={styles.detailLabel}>Transferred</Text>
                    <Text style={styles.detailValueMuted}>
                      {claim.transferredAt ? new Date(claim.transferredAt).toLocaleString() : '—'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.surface },
  container: { padding: Theme.spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: { ...Theme.typography.h1, color: Theme.colors.text },
  subtitle: { ...Theme.typography.caption, color: Theme.colors.textSecondary, marginBottom: Theme.spacing.lg },
  newClaimBtn: { height: 36, paddingHorizontal: Theme.spacing.md },
  claimCard: { marginBottom: Theme.spacing.lg },
  claimHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm },
  claimStatusPending: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  claimStatusTextPending: { color: '#856404', ...Theme.typography.caption, fontWeight: '600' },
  claimStatusResolved: { backgroundColor: '#d4edda', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  claimStatusTextResolved: { color: '#155724', ...Theme.typography.caption, fontWeight: '600' },
  claimDate: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLeft: { flex: 1, paddingRight: Theme.spacing.sm },
  claimTitle: { ...Theme.typography.h3, color: Theme.colors.text, marginBottom: 4 },
  claimId: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  amountPill: {
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  amountPillText: { ...Theme.typography.body, color: Theme.colors.text, fontWeight: '600' },
  emptyStateText: { ...Theme.typography.body, color: Theme.colors.textSecondary },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: Theme.spacing.md },
  detailGrid: { gap: 10 },
  detailRow: { gap: 6 },
  detailRowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabel: { ...Theme.typography.caption, color: Theme.colors.textSecondary },
  detailValueFull: { ...Theme.typography.body, color: Theme.colors.text, lineHeight: 20 },
  detailValueMuted: { ...Theme.typography.body, color: Theme.colors.textSecondary }
});
