import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, ShieldOff } from 'lucide-react-native';
import FraudAlertCard from '../../components/admin/FraudAlertCard';
import { ADMIN_FRAUD_ALERTS } from '../../data/adminMockData';

const SEVERITY_FILTERS = ['All', 'critical', 'high', 'medium'];
const STATUS_FILTERS = ['All', 'under_review', 'escalated', 'pending', 'blocked'];

export default function AdminFraudScreen() {
  const insets = useSafeAreaInsets();
  const [severityFilter, setSeverityFilter] = useState('All');
  const [alerts, setAlerts] = useState(ADMIN_FRAUD_ALERTS);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = alerts.filter(a =>
    severityFilter === 'All' || a.severity === severityFilter
  );

  const handleAction = (alert, action) => {
    if (action === 'block') {
      Alert.alert(
        'Block Account',
        `Are you sure you want to block ${alert.workerName}'s account?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              setAlerts(prev => prev.map(a =>
                a.id === alert.id ? { ...a, status: 'blocked' } : a
              ));
            },
          },
        ]
      );
    } else if (action === 'clear') {
      Alert.alert(
        'Clear Alert',
        `Mark this fraud alert for ${alert.workerName} as cleared?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            onPress: () => {
              setAlerts(prev => prev.map(a =>
                a.id === alert.id ? { ...a, status: 'cleared' } : a
              ));
            },
          },
        ]
      );
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const underReviewCount = alerts.filter(a => a.status === 'under_review' || a.status === 'escalated').length;
  const blockedCount = alerts.filter(a => a.status === 'blocked').length;
  const totalFlagged = alerts.reduce((s, a) => s + a.totalFlaggedAmount, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#450A0A" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fraud Detection</Text>
          <Text style={styles.headerSub}>{alerts.length} alerts · ₹{totalFlagged.toLocaleString('en-IN')} flagged</Text>
        </View>
        <View style={styles.alertIconWrap}>
          <ShieldOff size={18} color="#EF4444" strokeWidth={2.5} />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{criticalCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Critical</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: '#FFF7ED' }]}>
          <Text style={[styles.summaryValue, { color: '#F97316' }]}>{underReviewCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#F97316' }]}>Under Review</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: '#F1F5F9' }]}>
          <Text style={[styles.summaryValue, { color: '#64748B' }]}>{blockedCount}</Text>
          <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Blocked</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.summaryValue, { color: '#D97706' }]}>
            ₹{(totalFlagged / 1000).toFixed(0)}K
          </Text>
          <Text style={[styles.summaryLabel, { color: '#D97706' }]}>Flagged ₹</Text>
        </View>
      </View>

      {/* Severity filter */}
      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, severityFilter === f && styles.filterChipActive]}
            onPress={() => setSeverityFilter(f)}
          >
            <Text style={[styles.filterChipText, severityFilter === f && styles.filterChipTextActive]}>
              {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countLabel}>{filtered.length} alerts</Text>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={filtered}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FraudAlertCard alert={item} onAction={handleAction} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AlertTriangle size={40} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>No fraud alerts found</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F5' },
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
  alertIconWrap: { width: 38, height: 38, backgroundColor: '#450A0A', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  summaryItem: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  summaryValue: { fontSize: 18, fontWeight: '900' },
  summaryLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  countLabel: { fontSize: 11, color: '#94A3B8' },
  list: { padding: 14, paddingTop: 4, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
