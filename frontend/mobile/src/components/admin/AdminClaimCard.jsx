import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CloudRain, Thermometer, Wind, Smartphone, MapPin, Clock } from 'lucide-react-native';

const DISRUPTION_ICONS = {
  weather:  CloudRain,
  heatwave: Thermometer,
  aqi:      Wind,
  platform: Smartphone,
  event:    MapPin,
};

const STATUS_CONFIG = {
  paid:       { color: '#10B981', bg: '#DCFCE7', label: 'Paid' },
  approved:   { color: '#2563EB', bg: '#EFF6FF', label: 'Approved' },
  processing: { color: '#F59E0B', bg: '#FEF3C7', label: 'Processing' },
  rejected:   { color: '#EF4444', bg: '#FEE2E2', label: 'Rejected' },
  pending:    { color: '#8B5CF6', bg: '#F5F3FF', label: 'Pending' },
};

export default function AdminClaimCard({ claim }) {
  const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
  const DisIcon = DISRUPTION_ICONS[claim.disruptionType] || CloudRain;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: status.bg }]}>
          <DisIcon size={16} color={status.color} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.claimId}>{claim.id}</Text>
          <Text style={styles.workerName}>{claim.workerName}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.disruption}>{claim.disruption}</Text>

      <View style={styles.amountRow}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Estimated Loss</Text>
          <Text style={styles.amountValue}>₹{claim.estimatedLoss.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Approved Payout</Text>
          <Text style={[styles.amountValue,
            { color: claim.approvedPayout ? '#10B981' : '#EF4444' }]}>
            {claim.approvedPayout ? `₹${claim.approvedPayout.toLocaleString('en-IN')}` : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <MapPin size={10} color="#94A3B8" strokeWidth={2} />
          <Text style={styles.footerText}>{claim.city}</Text>
        </View>
        <View style={styles.footerItem}>
          <Clock size={10} color="#94A3B8" strokeWidth={2} />
          <Text style={styles.footerText}>{claim.date}</Text>
        </View>
        <Text style={styles.planText}>{claim.plan}</Text>
      </View>

      {claim.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionText}>⚠ {claim.rejectionReason}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EEF8',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  claimId: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  workerName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  statusPill: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  disruption: { fontSize: 12, color: '#475569', marginBottom: 10 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 10 },
  amountItem: { flex: 1, alignItems: 'center' },
  amountLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 3 },
  amountValue: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  arrow: { paddingHorizontal: 8 },
  arrowText: { fontSize: 16, color: '#CBD5E1' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerText: { fontSize: 11, color: '#64748B' },
  planText: { marginLeft: 'auto', fontSize: 10, color: '#7C3AED', fontWeight: '700', backgroundColor: '#F5F3FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  rejectionBox: { marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 },
  rejectionText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
});
