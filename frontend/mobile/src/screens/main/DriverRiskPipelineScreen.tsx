import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverBottomNavbar from '../../components/DriverBottomNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import { useAuth } from '../../context/AuthContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';
import { getDeviceLocation } from '../../utils/location';

const DEFAULT_COORDS = { lat: 12.9716, lng: 77.5946 };

export default function DriverRiskPipelineScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [zoneRisk, setZoneRisk] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);

  const driverId = user?.id ?? user?.email ?? null;

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch (e) {
      setProfileMenuVisible(false);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const greetingOptions = ['Drive safe ^_^', 'Keep going ^_^', 'Stay sharp ^_^'];
  const minute = new Date().getMinutes();
  const greetingIndex = minute % greetingOptions.length;
  const greetingMessage = greetingOptions[greetingIndex];

  const derivedCoords = useMemo(() => {
    const candidateLat = deviceCoords?.lat ?? profile?.lastKnownPosition?.lat ?? profile?.lastKnownPosition?.latitude;
    const candidateLng = deviceCoords?.lng ?? profile?.lastKnownPosition?.lng ?? profile?.lastKnownPosition?.longitude;
    const lat = Number(candidateLat ?? DEFAULT_COORDS.lat);
    const lng = Number(candidateLng ?? DEFAULT_COORDS.lng);
    return { lat, lng };
  }, [deviceCoords, profile]);

  const loadDashboard = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const profileRes = await driverApi.getProfile(driverId);
      const driverProfile = profileRes?.driverProfile ?? null;
      setProfile(driverProfile);

      const device = await getDeviceLocation();
      if (device) {
        setDeviceCoords(device);
        await telemetryApi.sendGps({
          driverId,
          lat: device.lat,
          lng: device.lng,
          platform: 'mobile-app',
        });
      }

      const coords = device ?? derivedCoords;

      if (Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        const zone = await fraudApi.getZoneRisk(coords.lat, coords.lng);
        setZoneRisk(zone ?? null);
      } else {
        setZoneRisk(null);
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [driverId, derivedCoords]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const lfScore = Number(zoneRisk?.Lf ?? zoneRisk?.lf_score ?? 0.5);
  const zoneState = zoneRisk?.zone_state ?? zoneRisk?.state ?? 'UNKNOWN';
  const riskScore = Math.round(lfScore * 100);
  const riskLabel = zoneState === 'HALTED' ? 'HIGH' : lfScore >= 0.6 ? 'MEDIUM' : 'LOW';
  const earnings = profile?.currentWeek?.weeklyEarningsTotal ?? profile?.workSummary?.averageWeeklyEarnings ?? 0;
  const h3Cell = zoneRisk?.h3_cell ?? profile?.lastKnownPosition?.h3_cell ?? '—';

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <View style={styles.container}>
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingTop}>{greetingMessage}</Text>
          <TouchableOpacity style={styles.refreshBtnTop} activeOpacity={0.9} onPress={() => void loadDashboard()}>
            <Ionicons name="refresh" size={16} color="#ffffff" />
            <Text style={styles.refreshTextTop}>{loading ? 'Loading...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View>
              <Text style={styles.cardOverline}>Current Risk Level</Text>
              <View style={styles.riskRow}>
                <Text style={styles.riskLabel}>{riskLabel}</Text>
                <View style={styles.liveDot} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardOverline}>Risk Score</Text>
              <Text style={styles.scoreText}>{riskScore}/100</Text>
            </View>
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>H3 Cell ID</Text>
            <Text style={styles.metaValue}>{h3Cell}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last Ping Time</Text>
            <Text style={styles.metaValue}>just now</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Weekly Earnings</Text>
            <Text style={styles.metaValue}>₹{Number(earnings || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationTitleRow}>
              <Ionicons name="location-outline" size={18} color="#111827" />
              <Text style={styles.locationTitle}>Location Intelligence</Text>
            </View>
            <View style={styles.validBadge}>
              <View style={styles.validDot} />
              <Text style={styles.validText}>Valid location confirmed</Text>
            </View>
          </View>

          <View style={styles.coordsGrid}>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Latitude</Text>
              <Text style={styles.coordValue}>{derivedCoords.lat.toFixed(4)}°</Text>
            </View>
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>Longitude</Text>
              <Text style={styles.coordValue}>{derivedCoords.lng.toFixed(4)}°</Text>
            </View>
          </View>

          <Text style={styles.timestampText}>Last valid location timestamp: 10:42:15 AM</Text>
        </View>

        <View style={styles.envCard}>
          <Text style={styles.envTitle}>Environmental Risk</Text>

          <View style={styles.envGrid}>
            <View style={styles.envCell}>
              <Text style={styles.envLabel}>Rain</Text>
              <Text style={styles.envValue}>{zoneRisk?.rainfall ?? 0}%</Text>
            </View>
            <View style={styles.envCell}>
              <Text style={styles.envLabel}>AQI</Text>
              <Text style={styles.envValue}>{zoneRisk?.aqi ?? zoneRisk?.aqi_index ?? '—'}</Text>
            </View>
            <View style={styles.envCell}>
              <Text style={styles.envLabel}>Disruption</Text>
              <Text style={styles.envValue}>{lfScore.toFixed(2)}</Text>
            </View>
            <View style={styles.envCell}>
              <Text style={styles.envLabel}>Flood</Text>
              <Text style={styles.envValue}>{zoneState === 'HALTED' ? 'High' : 'Low'}</Text>
            </View>
            <View style={styles.envCellWide}>
              <Text style={styles.envLabel}>Traffic Status</Text>
              <Text style={styles.envValue}>{zoneRisk?.traffic ?? 'Stable Flow'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoChipWrap}>
          <View style={styles.infoChip}>
            <Ionicons name="checkmark-circle" size={14} color="#111827" />
            <Text style={styles.infoChipText}>
              {errorMsg ? errorMsg : zoneState === 'HALTED' ? 'Zone HALTED: trigger active' : 'No disruption detected'}
            </Text>
          </View>
        </View>
      </View>

      <DriverBottomNavbar navigation={navigation} activeKey="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: {
    flex: 1,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: 96,
  },
  greetingWrap: {
    marginBottom: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTop: {
    fontSize: 21,
    color: '#111827',
    fontWeight: '800',
  },
  refreshBtnTop: {
    height: 36,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  refreshTextTop: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#eceff3',
    marginBottom: Theme.spacing.sm,
  },
  statusTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Theme.spacing.sm },
  cardOverline: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#6b7280',
    marginBottom: 4,
  },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riskLabel: { fontSize: 26, fontWeight: '900', color: '#111827' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  scoreText: { fontSize: 26, fontWeight: '900', color: '#111827' },
  statusDivider: { height: 1, backgroundColor: '#eceff3', marginBottom: Theme.spacing.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  metaLabel: { fontSize: 12, color: '#6b7280' },
  metaValue: { fontSize: 12, color: '#111827', fontWeight: '700' },
  locationCard: {
    backgroundColor: '#f1f3f5',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Theme.spacing.sm,
  },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7f7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  validDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' },
  validText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#166534' },
  coordsGrid: { flexDirection: 'row', gap: 10 },
  coordBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: Theme.spacing.sm,
  },
  coordLabel: { fontSize: 10, textTransform: 'uppercase', color: '#6b7280', marginBottom: 3 },
  coordValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  timestampText: { marginTop: Theme.spacing.sm, fontSize: 10, color: '#6b7280', fontStyle: 'italic' },
  envCard: {
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#eceff3',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    minHeight: 220,
    marginBottom: Theme.spacing.md,
  },
  envTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: Theme.spacing.sm,
  },
  envGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Theme.spacing.md + 2,
    marginTop: Theme.spacing.xs,
  },
  envCell: {
    width: '31%',
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.sm,
  },
  envCellWide: {
    width: '100%',
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.sm,
  },
  envLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  envValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  infoChipWrap: { alignItems: 'center', marginTop: Theme.spacing.sm, marginBottom: Theme.spacing.sm },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  infoChipText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  // Bottom nav moved to reusable DriverBottomNavbar
});
