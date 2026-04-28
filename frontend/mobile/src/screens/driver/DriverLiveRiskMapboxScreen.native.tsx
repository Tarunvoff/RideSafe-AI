/**
 * DriverLiveRiskScreen
 * Uses @rnmapbox/maps (native Mapbox SDK) — works in EAS builds only, not Expo Go.
 * Run: eas build --platform android --profile development  (or preview/production)
 */

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MapboxGL from '@rnmapbox/maps';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { cellToBoundary, latLngToCell, gridDisk } from 'h3-js';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import DriverLogoutMenu from '../../components/driver/DriverLogoutMenu';
import AegisNavbar from '../../components/layout/AegisNavbar';
import { ScooterMarker as DriverScooterMarker } from '../../components/driver/ScooterMarker';
import DarkstoreMarker from '../../components/driver/DarkstoreMarker';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { driverApi, fraudApi, telemetryApi } from '../../services/api';
import { Theme } from '../../theme';

// ─── Mapbox token init (must happen before any MapboxGL component renders) ───
const _mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? '';
if (_mapboxToken) {
  MapboxGL.setAccessToken(_mapboxToken);
}
MapboxGL.setTelemetryEnabled(false);

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'HALT';

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
  /** lat/lng pairs for h3 boundary */
  polygon: { latitude: number; longitude: number }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const lat1 = a.lat * (Math.PI / 180);
  const lat2 = b.lat * (Math.PI / 180);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function resolveRiskLevel(
  rawRiskLevel: unknown,
  riskScore: number,
  trafficStatus: string,
): RiskLevel {
  if (trafficStatus === 'Halt') return 'HALT';
  const level = String(rawRiskLevel ?? '').toUpperCase();
  if (level === 'HALT' || level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') {
    return level as RiskLevel;
  }
  return riskLevelFromScore(riskScore);
}

