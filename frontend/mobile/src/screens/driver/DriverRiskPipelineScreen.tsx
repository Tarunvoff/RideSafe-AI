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
import Svg, { Polygon } from 'react-native-svg';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';

type ZoneLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'HALT';

type HexRiskCell = {
  id: string;
  h3Id: string;
  rainPct: number;
  aqi: number;
  floodChance: string;
  disruptionScore: number;
  trafficStatus: string;
  riskScore: number;
  riskLevel: ZoneLevel;
};

function normalizeRiskLevel(rawLevel: unknown, score: number, trafficStatus: string): ZoneLevel {
  if (trafficStatus === 'Halt') return 'HALT';
  const level = String(rawLevel ?? '').toUpperCase();
  if (level === 'HALT' || level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') {
    return level;
  }
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function toHexCell(raw: any, id: string): HexRiskCell {
  const riskScore = Number(raw?.riskScore ?? Math.round(Number(raw?.Lf ?? raw?.lf_score ?? 0) * 100) ?? 0);
  const trafficStatus = raw?.trafficStatus === 'Halt'
    ? 'Halt'
    : raw?.trafficStatus === 'Slow Traffic'
      ? 'Slow Traffic'
      : 'Stable Flow';

  return {
    id,
    h3Id: String(raw?.h3_cell ?? '—'),
    rainPct: Number(raw?.rainfall ?? raw?.rain_pct ?? 0),
    aqi: Number(raw?.aqi ?? raw?.aqi_index ?? 0),
    floodChance: raw?.floodChance === 'High' ? 'High' : raw?.floodChance === 'Medium' ? 'Medium' : 'Low',
    disruptionScore: Number((raw?.disruptionScore ?? 0).toFixed?.(2) ?? 0),
    trafficStatus,
    riskScore,
    riskLevel: normalizeRiskLevel(raw?.riskLevel, riskScore, trafficStatus),
  };
}

function riskTone(level: ZoneLevel) {
  if (level === 'HALT') {
    return { fill: '#FEE2E2', stroke: '#DC2626', text: '#7F1D1D', badge: '#FCA5A5' };
  }
  if (level === 'HIGH') {
    return { fill: '#FFEDD5', stroke: '#EA580C', text: '#9A3412', badge: '#FDBA74' };
  }
  if (level === 'MEDIUM') {
    return { fill: '#FEF9C3', stroke: '#CA8A04', text: '#854D0E', badge: '#FDE047' };
  }
  return { fill: '#CCFBF1', stroke: '#0D9488', text: '#115E59', badge: '#5EEAD4' };
}

function HexCell({ cell, active, onPress }: { cell: HexRiskCell; active: boolean; onPress: () => void }) {
  const tone = riskTone(cell.riskLevel);
  return (
    <TouchableOpacity style={[styles.hexCellWrap, active ? styles.hexCellWrapActive : null]} onPress={onPress} activeOpacity={0.86}>
      <Svg width={88} height={78} viewBox="0 0 88 78">
        <Polygon
          points="44,2 80,20 80,58 44,76 8,58 8,20"
          fill={tone.fill}
          stroke={tone.stroke}
          strokeWidth={active ? 3 : 2}
        />
      </Svg>
      <View style={styles.hexCellContent}>
        <Text style={[styles.hexCellLevel, { color: tone.text }]}>{cell.riskLevel}</Text>
        <Text style={styles.hexCellScore}>{cell.riskScore}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DriverRiskPipelineScreen() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { location, refreshLocation } = useLocation();

  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [zoneRisk, setZoneRisk] = useState<any | null>(null);
  const [hexCells, setHexCells] = useState<HexRiskCell[]>([]);
  const [activeHexId, setActiveHexId] = useState('c0');
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

        const [zone, neighborsRes] = await Promise.all([
          fraudApi.getZoneRisk(lat, lng),
          fraudApi.getZoneNeighbors(lat, lng, 1).catch(() => null),
        ]);

        setZoneRisk(zone ?? null);

        const centerRaw = neighborsRes?.center ?? zone ?? {};
        const neighborsRaw = Array.isArray(neighborsRes?.neighbors) ? neighborsRes?.neighbors.slice(0, 6) : [];
        const centerCell = toHexCell(centerRaw, 'c0');
        const paddedNeighbors = [...neighborsRaw];
        while (paddedNeighbors.length < 6) {
          paddedNeighbors.push(centerRaw);
        }
        const mapped = [
          centerCell,
          ...paddedNeighbors.map((entry: any, idx: number) => toHexCell(entry, `n${idx + 1}`)),
        ];
        setHexCells(mapped);
        setActiveHexId('c0');
      } else {
        setZoneRisk(null);
        setHexCells([]);
      }
    } catch {
      setProfile(null);
      setZoneRisk(null);
      setHexCells([]);
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

  const activeHex = useMemo(() => {
    const fromState = hexCells.find((cell) => cell.id === activeHexId);
    if (fromState) return fromState;
    const center = hexCells.find((cell) => cell.id === 'c0');
    if (center) return center;
    return toHexCell(zoneRisk ?? {}, 'c0');
  }, [activeHexId, hexCells, zoneRisk]);

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

        <View style={styles.lightH3Card}>
          <View style={styles.lightH3Header}>
            <View>
              <Text style={styles.lightH3Eyebrow}>Live Grid Snapshot</Text>
              <Text style={styles.lightH3Title}>H3 Risk Cells</Text>
            </View>
            <View style={styles.lightH3StatusPill}>
              <Text style={styles.lightH3StatusText}>Light Mode</Text>
            </View>
          </View>

          <View style={styles.hexGridBoard}>
            <View style={styles.hexRowTop}>
              {(hexCells.find((c) => c.id === 'n1') ? [hexCells.find((c) => c.id === 'n1')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
              {(hexCells.find((c) => c.id === 'n2') ? [hexCells.find((c) => c.id === 'n2')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
            </View>

            <View style={styles.hexRowMiddle}>
              {(hexCells.find((c) => c.id === 'n3') ? [hexCells.find((c) => c.id === 'n3')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
              {(hexCells.find((c) => c.id === 'c0') ? [hexCells.find((c) => c.id === 'c0')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
              {(hexCells.find((c) => c.id === 'n4') ? [hexCells.find((c) => c.id === 'n4')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
            </View>

            <View style={styles.hexRowBottom}>
              {(hexCells.find((c) => c.id === 'n5') ? [hexCells.find((c) => c.id === 'n5')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
              {(hexCells.find((c) => c.id === 'n6') ? [hexCells.find((c) => c.id === 'n6')] : []).map((cell) =>
                cell ? <HexCell key={cell.id} cell={cell} active={cell.id === activeHexId} onPress={() => setActiveHexId(cell.id)} /> : null,
              )}
            </View>
          </View>

          <View style={styles.lightH3DetailRow}>
            <View style={styles.lightH3MetricChip}>
              <Text style={styles.lightH3MetricLabel}>Cell</Text>
              <Text style={styles.lightH3MetricValue} numberOfLines={1}>{activeHex.h3Id}</Text>
            </View>
            <View style={styles.lightH3MetricChip}>
              <Text style={styles.lightH3MetricLabel}>Traffic</Text>
              <Text style={styles.lightH3MetricValue}>{activeHex.trafficStatus}</Text>
            </View>
          </View>

          <View style={styles.lightH3DetailRow}>
            <View style={styles.lightH3MetricChip}>
              <Text style={styles.lightH3MetricLabel}>Flood</Text>
              <Text style={styles.lightH3MetricValue}>{activeHex.floodChance}</Text>
            </View>
            <View style={styles.lightH3MetricChip}>
              <Text style={styles.lightH3MetricLabel}>AQI</Text>
              <Text style={styles.lightH3MetricValue}>{activeHex.aqi}</Text>
            </View>
            <View style={styles.lightH3MetricChip}>
              <Text style={styles.lightH3MetricLabel}>Rain</Text>
              <Text style={styles.lightH3MetricValue}>{activeHex.rainPct}%</Text>
            </View>
          </View>
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

  lightH3Card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#111827',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 4,
  },
  lightH3Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  lightH3Eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  lightH3Title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  lightH3StatusPill: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lightH3StatusText: {
    fontSize: 10,
    color: '#075985',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  hexGridBoard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    marginBottom: 12,
  },
  hexRowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: -10,
  },
  hexRowMiddle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: -10,
  },
  hexRowBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  hexCellWrap: {
    width: 88,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  hexCellWrapActive: {
    transform: [{ scale: 1.05 }],
  },
  hexCellContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexCellLevel: {
    fontSize: 10,
    fontWeight: '900',
  },
  hexCellScore: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginTop: 1,
  },
  lightH3DetailRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  lightH3MetricChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lightH3MetricLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  lightH3MetricValue: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '900',
    marginTop: 3,
  },
});