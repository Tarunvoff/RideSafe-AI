import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Star, Zap, Filter } from 'lucide-react-native';
import AdminPolicyCard from '../../components/admin/AdminPolicyCard';
import { ADMIN_POLICIES } from '../../data/adminMockData';

const PLAN_FILTERS = ['All', 'Pro Guard', 'Elite Armor', 'Basic Shield'];
const STATUS_FILTERS = ['All', 'active', 'expired'];

export default function AdminPoliciesScreen() {
  const insets = useSafeAreaInsets();
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = ADMIN_POLICIES.filter(p => {
    const matchesPlan = planFilter === 'All' || p.planType === planFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesPlan && matchesStatus;
  });

  const activePolicies = ADMIN_POLICIES.filter(p => p.status === 'active').length;
  const expiredPolicies = ADMIN_POLICIES.filter(p => p.status === 'expired').length;
  const totalPremium = ADMIN_POLICIES.filter(p => p.status === 'active').reduce((s, p) => s + p.weeklyPremium, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Policies</Text>
          <Text style={styles.headerSub}>{ADMIN_POLICIES.length} total · {activePolicies} active</Text>
        </View>
      </View>

      {/* Summary pills */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: '#DCFCE7' }]}>
          <Shield size={12} color="#10B981" strokeWidth={2.5} />
          <Text style={[styles.summaryText, { color: '#10B981' }]}>{activePolicies} Active</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: '#FEE2E2' }]}>
          <Shield size={12} color="#EF4444" strokeWidth={2.5} />
          <Text style={[styles.summaryText, { color: '#EF4444' }]}>{expiredPolicies} Expired</Text>
        </View>
        <View style={[styles.summaryPill, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.summaryText, { color: '#2563EB' }]}>₹{totalPremium}/wk collected</Text>
        </View>
      </View>

      {/* Plan Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {PLAN_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, planFilter === f && styles.filterChipActive]}
            onPress={() => setPlanFilter(f)}
          >
            {f === 'Pro Guard' && <Star size={10} color={planFilter === f ? '#FFFFFF' : '#7C3AED'} strokeWidth={2} />}
            {f === 'Elite Armor' && <Zap size={10} color={planFilter === f ? '#FFFFFF' : '#D97706'} strokeWidth={2} />}
            {f === 'Basic Shield' && <Shield size={10} color={planFilter === f ? '#FFFFFF' : '#2563EB'} strokeWidth={2} />}
            <Text style={[styles.filterChipText, planFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter */}
      <View style={styles.statusFilterRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.statusChip, statusFilter === s && styles.statusChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.statusChipText, statusFilter === s && styles.statusChipTextActive]}>
              {s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countLabel}>{filtered.length} shown</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <AdminPolicyCard policy={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No policies match your filters</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingTop: 14 },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  summaryText: { fontSize: 11, fontWeight: '700' },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  statusFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginBottom: 6 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  statusChipActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  statusChipText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  statusChipTextActive: { color: '#FFFFFF' },
  countLabel: { marginLeft: 'auto', fontSize: 11, color: '#94A3B8' },
  list: { padding: 14, paddingTop: 4, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
