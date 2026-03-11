import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, StatusBar,
  ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone, ShieldCheck, User, Fingerprint, Briefcase,
  MapPin, Truck, CircleCheck, ChevronRight, ChevronLeft, RefreshCw,
} from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '../constants/colors';

const { width } = Dimensions.get('window');

const PLATFORMS = ['Swiggy', 'Zomato', 'Ola', 'Uber', 'BigBasket', 'Blinkit', 'Dunzo', 'Other'];
const VEHICLES  = ['Bicycle', 'Motorcycle', 'Scooter', 'Auto-rickshaw', 'Car', 'E-Bike'];
const CITIES    = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];

const MOCK_OTP = '1234'; // Demo OTP for any number

const STEP_CONFIG = [
  { icon: Phone,       label: 'Phone',    title: 'Verify Phone Number',   sub: 'We\'ll send a one-time password to your mobile number' },
  { icon: User,        label: 'Personal', title: 'Personal Details',      sub: 'Tell us a bit about yourself' },
  { icon: Briefcase,   label: 'Work',     title: 'Work Profile',          sub: 'Choose your gig platform and vehicle' },
  { icon: CircleCheck, label: 'Done',   title: 'KYC Verified!',         sub: 'You\'re all set to get protected' },
];

export default function KYCScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  // Step 1 - Phone + OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef(null);

  // Step 2 - Personal
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [aadhaar, setAadhaar] = useState('');

  // Step 3 - Work
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const animateTransition = (cb) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      cb();
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const startOtpTimer = () => {
    setOtpTimer(30);
    timerRef.current = setInterval(() => {
      setOtpTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleSendOtp = () => {
    if (phone.trim().length < 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      startOtpTimer();
    }, 800);
  };

  const handleResendOtp = () => {
    setOtp('');
    setOtpSent(false);
    setError('');
    handleSendOtp();
  };

  const validateAndNext = () => {
    setError('');

    if (step === 0) {
      if (!otpSent) {
        handleSendOtp();
        return;
      }
      if (otp.trim() !== MOCK_OTP) {
        setError('Incorrect OTP. Use 1234 for this demo.');
        return;
      }
    } else if (step === 1) {
      if (!fullName.trim())              { setError('Please enter your full name.'); return; }
      if (!dob.trim())                   { setError('Please enter your date of birth.'); return; }
      if (aadhaar.replace(/\s/g,'').length < 12) {
        setError('Enter a valid 12-digit Aadhaar number.'); return;
      }
    } else if (step === 2) {
      if (!selectedPlatform) { setError('Please select your platform.'); return; }
      if (!selectedCity)     { setError('Please select your city.'); return; }
      if (!selectedVehicle)  { setError('Please select your vehicle type.'); return; }
    } else if (step === 3) {
      navigation.replace('Main');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      animateTransition(() => setStep(s => s + 1));
    }, 500);
  };

  const handleBack = () => {
    if (step === 0) return;
    setError('');
    animateTransition(() => setStep(s => s - 1));
  };

  const formatAadhaar = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const stepConfig = STEP_CONFIG[step];
  const StepIcon = stepConfig.icon;
  const progress = (step / (STEP_CONFIG.length - 1)) * 100;

  return (
    <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#2563EB']} style={styles.root}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: insets.top }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          {STEP_CONFIG.map((s, i) => (
            <View key={i} style={styles.stepDotWrap}>
              <View style={[
                styles.stepDot,
                i < step  && styles.stepDotDone,
                i === step && styles.stepDotActive,
              ]}>
                {i < step
                  ? <CircleCheck size={14} color="#1D4ED8" strokeWidth={2.5} />
                  : <Text style={[styles.stepDotNum, i === step && styles.stepDotNumActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[styles.stepDotLabel, i === step && { color: '#FFFFFF' }]}>{s.label}</Text>
              {i < STEP_CONFIG.length - 1 && (
                <View style={[styles.stepLine, i < step && styles.stepLineDone]} />
              )}
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <StepIcon size={32} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.title}>{stepConfig.title}</Text>
              <Text style={styles.sub}>{stepConfig.sub}</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>

              {/* ── STEP 0: Phone + OTP ── */}
              {step === 0 && (
                <>
                  <InputField
                    label="Mobile Number"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    editable={!otpSent}
                    prefix="+91"
                  />
                  {!otpSent ? (
                    <PrimaryButton label={loading ? 'Sending OTP…' : 'Send OTP'} onPress={handleSendOtp} disabled={loading} />
                  ) : (
                    <>
                      <InputField
                        label="One-Time Password"
                        placeholder="Enter 4-digit OTP"
                        value={otp}
                        onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                      <View style={styles.resendRow}>
                        {otpTimer > 0
                          ? <Text style={styles.resendTimer}>Resend in {otpTimer}s</Text>
                          : (
                            <TouchableOpacity onPress={handleResendOtp} style={styles.resendBtn}>
                              <RefreshCw size={13} color="#2563EB" strokeWidth={2.5} />
                              <Text style={styles.resendText}>Resend OTP</Text>
                            </TouchableOpacity>
                          )
                        }
                      </View>
                      <View style={styles.hintBox}>
                        <Text style={styles.hintText}>Demo OTP: 1234 (any number works)</Text>
                      </View>
                    </>
                  )}
                </>
              )}

              {/* ── STEP 1: Personal Details ── */}
              {step === 1 && (
                <>
                  <InputField
                    label="Full Name"
                    placeholder="As per government ID"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                  <InputField
                    label="Date of Birth"
                    placeholder="DD / MM / YYYY"
                    value={dob}
                    onChangeText={t => {
                      const d = t.replace(/\D/g, '').slice(0, 8);
                      let out = d;
                      if (d.length > 4) out = d.slice(0,2) + ' / ' + d.slice(2,4) + ' / ' + d.slice(4);
                      else if (d.length > 2) out = d.slice(0,2) + ' / ' + d.slice(2);
                      setDob(out);
                    }}
                    keyboardType="number-pad"
                  />
                  <InputField
                    label="Aadhaar Number"
                    placeholder="XXXX XXXX XXXX"
                    value={aadhaar}
                    onChangeText={t => setAadhaar(formatAadhaar(t))}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {/* ── STEP 2: Work Profile ── */}
              {step === 2 && (
                <>
                  <Text style={styles.sectionLabel}>Gig Platform</Text>
                  <View style={styles.chipGrid}>
                    {PLATFORMS.map(p => (
                      <ChipButton
                        key={p}
                        label={p}
                        selected={selectedPlatform === p}
                        onPress={() => setSelectedPlatform(p)}
                      />
                    ))}
                  </View>

                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>City</Text>
                  <View style={styles.chipGrid}>
                    {CITIES.map(c => (
                      <ChipButton
                        key={c}
                        label={c}
                        selected={selectedCity === c}
                        onPress={() => setSelectedCity(c)}
                      />
                    ))}
                  </View>

                  <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Vehicle Type</Text>
                  <View style={styles.chipGrid}>
                    {VEHICLES.map(v => (
                      <ChipButton
                        key={v}
                        label={v}
                        selected={selectedVehicle === v}
                        onPress={() => setSelectedVehicle(v)}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* ── STEP 3: Verified! ── */}
              {step === 3 && (
                <View style={styles.successBlock}>
                  <View style={styles.successCircle}>
                    <CircleCheck size={56} color="#059669" strokeWidth={2} />
                  </View>
                  <Text style={styles.successTitle}>Identity Verified</Text>
                  <Text style={styles.successBody}>
                    Your KYC is complete. You are now eligible for instant parametric protection.
                  </Text>
                  <View style={styles.summaryRows}>
                    <SummaryRow label="Name"     value={fullName} />
                    <SummaryRow label="Phone"    value={`+91 ${phone}`} />
                    <SummaryRow label="Platform" value={selectedPlatform} />
                    <SummaryRow label="City"     value={selectedCity} />
                    <SummaryRow label="Vehicle"  value={selectedVehicle} />
                  </View>
                </View>
              )}

              {/* Error */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {error}</Text>
                </View>
              )}
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navRow}>
              {step > 0 && step < 3 ? (
                <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
                  <ChevronLeft size={18} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              <TouchableOpacity
                onPress={validateAndNext}
                style={[styles.nextBtn, loading && { opacity: 0.7 }]}
                disabled={loading}
                activeOpacity={0.9}
              >
                <Text style={styles.nextText}>
                  {loading ? 'Please wait…' : step === 3 ? 'Start Using Blink' : step === 0 && !otpSent ? 'Send OTP' : 'Continue'}
                </Text>
                <ChevronRight size={18} color={COLORS.navy} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/* ──────────────────── Sub-components ──────────────────── */

function InputField({ label, placeholder, value, onChangeText, keyboardType, editable = true, prefix, maxLength }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputRow, !editable && { opacity: 0.5 }]}>
        {!!prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, !!prefix && { paddingLeft: 4 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType || 'default'}
          editable={editable}
          maxLength={maxLength}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && { opacity: 0.6 }]}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChipButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

/* ──────────────────── Styles ──────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Progress */
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 0,
  },
  stepDotWrap: { alignItems: 'center', position: 'relative' },
  stepLine: {
    position: 'absolute',
    top: 14, left: '50%',
    width: (width - 96) / 3,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginLeft: 14,
  },
  stepLineDone: { backgroundColor: '#FFFFFF' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  stepDotDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  stepDotNum: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  stepDotNumActive: { color: '#1D4ED8' },
  stepDotLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 },
  container: { flex: 1 },

  /* Header */
  header: { alignItems: 'center', paddingTop: 24, marginBottom: 24 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  title: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 6, lineHeight: 19 },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 20,
  },

  /* Input */
  inputWrap: { marginBottom: 16 },
  inputLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  inputPrefix: { fontSize: 14, fontWeight: '700', color: '#1D4ED8', marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },

  /* Primary button */
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  /* OTP */
  resendRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -8, marginBottom: 12 },
  resendTimer: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resendText: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  hintBox: {
    backgroundColor: '#EFF6FF', borderRadius: 10,
    padding: 10, marginTop: 4,
  },
  hintText: { fontSize: 11, color: '#1D4ED8', textAlign: 'center', fontWeight: '600' },

  /* Chips */
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  chipSelected: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextSelected: { color: '#FFFFFF' },

  /* Success */
  successBlock: { alignItems: 'center', paddingVertical: 8 },
  successCircle: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#047857', marginBottom: 8 },
  successBody: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  summaryRows: { width: '100%', gap: 10 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F8FAFF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  summaryLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  summaryValue: { fontSize: 13, color: '#0F172A', fontWeight: '700' },

  /* Error */
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginTop: 4 },
  errorText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },

  /* Nav row */
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 15,
  },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  nextBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.full,
    paddingVertical: 15, gap: 8,
  },
  nextText: { fontSize: 15, fontWeight: '800', color: '#1E3A8A' },
});
