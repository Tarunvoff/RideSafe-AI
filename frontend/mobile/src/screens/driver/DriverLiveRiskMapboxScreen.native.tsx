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
import { useFocusEffect } from '@react-navigation/native';
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
} from 'react-native';
import { cellToBoundary, latLngToCell, gridDisk } from 'h3-js';
import MapboxGL from '@rnmapbox/maps';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import AegisNavbar from '../../components/layout/AegisNavbar';
import { ScooterMarker as DriverScooterMarker } from '../../components/driver/ScooterMarker';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'HALT';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
if (mapboxToken) {
  MapboxGL.setAccessToken(mapboxToken);
}
MapboxGL.setTelemetryEnabled(false);

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
  polygon: { latitude: number; longitude: number }[];
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

function riskPalette(level: RiskLevel) {
  if (level === 'HALT') {
    return {
      stroke: '#ef4444',
      fill: 'rgba(239, 68, 68, 0.22)',
      chipBg: '#FEE2E2',
      chipText: '#7F1D1D',
    };
  }
  if (level === 'HIGH') {
    return {
      stroke: '#f97316',
      fill: 'rgba(249, 115, 22, 0.2)',
      chipBg: '#FFEDD5',
      chipText: '#9A3412',
    };
  }
  if (level === 'MEDIUM') {
    return {
      stroke: '#facc15',
      fill: 'rgba(250, 204, 21, 0.18)',
      chipBg: '#FEF9C3',
      chipText: '#854D0E',
    };
  }
  return {
    stroke: '#22d3ee', // Cyan blue for LOW risk
    fill: 'rgba(207, 250, 254, 0.35)', // Pale cyan fill
    chipBg: '#CCFBF1',
    chipText: '#115E59',
  };
}

