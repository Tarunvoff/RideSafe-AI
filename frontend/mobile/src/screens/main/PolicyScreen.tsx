import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { Animated, PanResponder, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { plansApi, policyApi } from '../../services/api';
import { Theme } from '../../theme';

export default function PolicyScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [policy, setPolicy] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(t('policy.updating'));

  const driverId = user?.id ?? null;
  const hasPolicy = !!policy;

  const goToDashboard = useCallback(() => {
    navigation.navigate('DriverApp');
  }, [navigation]);

  const goToPlans = useCallback(() => {
    navigation.navigate('DriverPlans');
  }, [navigation]);

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plansApi.getPurchasedPlans();
      const purchased = res?.purchasedPolicies ?? [];
      setPolicy(purchased[0] ?? null);
    } catch {
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const doCancelPolicy = async () => {
    if (!driverId) {
      Alert.alert(t('policy.unable_cancel'), t('common.please_login_again'));
      return;
    }
    setActionMessage(t('policy.cancelling'));
    setActionLoading(true);
    try {
      await policyApi.cancel(String(driverId), 'Cancelled from mobile policy screen');
      await loadPolicy();
      Alert.alert(t('policy.cancelled_title'), t('policy.cancelled_desc'));
    } catch (e: any) {
      Alert.alert(t('policy.cancel_failed'), e?.message ?? t('policy.unable_cancel_now'));
    } finally {
      setActionLoading(false);
    }
  };

  const doRenewPolicy = async () => {
    if (!driverId) {
      Alert.alert(t('policy.unable_renew'), t('common.please_login_again'));
      return;
    }
    setActionMessage(t('policy.renewing'));
    setActionLoading(true);
    try {
      await policyApi.renew(String(driverId));
      await loadPolicy();
      Alert.alert(t('policy.renewed_title'), t('policy.renewed_desc'));
    } catch (e: any) {
      Alert.alert(t('policy.renew_failed'), e?.message ?? t('policy.unable_renew_now'));
    } finally {
      setActionLoading(false);
    }
  };

  const onPressCancelPolicy = () => {
    Alert.alert(
      t('policy.cancel_confirm_title'),
      t('policy.cancel_confirm_desc'),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes_cancel'), style: 'destructive', onPress: () => void doCancelPolicy() },
      ],
    );
  };

  const onPressRenewPolicy = () => {
    Alert.alert(
      t('policy.renew_confirm_title'),
      t('policy.renew_confirm_desc'),
      [
        { text: t('common.not_now'), style: 'cancel' },
        { text: t('common.renew'), onPress: () => void doRenewPolicy() },
      ],
    );
  };

  // Simple slide to activate logic
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= 260) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 180) {
          Animated.spring(slideAnim, { toValue: 260, useNativeDriver: true }).start();
          // Keep the gesture intentional while still returning thumb state for next use.
          setTimeout(() => {
            slideAnim.setValue(0);
            goToDashboard();
          }, 500);
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar />
      <LoadingOverlay visible={loading || actionLoading} message={actionLoading ? actionMessage : t('policy.loading')} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{t('policy.hero_title')}</Text>
          <Text style={styles.heroDesc}>{hasPolicy ? t('policy.hero_desc_active') : t('policy.hero_desc_inactive')}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.refreshBtn}
            onPress={() => void loadPolicy()}
            disabled={loading || actionLoading}
          >
            <Ionicons name="refresh-outline" size={15} color="#14532d" />
            <Text style={styles.refreshBtnText}>{t('policy.refresh_btn')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.planCardSection}>
          <View style={styles.planCard}>
            <View style={styles.planImage}>
              <Ionicons name="shield-checkmark" size={32} color="#16a34a" />
              <Text style={styles.planImageText}>{hasPolicy ? t('policy.status_active') : t('policy.status_inactive')}</Text>
            </View>
            <View style={styles.planContent}>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{policy?.plan?.key ?? t('policy.no_plan')}</Text>
              </View>
              <Text style={styles.planTitle}>{policy?.plan?.name ?? t('policy.no_active_plan')}</Text>
              
              <View style={styles.planPriceBox}>
                <Text style={styles.planPrice}>₹{Number(policy?.plan?.price ?? 0).toLocaleString('en-IN')} <Text style={styles.planPricePeriod}>/ {t('common.week')}</Text></Text>
                <Text style={styles.planDesc}>{t('policy.weekly_protection_desc')}</Text>
              </View>
            </View>
          </View>
        </View>

        {hasPolicy ? (
          <>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>{t('policy.summary_title')}</Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons name="shield-checkmark" size={20} color={Theme.colors.primary} />
                  <Text style={styles.summaryLabel}>{t('policy.coverage_limit')}</Text>
                </View>
                <Text style={styles.summaryValue}>₹{Number(policy?.plan?.maxPayout ?? 0).toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons name="wallet" size={20} color={Theme.colors.primary} />
                  <Text style={styles.summaryLabel}>{t('policy.deductible')}</Text>
                </View>
                <Text style={styles.summaryValue}>₹0</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelRow}>
                  <Ionicons name="calendar" size={20} color={Theme.colors.primary} />
                  <Text style={styles.summaryLabel}>{t('policy.next_billing')}</Text>
                </View>
                <Text style={styles.summaryValue}>{policy?.endDate ? new Date(policy.endDate).toLocaleDateString() : '—'}</Text>
              </View>
            </View>

            <View style={styles.autoClaimSection}>
              <View style={styles.autoClaimBox}>
                <Ionicons name="checkmark-circle" size={24} color={Theme.colors.primary} style={{ marginTop: 2, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoClaimTitle}>{t('policy.auto_claim_title')}</Text>
                  <Text style={styles.autoClaimDesc}>{t('policy.auto_claim_desc')}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyStateCard}>
            <Ionicons name="information-circle-outline" size={22} color="#15803d" />
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyStateTitle}>{t('policy.no_active_policy')}</Text>
              <Text style={styles.emptyStateSub}>{t('policy.no_active_policy_sub')}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionSection}>
          {hasPolicy ? (
            <>
              <View style={styles.lifecycleRow}>
                <TouchableOpacity
                  style={[styles.lifecycleBtn, styles.cancelBtn, actionLoading && styles.lifecycleBtnDisabled]}
                  onPress={onPressCancelPolicy}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#b91c1c" />
                  <Text style={styles.cancelBtnText}>{t('policy.cancel_btn')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.lifecycleBtn, styles.renewBtn, actionLoading && styles.lifecycleBtnDisabled]}
                  onPress={onPressRenewPolicy}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh-outline" size={18} color="#166534" />
                  <Text style={styles.renewBtnText}>{t('policy.renew_btn')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sliderTrack}>
                <Text style={styles.sliderText}>{t('policy.slide_to_dashboard')}</Text>
                <Animated.View {...panResponder.panHandlers} style={[styles.sliderThumb, { transform: [{ translateX: slideAnim }] }]}> 
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                  <Ionicons name="chevron-forward" size={24} color="#fff" style={{ marginLeft: -12 }} />
                </Animated.View>
              </View>

              <TouchableOpacity style={styles.activateBtn} onPress={goToDashboard}>
                <Text style={styles.activateBtnText}>{t('policy.back_to_dashboard')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.activateBtn} onPress={goToPlans}>
              <Text style={styles.activateBtnText}>{t('policy.browse_plans')}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.termsText}>{t('policy.terms_agree_hint')}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 32 },
  
  heroSection: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  heroDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
  refreshBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshBtnText: { color: '#14532d', fontSize: 12, fontWeight: '800' },

  planCardSection: { padding: 16 },
  planCard: { backgroundColor: '#f8fafc', borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  planImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  planImageText: { fontSize: 13, color: '#166534', fontWeight: '900', letterSpacing: 0.6 },
  planContent: { padding: 20 },
  planBadge: { backgroundColor: `${Theme.colors.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 4 },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: Theme.colors.primary, letterSpacing: 1 },
  planTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  planPriceBox: { marginTop: 8 },
  planPrice: { fontSize: 24, fontWeight: '800', color: Theme.colors.primary, marginBottom: 4 },
  planPricePeriod: { fontSize: 14, fontWeight: '400', color: '#64748b' },
  planDesc: { fontSize: 14, color: '#475569', lineHeight: 22 },

  summarySection: { paddingHorizontal: 24, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryLabel: { fontSize: 14, fontWeight: '500', color: '#475569' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  autoClaimSection: { padding: 24 },
  autoClaimBox: { flexDirection: 'row', backgroundColor: `${Theme.colors.primary}0D`, padding: 16, borderRadius: Theme.borderRadius.xl, borderWidth: 1, borderColor: `${Theme.colors.primary}33` },
  autoClaimTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  autoClaimDesc: { fontSize: 12, color: '#475569', lineHeight: 18 },
  emptyStateCard: {
    marginHorizontal: 24,
    marginTop: 10,
    padding: 14,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  emptyStateTitle: { color: '#14532d', fontWeight: '900', fontSize: 14 },
  emptyStateSub: { marginTop: 3, color: '#166534', fontWeight: '600', fontSize: 12, lineHeight: 17 },

  actionSection: { paddingHorizontal: 24, marginTop: 'auto', paddingTop: 16, gap: 16 },
  lifecycleRow: { flexDirection: 'row', gap: 10 },
  lifecycleBtn: {
    flex: 1,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  lifecycleBtnDisabled: { opacity: 0.55 },
  cancelBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  cancelBtnText: { fontSize: 13, fontWeight: '800', color: '#b91c1c' },
  renewBtn: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  renewBtnText: { fontSize: 13, fontWeight: '800', color: '#166534' },
  sliderTrack: { height: 64, backgroundColor: '#f1f5f9', borderRadius: 32, justifyContent: 'center', paddingHorizontal: 4, position: 'relative' },
  sliderText: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#94a3b8', letterSpacing: 1 },
  sliderThumb: { width: 56, height: 56, borderRadius: 28, backgroundColor: Theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, zIndex: 10 },
  activateBtn: { backgroundColor: Theme.colors.primary, height: 56, borderRadius: Theme.borderRadius.xl, alignItems: 'center', justifyContent: 'center', shadowColor: Theme.colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsText: { textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: '600', letterSpacing: 1 },
});
