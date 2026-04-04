import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import LoadingOverlay from '../../components/LoadingOverlay';
import MainTopNavbar from '../../components/MainTopNavbar';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';

export default function HomeScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const { location } = useLocation();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [zoneRisk, setZoneRisk] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const driverId = user?.id ?? null;
  const hasValidLocation = location.isValid && location.latitude != null && location.longitude != null;

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch (e) {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const loadHome = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const profileRes = await driverApi.getProfile(driverId);
      setProfile(profileRes?.driverProfile ?? null);
      if (hasValidLocation) {
        const lat = location.latitude as number;
        const lng = location.longitude as number;
        await telemetryApi.sendGps({
          driverId,
          lat,
          lng,
          platform: 'mobile-app',
        });
        const zone = await fraudApi.getZoneRisk(lat, lng);
        setZoneRisk(zone ?? null);
      } else {
        setZoneRisk(null);
      }
    } catch {
      setProfile(null);
      setZoneRisk(null);
    } finally {
      setLoading(false);
    }
  }, [driverId, hasValidLocation, location.latitude, location.longitude]);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const today = profile?.currentWeek?.dailyBreakdown?.[profile?.currentWeek?.dailyBreakdown?.length - 1];
  const todayPay = Number(today?.totalEarnings ?? 0);
  const todayTrips = Number(today?.completedDeliveries ?? 0);
  const rating = Number(profile?.identity?.rating ?? 0);
  const hoursWorked = Number(today?.hoursWorked ?? 0);

  const metricBlocks = useMemo(
    () => [
      { key: 'pay', label: 'Today Pay', value: `₹${todayPay.toLocaleString('en-IN')}`, hint: `Orders ${todayTrips}` },
      { key: 'rides', label: 'Trips Done', value: `${todayTrips}`, hint: `Week ${profile?.currentWeek?.totalCompletedDeliveries ?? 0}` },
      { key: 'score', label: 'Safety Score', value: rating ? rating.toFixed(1) : '—', hint: zoneRisk?.state ?? '—' },
      { key: 'hours', label: 'Hours Worked', value: `${hoursWorked} hrs`, hint: profile?.workSummary?.preferredWorkingHours ?? '—' },
    ],
    [todayPay, todayTrips, rating, hoursWorked, profile, zoneRisk],
  );

  const routeSteps = useMemo(() => {
    const history = profile?.orderHistory ?? [];
    const recent = history.slice(0, 4);
    return recent.map((order: any) => ({
      key: order.orderId,
      place: order.deliveryZone ?? order.pickupZone ?? 'Order',
      detail: order.deliveredAt ? `Delivered · ${new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In progress',
    }));
  }, [profile]);

  const safetyCard = useMemo(() => ({
    level: zoneRisk?.state === 'HALTED' ? 'Zone HALTED' : 'Risk stable',
    zone: profile?.identity?.primaryServiceZone ?? 'Zone',
    note: zoneRisk?.state === 'HALTED' ? 'Auto-claim trigger active' : 'No disruption detected',
    updated: 'Updated just now',
  }), [profile, zoneRisk]);

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
      key: 'policy',
      label: 'Policy',
      icon: 'shield-checkmark-outline' as const,
      bg: '#dcfce7',
      color: '#15803d',
      onPress: () => navigation.navigate('Policy'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
      <LoadingOverlay visible={loading} message="Loading dashboard intelligence..." />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={handleLogout}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroGreeting}>Hi {user?.driverName ?? 'Driver'} 👋</Text>
          <Text style={styles.heroTitle}>Night shift is live</Text>
          <Text style={styles.heroSubtitle}>{profile?.identity?.primaryDarkStore ?? 'Active zone'}</Text>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Ionicons name="time-outline" size={22} color={Theme.colors.primary} />
              <Text style={styles.heroChipText}>{profile?.identity?.employmentType ?? 'Shift active'}</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="people-outline" size={22} color={Theme.colors.primary} />
              <Text style={styles.heroChipText}>{profile?.identity?.provider ?? 'Platform'}</Text>
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
          {metricBlocks.map((item) => (
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
          {routeSteps.length ? routeSteps.map((step: any, index: number) => (
            <View key={step.key} style={styles.routeRow}>
              <View style={styles.routeBulletColumn}>
                <View style={styles.routeBullet} />
                {index !== routeSteps.length - 1 && <View style={styles.routeLine} />}
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routePlace}>{step.place}</Text>
                <Text style={styles.routeDetail}>{step.detail}</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.routeDetail}>No recent orders yet.</Text>
          )}
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
            <Text style={styles.safetyLabel}>{safetyCard.level}</Text>
          </View>
          <Text style={styles.safetyZone}>{safetyCard.zone}</Text>
          <Text style={styles.safetyNote}>{safetyCard.note}</Text>
          <Text style={styles.safetyTime}>{safetyCard.updated}</Text>
          <TouchableOpacity
            style={styles.safetyButton}
            onPress={() => navigation.navigate('DriverLiveRisk')}
          >
            <Text style={styles.safetyButtonText}>Watch Live Risk</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
