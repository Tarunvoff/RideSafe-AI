import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  Switch,
} from 'react-native';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import AegisNavbar from '../../components/layout/AegisNavbar';
import { Theme } from '../../theme';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { insuranceApi, plansApi, type ClaimRecord } from '../../services/api';

export default function ClaimsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasProcessing, setHasProcessing] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [demoScenario, setDemoScenario] = useState<'RAIN' | 'TRAFFIC' | 'FLOOD'>('RAIN');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoFlow, setDemoFlow] = useState<any>(null);
  const [displayedTimeline, setDisplayedTimeline] = useState<any[]>([]);
  const [debugSpooferMode, setDebugSpooferMode] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

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

  const getFlowStatusStyles = (status: string) => {
    if (status === 'PASSED' || status === 'COMPLETED' || status === 'DONE') {
      return [styles.flowStatusSuccessBg, styles.flowStatusSuccessText] as const;
    }
    if (status === 'BLOCKED' || status === 'FAILED') {
      return [styles.flowStatusDangerBg, styles.flowStatusDangerText] as const;
    }
    return [styles.flowStatusWarnBg, styles.flowStatusWarnText] as const;
  };

  const runDemoFlow = async () => {
    try {
      setDemoLoading(true);
      setDemoFlow(null);
      setDisplayedTimeline([]);
      // ── Hardware Context Injection (Layer D & E Reality Checks) ────────────
      // Refer Documentation: ARCHITECTURE/SENTINEL_FRAUD_ARCHITECTURE.md
      const result = await insuranceApi.triggerDemoFlow({ 
        scenario: demoScenario,
        accelerometerVariance: debugSpooferMode ? 0.01 : 4.5,
        barometricPressureHpa: debugSpooferMode ? 1013 : 995,
        acousticMatchConfidence: debugSpooferMode ? 0.1 : 0.92,
      });
      setDemoFlow(result);

      const timeline = Array.isArray(result?.timeline) ? result.timeline : [];
      for (const step of timeline) {
        await new Promise((resolve) => setTimeout(resolve, 550));
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDisplayedTimeline((prev) => [...prev, step]);
      }

      await loadClaims(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? 'Failed to run demo trigger flow');
    } finally {
      setDemoLoading(false);
    }
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

      <AegisNavbar 
        onProfile={() => setProfileMenuVisible(true)}
        light
      />

      <LoadingOverlay visible={loading} message={t('claims.loading')} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>{t('claims.title')}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadClaims()} activeOpacity={0.8}>
            <Text style={styles.refreshBtnText}>{loading ? t('common.loading') : t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Demo Trigger Flow</Text>
          <Text style={styles.demoSubtitle}>Trigger - Zone Check - Fraud Check - Razorpay Payout</Text>

          <View style={styles.scenarioRow}>
            {(['RAIN', 'TRAFFIC', 'FLOOD'] as const).map((scenario) => (
              <TouchableOpacity
                key={scenario}
                style={[styles.scenarioBtn, demoScenario === scenario && styles.scenarioBtnActive]}
                onPress={() => setDemoScenario(scenario)}
                activeOpacity={0.9}
              >
                <Text style={[styles.scenarioBtnText, demoScenario === scenario && styles.scenarioBtnTextActive]}>
                  {scenario === 'TRAFFIC' ? 'CIVIC SENSE' : scenario}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
              Debug Mode (Spoofer)
            </Text>
            <Switch
              value={debugSpooferMode}
              onValueChange={setDebugSpooferMode}
              trackColor={{ false: '#D1D5DB', true: '#EF4444' }}
              thumbColor={debugSpooferMode ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 15 }}>
            {debugSpooferMode ? "Atmos Sentinel Block (1013 Hpa, 0.1 Acoustic) simulating indoor flatline." : "Atmos Sentinel Valid (995 Hpa, 0.92 Acoustic) simulating severe storm profile."}
          </Text>

          <TouchableOpacity
            style={[styles.runDemoBtn, demoLoading && styles.runDemoBtnDisabled]}
            onPress={() => void runDemoFlow()}
            disabled={demoLoading}
            activeOpacity={0.9}
          >
            <Text style={styles.runDemoBtnText}>{demoLoading ? 'RUNNING FLOW...' : 'RUN FULL FLOW DEMO'}</Text>
          </TouchableOpacity>

          {demoLoading ? (
            <View style={styles.demoProgressRow}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={styles.demoProgressText}>Simulating real-time orchestration...</Text>
            </View>
          ) : null}

          {demoFlow?.timeline?.length ? (
            <View style={styles.flowTimelineWrap}>
              {displayedTimeline.map((step: any) => {
                const [statusBg, statusText] = getFlowStatusStyles(step.status);
                return (
                  <View key={step.id} style={styles.flowStepCard}>
                    <View style={styles.flowStepTopRow}>
                      <Text style={styles.flowStepLabel}>{step.label}</Text>
                      <View style={[styles.flowStatusBadge, statusBg]}>
                        <Text style={[styles.flowStatusText, statusText]}>{step.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.flowStepDetail}>{step.detail}</Text>
                  </View>
                );
              })}

              {displayedTimeline.length === (demoFlow?.timeline?.length ?? 0) ? (
                <View style={styles.flowMetaCard}>
                  <Text style={styles.flowMetaText}>Zone: {demoFlow?.stages?.zone?.state} | Lf: {Number(demoFlow?.stages?.zone?.lfScore ?? 0).toFixed(2)}</Text>
                  <Text style={styles.flowMetaText}>Fraud: {Number(demoFlow?.stages?.fraud?.score ?? 0).toFixed(2)} ({demoFlow?.stages?.fraud?.gate})</Text>
                  <Text style={styles.flowMetaText}>Payout: ₹{Number(demoFlow?.stages?.payout?.amount ?? 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.flowMetaText} numberOfLines={1}>Ref: {demoFlow?.stages?.payout?.transferReference || demoFlow?.stages?.payout?.transactionId || 'N/A'}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
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
    backgroundColor: Theme.colors.brandOrange,
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
  demoCard: {
    backgroundColor: '#F7F1DF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    padding: 14,
    marginBottom: 18,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    marginBottom: 3,
  },
  demoSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    opacity: 0.65,
    marginBottom: 12,
  },
  scenarioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  scenarioBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scenarioBtnActive: {
    backgroundColor: '#000',
  },
  scenarioBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
  },
  scenarioBtnTextActive: {
    color: '#fff',
  },
  runDemoBtn: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  runDemoBtnDisabled: {
    opacity: 0.6,
  },
  runDemoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  demoProgressRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoProgressText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    opacity: 0.7,
  },
  flowTimelineWrap: {
    marginTop: 12,
    gap: 8,
  },
  flowStepCard: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
  },
  flowStepTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  flowStepLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
  },
  flowStatusBadge: {
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flowStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  flowStatusSuccessBg: {
    backgroundColor: '#008A45',
  },
  flowStatusSuccessText: {
    color: '#fff',
  },
  flowStatusWarnBg: {
    backgroundColor: '#FFD700',
  },
  flowStatusWarnText: {
    color: '#000',
  },
  flowStatusDangerBg: {
    backgroundColor: '#ef4444',
  },
  flowStatusDangerText: {
    color: '#fff',
  },
  flowStepDetail: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    opacity: 0.8,
  },
  flowMetaCard: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    gap: 3,
  },
  flowMetaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
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