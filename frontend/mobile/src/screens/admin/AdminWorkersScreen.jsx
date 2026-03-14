import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Users } from 'lucide-react-native';
import WorkerListCard from '../../components/admin/WorkerListCard';
import { ADMIN_WORKERS } from '../../data/adminMockData';

const RISK_FILTERS = ['All', 'Low', 'Moderate', 'High', 'Critical'];
const PLATFORM_FILTERS = ['All', 'Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Dunzo', 'Amazon Flex'];

export default function AdminWorkersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = ADMIN_WORKERS.filter(w => {
    const matchesQuery =
      !query.trim() ||
      w.name.toLowerCase().includes(query.toLowerCase()) ||
      w.city.toLowerCase().includes(query.toLowerCase()) ||
      w.platform.toLowerCase().includes(query.toLowerCase());
    const matchesRisk = riskFilter === 'All' || w.riskLabel === riskFilter;
    return matchesQuery && matchesRisk;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Workers</Text>
          <Text style={styles.headerSub}>{ADMIN_WORKERS.length} registered · {ADMIN_WORKERS.filter(w => w.status === 'active').length} active</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal size={16} color={showFilters ? '#2563EB' : '#FFFFFF'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#94A3B8" strokeWidth={2} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search workers, city, platform…"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Risk Filter chips */}
      {showFilters && (
        <View style={styles.filterRow}>
          {RISK_FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, riskFilter === f && styles.filterChipActive]}
              onPress={() => setRiskFilter(f)}
            >
              <Text style={[styles.filterChipText, riskFilter === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Count */}
      <View style={styles.countRow}>
        <Users size={13} color="#94A3B8" strokeWidth={2} />
        <Text style={styles.countText}>{filtered.length} worker{filtered.length !== 1 ? 's' : ''} found</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={w => w.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WorkerListCard
              worker={item}
              onPress={() => navigation.navigate('AdminWorkerDetail', { worker: item })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={40} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No workers found</Text>
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
  headerRight: { flexDirection: 'row', gap: 8 },
  filterToggle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleActive: { backgroundColor: '#EFF6FF' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  countText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  list: { padding: 14, paddingTop: 6, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
