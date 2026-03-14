import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, MapPin, Bike, Phone, Mail, Shield,
  FileText, AlertTriangle, TrendingUp,
} from 'lucide-react-native';

const RISK_CONFIG = {
  Low:      { color: '#10B981', bg: '#DCFCE7' },
  Moderate: { color: '#F59E0B', bg: '#FEF3C7' },
  High:     { color: '#F97316', bg: '#FFEDD5' },
  Critical: { color: '#EF4444', bg: '#FEE2E2' },
};

const PLAN_COLOR = {
  'Pro Guard':    '#7C3AED',
  'Elite Armor':  '#D97706',
  'Basic Shield': '#2563EB',
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon size={14} color="#64748B" strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function AdminWorkerDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { worker } = route.params;
  const risk = RISK_CONFIG[worker.riskLabel] || RISK_CONFIG.Moderate;
  const planColor = PLAN_COLOR[worker.activePolicy] || '#2563EB';

  // Risk Score Bar
  const riskWidth = `${worker.riskScore}%`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + Name */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: planColor + '20', borderColor: planColor + '50' }]}>
            <Text style={[styles.initials, { color: planColor }]}>{worker.initials}</Text>
          </View>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.workerId}>{worker.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: worker.status === 'active' ? '#DCFCE7' : '#FEE2E2' }]}>
            <View style={[styles.statusDot, { backgroundColor: worker.status === 'active' ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.statusText, { color: worker.status === 'active' ? '#10B981' : '#EF4444' }]}>
              {worker.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Risk Score */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Text style={styles.sectionTitle}>Risk Score</Text>
            <View style={[styles.riskPill, { backgroundColor: risk.bg }]}>
              <Text style={[styles.riskLabel, { color: risk.color }]}>{worker.riskLabel}</Text>
            </View>
          </View>
          <View style={styles.riskScoreRow}>
            <TrendingUp size={16} color={risk.color} strokeWidth={2.5} />
            <Text style={[styles.riskScore, { color: risk.color }]}>{worker.riskScore}</Text>
            <Text style={styles.riskMax}>/100</Text>
          </View>
          <View style={styles.riskTrack}>
            <View style={[styles.riskFill, { width: riskWidth, backgroundColor: risk.color }]} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{worker.weeklyIncome.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Weekly Income</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>₹{worker.totalPayouts.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Total Payouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F97316' }]}>{worker.totalClaims}</Text>
            <Text style={styles.statLabel}>Total Claims</Text>
          </View>
        </View>

        {/* Insurance Plan */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Insurance Plan</Text>
          <View style={[styles.planRow, { borderColor: planColor + '30' }]}>
            <Shield size={20} color={planColor} strokeWidth={2.5} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: planColor }]}>{worker.activePolicy}</Text>
              <Text style={styles.policyId}>Policy: {worker.policyId}</Text>
            </View>
            <View>
              <Text style={styles.expiryLabel}>Expires</Text>
              <Text style={styles.expiryDate}>{worker.policyExpiry}</Text>
            </View>
          </View>
        </View>

        {/* Worker Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Worker Information</Text>
          <InfoRow icon={MapPin} label="City / Zone" value={`${worker.city} · ${worker.zone}`} />
          <InfoRow icon={Shield} label="Platform" value={worker.platform} />
          <InfoRow icon={Bike} label="Vehicle Type" value={worker.vehicleType} />
          <InfoRow icon={Phone} label="Phone" value={worker.phone} />
          <InfoRow icon={Mail} label="Email" value={worker.email} />
          <InfoRow icon={FileText} label="Member Since" value={worker.memberSince} />
        </View>

        {/* Admin Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'View Claims', color: '#2563EB', bg: '#EFF6FF' },
              { label: 'View Policy', color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Flag Fraud', color: '#EF4444', bg: '#FEF2F2' },
              { label: 'Deactivate', color: '#94A3B8', bg: '#F1F5F9' },
            ].map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, { backgroundColor: a.bg, borderColor: a.color + '30' }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionText, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  scroll: { padding: 14 },
  profileCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, marginBottom: 12, borderWidth: 1, borderColor: '#E8EEF8' },
  avatar: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 12 },
  initials: { fontSize: 26, fontWeight: '900' },
  workerName: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  workerId: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  riskCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E8EEF8' },
  riskHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  riskPill: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  riskLabel: { fontSize: 11, fontWeight: '700' },
  riskScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  riskScore: { fontSize: 36, fontWeight: '900' },
  riskMax: { fontSize: 14, color: '#94A3B8' },
  riskTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  riskFill: { height: '100%', borderRadius: 4 },
  statsRow: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8EEF8' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  statDivider: { width: 1, height: 36, backgroundColor: '#E2E8F0' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E8EEF8' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  planName: { fontSize: 15, fontWeight: '800' },
  policyId: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  expiryLabel: { fontSize: 9, color: '#94A3B8', textAlign: 'right' },
  expiryDate: { fontSize: 12, fontWeight: '700', color: '#334155', textAlign: 'right' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIcon: { width: 32, height: 32, backgroundColor: '#F8FAFC', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, minWidth: '44%', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '700' },
});
