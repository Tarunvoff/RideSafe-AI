import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';
import AdminClaimCard from '../../components/admin/AdminClaimCard';
import { ADMIN_CLAIMS } from '../../data/adminMockData';

const STATUS_FILTERS = ['All', 'processing', 'approved', 'paid', 'rejected'];

function SummaryTile({ label, value, color, bg }) {
  return (
    <View style={[styles.summaryTile, { backgroundColor: bg }]}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: color + 'CC' }]}>{label}</Text>
    </View>
  );
}

export default function AdminClaimsScreen() {
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState('All');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = ADMIN_CLAIMS.filter(c =>
    statusFilter === 'All' || c.status === statusFilter
  );

  const totalPayout = ADMIN_CLAIMS
    .filter(c => c.approvedPayout)
    .reduce((s, c) => s + c.approvedPayout, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Claims</Text>
          <Text style={styles.headerSub}>{ADMIN_CLAIMS.length} claims tracked · ₹{totalPayout.toLocaleString('en-IN')} paid out</Text>
        </View>
      </View>

      {/* Summary Tiles */}
      <View style={styles.tilesRow}>
        <SummaryTile label="Paid" value={ADMIN_CLAIMS.filter(c => c.status === 'paid').length} color="#10B981" bg="#F0FDF4" />
        <SummaryTile label="Processing" value={ADMIN_CLAIMS.filter(c => c.status === 'processing').length} color="#F59E0B" bg="#FFFBEB" />
        <SummaryTile label="Approved" value={ADMIN_CLAIMS.filter(c => c.status === 'approved').length} color="#2563EB" bg="#EFF6FF" />
        <SummaryTile label="Rejected" value={ADMIN_CLAIMS.filter(c => c.status === 'rejected').length} color="#EF4444" bg="#FEF2F2" />
      </View>

      {/* Total payout banner */}
      <View style={styles.payoutBanner}>
        <Text style={styles.payoutBannerLabel}>Total Approved Payouts (shown)</Text>
        <Text style={styles.payoutBannerValue}>₹{totalPayout.toLocaleString('en-IN')}</Text>
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countLabel}>{filtered.length} claims</Text>
      </ScrollView>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <AdminClaimCard claim={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FileText size={40} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No claims match this filter</Text>
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
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  tilesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  summaryTile: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 20, fontWeight: '900' },
  summaryLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  payoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  payoutBannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  payoutBannerValue: { fontSize: 16, fontWeight: '900', color: '#10B981' },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  countLabel: { fontSize: 11, color: '#94A3B8', marginLeft: 4 },
  list: { padding: 14, paddingTop: 4, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
