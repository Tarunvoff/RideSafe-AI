import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText, CheckCircle, Clock, XCircle, Plus,
  IndianRupee, X, CloudRain, Wind, Zap, MapPin, ChevronRight,
} from 'lucide-react-native';
import { MOCK_CLAIMS, MOCK_WORKER, MOCK_ALERTS } from '../data/mockData';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/colors';

const STATUS_CONFIG = {
  approved: { color: COLORS.green, bg: COLORS.greenLight, icon: CheckCircle, label: 'Approved' },
  paid:     { color: COLORS.green, bg: COLORS.greenLight, icon: CheckCircle, label: 'Approved' },
  pending:  { color: COLORS.orange, bg: COLORS.orangeLight, icon: Clock, label: 'Pending' },
  rejected: { color: COLORS.red, bg: COLORS.redLight, icon: XCircle, label: 'Rejected' },
  processing: { color: COLORS.blue, bg: COLORS.blueLight, icon: Clock, label: 'Processing' },
};

const FILTERS = ['All', 'Approved', 'Pending', 'Processing'];

const ICON_MAP = { weather: CloudRain, aqi: Wind, pollution: Wind, heat: Zap, disruption: MapPin };

// ──────────────────────────────────────────────────────────────
// PROCESSING STEPS shown during claim submission
// ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Verifying disruption event',     delay: 700 },
  { id: 2, label: 'Checking policy coverage',        delay: 1600 },
  { id: 3, label: 'Calculating payout amount',       delay: 2600 },
  { id: 4, label: 'Triggering auto-transfer',        delay: 3700 },
];

// ──────────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────────
export default function ClaimsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [claims, setClaims] = useState(MOCK_CLAIMS || []);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const filtered = claims.filter(c =>
    filter === 'All' ? true :
    (c.status === 'paid' ? 'approved' : c.status).toLowerCase() === filter.toLowerCase()
  );

  const totalPaid = claims
    .filter(c => ['approved', 'paid'].includes(c.status))
    .reduce((s, c) => s + (c.approvedPayout || c.amount || 0), 0);

  const handleNewClaim = useCallback((newClaim) => {
    setClaims(prev => [newClaim, ...prev]);
    setShowModal(false);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerSub}>{MOCK_WORKER.name}</Text>
        <Text style={styles.headerTitle}>Claims</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary row */}
        <View style={[styles.summaryCard, SHADOWS.card]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>₹{totalPaid.toLocaleString('en-IN')}</Text>
            <Text style={styles.summaryLbl}>Total Received</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{claims.length}</Text>
            <Text style={styles.summaryLbl}>Total Claims</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.green }]}>
              {claims.filter(c => ['approved', 'paid'].includes(c.status)).length}
            </Text>
            <Text style={styles.summaryLbl}>Approved</Text>
          </View>
        </View>

        {/* Section header row */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{filter === 'All' ? 'All Claims' : filter} · {filtered.length}</Text>
          <TouchableOpacity style={styles.newClaimBtn} onPress={() => setShowModal(true)}>
            <View style={styles.newClaimBtnInner}>
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.newClaimText}>New Claim</Text>
            </View>
          </TouchableOpacity>
        </View>

        {filtered.map((claim, i) => <ClaimCard key={claim.id || i} claim={claim} index={i} />)}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* New Claim Modal */}
      <NewClaimModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleNewClaim}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// NEW CLAIM MODAL  (select alert → tick steps → countdown)
