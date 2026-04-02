import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import { plansApi, premiumApi, type PurchasedPolicy, type WeeklyPlan } from '../../services/api';

type PlansTabKey = 'available' | 'purchased';

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

function buildLocalPolicy(plan: WeeklyPlan): PurchasedPolicy {
  const now = new Date();
  const endDate = new Date(now.getTime() + (plan.durationDays ?? 7) * 24 * 60 * 60 * 1000);
  return {
    policyId: `local_${plan.id}_${now.getTime()}`,
    plan: {
      id: plan.id,
      key: plan.key ?? 'unknown',
      name: plan.name,
      price: plan.price,
      maxPayout: plan.maxPayout,
    },
    status: 'ACTIVE',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    eligibility: {
      eligibleForLatestDisruption: false,
      claimStatus: 'PENDING',
    },
    payout: null,
  };
}

/** Merge backend (source of truth) + local (fallback for in-flight verify). Dedupe by plan.id, backend wins. */
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
}) {
  const { keyId, orderId, amount, currency, email, contact, name, description } = opts;

  // Razorpay expects integer amount in paise.
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
        Opening secure Razorpay checkout...
      </div>
    </div>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      (function() {
        var options = {
          key: ${JSON.stringify(keyId)},
          amount: ${JSON.stringify(amount)},
          currency: ${JSON.stringify(currency)},
          name: ${JSON.stringify(name)},
          description: ${JSON.stringify(description)},
          order_id: ${JSON.stringify(orderId)},
          prefill: {
            email: ${JSON.stringify(email)},
            contact: ${JSON.stringify(contact)},
            method: 'upi',
            vpa: 'success@razorpay'
          },
          theme: { color: '#16a34a' },
          modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISMISSED' })); } },
          handler: function(response) {
            // handler provides: razorpay_payment_id, razorpay_order_id, razorpay_signature
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
          var desc = (response && response.error && response.error.description) ? response.error.description : 'Payment failed';
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
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const [tab, setTab] = useState<PlansTabKey>('available');
  const [loading, setLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [purchasedPolicies, setPurchasedPolicies] = useState<any[]>([]);
  const [latestDisruption, setLatestDisruption] = useState<any | null>(null);
  const [premiumPreview, setPremiumPreview] = useState<any | null>(null);

  const driverId = user?.id ?? user?.email ?? null;

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
    // Backend is source of truth when it succeeds (clears stale local). Local only when backend fails.
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog] = await Promise.all([
        plansApi.getWeeklyPlans(),
        fetchPurchased(),
        fetchPremiumPreview(),
      ]);
      setAvailablePlans(Array.isArray(catalog) ? catalog : []);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load plans.';
      if (String(msg).toLowerCase().includes('unauthorized')) {
        Alert.alert('Session expired', 'Please log in again.');
        await handleLogout();
        return;
      }
      Alert.alert('Error', msg);
      // Still try to load purchased (may have local fallback)
      await Promise.all([fetchPurchased(), fetchPremiumPreview()]);
    } finally {
      setLoading(false);
    }
  }, [fetchPremiumPreview, fetchPurchased]);

  // Refetch plans from DB every time this screen gains focus (e.g. tapping Plans tab)
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    checkoutRef.current = checkout;
  }, [checkout]);

  const ownedPlanIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of purchasedPolicies) {
      if (p?.plan?.id) set.add(String(p.plan.id));
    }
    return set;
  }, [purchasedPolicies]);

  const isAvailableTab = tab === 'available';

  const filteredAvailablePlans = useMemo(() => {
    if (!ownedPlanIds.size) return availablePlans;
    return availablePlans.filter((p) => !ownedPlanIds.has(String(p.id)));
  }, [availablePlans, ownedPlanIds]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignore and clear local state in AuthContext.
    } finally {
      setProfileMenuVisible(false);
    }
  };

  const startCheckout = async (plan: WeeklyPlan) => {
    if (ownedPlanIds.has(String(plan.id))) {
      Alert.alert('Already owned', 'You already have this plan.');
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
      Alert.alert('Payment Error', e?.message ?? 'Could not start checkout.');
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
      Alert.alert('Payment Failed', payload.description ?? 'Try again.');
      return;
    }

    if (payload.type === 'PAYMENT_SUCCESS') {
      const current = checkoutRef.current;
      if (!current?.plan) {
        setCheckout(null);
        setCheckoutProcessing(false);
        return;
      }

      setCheckout(null);
      setCheckoutProcessing(false);

      // Instant UI: add locally and switch to Purchased tab
      const localPolicy = buildLocalPolicy(current.plan);
      setPurchasedPolicies((prev) => {
        const planId = String(current.plan.id);
        if (prev.some((p) => p?.plan?.id && String(p.plan.id) === planId)) return prev;
        const next = [...prev, localPolicy];
        void savePurchasedToStorage(user?.email, next);
        return next;
      });
      setTab('purchased');

      // Verify on backend → creates Policy in DB → sync purchased from backend
      try {
        const verifyRes = await plansApi.verifyRazorpayPayment({
          razorpay_order_id: payload.razorpay_order_id,
          razorpay_payment_id: payload.razorpay_payment_id,
          razorpay_signature: payload.razorpay_signature,
        });
        if (verifyRes?.success) {
          await fetchPurchased(); // Sync from backend (policies table)
        }
      } catch {
        // Verify failed (network etc): keep local policy, user still sees purchase
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
      <LoadingOverlay visible={loading} message="Syncing plans and checkout..." />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => void handleLogout()}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
            tintColor="#16a34a"
          />
        }
      >
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Ionicons name="card-outline" size={20} color="#16a34a" />
            <Text style={styles.title}>Plans</Text>
          </View>
          <View style={styles.subTag}>
            <Text style={styles.subTagText}>Weekly protection + auto payouts</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('available')}
            style={[styles.tabBtn, isAvailableTab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, isAvailableTab && styles.tabTextActive]}>Available Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTab('purchased')}
            style={[styles.tabBtn, !isAvailableTab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, !isAvailableTab && styles.tabTextActive]}>Purchased Plans</Text>
          </TouchableOpacity>
        </View>

        {isAvailableTab ? (
          <View style={{ gap: 12 }}>
            {loading ? (
              <Text style={styles.loadingText}>Loading plans...</Text>
            ) : filteredAvailablePlans.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark" size={28} color="#16a34a" />
                <Text style={styles.emptyTitle}>No plans available</Text>
                <Text style={styles.emptySub}>You already have an active weekly plan.</Text>
              </View>
            ) : (
              filteredAvailablePlans.map((plan) => (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planTop}>
                    <View>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planMeta}>Weekly subscription · {formatRupees(plan.price)}/week</Text>
                    </View>
                    <View style={styles.priceBox}>
                      <Text style={styles.priceText}>{formatRupees(plan.price)}</Text>
                      <Text style={styles.priceSub}>/week</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.eligibleRow}>
                    <View style={styles.eligiblePill}>
                      <Ionicons name="water-outline" size={14} color="#16a34a" />
                      <Text style={styles.eligibleText}>
                        Eligible for: {(plan.eligibleDisruptionTypes ?? []).length ? plan.eligibleDisruptionTypes.join(', ') : '—'}
                      </Text>
                    </View>
                    <View style={styles.maxPayoutPill}>
                      <Ionicons name="gift-outline" size={14} color="#16a34a" />
                      <Text style={styles.eligibleText}>Up to {formatRupees(plan.maxPayout)} weekly payout</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.buyBtn}
                    onPress={() => startCheckout(plan)}
                    disabled={loading}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color="#ffffff" />
                    <Text style={styles.buyBtnText}>Pay with Razorpay (TEST)</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.premiumPreviewCard}>
              <Text style={styles.premiumPreviewTitle}>Weekly Premium Breakdown</Text>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Ew</Text>
                <Text style={styles.premiumPreviewValue}>₹{Number(premiumPreview?.Ew ?? 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Lf</Text>
                <Text style={styles.premiumPreviewValue}>{Number(premiumPreview?.Lf ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Ct</Text>
                <Text style={styles.premiumPreviewValue}>{premiumPreview?.Ct ?? '—'}</Text>
              </View>
              <View style={styles.premiumPreviewRow}>
                <Text style={styles.premiumPreviewLabel}>Premium</Text>
                <Text style={styles.premiumPreviewValue}>₹{Number(premiumPreview?.premium ?? 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {!latestDisruption ? (
              <View style={styles.disruptionBanner}>
                <View style={styles.disruptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.disruptionTitle}>Disruption events</Text>
                  <Text style={styles.disruptionSub}>
                    Payout eligibility will appear when verified disruption events are detected.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.disruptionBanner}>
                <View style={styles.disruptionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.disruptionTitle}>{latestDisruption.title}</Text>
                  <Text style={styles.disruptionSub}>
                    Latest verified event: {latestDisruption.type} · {new Date(latestDisruption.occurredAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.disruptionPill}>
                  <Text style={styles.disruptionPillText}>{formatRupees(latestDisruption.expectedPayout ?? 0)} max</Text>
                </View>
              </View>
            )}

            {loading ? (
              <Text style={styles.loadingText}>Loading purchased plans...</Text>
            ) : purchasedPolicies.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={28} color="#16a34a" />
                <Text style={styles.emptyTitle}>No purchased plans</Text>
                <Text style={styles.emptySub}>Buy a weekly plan to enable auto-claim payouts.</Text>
              </View>
            ) : (
              purchasedPolicies.map((p: any) => {
                const eligible = p.eligibility?.eligibleForLatestDisruption;
                const claimStatus = p.eligibility?.claimStatus;
                const payoutStatus = p.payout?.status;

                const eligibilityPillText = latestDisruption
                  ? (eligible ? `Eligible for ${latestDisruption.type} payout` : 'Not eligible for latest event')
                  : 'Awaiting verified disruption events';

                const eligibilityPillBg = eligible ? '#DCFCE7' : '#F3F4F6';
                const eligibilityPillColor = eligible ? '#16a34a' : '#6b7280';

                const payoutPillText =
                  payoutStatus === 'APPROVED'
                    ? 'Payout Approved'
                    : payoutStatus === 'PROCESSING'
                      ? 'Auto Payout Processing'
                      : '—';

                const payoutPillBg = payoutStatus === 'APPROVED' ? '#DCFCE7' : payoutStatus === 'PROCESSING' ? '#F0FDF4' : '#F3F4F6';
                const payoutPillColor = payoutStatus === 'APPROVED' ? '#16a34a' : payoutStatus === 'PROCESSING' ? '#15803d' : '#6b7280';

                return (
                  <View key={p.policyId} style={styles.policyCard}>
                    <View style={styles.policyTop}>
                      <View>
                        <Text style={styles.policyName}>{p.plan.name}</Text>
                        <Text style={styles.policyMeta}>Active until {new Date(p.endDate).toLocaleDateString()}</Text>
                      </View>
                      <View style={styles.policyPrice}>
                        <Text style={styles.policyPriceVal}>{formatRupees(p.plan.price)}</Text>
                        <Text style={styles.policyPriceSub}>/week</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.pillsRow}>
                      <View style={[styles.pill, { backgroundColor: eligibilityPillBg, borderColor: 'transparent' }]}>
                        <Ionicons name={eligible ? 'checkmark-circle' : 'alert-circle'} size={14} color={eligibilityPillColor} />
                        <Text style={[styles.pillText, { color: eligibilityPillColor }]}>{eligibilityPillText}</Text>
                      </View>

                      <View style={[styles.pill, { backgroundColor: payoutPillBg, borderColor: 'transparent' }]}>
                        <Ionicons name={payoutStatus === 'APPROVED' ? 'gift-outline' : 'time-outline'} size={14} color={payoutPillColor} />
                        <Text style={[styles.pillText, { color: payoutPillColor }]}>{payoutPillText}</Text>
                      </View>
                    </View>

                    {payoutStatus ? (
                      <View style={styles.detailGrid}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Estimated Loss</Text>
                          <Text style={styles.detailValue}>{formatRupees(p.payout.estimatedLoss)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Approved Payout</Text>
                          <Text style={styles.detailValue}>{formatRupees(p.payout.approvedPayout)}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.detailGrid}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Claim Status</Text>
                          <Text style={styles.detailValue}>{claimStatus ?? '—'}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <View style={{ height: 120 }} />
          </View>
        )}
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="plans" />

      <Modal
        visible={!!checkout}
        onRequestClose={() => setCheckout(null)}
        transparent={false}
        animationType="slide"
      >
        <SafeAreaView style={styles.checkoutSafeArea}>
          <View style={styles.checkoutHeader}>
            <TouchableOpacity style={styles.checkoutClose} onPress={() => setCheckout(null)} disabled={checkoutProcessing} activeOpacity={0.85}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkoutTitle}>Razorpay Checkout</Text>
              <Text style={styles.checkoutSub}>{checkout?.plan?.name ?? ''} · TEST Payment</Text>
            </View>
            <View style={styles.checkoutMetaPill}>
              <Text style={styles.checkoutMetaPillText}>{formatRupees((checkout?.amount ?? 0) / 100)}</Text>
            </View>
          </View>

          {checkoutProcessing && (
            <View style={styles.checkoutProcessingOverlay}>
              <View style={styles.checkoutProcessingCard}>
                <Ionicons name="hourglass-outline" size={24} color="#16a34a" />
                <Text style={styles.checkoutProcessingTitle}>Verifying Payment...</Text>
                <Text style={styles.checkoutProcessingSub}>Please wait while we confirm your purchase.</Text>
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
                  name: 'Aegis',
                  description: `Weekly plan purchase · ${checkout.plan?.name ?? ''}`,
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: 96,
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  subTag: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  subTagText: { color: '#15803d', fontWeight: '800', fontSize: 12 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Theme.borderRadius.lg,
    padding: 6,
    marginBottom: Theme.spacing.md,
  },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: Theme.borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: '#16a34a' },
  tabText: { fontWeight: '800', fontSize: 12, color: '#6b7280' },
  tabTextActive: { color: '#ffffff' },

  planCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    gap: 12,
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  planName: { fontSize: 18, fontWeight: '900', color: '#111827' },
  planMeta: { marginTop: 4, fontSize: 12, color: '#6b7280', fontWeight: '700' },

  priceBox: { alignItems: 'flex-end' },
  priceText: { fontSize: 22, fontWeight: '900', color: '#16a34a' },
  priceSub: { fontSize: 12, fontWeight: '800', color: '#6b7280' },

  divider: { height: 1, backgroundColor: '#e5e7eb' },
  eligibleRow: { gap: 10 },

  eligiblePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  maxPayoutPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: 'transparent' },
  eligibleText: { fontSize: 12, fontWeight: '800', color: '#111827', flex: 1 },

  buyBtn: {
    height: 52,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  buyBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },

  loadingText: { textAlign: 'center', color: '#6b7280', fontWeight: '800' },
  emptyState: { paddingVertical: 44, alignItems: 'center', gap: 8 },
  emptyTitle: { fontWeight: '900', fontSize: 16, color: '#111827' },
  emptySub: { fontWeight: '700', fontSize: 12, color: '#6b7280', textAlign: 'center', maxWidth: 260 },

  premiumPreviewCard: {
    backgroundColor: '#0f172a',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 8,
  },
  premiumPreviewTitle: { fontSize: 12, fontWeight: '900', color: '#e2e8f0', letterSpacing: 0.8, textTransform: 'uppercase' },
  premiumPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumPreviewLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  premiumPreviewValue: { fontSize: 14, fontWeight: '900', color: '#f8fafc' },

  disruptionBanner: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: Theme.spacing.md,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  disruptionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' },
  disruptionTitle: { fontSize: 15, fontWeight: '900', color: '#111827' },
  disruptionSub: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 4 },
  disruptionPill: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  disruptionPillText: { fontSize: 12, color: '#15803d', fontWeight: '900' },

  policyCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: Theme.spacing.md,
    gap: 12,
  },
  policyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  policyName: { fontSize: 18, fontWeight: '900', color: '#111827' },
  policyMeta: { marginTop: 4, fontSize: 12, color: '#6b7280', fontWeight: '700' },
  policyPrice: { alignItems: 'flex-end' },
  policyPriceVal: { fontSize: 20, fontWeight: '900', color: '#16a34a' },
  policyPriceSub: { fontSize: 12, fontWeight: '800', color: '#6b7280' },

  pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  pillText: { fontSize: 12, fontWeight: '900' },

  detailGrid: { flexDirection: 'row', gap: 12, marginTop: 4 },
  detailItem: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  detailLabel: { fontSize: 11, color: '#6b7280', fontWeight: '800' },
  detailValue: { marginTop: 6, fontSize: 14, color: '#111827', fontWeight: '900' },

  // Checkout
  checkoutSafeArea: { flex: 1, backgroundColor: '#ffffff' },
  checkoutHeader: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkoutClose: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  checkoutTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  checkoutSub: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginTop: 2 },
  checkoutMetaPill: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  checkoutMetaPillText: { color: '#15803d', fontWeight: '900', fontSize: 12 },
  checkoutProcessingOverlay: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  checkoutProcessingCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', padding: 18, width: '82%', alignItems: 'center' },
  checkoutProcessingTitle: { marginTop: 10, fontWeight: '900', fontSize: 16, color: '#111827' },
  checkoutProcessingSub: { marginTop: 6, fontWeight: '700', fontSize: 12, color: '#6b7280', textAlign: 'center' },
});

