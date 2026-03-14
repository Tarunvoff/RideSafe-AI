import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IndianRupee, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react-native';

const PAYOUT_WORKERS = [
  { id: 1, name: 'Rahul Kumar', workerId: 'W001', totalPayout: 28500, status: 'approved', gpsStatus: 'clean', lastPayout: '2 days ago' },
  { id: 2, name: 'Priya Singh', workerId: 'W003', totalPayout: 32100, status: 'approved', gpsStatus: 'clean', lastPayout: '1 day ago' },
  { id: 3, name: 'Arun Patel', workerId: 'W005', totalPayout: 0, status: 'blocked', gpsStatus: 'spoofed', lastPayout: 'Blocked' },
  { id: 4, name: 'Neha Gupta', workerId: 'W007', totalPayout: 0, status: 'blocked', gpsStatus: 'spoofed', lastPayout: 'Blocked' },
  { id: 5, name: 'Vikram Singh', workerId: 'W009', totalPayout: 15600, status: 'review', gpsStatus: 'flagged', lastPayout: 'Pending' },
  { id: 6, name: 'Ananya Sharma', workerId: 'W011', totalPayout: 45200, status: 'approved', gpsStatus: 'clean', lastPayout: '2 hours ago' },
  { id: 7, name: 'Sanjay Desai', workerId: 'W013', totalPayout: 0, status: 'blocked', gpsStatus: 'spoofed', lastPayout: 'Blocked' },
  { id: 8, name: 'Meera Gupta', workerId: 'W015', totalPayout: 52300, status: 'approved', gpsStatus: 'clean', lastPayout: '30 min ago' },
];

export default function AdminPayoutsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('all');
  const [workers, setWorkers] = useState(PAYOUT_WORKERS);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = workers.filter(w => {
    if (tab === 'all') return true;
    if (tab === 'approved') return w.status === 'approved';
    if (tab === 'blocked') return w.status === 'blocked';
    if (tab === 'review') return w.status === 'review';
    return true;
  });

  const totalPayoutsIssued = workers
    .filter(w => w.status === 'approved')
    .reduce((sum, w) => sum + w.totalPayout, 0);

  const totalPayoutsBlocked = workers
    .filter(w => w.status === 'blocked')
    .reduce((sum, w) => sum + 50000, 0); // Estimated

  const approvedCount = workers.filter(w => w.status === 'approved').length;
  const blockedCount = workers.filter(w => w.status === 'blocked').length;
  const reviewCount = workers.filter(w => w.status === 'review').length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Payout Management</Text>
          <Text style={styles.headerSub}>Monitor worker payouts by GPS status</Text>
        </View>
        <View style={styles.headerIcon}>
          <IndianRupee size={18} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Issued</Text>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>₹{(totalPayoutsIssued / 100000).toFixed(2)}L</Text>
          <Text style={styles.summarySub}>{approvedCount} workers</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FECACA' }]}>
          <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Blocked (GPS)</Text>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>₹{(totalPayoutsBlocked / 100000).toFixed(2)}L</Text>
          <Text style={styles.summarySub}>{blockedCount} workers</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FED7AA' }]}>
          <Text style={[styles.summaryLabel, { color: '#F97316' }]}>Pending</Text>
          <Text style={[styles.summaryValue, { color: '#F97316' }]}>₹7.8L</Text>
          <Text style={styles.summarySub}>{reviewCount} workers</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabNav}>
          {['all', 'approved', 'blocked', 'review'].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'all' ? `All (${workers.length})`
                : t === 'approved' ? `Approved (${approvedCount})`
                : t === 'blocked' ? `Blocked (${blockedCount})`
                : `Review (${reviewCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Worker List */}
      <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filtered}
          keyExtractor={w => w.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <WorkerPayoutCard worker={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CheckCircle size={40} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No workers in this category</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

function WorkerPayoutCard({ worker }) {
  const statusColor = worker.status === 'approved' ? '#10B981'
    : worker.status === 'blocked' ? '#EF4444'
    : '#F97316';

  const statusBg = worker.status === 'approved' ? '#D1FAE5'
    : worker.status === 'blocked' ? '#FECACA'
    : '#FED7AA';

  const gpsStatusColor = worker.gpsStatus === 'clean' ? '#10B981'
    : worker.gpsStatus === 'spoofed' ? '#EF4444'
    : '#F97316';

  const gpsStatusBg = worker.gpsStatus === 'clean' ? '#D1FAE5'
    : worker.gpsStatus === 'spoofed' ? '#FECACA'
    : '#FED7AA';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.workerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{worker.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={styles.workerId}>{worker.workerId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{worker.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardMiddle}>
        <View style={styles.payoutInfo}>
          <Text style={styles.payoutLabel}>Total Payout</Text>
          <Text style={styles.payoutValue}>₹{worker.totalPayout.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.gpsInfo}>
          <Text style={styles.gpsLabel}>GPS Status</Text>
          <View style={[styles.gpsBadge, { backgroundColor: gpsStatusBg }]}>
            <Text style={[styles.gpsValue, { color: gpsStatusColor }]}>{worker.gpsStatus.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.lastPayoutInfo}>
          <Text style={styles.lastPayoutLabel}>Last Payout</Text>
          <Text style={styles.lastPayoutValue}>{worker.lastPayout}</Text>
        </View>
      </View>
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
  headerIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  summarySub: { fontSize: 9, color: '#64748B' },
  tabScroll: { },
  tabNav: { flexDirection: 'row', paddingHorizontal: 14, gap: 8 },
  tab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  listContainer: { flex: 1 },
  list: { padding: 14, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardTop: { padding: 12 },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  workerName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  workerId: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: '#E2E8F0' },
  cardMiddle: { flexDirection: 'row', padding: 12, gap: 10 },
  payoutInfo: { flex: 1 },
  payoutLabel: { fontSize: 9, color: '#64748B', marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  payoutValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  gpsInfo: { flex: 1 },
  gpsLabel: { fontSize: 9, color: '#64748B', marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  gpsBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  gpsValue: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  lastPayoutInfo: { flex: 1 },
  lastPayoutLabel: { fontSize: 9, color: '#64748B', marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  lastPayoutValue: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
