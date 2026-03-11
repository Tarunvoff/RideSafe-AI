import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, Star, Zap, MapPin, Calendar } from 'lucide-react-native';

const PLAN_CONFIG = {
  'Pro Guard':    { color: '#7C3AED', bg: '#F5F3FF', icon: Star },
  'Elite Armor':  { color: '#D97706', bg: '#FFFBEB', icon: Zap },
  'Basic Shield': { color: '#2563EB', bg: '#EFF6FF', icon: Shield },
};

const STATUS_CONFIG = {
  active:  { color: '#10B981', bg: '#DCFCE7', label: 'Active' },
  expired: { color: '#EF4444', bg: '#FEE2E2', label: 'Expired' },
  pending: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pending' },
};

export default function AdminPolicyCard({ policy }) {
  const plan = PLAN_CONFIG[policy.planType] || PLAN_CONFIG['Basic Shield'];
  const status = STATUS_CONFIG[policy.status] || STATUS_CONFIG.active;
  const PlanIcon = plan.icon;

  return (
    <View style={[styles.card, { borderLeftColor: plan.color, borderLeftWidth: 3 }]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: plan.bg }]}>
          <PlanIcon size={18} color={plan.color} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.planType}>{policy.planType}</Text>
          <Text style={styles.policyId}>{policy.id}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Worker</Text>
          <Text style={styles.metaValue}>{policy.workerName}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Premium</Text>
          <Text style={[styles.metaValue, { color: plan.color }]}>₹{policy.weeklyPremium}/wk</Text>
        </View>
        <View style={styles.metaItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={10} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.metaLabel}>{policy.city}</Text>
          </View>
          <Text style={styles.metaValue}>Coverage ₹{policy.coverageAmount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.metaItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.metaLabel}>Expires</Text>
          </View>
          <Text style={styles.metaValue}>{policy.expiryDate}</Text>
        </View>
      </View>
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planType: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  policyId: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  statusPill: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { minWidth: '45%', gap: 2 },
  metaLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  metaValue: { fontSize: 12, fontWeight: '700', color: '#334155' },
});
