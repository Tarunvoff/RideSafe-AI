import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, Alert, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, ShieldOff, MapPin, Activity } from 'lucide-react-native';
import FraudAlertCard from '../../components/admin/FraudAlertCard';
import { ADMIN_FRAUD_ALERTS } from '../../data/adminMockData';

const SEVERITY_FILTERS = ['All', 'critical', 'high', 'medium'];
const GPS_SPOOFING_ALERTS = [
  { id: 1, workerId: 'W001', workerName: 'Rahul Kumar', latitude: 12.9716, longitude: 77.5946, fraudScore: 89, recommendation: 'REJECT', timestamp: '2min ago', status: 'flagged', location: 'Bangalore, KA' },
  { id: 2, workerId: 'W003', workerName: 'Priya Singh', latitude: 19.0760, longitude: 72.8777, fraudScore: 72, recommendation: 'MANUAL_REVIEW', timestamp: '15min ago', status: 'under_review', location: 'Mumbai, MH' },
  { id: 3, workerId: 'W005', workerName: 'Arun Patel', latitude: 28.7041, longitude: 77.1025, fraudScore: 45, recommendation: 'APPROVE', timestamp: '1h ago', status: 'approved', location: 'Delhi, DL' },
  { id: 4, workerId: 'W007', workerName: 'Neha Gupta', latitude: 15.3267, longitude: 75.1241, fraudScore: 95, recommendation: 'REJECT', timestamp: '2h ago', status: 'blocked', location: 'Hubli, KA' },
  { id: 5, workerId: 'W009', workerName: 'Vikram Singh', latitude: 13.0827, longitude: 80.2707, fraudScore: 58, recommendation: 'MANUAL_REVIEW', timestamp: '3h ago', status: 'under_review', location: 'Chennai, TN' },
];

