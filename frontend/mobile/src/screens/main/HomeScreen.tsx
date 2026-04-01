import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

const SHIFT_SUMMARY = {
  store: 'Koramangala Dark Store',
  supervisor: 'Lead Anjali',
  shift: '7 PM – 3 AM',
  slotsLeft: '2 drops left',
};

const METRIC_BLOCKS = [
  { key: 'pay', label: 'Today Pay', value: '₹1,280', hint: 'Bonus +₹220' },
  { key: 'rides', label: 'Trips Done', value: '18', hint: 'Goal 20' },
  { key: 'score', label: 'Safety Score', value: '4.9', hint: 'Keep steady' },
  { key: 'break', label: 'Break Time', value: '12 min', hint: 'Last 1h ago' },
];

const ROUTE_STEPS = [
  { key: 'pickup', place: 'Store Pickup', detail: 'Packed · 6:55 PM' },
  { key: 'drop1', place: 'HSR BLK 3', detail: 'Drop 1 · 7:25 PM' },
  { key: 'drop2', place: 'HSR 27th Main', detail: 'Drop 2 · 8:05 PM' },
  { key: 'pending', place: 'BTM Signal', detail: '2 drops waiting' },
];

const SAFETY_CARD = {
  level: 'Low rain alert',
  zone: 'HSR Layout · Sector 7',
  note: 'Slow near 27th Main signal',
  updated: 'Updated 2 min ago',
};

