import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import { useAuth } from '../../context/AuthContext';
import { plansApi, type ClaimRecord } from '../../services/api';
import { Theme } from '../../theme';

export default function ClaimsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasProcessing, setHasProcessing] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

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
      Alert.alert(t('common.error'), e?.message ?? t('claims.load_failed'));
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
    if (status === 'APPROVED') return t('claims.status.paid_out');
    if (status === 'REJECTED') return t('claims.status.rejected');
    return t('claims.status.processing');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
      <LoadingOverlay visible={loading} message={t('claims.loading')} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('claims.title')}</Text>
          <Button title={loading ? t('common.loading') : t('common.refresh')} onPress={() => void loadClaims()} style={styles.newClaimBtn} />
        </View>
        {user?.email ? (
          <Text style={styles.subtitle}>{t('claims.notification_email')}: {user.email}</Text>
        ) : null}

        {claims.length === 0 ? (
          <Card style={styles.claimCard}>
            <Text style={styles.claimTitle}>{t('claims.no_claims')}</Text>
            <Text style={styles.emptyStateText}>{t('claims.empty_state')}</Text>
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
                    <Text style={styles.claimId}>{t('claims.id_label')} #{claim.claimId}</Text>
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
                    <Text style={styles.detailLabel}>{t('claims.reference')}</Text>
                    <Text style={styles.detailValueFull}>
                      {claim.transactionId ? claim.transactionId : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('claims.bank_ref')}</Text>
                    <Text style={styles.detailValueFull}>
                      {claim.bankReference ? claim.bankReference : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailRowInline}>
                    <Text style={styles.detailLabel}>{t('claims.transferred_at')}</Text>
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