export default function AdminFraudScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [currentTab, setCurrentTab] = useState('fraud');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [alerts, setAlerts] = useState(ADMIN_FRAUD_ALERTS);
  const [gpsAlerts, setGpsAlerts] = useState(GPS_SPOOFING_ALERTS);
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

  const handleGpsAction = (gpsAlert, action) => {
    if (action === 'block') {
      Alert.alert(
        'Block Worker',
        `Block ${gpsAlert.workerName} for GPS spoofing detected?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              setGpsAlerts(prev => prev.map(a =>
                a.id === gpsAlert.id ? { ...a, status: 'blocked', recommendation: 'REJECT' } : a
              ));
            },
          },
        ]
      );
    } else if (action === 'approve') {
      Alert.alert(
        'Approve Worker',
        `Approve ${gpsAlert.workerName} despite spoofing alert?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: () => {
              setGpsAlerts(prev => prev.map(a =>
                a.id === gpsAlert.id ? { ...a, status: 'approved', recommendation: 'APPROVE' } : a
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

  const gpsRejected = gpsAlerts.filter(a => a.status === 'flagged').length;
  const gpsUnderReview = gpsAlerts.filter(a => a.status === 'under_review').length;
  const gpsBlocked = gpsAlerts.filter(a => a.status === 'blocked').length;
  const gpsApproved = gpsAlerts.filter(a => a.status === 'approved').length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#450A0A" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{currentTab === 'fraud' ? 'Fraud Detection' : 'GPS Spoofing'}</Text>
          <Text style={styles.headerSub}>
            {currentTab === 'fraud' 
              ? `${alerts.length} alerts · ₹${totalFlagged.toLocaleString('en-IN')} flagged`
              : `${gpsAlerts.length} workers monitored`}
          </Text>
        </View>
        <View style={styles.alertIconWrap}>
          {currentTab === 'fraud' 
            ? <ShieldOff size={18} color="#EF4444" strokeWidth={2.5} />
            : <MapPin size={18} color="#EF4444" strokeWidth={2.5} />
          }
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'fraud' && styles.tabActive]}
          onPress={() => { setCurrentTab('fraud'); setSeverityFilter('All'); }}
        >
          <Text style={[styles.tabText, currentTab === 'fraud' && styles.tabTextActive]}>Fraud Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'gps' && styles.tabActive]}
          onPress={() => setCurrentTab('gps')}
        >
          <Text style={[styles.tabText, currentTab === 'gps' && styles.tabTextActive]}>GPS Spoofing</Text>
        </TouchableOpacity>
      </View>

      {currentTab === 'fraud' ? (
        <>
          {/* Fraud Summary */}
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
        </>
      ) : (
        <>
          {/* GPS Spoofing Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{gpsRejected}</Text>
              <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Flagged</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.summaryValue, { color: '#F97316' }]}>{gpsUnderReview}</Text>
              <Text style={[styles.summaryLabel, { color: '#F97316' }]}>Review</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.summaryValue, { color: '#0284C7' }]}>{gpsApproved}</Text>
              <Text style={[styles.summaryLabel, { color: '#0284C7' }]}>Approved</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.summaryValue, { color: '#64748B' }]}>{gpsBlocked}</Text>
              <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Blocked</Text>
            </View>
          </View>

          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={gpsAlerts}
              keyExtractor={a => a.id.toString()}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => <GpsSpoofingAlertCard alert={item} navigation={navigation} onAction={handleGpsAction} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <MapPin size={40} color="#CBD5E1" strokeWidth={1.5} />
                  <Text style={styles.emptyText}>No GPS spoofing alerts</Text>
                </View>
              }
            />
          </Animated.View>
        </>
      )}
    </View>
  );
}

function GpsSpoofingAlertCard({ alert, navigation, onAction }) {
  const statusColor = alert.status === 'flagged' ? '#EF4444' 
    : alert.status === 'under_review' ? '#F97316'
    : alert.status === 'approved' ? '#10B981'
    : '#64748B';
  
  const statusBg = alert.status === 'flagged' ? '#FEE2E2' 
    : alert.status === 'under_review' ? '#FFF7ED'
    : alert.status === 'approved' ? '#D1FAE5'
    : '#F1F5F9';

  const fraudColor = alert.fraudScore > 80 ? '#EF4444' : alert.fraudScore > 60 ? '#F97316' : '#FBBF24';

  const handleViewProof = () => {
    navigation.navigate('AdminGpsProof', { 
      workerId: alert.workerId, 
      workerName: alert.workerName 
    });
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handleViewProof} style={[gpsStyles.card]}>
      <View style={gpsStyles.top}>
        <View style={gpsStyles.workerInfo}>
          <View style={gpsStyles.avatar}>
            <Text style={gpsStyles.avatarText}>{alert.workerName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={gpsStyles.workerName}>{alert.workerName}</Text>
            <Text style={gpsStyles.workerId}>{alert.workerId}</Text>
          </View>
          <View style={[gpsStyles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[gpsStyles.statusText, { color: statusColor }]}>{alert.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={gpsStyles.timestamp}>{alert.timestamp}</Text>
      </View>

      <View style={gpsStyles.divider} />

      <View style={gpsStyles.middle}>
        <View style={gpsStyles.scoreCard}>
          <Text style={gpsStyles.scoreLabel}>Fraud Score</Text>
          <View style={gpsStyles.scoreRow}>
            <Text style={[gpsStyles.scoreValue, { color: fraudColor }]}>{alert.fraudScore}%</Text>
            <View style={[gpsStyles.scoreBar, { backgroundColor: fraudColor }]} />
          </View>
        </View>
        <View style={gpsStyles.scoreCard}>
          <Text style={gpsStyles.scoreLabel}>Recommendation</Text>
          <Text style={[gpsStyles.recommendText, { 
            color: alert.recommendation === 'REJECT' ? '#EF4444' : alert.recommendation === 'ACCEPT' ? '#10B981' : '#F97316'
          }]}>
            {alert.recommendation}
          </Text>
        </View>
      </View>

      <View style={gpsStyles.divider} />

      <View style={gpsStyles.bottom}>
        <View style={gpsStyles.locationRow}>
          <MapPin size={13} color="#64748B" strokeWidth={2} />
          <Text style={gpsStyles.location}>{alert.location}</Text>
          <Text style={gpsStyles.coords}>{alert.latitude.toFixed(2)}°, {alert.longitude.toFixed(2)}°</Text>
        </View>
      </View>

      <View style={gpsStyles.actions}>
        {alert.status !== 'blocked' && (
          <TouchableOpacity 
            style={[gpsStyles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
            onPress={() => onAction(alert, 'block')}
          >
            <Text style={[gpsStyles.actionText, { color: '#EF4444' }]}>Block</Text>
          </TouchableOpacity>
        )}
        {alert.status === 'under_review' && (
          <TouchableOpacity 
            style={[gpsStyles.actionBtn, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}
            onPress={() => onAction(alert, 'approve')}
          >
            <Text style={[gpsStyles.actionText, { color: '#10B981' }]}>Approve</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
  tabNav: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5E6E6' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#EF4444' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#EF4444', fontWeight: '700' },
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

const gpsStyles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  top: { padding: 14, gap: 8 },
  workerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  workerName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  workerId: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  timestamp: { fontSize: 10, color: '#94A3B8' },
  divider: { height: 1, backgroundColor: '#E2E8F0' },
  middle: { padding: 14, gap: 10 },
  scoreCard: { gap: 6 },
  scoreLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreValue: { fontSize: 18, fontWeight: '700' },
  scoreBar: { height: 4, flex: 1, borderRadius: 2 },
  recommendText: { fontSize: 16, fontWeight: '700' },
  bottom: { paddingHorizontal: 14, paddingBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  location: { fontSize: 12, fontWeight: '600', color: '#0F172A', flex: 1 },
  coords: { fontSize: 10, color: '#94A3B8' },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: '700' },
});