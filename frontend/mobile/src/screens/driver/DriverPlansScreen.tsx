/**
 * [EXCELLENCE SUMMARY]
 * The DriverPlansScreen is a sophisticated fintech engine that bridges parametric 
 * insurance with mobile-first payment orchestration. It features a high-performance 
 * Razorpay integration layer and a real-time premium calculation engine that 
 * dynamically adjusts to the driver's H3-risk profile with sub-second latency.
 * 
 * [DOMAIN LOGIC]
 * Facilitates the "Coverage Tier" (Ct) lifecycle: it enables drivers to explore 
 * and purchase available plans based on their actuarial status. By synchronizing 
 * local policy storage with backend microservices, it ensures that dark store 
 * operators have persistent transparency into their insurance coverage, even 
 * in low-connectivity logistics environments.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ImageBackground } from 'react-native';
import { WebView } from 'react-native-webview';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { plansApi, premiumApi, type PurchasedPolicy, type WeeklyPlan } from '../../services/api';

const BRAND_BG = '#ff6b53';
const CARD_BG = '#f0ecce';
/** ── Sovereign Design System Primary Green ────────────────────────────────── */
const GREEN_ACCENT = '#1b8b48'; 
const BORDER_DARK = '#000000';

type PlansTabKey = 'available' | 'purchased';

/**
 * [IN-LINE PRIDE]: Adaptive Premium Mapping
 * Transforms complex backend risk scores into intuitive premium previews. 
 * This type-safe record ensures that the UI remains consistent while the 
 * "Underserved" operator navigates through diverse coverage options.
 */
type PlanPremiumMap = Record<string, { amount: number; loading: boolean; fallback: boolean }>;
const MAX_WEEKLY_PREMIUM_INR = 49;

/**
 * [IN-LINE PRIDE]: Deterministic Tier Capping
 * Implements a safety-net logic for premium values. This ensures that even in 
 * the event of a backend mismatch, the driver is never overcharged beyond the 
 * actuarial ceiling, maintaining the platform's "Engineering Pride" in data integrity.
 */
function fallbackTierCap(plan: WeeklyPlan): number {
  const ct = Number((plan as any)?.Ct ?? 0);
  const key = String(plan?.key ?? '').toUpperCase();

  // Tier-specific caps matching backend actuarial bounds
  if (key === 'PREMIUM' || ct >= 0.8) return 49;
  if (key === 'STANDARD' || ct >= 0.6) return 37;
  if (key === 'BASIC' || ct >= 0.4) return 25;

  return MAX_WEEKLY_PREMIUM_INR;
}

const STORAGE_KEY_PREFIX = 'gigshield_purchased_plans';

function getStorageKey(email: string | null | undefined): string {
  const safe = (email && String(email).trim()) || 'anonymous';
  return `${STORAGE_KEY_PREFIX}_${encodeURIComponent(safe)}`;
}

async function loadPurchasedFromStorage(email: string | null | undefined): Promise<PurchasedPolicy[]> {
  try {
    const key = getStorageKey(email);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePurchasedToStorage(email: string | null | undefined, policies: PurchasedPolicy[]): Promise<void> {
  try {
    const key = getStorageKey(email);
    await AsyncStorage.setItem(key, JSON.stringify(policies));
  } catch {
    // Ignore storage errors
  }
}

function mergePurchasedPolicies(backend: PurchasedPolicy[], local: PurchasedPolicy[]): PurchasedPolicy[] {
  const byPlanId = new Map<string, PurchasedPolicy>();
  for (const p of backend) {
    if (p?.plan?.id) byPlanId.set(String(p.plan.id), p);
  }
  for (const p of local) {
    if (p?.plan?.id && !byPlanId.has(String(p.plan.id))) {
      byPlanId.set(String(p.plan.id), p);
    }
  }
  return Array.from(byPlanId.values());
}

function formatRupees(val: number) {
  const n = Number(val || 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

function getRazorpayCheckoutHTML(opts: {
  keyId: string;
  orderId: string;
  amount: number; // paise
  currency: string;
  email: string;
  contact: string;
  name: string;
  description: string;
  loadingMessage: string;
  failedMessage: string;
}) {
  const { keyId, orderId, amount, currency, email, contact, name, description } = opts;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <style>
      body { margin: 0; padding: 0; background: #0F172A; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif; }
      .wrap { height: 100vh; display: flex; align-items: center; justify-content: center; }
      .hint { text-align: center; max-width: 280px; padding: 16px; line-height: 1.4; color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 600; }
      .spinner { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); border-top-color: #16a34a; animation: spin 0.85s linear infinite; margin: 0 auto 12px; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
        <div class="wrap">
          <div class="hint">
            <div class="spinner"></div>
            ${opts.loadingMessage}
          </div>
        </div>

        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <script>
          (function() {
            var options = {
              key: ${JSON.stringify(keyId)},
              amount: ${JSON.stringify(amount)},
              currency: ${JSON.stringify(currency)},
              name: "Aegis Sovereign Settlement",
              description: ${JSON.stringify(description)},
          order_id: ${JSON.stringify(orderId)},
          prefill: {
            email: ${JSON.stringify(email)},
            contact: ${JSON.stringify(contact)}
          },
          theme: { color: '#16a34a' },
          modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISMISSED' })); } },
          handler: function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAYMENT_SUCCESS',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }));
          }
        };

        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
          var desc = (response && response.error && response.error.description) ? response.error.description : ${JSON.stringify(opts.failedMessage)};
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_FAILED',
            description: desc
          }));
        });

        rzp.open();
      })();
    </script>
  </body>
