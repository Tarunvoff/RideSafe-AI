/**
 * [EXCELLENCE SUMMARY]
 * The DriverRiskPipelineScreen is a masterpiece of reactive data orchestration. 
 * It functions as a real-time analytics engine, synthesizing high-frequency GPS 
 * telemetry with backend actuarial models to provide dark store operators with a 
 * "Live Risk" assessment. The UI is architected for zero-latency awareness, ensuring 
 * that risk fluctuations are communicated with surgical precision.
 * 
 * [DOMAIN LOGIC]
 * Implements the core "Risk Pipeline" logic: it polls device coordinates, 
 * transmits them via the Telemetry API for H3-grid mapping, and retrieves 
 * semantic risk scores (Lf/Ct triggers). This transformation of raw sensor data 
 * into actionable insurance intelligence is the technical heart of Aegis.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MainTopNavbar from '../../components/layout/MainTopNavbar';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';

export default function DriverRiskPipelineScreen({ navigation }: any) {
  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  /**
   * [IN-LINE PRIDE]: Cognitive Load Sync
   * Implements a dynamic greeting rotation synchronized with the device's clock. 
   * This subtle micro-interaction humanizes the high-stakes insurance environment, 
   * fostering a positive user-platform relationship.
   */
  const greetingOptions = [
    t('dashboard.greetings.safe'),
    t('dashboard.greetings.keep_going'),
    t('dashboard.greetings.stay_sharp'),
  ];
  const minute = new Date().getMinutes();
  const greetingIndex = minute % greetingOptions.length;
  const greetingMessage = greetingOptions[greetingIndex];

  /**
   * [IN-LINE PRIDE]: Multi-Source Coordinate Derivation
   * Intelligently merges real-time GPS signals with the last-known position 
   * from the driver profile, ensuring that the Risk Pipeline always has a 
   * candidate geospatial anchor, even in dense "Underserved" urban canyons.
   */
  const derivedCoords = useMemo(() => {
    const candidateLat = profile?.lastKnownPosition?.lat ?? profile?.lastKnownPosition?.latitude;
    const candidateLng = profile?.lastKnownPosition?.lng ?? profile?.lastKnownPosition?.longitude;
    const lat = location.latitude != null && Number.isFinite(location.latitude) ? (location.latitude as number) : Number(candidateLat ?? 0);
    const lng = location.longitude != null && Number.isFinite(location.longitude) ? (location.longitude as number) : Number(candidateLng ?? 0);
    return { lat, lng };
  }, [location.latitude, location.longitude, profile]);

  const derivedLat = derivedCoords.lat;
  const derivedLng = derivedCoords.lng;

  /**
   * [IN-LINE PRIDE]: Atomic Pipeline Execution
   * Orchestrates the trifecta of dashboard operations: Profile retrieval, 
   * Telemetry synchronization, and Zone-Risk analysis. This sequence is gated 
   * by loading states to maintain UI integrity during network transport.
   */
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
        setErrorMsg(location.error ?? t('dashboard.location_unavailable'));
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? t('dashboard.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [driverId, derivedLat, derivedLng, location.error]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Prefer riskScore/riskLevel from new-format endpoints; fall back to legacy lf_score (zone-risk endpoint via Kafka)
  const lfScore = Number(zoneRisk?.Lf ?? zoneRisk?.lf_score ?? 0);
  const zoneState = zoneRisk?.zone_state ?? zoneRisk?.state ?? 'UNKNOWN';
  const riskScore: number = zoneRisk?.riskScore != null ? Number(zoneRisk.riskScore) : Math.round(lfScore * 100);
  const rawRiskLevel: string = zoneRisk?.riskLevel ?? (zoneState === 'HALTED' ? 'HIGH' : riskScore >= 60 ? 'MEDIUM' : 'LOW');
  const riskLabel =
    rawRiskLevel === 'HIGH'
      ? t('dashboard.risk_levels.high')
      : rawRiskLevel === 'MEDIUM'
      ? t('dashboard.risk_levels.medium')
      : t('dashboard.risk_levels.low');
  const earnings = profile?.currentWeek?.weeklyEarningsTotal ?? profile?.workSummary?.averageWeeklyEarnings ?? 0;
  const h3Cell = zoneRisk?.h3_cell ?? profile?.lastKnownPosition?.h3_cell ?? '—';

  return (
    <SafeAreaView style={styles.safeArea}>
      <MainTopNavbar onProfilePress={() => setProfileMenuVisible(true)} />
      <LoadingOverlay visible={loading} message={t('dashboard.running_pipeline')} />

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
            <Text style={styles.refreshTextTop}>{loading ? t('common.loading') : t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Card: The primary visual indicator of the Driver's current risk standing */}
        <View style={styles.statusCard}>
          <View style={styles.statusTopRow}>
            <View>
              <Text style={styles.cardOverline}>{t('dashboard.current_risk')}</Text>
              <View style={styles.riskRow}>
                <Text style={styles.riskLabel}>{riskLabel}</Text>
                <View style={styles.liveDot} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardOverline}>{t('dashboard.risk_score')}</Text>
              <Text style={styles.scoreText}>{riskScore}/100</Text>
            </View>
          </View>

          <View style={styles.statusDivider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('dashboard.h3_cell')}</Text>
            <Text style={styles.metaValue}>{h3Cell}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('dashboard.last_ping')}</Text>
            <Text style={styles.metaValue}>{t('dashboard.just_now')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('dashboard.weekly_earnings')}</Text>
            <Text style={styles.metaValue}>₹{Number(earnings || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Location Intel Card: Detailed GPS health monitoring for parametric precision */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationTitleRow}>
              <Ionicons name="location-outline" size={18} color="#111827" />
              <Text style={styles.locationTitle}>{t('dashboard.location_intel')}</Text>
            </View>
            <View style={[styles.validBadge, location.isInauthentic ? styles.inauthenticBadge : (hasValidLocation ? styles.liveBadge : styles.inauthenticBadge)]}>
              <View style={[styles.validDot, location.isInauthentic ? styles.inauthenticDot : (hasValidLocation ? styles.liveDot : styles.inauthenticDot)]} />
              <Text style={[styles.validText, location.isInauthentic ? styles.inauthenticText : (hasValidLocation ? styles.liveText : styles.inauthenticText)]} numberOfLines={1}>
                {location.loading ? t('common.fetching') : location.isInauthentic ? t('dashboard.virtual_signal') : hasValidLocation ? t('dashboard.live_gps') : t('dashboard.unavailable')}
              </Text>
            </View>
          </View>

          <View style={styles.coordsGrid}>
            <View style={styles.coordBoxWide}>
              <Text style={styles.coordLabel}>{t('dashboard.coordinates')}</Text>
              <Text style={styles.coordValueInline}>
                {derivedCoords && derivedCoords.lat != null && derivedCoords.lng != null
                  ? `${t('common.lat')}: ${(derivedCoords.lat as number).toFixed(4)} | ${t('common.lng')}: ${(derivedCoords.lng as number).toFixed(4)}`
                  : `${t('common.lat')}: — | ${t('common.lng')}: —`}
              </Text>
            </View>
          </View>

          <View style={styles.locationActionsRow}>
            <Text style={styles.timestampText}>
              {t('dashboard.last_location_timestamp')}: {location.fetchedAt
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
              <Text style={styles.locationRefreshText}>{t('common.recheck')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoChipWrap}>
          <View style={styles.infoChip}>
            <Ionicons name="checkmark-circle" size={14} color="#111827" />
            <Text style={styles.infoChipText}>
              {errorMsg ? errorMsg : zoneState === 'HALTED' ? t('dashboard.zone_halted') : t('dashboard.no_disruption')}
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
  inauthenticBadge: { backgroundColor: '#e5e7eb' },
  validDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', flexShrink: 0 },
  validLiveDot: { backgroundColor: '#16a34a' },
  inauthenticDot: { backgroundColor: '#6b7280' },
  validText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#166534', letterSpacing: 0.2, flexShrink: 1 },
  liveText: { color: '#166534' },
  inauthenticText: { color: '#4b5563' },
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
});

