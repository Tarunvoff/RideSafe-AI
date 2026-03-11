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

// Plan visual config (light-theme friendly)
const PLAN_CONFIG = {
  basic: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: Shield },
  pro:   { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Star },
  elite: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Zap },
};

// ──────────────────────────────────────────────────────────────
// Mock payment gateway HTML (Razorpay-style, fully self-contained)
// Works 100% offline/no-backend — perfect for hackathon demo
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
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      background: #F8FAFC;
      display: flex; flex-direction: column; min-height: 100vh;
    }

    /* ── HEADER ── */
    .header {
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 14px 18px 12px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .header-logo {
      width: 32px; height: 32px; border-radius: 9px;
      background: ${accentColor};
      display: flex; align-items: center; justify-content: center;
    }
    .header-logo svg { width: 18px; height: 18px; }
    .header-brand { font-size: 15px; font-weight: 800; color: #0F172A; }
    .header-secured { font-size: 10px; color: #64748B; display: flex; align-items: center; gap: 4px; margin-top: 1px; }
    .lock-icon { width: 10px; height: 10px; }
    .rzp-logo { font-size: 9px; background: #072654; color: #5FA8D3; font-weight: 900; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.5px; }
    .test-badge { font-size: 9px; background: #DCFCE7; color: #16A34A; font-weight: 800; padding: 2px 7px; border-radius: 3px; letter-spacing: 0.5px; }

    /* ── AMOUNT BAR ── */
    .amount-bar {
      background: ${accentColor};
      padding: 14px 18px; color: #FFFFFF;
      display: flex; align-items: center; justify-content: space-between;
    }
    .amount-info-label { font-size: 11px; opacity: 0.7; margin-bottom: 2px; }
    .amount-info-val { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .amount-plan-pill {
      background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3);
      border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #FFFFFF;
    }

    /* ── DEMO HINT ── */
    .demo-bar {
      background: #F0FDF4; border-bottom: 1px solid #BBF7D0;
      padding: 8px 18px; display: flex; align-items: center; gap: 8px;
    }
    .demo-bar-label { font-size: 11px; color: #15803D; font-weight: 600; }
    .demo-bar-upi {
      font-size: 12px; font-weight: 900; color: #166534;
      background: #DCFCE7; border: 1px solid #BBF7D0;
      border-radius: 6px; padding: 2px 8px; letter-spacing: 0.2px;
    }

    /* ── TABS ── */
    .tabs { background: #FFFFFF; border-bottom: 1px solid #E2E8F0; display: flex; padding: 0 12px; }
    .tab {
      flex: 1; padding: 12px 6px 10px; font-size: 12px; font-weight: 700;
      color: #94A3B8; text-align: center; cursor: pointer;
      border-bottom: 2px solid transparent; transition: all 0.2s;
    }
    .tab.active { color: ${accentColor}; border-bottom-color: ${accentColor}; }
    .tab-icon { font-size: 16px; margin-bottom: 3px; }

    /* ── PANELS ── */
    .panel { display: none; flex: 1; padding: 20px 18px; background: #F8FAFC; overflow-y: auto; }
    .panel.active { display: flex; flex-direction: column; gap: 14px; }

    /* ── UPI PANEL ── */
    .upi-input-wrap {
      background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px;
      padding: 14px 16px; display: flex; flex-direction: column; gap: 6px;
    }
    .input-label { font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px; }
    .input-row { display: flex; align-items: center; gap: 8px; }
    .upi-input {
      flex: 1; font-size: 15px; font-weight: 700; color: #0F172A;
      border: none; outline: none; background: transparent; padding: 4px 0;
    }
    .upi-verify-btn {
      font-size: 11px; font-weight: 800; color: ${accentColor};
      background: none; border: none; cursor: pointer; padding: 4px 0;
    }
    .verified-badge {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: #16A34A; font-weight: 700;
    }
    .verified-dot { width: 8px; height: 8px; border-radius: 50%; background: #16A34A; }

    .upi-apps { display: flex; gap: 10px; }
    .upi-app-btn {
      flex: 1; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 10px;
      padding: 10px 6px; display: flex; flex-direction: column; align-items: center; gap: 4px;
      cursor: pointer; font-size: 10px; color: #475569; font-weight: 600; transition: border-color 0.2s;
    }
    .upi-app-btn:hover { border-color: ${accentColor}; }
    .upi-app-icon { font-size: 22px; }

    /* ── CARD PANEL ── */
    .card-field {
      background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px;
      padding: 14px 16px; display: flex; flex-direction: column; gap: 6px;
    }
    .card-input {
      font-size: 15px; font-weight: 700; color: #0F172A;
      border: none; outline: none; background: transparent; width: 100%; padding: 4px 0; letter-spacing: 1px;
    }
    .card-row { display: flex; gap: 10px; }

    /* ── NETBANKING PANEL ── */
    .bank-list { display: flex; flex-direction: column; gap: 8px; }
    .bank-item {
      background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px;
      padding: 12px 16px; display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: border-color 0.2s;
    }
    .bank-item.selected { border-color: ${accentColor}; background: rgba(${accentColor === '#7C3AED' ? '124,58,237' : accentColor === '#2563EB' ? '37,99,235' : '217,119,6'},0.04); }
    .bank-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .bank-name { font-size: 14px; font-weight: 700; color: #0F172A; flex: 1; }
    .bank-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #CBD5E1; display: flex; align-items: center; justify-content: center; }
    .bank-radio.checked { border-color: ${accentColor}; }
    .bank-radio.checked::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: ${accentColor}; display: block; }

    /* ── PAY BUTTON ── */
    .pay-wrap { padding: 16px 18px 28px; background: #FFFFFF; border-top: 1px solid #E2E8F0; }
    .pay-btn {
      width: 100%; padding: 16px; border-radius: 12px; border: none;
      background: ${accentColor}; color: #FFFFFF; font-size: 15px; font-weight: 900;
      cursor: pointer; letter-spacing: 0.2px; transition: opacity 0.2s;
    }
    .pay-btn:active { opacity: 0.85; }
    .pay-secure { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 8px; font-size: 10px; color: #94A3B8; }

    /* ── PROCESSING OVERLAY ── */
    .processing-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(248,250,252,0.97); z-index: 999;
      flex-direction: column; align-items: center; justify-content: center; gap: 18px;
    }
    .processing-overlay.show { display: flex; }
    .processing-circle {
      width: 72px; height: 72px; border-radius: 50%;
      border: 4px solid #E2E8F0; border-top-color: ${accentColor};
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .processing-title { font-size: 18px; font-weight: 800; color: #0F172A; }
    .processing-sub { font-size: 13px; color: #64748B; }
    .processing-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .step { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #94A3B8; }
    .step.done { color: #16A34A; }
    .step.active { color: ${accentColor}; font-weight: 700; }
    .step-dot { width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1; flex-shrink: 0; }
    .step.done .step-dot { background: #16A34A; }
    .step.active .step-dot { background: ${accentColor}; animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }

    /* ── SUCCESS OVERLAY ── */
    .success-overlay {
      display: none; position: fixed; inset: 0;
      background: #FFFFFF; z-index: 1000;
      flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      padding: 32px;
    }
    .success-overlay.show { display: flex; }
    .success-circle {
      width: 80px; height: 80px; border-radius: 50%;
      background: #DCFCE7; display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .success-check { font-size: 40px; }
    .success-title { font-size: 24px; font-weight: 900; color: #0F172A; }
    .success-sub { font-size: 14px; color: #64748B; text-align: center; line-height: 1.5; }
    .success-id {
      background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;
      padding: 10px 18px; font-size: 12px; font-weight: 700; color: #475569;
      letter-spacing: 0.3px;
    }
    .success-label { font-size: 10px; color: #94A3B8; margin-bottom: 2px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="header-logo">
        <svg viewBox="0 0 18 18" fill="none"><path d="M9 2L15 5V9C15 12.314 12.314 15 9 15C5.686 15 3 12.314 3 9V5L9 2Z" fill="white" fill-opacity="0.3" stroke="white" stroke-width="1.2"/><path d="M7 9L8.5 10.5L11 7.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div>
        <div class="header-brand">Blink Insurance</div>
        <div class="header-secured">🔒 256-bit SSL &nbsp;<span class="rzp-logo">razorpay</span>&nbsp;<span class="test-badge">TEST</span></div>
      </div>
    </div>
  </div>

  <!-- AMOUNT BAR -->
  <div class="amount-bar">
    <div>
      <div class="amount-info-label">Total Amount</div>
      <div class="amount-info-val">₹${plan.price}</div>
    </div>
    <div class="amount-plan-pill">${plan.name} · Weekly</div>
  </div>

  <!-- DEMO HINT -->
  <div class="demo-bar">
    <span>⚡</span>
    <span class="demo-bar-label">Demo: Use UPI ID</span>
    <span class="demo-bar-upi">success@razorpay</span>
    <span class="demo-bar-label">→ instant success</span>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <div class="tab active" onclick="switchTab('upi', this)"><div class="tab-icon">💳</div>UPI</div>
    <div class="tab" onclick="switchTab('card', this)"><div class="tab-icon">🃏</div>Card</div>
    <div class="tab" onclick="switchTab('netbanking', this)"><div class="tab-icon">🏦</div>Net Banking</div>
  </div>

  <!-- UPI PANEL -->
  <div class="panel active" id="panel-upi">
    <div class="upi-input-wrap">
      <div class="input-label">UPI ID / VPA</div>
      <div class="input-row">
        <input class="upi-input" id="upi-input" type="text" value="success@razorpay" />
        <div class="verified-badge" id="upi-verified">
          <div class="verified-dot"></div> Verified
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:#64748B;font-weight:600;margin-bottom:4px;">Or pay with UPI app</div>
    <div class="upi-apps">
      <div class="upi-app-btn" onclick="fillUpi('success@razorpay')"><div class="upi-app-icon">🟢</div>GPay</div>
      <div class="upi-app-btn" onclick="fillUpi('success@razorpay')"><div class="upi-app-icon">🟣</div>PhonePe</div>
      <div class="upi-app-btn" onclick="fillUpi('success@razorpay')"><div class="upi-app-icon">🔵</div>Paytm</div>
      <div class="upi-app-btn" onclick="fillUpi('success@razorpay')"><div class="upi-app-icon">🟠</div>BHIM</div>
    </div>
  </div>

  <!-- CARD PANEL -->
  <div class="panel" id="panel-card">
    <div class="card-field">
      <div class="input-label">Card Number</div>
      <input class="card-input" type="text" value="4111 1111 1111 1111" maxlength="19" />
    </div>
    <div class="card-field">
      <div class="input-label">Name on Card</div>
      <input class="card-input" type="text" value="${MOCK_WORKER.name}" style="letter-spacing:0;" />
    </div>
    <div class="card-row">
      <div class="card-field" style="flex:1">
        <div class="input-label">Expiry</div>
        <input class="card-input" type="text" value="12/28" maxlength="5" />
      </div>
      <div class="card-field" style="flex:1">
        <div class="input-label">CVV</div>
        <input class="card-input" type="password" value="123" maxlength="4" />
      </div>
    </div>
    <div style="font-size:10px;color:#94A3B8;text-align:center;">Test card: 4111 1111 1111 1111 · Any CVV · Any future date</div>
  </div>

  <!-- NETBANKING PANEL -->
  <div class="panel" id="panel-netbanking">
    <div class="bank-list" id="bank-list">
      <div class="bank-item selected" onclick="selectBank(this)">
        <div class="bank-icon" style="background:#EFF6FF;">🏦</div>
        <div class="bank-name">SBI</div>
        <div class="bank-radio checked"></div>
      </div>
      <div class="bank-item" onclick="selectBank(this)">
        <div class="bank-icon" style="background:#FFF7ED;">🏦</div>
        <div class="bank-name">HDFC Bank</div>
        <div class="bank-radio"></div>
      </div>
      <div class="bank-item" onclick="selectBank(this)">
        <div class="bank-icon" style="background:#F0FDF4;">🏦</div>
        <div class="bank-name">ICICI Bank</div>
        <div class="bank-radio"></div>
      </div>
      <div class="bank-item" onclick="selectBank(this)">
        <div class="bank-icon" style="background:#FDF4FF;">🏦</div>
        <div class="bank-name">Axis Bank</div>
        <div class="bank-radio"></div>
      </div>
    </div>
  </div>

  <!-- PAY BUTTON -->
  <div style="flex:1"></div>
  <div class="pay-wrap">
    <button class="pay-btn" onclick="startPay()">Pay ₹${plan.price} Securely →</button>
    <div class="pay-secure">🔒 Your payment info is encrypted and secure</div>
  </div>

  <!-- PROCESSING OVERLAY -->
  <div class="processing-overlay" id="processing">
    <div class="processing-circle"></div>
    <div class="processing-title">Processing Payment</div>
    <div class="processing-sub">Please do not close this screen…</div>
    <div class="processing-steps">
      <div class="step done" id="step1"><div class="step-dot"></div> Authenticating request</div>
      <div class="step active" id="step2"><div class="step-dot"></div> Contacting bank</div>
      <div class="step" id="step3"><div class="step-dot"></div> Confirming payment</div>
    </div>
  </div>

  <!-- SUCCESS OVERLAY -->
  <div class="success-overlay" id="success-screen">
    <div class="success-circle"><div class="success-check">✅</div></div>
    <div class="success-title">Payment Successful!</div>
    <div class="success-sub">You're now covered under <strong>${plan.name}</strong>.<br/>Coverage is active immediately.</div>
    <div class="success-id">
      <div class="success-label">PAYMENT ID</div>
      <span id="pay-id">Generating…</span>
    </div>
  </div>

<script>
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('.panel');

  function switchTab(name, el) {
    tabs.forEach(function(t){ t.classList.remove('active'); });
    panels.forEach(function(p){ p.classList.remove('active'); });
    el.classList.add('active');
    document.getElementById('panel-' + name).classList.add('active');
  }

  function fillUpi(val) {
    document.getElementById('upi-input').value = val;
    document.getElementById('upi-verified').style.display = 'flex';
  }

  function selectBank(el) {
    document.querySelectorAll('.bank-item').forEach(function(b){ b.classList.remove('selected'); b.querySelector('.bank-radio').classList.remove('checked'); });
    el.classList.add('selected');
    el.querySelector('.bank-radio').classList.add('checked');
  }

  function makeTxnId() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var id = 'pay_';
    for (var i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  function startPay() {
    document.getElementById('processing').classList.add('show');
    setTimeout(function() {
      document.getElementById('step2').className = 'step done';
      document.getElementById('step3').className = 'step active';
    }, 800);
    setTimeout(function() {
      document.getElementById('step3').className = 'step done';
    }, 1600);
    setTimeout(function() {
      var txnId = makeTxnId();
      document.getElementById('pay-id').textContent = txnId;
      document.getElementById('processing').classList.remove('show');
      document.getElementById('success-screen').classList.add('show');
      setTimeout(function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'SUCCESS',
          payment_id: txnId,
          plan_id: '${plan.id}',
          plan_name: '${plan.name}',
          amount: ${amount},
        }));
      }, 1200);
    }, 2400);
  }
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.webviewTitle}>Secure Payment</Text>
                      <View style={styles.testModeBadge}><Text style={styles.testModeText}>TEST</Text></View>
                    </View>
                    <Text style={styles.webviewSubtitle}>{checkoutPlan?.name} · ₹{checkoutPlan?.price}/week · UPI: success@razorpay</Text>
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
              <View style={styles.failUpiHint}>
                <Text style={styles.failUpiHintLabel}>⚡ Use this Test UPI ID</Text>
                <Text style={styles.failUpiHintVal}>success@razorpay</Text>
              </View>
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
  testModeBadge: { backgroundColor: '#16A34A', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  testModeText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.8 },

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
  failHint: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, width: '90%', marginBottom: 8 },
  failHintText: { fontSize: 12, color: '#92400E', fontWeight: '500', textAlign: 'center' },
  failUpiHint: { backgroundColor: '#F0FDF4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, width: '90%', marginBottom: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  failUpiHintLabel: { fontSize: 10, fontWeight: '800', color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  failUpiHintVal: { fontSize: 14, fontWeight: '900', color: '#166534' },
});
