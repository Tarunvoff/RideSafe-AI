import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { plansApi, type ClaimRecord } from '../../services/api';

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

  const loadClaims = useCallback(
    async (showLoading = true) => {
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
    },
    [driverId, t],
  );

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

  const getStatusText = (status: string) => {
    if (status === 'APPROVED') return t('claims.status.paid_out');
    if (status === 'REJECTED') return t('claims.status.rejected');
    return t('claims.status.processing');
  };

  const getStatusStyles = (status: string) => {
    if (status === 'APPROVED') {
      return [styles.statusPaid, styles.statusTextPaid] as const;
    }

    if (status === 'REJECTED') {
      return [styles.statusRejected, styles.statusTextRejected] as const;
    }

    return [styles.statusProc, styles.statusTextProc] as const;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FF6B4E" />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <View style={styles.headerTop}>
        <View style={styles.logoAndBrand}>
          <View style={styles.logoBlackBox}>
            <MaterialCommunityIcons name="shield-check" size={24} color="white" />
          </View>
          <Text style={styles.brandText}>Aegis</Text>
        </View>

        <TouchableOpacity onPress={() => setProfileMenuVisible(true)}>
          <Image source={{ uri: 'https://i.pravatar.cc/100' }} style={styles.avatarTop} />
        </TouchableOpacity>
      </View>

      <LoadingOverlay visible={loading} message={t('claims.loading')} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>{t('claims.title')}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadClaims()} activeOpacity={0.8}>
            <Text style={styles.refreshBtnText}>{loading ? t('common.loading') : t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>

        {claims.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('claims.no_claims')}</Text>
            <Text style={styles.emptySub}>{t('claims.empty_state')}</Text>
          </View>
        ) : (
          claims.map((claim) => {
            const [badgeStyle, badgeTextStyle] = getStatusStyles(claim.status);
            const claimId = String(claim.claimId || '');

            return (
              <View key={claimId} style={styles.claimCard}>
                <View style={styles.claimTopRow}>
                  <View style={[styles.statusBadge, badgeStyle]}>
                    <Text style={[styles.statusText, badgeTextStyle]}>{getStatusText(claim.status)}</Text>
                  </View>
                  <Text style={styles.claimDateText}>
                    {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString('en-IN') : '-'}
                  </Text>
                </View>

                <View style={styles.mainInfoRow}>
                  <View style={styles.mainInfoLeft}>
                    <Text style={styles.claimTriggerTitle} numberOfLines={1} ellipsizeMode="tail">
                      {claim.trigger}
                    </Text>
                    <Text style={styles.claimIdText}>#{claimId.slice(0, 12)}...</Text>
                  </View>
                  <Text style={styles.claimAmountValue}>₹{Number(claim.approvedPayout || 0).toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaSection}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Ref</Text>
                    <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="tail">
                      {claim.transactionId || '-'}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Bank</Text>
                    <Text style={styles.metaValue} numberOfLines={1} ellipsizeMode="tail">
                      {claim.bankReference || '-'}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Date</Text>
                    <Text style={styles.metaValue}>
                      {claim.transferredAt ? new Date(claim.transferredAt).toLocaleDateString('en-IN') : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6B4E',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoAndBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBlackBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  avatarTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    flexShrink: 1,
    marginRight: 10,
  },
  refreshBtn: {
    backgroundColor: '#008A45',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  refreshBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#F7F1DF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    opacity: 0.6,
    textAlign: 'center',
  },
  claimCard: {
    backgroundColor: '#F7F1DF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  claimTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  statusPaid: {
    backgroundColor: '#008A45',
  },
  statusProc: {
    backgroundColor: '#FFD700',
  },
  statusRejected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusTextPaid: {
    color: '#FFF',
  },
  statusTextProc: {
    color: '#000',
  },
  statusTextRejected: {
    color: '#fff',
  },
  claimDateText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000',
  },
  mainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mainInfoLeft: {
    flex: 1,
    minWidth: 0,
  },
  claimTriggerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
  },
  claimIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
    opacity: 0.4,
  },
  claimAmountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#008A45',
  },
  metaDivider: {
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 12,
  },
  metaSection: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    opacity: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
});