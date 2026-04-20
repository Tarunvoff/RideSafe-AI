import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import AegisNavbar from '../../components/layout/AegisNavbar';
import { Theme } from '../../theme';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { paymentsApi, plansApi, type ClaimRecord } from '../../services/api';

type DemoScenario = 'RAIN' | 'CIVIC_MOVEMENT' | 'AQI';

type DemoStep = {
  title: string;
  detail: string;
  state: 'PENDING' | 'DONE' | 'PASSED' | 'COMPLETED' | 'FAILED';
};

const DEMO_LABELS: Record<DemoScenario, string> = {
  RAIN: 'RAIN',
  CIVIC_MOVEMENT: 'CIVIC MOVEMENT',
  AQI: 'AQI',
};

const DEMO_H3_BY_SCENARIO: Record<DemoScenario, string> = {
  RAIN: '8860145b6fffffff',
  CIVIC_MOVEMENT: '8860145b1fffffff',
  AQI: '8860145b3fffffff',
};

function baseFlowSteps(label: string): DemoStep[] {
  return [
    { title: 'Trigger Received', detail: `${label} scenario activated`, state: 'PENDING' },
    { title: 'Zone Validation', detail: 'Validating disruption zone...', state: 'PENDING' },
    { title: 'Fraud Gate', detail: 'Evaluating trust and fraud score...', state: 'PENDING' },
    { title: 'Razorpay Payout', detail: 'Initiating transfer rail...', state: 'PENDING' },
  ];
}

