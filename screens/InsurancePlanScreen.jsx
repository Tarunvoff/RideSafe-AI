import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Modal, Pressable, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield, Check, Star, Zap, ChevronLeft, X,
  CheckCircle, Lock, CreditCard, IndianRupee,
} from 'lucide-react-native';
import { MOCK_INSURANCE_PLANS, MOCK_WORKER } from '../data/mockData';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const { height: SCREEN_H } = Dimensions.get('window');
const RZP_KEY = 'rzp_test_SDUxtZWXxKn1iL';

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
  const amount = plan.price * 100; // paise
  const planColors = { basic: '#2563EB', pro: '#7C3AED', elite: '#D97706' };
  const accentColor = planColors[plan.id] || '#1E3A8A';
  const planEmoji = { basic: '🛡️', pro: '⭐', elite: '⚡' };
  const emoji = planEmoji[plan.id] || '⚡';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Blink Payment</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { width: 100%; height: 100%; overflow-x: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      background: #F0F4FF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── TOP BANNER ── */
    .top-banner {
      background: linear-gradient(135deg, #0F172A 0%, ${accentColor} 100%);
      padding: 28px 20px 36px;
      position: relative;
      overflow: hidden;
    }
    .top-banner::after {
      content: '';
      position: absolute;
      bottom: -20px; left: 0; right: 0;
      height: 40px;
      background: #F0F4FF;
      border-radius: 50% 50% 0 0 / 100% 100% 0 0;
    }
    .brand-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .brand-icon {
      width: 44px; height: 44px; border-radius: 14px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .brand-name { color: #fff; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
    .brand-sub  { color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 1px; }

    .plan-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 100px;
      padding: 5px 12px; font-size: 12px; color: rgba(255,255,255,0.9);
      font-weight: 600; margin-bottom: 14px;
    }
    .plan-pill span { font-size: 14px; }

    .amount-hero { color: #fff; }
    .amount-hero .label { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 500; margin-bottom: 2px; }
    .amount-hero .value { font-size: 42px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
    .amount-hero .per  { font-size: 14px; color: rgba(255,255,255,0.6); font-weight: 500; margin-left: 3px; }

    /* ── BODY ── */
    .body { flex: 1; padding: 24px 16px 32px; }

    /* ── SUMMARY CARD ── */
    .summary-card {
      background: #fff;
      border-radius: 20px;
      padding: 16px;
      box-shadow: 0 2px 16px rgba(30,58,138,0.08);
      margin-bottom: 14px;
      border: 1px solid #E8EEF8;
    }
    .summary-title {
      font-size: 11px; font-weight: 700;
      color: #94A3B8; text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 12px;
    }
    .feature-row {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 0;
      border-bottom: 1px solid #F1F5F9;
      font-size: 13px; color: #334155;
    }
    .feature-row:last-child { border-bottom: none; padding-bottom: 0; }
    .check-icon {
      width: 20px; height: 20px; border-radius: 6px;
      background: #DCFCE7;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; flex-shrink: 0;
    }

    /* ── PAYER CARD ── */
    .payer-card {
      background: #fff;
      border-radius: 20px;
      padding: 16px;
      box-shadow: 0 2px 16px rgba(30,58,138,0.08);
      margin-bottom: 14px;
      border: 1px solid #E8EEF8;
    }
    .payer-row { display: flex; align-items: center; gap: 10px; }
    .payer-avatar {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #1E3A8A, ${accentColor});
      color: #fff; font-size: 15px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .payer-name  { font-size: 14px; font-weight: 700; color: #0F172A; }
    .payer-email { font-size: 11px; color: #94A3B8; margin-top: 1px; }

    /* ── PAY BUTTON ── */
    .pay-wrap { padding: 0 0 8px; }
    .pay-btn {
      width: 100%;
      background: linear-gradient(135deg, #0F172A 0%, ${accentColor} 100%);
      color: #fff; border: none;
      border-radius: 16px; padding: 17px 20px;
      font-size: 16px; font-weight: 800; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      box-shadow: 0 6px 24px rgba(30,58,138,0.25);
      transition: opacity 0.15s; letter-spacing: 0.2px;
    }
    .pay-btn:active { opacity: 0.88; transform: scale(0.99); }
    .pay-btn .lock { font-size: 16px; }
    .pay-btn .amount { font-size: 18px; }

    /* ── LOADING STATE ── */
    .pay-btn.loading { opacity: 0.7; pointer-events: none; }
    .spinner {
      width: 18px; height: 18px;
      border: 2.5px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── SECURE FOOTER ── */
    .secure-row {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      margin-top: 12px;
      font-size: 11px; color: #94A3B8;
    }
    .rzp-logo {
      background: #072654; color: #fff;
      font-size: 9px; font-weight: 800;
      padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px;
    }
  </style>
</head>
<body>

<!-- TOP BANNER -->
<div class="top-banner">
  <div class="brand-row">
    <div class="brand-icon">⚡</div>
    <div>
      <div class="brand-name">Blink Insurance</div>
      <div class="brand-sub">Gig Worker Protection</div>
    </div>
  </div>
  <div class="plan-pill"><span>${emoji}</span> ${plan.name} — Weekly</div>
  <div class="amount-hero">
    <div class="label">Weekly Premium</div>
    <div class="value">₹${plan.price}<span class="per">/week</span></div>
  </div>
</div>

<!-- BODY -->
<div class="body">

  <!-- PAYER INFO -->
  <div class="payer-card">
    <div class="summary-title">Paying As</div>
    <div class="payer-row">
      <div class="payer-avatar">${(MOCK_WORKER.initials || 'RK')}</div>
      <div>
        <div class="payer-name">${MOCK_WORKER.name}</div>
        <div class="payer-email">${MOCK_WORKER.email || 'rahul.k@blinkinsure.in'}</div>
      </div>
    </div>
  </div>

  <!-- COVERAGE FEATURES -->
  <div class="summary-card">
    <div class="summary-title">What you get</div>
    ${plan.features.map(f => `
    <div class="feature-row">
      <div class="check-icon">✓</div>
      <span>${f}</span>
    </div>`).join('')}
    <div class="feature-row">
      <div class="check-icon">✓</div>
      <span>Up to <strong>₹${plan.maxPayout.toLocaleString('en-IN')}</strong> weekly payout</span>
    </div>
    <div class="feature-row">
      <div class="check-icon">✓</div>
      <span>IRDAI compliant · Auto-payout within 2 min</span>
    </div>
  </div>

  <!-- CTA -->
  <div class="pay-wrap">
    <button class="pay-btn" id="payBtn" onclick="startPayment()">
      <span class="lock">🔒</span>
      <span>Pay <span class="amount">₹${plan.price}</span></span>
    </button>
    <div class="secure-row">
      <span>Secured by</span>
      <span class="rzp-logo">razorpay</span>
      <span>· 256-bit SSL</span>
    </div>
  </div>

</div><!-- /body -->

<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
var paying = false;
function startPayment() {
  if (paying) return;
  paying = true;
  var btn = document.getElementById('payBtn');
  btn.classList.add('loading');
  btn.innerHTML = '<div class="spinner"></div><span>Opening payment…</span>';

  var options = {
    key: '${RZP_KEY}',
    amount: ${amount},
    currency: 'INR',
    name: 'Blink Insurance',
    description: '${plan.name} – Weekly Coverage',
    image: 'https://i.imgur.com/n5tjHFD.png',
    prefill: {
      name: '${MOCK_WORKER.name}',
      contact: '${MOCK_WORKER.phone || '9876543210'}',
      email: '${MOCK_WORKER.email || 'rahul.k@blinkinsure.in'}',
    },
    notes: {
      plan_id: '${plan.id}',
      plan_name: '${plan.name}',
      worker_id: '${MOCK_WORKER.id || 'WRK-001'}',
    },
    theme: {
      color: '${accentColor}',
      backdrop_color: 'rgba(15,23,42,0.75)',
      hide_topbar: false,
    },
    config: {
      display: {
        blocks: {
          banks: { name: 'Pay via UPI / Bank', instruments: [ { method: 'upi' }, { method: 'netbanking' } ] },
          cards: { name: 'Cards', instruments: [ { method: 'card' } ] },
        },
        sequence: ['block.banks', 'block.cards'],
        preferences: { show_default_blocks: true },
      }
    },
    modal: {
      ondismiss: function() {
        paying = false;
        btn.classList.remove('loading');
        btn.innerHTML = '<span class="lock">🔒</span><span>Pay <span class="amount">₹${plan.price}</span></span>';
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
      paying = false;
      btn.classList.remove('loading');
      btn.innerHTML = '<span class="lock">🔒</span><span>Pay <span class="amount">₹${plan.price}</span></span>';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'FAILED',
        code: resp.error.code,
        description: resp.error.description,
      }));
    });
    rzp.open();
  } catch(e) {
    paying = false;
    btn.classList.remove('loading');
    btn.innerHTML = '<span class="lock">🔒</span><span>Pay <span class="amount">₹${plan.price}</span></span>';
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', msg: e.message }));
  }
}
// Auto-trigger after DOM ready
window.addEventListener('load', function() { setTimeout(startPayment, 600); });
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
  const [paymentResult, setPaymentResult] = useState(null); // 'success' | 'failed'
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SUCCESS') {
        setCheckoutPlan(null);
        setPaymentResult({ status: 'success', plan: checkoutPlan, paymentId: data.payment_id });
      } else if (data.type === 'FAILED') {
        setCheckoutPlan(null);
        setPaymentResult({ status: 'failed', reason: data.description });
      } else if (data.type === 'DISMISSED') {
        setCheckoutPlan(null);
      }
    } catch {}
  };

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
        <Modal visible transparent animationType="slide" onRequestClose={() => setCheckoutPlan(null)}>
          <View style={styles.webviewModal}>
            <View style={styles.webviewHeader}>
              <Text style={styles.webviewTitle}>Secure Checkout</Text>
              <TouchableOpacity onPress={() => setCheckoutPlan(null)} style={styles.webviewClose}>
                <X size={18} color={COLORS.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <WebView
              source={{ html: getRazorpayHTML(checkoutPlan) }}
              onMessage={handleMessage}
              style={{ flex: 1, backgroundColor: '#F5F7FA' }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              mixedContentMode="always"
              originWhitelist={['*']}
            />
          </View>
        </Modal>
      )}

      {/* Payment Result Modal */}
      {paymentResult && (
        <PaymentResultModal
          result={paymentResult}
          onClose={() => setPaymentResult(null)}
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
              <CheckCircle size={13} color={config.color} strokeWidth={2.5} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        {isCurrentPlan ? (
          <View style={[styles.currentPlanBtn, { borderColor: config.color, backgroundColor: config.bg }]}>
            <CheckCircle size={14} color={config.color} strokeWidth={2.5} />
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
function PaymentResultModal({ result, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const success = result.status === 'success';

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.resultOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.resultCircle, { backgroundColor: success ? COLORS.green : COLORS.red }]}>
            {success
              ? <CheckCircle size={44} color="#FFFFFF" strokeWidth={2.5} />
              : <X size={44} color="#FFFFFF" strokeWidth={2.5} />
            }
          </View>

          <Text style={styles.resultTitle}>{success ? 'Payment Successful!' : 'Payment Failed'}</Text>

          {success ? (
            <>
              <Text style={styles.resultSub}>
                You're now covered under{'\n'}
                <Text style={styles.resultBold}>{result.plan?.name}</Text>
              </Text>
              <View style={styles.paymentIdBox}>
                <Text style={styles.paymentIdLabel}>Razorpay Payment ID</Text>
                <Text style={styles.paymentIdVal}>{result.paymentId}</Text>
              </View>
              <View style={styles.resultFeatures}>
                {['Coverage active immediately', 'Payout within 2 minutes of trigger', 'Policy confirmation sent to email'].map(f => (
                  <View key={f} style={styles.resultFeatureRow}>
                    <CheckCircle size={13} color={COLORS.green} strokeWidth={2.5} />
                    <Text style={styles.resultFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.resultSub}>{result.reason || 'Your payment could not be processed. Please try again.'}</Text>
          )}

          <TouchableOpacity style={[styles.resultBtn, { backgroundColor: success ? COLORS.navy : COLORS.blue }]} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.resultBtnText}>{success ? 'View My Coverage' : 'Try Again'}</Text>
          </TouchableOpacity>
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

  // WebView Modal
  webviewModal: { flex: 1, backgroundColor: '#FFFFFF', marginTop: 50, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  webviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.bgBorder, backgroundColor: '#FFFFFF' },
  webviewTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  webviewClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgPrimary, alignItems: 'center', justifyContent: 'center' },

  // Result Modal
  resultOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: SPACING.lg, width: '100%', alignItems: 'center' },
  resultCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10 },
  resultTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  resultSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  resultBold: { fontWeight: '800', color: COLORS.textPrimary },
  paymentIdBox: { backgroundColor: COLORS.bgPrimary, borderRadius: RADIUS.lg, padding: SPACING.sm, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.bgBorder },
  paymentIdLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 3 },
  paymentIdVal: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, fontFamily: 'monospace' },
  resultFeatures: { width: '100%', gap: 8, marginBottom: 20 },
  resultFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultFeatureText: { fontSize: 13, color: COLORS.textSecondary },
  resultBtn: { width: '100%', borderRadius: RADIUS.full, paddingVertical: 15, alignItems: 'center' },
  resultBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
