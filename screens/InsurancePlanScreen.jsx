import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Modal, Pressable, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield, Check, Star, Zap, ChevronLeft, X,
  CircleCheck, Lock, CreditCard, IndianRupee,
} from 'lucide-react-native';
import { MOCK_INSURANCE_PLANS, MOCK_WORKER } from '../data/mockData';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const { height: SCREEN_H } = Dimensions.get('window');
const RZP_KEY = 'rzp_test_SPpGbrErLpphDz';

// Plan visual config (light-theme friendly)
const PLAN_CONFIG = {
  basic: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: Shield },
  pro:   { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Star },
  elite: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Zap },
};

// ──────────────────────────────────────────────────────────────
// Razorpay checkout HTML injected into WebView
// ──────────────────────────────────────────────────────────────
function getRazorpayHTML(plan) {
  const amount = plan.price * 100;
  const planColors = { basic: '#2563EB', pro: '#7C3AED', elite: '#D97706' };
  const accentColor = planColors[plan.id] || '#1E3A8A';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Blink Payment</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0F172A; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 100vh; padding: 32px 24px;
    }
    .logo-wrap {
      width: 72px; height: 72px; border-radius: 22px;
      background: linear-gradient(135deg, ${accentColor}, #0F172A);
      border: 1.5px solid rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 24px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    }
    .logo-wrap svg { width: 36px; height: 36px; }
    .title { font-size: 22px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px; letter-spacing: -0.4px; }
    .sub { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 36px; }
    .amount-card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 20px 28px;
      text-align: center;
      margin-bottom: 32px;
      width: 100%;
      max-width: 300px;
    }
    .amount-label { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
    .amount-value { font-size: 38px; font-weight: 900; color: #FFFFFF; letter-spacing: -1px; }
    .amount-plan { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }
    /* Spinner */
    .spinner-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .spinner {
      width: 44px; height: 44px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: ${accentColor};
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner-text { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; }
    .dots span {
      display: inline-block; width: 5px; height: 5px; border-radius: 50%;
      background: rgba(255,255,255,0.3); margin: 0 3px;
      animation: pulse 1.2s ease-in-out infinite;
    }
    .dots span:nth-child(2) { animation-delay: 0.2s; }
    .dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
    .rzp-badge {
      position: fixed; bottom: 24px;
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: rgba(255,255,255,0.25);
    }
    .rzp-tag { background: #072654; color: #5FA8D3; font-weight: 800; font-size: 9px; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="logo-wrap">
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 4L30 10V18C30 24.627 24.627 30 18 30C11.373 30 6 24.627 6 18V10L18 4Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="1.5"/>
      <path d="M14 18L17 21L22 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>

  <div class="title">Blink Insurance</div>
  <div class="sub">Secure Checkout</div>

  <div class="amount-card">
    <div class="amount-label">Weekly Premium</div>
    <div class="amount-value">₹${plan.price}</div>
    <div class="amount-plan">${plan.name} · Weekly Coverage</div>
  </div>

  <div class="spinner-wrap">
    <div class="spinner"></div>
    <div class="spinner-text">Opening payment gateway</div>
    <div class="dots"><span></span><span></span><span></span></div>
  </div>

  <div class="rzp-badge">
    <span>Secured by</span>
    <span class="rzp-tag">razorpay</span>
    <span>· 256-bit SSL</span>
  </div>

<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
function startPayment() {
  var options = {
    key: '${RZP_KEY}',
    amount: ${amount},
    currency: 'INR',
    name: 'Blink Insurance',
    description: '${plan.name} – Weekly Coverage',
    prefill: {
      name: '${MOCK_WORKER.name}',
      contact: '9876543210',
      email: '${MOCK_WORKER.email || 'rahul.k@blinkinsure.in'}',
    },
    notes: {
      plan_id: '${plan.id}',
      plan_name: '${plan.name}',
      worker_id: '${MOCK_WORKER.id || 'WRK-001'}',
    },
    theme: { color: '${accentColor}' },
    modal: {
      ondismiss: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DISMISSED' }));
      },
      confirm_close: true,
      animation: true,
    },
    handler: function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SUCCESS',
        payment_id: response.razorpay_payment_id,
        plan_id: '${plan.id}',
        plan_name: '${plan.name}',
        amount: ${amount},
      }));
    },
  };
  try {
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(resp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'FAILED',
        code: resp.error.code,
        description: resp.error.description,
      }));
    });
    rzp.open();
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', msg: e.message }));
  }
}
window.addEventListener('load', function() { setTimeout(startPayment, 800); });
</script>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────────
export default function InsurancePlanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [checkoutPlan, setCheckoutPlan] = useState(null); // triggers WebView modal
  const [paymentResult, setPaymentResult] = useState(null); // { status, plan, paymentId, reason }
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Ref to avoid stale closure in handleMessage
  const checkoutPlanRef = useRef(null);

  useEffect(() => {
    checkoutPlanRef.current = checkoutPlan;
  }, [checkoutPlan]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const currentPlan = checkoutPlanRef.current;
      if (data.type === 'SUCCESS') {
        setCheckoutPlan(null);
        setPaymentResult({ status: 'success', plan: currentPlan, paymentId: data.payment_id });
      } else if (data.type === 'FAILED') {
        setCheckoutPlan(null);
        // Keep plan reference so Try Again can reopen checkout
        setPaymentResult({ status: 'failed', reason: data.description || 'Payment could not be processed.', retryPlan: currentPlan });
      } else if (data.type === 'ERROR') {
        setCheckoutPlan(null);
        setPaymentResult({ status: 'failed', reason: data.msg || 'An unexpected error occurred.', retryPlan: currentPlan });
      } else if (data.type === 'DISMISSED') {
        setCheckoutPlan(null);
      }
    } catch {}
  }, []);

  const activePlan = MOCK_INSURANCE_PLANS.find(p => p.id === (MOCK_WORKER.activePolicy === 'Pro Guard' ? 'pro' : 'basic'));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          {navigation && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>{MOCK_WORKER.name}</Text>
            <Text style={styles.headerTitle}>Protection Plans</Text>
          </View>
        </View>
        <Text style={styles.headerTagline}>Weekly income insurance · Cancel anytime</Text>

        {/* Trust badges */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
          {['IRDAI Compliant', 'Instant Payout', 'No Paperwork', '50K+ Workers'].map(b => (
            <View key={b} style={styles.trustBadge}>
              <Check size={10} color="#4ADE80" strokeWidth={3} />
              <Text style={styles.trustText}>{b}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Current plan */}
        <View style={[styles.currentBanner, SHADOWS.card]}>
          <View style={[styles.currentIcon, { backgroundColor: PLAN_CONFIG['pro'].bg }]}>
            <Shield size={18} color={PLAN_CONFIG['pro'].color} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentLabel}>Active Plan</Text>
            <Text style={styles.currentName}>{MOCK_WORKER.activePolicy || 'Pro Guard'}</Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose Your Plan</Text>

        {MOCK_INSURANCE_PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            config={PLAN_CONFIG[plan.id]}
            selected={selectedPlan === plan.id}
            isCurrentPlan={plan.name === (MOCK_WORKER.activePolicy || 'Pro Guard')}
            onSelect={() => setSelectedPlan(plan.id)}
            onSubscribe={() => setCheckoutPlan(plan)}
          />
        ))}

        <View style={styles.footer}>
          <Lock size={12} color={COLORS.textMuted} strokeWidth={2} />
          <Text style={styles.footerText}>Payments secured by Razorpay · 256-bit TLS encryption</Text>
        </View>
        <View style={{ height: 80 }} />
      </Animated.ScrollView>

      {/* Razorpay WebView Modal */}
      {checkoutPlan && (
        <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCheckoutPlan(null)}>
          <View style={styles.webviewModal}>
            {/* Gradient header */}
            <View style={[styles.webviewHeader, { paddingTop: insets.top + 6 }]}>
              <View style={styles.webviewHeaderInner}>
                <View style={styles.webviewTitleWrap}>
                  <View style={styles.webviewLockIcon}>
                    <Lock size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text style={styles.webviewTitle}>Secure Payment</Text>
                    <Text style={styles.webviewSubtitle}>{checkoutPlan?.name} · ₹{checkoutPlan?.price}/week</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setCheckoutPlan(null)} style={styles.webviewClose}>
                  <X size={18} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            <WebView
              source={{ html: getRazorpayHTML(checkoutPlan) }}
              onMessage={handleMessage}
              style={{ flex: 1, backgroundColor: '#0F172A' }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              originWhitelist={['*']}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              onError={() => {
                setCheckoutPlan(null);
                setPaymentResult({ status: 'failed', reason: 'Network error. Please check your connection and try again.', retryPlan: checkoutPlanRef.current });
              }}
            />
          </View>
        </Modal>
      )}

      {/* Payment Result Modal */}
      {paymentResult && (
        <PaymentResultModal
          result={paymentResult}
          onClose={() => setPaymentResult(null)}
          onRetry={() => {
            const retryPlan = paymentResult.retryPlan;
            setPaymentResult(null);
            if (retryPlan) {
              // Brief delay so modal closes before reopening checkout
              setTimeout(() => setCheckoutPlan(retryPlan), 300);
            }
          }}
        />
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// PLAN CARD
// ──────────────────────────────────────────────────────────────
function PlanCard({ plan, config, selected, isCurrentPlan, onSelect, onSubscribe }) {
  const Icon = config.icon;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start(onSelect);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={[
          styles.planCard,
          selected && { borderColor: config.color, borderWidth: 2 },
          plan.popular && styles.planCardPopular,
        ]}
      >
        {plan.popular && (
          <View style={[styles.popularBadge, { backgroundColor: config.color }]}>
            <Star size={10} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
            <Text style={styles.popularText}>{plan.badge}</Text>
          </View>
        )}
        {!plan.popular && plan.badge && (
          <View style={[styles.popularBadge, { backgroundColor: config.color }]}>
            <Text style={styles.popularText}>{plan.badge}</Text>
          </View>
        )}

        <View style={styles.planTop}>
          <View style={[styles.planIcon, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Icon size={22} color={config.color} strokeWidth={2.5} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planTagline}>{plan.tagline}</Text>
          </View>
          <View style={styles.planPriceWrap}>
            <Text style={[styles.planPrice, { color: config.color }]}>₹{plan.price}</Text>
            <Text style={styles.planPricePer}>/week</Text>
          </View>
        </View>

        {/* Payout highlight */}
        <View style={[styles.payoutRow, { backgroundColor: config.bg, borderColor: config.border }]}>
          <IndianRupee size={13} color={config.color} strokeWidth={2.5} />
          <Text style={[styles.payoutText, { color: config.color }]}>
            Up to ₹{plan.maxPayout.toLocaleString('en-IN')} weekly payout
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresWrap}>
          {plan.features.map(f => (
            <View key={f} style={styles.featureRow}>
              <CircleCheck size={13} color={config.color} strokeWidth={2.5} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        {isCurrentPlan ? (
          <View style={[styles.currentPlanBtn, { borderColor: config.color, backgroundColor: config.bg }]}>
            <CircleCheck size={14} color={config.color} strokeWidth={2.5} />
            <Text style={[styles.currentPlanBtnText, { color: config.color }]}>Current Plan · Active</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.subscribeBtn, { backgroundColor: config.color }]}
            onPress={onSubscribe}
            activeOpacity={0.9}
          >
            <Lock size={13} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.subscribeBtnText}>
              {selected ? `Subscribe · ₹${plan.price}/week` : 'Select & Subscribe'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────────
// PAYMENT RESULT MODAL
// ──────────────────────────────────────────────────────────────
function PaymentResultModal({ result, onClose, onRetry }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const success = result.status === 'success';

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.resultOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={success ? onClose : undefined} />
        <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>

          {/* Top colour bar */}
          <View style={[styles.resultTopBar, { backgroundColor: success ? COLORS.green : '#DC2626' }]} />

          {/* Icon */}
          <View style={[styles.resultCircle, { backgroundColor: success ? '#D1FAE5' : '#FEE2E2' }]}>
            {success
              ? <CircleCheck size={42} color={COLORS.green} strokeWidth={2.5} />
              : <X size={42} color="#DC2626" strokeWidth={2.5} />
            }
          </View>

          <Text style={styles.resultTitle}>{success ? 'Payment Successful!' : 'Payment Failed'}</Text>

          {success ? (
            <>
              <Text style={styles.resultSub}>
                You're now covered under{' '}
                <Text style={styles.resultBold}>{result.plan?.name}</Text>
              </Text>
              {result.paymentId && (
                <View style={styles.paymentIdBox}>
                  <CreditCard size={13} color={COLORS.textMuted} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentIdLabel}>Payment ID</Text>
                    <Text style={styles.paymentIdVal}>{result.paymentId}</Text>
                  </View>
                </View>
              )}
              <View style={styles.resultFeatures}>
                {['Coverage active immediately', 'Auto-payout within 2 min of trigger', 'Policy confirmation on app'].map(f => (
                  <View key={f} style={styles.resultFeatureRow}>
                    <CircleCheck size={13} color={COLORS.green} strokeWidth={2.5} />
                    <Text style={styles.resultFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.resultSub}>{result.reason || 'Your payment could not be processed. Please try again.'}</Text>
              <View style={styles.failHint}>
                <Text style={styles.failHintText}>💡 Try a different card, UPI ID, or payment method</Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.resultBtn, { backgroundColor: success ? COLORS.navy : '#2563EB' }]}
            onPress={success ? onClose : (onRetry || onClose)}
            activeOpacity={0.9}
          >
            <Text style={styles.resultBtnText}>{success ? 'View My Coverage' : 'Try Again'}</Text>
          </TouchableOpacity>
          {!success && (
            <TouchableOpacity onPress={onClose} style={styles.resultCancelBtn} activeOpacity={0.7}>
              <Text style={styles.resultCancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerTagline: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: SPACING.sm },
  badgesRow: { gap: 8, paddingBottom: SPACING.sm },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  trustText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  scroll: { padding: SPACING.md },
  currentBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  currentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  currentLabel: { fontSize: 10, color: COLORS.textMuted },
  currentName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.greenLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  activeText: { fontSize: 11, color: COLORS.green, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  planCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1.5, borderColor: COLORS.bgBorder, overflow: 'hidden' },
  planCardPopular: { borderColor: '#7C3AED' },
  popularBadge: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12 },
  popularText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm, marginTop: 4 },
  planIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  planName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  planTagline: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 24, fontWeight: '900' },
  planPricePer: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 8, marginBottom: SPACING.sm, borderWidth: 1 },
  payoutText: { fontSize: 13, fontWeight: '700' },
  featuresWrap: { gap: 8, marginBottom: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: COLORS.textSecondary },
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.full, paddingVertical: 14 },
  subscribeBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  currentPlanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.full, paddingVertical: 13, borderWidth: 1.5 },
  currentPlanBtnText: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm },
  footerText: { fontSize: 11, color: COLORS.textMuted },

  // WebView Modal – full screen
  webviewModal: { flex: 1, backgroundColor: '#0F172A' },
  webviewHeader: { backgroundColor: '#0F172A', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  webviewHeaderInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, paddingTop: 6 },
  webviewTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  webviewLockIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  webviewTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  webviewSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, fontWeight: '500' },
  webviewClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Result Modal
  resultOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 28, width: '100%', alignItems: 'center', overflow: 'hidden', paddingBottom: 24 },
  resultTopBar: { width: '100%', height: 5, marginBottom: 24 },
  resultCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  resultTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center', paddingHorizontal: 20 },
  resultSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 14, paddingHorizontal: 24 },
  resultBold: { fontWeight: '800', color: COLORS.textPrimary },
  paymentIdBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgPrimary, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12, width: '90%', marginBottom: 14, borderWidth: 1, borderColor: COLORS.bgBorder },
  paymentIdLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  paymentIdVal: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  resultFeatures: { width: '90%', gap: 10, marginBottom: 20 },
  resultFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultFeatureText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  resultBtn: { width: '90%', borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', marginBottom: 2 },
  resultBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  resultCancelBtn: { marginTop: 12, paddingVertical: 6 },
  resultCancelText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  failHint: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, width: '90%', marginBottom: 16 },
  failHintText: { fontSize: 12, color: '#92400E', fontWeight: '500', textAlign: 'center' },
});
