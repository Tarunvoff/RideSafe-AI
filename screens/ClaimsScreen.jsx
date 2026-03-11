import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar, Modal, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle, Clock, XCircle, IndianRupee, X,
  CloudRain, Wind, Zap, MapPin, Thermometer,
  ArrowDownLeft, ShieldCheck, CreditCard, Hash,
} from "lucide-react-native";
import { MOCK_CLAIMS, MOCK_WORKER } from "../data/mockData";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/colors";

const STATUS_CONFIG = {
  approved:   { color: COLORS.green,  bg: COLORS.greenLight,  icon: CheckCircle, label: "Paid Out" },
  paid:       { color: COLORS.green,  bg: COLORS.greenLight,  icon: CheckCircle, label: "Paid Out" },
  pending:    { color: COLORS.orange, bg: COLORS.orangeLight, icon: Clock,       label: "Pending" },
  rejected:   { color: COLORS.red,    bg: COLORS.redLight,    icon: XCircle,     label: "Rejected" },
  processing: { color: COLORS.blue,   bg: COLORS.blueLight,   icon: Clock,       label: "Processing" },
};

const FILTERS = ["All", "Paid Out", "Processing", "Pending"];

const normalizeStatus = (s) => (s === "paid" ? "approved" : s);

const guessIcon = (title = "") => {
  const t = title.toLowerCase();
  if (t.includes("rain") || t.includes("flood") || t.includes("cyclone")) return CloudRain;
  if (t.includes("heat") || t.includes("temperature")) return Thermometer;
  if (t.includes("aqi") || t.includes("pollution") || t.includes("wind")) return Wind;
  if (t.includes("disruption") || t.includes("event")) return MapPin;
  return Zap;
};

export default function ClaimsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [selectedPayout, setSelected] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const payouts = MOCK_CLAIMS || [];

  const filtered = payouts.filter((p) => {
    if (filter === "All") return true;
    const sc = STATUS_CONFIG[normalizeStatus(p.status)];
    return sc?.label === filter;
  });

  const totalPaid = payouts
    .filter((p) => ["approved", "paid"].includes(p.status))
    .reduce((s, p) => s + (p.approvedPayout || 0), 0);

  const paidCount = payouts.filter((p) => ["approved", "paid"].includes(p.status)).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerSub}>{MOCK_WORKER.name}</Text>
        <Text style={styles.headerTitle}>Payouts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, SHADOWS.card]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>₹{totalPaid.toLocaleString("en-IN")}</Text>
            <Text style={styles.summaryLbl}>Total Received</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{payouts.length}</Text>
            <Text style={styles.summaryLbl}>Auto-Payouts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.green }]}>{paidCount}</Text>
            <Text style={styles.summaryLbl}>Credited</Text>
          </View>
        </View>

        <View style={styles.noticeBanner}>
          <ShieldCheck size={14} color={COLORS.blue} strokeWidth={2.5} />
          <Text style={styles.noticeText}>
            Payouts are triggered automatically when a verified disruption is detected — no action needed from you.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          {filter === "All" ? "All Payouts" : filter} · {filtered.length}
        </Text>

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <IndianRupee size={36} color={COLORS.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No payouts here</Text>
            <Text style={styles.emptySub}>Your auto-payouts for this category will appear here.</Text>
          </View>
        )}

        {filtered.map((payout, i) => (
          <PayoutCard key={payout.id || i} payout={payout} index={i} onPress={() => setSelected(payout)} />
        ))}

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <PayoutDetailModal payout={selectedPayout} onClose={() => setSelected(null)} />
    </View>
  );
}