export default function HomeScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch (e) {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const quickActions = [
    {
      key: 'pulse',
      label: 'Work Pulse',
      icon: 'stats-chart-outline' as const,
      bg: '#dffbe8',
      color: Theme.colors.primary,
      onPress: () => navigation.navigate('DriverActivity'),
    },
    {
      key: 'plans',
      label: 'Plans',
      icon: 'card-outline' as const,
      bg: '#e0f2fe',
      color: '#0f172a',
      onPress: () => navigation.navigate('DriverPlans'),
    },
    {
      key: 'lead',
      label: 'Call Lead',
      icon: 'call-outline' as const,
      bg: '#fee2e2',
      color: '#b91c1c',
      onPress: () => Alert.alert('Lead Anjali', 'Calling your lead...'),
    },
    {
      key: 'wallet',
      label: 'Wallet',
      icon: 'wallet-outline' as const,
      bg: '#fef9c3',
      color: '#92400e',
      onPress: () => navigation.navigate('Wallet'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />

      <Modal
        visible={profileMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={styles.profileMenuBox}>
            <View style={styles.profileMenuHeader}>
              <Text style={styles.profileMenuEmail} numberOfLines={1}>
                {user?.email || 'Driver'}
              </Text>
            </View>
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.profileMenuTextLogout}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroGreeting}>Hi {user?.driverName ?? 'Driver'} 👋</Text>
          <Text style={styles.heroTitle}>Night shift is live</Text>
          <Text style={styles.heroSubtitle}>{SHIFT_SUMMARY.store}</Text>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Ionicons name="time-outline" size={22} color={Theme.colors.primary} />
              <Text style={styles.heroChipText}>{SHIFT_SUMMARY.shift}</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="people-outline" size={22} color={Theme.colors.primary} />
              <Text style={styles.heroChipText}>{SHIFT_SUMMARY.supervisor}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.heroButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('DriverActivity')}
          >
            <Text style={styles.heroButtonText}>See today plan</Text>
            <Ionicons name="arrow-forward" size={22} color="#052e16" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricSection}>
          {METRIC_BLOCKS.map((item) => (
            <View key={item.key} style={styles.metricCard}>
              <Text style={styles.metricValue}>{item.value}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={styles.metricHint}>{item.hint}</Text>
            </View>
          ))}
        </View>

        <View style={styles.quickCard}>
          <Text style={styles.sectionTitle}>Big buttons</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickButton}
                onPress={action.onPress}
                activeOpacity={0.9}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.routeCard}>
          <Text style={styles.sectionTitle}>Today route</Text>
          {ROUTE_STEPS.map((step, index) => (
            <View key={step.key} style={styles.routeRow}>
              <View style={styles.routeBulletColumn}>
                <View style={styles.routeBullet} />
                {index !== ROUTE_STEPS.length - 1 && <View style={styles.routeLine} />}
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routePlace}>{step.place}</Text>
                <Text style={styles.routeDetail}>{step.detail}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.routeButton}
            onPress={() => navigation.navigate('DriverLiveRisk')}
          >
            <Text style={styles.routeButtonText}>Open live map</Text>
            <Ionicons name="navigate-outline" size={20} color={Theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={26} color={Theme.colors.primary} />
            <Text style={styles.safetyLabel}>{SAFETY_CARD.level}</Text>
          </View>
          <Text style={styles.safetyZone}>{SAFETY_CARD.zone}</Text>
          <Text style={styles.safetyNote}>{SAFETY_CARD.note}</Text>
          <Text style={styles.safetyTime}>{SAFETY_CARD.updated}</Text>
          <TouchableOpacity
            style={styles.safetyButton}
            onPress={() => navigation.navigate('DriverLiveRisk')}
          >
            <Text style={styles.safetyButtonText}>Watch Live Risk</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DriverBottomNavbar navigation={navigation} activeKey="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7f5' },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 160,
    gap: Theme.spacing.lg,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#dbe5d7',
    gap: 12,
  },
  heroGreeting: { fontSize: 20, fontWeight: '700', color: '#14532d' },
  heroTitle: { fontSize: 34, fontWeight: '900', color: '#052e16' },
  heroSubtitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  heroChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfdf3',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroChipText: { fontSize: 16, fontWeight: '700', color: '#064e3b' },
  heroButton: {
    marginTop: 6,
    backgroundColor: '#bbf7d0',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroButtonText: { fontSize: 20, fontWeight: '900', color: '#052e16' },

  metricSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexBasis: '47%',
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  metricValue: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  metricLabel: { fontSize: 16, fontWeight: '700', color: '#475569' },
  metricHint: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  quickCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickButton: {
    flexBasis: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: Theme.borderRadius.xl,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  quickIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 18, fontWeight: '900', color: '#111827' },

  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Theme.spacing.lg,
    gap: 16,
  },
  routeRow: { flexDirection: 'row', gap: 16 },
  routeBulletColumn: { alignItems: 'center' },
  routeBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeLine: { width: 3, flex: 1, backgroundColor: '#dbeafe', marginTop: 2 },
  routeInfo: { flex: 1, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  routePlace: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  routeDetail: { fontSize: 16, color: '#475569', fontWeight: '600', marginTop: 2 },
  routeButton: {
    marginTop: 8,
    backgroundColor: '#ecfdf3',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeButtonText: { fontSize: 18, fontWeight: '900', color: '#065f46' },

  safetyCard: {
    backgroundColor: '#052e16',
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    gap: 10,
  },
  safetyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  safetyLabel: { fontSize: 18, fontWeight: '800', color: '#bbf7d0' },
  safetyZone: { fontSize: 26, fontWeight: '900', color: '#f0fdf4' },
  safetyNote: { fontSize: 18, color: '#dcfce7', fontWeight: '600' },
  safetyTime: { fontSize: 14, color: '#a7f3d0', fontStyle: 'italic' },
  safetyButton: {
    marginTop: 8,
    backgroundColor: '#bbf7d0',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  safetyButtonText: { fontSize: 18, fontWeight: '900', color: '#052e16' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: Theme.spacing.lg,
    paddingTop: 60,
  },
  profileMenuBox: {
    backgroundColor: '#fff',
    borderRadius: Theme.borderRadius.lg,
    padding: 8,
    width: 200,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  profileMenuHeader: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 8,
  },
  profileMenuEmail: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    gap: 12,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#fef2f2',
  },
  profileMenuTextLogout: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
});