// ──────────────────────────────────────────────────────────────
function NewClaimModal({ visible, onClose, onSubmit }) {
  const [phase, setPhase] = useState('select'); // 'select' | 'processing' | 'done'
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [countdown, setCountdown] = useState(90); // seconds
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef(null);

  // Animate modal in/out
  useEffect(() => {
    if (visible) {
      setPhase('select');
      setSelectedAlert(null);
      setCompletedSteps([]);
      setCountdown(90);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Run step animations when processing starts
  useEffect(() => {
    if (phase !== 'processing') return;
    setCompletedSteps([]);

    STEPS.forEach(step => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, step.id]);
      }, step.delay);
    });

    // After all steps, move to done
    const lastDelay = STEPS[STEPS.length - 1].delay + 800;
    setTimeout(() => {
      setPhase('done');
      setCountdown(90);
    }, lastDelay);
  }, [phase]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'done') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [phase]);

  const formatCountdown = (secs) => {
    if (secs <= 0) return 'Credited!';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  const handleSubmit = () => {
    if (!selectedAlert) return;
    setPhase('processing');
  };

  const handleDone = () => {
    const newClaim = {
      id: `CLM-${Date.now()}`,
      title: selectedAlert.title,
      type: selectedAlert.title,
      date: 'Mar 11, 2026',
      description: selectedAlert.description,
      approvedPayout: selectedAlert.expectedPayout,
      amount: selectedAlert.expectedPayout,
      status: 'approved',
      creditDate: 'Mar 11, 2026',
    };
    onSubmit(newClaim);
    // reset
    setPhase('select');
    setSelectedAlert(null);
    setCompletedSteps([]);
    clearInterval(countdownRef.current);
  };

  const activeAlerts = (MOCK_ALERTS || []).filter(a => a.isActive);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={phase === 'select' ? onClose : undefined} />
      </Animated.View>

      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* ── PHASE: SELECT ── */}
        {phase === 'select' && (
          <>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>File New Claim</Text>
                <Text style={styles.sheetSub}>Select an active disruption event</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={COLORS.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeAlerts.length === 0 && (
                <Text style={styles.noAlerts}>No active disruptions right now. Check back later.</Text>
              )}
              {activeAlerts.map(alert => {
                const Icon = ICON_MAP[alert.type] || FileText;
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <TouchableOpacity
                    key={alert.id}
                    onPress={() => setSelectedAlert(alert)}
                    activeOpacity={0.85}
                    style={[styles.alertOption, isSelected && styles.alertOptionSelected]}
                  >
                    <View style={[styles.alertOptionIcon, { backgroundColor: isSelected ? COLORS.blueLight : COLORS.bgBorder }]}>
                      <Icon size={18} color={isSelected ? COLORS.blue : COLORS.textMuted} strokeWidth={2.5} />
                    </View>
                    <View style={styles.alertOptionBody}>
                      <Text style={[styles.alertOptionTitle, isSelected && { color: COLORS.blue }]}>{alert.title}</Text>
                      <Text style={styles.alertOptionSub}>{alert.subtitle}</Text>
                    </View>
                    <View style={styles.alertOptionPayout}>
                      <Text style={styles.alertOptionPayoutLabel}>Payout</Text>
                      <Text style={[styles.alertOptionPayoutVal, { color: COLORS.green }]}>₹{alert.expectedPayout}</Text>
                    </View>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.submitBtn, !selectedAlert && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!selectedAlert}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Submit Claim</Text>
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </>
        )}

        {/* ── PHASE: PROCESSING ── */}
        {phase === 'processing' && (
          <View style={styles.processingWrap}>
            <View style={styles.processingIconWrap}>
              <FileText size={32} color={COLORS.blue} strokeWidth={2} />
            </View>
            <Text style={styles.processingTitle}>Processing Claim</Text>
            <Text style={styles.processingSub}>{selectedAlert?.title}</Text>

            <View style={styles.stepsList}>
              {STEPS.map(step => {
                const done = completedSteps.includes(step.id);
                const isNext = !done && completedSteps.length === step.id - 1;
                return (
                  <ProcessingStep key={step.id} label={step.label} done={done} active={isNext} />
                );
              })}
            </View>
          </View>
        )}

        {/* ── PHASE: DONE ── */}
        {phase === 'done' && (
          <DoneView
            alert={selectedAlert}
            countdown={countdown}
            formatCountdown={formatCountdown}
            onDone={handleDone}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// PROCESSING STEP ROW  (tick animation)
// ──────────────────────────────────────────────────────────────
function ProcessingStep({ label, done, active }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (done) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }).start();
    }
  }, [done]);

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.6);
    }
  }, [active]);

  return (
    <View style={styles.stepRow}>
      {done ? (
        <Animated.View style={[styles.stepCheck, { transform: [{ scale: scaleAnim }] }]}>
          <CheckCircle size={22} color={COLORS.green} strokeWidth={2.5} />
        </Animated.View>
      ) : active ? (
        <Animated.View style={[styles.stepSpinner, { opacity: pulseAnim }]}>
          <Clock size={22} color={COLORS.blue} strokeWidth={2.5} />
        </Animated.View>
      ) : (
        <View style={styles.stepPending}>
          <View style={styles.stepDot} />
        </View>
      )}
      <Text style={[
        styles.stepLabel,
        done && styles.stepLabelDone,
        active && styles.stepLabelActive,
      ]}>
        {label}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// DONE VIEW  (success + countdown)
// ──────────────────────────────────────────────────────────────
function DoneView({ alert, countdown, formatCountdown, onDone }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const done = countdown === 0;

  return (
    <Animated.View style={[styles.doneWrap, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.doneCircle, { transform: [{ scale: scaleAnim }] }]}>
        <CheckCircle size={48} color="#FFFFFF" strokeWidth={2.5} />
      </Animated.View>

      <Text style={styles.doneTitle}>{done ? 'Payout Credited!' : 'Claim Approved!'}</Text>
      <Text style={styles.doneSub}>{alert?.title}</Text>

      <View style={styles.doneAmountCard}>
        <Text style={styles.doneAmountLabel}>Total Payout</Text>
        <Text style={styles.doneAmountVal}>₹{alert?.expectedPayout?.toLocaleString('en-IN') || '—'}</Text>
      </View>

      {!done && (
        <View style={styles.countdownCard}>
          <View style={styles.countdownLeft}>
            <Text style={styles.countdownLabel}>Arriving in your account</Text>
            <Text style={styles.countdownTimer}>{formatCountdown(countdown)}</Text>
          </View>
          <View style={styles.countdownBar}>
            <View style={[styles.countdownFill, { width: `${((90 - countdown) / 90) * 100}%` }]} />
          </View>
        </View>
      )}

      {done && (
        <View style={[styles.countdownCard, { backgroundColor: COLORS.greenLight, borderColor: '#A7F3D0' }]}>
          <IndianRupee size={18} color={COLORS.green} strokeWidth={2.5} />
          <Text style={[styles.countdownLabel, { color: COLORS.green, marginLeft: 8 }]}>
            ₹{alert?.expectedPayout?.toLocaleString('en-IN')} credited to your account
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.9}>
        <Text style={styles.doneBtnText}>View in Claims</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────────
// CLAIM CARD
// ──────────────────────────────────────────────────────────────
function ClaimCard({ claim, index }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setTimeout(() => Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }).start(), index * 100);
  }, []);
  const normalStatus = claim.status === 'paid' ? 'approved' : claim.status;
  const sc = STATUS_CONFIG[normalStatus] || STATUS_CONFIG.pending;
  const StatusIcon = sc.icon;

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <View style={[styles.claimCard, SHADOWS.card]}>
        <View style={styles.claimTop}>
          <View style={[styles.claimIconWrap, { backgroundColor: sc.bg }]}>
            <StatusIcon size={18} color={sc.color} strokeWidth={2.5} />
          </View>
          <View style={styles.claimInfo}>
            <Text style={styles.claimTitle}>{claim.type || claim.title}</Text>
            <Text style={styles.claimDate}>{claim.date} · #{claim.id}</Text>
          </View>
          <View style={styles.claimRight}>
            <Text style={[styles.claimAmount, { color: ['approved', 'paid'].includes(claim.status) ? COLORS.green : COLORS.textPrimary }]}>
              ₹{(claim.approvedPayout || claim.amount || 0).toLocaleString('en-IN')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>
        </View>
        {claim.description ? <Text style={styles.claimDesc}>{claim.description}</Text> : null}
        {['approved', 'paid'].includes(claim.status) && (
          <View style={styles.autoPayBanner}>
            <IndianRupee size={11} color={COLORS.green} strokeWidth={2.5} />
            <Text style={styles.autoPayText}>Auto-credited · {claim.creditDate || claim.date}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: SPACING.md, paddingBottom: 0 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: SPACING.sm },
  filtersRow: { paddingBottom: SPACING.md, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chipActive: { backgroundColor: '#FFFFFF' },
  chipText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  chipTextActive: { color: COLORS.navy, fontWeight: '700' },
  scroll: { padding: SPACING.md },
  summaryCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, flexDirection: 'row', padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.bgBorder },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  summaryLbl: { fontSize: 9, color: COLORS.textMuted, marginTop: 3 },
  summaryDivider: { width: 1, backgroundColor: COLORS.bgBorder },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  newClaimBtn: {},
  newClaimBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.blue, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full },
  newClaimText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  claimCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder },
  claimTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  claimIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  claimInfo: { flex: 1 },
  claimTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  claimDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  claimRight: { alignItems: 'flex-end', gap: 6 },
  claimAmount: { fontSize: 15, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  claimDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, lineHeight: 18 },
  autoPayBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: COLORS.greenLight, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  autoPayText: { fontSize: 11, color: COLORS.green, fontWeight: '600' },

  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  modalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: SPACING.md, paddingBottom: 40, maxHeight: '90%', minHeight: 360 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.bgBorder, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: SPACING.sm },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sheetSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  noAlerts: { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, marginTop: 24, marginBottom: 16 },
  alertOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: SPACING.sm, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.bgBorder, marginBottom: SPACING.sm, backgroundColor: COLORS.bgCard },
  alertOptionSelected: { borderColor: COLORS.blue, backgroundColor: '#EFF6FF' },
  alertOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertOptionBody: { flex: 1 },
  alertOptionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  alertOptionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  alertOptionPayout: { alignItems: 'flex-end', marginRight: 6 },
  alertOptionPayoutLabel: { fontSize: 9, color: COLORS.textMuted },
  alertOptionPayoutVal: { fontSize: 14, fontWeight: '800' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.bgBorder, alignItems: 'center', justifyContent: 'center' },
  radioOuterSelected: { borderColor: COLORS.blue },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.blue },
  submitBtn: { backgroundColor: COLORS.blue, borderRadius: RADIUS.full, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.sm },
  submitBtnDisabled: { backgroundColor: COLORS.bgBorder },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  // Processing
  processingWrap: { paddingTop: SPACING.lg, alignItems: 'center', paddingBottom: 24 },
  processingIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.blueLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  processingTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  processingSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 28 },
  stepsList: { width: '100%', gap: 0 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.bgBorder },
  stepCheck: { width: 28, alignItems: 'center' },
  stepSpinner: { width: 28, alignItems: 'center' },
  stepPending: { width: 28, alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bgBorder },
  stepLabel: { fontSize: 14, color: COLORS.textMuted, flex: 1 },
  stepLabelDone: { color: COLORS.textPrimary, fontWeight: '600' },
  stepLabelActive: { color: COLORS.blue, fontWeight: '700' },

  // Done
  doneWrap: { paddingTop: SPACING.md, alignItems: 'center', paddingBottom: 24 },
  doneCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: COLORS.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  doneTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 4 },
  doneSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  doneAmountCard: { backgroundColor: COLORS.greenLight, borderRadius: RADIUS.xl, paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0', width: '100%' },
  doneAmountLabel: { fontSize: 11, color: COLORS.green, fontWeight: '600', marginBottom: 2 },
  doneAmountVal: { fontSize: 30, fontWeight: '900', color: COLORS.green },
  countdownCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blueLight, borderRadius: RADIUS.xl, padding: SPACING.sm, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE', width: '100%', flexDirection: 'column', gap: 8 },
  countdownLeft: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  countdownLabel: { fontSize: 12, color: COLORS.blue, fontWeight: '600' },
  countdownTimer: { fontSize: 16, fontWeight: '900', color: COLORS.blue },
  countdownBar: { height: 6, backgroundColor: '#DBEAFE', borderRadius: 3, overflow: 'hidden', width: '100%' },
  countdownFill: { height: 6, backgroundColor: COLORS.blue, borderRadius: 3 },
  doneBtn: { backgroundColor: COLORS.navy, borderRadius: RADIUS.full, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center', marginTop: 4 },
  doneBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
