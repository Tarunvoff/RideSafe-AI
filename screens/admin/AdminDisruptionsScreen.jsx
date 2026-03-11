import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, AlertTriangle } from 'lucide-react-native';
import AdminDisruptionCard from '../../components/admin/AdminDisruptionCard';
import { ADMIN_DISRUPTIONS } from '../../data/adminMockData';

const SEVERITY_FILTERS = ['All', 'critical', 'high', 'medium', 'low'];
const STATUS_FILTERS = ['All', 'active', 'imminent', 'scheduled', 'resolved'];

function StatusBadge({ label, count, color, bg }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeCount, { color }]}>{count}</Text>
      <Text style={[styles.statusBadgeLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function AdminDisruptionsScreen() {
  const insets = useSafeAreaInsets();
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = ADMIN_DISRUPTIONS.filter(d => {
    const matchesSeverity = severityFilter === 'All' || d.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSeverity && matchesStatus;
  });

  const totalAffected = ADMIN_DISRUPTIONS
    .filter(d => d.status !== 'resolved')
    .reduce((s, d) => s + d.affectedWorkers, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Disruptions</Text>
          <Text style={styles.headerSub}>{ADMIN_DISRUPTIONS.filter(d => d.status !== 'resolved').length} active · {totalAffected.toLocaleString('en-IN')} workers affected</Text>
        </View>
        <View style={styles.alertIcon}>
          <AlertTriangle size={16} color="#EF4444" strokeWidth={2.5} />
        </View>
      </View>

      {/* Status overview */}
      <View style={styles.overviewRow}>
        <StatusBadge label="Active" count={ADMIN_DISRUPTIONS.filter(d => d.status === 'active').length} color="#EF4444" bg="#FEF2F2" />
        <StatusBadge label="Imminent" count={ADMIN_DISRUPTIONS.filter(d => d.status === 'imminent').length} color="#F97316" bg="#FFF7ED" />
        <StatusBadge label="Scheduled" count={ADMIN_DISRUPTIONS.filter(d => d.status === 'scheduled').length} color="#F59E0B" bg="#FFFBEB" />
        <StatusBadge label="Resolved" count={ADMIN_DISRUPTIONS.filter(d => d.status === 'resolved').length} color="#10B981" bg="#F0FDF4" />
      </View>

      {/* Severity Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {SEVERITY_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, severityFilter === f && styles.filterChipActive]}
            onPress={() => setSeverityFilter(f)}
          >
            <Text style={[styles.filterChipText, severityFilter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, { paddingVertical: 4 }]}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.stFilter, statusFilter === f && styles.stFilterActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.stFilterText, statusFilter === f && styles.stFilterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countLabel}>{filtered.length} disruptions</Text>
      </ScrollView>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <AdminDisruptionCard disruption={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Activity size={40} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No disruptions match filters</Text>
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
  alertIcon: { width: 38, height: 38, backgroundColor: '#450A0A', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  overviewRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  statusBadge: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  statusBadgeCount: { fontSize: 18, fontWeight: '900' },
  statusBadgeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  filterRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  stFilter: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  stFilterActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  stFilterText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  stFilterTextActive: { color: '#FFFFFF' },
  countLabel: { marginLeft: 4, fontSize: 11, color: '#94A3B8', alignSelf: 'center' },
  list: { padding: 14, paddingTop: 4, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
