import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MainTopNavbar from '../../components/MainTopNavbar';
import DriverLogoutMenu from '../../components/DriverLogoutMenu';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';

export default function DriverRiskPipelineScreen({ navigation }: any) {
  const { logout, user } = useAuth();
  const { location, refreshLocation } = useLocation();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [zoneRisk, setZoneRisk] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const greetingOptions = ['Drive safe ^_^', 'Keep going ^_^', 'Stay sharp ^_^'];
  const minute = new Date().getMinutes();
  const greetingIndex = minute % greetingOptions.length;
  const greetingMessage = greetingOptions[greetingIndex];

  const FALLBACK_LAT = 12.9716;
  const FALLBACK_LNG = 77.5946;

  const derivedCoords = useMemo(() => {
    const candidateLat = profile?.lastKnownPosition?.lat ?? profile?.lastKnownPosition?.latitude;
    const candidateLng = profile?.lastKnownPosition?.lng ?? profile?.lastKnownPosition?.longitude;
    let lat = location.latitude != null && Number.isFinite(location.latitude) ? (location.latitude as number) : Number(candidateLat ?? 0);
    let lng = location.longitude != null && Number.isFinite(location.longitude) ? (location.longitude as number) : Number(candidateLng ?? 0);
    
    if (lat === 0 && lng === 0) {
      lat = FALLBACK_LAT;
      lng = FALLBACK_LNG;
    }

    return { lat, lng };
  }, [location.latitude, location.longitude, profile]);

  const derivedLat = derivedCoords.lat;
  const derivedLng = derivedCoords.lng;

  const loadDashboard = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const profileRes = await driverApi.getProfile(driverId);
      const driverProfile = profileRes?.driverProfile ?? null;
      setProfile(driverProfile);

      if (Number.isFinite(derivedLat) && Number.isFinite(derivedLng)) {
        await telemetryApi.sendGps({
          driverId,
          lat: derivedLat,
          lng: derivedLng,
          platform: 'mobile-app',
        });

        const zone = await fraudApi.getZoneRisk(derivedLat, derivedLng);
        setZoneRisk(zone ?? null);
      } else {
        setZoneRisk(null);
        setErrorMsg(location.error ?? 'Location unavailable. Enable GPS to continue.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [driverId, derivedLat, derivedLng, location.error]);

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
      <LoadingOverlay visible={loading} message="Running live risk pipeline..." />

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
            <View style={[styles.validBadge, location.isMock ? styles.mockBadge : (hasValidLocation ? styles.liveBadge : styles.mockBadge)]}>
              <View style={[styles.validDot, location.isMock ? styles.mockDot : (hasValidLocation ? styles.liveDot : styles.mockDot)]} />
              <Text style={[styles.validText, location.isMock ? styles.mockText : (hasValidLocation ? styles.liveText : styles.mockText)]} numberOfLines={1}>
                {location.loading ? 'Fetching…' : location.isMock ? 'Mock' : hasValidLocation ? 'Live GPS' : 'Unavailable'}
              </Text>
            </View>
          </View>

          <View style={styles.coordsGrid}>
            <View style={styles.coordBoxWide}>
              <Text style={styles.coordLabel}>Coordinates</Text>
              <Text style={styles.coordValueInline}>
                {derivedCoords && derivedCoords.lat != null && derivedCoords.lng != null
                  ? `Lat: ${(derivedCoords.lat as number).toFixed(4)} | Lon: ${(derivedCoords.lng as number).toFixed(4)}`
                  : 'Lat: — | Lon: —'}
              </Text>
            </View>
          </View>

          <View style={styles.locationActionsRow}>
            <Text style={styles.timestampText}>
              Last valid location timestamp: {location.fetchedAt
                ? location.fetchedAt.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })
                : '—'}
            </Text>
            <TouchableOpacity style={styles.locationRefreshBtn} onPress={() => void refreshLocation()}>
              <Ionicons name="refresh" size={14} color="#ffffff" />
              <Text style={styles.locationRefreshText}>Recheck</Text>
            </TouchableOpacity>
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
    backgroundColor: '#ffffff',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Theme.spacing.md,
  },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md, gap: 12 },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  locationTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7f7ed',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 1,
    maxWidth: '55%',
  },
  liveBadge: { backgroundColor: '#e7f7ed' },
  mockBadge: { backgroundColor: '#e5e7eb' },
  validDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', flexShrink: 0 },
  validLiveDot: { backgroundColor: '#16a34a' },
  mockDot: { backgroundColor: '#6b7280' },
  validText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#166534', letterSpacing: 0.2, flexShrink: 1 },
  liveText: { color: '#166534' },
  mockText: { color: '#4b5563' },
  coordsGrid: { flexDirection: 'row', gap: 12, marginBottom: Theme.spacing.md },
  coordBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Theme.spacing.md,
  },
  coordBoxWide: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Theme.spacing.md,
  },
  coordLabel: { fontSize: 11, textTransform: 'uppercase', color: '#6b7280', marginBottom: 6, fontWeight: '700', letterSpacing: 0.5 },
  coordValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  coordValueInline: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  locationActionsRow: {
    marginTop: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  locationRefreshText: { fontSize: 13, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  timestampText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', flex: 1 },
  infoChipWrap: { alignItems: 'center', marginTop: Theme.spacing.md, marginBottom: 0 },
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