function h3BoundaryToCoords(
  h3Cell: string,
  fallbackLat: number,
  fallbackLng: number,
): { latitude: number; longitude: number }[] {
  try {
    const boundary = cellToBoundary(h3Cell);
    return boundary.map((pt) => ({ latitude: pt[0], longitude: pt[1] }));
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

// ─── Palette ──────────────────────────────────────────────────────────────────
const BRAND_BG = Theme.colors.brandOrange;
const CARD_BG = '#f0ecce';

function riskPalette(level: RiskLevel) {
  switch (level) {
    case 'HALT':
      return { stroke: '#ef4444', fill: '#ef4444', fillOpacity: 0.28, chipBg: '#FEE2E2', chipText: '#7F1D1D' };
    case 'HIGH':
      return { stroke: '#f97316', fill: '#f97316', fillOpacity: 0.22, chipBg: '#FFEDD5', chipText: '#9A3412' };
    case 'MEDIUM':
      return { stroke: '#facc15', fill: '#facc15', fillOpacity: 0.22, chipBg: '#FEF9C3', chipText: '#854D0E' };
    default:
      return { stroke: '#22d3ee', fill: '#22d3ee', fillOpacity: 0.20, chipBg: '#CCFBF1', chipText: '#115E59' };
  }
}

// ─── GeoJSON helpers ──────────────────────────────────────────────────────────
function buildFeatureCollection(cells: CellRisk[], selectedId: string) {
  const features = cells
    .filter((cell) => cell.polygon.length >= 3)
    .map((cell) => {
      const ring = cell.polygon
        .filter((p) => isFiniteCoordinate(p.latitude) && isFiniteCoordinate(p.longitude))
        .map((p) => [p.longitude, p.latitude] as [number, number]);
      // close the ring
      if (ring.length > 0) ring.push(ring[0]);

      return {
        type: 'Feature' as const,
        id: cell.id,
        properties: {
          id: cell.id,
          riskLevel: cell.riskLevel,
          h3Id: cell.h3Id,
          isSelected: cell.id === selectedId ? 1 : 0,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
      };
    });

  return { type: 'FeatureCollection' as const, features };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DriverLiveRiskScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { user, logout } = useAuth();
  const { location, refreshLocation } = useLocation();

  const isMountedRef = useRef(true);
  const hasBootstrappedRef = useRef(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const hasGpsCoords =
    isFiniteCoordinate(location.latitude) && isFiniteCoordinate(location.longitude);
  const hasValidLocation = location.isValid && hasGpsCoords;

  const [cellData, setCellData] = useState<{
    current: CellRisk;
    neighbors: CellRisk[];
  } | null>(null);
  const [selectedCellId, setSelectedCellId] = useState('c0');
  const [loading, setLoading] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [followDriver, setFollowDriver] = useState(true);
  const [darkstore, setDarkstore] = useState<null | {
    name: string;
    coordinate: [number, number]; // [lng, lat]
    distanceKm: number | null;
  }>(null);
  const [darkstoreFetch, setDarkstoreFetch] = useState<{
    status: 'idle' | 'loading' | 'loaded' | 'missing' | 'error';
    message?: string;
    rawLocation?: { lat?: unknown; lng?: unknown } | null;
  }>({ status: 'idle' });

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const safeSet = <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (val: T) => { if (isMountedRef.current) setter(val); };

  const safeSetLoading = safeSet(setLoading);
  const safeSetCellData = safeSet(setCellData);
  const safeSetSelectedCellId = safeSet(setSelectedCellId);
  const safeSetDarkstore = safeSet(setDarkstore);
  const safeSetDarkstoreFetch = safeSet(setDarkstoreFetch);

  const handleLogout = async () => {
    try {
      setProfileMenuVisible(false);
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('common.logout_failed'));
    }
  };

  const coords = useMemo(
    () =>
      hasGpsCoords
        ? { lat: location.latitude as number, lng: location.longitude as number }
        : null,
    [hasGpsCoords, location.latitude, location.longitude],
  );

  const mapH = 260;
  const mapW = clamp(width - 48, 300, 400);

  // ─── toCellRisk ─────────────────────────────────────────────────────────────
  const toCellRisk = useCallback(
    (raw: any, id: string): CellRisk => {
      const baseLat = toFiniteNumber(raw?.lat, coords?.lat ?? 12.9716);
      const baseLng = toFiniteNumber(raw?.lng, coords?.lng ?? 77.5946);
      const lfScore = toFiniteNumber(raw?.Lf ?? raw?.lf_score, 0);
      const riskScore = toFiniteNumber(raw?.riskScore, Math.round(lfScore * 100));
      const disruptionScore = Number(toFiniteNumber(raw?.disruptionScore, 0).toFixed(2));

      const rawFlood: string = raw?.floodChance ?? '';
      const floodChance =
        rawFlood === 'High' ? 'High' : rawFlood === 'Medium' ? 'Medium' : 'Low';

      const rawTraffic: string = raw?.trafficStatus ?? '';
      const trafficStatus =
        rawTraffic === 'Halt'
          ? 'Halt'
          : rawTraffic === 'Slow Traffic'
          ? 'Slow Traffic'
          : 'Stable Flow';

      let h3Id = String(raw?.h3_cell ?? '');
      if (!h3Id || h3Id === '—') {
        try { h3Id = latLngToCell(baseLat, baseLng, 8); } catch { h3Id = '—'; }
      }

      const riskLevel = resolveRiskLevel(raw?.riskLevel, riskScore, trafficStatus);

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
        polygon: h3BoundaryToCoords(h3Id, baseLat, baseLng),
      };
    },
    [coords?.lat, coords?.lng],
  );

  // ─── loadZones ───────────────────────────────────────────────────────────────
  const loadZones = useCallback(async () => {
    if (location.loading || !coords) return;
    safeSetLoading(true);
    try {
      if (user?.id) {
        await telemetryApi.sendGps({
          driverId: user.id,
          lat: coords.lat,
          lng: coords.lng,
          platform: 'mobile-app',
        });
      }

      const [res, profileRes] = await Promise.all([
        fraudApi.getZoneNeighbors(coords.lat, coords.lng, 1),
        user?.id ? driverApi.getProfile(user.id).catch(() => null) : Promise.resolve(null),
      ]);

      // Resolve "primary darkstore" marker from the simulated q-commerce profile.
      safeSetDarkstoreFetch({ status: 'loading' });
      const primaryStoreName =
        String((profileRes as any)?.driverProfile?.identity?.primaryDarkStore ?? '').trim();
      const rawLoc = (profileRes as any)?.driverProfile?.identity?.primaryDarkStoreLocation ?? null;
      const storeLat = toFiniteNumber(rawLoc?.lat, NaN);
      const storeLng = toFiniteNumber(rawLoc?.lng, NaN);
      if (primaryStoreName && Number.isFinite(storeLat) && Number.isFinite(storeLng)) {
        const distanceKm = haversineKm(coords, { lat: storeLat, lng: storeLng });
        safeSetDarkstore({
          name: primaryStoreName,
          coordinate: [storeLng, storeLat],
          distanceKm,
        });
        safeSetDarkstoreFetch({
          status: 'loaded',
          rawLocation: { lat: rawLoc?.lat, lng: rawLoc?.lng },
        });
      } else {
        safeSetDarkstore(null);
        if (!primaryStoreName) {
          safeSetDarkstoreFetch({ status: 'missing', message: 'No primary darkstore assigned' });
        } else {
          safeSetDarkstoreFetch({
            status: 'error',
            message: 'Darkstore location missing/invalid',
            rawLocation: { lat: rawLoc?.lat, lng: rawLoc?.lng },
          });
        }
      }

      let centralH3: string | null = null;
      try { centralH3 = latLngToCell(coords.lat, coords.lng, 8); } catch { centralH3 = null; }

      const center = toCellRisk(res?.center ?? { h3_cell: centralH3 }, 'c0');
      const neighborsRaw = Array.isArray(res?.neighbors) ? res.neighbors : [];

      let gridCells: CellRisk[] = [];
      if (centralH3) {
        let fullDisk: string[] = [];
        try { fullDisk = gridDisk(centralH3, 4); } catch { fullDisk = [centralH3]; }

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
        gridCells = [center, ...neighborsRaw.map((n: any, i: number) => toCellRisk(n, `n${i + 1}`))];
      }

      safeSetCellData({ current: center, neighbors: gridCells.filter((c) => c.id !== center.id) });
      safeSetSelectedCellId('c0');
    } catch {
      // fallback: render cells from h3 alone (no backend data)
      if (!coords) return;
      try {
        const centralH3 = latLngToCell(coords.lat, coords.lng, 8);
        const fullDisk = gridDisk(centralH3, 4);
        const gridIds = fullDisk.filter((hid) => {
          if (hid === centralH3) return true;
          const hash = parseInt(hid.slice(-4), 16);
          return Number.isFinite(hash) && hash % 12 === 0;
        });
        const fallback = gridIds.map((hid, idx) => toCellRisk({ h3_cell: hid }, `f${idx}`));
        const safeCurrent = fallback[0] ?? toCellRisk({ lat: coords.lat, lng: coords.lng }, 'f0');
        safeSetCellData({ current: safeCurrent, neighbors: fallback.slice(1) });
        safeSetSelectedCellId('c0');
      } catch {
        const safeCurrent = toCellRisk({ lat: coords.lat, lng: coords.lng }, 'f0');
        safeSetCellData({ current: safeCurrent, neighbors: [] });
      }
    } finally {
      safeSetLoading(false);
    }
  }, [coords, location.loading, toCellRisk, user?.id]);

  useEffect(() => { void loadZones(); }, [loadZones]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const sync = async () => {
        await refreshLocation();
        await loadZones();
      };
      void sync();

      // Lightweight live tracking: update location frequently so the driver marker moves.
      // Risk grid + telemetry is heavier, so we refresh that slower.
      const locationTimer = setInterval(() => {
        if (!isActive) return;
        void refreshLocation();
      }, 5_000);

      const zonesTimer = setInterval(() => {
        if (!isActive) return;
        void loadZones();
      }, 15_000);

      return () => {
        isActive = false;
        clearInterval(locationTimer);
        clearInterval(zonesTimer);
      };
    }, [loadZones, refreshLocation]),
  );

  useEffect(() => {
    if (!hasBootstrappedRef.current && !hasValidLocation && !location.loading) {
      hasBootstrappedRef.current = true;
      void refreshLocation();
    }
  }, [hasValidLocation, location.loading, refreshLocation]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const cells = useMemo(
    () =>
      cellData ?? {
        current: toCellRisk({}, 'c0'),
        neighbors: Array.from({ length: 6 }, (_, i) => ({
          ...toCellRisk({}, 'c0'),
          id: `n${i + 1}`,
        })),
      },
    [cellData, toCellRisk],
  );

  const allCells = useMemo(() => [cells.current, ...cells.neighbors], [cells]);

  const selectedCell: CellRisk = useMemo(() => {
    return allCells.find((c) => c.id === selectedCellId) ?? allCells[0] ?? toCellRisk({}, 'c0');
  }, [allCells, selectedCellId, toCellRisk]);

  // GeoJSON for Mapbox layers
  const featureCollection = useMemo(
    () => buildFeatureCollection(allCells, selectedCellId),
    [allCells, selectedCellId],
  );

  const centerCoordinate = useMemo<[number, number] | null>(
    () => (coords ? [coords.lng, coords.lat] : null),
    [coords],
  );

  // Follow mode: keep the camera centered on the driver as location updates.
  useEffect(() => {
    if (!followDriver) return;
    if (!centerCoordinate) return;
    cameraRef.current?.setCamera({
      centerCoordinate,
      zoomLevel: 14,
      animationDuration: 450,
    });
  }, [centerCoordinate, followDriver]);

  const driverLat = coords?.lat ?? 0;
  const driverLon = coords?.lng ?? 0;
  const accuracyLabel =
    location.accuracy != null ? `${Math.round(location.accuracy)} m` : '—';
  const lastPing = location.fetchedAt
    ? location.fetchedAt.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '—';

  const formatCoords = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  };

  const handleRecenter = () => {
    if (loading) return;
    void (async () => {
      await refreshLocation();
      await loadZones();
      if (centerCoordinate) {
        cameraRef.current?.setCamera({
          centerCoordinate,
          zoomLevel: 14,
          animationDuration: 600,
        });
      }
    })();
  };

  const handleFitDriverAndDarkstore = () => {
    if (!centerCoordinate || !darkstore?.coordinate) return;
    try {
      // Fit both points so the hub marker is guaranteed visible.
      cameraRef.current?.fitBounds(
        centerCoordinate,
        darkstore.coordinate,
        90,
        700,
      );
    } catch {
      // Fallback: fly to midpoint.
      const mid: [number, number] = [
        (centerCoordinate[0] + darkstore.coordinate[0]) / 2,
        (centerCoordinate[1] + darkstore.coordinate[1]) / 2,
      ];
      cameraRef.current?.setCamera({ centerCoordinate: mid, zoomLevel: 13, animationDuration: 700 });
    }
  };

  const handleMapPress = useCallback(
    (event: any) => {
      const featureId = String(
        event?.features?.[0]?.properties?.id ?? event?.features?.[0]?.id ?? '',
      );
      if (featureId) safeSetSelectedCellId(featureId);
    },
    [],
  );

  // ─── Map fill/line expressions (Mapbox GL style spec) ─────────────────────
  const fillColorExpr: any = [
    'match', ['get', 'riskLevel'],
    'HALT',   riskPalette('HALT').fill,
    'HIGH',   riskPalette('HIGH').fill,
    'MEDIUM', riskPalette('MEDIUM').fill,
    riskPalette('LOW').fill,
  ];

  const fillOpacityExpr: any = [
    'match', ['get', 'riskLevel'],
    'HALT',   0.30,
    'HIGH',   0.24,
    'MEDIUM', 0.22,
    0.20,
  ];

  const lineColorExpr: any = [
    'match', ['get', 'riskLevel'],
    'HALT',   riskPalette('HALT').stroke,
    'HIGH',   riskPalette('HIGH').stroke,
    'MEDIUM', riskPalette('MEDIUM').stroke,
    riskPalette('LOW').stroke,
  ];

  const palette = riskPalette(selectedCell.riskLevel);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverLogoutMenu
        visible={profileMenuVisible}
        userEmail={user?.email}
        onClose={() => setProfileMenuVisible(false)}
        onLogout={() => { void handleLogout(); }}
      />
      <LoadingOverlay visible={loading} message={t('live_risk.refreshing')} />
      <AegisNavbar onProfile={() => setProfileMenuVisible(true)} light />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MAP CARD ── */}
        <View style={[styles.neoCard, styles.mapCardWrapper]}>
          {/* Map container — fixed height so Mapbox can measure it */}
          <View style={{ height: mapH, width: '100%', borderRadius: 14, overflow: 'hidden' }}>
            {!_mapboxToken ? (
              <View style={styles.mapFallback}>
                <Ionicons name="warning-outline" size={28} color="#9ca3af" />
                <Text style={styles.mapFallbackTitle}>Missing Mapbox token</Text>
                <Text style={styles.mapFallbackHint}>
                  Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the Live Risk map.
                </Text>
              </View>
            ) : centerCoordinate ? (
              <>
                <MapboxGL.MapView
                  style={StyleSheet.absoluteFillObject}
                  styleURL={MapboxGL.StyleURL.Street}
                  logoEnabled={false}
                  compassEnabled={false}
                  scaleBarEnabled={false}
                  attributionEnabled={false}
                >
                  <MapboxGL.Camera
                    ref={cameraRef}
                    centerCoordinate={centerCoordinate}
                    zoomLevel={14}
                    animationDuration={600}
                    animationMode="flyTo"
                  />

                  {/* H3 Risk hexagons */}
                  <MapboxGL.ShapeSource
                    id="risk-source"
                    shape={featureCollection as any}
                    onPress={handleMapPress}
                  >
                    {/* Fill */}
                    <MapboxGL.FillLayer
                      id="risk-fill"
                      style={{
                        fillColor: fillColorExpr,
                        fillOpacity: fillOpacityExpr,
                      }}
                    />
                    {/* Normal outline */}
                    <MapboxGL.LineLayer
                      id="risk-outline"
                      style={{
                        lineColor: lineColorExpr,
                        lineWidth: 1.5,
                        lineOpacity: 0.9,
                      }}
                    />
                    {/* Selected cell thicker outline */}
                    <MapboxGL.LineLayer
                      id="risk-selected-outline"
                      filter={['==', ['get', 'isSelected'], 1] as any}
                      style={{
                        lineColor: '#000000',
                        lineWidth: 3,
                        lineOpacity: 1,
                      }}
                    />
                  </MapboxGL.ShapeSource>

                  {/* Driver scooter marker */}
                  <MapboxGL.MarkerView coordinate={centerCoordinate}>
                    <View style={styles.scooterMarkerWrap}>
                      <DriverScooterMarker size={54} />
                    </View>
                  </MapboxGL.MarkerView>

                  {/* Darkstore marker (primary hub) */}
                  {darkstore?.coordinate ? (
                    <MapboxGL.MarkerView coordinate={darkstore.coordinate}>
                      <View style={styles.darkstoreMarkerWrap}>
                        <View style={styles.darkstorePin}>
                          <DarkstoreMarker size={30} />
                        </View>
                        <View style={styles.darkstoreLabel}>
                          <Text style={styles.darkstoreLabelTitle} numberOfLines={1}>
                            Darkstore
                          </Text>
                          <Text style={styles.darkstoreLabelSub} numberOfLines={1}>
                            {darkstore.name}
                            {typeof darkstore.distanceKm === 'number'
                              ? ` • ${darkstore.distanceKm.toFixed(1)} km`
                              : ''}
                          </Text>
                        </View>
                      </View>
                    </MapboxGL.MarkerView>
                  ) : null}
                </MapboxGL.MapView>

                {/* Overlaid badges — rendered as native Views on top of the map */}
                <View style={styles.secureGridBadge} pointerEvents="none">
                  <Text style={styles.secureGridText} numberOfLines={1}>
                    {selectedCell.h3Id}
                  </Text>
                </View>

                <View
                  style={[
                    styles.highHazardBadge,
                    { backgroundColor: palette.chipBg, borderColor: palette.stroke },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={[styles.highHazardText, { color: palette.chipText }]}>
                    {selectedCell.riskLevel} Zone
                  </Text>
                </View>

                {/* Recenter button */}
                <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter} activeOpacity={0.85}>
                  <Ionicons name="locate" size={14} color="#111827" />
                </TouchableOpacity>

                {/* Fit driver + darkstore */}
                {darkstore?.coordinate ? (
                  <TouchableOpacity
                    style={styles.fitBtn}
                    onPress={handleFitDriverAndDarkstore}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="scan-outline" size={14} color="#111827" />
                  </TouchableOpacity>
                ) : null}

                {/* Follow toggle */}
                <TouchableOpacity
                  style={[styles.followBtn, followDriver ? styles.followBtnOn : null]}
                  onPress={() => setFollowDriver((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={followDriver ? 'navigate' : 'navigate-outline'} size={14} color="#111827" />
                </TouchableOpacity>
              </>
            ) : (
              /* ── No location fallback ── */
              <View style={styles.mapFallback}>
                <Ionicons name="location-outline" size={28} color="#9ca3af" />
                <Text style={styles.mapFallbackTitle}>Location Required</Text>
                <Text style={styles.mapFallbackHint}>
                  Enable location permissions to load your current risk zone.
                </Text>
                <TouchableOpacity style={styles.mapFallbackBtn} onPress={handleRecenter}>
                  <Ionicons name="refresh" size={14} color="#111827" />
                  <Text style={styles.mapFallbackBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── ASSIGNMENT CARD (debuggable, driver-friendly) ── */}
        <View style={[styles.neoCard, styles.assignmentCard]}>
          <View style={styles.assignmentHeader}>
            <View style={styles.assignmentTitleRow}>
              <Ionicons name="storefront-outline" size={16} color="#111827" />
              <Text style={styles.assignmentTitle}>Assignment</Text>
            </View>

            <View style={styles.assignmentStatusPill}>
              <Text style={styles.assignmentStatusText}>
                {darkstoreFetch.status === 'loaded'
                  ? 'DARKSTORE OK'
                  : darkstoreFetch.status === 'loading'
                  ? 'FETCHING…'
                  : darkstoreFetch.status === 'missing'
                  ? 'MISSING'
                  : darkstoreFetch.status === 'error'
                  ? 'INVALID'
                  : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Driver</Text>
            <Text style={styles.assignmentValue} numberOfLines={1}>
              {hasValidLocation ? formatCoords(driverLat, driverLon) : 'Location not available'}
              {hasValidLocation ? ` • ±${accuracyLabel}` : ''}
            </Text>
          </View>

          <View style={styles.assignmentRow}>
            <Text style={styles.assignmentLabel}>Darkstore</Text>
            <Text style={styles.assignmentValue} numberOfLines={2}>
              {darkstore?.name ?? darkstoreFetch.message ?? '—'}
              {darkstore?.coordinate
                ? `\n${formatCoords(darkstore.coordinate[1], darkstore.coordinate[0])}`
                : ''}
              {typeof darkstore?.distanceKm === 'number'
                ? ` • ${darkstore.distanceKm.toFixed(1)} km`
                : ''}
            </Text>
          </View>

          <View style={styles.assignmentActions}>
            <TouchableOpacity style={styles.assignmentBtn} onPress={handleRecenter} activeOpacity={0.85}>
              <Ionicons name="refresh" size={14} color="#111827" />
              <Text style={styles.assignmentBtnText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.assignmentBtn, !darkstore?.coordinate && styles.assignmentBtnDisabled]}
              onPress={handleFitDriverAndDarkstore}
              activeOpacity={0.85}
              disabled={!darkstore?.coordinate}
            >
              <Ionicons name="scan-outline" size={14} color="#111827" />
              <Text style={styles.assignmentBtnText}>Fit both</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── READOUT GRID 1 ── */}
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

        {/* ── INFO BOX ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
          <Text style={styles.infoText}>
            Hazards are calculated from live environmental pings and attached to the
            selected H3 grid cell.
          </Text>
        </View>

        {/* ── READOUT GRID 2 ── */}
        <View style={styles.readoutGrid}>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <Text style={styles.readoutLabel}>RAIN</Text>
            <Text style={[styles.readoutValue, { fontSize: 18 }]}>
              {selectedCell.rainPct}%
            </Text>
          </View>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <Text style={styles.readoutLabel}>DISRUPTION</Text>
            <Text style={[styles.readoutValue, { fontSize: 18 }]}>
              {selectedCell.disruptionScore.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.neoCard, styles.readoutCard]}>
            <Text style={styles.readoutLabel}>RISK LEVEL</Text>
            <Text
              style={[styles.readoutValue, { color: palette.chipText, fontSize: 18 }]}
            >
              {selectedCell.riskLevel}
            </Text>
          </View>
        </View>

        {/* ── REALTIME LOCATION ── */}
        <View style={[styles.neoCard, styles.locationCard]}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.locationHeaderTitle}>REALTIME LOCATION</Text>
            <Ionicons name="share-social" size={20} color="#000" />
          </View>

          <View style={styles.validationRow}>
            <Ionicons
              name={hasValidLocation ? 'checkmark-circle' : 'warning'}
              size={18}
              color={hasValidLocation ? '#16A34A' : '#f97316'}
            />
            <Text style={styles.validationText}>
              {hasValidLocation ? 'VALID LOCATION CONFIRMED' : 'LOCATION UNAVAILABLE'}
            </Text>
          </View>

          <Text style={styles.coordsText}>
            {hasValidLocation ? formatCoords(driverLat, driverLon) : '—'}
          </Text>
          <Text style={styles.timeText}>Fetched at {lastPing}</Text>
          <Text style={styles.timeText}>Accuracy: {accuracyLabel}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.brandOrange,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 0,
  },

  // ── Neo card base ──
  neoCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: '#000',
    borderRadius: 16,
  },

  // ── Map card ──
  mapCardWrapper: {
    overflow: 'hidden',
    marginBottom: 20,
    padding: 0,
  },

  // ── Scooter marker ──
  scooterMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    // center the 54px icon on the coordinate
    marginLeft: -27,
    marginTop: -27,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  // ── Darkstore marker ──
  darkstoreMarkerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Nudge so the pin is centered on the coordinate.
    marginLeft: -17,
    marginTop: -34,
  },
  darkstorePin: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  darkstoreLabel: {
    maxWidth: 200,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  darkstoreLabelTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  darkstoreLabelSub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  // ── Map overlay badges ──
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
    maxWidth: '60%',
  },
  secureGridText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  highHazardBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  highHazardText: {
    fontSize: 11,
    fontWeight: '900',
  },
  recenterBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitBtn: {
    position: 'absolute',
    top: 52,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtn: {
    position: 'absolute',
    top: 92,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnOn: {
    backgroundColor: 'rgba(255,255,255,1)',
  },

  // ── Map fallback ──
  mapFallback: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapFallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  mapFallbackHint: {
    maxWidth: 260,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    color: '#6b7280',
    paddingHorizontal: 18,
  },
  mapFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  mapFallbackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  // ── Assignment card ──
  assignmentCard: {
    padding: 16,
    marginBottom: 16,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  assignmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.4,
  },
  assignmentStatusPill: {
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  assignmentStatusText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.6,
  },
  assignmentRow: {
    marginBottom: 10,
  },
  assignmentLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  assignmentValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f2937',
    lineHeight: 18,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  assignmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  assignmentBtnDisabled: {
    opacity: 0.5,
  },
  assignmentBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.4,
  },

  // ── Readout grid ──
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
    textAlign: 'center',
  },

  // ── Info row ──
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
  infoIconText: {
    color: BRAND_BG,
    fontSize: 12,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  infoText: {
    flex: 1,
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ── Location card ──
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