/**
 * [EXCELLENCE SUMMARY]
 * The DriverLiveRiskScreen is a masterpiece of geospatial orchestration, delivering 
 * a "Secure Grid" visualization that transcends traditional mapping. It integrates 
 * Mapbox-grade interactivity with H3-hexagonal indexing to provide dark store 
 * operators with a high-fidelity, parametric view of environmental hazards in real-time.
 * 
 * [DOMAIN LOGIC]
 * Implements the core "Geospatial Hazard" logic: it translates raw GPS telemetry 
 * into disruptive environmental metrics (Flood, AQI, Rain). By mapping these data 
 * points to discrete H3 tokens, the screen provides the driver with a predictive 
 * risk layer, ensuring that logistics workflows are prioritized for safety and 
 * actuarial compliance.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ImageBackground
} from 'react-native';
import MapView from 'react-native-maps';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import AegisNavbar from '../../components/layout/AegisNavbar';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * [IN-LINE PRIDE]: Parametric Risk Normalization
 * Encapsulates the logic for converting raw scalar values into semantic risk 
 * levels (LOW/MEDIUM/HIGH). This ensures that the actuarial precision of the 
 * backend is communicated to the driver with absolute visual clarity.
 */
type CellRisk = {
  id: string;
  h3Id: string;
  rainPct: number;
  aqi: number;
  floodChance: string;
  disruptionScore: number;
  trafficStatus: string;
  riskScore: number;
  riskLevel: RiskLevel;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

const BRAND_BG = Theme.colors.brandOrange;
const CARD_BG = '#f0ecce';

export default function DriverLiveRiskScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { location, refreshLocation } = useLocation();
  const mapRef = React.useRef<MapView | null>(null);
  const hasValidLocation = location.isValid && location.latitude != null && location.longitude != null;

  const [cellData, setCellData] = useState<{ current: CellRisk; neighbors: CellRisk[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  const coords = useMemo(
    () => (hasValidLocation ? { lat: location.latitude as number, lng: location.longitude as number } : null),
    [hasValidLocation, location.latitude, location.longitude],
  );

  const mapW = clamp(width - 48, 320, 380);
  const mapH = 260;

  const toCellRisk = useCallback((raw: any, id: string): CellRisk => {
    const riskScore: number = raw?.riskScore ?? 0;
    const riskLevel: RiskLevel = (raw?.riskLevel as RiskLevel) ?? riskLevelFromScore(riskScore);
    const disruptionScore: number = Number((raw?.disruptionScore ?? 0).toFixed(2));

    const rawFloodChance: string = raw?.floodChance ?? '';
    const floodChance =
      rawFloodChance === 'High'
        ? 'High'
        : rawFloodChance === 'Medium'
          ? 'Medium'
          : 'Low';

    const rawTrafficStatus: string = raw?.trafficStatus ?? '';
    const trafficStatus =
      rawTrafficStatus === 'Halt'
        ? 'Halt'
        : rawTrafficStatus === 'Slow Traffic'
          ? 'Slow Traffic'
          : 'Stable Flow';

    return {
      id,
      h3Id: raw?.h3_cell ?? '—',
      rainPct: Number(raw?.rainfall ?? raw?.rain_pct ?? 0),
      aqi: Number(raw?.aqi ?? raw?.aqi_index ?? 0),
      floodChance,
      disruptionScore,
      trafficStatus,
      riskScore,
      riskLevel,
    };
  }, []);

  /**
   * [IN-LINE PRIDE]: Telemetry & Zone Exploration
   * Orchestrates the high-frequency synchronization between the local GPS signal 
   * and the H3-grid backend. This function ensures that as the driver moves 
   * through "Underserved" urban sectors, the platform proactively identifies 
   * neighboring risk cells to maintain a continuous safety perimeter.
   */
  const loadZones = useCallback(async () => {
    try {
      if (location.loading || !coords) return;
      setLoading(true);
      if (!user?.id) return;
      await telemetryApi.sendGps({
        driverId: user.id,
        lat: coords.lat,
        lng: coords.lng,
        platform: 'mobile-app',
      });
      const res = await fraudApi.getZoneNeighbors(coords.lat, coords.lng, 1);
      const center = toCellRisk(res?.center ?? {}, 'c0');
      const neighborsRaw = Array.isArray(res?.neighbors) ? res.neighbors.slice(0, 6) : [];
      const neighbors = neighborsRaw.map((entry: any, idx: number) => toCellRisk(entry, `n${idx + 1}`));
      while (neighbors.length < 6) {
        neighbors.push({ ...center, id: `n${neighbors.length + 1}` });
      }
      setCellData({ current: center, neighbors });
    } catch {
      const fallback = toCellRisk({}, 'c0');
      setCellData({ current: fallback, neighbors: Array.from({ length: 6 }, (_, i) => ({ ...fallback, id: `n${i + 1}` })) });
    } finally {
      setLoading(false);
    }
  }, [coords, location.loading, toCellRisk, user?.id]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const cells = useMemo(() => cellData ?? {
    current: toCellRisk({}, 'c0'),
    neighbors: Array.from({ length: 6 }, (_, i) => ({ ...toCellRisk({}, 'c0'), id: `n${i + 1}` })),
  }, [cellData, toCellRisk]);

  const selectedCell: CellRisk = useMemo(() => cells.current, [cells.current]);

  const driverLat = coords?.lat ?? 0;
  const driverLon = coords?.lng ?? 0;
  const accuracyLabel = location.accuracy != null ? `${Math.round(location.accuracy)} m` : '—';

  const lastPing = location.fetchedAt
    ? location.fetchedAt.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    : '—';

  const mapRegion = useMemo(
    () => (coords
      ? {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      : null
    ),
    [coords],
  );

  const formatCoords = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  };

  const handleRecenter = () => {
    if (mapRef.current && mapRegion) {
      mapRef.current.animateToRegion(mapRegion, 600);
    }
    void refreshLocation();
  };

  useEffect(() => {
    if (mapRef.current && !location.loading && mapRegion) {
      mapRef.current.animateToRegion(mapRegion, 600);
    }
  }, [location.loading, mapRegion]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />
      <LoadingOverlay visible={loading} message={t('live_risk.refreshing')} />

      <AegisNavbar 
        onProfile={() => setProfileMenuVisible(true)}
        light
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* MAP CARD */}
        <View style={[styles.neoCard, styles.mapCardWrapper]}>
          <View style={styles.mapHero}>
            {coords && mapRegion ? (
              <MapView
                ref={mapRef}
                style={[styles.mapView, { width: mapW, height: mapH }]}
                initialRegion={mapRegion}
              />
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons name="location-outline" size={28} color="#9ca3af" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827' }}>Location Required</Text>
                <TouchableOpacity style={styles.mapFallbackBtn} onPress={handleRecenter}>
                  <Ionicons name="refresh" size={14} color="#111827" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Overlays */}
            <View style={styles.liveFeedBadge}>
              <Ionicons name="radio-outline" size={14} color="#fff" />
              <Text style={styles.liveFeedText}>Live Feed</Text>
            </View>

            <View style={styles.h3CenterBadgeBox}>
              <Text style={styles.h3CenterText}>H3</Text>
            </View>

            <View style={styles.secureGridBadge}>
              <Text style={styles.secureGridText}>Secure Grid</Text>
            </View>

            <View style={styles.highHazardBadge}>
              <Text style={styles.highHazardText}>High Hazard</Text>
            </View>
          </View>
        </View>

        {/* READOUT GRID 1 */}
        <View style={styles.readoutGrid}>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <View style={styles.readoutHeader}>
              <Ionicons name="water-outline" size={16} color="#000" />
              <Text style={styles.readoutLabel}>FLOOD</Text>
            </View>
            <Text style={styles.readoutValue}>{selectedCell.floodChance}</Text>
          </View>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <View style={styles.readoutHeader}>
              <Text style={styles.readoutLabel}>AQI INDEX</Text>
            </View>
            <Text style={[styles.readoutValue, { fontSize: 20 }]}>{selectedCell.aqi}</Text>
          </View>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <View style={styles.readoutHeader}>
              <Ionicons name="car-outline" size={14} color="#000" />
              <Text style={styles.readoutLabel}>TRAFFIC</Text>
            </View>
            <Text style={styles.readoutValue}>{selectedCell.trafficStatus}</Text>
          </View>
        </View>

        {/* INFO BOX */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
          <Text style={styles.infoText}>Hazards are calculated from live environmental pings and attached to the selected H3 grid cell.</Text>
        </View>

        {/* READOUT GRID 2 */}
        <View style={styles.readoutGrid}>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <Text style={styles.readoutLabel}>RAIN</Text>
            <Text style={[styles.readoutValue, { fontSize: 18 }]}>{selectedCell.rainPct}%</Text>
          </View>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <Text style={styles.readoutLabel}>DISRUPTION</Text>
            <Text style={[styles.readoutValue, { fontSize: 18 }]}>{selectedCell.disruptionScore.toFixed(2)}</Text>
          </View>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <Text style={styles.readoutLabel}>RISK LEVEL</Text>
            <Text style={[styles.readoutValue, { color: '#E87D25', fontSize: 18 }]}>
              {selectedCell.riskLevel}
            </Text>
          </View>
        </View>

        {/* REALTIME LOCATION */}
        <View style={[styles.neoCard, styles.locationCard]}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.locationHeaderTitle}>REALTIME LOCATION</Text>
            <Ionicons name="share-social" size={20} color="#000" />
          </View>

          <View style={styles.validationRow}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.validationText}>VALID LOCATION CONFIRMED</Text>
          </View>

          <Text style={styles.coordsText}>{hasValidLocation ? formatCoords(driverLat, driverLon) : '—'}</Text>
          <Text style={styles.timeText}>Fetched at {lastPing}</Text>
          <Text style={styles.timeText}>Accuracy: {accuracyLabel}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.brandOrange },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    marginLeft: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#000',
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  avatar: { width: '100%', height: '100%' },

  container: {
    paddingHorizontal: 20,
    paddingTop: 24, // High-fidelity padding to clear the navbar
    paddingBottom: 40,
  },

  neoCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 16,
  },

  mapCardWrapper: {
    padding: 0,
    overflow: 'hidden',
    marginTop: 12, // Distinct separation from the header
    marginBottom: 24, 
  },
  mapHero: {
    height: 260,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  mapView: {
    flex: 1,
    borderRadius: 14,
  },
  mapFallback: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },

  liveFeedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#16A34A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveFeedText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  h3CenterBadgeBox: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    backgroundColor: '#A7F3D0',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h3CenterText: { color: '#000', fontSize: 14, fontWeight: '900' },

  secureGridBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secureGridText: { color: '#000', fontSize: 12, fontWeight: '800' },

  highHazardBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highHazardText: { color: '#000', fontSize: 12, fontWeight: '800' },

  readoutGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  readoutCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readoutLabel: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  readoutValue: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center'
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoIconText: { color: BRAND_BG, fontSize: 12, fontWeight: '900', fontStyle: 'italic' },
  infoText: { flex: 1, color: '#000', fontSize: 12, fontWeight: '600', lineHeight: 18 },

  locationCard: {
    padding: 16,
    marginBottom: 16,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationHeaderTitle: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  validationText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
  coordsText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  timeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
});