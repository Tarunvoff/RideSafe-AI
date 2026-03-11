import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, MapPin, Star } from 'lucide-react-native';

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

export default function WorkerListCard({ worker, onPress }) {
  const risk = RISK_CONFIG[worker.riskLabel] || RISK_CONFIG.Moderate;
  const planColor = PLAN_COLOR[worker.activePolicy] || '#2563EB';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: planColor + '20', borderColor: planColor + '40' }]}>
        <Text style={[styles.initials, { color: planColor }]}>{worker.initials}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{worker.name}</Text>
          <View style={[styles.riskPill, { backgroundColor: risk.bg }]}>
            <Text style={[styles.riskText, { color: risk.color }]}>{worker.riskLabel}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Star size={10} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.metaText}>{worker.platform}</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <MapPin size={10} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.metaText}>{worker.city}</Text>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <View style={[styles.planPill, { backgroundColor: planColor + '15' }]}>
            <Text style={[styles.planText, { color: planColor }]}>{worker.activePolicy}</Text>
          </View>
          <Text style={styles.income}>₹{worker.weeklyIncome.toLocaleString('en-IN')}/wk</Text>
        </View>
      </View>

      <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initials: {
    fontSize: 16,
    fontWeight: '800',
  },
  info: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  riskPill: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  riskText: { fontSize: 10, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#64748B' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  planPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  planText: { fontSize: 10, fontWeight: '700' },
  income: { fontSize: 12, fontWeight: '700', color: '#10B981' },
});
