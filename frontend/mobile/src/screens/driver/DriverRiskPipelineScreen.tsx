import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import AegisNavbar from '../../components/layout/AegisNavbar';
import { Theme } from '../../theme';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';

export default function DriverRiskPipelineScreen() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { location, refreshLocation } = useLocation();

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
    } catch {
      setProfileMenuVisible(false);
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  const loadHome = useCallback(async () => {
    if (!driverId) return;

    setLoading(true);
    try {
      const profileRes = await driverApi.getProfile(driverId);
      const driverProfile = profileRes?.driverProfile ?? null;
      setProfile(driverProfile);

      const candidateLat = location.latitude ?? driverProfile?.lastKnownPosition?.lat ?? driverProfile?.lastKnownPosition?.latitude;
      const candidateLng = location.longitude ?? driverProfile?.lastKnownPosition?.lng ?? driverProfile?.lastKnownPosition?.longitude;
      const lat = Number(candidateLat);
      const lng = Number(candidateLng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
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
  }, [driverId, location.latitude, location.longitude]);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  const weeklyEarnings = profile?.currentWeek?.weeklyEarningsTotal
    ?? profile?.currentWeek?.totalEarnings
    ?? profile?.workSummary?.averageWeeklyEarnings
    ?? 0;

  const riskScore = useMemo(() => {
    if (zoneRisk?.riskScore != null) return Number(zoneRisk.riskScore);
    const lf = Number(zoneRisk?.Lf ?? zoneRisk?.lf_score ?? 0);
    return Math.round(lf * 100);
  }, [zoneRisk]);

  const riskLevel = useMemo(() => {
    const level = String(zoneRisk?.riskLevel ?? '').toUpperCase();
    if (level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') return level;
    if (riskScore >= 70) return 'HIGH';
    if (riskScore >= 40) return 'MEDIUM';
    return 'LOW';
  }, [zoneRisk?.riskLevel, riskScore]);

  const riskColor = riskLevel === 'HIGH' ? '#B91C1C' : riskLevel === 'MEDIUM' ? '#D97706' : '#008A45';

  const cellId = zoneRisk?.h3_cell ?? profile?.lastKnownPosition?.h3_cell ?? '—';
  const latText = typeof location.latitude === 'number' ? location.latitude.toFixed(4) : '—';
  const lonText = typeof location.longitude === 'number' ? location.longitude.toFixed(4) : '—';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.brandOrange} />
      <LoadingOverlay visible={loading} message={t('dashboard.loading_intel')} />

      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email ?? null}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => {
          void handleLogout();
        }}
      />

      <AegisNavbar 
        onProfile={() => setProfileMenuVisible(true)}
        light
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heroTitle}>Stay sharp ^_^</Text>

        <View style={styles.mainCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.labelSmall}>CURRENT RISK LEVEL</Text>
              <View style={styles.riskLevelRow}>
                <Text style={[styles.riskLevelValue, { color: riskColor }]}>{riskLevel}</Text>
                <View style={[styles.statusDot, { backgroundColor: riskColor }]} />
              </View>
            </View>
            <View style={styles.alignRight}>
              <Text style={styles.labelSmall}>RISK SCORE</Text>
              <Text style={styles.riskScoreValue}>{riskScore}/100</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>H3 Cell ID</Text>
            <Text style={styles.dataValue}>{cellId}</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Last Ping Time</Text>
            <Text style={styles.dataValue}>just now</Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Weekly Earnings</Text>
            <Text style={styles.dataValueBold}>₹{Number(weeklyEarnings).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <View style={[styles.cardHeaderRow, { marginBottom: 16 }]}>
            <View style={styles.rowAlign}>
              <Ionicons name="location-sharp" size={20} color="black" />
              <Text style={styles.locationTitle}>Location Intelligence</Text>
            </View>
            <Text style={styles.gpsStatus}>{hasValidLocation ? 'LIVE GPS' : 'NO GPS'}</Text>
          </View>

          <View style={styles.coordinatesBox}>
            <Text style={styles.labelSmall}>COORDINATES</Text>
            <Text style={styles.coordinatesText}>Lat: {latText} | Lon: {lonText}</Text>
          </View>

          <TouchableOpacity
            style={styles.recheckButton}
            activeOpacity={0.8}
            onPress={() => {
              void refreshLocation();
              void loadHome();
            }}
          >
            <Text style={styles.recheckButtonText}>Recheck</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.brandOrange,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  headerBrand: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#000',
    marginVertical: 24,
    letterSpacing: -1,
  },
  mainCard: {
    backgroundColor: '#F7F1DF',
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#000',
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  riskLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskLevelValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  riskScoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#000',
    opacity: 0.1,
    marginVertical: 20,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    opacity: 0.7,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    flex: 1,
    textAlign: 'right',
  },
  dataValueBold: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  gpsStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#008A45',
  },
  coordinatesBox: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: 20,
  },
  coordinatesText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'monospace',
  },
  recheckButton: {
    backgroundColor: '#008A45',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#000',
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
  },
  recheckButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
});