function PayoutCard({ payout, index, onPress }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setTimeout(() =>
      Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }).start(),
      index * 100
    );
  }, []);

  const norm = normalizeStatus(payout.status);
  const sc = STATUS_CONFIG[norm] || STATUS_CONFIG.pending;
  const Icon = guessIcon(payout.title);
  const isPaid = ["approved", "paid"].includes(payout.status);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.card, SHADOWS.card]}>
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: sc.bg }]}>
            <Icon size={18} color={sc.color} strokeWidth={2.5} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>{payout.title}</Text>
            <Text style={styles.cardMeta}>{payout.date} · #{payout.id}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardAmount, { color: isPaid ? COLORS.green : COLORS.textPrimary }]}>
              ₹{(payout.approvedPayout || 0).toLocaleString("en-IN")}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>
        </View>

        {payout.disruption && (
          <Text style={styles.cardDisruption}>📍 {payout.disruption}</Text>
        )}

        {isPaid ? (
          <View style={styles.autoPayBanner}>
            <ArrowDownLeft size={12} color={COLORS.green} strokeWidth={2.5} />
            <Text style={styles.autoPayText}>Auto-credited · {payout.date}</Text>
            <Text style={styles.tapHint}>Tap for details →</Text>
          </View>
        ) : (
          <View style={[styles.autoPayBanner, { backgroundColor: sc.bg, borderColor: sc.bg }]}>
            <Clock size={12} color={sc.color} strokeWidth={2.5} />
            <Text style={[styles.autoPayText, { color: sc.color }]}>Processing · {payout.processingTime}</Text>
            <Text style={[styles.tapHint, { color: sc.color }]}>Tap for details →</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function PayoutDetailModal({ payout, onClose }) {
  const slideAnim = useRef(new Animated.Value(700)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (payout) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 700, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [payout]);


  const norm = normalizeStatus(payout.status);
  const sc = STATUS_CONFIG[norm] || STATUS_CONFIG.pending;
  const Icon = guessIcon(payout.title);
  const isPaid = ["approved", "paid"].includes(payout.status);
  const StatusIcon = sc.icon;

  return (
    <Modal transparent visible={git pull origin main payout} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.sheetHandle} />
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={COLORS.textMuted} strokeWidth={2.5} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.heroWrap}>
            <View style={[styles.heroIcon, { backgroundColor: sc.bg }]}>
              <Icon size={28} color={sc.color} strokeWidth={2} />
            </View>
            <Text style={styles.heroTitle}>{payout.title}</Text>
            <Text style={styles.heroMeta}>{payout.date} · #{payout.id}</Text>

            <View style={[styles.amountPill, isPaid ? { backgroundColor: COLORS.greenLight, borderColor: "#A7F3D0" } : { backgroundColor: sc.bg, borderColor: sc.bg }]}>
              <Text style={styles.amountPillLabel}>Payout Amount</Text>
              <Text style={[styles.amountPillVal, { color: sc.color }]}>
                ₹{(payout.approvedPayout || 0).toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <StatusIcon size={13} color={sc.color} strokeWidth={2.5} />
              <Text style={[styles.statusPillText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>

          <View style={styles.detailsCard}>
            <DetailRow
              icon={<Zap size={14} color={COLORS.blue} strokeWidth={2.5} />}
              label="Trigger Event" value={payout.disruption || "—"} />
            <DetailRow
              icon={<IndianRupee size={14} color={COLORS.textMuted} strokeWidth={2.5} />}
              label="Estimated Loss" value={"₹" + (payout.estimatedLoss || 0).toLocaleString("en-IN")} />
            <DetailRow
              icon={<IndianRupee size={14} color={COLORS.green} strokeWidth={2.5} />}
              label="Approved Payout" value={"₹" + (payout.approvedPayout || 0).toLocaleString("en-IN")} valueColor={COLORS.green} />
            <DetailRow
              icon={<Clock size={14} color={COLORS.textMuted} strokeWidth={2.5} />}
              label="Processing Time" value={payout.processingTime || "—"} />
            {payout.transactionId && (
              <DetailRow
                icon={<Hash size={14} color={COLORS.textMuted} strokeWidth={2.5} />}
                label="Transaction ID" value={payout.transactionId} />
            )}
            {payout.paymentMethod && (
              <DetailRow
                icon={<CreditCard size={14} color={COLORS.textMuted} strokeWidth={2.5} />}
                label="Payment Method" value={payout.paymentMethod} />
            )}
          </View>

          {payout.timeline && payout.timeline.length > 0 && (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineHeading}>Auto-Trigger Timeline</Text>
              {payout.timeline.map((step, i) => (
                <TimelineStep key={i} step={step} isLast={i === payout.timeline.length - 1} />
              ))}
            </View>
          )}

          <View style={styles.autoNote}>
            <ShieldCheck size={14} color={COLORS.blue} strokeWidth={2.5} />
            <Text style={styles.autoNoteText}>
              This payout was triggered automatically by Blink's AI disruption detection system — no manual claim was required.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function DetailRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowLeft}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function TimelineStep({ step, isLast }) {
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlLeft}>
        <View style={[styles.tlDot, step.done && styles.tlDotDone]}>
          {step.done
            ? <CheckCircle size={14} color={COLORS.green} strokeWidth={2.5} />
            : <Clock size={14} color={COLORS.textMuted} strokeWidth={2.5} />
          }
        </View>
      </View>
      <View style={styles.tlContent}>
        <Text style={[styles.tlEvent, step.done && styles.tlEventDone]}>{step.event}</Text>
        <Text style={styles.tlTime}>{step.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: SPACING.md, paddingBottom: 0 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: SPACING.sm },
  filtersRow: { paddingBottom: SPACING.md, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  chipActive: { backgroundColor: "#FFFFFF" },
  chipText: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  chipTextActive: { color: COLORS.navy, fontWeight: "700" },
  scroll: { padding: SPACING.md },
  summaryCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, flexDirection: "row", padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  summaryLbl: { fontSize: 9, color: COLORS.textMuted, marginTop: 3 },
  summaryDivider: { width: 1, backgroundColor: COLORS.bgBorder },
  noticeBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EFF6FF", borderRadius: RADIUS.lg, padding: 12, marginBottom: SPACING.md, borderWidth: 1, borderColor: "#BFDBFE" },
  noticeText: { flex: 1, fontSize: 12, color: COLORS.blue, lineHeight: 17, fontWeight: "500" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textMuted, marginTop: 12 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.bgBorder },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 19 },
  cardMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 5 },
  cardAmount: { fontSize: 15, fontWeight: "800" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cardDisruption: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, marginLeft: 52 },
  autoPayBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: COLORS.greenLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: "#A7F3D0" },
  autoPayText: { flex: 1, fontSize: 11, color: COLORS.green, fontWeight: "600" },
  tapHint: { fontSize: 10, color: COLORS.green, opacity: 0.8, fontWeight: "600" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.55)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: SPACING.md, maxHeight: "92%", minHeight: 400 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.bgBorder, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  closeBtn: { position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgPrimary, alignItems: "center", justifyContent: "center", zIndex: 10 },
  heroWrap: { alignItems: "center", paddingTop: 24, paddingBottom: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary, textAlign: "center", lineHeight: 24, paddingHorizontal: 20 },
  heroMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 16 },
  amountPill: { borderRadius: RADIUS.xl, paddingHorizontal: 24, paddingVertical: 12, alignItems: "center", marginBottom: 10, borderWidth: 1 },
  amountPillLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  amountPillVal: { fontSize: 32, fontWeight: "900" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  detailsCard: { backgroundColor: COLORS.bgPrimary, borderRadius: RADIUS.xl, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: COLORS.bgBorder },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.bgBorder },
  detailRowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
  detailValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: "700", maxWidth: "55%", textAlign: "right" },
  timelineCard: { backgroundColor: COLORS.bgPrimary, borderRadius: RADIUS.xl, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.bgBorder },
  timelineHeading: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  tlRow: { flexDirection: "row", gap: 12, minHeight: 52 },
  tlLeft: { alignItems: "center", width: 28 },
  tlDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bgBorder, alignItems: "center", justifyContent: "center" },
  tlDotDone: { backgroundColor: COLORS.greenLight },
  tlLine: { flex: 1, width: 2, backgroundColor: COLORS.bgBorder, marginTop: 4, marginBottom: -4 },
  tlLineDone: { backgroundColor: COLORS.green },
  tlContent: { flex: 1, paddingBottom: 12 },
  tlEvent: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
  tlEventDone: { color: COLORS.textPrimary, fontWeight: "700" },
  tlTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  autoNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EFF6FF", borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: "#BFDBFE" },
  autoNoteText: { flex: 1, fontSize: 11, color: COLORS.blue, lineHeight: 16, fontWeight: "500" },
});