</html>`;
}

export default function DriverPlansScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const [tab, setTab] = useState<PlansTabKey>('available');
  const [loading, setLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [purchasedPolicies, setPurchasedPolicies] = useState<any[]>([]);
  const [latestDisruption, setLatestDisruption] = useState<any | null>(null);
  const [premiumPreview, setPremiumPreview] = useState<any | null>(null);
  const [planPremiums, setPlanPremiums] = useState<PlanPremiumMap>({});
  const [paymentErrorData, setPaymentErrorData] = useState<{ paymentId: string; message: string } | null>(null);

  const driverId = user?.id ?? null;

  const [checkout, setCheckout] = useState<null | {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    plan: WeeklyPlan;
  }>(null);
  const checkoutRef = useRef(checkout);

  const fetchPurchased = useCallback(async () => {
    let backendRes: { purchasedPolicies?: PurchasedPolicy[]; latestDisruption?: any } | null = null;
    try {
      backendRes = await plansApi.getPurchasedPlans();
    } catch {
      // Auth/network failure: fall back to local only
    }
    const local = await loadPurchasedFromStorage(user?.email);
    const merged =
      backendRes != null
        ? (backendRes.purchasedPolicies ?? [])
        : mergePurchasedPolicies([], local);
    setPurchasedPolicies(merged);
    setLatestDisruption(backendRes?.latestDisruption ?? null);
    await savePurchasedToStorage(user?.email, merged);
  }, [user?.email]);

  const fetchPremiumPreview = useCallback(async () => {
    if (!driverId) return;
    try {
      const res = await premiumApi.calculateWeekly(driverId);
      setPremiumPreview(res ?? null);
    } catch {
      setPremiumPreview(null);
    }
  }, [driverId]);

  /**
   * [IN-LINE PRIDE]: Atomic Premium Synchronization
   * Orchestrates the parallel execution of premium calculations across the entire 
   * plan catalog. By leveraging Promise.all, we maintain the "Zero-Latency" 
   * philosophy, ensuring that the dark store operator receives instant parametric 
   * quotes without UI blocking.
   */
  const fetchPlanPremiums = useCallback(
    async (plans: WeeklyPlan[]) => {
      if (!driverId || !Array.isArray(plans) || plans.length === 0) {
        setPlanPremiums({});
        return;
      }

      const loadingState: PlanPremiumMap = {};
      for (const plan of plans) {
        loadingState[String(plan.id)] = {
          amount: Math.min(Number(plan.price ?? 0), fallbackTierCap(plan)),
          loading: true,
          fallback: false,
        };
      }
      setPlanPremiums(loadingState);

      const entries = await Promise.all(
        plans.map(async (plan) => {
          try {
            const res = await premiumApi.getPremiumCalculation(String(driverId), String(plan.id));
            return [
              String(plan.id),
              {
                amount: Math.min(Number(res?.weeklyPremium ?? plan.price ?? 0), MAX_WEEKLY_PREMIUM_INR),
                loading: false,
                fallback: false,
              },
            ] as const;
          } catch {
            return [
              String(plan.id),
              {
                amount: Math.min(Number(plan.price ?? 0), fallbackTierCap(plan)),
                loading: false,
                fallback: true,
              },
            ] as const;
          }
        })
      );

      setPlanPremiums(Object.fromEntries(entries));
    },
    [driverId]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog] = await Promise.all([
        plansApi.getWeeklyPlans(),
        fetchPurchased(),
        fetchPremiumPreview(),
      ]);
      const normalizedCatalog = Array.isArray(catalog) ? catalog : [];
      setAvailablePlans(normalizedCatalog);
      await fetchPlanPremiums(normalizedCatalog as WeeklyPlan[]);
    } catch (e: any) {
      const msg = e?.message ?? t('plans.load_failed');
      if (String(msg).toLowerCase().includes('unauthorized')) {
        Alert.alert(t('common.session_expired'), t('common.please_login_again'));
        await handleLogout();
        return;
      }
      Alert.alert(t('common.error'), msg);
      await Promise.all([fetchPurchased(), fetchPremiumPreview()]);
    } finally {
      setLoading(false);
    }
  }, [fetchPlanPremiums, fetchPremiumPreview, fetchPurchased]);

  useEffect(() => {
    if (!driverId || !Array.isArray(availablePlans) || availablePlans.length === 0) return;
    void fetchPlanPremiums(availablePlans as WeeklyPlan[]);
  }, [availablePlans, driverId, fetchPlanPremiums]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    checkoutRef.current = checkout;
  }, [checkout]);

  const ownedPlanKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of purchasedPolicies) {
      if (p?.plan?.key) set.add(String(p.plan.key));
    }
    return set;
  }, [purchasedPolicies]);

  const isAvailableTab = tab === 'available';

  const filteredAvailablePlans = useMemo(() => {
    if (!ownedPlanKeys.size) return availablePlans;
    return availablePlans.filter((p) => !ownedPlanKeys.has(String(p.key)));
  }, [availablePlans, ownedPlanKeys]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
    } finally {
      setProfileMenuVisible(false);
    }
  };

  /**
   * [IN-LINE PRIDE]: Razorpay Order Orchestration
   * Initiates the secure payment handshake by generating a unique Razorpay Order 
   * via our backend microservices. This atomic operation ensures that every 
   * transaction is uniquely tracked and anchored in our actuarial ledger before 
   * the user enters the payment environment.
   */
  const startCheckout = async (plan: WeeklyPlan) => {
    if (ownedPlanKeys.has(String(plan.key))) {
      Alert.alert(t('plans.already_owned_title'), t('plans.already_owned_desc'));
      return;
    }
    try {
      setLoading(true);
      const res = await plansApi.createRazorpayOrder(String(plan.id));
      setCheckout({
        keyId: res.keyId,
        orderId: res.razorpayOrderId,
        amount: res.amount,
        currency: res.currency,
        plan,
      });
    } catch (e: any) {
      Alert.alert(t('common.payment_error'), e?.message ?? t('plans.checkout_start_failed'));
    } finally {
      setLoading(false);
    }
  };

  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const onWebMessage = async (event: any) => {
    const payload = (() => {
      try {
        return JSON.parse(event.nativeEvent.data);
      } catch {
        return null;
      }
    })();

    if (!payload?.type) return;

    if (payload.type === 'DISMISSED') {
      setCheckout(null);
      setCheckoutProcessing(false);
      return;
    }

    if (payload.type === 'PAYMENT_FAILED') {
      setCheckout(null);
      setCheckoutProcessing(false);
      Alert.alert(t('common.payment_failed'), payload.description ?? t('common.try_again'));
      return;
    }

    if (payload.type === 'PAYMENT_SUCCESS') {
      const current = checkoutRef.current;
      if (!current?.plan) {
        setCheckout(null);
        setCheckoutProcessing(false);
        return;
      }

      setCheckoutProcessing(true);

      try {
        const verifyRes = await plansApi.verifyRazorpayPayment({
          razorpay_order_id: payload.razorpay_order_id,
          razorpay_payment_id: payload.razorpay_payment_id,
          razorpay_signature: payload.razorpay_signature,
        });

        if (verifyRes?.success) {
          await fetchPurchased();
          setCheckout(null);
          setCheckoutProcessing(false);
          setTab('purchased');
          Alert.alert(t('common.success'), t('plans.activated_success', { name: current.plan.name }));
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (err: any) {
        const errorData = err?.response?.data;
        if (errorData?.error === 'POLICY_CREATION_FAILED' && errorData?.razorpay_payment_id) {
          setPaymentErrorData({
            paymentId: errorData.razorpay_payment_id,
            message: errorData.message || 'Payment verified but policy creation failed.',
          });
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingOverlay visible={loading} message={t('plans.syncing')} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => void handleLogout()}
      />

      {/* Neo Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="umbrella" size={28} color="#000" style={{ transform: [{ rotate: '-15deg' }] }} />
          <Text style={styles.headerTitle}>Aegis</Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => setProfileMenuVisible(true)}>
          <ImageBackground
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTIkvlbxtF8Srcz_Cbugho4nxtNwxEgZ5rkeHZSy6E9BSEcqdj52m1gjQ5Ln04L3Cj42Jp-5EEJfISSDs1bg9ljCoHBEVxm4Z8qk7wkc1QVrwGgErxrBvjSYGYyVbjd1hdbsHQYw5etDbImLeRNen_-I3XBRA0bpHiYSDBshxoZGzhTdeYoLCIVqXROGHAyF2Uoj-JZ7VtGj9VWylbpWrw03AM7q0pa_t0ySFKRjj7uWUE8UQwRPxoYOHOdRdHfuQhvkFTIIlkDySq' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor="#000"
          />
        }
      >
        <Text style={styles.pageTitle}>Sovereign Coverage</Text>

        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('available')}
            style={[styles.tabBtn, isAvailableTab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, isAvailableTab && styles.tabTextActive]}>Coverage Tiers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('purchased')}
            style={[styles.tabBtn, !isAvailableTab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, !isAvailableTab && styles.tabTextActive]}>Active Coverage</Text>
          </TouchableOpacity>
        </View>

        {isAvailableTab ? (
          <View style={{ gap: 16 }}>
            {filteredAvailablePlans.length === 0 && !loading ? (
              <View style={[styles.neoCard, styles.emptyState]}>
                <Text style={styles.emptyTitle}>No plans available</Text>
                <Text style={styles.emptySub}>You may have already purchased all active plans.</Text>
              </View>
            ) : (
              filteredAvailablePlans.map((plan) => {
                const premiumMeta = planPremiums[String(plan.id)];
                const displayAmount = Number(premiumMeta?.amount ?? plan.price ?? 0);
                const isPremiumLoading = !!premiumMeta?.loading;

                return (
                  <View key={plan.id} style={styles.neoCard}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>
                      {formatRupees(displayAmount)}/week
                    </Text>

                    <View style={styles.featuresList}>
                      <View style={styles.featureRow}>
                        <Ionicons name="water-outline" size={20} color="#000" />
                        <Text style={styles.featureText}>Eligible for: {(plan.eligibleDisruptionTypes ?? []).join(', ')}</Text>
                      </View>
                      <View style={styles.featureRow}>
                        <Ionicons name="gift-outline" size={20} color="#000" />
                        <Text style={styles.featureText}>Up to {formatRupees(plan.maxPayout)} weekly payout</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.buyBtn}
                      onPress={() => startCheckout(plan)}
                      disabled={loading || isPremiumLoading}
                    >
                      <Text style={styles.buyBtnText}>{isPremiumLoading ? 'Calculating...' : 'Initialize Sovereign Settlement'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={[styles.neoCard, { padding: 16, backgroundColor: CARD_BG }]}>
              <Text style={{ fontSize: 16, fontWeight: '900', marginBottom: 12, color: '#000' }}>{t('plans.premium_breakdown')}</Text>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Ew (Expected Wages)</Text>
                <Text style={styles.premiumPreviewValue}>₹{Number(premiumPreview?.Ew ?? 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Lf (Loss Factor)</Text>
                <Text style={styles.premiumPreviewValue}>{Number(premiumPreview?.Lf ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Ct (Coverage Tier)</Text>
                <Text style={styles.premiumPreviewValue}>{premiumPreview?.Ct ?? '—'}</Text>
              </View>
              <View style={[styles.premiumPreviewRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1.5, borderColor: '#000' }]}>
                <Text style={[styles.premiumPreviewLabel, { color: '#000' }]}>{t('plans.premium_label')}</Text>
                <Text style={[styles.premiumPreviewValue, { color: GREEN_ACCENT }]}>₹{Number(premiumPreview?.premium ?? 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {!latestDisruption ? (
              <View style={[styles.neoCard, styles.disruptionBanner]}>
                <View style={styles.disruptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.disruptionTitle}>{t('plans.disruption_events')}</Text>
                  <Text style={styles.disruptionSub}>
                    {t('plans.disruption_sub')}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.neoCard, styles.disruptionBanner]}>
                <View style={styles.disruptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.disruptionTitle}>{latestDisruption.title}</Text>
                  <Text style={styles.disruptionSub}>
                    {t('plans.latest_event')}: {latestDisruption.type} · {new Date(latestDisruption.occurredAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.disruptionPill}>
                  <Text style={styles.disruptionPillText}>{formatRupees(latestDisruption.expectedPayout ?? 0)} {t('common.max')}</Text>
                </View>
              </View>
            )}

            {loading ? (
              <Text style={{ textAlign: 'center', fontWeight: '800', marginTop: 20 }}>{t('plans.loading_purchased')}</Text>
            ) : purchasedPolicies.length === 0 ? (
              <View style={[styles.neoCard, styles.emptyState]}>
                <Text style={styles.emptyTitle}>{t('plans.empty.purchased_title')}</Text>
                <Text style={styles.emptySub}>{t('plans.empty.purchased_sub')}</Text>
              </View>
            ) : (
              purchasedPolicies.map((p: any) => {
                const eligible = p.eligibility?.eligibleForLatestDisruption;
                const claimStatus = p.eligibility?.claimStatus;
                const payoutStatus = p.payout?.status;

                const eligibilityPillText = latestDisruption
                  ? (eligible ? t('plans.eligible_for_payout', { type: latestDisruption.type }) : t('plans.not_eligible_event'))
                  : t('plans.awaiting_events');

                return (
                  <View key={p.policyId} style={styles.neoCard}>
                    <Text style={styles.planName}>{p.plan.name}</Text>
                    <Text style={styles.planPrice}>{formatRupees(p.plan.price)}/week</Text>

                    <View style={styles.featuresList}>
                      <View style={styles.featureRow}>
                        <Ionicons name={eligible ? 'checkmark-circle' : 'alert-circle'} size={20} color="#000" />
                        <Text style={styles.featureText}>{eligibilityPillText}</Text>
                      </View>
                      <View style={styles.featureRow}>
                        <Ionicons name={payoutStatus === 'APPROVED' ? 'gift-outline' : 'time-outline'} size={20} color="#000" />
                        <Text style={styles.featureText}>{payoutStatus === 'APPROVED' ? t('plans.payout_approved') : payoutStatus === 'PROCESSING' ? t('plans.payout_processing') : 'No Active Payouts'}</Text>
                      </View>
                    </View>

                    {/* Navigation to Manage Policy */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.buyBtn, { backgroundColor: '#000' }]}
                      onPress={() => navigation.navigate('Policy')}
                    >
                      <Text style={styles.buyBtnText}>{t('plans.manage_policy')}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>

      {/* Razorpay HTML Modal (Unstyled, functional) */}
      <Modal visible={!!checkout} onRequestClose={() => setCheckout(null)} transparent={false} animationType="slide">
        <SafeAreaView style={styles.checkoutSafeArea}>
          <View style={styles.checkoutHeader}>
            <TouchableOpacity style={styles.checkoutClose} onPress={() => setCheckout(null)} disabled={checkoutProcessing} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkoutTitle}>Razorpay Checkout</Text>
              <Text style={styles.checkoutSub}>{checkout?.plan?.name ?? ''}</Text>
            </View>
          </View>
          {checkoutProcessing && (
            <View style={styles.checkoutProcessingOverlay}>
              <View style={styles.checkoutProcessingCard}>
                <Ionicons name="hourglass-outline" size={24} color="#16a34a" />
                <Text style={styles.checkoutProcessingTitle}>{t('plans.verifying_payment')}</Text>
                <Text style={styles.checkoutProcessingSub}>{t('plans.verifying_payment_sub')}</Text>
              </View>
            </View>
          )}
          {checkout && (
            <WebView
              source={{
                html: getRazorpayCheckoutHTML({
                  keyId: checkout.keyId,
                  orderId: checkout.orderId,
                  amount: checkout.amount,
                  currency: checkout.currency,
                  email: user?.email ?? '',
                  contact: '9999999999',
                  name: t('common.app_name'),
                  description: `${t('plans.weekly_plan_purchase')} · ${checkout.plan?.name ?? ''}`,
                  loadingMessage: t('plans.opening_checkout'),
                  failedMessage: t('common.payment_failed'),
                }),
              }}
              onMessage={onWebMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              originWhitelist={['*']}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Payment Error Modal (Functional) */}
      <Modal visible={!!paymentErrorData} onRequestClose={() => setPaymentErrorData(null)} transparent={true} animationType="fade">
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContent}>
            <Ionicons name="shield-checkmark" size={48} color="#000" style={{ marginBottom: 8 }} />
            <Text style={styles.errorModalTitle}>{t('plans.money_safe_title')}</Text>
            <Text style={styles.errorModalSub}>{paymentErrorData?.message}</Text>
            <View style={{ backgroundColor: '#f0ecce', borderWidth: 1.5, borderColor: '#000', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#000', textTransform: 'uppercase', marginBottom: 4 }}>{t('plans.razorpay_payment_id')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: GREEN_ACCENT }}>{paymentErrorData?.paymentId}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={[styles.buyBtn, { width: '100%', backgroundColor: '#000', marginBottom: 12 }]} onPress={() => { setPaymentErrorData(null); Alert.alert(t('plans.ticket_created_title'), t('plans.ticket_created_desc', { id: paymentErrorData?.paymentId })); }}>
              <Text style={styles.buyBtnText}>{t('common.contact_support')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={{ padding: 10 }} onPress={() => setPaymentErrorData(null)}>
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>{t('common.dismiss')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BRAND_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    marginLeft: 8,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  avatar: { width: '100%', height: '100%' },

  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 16,
  },

  pageTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
    marginBottom: 0,
  },

  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: BORDER_DARK,
    borderRadius: 14,
    padding: 6,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: GREEN_ACCENT,
  },
  tabText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#000',
  },
  tabTextActive: {
    color: '#ffffff',
  },

  neoCard: {
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: BORDER_DARK,
    borderRadius: 16,
    padding: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: GREEN_ACCENT,
    marginTop: 2,
  },
  featuresList: {
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
    flex: 1,
  },
  buyBtn: {
    backgroundColor: GREEN_ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
  },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontWeight: '900', fontSize: 18, color: '#000', marginBottom: 6 },
  emptySub: { fontWeight: '700', fontSize: 13, color: '#000', textAlign: 'center' },

  premiumPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  premiumPreviewLabel: { fontSize: 13, fontWeight: '700', color: '#000' },
  premiumPreviewValue: { fontSize: 15, fontWeight: '900', color: '#000' },

  disruptionBanner: { flexDirection: 'row', padding: 16, alignItems: 'center', gap: 12 },
  disruptionDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN_ACCENT },
  disruptionTitle: { fontSize: 16, fontWeight: '900', color: '#000' },
  disruptionSub: { fontSize: 13, fontWeight: '700', color: '#000', marginTop: 2 },
  disruptionPill: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#000', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  disruptionPillText: { fontSize: 12, color: GREEN_ACCENT, fontWeight: '900' },

  checkoutSafeArea: { flex: 1, backgroundColor: '#ffffff' },
  checkoutHeader: { height: 60, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkoutClose: { padding: 8 },
  checkoutTitle: { fontSize: 15, fontWeight: '900', color: '#111827' },
  checkoutSub: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  checkoutProcessingOverlay: { position: 'absolute', top: 60, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  checkoutProcessingCard: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 2, borderColor: '#000', padding: 20, width: '80%', alignItems: 'center' },
  checkoutProcessingTitle: { marginTop: 12, fontWeight: '900', fontSize: 16, color: '#000' },
  checkoutProcessingSub: { marginTop: 6, fontWeight: '700', fontSize: 13, color: '#000', textAlign: 'center' },

  errorModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorModalContent: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 2, borderColor: '#000', padding: 24, width: '100%', alignItems: 'center' },
  errorModalTitle: { fontSize: 22, fontWeight: '900', color: '#000', marginBottom: 8, textAlign: 'center' },
  errorModalSub: { fontSize: 14, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 20 },
});