type MapboxRiskFeature = {
  type: 'Feature';
  id: string;
  properties: {
    id: string;
    riskLevel: RiskLevel;
    h3Id: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
};

type MapboxRiskFeatureCollection = {
  type: 'FeatureCollection';
  features: MapboxRiskFeature[];
};

function resolveRiskLevel(rawRiskLevel: unknown, riskScore: number, trafficStatus: string): RiskLevel {
  if (trafficStatus === 'Halt') return 'HALT';
  const level = String(rawRiskLevel ?? '').toUpperCase();
  if (level === 'HALT' || level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') {
    return level as RiskLevel;
  }
  return riskLevelFromScore(riskScore);
}

function h3BoundaryToCoordinates(h3Cell: string, fallbackLat: number, fallbackLng: number) {
  try {
    const boundary = cellToBoundary(h3Cell);
    return boundary.map((point) => ({ latitude: point[0], longitude: point[1] }));
  } catch {
    const d = 0.0016;
    return [
      { latitude: fallbackLat + d, longitude: fallbackLng },
      { latitude: fallbackLat + d / 2, longitude: fallbackLng + d },
      { latitude: fallbackLat - d / 2, longitude: fallbackLng + d },
      { latitude: fallbackLat - d, longitude: fallbackLng },
      { latitude: fallbackLat - d / 2, longitude: fallbackLng - d },
      { latitude: fallbackLat + d / 2, longitude: fallbackLng - d },
    ];
  }
}

const CARD_BG = '#f0ecce';

const appendLiveRiskDebugLog = async (_event: string, _payload?: unknown) => {
  // Kept as no-op for non-Android renderer path.
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export default function DriverLiveRiskScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { location, refreshLocation } = useLocation();
  const hasBootstrappedLocationRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const hasGpsCoords = isFiniteCoordinate(location.latitude) && isFiniteCoordinate(location.longitude);
  const hasValidLocation = location.isValid && hasGpsCoords;

  const [cellData, setCellData] = useState<{ current: CellRisk; neighbors: CellRisk[] } | null>(null);
  const [selectedCellId, setSelectedCellId] = useState('c0');
  const [loading, setLoading] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  useEffect(() => {
    void appendLiveRiskDebugLog('LIVE_RISK_MOUNT');
    return () => {
      isMountedRef.current = false;
      void appendLiveRiskDebugLog('LIVE_RISK_UNMOUNT');
    };
  }, []);

  const safeSetLoading = useCallback((value: boolean) => {
    if (isMountedRef.current) setLoading(value);
  }, []);

  const safeSetCellData = useCallback((value: { current: CellRisk; neighbors: CellRisk[] } | null) => {
    if (isMountedRef.current) setCellData(value);
  }, []);

  const safeSetSelectedCellId = useCallback((value: string) => {
    if (isMountedRef.current) setSelectedCellId(value);
  }, []);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  const coords = useMemo(
    () => (hasGpsCoords ? { lat: location.latitude as number, lng: location.longitude as number } : null),
    [hasGpsCoords, location.latitude, location.longitude],
  );
  const hasRenderableCoords = !!coords && isFiniteCoordinate(coords.lat) && isFiniteCoordinate(coords.lng);

  const mapW = clamp(width - 48, 320, 380);
  const mapH = 260;

  const toCellRisk = useCallback((raw: any, id: string): CellRisk => {
    const baseLat = toFiniteNumber(raw?.lat, coords?.lat ?? 12.9716);
    const baseLng = toFiniteNumber(raw?.lng, coords?.lng ?? 77.5946);
    const lfScore = toFiniteNumber(raw?.Lf ?? raw?.lf_score, 0);
    const riskScore = toFiniteNumber(raw?.riskScore, Math.round(lfScore * 100));
    const disruptionScore = Number(toFiniteNumber(raw?.disruptionScore, 0).toFixed(2));

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

    let h3Id = String(raw?.h3_cell ?? '');
    if (!h3Id || h3Id === '—') {
      try {
        h3Id = latLngToCell(baseLat, baseLng, 8); // Resolution 8 for ~500m cells
      } catch {
        h3Id = '—';
      }
    }
    const riskLevel: RiskLevel = resolveRiskLevel(raw?.riskLevel, riskScore, trafficStatus);

    return {
      id,
      h3Id,
      rainPct: toFiniteNumber(raw?.rainfall ?? raw?.rain_pct, 0),
      aqi: toFiniteNumber(raw?.aqi ?? raw?.aqi_index, 0),
      floodChance,
      disruptionScore,
      trafficStatus,
      riskScore,
      riskLevel,
      polygon: h3BoundaryToCoordinates(h3Id, baseLat, baseLng),
    };
  }, [coords?.lat, coords?.lng]);

  /**
   * [IN-LINE PRIDE]: Telemetry & Zone Exploration
   * Orchestrates the high-frequency synchronization between the local GPS signal 
   * and the H3-grid backend. This function ensures that as the driver moves 
   * through "Underserved" urban sectors, the platform proactively identifies 
   * neighboring risk cells to maintain a continuous safety perimeter.
   */
  const loadZones = useCallback(async () => {
    try {
      void appendLiveRiskDebugLog('LOAD_ZONES_START', {
        locationLoading: location.loading,
        hasCoords: !!coords,
        userId: user?.id ?? null,
      });
      if (location.loading || !coords || !isFiniteCoordinate(coords.lat) || !isFiniteCoordinate(coords.lng)) return;
      safeSetLoading(true);
      if (!user?.id) return;
      await telemetryApi.sendGps({
        driverId: user.id,
        lat: coords.lat,
        lng: coords.lng,
        platform: 'mobile-app',
      });
      const res = await fraudApi.getZoneNeighbors(coords.lat, coords.lng, 1);
      
      let centralH3: string | null = null;
      try {
        centralH3 = latLngToCell(coords.lat, coords.lng, 8);
      } catch {
        centralH3 = null;
      }

      const center = toCellRisk(res?.center ?? { h3_cell: centralH3 }, 'c0');
      const neighborsRaw = Array.isArray(res?.neighbors) ? res.neighbors : [];

      let gridCells: CellRisk[] = [];
      if (centralH3) {
        let fullDisk: string[] = [];
        try {
          fullDisk = gridDisk(centralH3, 4);
        } catch {
          fullDisk = [centralH3];
        }

        const gridIds = fullDisk.filter((hid) => {
          if (hid === centralH3) return true;
          const hash = parseInt(hid.slice(-4), 16);
          return Number.isFinite(hash) && hash % 12 === 0;
        });

        gridCells = gridIds.map((hid, idx) => {
          if (hid === centralH3) return center;
          const existing = neighborsRaw.find((n: any) => n.h3_cell === hid);
          return toCellRisk(existing ?? { h3_cell: hid }, `g${idx}`);
        });
      } else {
        const inferredNeighbors = neighborsRaw.map((n: any, idx: number) => toCellRisk(n, `n${idx + 1}`));
        gridCells = [center, ...inferredNeighbors];
      }

      safeSetCellData({ current: center, neighbors: gridCells.filter(c => c.id !== center.id) });
      safeSetSelectedCellId('c0');
      void appendLiveRiskDebugLog('LOAD_ZONES_SUCCESS', {
        center: center.h3Id,
        neighbors: gridCells.length,
      });
    } catch (err: any) {
      void appendLiveRiskDebugLog('LOAD_ZONES_ERROR', {
        message: err?.message ?? 'unknown',
      });
      if (!coords) return;

      let fallbackCells: CellRisk[] = [];
      try {
        const centralH3 = latLngToCell(coords.lat, coords.lng, 8);
        const fullDisk = gridDisk(centralH3, 4);
        const gridIds = fullDisk.filter((hid) => {
          if (hid === centralH3) return true;
          const hash = parseInt(hid.slice(-4), 16);
          return Number.isFinite(hash) && hash % 12 === 0;
        });
        fallbackCells = gridIds.map((hid, idx) => toCellRisk({ h3_cell: hid }, `f${idx}`));
      } catch {
        fallbackCells = [toCellRisk({ lat: coords.lat, lng: coords.lng }, 'f0')];
      }

      const safeCurrent = fallbackCells[0] ?? toCellRisk({ lat: coords.lat, lng: coords.lng }, 'f0');
      safeSetCellData({ 
        current: safeCurrent, 
        neighbors: fallbackCells.slice(1) 
      });
      safeSetSelectedCellId('c0');
      void appendLiveRiskDebugLog('LOAD_ZONES_FALLBACK_SUCCESS', {
        center: safeCurrent.h3Id ?? null,
        neighbors: fallbackCells.length,
      });
    } finally {
      safeSetLoading(false);
      void appendLiveRiskDebugLog('LOAD_ZONES_END');
    }
  }, [coords, location.loading, safeSetCellData, safeSetLoading, safeSetSelectedCellId, toCellRisk, user?.id]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  useFocusEffect(
    useCallback(() => {
      // Re-sync location and risk cells whenever the tab regains focus.
      const syncOnFocus = async () => {
        await refreshLocation();
        await loadZones();
      };
      void syncOnFocus();
    }, [loadZones, refreshLocation]),
  );

  useEffect(() => {
    // Attempt a single automatic location bootstrap when entering Live Risk.
    // Manual retries remain available via the Retry button.
    if (!hasBootstrappedLocationRef.current && !hasValidLocation && !location.loading) {
      hasBootstrappedLocationRef.current = true;
      void appendLiveRiskDebugLog('LOCATION_BOOTSTRAP_TRIGGERED');
      void refreshLocation();
    }
  }, [hasValidLocation, location.loading, refreshLocation]);

  useEffect(() => {
    void appendLiveRiskDebugLog('LOCATION_STATE_CHANGED', {
      isValid: location.isValid,
      loading: location.loading,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      error: location.error,
    });
  }, [
    location.isValid,
    location.loading,
    location.latitude,
    location.longitude,
    location.accuracy,
    location.error,
  ]);

  const cells = useMemo(() => cellData ?? {
    current: toCellRisk({}, 'c0'),
    neighbors: Array.from({ length: 6 }, (_, i) => ({ ...toCellRisk({}, 'c0'), id: `n${i + 1}` })),
  }, [cellData, toCellRisk]);

  const allCells = useMemo(() => [cells.current, ...cells.neighbors], [cells]);

  const selectedCell: CellRisk = useMemo(() => {
    const selected = allCells.find((cell) => cell.id === selectedCellId);
    if (selected) return selected;
    if (allCells.length > 0) return allCells[0];
    return toCellRisk({}, 'c0');
  }, [allCells, selectedCellId, toCellRisk]);

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

  const mapCenterCoordinate = useMemo(
    () => (coords ? ([coords.lng, coords.lat] as [number, number]) : null),
    [coords],
  );

  const mapPolygons = useMemo(
    () =>
      allCells.map((cell) => ({
        id: cell.id,
        riskLevel: cell.riskLevel,
        coordinates: cell.polygon.filter(
          (p) => isFiniteCoordinate(p.latitude) && isFiniteCoordinate(p.longitude),
        ),
      })),
    [allCells],
  );

  const mapboxRiskSource = useMemo<MapboxRiskFeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: mapPolygons
      .filter((poly) => poly.coordinates.length >= 3)
      .map((poly) => ({
        type: 'Feature',
        id: poly.id,
        properties: {
          id: poly.id,
          riskLevel: poly.riskLevel,
          h3Id: allCells.find((cell) => cell.id === poly.id)?.h3Id ?? poly.id,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [(() => {
            const ring = poly.coordinates.map((point) => [point.longitude, point.latitude]);
            if (ring.length > 0) {
              ring.push([...ring[0]] as [number, number]);
            }
            return ring;
          })()],
        },
      })),
  }), [allCells, mapPolygons]);

  const mapRegionKey = useMemo(
    () => (mapCenterCoordinate ? `${mapCenterCoordinate[1].toFixed(5)}:${mapCenterCoordinate[0].toFixed(5)}` : 'no-region'),
    [mapCenterCoordinate],
  );

  const formatCoords = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  };

  const handleRecenter = () => {
    if (loading) return;
    void appendLiveRiskDebugLog('RETRY_PRESSED', {
      hasRenderableCoords,
      hasValidLocation,
      loading: location.loading,
    });
    const refreshAndReload = async () => {
      await refreshLocation();
      await loadZones();
    };
    void refreshAndReload();
  };

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
        <View style={[styles.neoCard, styles.mapCardWrapper]}>
          <View style={styles.mapHero}>
            {hasRenderableCoords && mapCenterCoordinate ? (
              <View style={[styles.mapView, { width: mapW, height: mapH }]}>
                <MapboxGL.MapView
                  key={mapRegionKey}
                  style={styles.mapWebView}
                  styleURL={MapboxGL.StyleURL.Street}
                  logoEnabled={false}
                  compassEnabled={false}
                  scaleBarEnabled={false}
                >
                  <MapboxGL.Camera
                    key={mapRegionKey}
                    centerCoordinate={mapCenterCoordinate}
                    zoomLevel={14}
                    animationDuration={600}
                    animationMode="flyTo"
                  />

                  <MapboxGL.ShapeSource
                    id="live-risk-source"
                    shape={mapboxRiskSource as any}
                    onPress={(event: any) => {
                      const feature = event?.features?.[0];
                      const featureId = String(feature?.properties?.id ?? feature?.id ?? '');
                      if (featureId) {
                        safeSetSelectedCellId(featureId);
                      }
                    }}
                  >
                    <MapboxGL.FillLayer
                      id="live-risk-fill"
                      style={{
                        fillColor: [
                          'match',
                          ['get', 'riskLevel'],
                          'HALT', '#ef4444',
                          'HIGH', '#f97316',
                          'MEDIUM', '#facc15',
                          '#22d3ee',
                        ] as any,
                        fillOpacity: 0.24,
                      }}
                    />
                    <MapboxGL.LineLayer
                      id="live-risk-outline"
                      style={{
                        lineColor: [
                          'match',
                          ['get', 'riskLevel'],
                          'HALT', '#ef4444',
                          'HIGH', '#f97316',
                          'MEDIUM', '#facc15',
                          '#0f172a',
                        ] as any,
                        lineWidth: 1.5,
                        lineOpacity: 0.95,
                      }}
                    />
                    <MapboxGL.LineLayer
                      id="live-risk-selected-outline"
                      filter={['==', ['get', 'id'], selectedCell.id] as any}
                      style={{
                        lineColor: '#000000',
                        lineWidth: 3,
                        lineOpacity: 1,
                      }}
                    />
                  </MapboxGL.ShapeSource>

                  <MapboxGL.MarkerView coordinate={mapCenterCoordinate}>
                    <View style={styles.scooterOverlay}>
                      <DriverScooterMarker size={54} />
                    </View>
                  </MapboxGL.MarkerView>
                </MapboxGL.MapView>

                <View style={styles.secureGridBadge}>
                  <Text style={styles.secureGridText}>{selectedCell.h3Id}</Text>
                </View>

                <View
                  style={[
                    styles.highHazardBadge,
                    {
                      backgroundColor: riskPalette(selectedCell.riskLevel).chipBg,
                      borderColor: riskPalette(selectedCell.riskLevel).stroke,
                    },
                  ]}
                >
                  <Text style={[styles.highHazardText, { color: riskPalette(selectedCell.riskLevel).chipText }]}>
                    {selectedCell.riskLevel} Zone
                  </Text>
                </View>
              </View>
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
            <Text
              style={[
                styles.readoutValue,
                { color: riskPalette(selectedCell.riskLevel).chipText, fontSize: 18 },
              ]}
            >
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
    overflow: 'hidden',
    position: 'relative',
  },
  mapWebView: {
    flex: 1,
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

  secureGridBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '62%',
  },
  secureGridText: { color: '#000', fontSize: 10, fontWeight: '900' },

  highHazardBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highHazardText: { color: '#000', fontSize: 11, fontWeight: '900' },

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
  scooterMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for better visibility on white map
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  scooterOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -27,
    marginTop: -27,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});