export default function ClaimsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [hasProcessing, setHasProcessing] = useState(false);
  const [demoScenario, setDemoScenario] = useState<DemoScenario>('RAIN');
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>(baseFlowSteps('RAIN'));
  const [demoSummary, setDemoSummary] = useState<null | {
    zone: string;
    lf: number;
    fraud: number;
    payout: number;
    reference: string;
  }>(null);
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

  const runClaimDemo = async () => {
    if (!driverId) {
      Alert.alert(t('common.error'), 'Driver session not found. Please login again.');
      return;
    }

    const scenarioLabel = DEMO_LABELS[demoScenario];
    const h3Cell = DEMO_H3_BY_SCENARIO[demoScenario];

    setDemoLoading(true);
    setDemoSummary(null);
    setDemoSteps(baseFlowSteps(scenarioLabel));

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const updateStep = (index: number, state: DemoStep['state'], detail: string) => {
      setDemoSteps((prev) =>
        prev.map((step, idx) => (idx === index ? { ...step, state, detail } : step)),
      );
    };

    try {
      updateStep(0, 'DONE', `${scenarioLabel} scenario activated`);
      await wait(180);

      updateStep(1, 'PASSED', `Zone HALTED at ${h3Cell}`);
      await wait(180);

      const fraudScore = demoScenario === 'CIVIC_MOVEMENT' ? 0.27 : demoScenario === 'AQI' ? 0.19 : 0.22;
      updateStep(2, 'PASSED', `Fraud score ${fraudScore.toFixed(2)} (PASS)`);
      await wait(180);

      const demoRes = await paymentsApi.demoClaim(demoScenario);
      const transferRef =
        String(demoRes?.payout?.transferReference || '') ||
        String(demoRes?.payout?.transactionId || '') ||
        'processing';

      updateStep(3, 'COMPLETED', `Transfer ${transferRef}`);

      setDemoSummary({
        zone: 'HALTED',
        lf: demoScenario === 'CIVIC_MOVEMENT' ? 0.88 : demoScenario === 'AQI' ? 0.76 : 0.82,
        fraud: fraudScore,
        payout: Number(demoRes?.expectedPayout ?? 0),
        reference: transferRef,
      });

      await loadClaims(false);
    } catch (e: any) {
      updateStep(3, 'FAILED', e?.message ?? 'Payout failed');
      Alert.alert('Claim demo failed', e?.message ?? 'Unable to run claim demo right now.');
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
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadClaims()} activeOpacity={0.8}>
              <Text style={styles.refreshBtnText}>{loading ? t('common.loading') : t('common.refresh')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.demoCard}>
          <View style={styles.scenarioRow}>
            {(Object.keys(DEMO_LABELS) as DemoScenario[]).map((scenario) => {
              const selected = demoScenario === scenario;
              return (
                <TouchableOpacity
                  key={scenario}
                  style={[styles.scenarioChip, selected ? styles.scenarioChipActive : null]}
                  activeOpacity={0.85}
                  disabled={demoLoading}
                  onPress={() => {
                    setDemoScenario(scenario);
                    setDemoSteps(baseFlowSteps(DEMO_LABELS[scenario]));
                    setDemoSummary(null);
                  }}
                >
                  <Text style={[styles.scenarioChipText, selected ? styles.scenarioChipTextActive : null]}>
                    {DEMO_LABELS[scenario]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.demoRunBtn, demoLoading ? styles.btnDisabled : null]}
            activeOpacity={0.85}
            onPress={() => void runClaimDemo()}
            disabled={demoLoading || loading}
          >
            <Text style={styles.demoRunBtnText}>{demoLoading ? 'RUNNING DEMO...' : 'RUN FULL FLOW DEMO'}</Text>
          </TouchableOpacity>

          <View style={styles.flowStepsWrap}>
            {demoSteps.map((step, idx) => {
              const isDone = step.state !== 'PENDING';
              const badgeStyle = step.state === 'FAILED' ? styles.flowBadgeFail : styles.flowBadge;
              const badgeText = step.state === 'PENDING' ? 'PENDING' : step.state;
              return (
                <View key={`${step.title}-${idx}`} style={styles.flowStepCard}>
                  <View style={styles.flowHeaderRow}>
                    <Text style={styles.flowTitle}>{step.title}</Text>
                    <View style={[badgeStyle, !isDone ? styles.flowBadgePending : null]}>
                      <Text style={styles.flowBadgeText}>{badgeText}</Text>
                    </View>
                  </View>
                  <Text style={styles.flowDetail}>{step.detail}</Text>
                </View>
              );
            })}
          </View>

          {demoSummary ? (
            <View style={styles.demoSummaryCard}>
              <Text style={styles.demoSummaryLine}>Zone: {demoSummary.zone} | Lf: {demoSummary.lf.toFixed(2)}</Text>
              <Text style={styles.demoSummaryLine}>Fraud: {demoSummary.fraud.toFixed(2)} (PASS)</Text>
              <Text style={styles.demoSummaryLine}>Payout: ₹{demoSummary.payout.toLocaleString('en-IN')}</Text>
              <Text style={styles.demoSummaryLine} numberOfLines={1}>Ref: {demoSummary.reference}</Text>
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  demoCard: {
    backgroundColor: '#F7F1DF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#000',
    padding: 14,
    marginBottom: 18,
  },
  scenarioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scenarioChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  scenarioChipActive: {
    backgroundColor: '#000',
  },
  scenarioChipText: {
    fontWeight: '900',
    fontSize: 15,
    color: '#000',
  },
  scenarioChipTextActive: {
    color: '#fff',
  },
  demoRunBtn: {
    marginTop: 12,
    backgroundColor: '#000',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
    paddingVertical: 14,
    alignItems: 'center',
  },
  demoRunBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  flowStepsWrap: {
    marginTop: 12,
    gap: 10,
  },
  flowStepCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
  },
  flowHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    flex: 1,
  },
  flowDetail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  flowBadge: {
    backgroundColor: '#0a9f4b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#000',
  },
  flowBadgeFail: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#000',
  },
  flowBadgePending: {
    backgroundColor: '#9ca3af',
  },
  flowBadgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  demoSummaryCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
    gap: 4,
  },
  demoSummaryLine: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
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
  demoBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  btnDisabled: {
    opacity: 0.6,
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